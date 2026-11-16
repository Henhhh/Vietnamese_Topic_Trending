# Progress plan

**Report submission:** 13 January 2027 · **Defense:** 20 January 2027

Legend: ✅ done · 🟡 in progress · ⬜ not started · Last updated: 17 November 2026

## Pipeline roles (Persons 2–5)

| Milestone | Person 2 — Data | Person 3 — NLP | Person 4 — Topic Detection | Person 5 — Trend Analysis |
|---|---|---|---|---|
| **1. Common foundation** | ✅ RSS direction set; 4 sources × 5 categories (20 feeds) finalized | 🟡 Vietnamese processing approach finalized | 🟡 TF-IDF + cosine proposed as baseline | 🟡 Scoring factors identified; formula not finalized |
| **2. Sample outputs** | ⬜ Sample articles with source, URL, title, publish date | ⬜ Sample cleaned text and keywords | ⬜ Sample cluster with `topic_id` and article list | ⬜ Sample score, growth rate and article-count time series |
| **3. Core features** | ⬜ Read RSS, normalize, deduplicate | ⬜ Segment words, extract keywords, label clusters | ⬜ Group articles on the same event; keep cluster IDs across runs | ⬜ Rank topics, handle new topics, store score history |
| **4. Integration** | ⬜ Feed normalized articles into the pipeline | ⬜ Return keywords and topic labels | ⬜ Return clusters and representative articles | ⬜ Return ranking table and chart data |
| **5. Testing** | ⬜ Test broken feeds, missing dates, duplicate articles | ⬜ Check for overly generic or out-of-context keywords | ⬜ Check for wrongly merged or wrongly split events | ⬜ Compare against ranking by article count only |
| **6. Git / handover** | ⬜ Collector and guide for adding sources | ⬜ NLP module with input/output examples | ⬜ Clustering module and evaluation results | ⬜ Formula, experiment results and how to re-run |

## Lead, backend and frontend (Persons 1, 6, 7)

| Milestone | Person 1 — Lead & Integration | Person 6 — Backend & Database | Person 7 — Frontend |
|---|---|---|---|
| **1. Common foundation** | ✅ Finalized Vietnamese scope, 3 MVP pages and 7 roles | 🟡 FastAPI + PostgreSQL proposed; schema not confirmed | ✅ Figma Make has all 3 desktop pages |
| **2. Sample outputs** | ⬜ Finalize one shared sample dataset | 🟡 Sample JSON for the 3 pages drafted in [api-samples](api-samples/); awaiting review, schema not finalized | ✅ Frontend data layer ([api.js](../frontend/src/api.js), [labels.js](../frontend/src/labels.js)) reads the sample JSON and filters it (sample mode) |
| **3. Core features** | ⬜ Write the orchestration flow for the processing steps | ⬜ Create the database and APIs for trends, detail and status | 🟡 All 3 pages, the shared top bar and the sidebar are built on sample data in the team repo; not yet connected to the real API |
| **4. Integration** | ⬜ Trial run from RSS to dashboard | ⬜ Replace the sample API with real data | ⬜ Connect the API; returning to the list keeps the filters |
| **5. Testing** | ⬜ Test the full flow, including when one source fails | ⬜ Test filters, pagination and error responses | 🟡 Vitest tests are in (`npm --prefix frontend test`, 64 tests): the data layer, the loading/empty/error states of every page and the original-article links; all 3 pages checked at 375 px and 768 px in the browser emulator and fixed; still to check: real devices |
| **6. Git / handover** | ⬜ Finalize the demo and the shared run guide | ⬜ Hand over schema, API docs and DB setup steps | ⬜ Hand over frontend, API config and demo script |

## Follow-up tasks from design decisions

Added on 16 November 2026 after the source list and the prototype inconsistencies were settled. Details are in [UI_STRUCTURE.md](UI_STRUCTURE.md) (section "Inconsistencies in the prototype") and [FEED_TRIAL.md](FEED_TRIAL.md).

| Person | Tasks |
|---|---|
| **1 — Lead & Integration** | ⬜ Orchestration keeps running when a feed fails and records the run as "Hoàn thành một phần" |
| **2 — Data** | ⬜ Run the 7-day trial on all 20 feeds<br>⬜ Map each source's category names to the 5 shared categories |
| **3 — NLP** | ⬜ Process title + RSS description as the input text (no full article text unless the trial shows it is needed) |
| **4 — Topic Detection** | ⬜ Keep `topic_id` stable across runs (required by the URL scheme)<br>⬜ Hand-check clustering on title + description after the trial |
| **5 — Trend Analysis** | ⬜ One trend score per topic, computed over the latest 24 hours<br>⬜ Growth for 6 giờ compares with the same hours on the previous day<br>⬜ Set the minimum baseline count below which no percentage is shown |
| **6 — Backend & Database** | ⬜ Store article counts per hour<br>⬜ Store start time, end time and status for each run<br>⬜ API accepts `range`, `source`, `sort`, `q` |
| **7 — Frontend** | 🟡 Pages match the decisions in [UI_STRUCTURE.md](UI_STRUCTURE.md) (Figma is not updated; the docs are the reference); shared top bar and sidebar (note card, footer, collapse button) are in<br>✅ React Router: 3 routes, not-found page, and filters in the URL (Overview filters, Topic Detail range)<br>✅ Sample-mode API layer and Vietnamese labels (swap to `fetch()` at integration)<br>✅ Last, incomplete chart bucket is drawn as a dashed line (chart and sparkline) |

Thresholds waiting for trial data: description too short, clustering error rate too high, minimum baseline count.
