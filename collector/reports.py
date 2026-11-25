from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Mapping, Sequence

from collector.config import POLL_INTERVAL_SECONDS, FeedSpec
from collector.models import Article


def summarize_feed_metrics(
    feeds: Sequence[FeedSpec], metrics: Iterable[Mapping[str, object]]
) -> list[dict[str, object]]:
    grouped: dict[int, list[Mapping[str, object]]] = {feed.feed_id: [] for feed in feeds}
    for metric in metrics:
        feed_id = int(metric["feed_id"])
        grouped.setdefault(feed_id, []).append(metric)

    summaries: list[dict[str, object]] = []
    for feed in feeds:
        rows = grouped.get(feed.feed_id, [])
        parsed_count = sum(int(row["parsed_article_count"]) for row in rows)
        recorded_rss_counts = [
            int(row["rss_item_count"])
            for row in rows
            if row.get("rss_item_count") is not None and int(row["error_count"]) == 0
        ]
        within_duplicates = sum(int(row["duplicate_within_source_count"]) for row in rows)
        cross_candidates = sum(int(row["cross_source_duplicate_candidate_count"]) for row in rows)
        missing_links = sum(int(row.get("items_missing_link", 0)) for row in rows)
        missing_titles = sum(int(row.get("items_missing_title", 0)) for row in rows)
        invalid_links = sum(int(row.get("items_invalid_link", 0)) for row in rows)
        description_count = sum(int(row["description_item_count"]) for row in rows)
        description_chars = sum(int(row["description_char_total"]) for row in rows)
        empty_descriptions = sum(int(row["empty_description_count"]) for row in rows)
        observed_days = {
            str(row["polled_at"])[:10]
            for row in rows
            if row.get("polled_at")
        }
        retentions = [
            float(row["retention_seconds"])
            for row in rows
            if row.get("retention_seconds") is not None
        ]
        new_count = sum(int(row["new_article_count"]) for row in rows)

        summaries.append(
            {
                "feed_id": feed.feed_id,
                "source": feed.source_code,
                "source_name": feed.source_name,
                "category": feed.category_code,
                "category_name": feed.category_name,
                "rss_url": feed.url,
                "new_per_day": new_count / len(observed_days) if observed_days else None,
                "rss_item_count": sum(recorded_rss_counts) if recorded_rss_counts else None,
                "rss_item_count_poll_count": len(recorded_rss_counts),
                "parsed_article_count": parsed_count,
                "items_missing_link": missing_links,
                "items_missing_title": missing_titles,
                "items_invalid_link": invalid_links,
                "within_source_duplicate_rate": within_duplicates / parsed_count if parsed_count else None,
                "cross_source_duplicate_candidate_rate": cross_candidates / parsed_count if parsed_count else None,
                "error_count": sum(int(row["error_count"]) for row in rows),
                "retention_seconds": max(retentions) if retentions else None,
                "average_description_length": description_chars / description_count if description_count else None,
                "empty_description_rate": empty_descriptions / description_count if description_count else None,
                "poll_count": len(rows),
            }
        )
    return summaries


def _utc_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _longest_consecutive_days(values: Iterable[datetime]) -> int:
    dates = sorted({value.date() for value in values})
    if not dates:
        return 0
    longest = current = 1
    for previous, current_date in zip(dates, dates[1:]):
        if (current_date - previous).days == 1:
            current += 1
            longest = max(longest, current)
        else:
            current = 1
    return longest


def validate_trial(
    feeds: Sequence[FeedSpec],
    metrics: Iterable[Mapping[str, object]],
    *,
    now: datetime | None = None,
    interval_seconds: int = POLL_INTERVAL_SECONDS,
    duration_days: int = 7,
) -> dict[str, object]:
    """Check that every feed has polls on `duration_days` consecutive calendar days.

    Only successful polls count: a poll that recorded an error stored no data
    from that feed, so it is reported in failed_polls and not as coverage.
    Gaps inside those days do not fail the check; they are reported as
    missing intervals and coverage_pct so results can state the real coverage.
    An interval counts as covered when it holds a successful poll, so a
    restart that shifts the polling phase does not create false gaps.
    """
    if not feeds:
        raise ValueError("At least one feed is required to validate a trial")
    if interval_seconds <= 0 or duration_days <= 0:
        raise ValueError("Trial interval and duration must be positive")

    duration_seconds = duration_days * 24 * 60 * 60
    if duration_seconds % interval_seconds:
        raise ValueError("Trial duration must be evenly divisible by the polling interval")
    expected_polls = duration_seconds // interval_seconds
    expected_feed_ids = {feed.feed_id for feed in feeds}
    timestamps: dict[int, list[datetime]] = {feed.feed_id: [] for feed in feeds}
    successes: dict[int, set[datetime]] = {feed.feed_id: set() for feed in feeds}
    for metric in metrics:
        feed_id = int(metric["feed_id"])
        if feed_id not in expected_feed_ids or not metric.get("polled_at"):
            continue
        value = str(metric["polled_at"])
        polled_at = datetime.fromisoformat(value.replace("Z", "+00:00"))
        timestamps[feed_id].append(_utc_datetime(polled_at))
        if not int(metric.get("error_count") or 0):
            successes[feed_id].add(_utc_datetime(polled_at))

    all_timestamps = [value for values in timestamps.values() for value in values]
    trial_start = min(all_timestamps) if all_timestamps else None
    current_time = _utc_datetime(now or datetime.now(timezone.utc))
    trial_end = trial_start.timestamp() + duration_seconds if trial_start else None
    elapsed_seconds = max(0.0, (current_time - trial_start).total_seconds()) if trial_start else 0.0
    elapsed_days = min(float(duration_days), elapsed_seconds / 86400)
    due_polls = min(expected_polls, int(elapsed_seconds // interval_seconds) + 1) if trial_start else 0
    window_end = trial_start.timestamp() + duration_seconds if trial_start else None
    feed_results: list[dict[str, object]] = []

    for feed in feeds:
        values = sorted(timestamps[feed.feed_id])
        if trial_start is None or window_end is None:
            observed = []
        else:
            observed = [
                value
                for value in values
                if trial_start <= value < datetime.fromtimestamp(window_end, timezone.utc)
                and value <= current_time
            ]

        successful = [value for value in observed if value in successes[feed.feed_id]]
        matched_slots: set[int] = set()
        if trial_start is not None:
            for value in successful:
                offset = (value - trial_start).total_seconds()
                slot = int(offset // interval_seconds)
                if 0 <= slot < due_polls:
                    matched_slots.add(slot)

        missing_intervals = max(0, due_polls - len(matched_slots))
        consecutive_days = _longest_consecutive_days(successful)
        feed_complete = (
            trial_start is not None
            and elapsed_seconds >= duration_seconds
            and consecutive_days >= duration_days
        )
        coverage_pct = round(100 * len(matched_slots) / due_polls, 1) if due_polls else 0.0
        feed_results.append(
            {
                "feed_id": feed.feed_id,
                "source": feed.source_code,
                "category": feed.category_code,
                "first_poll_at": observed[0].isoformat() if observed else None,
                "last_poll_at": observed[-1].isoformat() if observed else None,
                "expected_polls": expected_polls,
                "due_polls": due_polls,
                "actual_polls": len(observed),
                "successful_polls": len(successful),
                "failed_polls": len(observed) - len(successful),
                "matched_expected_polls": len(matched_slots),
                "missing_intervals": missing_intervals,
                "coverage_pct": coverage_pct,
                "consecutive_days": consecutive_days,
                "status": "complete" if feed_complete else "incomplete",
            }
        )

    observed_feeds = sum(bool(result["successful_polls"]) for result in feed_results)
    complete = trial_start is not None and all(result["status"] == "complete" for result in feed_results)
    latest_poll = max(
        (result["last_poll_at"] for result in feed_results if result["last_poll_at"]),
        default=None,
    )
    return {
        "status": "complete" if complete else "incomplete",
        "trial_duration_days": duration_days,
        "poll_interval_seconds": interval_seconds,
        "expected_polls_per_feed": expected_polls,
        "due_polls_per_feed": due_polls,
        "elapsed_days": round(elapsed_days, 3),
        "trial_start": trial_start.isoformat() if trial_start else None,
        "expected_trial_end": datetime.fromtimestamp(trial_end, timezone.utc).isoformat() if trial_end else None,
        "last_observed_poll": latest_poll,
        "feed_coverage": {"expected": len(feeds), "observed": observed_feeds},
        "consecutive_days": min(
            (int(result["consecutive_days"]) for result in feed_results),
            default=0,
        ),
        "missing_interval_count": sum(int(result["missing_intervals"]) for result in feed_results),
        "failed_poll_count": sum(int(result["failed_polls"]) for result in feed_results),
        "coverage_pct": round(
            sum(float(result["coverage_pct"]) for result in feed_results) / len(feed_results), 1
        ),
        "feeds": feed_results,
    }


def export_sample_articles(articles: Iterable[Article], destination: str | Path) -> None:
    path = Path(destination)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["source", "url", "title", "publish_date"])
        writer.writeheader()
        for article in articles:
            writer.writerow(
                {
                    "source": article.source_code,
                    "url": article.url,
                    "title": article.title,
                    "publish_date": article.published_at or "",
                }
            )


def export_trial_summary(rows: Iterable[Mapping[str, object]], destination: str | Path) -> None:
    path = Path(destination)
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "feed_id",
        "source",
        "source_name",
        "category",
        "category_name",
        "rss_url",
        "new_per_day",
        "rss_item_count",
        "rss_item_count_poll_count",
        "parsed_article_count",
        "items_missing_link",
        "items_missing_title",
        "items_invalid_link",
        "within_source_duplicate_rate",
        "cross_source_duplicate_candidate_rate",
        "error_count",
        "retention_seconds",
        "average_description_length",
        "empty_description_rate",
        "poll_count",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
