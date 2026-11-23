from __future__ import annotations

import json
from contextlib import contextmanager
from pathlib import Path
import sqlite3
from typing import Iterable, Iterator

from collector.models import Article, PollReport


class SQLiteStore:
    """Local article and poll-metric store; does not depend on the backend schema."""

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.database_path, timeout=30)
        connection.row_factory = sqlite3.Row
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS articles (
                    source_code TEXT NOT NULL,
                    url TEXT NOT NULL,
                    source_name TEXT NOT NULL,
                    category_codes_json TEXT NOT NULL,
                    feed_ids_json TEXT NOT NULL,
                    title TEXT NOT NULL,
                    published_at TEXT,
                    description TEXT NOT NULL,
                    first_seen_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL,
                    PRIMARY KEY (source_code, url)
                );
                CREATE TABLE IF NOT EXISTS polls (
                    poll_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    started_at TEXT NOT NULL,
                    finished_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    feed_count INTEGER NOT NULL,
                    failed_feed_count INTEGER NOT NULL,
                    new_article_count INTEGER NOT NULL,
                    duplicate_within_source_count INTEGER NOT NULL,
                    cross_source_duplicate_candidate_count INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS feed_poll_metrics (
                    metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    poll_id INTEGER NOT NULL REFERENCES polls(poll_id),
                    feed_id INTEGER NOT NULL,
                    polled_at TEXT NOT NULL,
                    parsed_article_count INTEGER NOT NULL,
                    rss_item_count INTEGER,
                    new_article_count INTEGER NOT NULL,
                    duplicate_within_source_count INTEGER NOT NULL,
                    cross_source_duplicate_candidate_count INTEGER NOT NULL,
                    error_count INTEGER NOT NULL,
                    error_message TEXT,
                    items_missing_link INTEGER NOT NULL,
                    items_missing_title INTEGER NOT NULL,
                    items_invalid_link INTEGER NOT NULL DEFAULT 0,
                    retention_seconds REAL,
                    description_char_total INTEGER NOT NULL,
                    description_item_count INTEGER NOT NULL,
                    empty_description_count INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_feed_poll_metrics_feed_time
                    ON feed_poll_metrics(feed_id, polled_at);
                """
            )
            columns = {
                row["name"]
                for row in connection.execute("PRAGMA table_info(feed_poll_metrics)").fetchall()
            }
            if "rss_item_count" not in columns:
                connection.execute(
                    "ALTER TABLE feed_poll_metrics ADD COLUMN rss_item_count INTEGER"
                )
            if "items_invalid_link" not in columns:
                connection.execute(
                    "ALTER TABLE feed_poll_metrics ADD COLUMN items_invalid_link INTEGER NOT NULL DEFAULT 0"
                )

    def upsert_articles(self, articles: Iterable[Article], seen_at: str) -> list[bool]:
        """Store articles by source and normalized URL; return True for first-seen rows."""
        inserted: list[bool] = []
        with self._connect() as connection:
            for article in articles:
                current = connection.execute(
                    "SELECT * FROM articles WHERE source_code = ? AND url = ?",
                    (article.source_code, article.url),
                ).fetchone()
                if current is None:
                    connection.execute(
                        """INSERT INTO articles (
                            source_code, url, source_name, category_codes_json, feed_ids_json,
                            title, published_at, description, first_seen_at, last_seen_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            article.source_code,
                            article.url,
                            article.source_name,
                            json.dumps(sorted(set(article.category_codes)), ensure_ascii=False),
                            json.dumps(sorted(set(article.feed_ids))),
                            article.title,
                            article.published_at,
                            article.description,
                            seen_at,
                            seen_at,
                        ),
                    )
                    inserted.append(True)
                    continue

                categories = set(json.loads(current["category_codes_json"])) | set(article.category_codes)
                feed_ids = set(json.loads(current["feed_ids_json"])) | set(article.feed_ids)
                connection.execute(
                    """UPDATE articles SET
                        category_codes_json = ?, feed_ids_json = ?,
                        published_at = COALESCE(published_at, ?),
                        description = CASE WHEN ? != '' THEN ? ELSE description END,
                        last_seen_at = ?
                       WHERE source_code = ? AND url = ?""",
                    (
                        json.dumps(sorted(categories), ensure_ascii=False),
                        json.dumps(sorted(feed_ids)),
                        article.published_at,
                        article.description,
                        article.description,
                        seen_at,
                        article.source_code,
                        article.url,
                    ),
                )
                inserted.append(False)
        return inserted

    def save_poll(self, report: PollReport) -> None:
        with self._connect() as connection:
            cursor = connection.execute(
                """INSERT INTO polls (
                    started_at, finished_at, status, feed_count, failed_feed_count,
                    new_article_count, duplicate_within_source_count,
                    cross_source_duplicate_candidate_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    report.started_at,
                    report.finished_at,
                    report.status,
                    report.feed_count,
                    report.failed_feed_count,
                    report.new_article_count,
                    report.duplicate_within_source_count,
                    report.cross_source_duplicate_candidate_count,
                ),
            )
            poll_id = cursor.lastrowid
            connection.executemany(
                """INSERT INTO feed_poll_metrics (
                    poll_id, feed_id, polled_at, parsed_article_count, rss_item_count, new_article_count,
                    duplicate_within_source_count, cross_source_duplicate_candidate_count,
                    error_count, error_message, items_missing_link, items_missing_title,
                    items_invalid_link, retention_seconds, description_char_total, description_item_count,
                    empty_description_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [
                    (
                        poll_id,
                        metric.feed_id,
                        metric.polled_at,
                        metric.parsed_article_count,
                        metric.rss_item_count,
                        metric.new_article_count,
                        metric.duplicate_within_source_count,
                        metric.cross_source_duplicate_candidate_count,
                        metric.error_count,
                        metric.error_message,
                        metric.items_missing_link,
                        metric.items_missing_title,
                        metric.items_invalid_link,
                        metric.retention_seconds,
                        metric.description_char_total,
                        metric.description_item_count,
                        metric.empty_description_count,
                    )
                    for metric in report.feed_metrics
                ],
            )

    def get_articles(self) -> list[Article]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM articles ORDER BY first_seen_at, source_code, url"
            ).fetchall()
        return [
            Article(
                source_code=row["source_code"],
                source_name=row["source_name"],
                category_codes=tuple(json.loads(row["category_codes_json"])),
                feed_ids=tuple(json.loads(row["feed_ids_json"])),
                url=row["url"],
                title=row["title"],
                published_at=row["published_at"],
                description=row["description"],
                first_seen_at=row["first_seen_at"],
                last_seen_at=row["last_seen_at"],
            )
            for row in rows
        ]

    def get_feed_metrics(self) -> list[dict[str, object]]:
        with self._connect() as connection:
            rows = connection.execute(
                """SELECT feed_id, polled_at, parsed_article_count, rss_item_count, new_article_count,
                          duplicate_within_source_count, cross_source_duplicate_candidate_count,
                          error_count, error_message, items_missing_link, items_missing_title,
                          items_invalid_link,
                          retention_seconds, description_char_total, description_item_count,
                          empty_description_count
                   FROM feed_poll_metrics ORDER BY polled_at, feed_id"""
            ).fetchall()
        return [dict(row) for row in rows]
