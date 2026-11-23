from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, replace
from datetime import datetime, timezone
import re
import time
import unicodedata
from urllib.request import Request, urlopen

from collector.config import DEFAULT_TIMEOUT_SECONDS, FEEDS, POLL_INTERVAL_SECONDS, FeedSpec
from collector.models import Article, FeedPollMetric, PollReport
from collector.parser import parse_feed
from collector.storage import SQLiteStore


MAX_FEED_BYTES = 5 * 1024 * 1024


def fetch_feed(feed: FeedSpec, timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS) -> bytes:
    request = Request(
        feed.url,
        headers={
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
            "User-Agent": "VietTrendRSSCollector/1.0",
        },
    )
    with urlopen(request, timeout=timeout_seconds) as response:
        payload = response.read(MAX_FEED_BYTES + 1)
    if len(payload) > MAX_FEED_BYTES:
        raise ValueError(f"Feed response exceeds {MAX_FEED_BYTES} bytes")
    return payload


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _utc_iso(value: datetime) -> str:
    return _as_utc(value).isoformat()


def _title_fingerprint(title: str) -> str:
    decomposed = unicodedata.normalize("NFD", title.casefold().replace("đ", "d"))
    without_marks = "".join(char for char in decomposed if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", without_marks).strip()


@dataclass
class _MetricBuilder:
    feed_id: int
    polled_at: str
    parsed_article_count: int = 0
    rss_item_count: int | None = None
    new_article_count: int = 0
    duplicate_within_source_count: int = 0
    cross_source_duplicate_candidate_count: int = 0
    error_count: int = 0
    error_message: str | None = None
    items_missing_link: int = 0
    items_missing_title: int = 0
    items_invalid_link: int = 0
    retention_seconds: float | None = None
    description_char_total: int = 0
    description_item_count: int = 0
    empty_description_count: int = 0

    def freeze(self) -> FeedPollMetric:
        return FeedPollMetric(**self.__dict__)


class Collector:
    def __init__(
        self,
        feeds: tuple[FeedSpec, ...] | list[FeedSpec] = FEEDS,
        store: SQLiteStore | None = None,
        fetcher=fetch_feed,
        clock=lambda: datetime.now(timezone.utc),
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        if not feeds:
            raise ValueError("At least one RSS feed must be configured")
        feed_ids = [feed.feed_id for feed in feeds]
        if len(feed_ids) != len(set(feed_ids)):
            raise ValueError("Feed IDs must be unique")
        self.feeds = tuple(feeds)
        self.store = store
        self.fetcher = fetcher
        self.clock = clock
        self.timeout_seconds = timeout_seconds

    def collect_once(self) -> PollReport:
        started = _as_utc(self.clock())
        started_at = started.isoformat()
        builders = {feed.feed_id: _MetricBuilder(feed_id=feed.feed_id, polled_at=started_at) for feed in self.feeds}
        batch_articles: dict[tuple[str, str], Article] = {}
        first_feed_by_article: dict[tuple[str, str], int] = {}
        title_sources: dict[str, dict[str, int]] = defaultdict(dict)

        for feed in self.feeds:
            metric = builders[feed.feed_id]
            try:
                payload = self.fetcher(feed, self.timeout_seconds)
                parsed = parse_feed(payload, feed)
            except Exception as exc:
                metric.error_count = 1
                metric.error_message = f"{type(exc).__name__}: {exc}"[:1000]
                continue

            metric.items_missing_link = parsed.items_missing_link
            metric.items_missing_title = parsed.items_missing_title
            metric.items_invalid_link = parsed.items_invalid_link
            metric.parsed_article_count = len(parsed.articles)
            metric.rss_item_count = parsed.rss_item_count
            metric.description_item_count = parsed.description_item_count
            metric.description_char_total = parsed.description_char_total
            metric.empty_description_count = parsed.empty_description_count

            if parsed.oldest_item_published_at:
                oldest = _as_utc(datetime.fromisoformat(parsed.oldest_item_published_at))
                metric.retention_seconds = max(0.0, (started - oldest).total_seconds())

            for article in parsed.articles:
                key = (article.source_code, article.url)
                fingerprint = _title_fingerprint(article.title)
                if fingerprint:
                    title_sources[fingerprint].setdefault(article.source_code, feed.feed_id)

                existing = batch_articles.get(key)
                if existing is None:
                    batch_articles[key] = article
                    first_feed_by_article[key] = feed.feed_id
                else:
                    batch_articles[key] = replace(
                        existing,
                        category_codes=tuple(sorted(set(existing.category_codes) | set(article.category_codes))),
                        feed_ids=tuple(sorted(set(existing.feed_ids) | set(article.feed_ids))),
                        description=existing.description or article.description,
                        published_at=existing.published_at or article.published_at,
                    )
                    metric.duplicate_within_source_count += 1

        for sources in title_sources.values():
            if len(sources) < 2:
                continue
            for source_code, feed_id in list(sources.items())[1:]:
                builders[feed_id].cross_source_duplicate_candidate_count += 1

        inserted = [False] * len(batch_articles)
        unique_articles = list(batch_articles.values())
        if self.store is not None:
            inserted = self.store.upsert_articles(unique_articles, started_at)
        else:
            # In-memory mode is useful for local experiments; it cannot deduplicate
            # against earlier polls, so production runs should always provide a store.
            inserted = [True] * len(unique_articles)

        new_articles: list[Article] = []
        for article, is_new in zip(unique_articles, inserted):
            if not is_new:
                continue
            first_feed_id = first_feed_by_article[(article.source_code, article.url)]
            builders[first_feed_id].new_article_count += 1
            new_articles.append(replace(article, first_seen_at=started_at, last_seen_at=started_at))

        metrics = tuple(builder.freeze() for builder in builders.values())
        failed_feed_count = sum(metric.error_count for metric in metrics)
        if failed_feed_count == len(self.feeds):
            status = "failed"
        elif failed_feed_count:
            status = "partial"
        else:
            status = "completed"

        finished_at = _utc_iso(self.clock())
        report = PollReport(
            started_at=started_at,
            finished_at=finished_at,
            status=status,
            feed_count=len(self.feeds),
            failed_feed_count=failed_feed_count,
            new_article_count=len(new_articles),
            duplicate_within_source_count=sum(metric.duplicate_within_source_count for metric in metrics),
            cross_source_duplicate_candidate_count=sum(
                metric.cross_source_duplicate_candidate_count for metric in metrics
            ),
            articles=tuple(new_articles),
            feed_metrics=metrics,
        )
        if self.store is not None:
            self.store.save_poll(report)
        return report

    def run_forever(
        self,
        interval_seconds: int = POLL_INTERVAL_SECONDS,
        on_report=None,
        on_error=None,
        sleep=time.sleep,
    ) -> None:
        """Poll until interrupted. A poll that raises (for example a locked database) is
        reported to on_error and the next poll still runs, so a 7-day trial is not lost."""
        if interval_seconds <= 0:
            raise ValueError("Polling interval must be positive")
        while True:
            started = time.monotonic()
            try:
                report = self.collect_once()
            except Exception as exc:
                if on_error is not None:
                    on_error(exc)
            else:
                if on_report is not None:
                    on_report(report)
            sleep(max(0.0, interval_seconds - (time.monotonic() - started)))
