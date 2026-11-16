# Development of an Intelligent Web-Based System for Detecting and Analyzing Emerging Topics in Vietnamese Online News

A web-based system that collects Vietnamese online news, groups articles into topics, and ranks the topics that are emerging.

## Key dates

| Milestone | Date |
|---|---|
| Report submission | 13 January 2027 |
| Defense | 20 January 2027 |

## Scope

- Vietnamese-language online news.
- 5 news sources: VnExpress, Tuổi Trẻ, Thanh Niên, Dân trí, VietNamNet.
- 5 categories per source: Thời sự, Thế giới, Kinh tế, Công nghệ, Thể thao — 25 RSS feeds in total.
  - Thể thao is kept on purpose: it tests whether the algorithm can tell steady, routine coverage apart from an event whose coverage rises abnormally.
  - Open issue, to be fixed later (checked 16 November 2026): VietNamNet's `cong-nghe.rss` returns stale items (newest May 2025). Only its sub-feeds `cong-nghe/an-ninh-mang.rss` and `cong-nghe/ha-tang-so.rss` are current, so VietNamNet's Công nghệ coverage is partial until this is resolved.
- The 25 feeds are first run for 7 days to measure volume, duplicates and errors: see [docs/FEED_TRIAL.md](docs/FEED_TRIAL.md).
- 3-page MVP: **Overview**, **Topic Detail**, **System Status**.
- 7 roles (see below). Progress per role is tracked in [docs/PLAN.md](docs/PLAN.md).

## Tech stack

| Role | Technologies | Purpose |
|---|---|---|
| 1. Lead & Integration | Python, Git, GitHub, pytest | Connect collection → processing → topic clustering → scoring; test the end-to-end flow and review PRs. |
| 2. Data Collection | Python, feedparser, HTTPX; Beautiful Soup if needed | Read RSS; get title, link and publish date; normalize URLs and remove duplicates. Beautiful Soup is used only when the RSS feed lacks content and the source permits fetching the article page. |
| 3. Vietnamese NLP | underthesea, scikit-learn | Vietnamese word segmentation, stopword removal, and TF-IDF to extract representative keywords. |
| 4. Topic Detection & Tracking | scikit-learn; sentence-transformers for the advanced version | Baseline: TF-IDF + cosine similarity + clustering. Once the baseline is stable, try a Vietnamese-capable embedding model and compare clustering quality. |
| 5. Trend Analysis | Python, pandas, NumPy | Count articles over time, compute growth versus the previous period, and combine with novelty and source count to rank topics. Formula-based at first; no model training. |
| 6. Backend & Database | FastAPI, PostgreSQL, SQLAlchemy, Alembic, Postman | FastAPI serves the REST API; PostgreSQL stores the data; SQLAlchemy reads/writes; Alembic manages schema migrations; Postman tests the API. |
| 7. Design & Frontend | Figma Make, React + Vite, React Router, JavaScript, CSS, Recharts | The prototype is the template for the 3 pages: Overview, Topic Detail, System Status. React Router gives each page its own URL and keeps filters in the query string. Recharts draws the trend and source-distribution charts. |

## Pipeline

```
RSS collection → Vietnamese NLP → topic clustering → trend scoring → REST API → dashboard
```
