# UI structure — Figma Make prototype

Source: [VietTrend News Analytics Dashboard](https://www.figma.com/make/VU37P9iZBcz4mLCA3VRZOa/VietTrend-News-Analytics-Dashboard) (Figma Make), read on 16 November 2026 at desktop width (1440 px).

This records what each of the 3 pages shows, so the API JSON can be checked against it. UI labels are kept in Vietnamese as they appear in the prototype. All numbers in the prototype are illustrative ("Dữ liệu minh họa").

## Shared layout

- **Sidebar**: logo "VietTrend"; group "KHÁM PHÁ" with two entries — **Tổng quan** and **Trạng thái hệ thống**; a note card "Điểm xu hướng: Chỉ số tương đối 0–100 dựa trên lượng bài, mức tăng, độ mới và đa dạng nguồn."; footer "ĐỒ ÁN PHÂN TÍCH TIN TỨC"; a collapse button.
- **Top bar**: update status with timestamp ("Cập nhật thành công · 08:42, 24/05/2025") and a "Dữ liệu minh họa" badge.
- **Navigation**: Topic Detail has no sidebar entry; it opens by clicking a topic row on Overview. The prototype does not change the URL between pages.

Data needed by the layout: last successful update time and its status.

## Page 1 — Overview (Tổng quan)

Heading "Xu hướng tin tức" · "Phát hiện chủ đề mới nổi từ các nguồn báo tiếng Việt".

### Summary cards

| Card | Value | Sub-text |
|---|---|---|
| Bài viết trong khoảng thời gian | 1.284 | Trong 24 giờ gần nhất |
| Chủ đề được phát hiện | 36 | 12 chủ đề đang tăng |
| Nguồn có dữ liệu | 18 / 20 | 2 nguồn cần kiểm tra |

### Filters

| Control | Options |
|---|---|
| Search box | "Tìm kiếm chủ đề hoặc từ khóa…" |
| Time range | 6 giờ · 24 giờ (default) · 7 ngày |
| Source | Tất cả nguồn (default), VnExpress, Tuổi Trẻ, Thanh Niên, VietnamPlus |
| Sort | Điểm xu hướng (default), Số bài viết, Mức tăng |
| Reset | "Xóa bộ lọc" |

### Table "Chủ đề nổi bật"

Sub-header echoes the active filters ("Khoảng thời gian: 24 giờ gần nhất · Tất cả nguồn") and a result count ("5 kết quả"). Shows 4 rows, then a "Xem thêm chủ đề" button loads more.

| Column | Content | Example |
|---|---|---|
| Thứ hạng | Rank | 1 |
| Chủ đề | Topic title, up to 3 keyword tags, status badge | Giá vàng trong nước biến động · giá vàng, SJC, thị trường · Đang tăng |
| Điểm xu hướng | Score out of 100 | 92 / 100 |
| Số bài viết | Article count | 148 |
| Số nguồn | Source count | 12 |
| Mức tăng | Growth vs. previous period, or "Mới xuất hiện" for a new topic | ↑ 68% |
| Diễn biến | Sparkline of article count over time | — |
| (arrow) | Whole row opens Topic Detail | — |

Status badge values seen: **Đang tăng**, **Mới xuất hiện**, **Ổn định**, **Đang giảm**.

Sample rows in the prototype:

| # | Topic | Tags | Status | Score | Articles | Sources | Growth |
|---|---|---|---|---|---|---|---|
| 1 | Giá vàng trong nước biến động | giá vàng, SJC, thị trường | Đang tăng | 92 | 148 | 12 | ↑ 68% |
| 2 | Mưa lớn tại miền Trung | mưa lớn, miền Trung, cảnh báo | Mới xuất hiện | 87 | 96 | 9 | Mới xuất hiện |
| 3 | Ứng dụng AI trong giáo dục | AI, giáo dục, công nghệ | Đang tăng | 74 | 78 | 11 | ↑ 24% |
| 4 | Thị trường xe điện Việt Nam | xe điện, thị trường, hạ tầng sạc | Ổn định | 61 | 54 | 8 | ↑ 6% |
| 5 | Điều chỉnh lịch thi tốt nghiệp THPT | kỳ thi, THPT, lịch thi | Đang giảm | 48 | 39 | 7 | ↓ 12% |

Footer note: "Xu hướng phản ánh mức độ đưa tin trong tập nguồn đã thu thập, không phải lượng tìm kiếm hay ý kiến của toàn bộ người dân."

The page also contains a card-style version of the same rows (rank, status, title, 2 tags, Điểm, Mức tăng, Bài viết, Nguồn) for narrow screens.

## Page 2 — Topic Detail (Chi tiết chủ đề)

Breadcrumb "Tổng quan › Chi tiết chủ đề" and a "Quay lại danh sách" link.

### Header

- Topic title, keyword tags, status badge (same as the Overview row).
- "Phát hiện đầu tiên" (first detected: 22/05, 06:15) and "Cập nhật" (updated: 24/05, 08:42).

### Metric cards

| Card | Value | Sub-text |
|---|---|---|
| Điểm xu hướng (with info tooltip: "Chỉ số tương đối dựa trên lượng bài, mức tăng, độ mới và mức độ đa dạng nguồn. Không phải xác suất.") | 92 / 100 | Chỉ số tương đối |
| Số bài viết | 148 | Trong 24 giờ gần nhất (follows the selected time range) |
| Số nguồn | 12 | Trong 20 nguồn theo dõi |
| Mức tăng so với kỳ trước | +68% | So với kỳ cùng độ dài |

### Chart "Diễn biến đưa tin"

- Line/area chart of article count over time, with its own time-range toggle: 6 giờ · 24 giờ · 7 ngày.
- 24-hour view: 12 points at 2-hour steps (00:00 → 22:00), each "N bài viết" (8, 10, 13, 11, 18, 22, 20, 27, 31, 29, 38, 44).

### "Bài viết đại diện" (representative article)

One article: source name and logo, publish time, title, a labelled excerpt ("TRÍCH ĐOẠN BÀI VIẾT"), and a "Đọc bài gốc" link.

### "Các bài viết liên quan" (related articles)

- Sub-header "148 bài viết từ 12 nguồn".
- Source filter (same options as Overview) and sort label "Mới nhất trước".
- Each item: source name, source logo/thumbnail (falls back to "Không có ảnh"), publish time, title, short excerpt, "Đọc bài gốc" link.

### Right column

- **Từ khóa liên quan** ("Trích xuất từ cụm bài viết"): keyword with a count — giá vàng 42, SJC 36, thị trường 28, giá vàng miếng 21, biến động 18, trong nước 15.
- **Phân bố nguồn**: horizontal bars, article count per source — VnExpress 38, Tuổi Trẻ 31, Thanh Niên 27, VietnamPlus 19, Nguồn khác 33 (sums to 148).
- **Về dữ liệu** note: "Chủ đề được nhóm từ các bài viết có nội dung liên quan. Số liệu chỉ phản ánh tập nguồn đã thu thập."

## Page 3 — System Status (Trạng thái hệ thống)

Heading "Theo dõi thu thập & xử lý" · "Giám sát tình trạng nguồn tin và các bước xử lý dữ liệu gần nhất". The top bar adds a "Giám sát hệ thống" badge.

### Warning banner

Shown when a source is stale: "Dữ liệu từ VietnamPlus có thể đã cũ — Hiển thị kết quả khả dụng gần nhất từ 07:10. Hệ thống sẽ tự thử lại ở lần chạy kế tiếp." with a **Thử lại** button.

### Summary cards

| Card | Value | Sub-text |
|---|---|---|
| Nguồn hoạt động | 18 / 20 | 90% tổng số nguồn |
| Nguồn gặp lỗi | 1 | Cần kiểm tra kết nối |
| Bài viết mới lần gần nhất | 214 | Lúc 08:30 hôm nay |
| Bài trùng đã loại | 37 | 14,7% dữ liệu thu thập |

### Table "Tình trạng nguồn tin"

Sub-header "Cập nhật tự động mỗi 15 phút" and "Thành công gần nhất: 08:42".

| Column | Example |
|---|---|
| Tên nguồn | VnExpress |
| RSS URL | https://vnexpress.net/rss/tin-moi-nhat.rss |
| Trạng thái | Hoạt động / Lỗi / Chưa có dữ liệu |
| Lần thu thập gần nhất | 08:40, 24/05 (or "Chưa thu thập") |
| Số bài mới | 42 |
| Thông tin lỗi | — / "Kết nối quá thời gian" / "Đang chờ lần chạy đầu tiên" |

Sample rows: VnExpress (Hoạt động, 42), Tuổi Trẻ (Hoạt động, 36), Thanh Niên (Hoạt động, 29), VietnamPlus (Lỗi, 0, Kết nối quá thời gian), Báo Tin tức (Chưa có dữ liệu, 0).

### "Luồng xử lý dữ liệu" (pipeline run)

Header: "Lần chạy hiện tại bắt đầu lúc 08:30" with an overall status badge (Đang chạy). Four steps, each with a time and a status:

| Step | Time | Status |
|---|---|---|
| Thu thập dữ liệu | 08:30–08:34 | Hoàn thành |
| Xử lý văn bản | 08:34–08:38 | Hoàn thành |
| Gom chủ đề | Bắt đầu lúc 08:38 | Đang chạy |
| Tính điểm xu hướng | Dự kiến 08:43 | Chờ xử lý |

### "Nhật ký gần đây" (recent runs)

The 5 most recent runs, each with start time, status (Đang chạy / Hoàn thành / Lỗi) and a summary line ("214 bài mới · 37 bài trùng", "1 nguồn kết nối thất bại", "Đã xử lý 251 bài"). Footer: "Lần thử gần nhất: 08:30 · Thành công gần nhất: 08:15".

## Inconsistencies in the prototype

Things to settle before the API contract is fixed:

1. **7-day chart axis**: switching Topic Detail to "7 ngày" changes the values but keeps the hourly labels (00:00–22:00); a 7-day view needs daily buckets. **Decided:** three ranges with fixed bucket sizes — 6 giờ / 1 hour (6 points), 24 giờ / 2 hours (12 points), 7 ngày / 1 day (7 points); times are in Vietnam time (UTC+7). The range counts back from the latest successful collection, but bucket boundaries sit on round clock times (full hours, even 2-hour marks, calendar days). The last bucket is therefore incomplete and is drawn differently (dashed). Axis labels: `HH:00` for the hourly ranges, `dd/MM` for 7 ngày.
2. **Metrics vs. time range**: on Topic Detail, changing the range updates the "Số bài viết" sub-text but not the numbers (148, 12, +68% stay the same). **Decided:**
   - The time-range selector controls the whole Topic Detail page (moved to the page header) and starts with the range chosen on Overview.
   - Follow the selected range: Số bài viết, Số nguồn, Mức tăng, the chart, Từ khóa liên quan, Phân bố nguồn, Các bài viết liên quan.
   - Do not follow the range: Điểm xu hướng, Phát hiện đầu tiên, Cập nhật, and "Nguồn có dữ liệu" on Overview.
   - Mức tăng baseline: 6 giờ compares with the same hours on the previous day; 24 giờ with the previous 24 hours; 7 ngày with the previous 7 days (needs 14 days of data). The card sub-text names the baseline. When the baseline has no articles, show "Mới xuất hiện"; Person 5 sets a minimum baseline count below which no percentage is shown.
   - Điểm xu hướng is a single score per topic, computed over the latest 24 hours, and the card says so. On Overview, sorting by score uses this 24-hour score whatever range is selected.
3. **Source counts**: Overview says "18 / 20" with "2 nguồn cần kiểm tra"; System Status says "18 / 20" active but "Nguồn gặp lỗi: 1" (the second non-active source is "Chưa có dữ liệu").
4. **Last-success time**: System Status shows "Thành công gần nhất" as 08:42 in the source table and 08:15 in the run log. Also, 08:42 falls while the 08:30 run is still running, and per-source collection times (08:38–08:40) fall outside the collection step (08:30–08:34). **Decided:**
   - Each run has a start time, an end time and a status. The run log shows both times; its footer reads "Lần chạy gần nhất: 08:30 (đang chạy) · Lần hoàn thành gần nhất: 08:15–08:28".
   - The top bar shows one timestamp, "Dữ liệu tính đến 08:15": the collection time of the latest completed run. It is the anchor the 6 giờ / 24 giờ / 7 ngày ranges count back from. While a new run is in progress, the dashboard keeps showing the previous run's results.
   - The source table is per feed only: "Lần thu thập gần nhất" is when that feed was last read successfully, within a run's collection step. The table header drops "Thành công gần nhất" and shows a count such as "19 / 20 feed đọc được ở lần chạy gần nhất".
   - Run statuses: **Đang chạy**; **Hoàn thành** (all feeds read); **Hoàn thành một phần** (some feeds failed but results were produced — the dashboard updates and shows the warning banner); **Lỗi** (no new results — the dashboard keeps the previous data). "Lần hoàn thành gần nhất" counts both completed statuses.
5. **Source filter**: lists only 4 sources while the system tracks 20, and "Phân bố nguồn" groups the rest as "Nguồn khác". **Decided:** 4 sources × 5 categories = 20 RSS feeds (see [README](../README.md)); the source filter lists the 4 sources (Dân trí replaces VietnamPlus), and "20" on System Status counts feeds, not newspapers.
6. **Original-article links**: every "Đọc bài gốc" points to a placeholder (`#article`), not a real URL. **Decided:**
   - The link is the article URL from the RSS item, normalized (tracking parameters and fragments removed). The same normalized URL is the deduplication key; only one URL is stored. Items without a link are dropped at collection.
   - Links open in a new tab with `rel="noopener noreferrer"`.
   - Links are not checked for being alive; removed or moved articles are a known limitation.
   - The excerpt comes from the RSS item's description: HTML stripped, cut to about 200 characters. Article pages are not scraped for now; clustering runs on title + description. Whether to add full-text scraping (for analysis only, never for display) is decided after the 7-day trial — see [FEED_TRIAL.md](FEED_TRIAL.md).
7. **No routing**: the URL does not change between pages, so a topic cannot be linked directly and the "back keeps filters" behaviour in the plan is not demonstrated. **Decided:**
   - Routes (React Router): `/` Overview, `/topics/<topic_id>` Topic Detail, `/status` System Status. Opening a route directly must serve the frontend's main page (the Vite dev server does this; a built demo needs a fallback rule).
   - Filters live in the URL query, so the browser's Back button restores them: `range` (`6h`, `24h`, `7d`; default `24h`), `source` (one of the 4 source codes; default all), `sort` (`score`, `articles`, `growth`; default `score`), `q` (search text; default empty). Defaults are omitted from the URL. Topic Detail carries `range`, e.g. `/topics/123?range=6h`. The API uses the same parameter names.
   - `topic_id` must stay stable across runs. Topics that cool down are not deleted, only drop out of the ranking, so old links still open with their last data. An unknown ID (mistyped, or a cluster merged into another) shows "Không tìm thấy chủ đề" with a link back to Overview; there is no automatic redirect.
   - Rows loaded through "Xem thêm chủ đề" are not kept in the URL; going back shows the list from the top with the same filters.
