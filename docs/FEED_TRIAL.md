# 7-day feed trial

Run the collector on all 25 RSS feeds (5 sources × 5 categories, see [README](../README.md)) for 7 consecutive days before the pipeline design is fixed. Seven days covers one full weekly cycle, including the weekend rise in sports coverage.

Owner: Person 2 (Data). Polling interval: every 15 minutes, as shown in the prototype.

## What to record

Per feed, per poll:

| Metric | Why |
|---|---|
| New articles | Daily volume per source and category; baseline for routine coverage |
| Duplicates within a source | Same article listed in two categories of one source — to be removed |
| Duplicates across sources | Same story republished by several sources — kept, it feeds the source-count signal |
| Feed read errors | Timeouts, HTTP errors, malformed XML — input for the System Status page and failure tests |
| Feed retention | Age of the oldest item in the feed — decides how often each feed must be polled |
| Description length | Length of each item's RSS description and the share of items with an empty one — decides whether full-text scraping is needed |

## Full-text decision

Collection starts with RSS only (title + description). After the trial, Person 4 clusters the stored articles on title + description and checks wrongly merged and wrongly split events by hand. Full-text scraping is added — per source, for analysis only — if that source's descriptions are too short or empty, or if clustering errors are high.

## Rules

- **Store the articles, not only the counts.** The 7-day set becomes the shared sample dataset (Lead, milestone 2) and the "previous period" for growth calculations (Person 5).
- **Do not block other roles.** Persons 3, 4 and 5 start on the first day's data while the collector keeps running.
- **Feed retention does not need 7 days.** It can be read from the oldest item's date on the first poll.

## Already measured (16 November 2026)

| Source | Items per feed | Oldest item |
|---|---|---|
| VietNamNet | 1,000 | 1–3 months old |
| Dân trí | 100 | 4–17 days old, depending on category |

VnExpress, Tuổi Trẻ and Thanh Niên have not been measured.

## Known issue

VietNamNet's `cong-nghe.rss` is stale (newest item May 2025). The fix is deferred; until then, use its sub-feeds `cong-nghe/an-ninh-mang.rss` and `cong-nghe/ha-tang-so.rss`, or collect from the category page if the source permits.

## Output

A short summary per feed: average new articles per day, duplicate rate (both kinds), error count, and retention — plus the stored article set.
