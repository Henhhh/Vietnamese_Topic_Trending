# API sample responses (proposal)

Sample JSON for the 3 pages, shaped by the decisions in [UI_STRUCTURE.md](../UI_STRUCTURE.md). This is a **proposal for Person 6 to review**, not a confirmed schema. The frontend is built against these files; once the API exists, only the data source changes.

All values are illustrative. Article URLs are made up; the 20 `rss_url` values in `status.json` are the real feed addresses (collected 16 November 2026).

## Endpoints

| File | Endpoint | Query parameters |
|---|---|---|
| [overview.json](overview.json) | `GET /api/topics` | `range`, `source`, `sort`, `q`, `limit`, `offset` |
| [topic-detail.json](topic-detail.json) | `GET /api/topics/{topic_id}` | `range` |
| (no sample file; same `articles` shape as in topic-detail.json) | `GET /api/topics/{topic_id}/articles` | `range`, `source`, `limit`, `offset` |
| [status.json](status.json) | `GET /api/status` | — |

- `range`: `6h`, `24h` (default), `7d`
- `source`: `vnexpress`, `tuoitre`, `thanhnien`, `dantri`; omitted = all
- `sort`: `score` (default), `articles`, `growth`
- `q`: search text
- An unknown `topic_id` returns HTTP 404.

## Conventions

- Times are ISO 8601 with the Vietnam offset, e.g. `2026-11-16T08:15:00+07:00`.
- `data_as_of` is the collection time of the latest completed run. It is the timestamp shown in the top bar and the anchor that ranges count back from.
- Status values are codes; the frontend maps them to Vietnamese labels.

| Field | Values |
|---|---|
| Topic `status` | `rising` (Đang tăng), `new` (Mới xuất hiện), `stable` (Ổn định), `falling` (Đang giảm) |
| Feed `status` | `ok` (Hoạt động), `error` (Lỗi), `no_data` (Chưa có dữ liệu) |
| Run `status` | `running` (Đang chạy), `completed` (Hoàn thành), `partial` (Hoàn thành một phần), `failed` (Lỗi) |
| Step `step` | `collect`, `nlp`, `cluster`, `score` |
| Step `status` | `completed`, `running`, `pending`, `failed` |
| `growth_baseline` | `previous_period` (24h, 7d), `same_hours_yesterday` (6h) |

## Field notes

- `score` is the single 24-hour trend score (0–100); it does not change with `range`. `article_count`, `source_count` and `growth_pct` follow `range`.
- `growth_pct` is `null` when no percentage should be shown: the topic is new, or the baseline is below the minimum count.
- `sparkline` and `timeline.points` use the bucket size of the range: 6 × 1 hour, 12 × 2 hours, or 7 × 1 day. Buckets start on round clock times. The last point has `"complete": false`.
- `excerpt` comes from the RSS description and may be an empty string.
- `overview.json` → `total` is the number of topics matching the filters; `topics` holds one page (`limit`, `offset`).
- `status.json` → `feeds` lists all 20 feeds. `last_fetched_at` is the last successful read of that feed. `warnings` lists feeds whose data is stale.

## Open questions for Person 6

1. Related articles on Topic Detail: the sample embeds the first page in `articles`. Filtering by source and loading more would need `GET /api/topics/{topic_id}/articles?source=&limit=&offset=` returning the same `articles` shape. Is a separate endpoint acceptable?
2. `overview.json` repeats the source list in `sources` so the filter can be built without another request. Keep it there, or move it to its own endpoint?
3. `topic_id` is shown as an integer. Any type works for the frontend as long as it is stable across runs.

## Answers from Person 6 (17–19 November 2026)

1. **Separate articles endpoint: accepted.** `GET /api/topics/{topic_id}/articles?range=&source=&limit=&offset=` returns `{ total, limit, offset, items }`, newest first (`published_at` descending, ties broken by article id). Notes:
   - `range` is added so `total` matches the `article_count` shown on the page; without it, picking 6h would show a different number from the list.
   - `GET /api/topics/{topic_id}` keeps `articles.total` but no longer needs `articles.items`, because the frontend loads the list from the new endpoint. Until the frontend is changed, the backend may keep returning the first page there.
   - Offset paging is enough: data only changes once per run, and `data_as_of` is fixed between runs.
2. **Keep `sources` in `GET /api/topics`.** It always lists all 4 configured sources, even one with no articles in the range or with a feed error, so the filter never loses an option. `source_distribution` in Topic Detail also lists all 4, with `article_count: 0` where needed.
3. **`topic_id` is an integer** (auto-increment primary key, sent as a JSON number). It must never be reused or derived from a title or a run number, and must stay the same across runs (see UI_STRUCTURE.md). Unknown ids, a merged cluster, and non-numeric values such as `/api/topics/abc` all return HTTP 404 with the same error body. Topics that cool down are kept, so old links still open.
