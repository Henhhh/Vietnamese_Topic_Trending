# 7-day feed trial

Run the collector on all 20 RSS feeds (4 sources × 5 categories, see [README](../README.md)) for 7 consecutive days before the pipeline design is fixed. Seven days covers one full weekly cycle, including the weekend rise in sports coverage.

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
| Dân trí | 100 | 4–17 days old, depending on category |

## Measured on 21 November 2026

One poll of all 20 feeds (collector, single read; not the 7-day trial). Retention is the age in days of the oldest item in the feed. Tuổi Trẻ dates contain no time zone; interpreting them as Vietnam time (UTC+7) is an inference, not publisher metadata. The newest item was about 40 minutes older than the poll, which supports that interpretation. See [collector README](../collector/README.md).

| Source | Items per feed | Oldest item (days), by category |
|---|---|---|
| VnExpress | 60 | Thời sự 2.8 · Thế giới 2.1 · Kinh tế 3.1 · Công nghệ 4.2 · Thể thao 3.3 |
| Tuổi Trẻ | 50 | Thời sự 0.9 · Thế giới 1.1 · Kinh tế 1.1 · Công nghệ (Nhịp sống số) 52.2 · Thể thao 1.3 |
| Thanh Niên | 50 | Thời sự 0.9 · Thế giới 2.2 · Kinh tế 1.9 · Công nghệ 4.1 · Thể thao 1.7 |
| Dân trí | 100 | Thời sự 1.9 · Thế giới 3.8 · Kinh tế 3.2 · Công nghệ 16.8 · Thể thao 6.6 |

Several feeds hold less than one to two days of items, so 15-minute polling is needed to avoid gaps. The Dân trí row above (4–17 days) was measured on 16 November; the 21 November values for the same source are in this table.

## Retention from stored trial polls (24 November 2026)

The table below is from `python -m collector --trial-summary` on the local collector database. It summarizes 229 recorded polls per feed through 24 November 2026 06:19 (+07:00). Retention is the maximum recorded `retention_seconds` per feed, converted to days and rounded to one decimal; it is not a single-poll reading.

| Source | Oldest item (days), by category |
|---|---|
| VnExpress | Thời sự 3.7 · Thế giới 3.0 · Kinh tế 4.1 · Công nghệ 5.8 · Thể thao 3.6 |
| Tuổi Trẻ | Thời sự 1.7 · Thế giới 2.3 · Kinh tế 1.8 · Công nghệ (Nhịp sống số) 54.8 · Thể thao 1.8 |
| Thanh Niên | Thời sự 1.8 · Thế giới 3.0 · Kinh tế 3.2 · Công nghệ 5.7 · Thể thao 2.1 |
| Dân trí | Thời sự 2.9 · Thế giới 4.8 · Kinh tế 3.8 · Công nghệ 17.2 · Thể thao 6.7 |

## Output

A short summary per feed: average new articles per day, duplicate rate (both kinds), error count, and retention — plus the stored article set.
