from __future__ import annotations

import csv
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from collector.config import FEEDS, POLL_INTERVAL_SECONDS, FeedSpec, map_category
from collector.parser import FeedParseError, normalize_url, parse_feed
from collector.reports import export_sample_articles, summarize_feed_metrics, validate_trial
from collector.service import Collector
from collector.storage import SQLiteStore


def rss_item(
    title: str,
    link: str,
    published: str | None = "Wed, 18 Nov 2026 08:00:00 +0700",
    description: str = "<p>Tin mới.</p>",
) -> str:
    date = f"<pubDate>{published}</pubDate>" if published else ""
    return (
        "<item>"
        f"<title>{title}</title><link>{link}</link>{date}"
        f"<description>{description}</description>"
        "</item>"
    )


def rss(*items: str) -> bytes:
    return ("<rss><channel>" + "".join(items) + "</channel></rss>").encode()


def feed(
    feed_id: int,
    source_code: str = "vnexpress",
    category_code: str = "thoi-su",
    url: str | None = None,
) -> FeedSpec:
    return FeedSpec(
        feed_id=feed_id,
        source_code=source_code,
        source_name={
            "vnexpress": "VnExpress",
            "tuoitre": "Tuổi Trẻ",
            "thanhnien": "Thanh Niên",
            "dantri": "Dân trí",
        }[source_code],
        category_code=category_code,
        category_name={
            "thoi-su": "Thời sự",
            "the-gioi": "Thế giới",
            "kinh-te": "Kinh tế",
            "cong-nghe": "Công nghệ",
            "the-thao": "Thể thao",
        }[category_code],
        url=url or f"https://example.test/{feed_id}.rss",
    )


class FeedConfigurationTests(unittest.TestCase):
    def test_config_has_each_of_twenty_source_category_combinations(self) -> None:
        sources = {"vnexpress", "tuoitre", "thanhnien", "dantri"}
        categories = {"thoi-su", "the-gioi", "kinh-te", "cong-nghe", "the-thao"}

        self.assertEqual(len(FEEDS), 20)
        self.assertEqual(POLL_INTERVAL_SECONDS, 900)
        self.assertEqual({item.source_code for item in FEEDS}, sources)
        self.assertEqual(
            {(item.source_code, item.category_code) for item in FEEDS},
            {(source, category) for source in sources for category in categories},
        )

    def test_source_category_aliases_map_to_shared_categories(self) -> None:
        self.assertEqual(map_category("vnexpress", "Kinh doanh"), "kinh-te")
        self.assertEqual(map_category("tuoitre", "Nhịp sống số"), "cong-nghe")
        self.assertEqual(map_category("dantri", "Thể thao"), "the-thao")

    def test_unknown_category_is_not_silently_mapped(self) -> None:
        with self.assertRaises(KeyError):
            map_category("vnexpress", "Danh mục chưa cấu hình")

    def test_every_configured_source_label_maps_to_its_shared_category(self) -> None:
        for configured_feed in FEEDS:
            with self.subTest(feed_id=configured_feed.feed_id):
                self.assertEqual(
                    map_category(configured_feed.source_code, configured_feed.category_name),
                    configured_feed.category_code,
                )


class FeedParserTests(unittest.TestCase):
    def test_normalize_url_removes_tracking_parameters_and_fragment(self) -> None:
        self.assertEqual(
            normalize_url("https://news.test/a?id=7&utm_source=rss&fbclid=x#comments"),
            "https://news.test/a?id=7",
        )

    def test_normalize_url_sorts_query_parameters_and_preserves_ipv6(self) -> None:
        self.assertEqual(
            normalize_url("HTTP://[2001:DB8::1]:8080/a?b=2&a=1#top"),
            "http://[2001:db8::1]:8080/a?a=1&b=2",
        )

    def test_rss_article_without_date_is_kept_with_no_published_at(self) -> None:
        parsed = parse_feed(
            rss(rss_item("Bài chưa có ngày", "https://news.test/no-date", published=None)),
            feed(1),
        )

        self.assertEqual(len(parsed.articles), 1)
        self.assertIsNone(parsed.articles[0].published_at)
        self.assertEqual(parsed.articles[0].title, "Bài chưa có ngày")

    def test_us_style_date_without_timezone_is_read_as_vietnam_time(self) -> None:
        # Tuổi Trẻ publishes "11/21/2026 11:44:00 AM" (month first, 12-hour clock, no zone).
        parsed = parse_feed(
            rss(rss_item("Bài Tuổi Trẻ", "https://news.test/tt", published="11/21/2026 11:44:00 AM")),
            feed(1, source_code="tuoitre"),
        )

        self.assertEqual(parsed.articles[0].published_at, "2026-11-21T04:44:00+00:00")
        self.assertEqual(parsed.oldest_item_published_at, "2026-11-21T04:44:00+00:00")

    def test_us_style_date_accepts_narrow_no_break_space_before_am_pm(self) -> None:
        # The live Tuổi Trẻ feed puts U+202F, not a plain space, before AM/PM.
        parsed = parse_feed(
            rss(rss_item("Bài", "https://news.test/nb", published="11/21/2026 11:44:00 AM")),
            feed(1, source_code="tuoitre"),
        )

        self.assertEqual(parsed.articles[0].published_at, "2026-11-21T04:44:00+00:00")

    def test_us_style_date_handles_pm_and_midnight(self) -> None:
        parsed = parse_feed(
            rss(
                rss_item("Chiều", "https://news.test/pm", published="11/21/2026 1:05:00 PM"),
                rss_item("Nửa đêm", "https://news.test/am", published="11/21/2026 12:10:00 AM"),
            ),
            feed(1, source_code="tuoitre"),
        )

        self.assertEqual(parsed.articles[0].published_at, "2026-11-21T06:05:00+00:00")
        self.assertEqual(parsed.articles[1].published_at, "2026-11-20T17:10:00+00:00")

    def test_unparseable_date_is_still_stored_as_none(self) -> None:
        parsed = parse_feed(
            rss(rss_item("Ngày lạ", "https://news.test/odd", published="hôm qua")),
            feed(1),
        )

        self.assertIsNone(parsed.articles[0].published_at)

    def test_rss_description_is_plain_text(self) -> None:
        parsed = parse_feed(
            rss(rss_item("Tiêu đề", "https://news.test/a", description="<p>A &amp; B</p>")),
            feed(1),
        )

        self.assertEqual(parsed.articles[0].description, "A & B")

    def test_items_without_links_are_dropped_and_counted(self) -> None:
        parsed = parse_feed(
            "<rss><channel><item><title>Thiếu URL</title></item></channel></rss>".encode(),
            feed(1),
        )

        self.assertEqual(len(parsed.articles), 0)
        self.assertEqual(parsed.items_missing_link, 1)

    def test_item_metrics_include_items_missing_title_or_link(self) -> None:
        parsed = parse_feed(
            rss(
                rss_item("Hợp lệ", "https://news.test/ok", description="<p>one</p>"),
                "<item><title>Thiếu URL</title><description>two</description></item>",
                "<item><link>https://news.test/no-title</link><description>three</description></item>",
                "<item><description>four</description></item>",
            ),
            feed(1),
        )

        self.assertEqual(parsed.rss_item_count, 4)
        self.assertEqual(len(parsed.articles), 1)
        self.assertEqual(parsed.items_missing_link, 2)
        self.assertEqual(parsed.items_missing_title, 2)
        self.assertEqual(parsed.description_item_count, 4)
        self.assertEqual(parsed.description_char_total, 15)
        self.assertEqual(parsed.empty_description_count, 0)

    def test_invalid_article_url_is_counted_and_other_items_are_parsed(self) -> None:
        parsed = parse_feed(
            rss(
                rss_item("URL lỗi", "javascript:alert(1)"),
                rss_item("URL malformed", "http://[invalid/"),
                rss_item("Host lỗi", "https://bad host/story"),
                rss_item("URL hợp lệ", "https://news.test/ok"),
            ),
            feed(1),
        )

        self.assertEqual(parsed.rss_item_count, 4)
        self.assertEqual(len(parsed.articles), 1)
        self.assertEqual(parsed.items_invalid_link, 3)
        self.assertEqual(parsed.items_missing_link, 0)

    def test_malformed_feed_raises_parse_error(self) -> None:
        with self.assertRaises(FeedParseError):
            parse_feed(b"<rss><channel>", feed(1))


class CollectorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.store = SQLiteStore(Path(self.tempdir.name) / "collector.sqlite3")
        self.now = datetime(2026, 11, 20, 8, 0, tzinfo=timezone.utc)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_broken_feed_is_recorded_and_other_feeds_still_collect(self) -> None:
        feeds = [feed(1), feed(2, category_code="the-gioi")]
        payloads = {
            feeds[0].url: b"not xml",
            feeds[1].url: rss(rss_item("Bài còn lại", "https://news.test/ok")),
        }
        collector = Collector(
            feeds=feeds,
            store=self.store,
            fetcher=lambda configured_feed, timeout: payloads[configured_feed.url],
            clock=lambda: self.now,
        )

        report = collector.collect_once()

        self.assertEqual(report.status, "partial")
        self.assertEqual(report.failed_feed_count, 1)
        self.assertEqual(report.new_article_count, 1)
        self.assertEqual(len(self.store.get_articles()), 1)

    def test_network_failure_is_recorded_and_does_not_stop_other_feeds(self) -> None:
        feeds = [feed(1), feed(2, category_code="the-gioi")]

        def fetch(configured_feed: FeedSpec, timeout: int) -> bytes:
            if configured_feed.feed_id == 1:
                raise TimeoutError("request timed out")
            return rss(rss_item("Bài từ feed còn lại", "https://news.test/available"))

        collector = Collector(feeds=feeds, store=self.store, fetcher=fetch, clock=lambda: self.now)

        report = collector.collect_once()

        self.assertEqual(report.failed_feed_count, 1)
        self.assertEqual(report.status, "partial")
        self.assertEqual(report.new_article_count, 1)
        self.assertIn("TimeoutError", report.feed_metrics[0].error_message)

    def test_run_forever_keeps_polling_after_a_poll_raises(self) -> None:
        calls = {"n": 0}
        reports: list = []
        errors: list = []

        collector = Collector(
            feeds=[feed(1)],
            store=self.store,
            fetcher=lambda configured_feed, timeout: rss(rss_item("Bài", "https://news.test/x")),
            clock=lambda: self.now,
        )
        original = collector.collect_once

        def flaky():
            calls["n"] += 1
            if calls["n"] == 1:
                raise sqlite3.OperationalError("database is locked")
            if calls["n"] == 3:
                raise KeyboardInterrupt
            return original()

        collector.collect_once = flaky
        with self.assertRaises(KeyboardInterrupt):
            collector.run_forever(
                interval_seconds=1,
                on_report=reports.append,
                on_error=errors.append,
                sleep=lambda seconds: None,
            )

        self.assertEqual(calls["n"], 3)
        self.assertEqual(len(reports), 1)
        self.assertEqual(len(errors), 1)
        self.assertIsInstance(errors[0], sqlite3.OperationalError)

    def test_same_source_url_in_two_categories_is_stored_once_with_both_categories(self) -> None:
        feeds = [feed(1, category_code="thoi-su"), feed(2, category_code="the-gioi")]
        payload = rss(rss_item("Bài trùng", "https://news.test/story?utm_source=rss"))
        collector = Collector(
            feeds=feeds,
            store=self.store,
            fetcher=lambda configured_feed, timeout: payload,
            clock=lambda: self.now,
        )

        report = collector.collect_once()
        articles = self.store.get_articles()

        self.assertEqual(report.new_article_count, 1)
        self.assertEqual(report.duplicate_within_source_count, 1)
        self.assertEqual(len(articles), 1)
        self.assertEqual(set(articles[0].category_codes), {"thoi-su", "the-gioi"})
        self.assertEqual(set(articles[0].feed_ids), {1, 2})

    def test_new_article_count_belongs_to_feed_that_first_reported_it(self) -> None:
        first_feed = feed(10, category_code="thoi-su")
        second_feed = feed(1, category_code="the-gioi")
        payload = rss(rss_item("Bài trùng", "https://news.test/story"))
        collector = Collector(
            feeds=[first_feed, second_feed],
            store=self.store,
            fetcher=lambda configured_feed, timeout: payload,
            clock=lambda: self.now,
        )

        report = collector.collect_once()

        counts = {metric.feed_id: metric.new_article_count for metric in report.feed_metrics}
        self.assertEqual(counts, {10: 1, 1: 0})
        self.assertEqual(report.new_article_count, sum(counts.values()))

    def test_same_title_across_sources_is_counted_but_both_articles_are_kept(self) -> None:
        feeds = [feed(1, "vnexpress"), feed(6, "tuoitre")]
        payloads = {
            feeds[0].url: rss(rss_item("Đội tuyển Việt Nam thắng", "https://vnexpress.test/a")),
            feeds[1].url: rss(rss_item("Doi tuyen Viet Nam thang", "https://tuoitre.test/b")),
        }
        collector = Collector(
            feeds=feeds,
            store=self.store,
            fetcher=lambda configured_feed, timeout: payloads[configured_feed.url],
            clock=lambda: self.now,
        )

        report = collector.collect_once()

        self.assertEqual(report.cross_source_duplicate_candidate_count, 1)
        self.assertEqual(report.new_article_count, 2)
        self.assertEqual(len(self.store.get_articles()), 2)

    def test_repeated_poll_does_not_count_previously_stored_article_as_new(self) -> None:
        configured_feed = feed(1)
        payload = rss(rss_item("Bài cũ", "https://news.test/old"))
        collector = Collector(
            feeds=[configured_feed],
            store=self.store,
            fetcher=lambda configured_feed, timeout: payload,
            clock=lambda: self.now,
        )

        first = collector.collect_once()
        second = collector.collect_once()

        self.assertEqual(first.new_article_count, 1)
        self.assertEqual(second.new_article_count, 0)
        self.assertEqual(second.duplicate_within_source_count, 0)
        self.assertEqual(len(self.store.get_articles()), 1)

    def test_metrics_measure_retention_and_empty_descriptions(self) -> None:
        configured_feed = feed(1)
        oldest = (self.now - timedelta(hours=3)).astimezone(timezone(timedelta(hours=7)))
        payload = rss(
            rss_item("Cũ nhất", "https://news.test/old", published=oldest.strftime("%a, %d %b %Y %H:%M:%S %z")),
            rss_item(
                "Rỗng mô tả",
                "https://news.test/empty",
                published=self.now.strftime("%a, %d %b %Y %H:%M:%S +0000"),
                description="",
            ),
        )
        collector = Collector(
            feeds=[configured_feed],
            store=self.store,
            fetcher=lambda configured_feed, timeout: payload,
            clock=lambda: self.now,
        )

        report = collector.collect_once()
        metric = report.feed_metrics[0]

        self.assertEqual(metric.empty_description_count, 1)
        self.assertEqual(metric.description_item_count, 2)
        self.assertAlmostEqual(metric.retention_seconds, 3 * 60 * 60, delta=1)

    def test_retention_uses_oldest_item_even_when_it_has_no_valid_url(self) -> None:
        configured_feed = feed(1)
        oldest = self.now - timedelta(hours=8)
        newer = self.now - timedelta(hours=2)
        payload = rss(
            f"<item><title>Không có link</title><pubDate>{oldest.strftime('%a, %d %b %Y %H:%M:%S +0000')}</pubDate>"
            "<description>item cũ</description></item>",
            rss_item(
                "Có link",
                "https://news.test/newer",
                published=newer.strftime("%a, %d %b %Y %H:%M:%S +0000"),
            ),
        )
        collector = Collector(
            feeds=[configured_feed],
            store=self.store,
            fetcher=lambda configured_feed, timeout: payload,
            clock=lambda: self.now,
        )

        metric = collector.collect_once().feed_metrics[0]

        self.assertEqual(metric.parsed_article_count, 1)
        self.assertEqual(metric.rss_item_count, 2)
        self.assertAlmostEqual(metric.retention_seconds, 8 * 60 * 60, delta=1)

    def test_invalid_article_url_does_not_fail_the_feed(self) -> None:
        configured_feed = feed(1)
        payload = rss(
            rss_item("URL lỗi", "javascript:alert(1)"),
            rss_item("Bài hợp lệ", "https://news.test/ok"),
        )
        collector = Collector(
            feeds=[configured_feed],
            store=self.store,
            fetcher=lambda configured_feed, timeout: payload,
            clock=lambda: self.now,
        )

        report = collector.collect_once()

        self.assertEqual(report.status, "completed")
        self.assertEqual(report.failed_feed_count, 0)
        self.assertEqual(report.new_article_count, 1)
        self.assertEqual(report.feed_metrics[0].items_invalid_link, 1)
        self.assertEqual(report.feed_metrics[0].rss_item_count, 2)
        self.assertEqual(len(self.store.get_articles()), 1)
        stored_metric = self.store.get_feed_metrics()[0]
        self.assertEqual(stored_metric["items_invalid_link"], 1)
        self.assertEqual(stored_metric["rss_item_count"], 2)

    def test_existing_database_is_migrated_for_new_feed_metrics(self) -> None:
        database_path = Path(self.tempdir.name) / "legacy.sqlite3"
        connection = sqlite3.connect(database_path)
        try:
            connection.execute(
                """CREATE TABLE feed_poll_metrics (
                    metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    poll_id INTEGER NOT NULL,
                    feed_id INTEGER NOT NULL,
                    polled_at TEXT NOT NULL,
                    parsed_article_count INTEGER NOT NULL,
                    new_article_count INTEGER NOT NULL,
                    duplicate_within_source_count INTEGER NOT NULL,
                    cross_source_duplicate_candidate_count INTEGER NOT NULL,
                    error_count INTEGER NOT NULL,
                    error_message TEXT,
                    items_missing_link INTEGER NOT NULL,
                    items_missing_title INTEGER NOT NULL,
                    retention_seconds REAL,
                    description_char_total INTEGER NOT NULL,
                    description_item_count INTEGER NOT NULL,
                    empty_description_count INTEGER NOT NULL
                )"""
            )
        finally:
            connection.close()

        SQLiteStore(database_path)

        connection = sqlite3.connect(database_path)
        try:
            columns = {row[1] for row in connection.execute("PRAGMA table_info(feed_poll_metrics)")}
        finally:
            connection.close()
        self.assertIn("rss_item_count", columns)
        self.assertIn("items_invalid_link", columns)


class TrialReportTests(unittest.TestCase):
    @staticmethod
    def _poll_metrics(feeds, start: datetime, slot_count: int, omit=None):
        omitted = omit or set()
        rows = []
        for slot in range(slot_count):
            polled_at = (start + timedelta(minutes=15 * slot)).isoformat()
            for configured_feed in feeds:
                if (configured_feed.feed_id, slot) not in omitted:
                    rows.append({"feed_id": configured_feed.feed_id, "polled_at": polled_at})
        return rows

    def test_trial_validation_detects_missing_poll_intervals_per_feed(self) -> None:
        feeds = [feed(1), feed(2, category_code="the-gioi")]
        start = datetime(2026, 11, 13, 8, 0, tzinfo=timezone.utc)
        metrics = self._poll_metrics(feeds, start, 672, omit={(2, 100)})

        result = validate_trial(feeds, metrics, now=start + timedelta(days=7))

        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["expected_polls_per_feed"], 672)
        self.assertEqual(result["missing_interval_count"], 1)
        feed_results = {item["feed_id"]: item for item in result["feeds"]}
        self.assertEqual(feed_results[1]["coverage_pct"], 100.0)
        self.assertEqual(feed_results[2]["actual_polls"], 671)
        self.assertEqual(feed_results[2]["missing_intervals"], 1)
        self.assertEqual(feed_results[2]["coverage_pct"], 99.9)

    def test_trial_validation_accepts_complete_seven_day_cadence(self) -> None:
        feeds = [feed(1)]
        start = datetime(2026, 11, 13, 8, 0, tzinfo=timezone.utc)
        metrics = self._poll_metrics(feeds, start, 672)

        result = validate_trial(feeds, metrics, now=start + timedelta(days=7))

        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["due_polls_per_feed"], 672)
        self.assertEqual(result["consecutive_days"], 8)
        self.assertEqual(result["missing_interval_count"], 0)
        self.assertEqual(result["feeds"][0]["actual_polls"], 672)

    def test_trial_validation_requires_seven_elapsed_days_and_full_feed_coverage(self) -> None:
        feeds = [feed(1), feed(2, category_code="the-gioi")]
        start = datetime(2026, 11, 13, 8, 0, tzinfo=timezone.utc)
        metrics = self._poll_metrics(feeds, start, 576)
        metrics = [row for row in metrics if row["feed_id"] == 1]

        result = validate_trial(feeds, metrics, now=start + timedelta(days=6))

        self.assertEqual(result["status"], "incomplete")
        self.assertEqual(result["elapsed_days"], 6)
        self.assertEqual(result["feed_coverage"], {"expected": 2, "observed": 1})
        feed_results = {item["feed_id"]: item for item in result["feeds"]}
        self.assertEqual(feed_results[1]["actual_polls"], 576)
        self.assertEqual(feed_results[2]["actual_polls"], 0)

    def test_trial_validation_accepts_seven_calendar_days_and_reports_low_coverage(self) -> None:
        configured_feed = feed(1)
        start = datetime(2026, 11, 13, 8, 0, tzinfo=timezone.utc)
        metrics = [
            {"feed_id": 1, "polled_at": (start + timedelta(days=day)).isoformat()}
            for day in range(7)
        ]

        result = validate_trial([configured_feed], metrics, now=start + timedelta(days=7))

        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["consecutive_days"], 7)
        self.assertEqual(result["coverage_pct"], 1.0)
        self.assertEqual(result["feeds"][0]["actual_polls"], 7)
        self.assertEqual(result["feeds"][0]["missing_intervals"], 665)

    def test_trial_validation_rejects_a_calendar_day_without_polls(self) -> None:
        configured_feed = feed(1)
        start = datetime(2026, 11, 13, 8, 0, tzinfo=timezone.utc)
        metrics = [
            {"feed_id": 1, "polled_at": (start + timedelta(days=day)).isoformat()}
            for day in (0, 1, 2, 4, 5, 6)
        ]

        result = validate_trial([configured_feed], metrics, now=start + timedelta(days=7))

        self.assertEqual(result["status"], "incomplete")
        self.assertEqual(result["consecutive_days"], 3)

    def test_summary_reports_new_per_day_duplicate_rates_errors_retention_and_descriptions(self) -> None:
        configured_feed = feed(1)
        rows = [
            {
                "feed_id": 1,
                "polled_at": "2026-11-20T08:00:00+00:00",
                "parsed_article_count": 4,
                "new_article_count": 3,
                "duplicate_within_source_count": 1,
                "cross_source_duplicate_candidate_count": 1,
                "error_count": 0,
                "retention_seconds": 3600,
                "description_char_total": 60,
                "description_item_count": 4,
                "empty_description_count": 1,
            },
            {
                "feed_id": 1,
                "polled_at": "2026-11-20T08:15:00+00:00",
                "parsed_article_count": 2,
                "new_article_count": 1,
                "duplicate_within_source_count": 0,
                "cross_source_duplicate_candidate_count": 0,
                "error_count": 1,
                "retention_seconds": 7200,
                "description_char_total": 20,
                "description_item_count": 2,
                "empty_description_count": 0,
            },
        ]

        summary = summarize_feed_metrics([configured_feed], rows)[0]

        self.assertEqual(summary["new_per_day"], 4)
        self.assertAlmostEqual(summary["within_source_duplicate_rate"], 1 / 6)
        self.assertAlmostEqual(summary["cross_source_duplicate_candidate_rate"], 1 / 6)
        self.assertEqual(summary["error_count"], 1)
        self.assertEqual(summary["retention_seconds"], 7200)
        self.assertAlmostEqual(summary["average_description_length"], 80 / 6)
        self.assertEqual(summary["empty_description_rate"], 1 / 6)

    def test_empty_description_rate_uses_all_rss_items(self) -> None:
        summary = summarize_feed_metrics(
            [feed(1)],
            [
                {
                    "feed_id": 1,
                    "polled_at": "2026-11-20T08:00:00+00:00",
                    "parsed_article_count": 1,
                    "rss_item_count": 3,
                    "new_article_count": 1,
                    "duplicate_within_source_count": 0,
                    "cross_source_duplicate_candidate_count": 0,
                    "error_count": 0,
                    "retention_seconds": 3600,
                    "description_char_total": 4,
                    "description_item_count": 3,
                    "empty_description_count": 2,
                }
            ],
        )[0]

        self.assertAlmostEqual(summary["average_description_length"], 4 / 3)
        self.assertAlmostEqual(summary["empty_description_rate"], 2 / 3)
        self.assertEqual(summary["rss_item_count"], 3)
        self.assertEqual(summary["rss_item_count_poll_count"], 1)

    def test_sample_export_has_only_the_shared_sample_fields(self) -> None:
        configured_feed = feed(1)
        payload = rss(rss_item("Tiêu đề, có dấu phẩy", "https://news.test/a"))
        article = parse_feed(payload, configured_feed).articles[0]
        with tempfile.TemporaryDirectory() as tempdir:
            destination = Path(tempdir) / "sample.csv"

            export_sample_articles([article], destination)

            with destination.open(encoding="utf-8-sig", newline="") as stream:
                rows = list(csv.DictReader(stream))
        self.assertEqual(list(rows[0]), ["source", "url", "title", "publish_date"])
        self.assertEqual(rows[0]["source"], "vnexpress")
        self.assertEqual(rows[0]["title"], "Tiêu đề, có dấu phẩy")


if __name__ == "__main__":
    unittest.main()
