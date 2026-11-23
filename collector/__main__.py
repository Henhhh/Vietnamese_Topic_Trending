from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from collector.config import DEFAULT_TIMEOUT_SECONDS, FEEDS, POLL_INTERVAL_SECONDS
from collector.models import PollReport
from collector.reports import export_sample_articles, export_trial_summary, summarize_feed_metrics, validate_trial
from collector.service import Collector
from collector.storage import SQLiteStore


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Collect articles from the 20 configured Vietnamese RSS feeds.")
    parser.add_argument("--data-dir", type=Path, default=Path("collector/data"))
    parser.add_argument("--once", action="store_true", help="Run one poll, then exit.")
    parser.add_argument("--interval-minutes", type=float, default=POLL_INTERVAL_SECONDS / 60)
    parser.add_argument("--timeout-seconds", type=int, default=DEFAULT_TIMEOUT_SECONDS)
    parser.add_argument("--export-samples", type=Path, help="Export stored sample articles to CSV and exit.")
    parser.add_argument("--trial-summary", type=Path, help="Export observed feed metrics to CSV and exit.")
    parser.add_argument("--validate-trial", action="store_true", help="Check whether the recorded 7-day trial is complete.")
    return parser


def _print_report(report: PollReport) -> None:
    print(
        json.dumps(
            {
                "started_at": report.started_at,
                "finished_at": report.finished_at,
                "status": report.status,
                "feed_count": report.feed_count,
                "failed_feed_count": report.failed_feed_count,
                "new_article_count": report.new_article_count,
                "duplicate_within_source_count": report.duplicate_within_source_count,
                "cross_source_duplicate_candidate_count": report.cross_source_duplicate_candidate_count,
            },
            ensure_ascii=False,
            indent=2,
        ),
        flush=True,
    )


def _print_error(exc: Exception) -> None:
    print(f"Poll failed, will retry next interval: {type(exc).__name__}: {exc}", file=sys.stderr, flush=True)


def main() -> None:
    # Vietnamese messages must not crash when output is redirected on a non-UTF-8 console.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    args = _parser().parse_args()
    if args.interval_minutes <= 0:
        raise SystemExit("--interval-minutes must be positive")
    if args.timeout_seconds <= 0:
        raise SystemExit("--timeout-seconds must be positive")
    selected_reports = sum(bool(value) for value in (args.export_samples, args.trial_summary, args.validate_trial))
    if selected_reports > 1:
        raise SystemExit("Choose only one of --export-samples, --trial-summary, or --validate-trial")

    store = SQLiteStore(args.data_dir / "collector.sqlite3")
    if args.export_samples:
        export_sample_articles(store.get_articles(), args.export_samples)
        print(f"Đã xuất {len(store.get_articles())} bài sang {args.export_samples}")
        return
    if args.trial_summary:
        rows = summarize_feed_metrics(FEEDS, store.get_feed_metrics())
        export_trial_summary(rows, args.trial_summary)
        print(f"Đã xuất số liệu đã ghi nhận sang {args.trial_summary}")
        return
    if args.validate_trial:
        result = validate_trial(FEEDS, store.get_feed_metrics())
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    collector = Collector(
        feeds=FEEDS,
        store=store,
        timeout_seconds=args.timeout_seconds,
    )
    if args.once:
        _print_report(collector.collect_once())
        return

    collector.run_forever(interval_seconds=round(args.interval_minutes * 60), on_report=_print_report, on_error=_print_error)


if __name__ == "__main__":
    main()
