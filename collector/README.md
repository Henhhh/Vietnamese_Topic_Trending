# Person 2 — RSS data collector

This package owns RSS collection only. It polls the 20 feeds listed in the project sample status data every 15 minutes, stores articles and per-feed poll metrics in a local SQLite database, and can export sample articles and a trial summary. It does not call the NLP, clustering, scoring, or backend code.

## Run

From the repository root, with Python 3.10 or newer:

```powershell
python -m collector
```

The default run continues polling every 15 minutes. Each failed feed is recorded while the other feeds continue. Data is written to `collector/data/collector.sqlite3`.

Useful one-off commands:

```powershell
python -m collector --once
python -m unittest discover -s collector/tests -v
python -m collector --trial-summary collector/exports/feed-trial.csv
python -m collector --validate-trial
python -m collector --export-samples collector/exports/sample-articles.csv
```

The CSV summary reports observed metrics; it does not fill missing trial days with estimates. `--validate-trial` reports the first poll, expected end, elapsed days, feed coverage, actual and expected polls per feed, missing intervals, consecutive dates, and an overall complete/incomplete status. Completion requires seven elapsed days and, for every configured feed, at least one poll on each of seven consecutive calendar days (UTC dates). Gaps inside those days, for example while the machine was off, do not fail the check; they are reported as `missing_intervals` and `coverage_pct` (cadence slots matched divided by slots due; timestamps may vary by up to two minutes from a slot), and trial results must state that coverage. Failed feed reads remain visible in the error metrics and do not stop other feeds. The cross-source duplicate metric is an exact-title candidate count (case, accents, and punctuation ignored); those articles are kept. It does not claim to detect rewritten headlines.

Metric definitions: `rss_item_count` includes every RSS item from successfully parsed feeds, while `parsed_article_count` includes only items with a usable title and URL. `rss_item_count_poll_count` shows how many successful polls contributed an RSS item count; failed reads and rows recorded before this metric existed are unknown. Missing titles, missing links, and invalid links are counted independently. Within-source duplicates are later copies of the same normalized URL from another category feed of that source. Cross-source candidates are later sources with the same normalized title. Each duplicate rate divides its count by the parsed article items observed for that feed. New articles per day assigns a URL found in multiple feeds during one poll to the feed that reported it first, then divides that feed's first-seen count by calendar days with poll records. Retention uses the oldest valid publish date across all RSS items, including items without a valid title or URL. Description length and the empty-description rate use all RSS items; an empty description contributes zero characters.

## Stored article fields

Articles are keyed by `(source_code, normalized_url)`. Repeated items from two categories of the same source are stored once with both category and feed IDs. Matching articles from different sources are retained separately. Missing publish dates are stored as `NULL`; articles with no title, missing URL, or invalid URL are skipped and counted in feed metrics. Existing databases are migrated when opened to add the new RSS-item and invalid-link metric columns; historical rows cannot recover item-level counts that were not recorded before the upgrade.

The normalized article URL drops the fragment and common tracking parameters (`utm_*`, `fbclid`, `gclid`, `dclid`, `mc_cid`, `mc_eid`, `ref`, and `ref_src`). It does not fetch article pages. Full-text scraping remains outside this module until the team decides it is needed after the feed trial.

## Publish dates

Standard RSS (RFC 822) and ISO 8601 dates are read directly. Tuổi Trẻ writes `pubDate` as `11/21/2026 11:44:00 AM` (month first, 12-hour clock, a narrow no-break space before AM/PM, no time zone); the parser reads it as Vietnam time (UTC+7) and stores UTC. That zone is inferred, not stated by the feed: the newest items were about 40 minutes older than the poll when checked on 21 November 2026. Any other unreadable date is stored as `NULL`, never guessed.

## Use from the pipeline

The collector has no dependency on NLP, clustering or the backend. A caller imports it and reads normalized, deduplicated articles:

```python
from collector.service import Collector
from collector.storage import SQLiteStore

store = SQLiteStore("collector/data/collector.sqlite3")
report = Collector(store=store).collect_once()   # report.articles = articles first seen in this poll
all_articles = store.get_articles()              # every stored article
```

Each `Article` has `source_code`, `source_name`, `category_codes`, `feed_ids`, `url` (normalized), `title`, `published_at` (UTC ISO or `None`), `description` (plain text), `first_seen_at` and `last_seen_at`. `report.status` is `completed`, `partial` (some feeds failed) or `failed`. `run_forever` keeps polling if one poll raises (for example a locked database) and passes the error to `on_error`. The exact hand-over format to the orchestration step is still to be agreed with Person 1.

## Add a feed

1. Verify the feed URL and source category against the publisher's RSS index.
2. In `collector/config.py`, add an explicit alias for the label under the source's key in `_ALIASES` (a new source needs a new key) and map it to one of the five shared category codes. Unknown labels raise `KeyError`; they are never assigned a guessed category.
3. Add the `FeedSpec` to `FEEDS` with a unique `feed_id`, source code, source name, source category label, and URL.
4. Fetch the feed once and check its `pubDate` format. If the parser cannot read it, publish dates become `NULL` and retention is empty (this happened with Tuổi Trẻ); add a test and a parser rule.
5. Add or update tests for category mapping, parsing, and duplicate behavior before changing the collector.
6. Run the collector's test suite and review the changed-file list before handing the source off.

This package uses only the Python standard library. It writes local collection data only; it does not create or modify the shared backend database.
