from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Article:
    source_code: str
    source_name: str
    category_codes: tuple[str, ...]
    feed_ids: tuple[int, ...]
    url: str
    title: str
    published_at: str | None
    description: str
    first_seen_at: str | None = None
    last_seen_at: str | None = None


@dataclass(frozen=True)
class FeedPollMetric:
    feed_id: int
    polled_at: str
    parsed_article_count: int = 0
    new_article_count: int = 0
    duplicate_within_source_count: int = 0
    cross_source_duplicate_candidate_count: int = 0
    error_count: int = 0
    error_message: str | None = None
    items_missing_link: int = 0
    items_missing_title: int = 0
    retention_seconds: float | None = None
    description_char_total: int = 0
    description_item_count: int = 0
    empty_description_count: int = 0
    rss_item_count: int | None = None
    items_invalid_link: int = 0

    def as_dict(self) -> dict[str, object]:
        return {
            "feed_id": self.feed_id,
            "polled_at": self.polled_at,
            "parsed_article_count": self.parsed_article_count,
            "rss_item_count": self.rss_item_count,
            "new_article_count": self.new_article_count,
            "duplicate_within_source_count": self.duplicate_within_source_count,
            "cross_source_duplicate_candidate_count": self.cross_source_duplicate_candidate_count,
            "error_count": self.error_count,
            "error_message": self.error_message,
            "items_missing_link": self.items_missing_link,
            "items_missing_title": self.items_missing_title,
            "items_invalid_link": self.items_invalid_link,
            "retention_seconds": self.retention_seconds,
            "description_char_total": self.description_char_total,
            "description_item_count": self.description_item_count,
            "empty_description_count": self.empty_description_count,
        }


@dataclass(frozen=True)
class PollReport:
    started_at: str
    finished_at: str
    status: str
    feed_count: int
    failed_feed_count: int
    new_article_count: int
    duplicate_within_source_count: int
    cross_source_duplicate_candidate_count: int
    articles: tuple[Article, ...]
    feed_metrics: tuple[FeedPollMetric, ...]
