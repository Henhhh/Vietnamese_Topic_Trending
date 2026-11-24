# Frontend handover

Written on 17 November 2026 for Person 7's milestone 6. It covers how to run the frontend, how it is organized, how to connect it to the real API, and a demo script. The frontend currently runs on **sample data** from [api-samples](api-samples/); nothing talks to a backend yet.

Page behaviour (what each page shows and why) is in [UI_STRUCTURE.md](UI_STRUCTURE.md). This file is about the code.

## Run, test, build

All commands run from the repo root. Node.js 22 or newer is recommended (developed on Node 24; Vite 8 does not support old Node versions).

| Task | Command |
|---|---|
| Install dependencies (once) | `npm --prefix frontend install` |
| Dev server at http://localhost:5173 | `npm --prefix frontend run dev` |
| Tests (66, run once) | `npm --prefix frontend test` |
| Production build into `frontend/dist` | `npm --prefix frontend run build` |
| Serve the build locally | `npm --prefix frontend run preview` |

- If your terminal is already inside `frontend/`, leave out `--prefix frontend` and run `npm install`, `npm run dev`, `npm test`, `npm run build`. Using `--prefix frontend` from inside that folder looks for `frontend/frontend/package.json` and fails with `ENOENT`.
- Routes are `/`, `/topics/<topic_id>` and `/status`. The dev server and `preview` serve the app for any of these URLs. A real deployment needs a fallback rule that returns `index.html` for unknown paths, or opening a topic link directly will 404.
- `npm run build` prints a warning that one file is over 500 kB. That is Recharts; it is harmless for this project.

## Folder layout

```
frontend/
  vite.config.js        alias @samples -> ../docs/api-samples
  src/
    main.jsx            router: /, /topics/:topicId, /status, * (not found)
    App.jsx             layout: Sidebar + TopBar + the current page
    api.js              the only file that knows where data comes from
    labels.js           Vietnamese labels and number/time formatters
    index.css           all styles: plain CSS taken from the Figma export (see "Visual design")
    pages/              OverviewPage, TopicDetailPage, StatusPage, NotFoundPage
    components/         Sidebar, TopBar, PageIntro, Metric, SummaryCards, FilterBar, TopicRow,
                        Sparkline, StatusBadge, TrendChart, ArticleItem, RelatedArticles, Icon
    *.test.js(x)        api.test.js, labels.test.js, states.test.jsx
```

Libraries: React 19, React Router 7, Recharts 3, Vite 8, and the Inter font bundled through `@fontsource/inter` (no request to Google Fonts, so the demo works offline); tests use Vitest, Testing Library and jsdom. Nothing else is needed.

## Visual design

The look comes from the Figma Make export of the prototype (`VietTrend News Analytics Dashboard.zip`, kept outside the repo): its stylesheet was adopted and the components were rebuilt to its markup, class names included (`.metric-card`, `.trends-table`, `.badge`, …). Deliberate differences from the export:

- Type is scaled 1.1× with a floor of 11 px, because the export uses 7–11 px text that is hard to read.
- Charts use Recharts (the export draws SVG by hand), styled to match; the last bucket is dashed.
- One markup serves every width. The export renders separate desktop and phone lists; here the table rows turn into cards below 600 px with CSS.
- The time-range selector of Topic Detail sits in the page header and controls the whole page (decision 2 in [UI_STRUCTURE.md](UI_STRUCTURE.md)), not inside the chart panel.
- Article logos are coloured text initials, not images, because the data has no images.
- The export's sidebar collapse is a drawer opened from the top bar below 820 px; there is no collapse button on wide screens.
- The retry button on the stale-data banner is left out (no endpoint for it).

## How data flows

Pages call functions from `api.js` and never read JSON or call `fetch` themselves. API responses carry **codes** (`rising`, `partial`, …); `labels.js` turns them into Vietnamese text. Times arrive as ISO strings with `+07:00` and are always displayed in Vietnam time, whatever the viewer's time zone.

| `api.js` function | Endpoint | Used by |
|---|---|---|
| `getTopics({ range, source, sort, q, limit, offset })` | `GET /api/topics` | Overview |
| `getTopic(topicId, { range })` | `GET /api/topics/{topic_id}` | Topic Detail |
| `getTopicArticles(topicId, { range, source, limit, offset })` | `GET /api/topics/{topic_id}/articles` (agreed with Person 6; returns `{ total, limit, offset, items }`, newest first) | Related articles |
| `getStatus()` | `GET /api/status` | System Status and the top bar |

Query parameter names and values are the ones in [api-samples/README.md](api-samples/README.md). A missing topic must be an `ApiError` with `status` 404; the Topic Detail page shows "Không tìm thấy chủ đề" for exactly that case and a generic error for anything else.

URL state lives in the query string and defaults are left out: Overview uses `range`, `source`, `sort`, `q`; Topic Detail uses `range`. Unknown values fall back to the defaults. Changing a filter pushes a history entry (so Back restores it), except typing in the search box and changing the range on Topic Detail, which replace the entry. "Quay lại danh sách" goes back one step when the user came from inside the app and links to `/` on a direct visit.

## Connecting the real API

Do these in order. The sample JSON is a proposal for Person 6, so expect small differences in field names.

1. **The contract is agreed.** Person 6 answered the three open questions in [api-samples/README.md](api-samples/README.md) (17–19 November): the separate `/articles` endpoint is accepted and takes `range`, so its `total` matches the article count on the page; `sources` stays in `GET /api/topics`; `topic_id` is an integer. Unknown or non-numeric ids return 404. `GET /api/topics/{topic_id}` only needs `articles.total`; the page already loads the list from `getTopicArticles`.
2. **Replace the bodies in `api.js`, keep the signatures.** Each function becomes a `fetch` that builds the query string from its arguments, turns a 404 into `new ApiError(404, …)` and any other non-OK response into an `ApiError` with that status, and returns the parsed JSON. Drop the sample imports, `buildSeries` and the other sample helpers.
3. **Set `SAMPLE_MODE` to `false`** at the top of `api.js`. The "Dữ liệu minh họa" badge in the top bar disappears.
4. **API address.** Not implemented yet. A simple choice is to proxy `/api` to the FastAPI server in `vite.config.js` (`server.proxy`) and call relative URLs, so no address is hard-coded. For a built demo the backend must serve the same origin or allow CORS.
5. **Remove the alias** `@samples` and `server.fs.allow` in `vite.config.js` once nothing imports the samples.
6. **Update the tests.** `api.test.js` tests the sample implementation (it asserts the 5 sample topics, 148 articles, and so on) and must be rewritten against mocked `fetch` responses. `states.test.jsx` mocks `api.js`, but it uses the real sample functions for normal responses, so it needs the same change. `labels.test.js` is unaffected.
7. **Add what the sample cannot cover:** network failure, HTTP 5xx and invalid JSON all have to end up as an `ApiError` or a rejected promise so the pages show their error state with "Thử lại".

## What is only true in sample mode

These behaviours come from `api.js` working around thin sample data, and disappear with the real API:

- Sample data only has the 24-hour view. The 6-hour and 7-day numbers and charts are **derived** from it for demonstration; they are not real.
- Which sources a topic belongs to (Overview's source filter) is made up from `source_count`.
- Topic Detail exists only for topic 1042; every other id returns 404. On Overview, the other four rows link to a "not found" page.
- The sample has 3 related articles for a topic that reports 148, so "Xem thêm bài viết" loads nothing and then hides.
- Overview's `total` is 5 (the sample topics) while the summary card says 36.

## Known gaps

- Not checked on a real phone or tablet; layouts were checked at 375 px and 768 px in the browser emulator.
- No source logos or thumbnails on articles (not in the design notes or the sample data).
- The top bar loads its status once; it does not refresh while the tab stays open.
- The feed table on System Status has no per-feed "retry" because the sample API has no endpoint for it.
- The page design follows [UI_STRUCTURE.md](UI_STRUCTURE.md), not the Figma prototype, which was not updated.

## Demo script (sample data, about 3 minutes)

Start with `npm --prefix frontend run dev` and open http://localhost:5173. Stay on topic 1 ("Giá vàng trong nước biến động"); the other rows have no detail data.

1. **Overview.** Point out the top bar ("Dữ liệu tính đến 08:15", orange dot because the last run was partial, and the sample badge), the three summary cards and the ranked table with sparklines. The dashed end of each sparkline is the current, still-incomplete bucket.
2. **Filters live in the URL.** Choose "7 ngày": the URL gets `?range=7d` and the numbers change. Sort by "Mức tăng": the new topic "Mưa lớn tại miền Trung" moves to the top. Type `gia vang` (no accents): only the gold topic remains. Press "Xóa bộ lọc" to reset.
3. **Open topic 1.** Show the header, the four cards, and the chart with its dashed last bucket. Switch 6 giờ / 24 giờ / 7 ngày: article count, sources, growth and the chart follow the range, while the trend score stays 92 ("tính trên 24 giờ gần nhất"). Note that the growth card names its baseline.
4. **Related articles.** Pick "Tuổi Trẻ" in the source filter. Click "Đọc bài gốc": it opens the original article in a new tab.
5. **Back keeps the filters.** Press "Quay lại danh sách" and show that the Overview filters from step 2 are still applied.
6. **System Status** (sidebar). Show the warning banner for the failing Dân trí Thể thao feed, the 20-feed table, the pipeline of the current run and the run log. Explain "Hoàn thành một phần": the run produced results even though one feed failed.
7. **Narrow screen.** Shrink the window (or use the browser's device mode): the sidebar turns into a drawer opened from the menu button in the top bar, and the table rows become cards.
8. **Error handling** (only if asked). Open `/topics/9999`: "Không tìm thấy chủ đề" with a link back, not a blank page.
