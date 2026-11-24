# Task assignment

One list of work per person, taken from [PLAN.md](PLAN.md) and [FEED_TRIAL.md](FEED_TRIAL.md). Each task has an ID so it can be copied into a GitHub Issue as it is (title = ID + task). **Start** is the week to begin; **Due** is the week it must be done. The same list, with a status drop-down and per-person totals, is in [TASKS.xlsx](TASKS.xlsx) (Vietnamese). Track status in one place only: the sheet or the issues, not both.

**Dates are proposed**, not agreed: they come from a week-by-week schedule worked back from the report (13 January 2027) and the defense (20 January 2027). Adjust them in the first sync meeting.

Legend: ⬜ not started · 🟡 in progress · ✅ done.

| Week | Dates | Focus |
|---|---|---|
| W1 | 16–22 Nov | Collection starts; 7-day trial; API contract agreed |
| W2 | 23–29 Nov | Trial report; thresholds set; sample outputs ready |
| W3 | 30 Nov–6 Dec | Core modules built on real data |
| W4 | 7–13 Dec | Integration; the frontend switches to the real API |
| W5 | 14–20 Dec | Full-flow testing |
| W6 | 21–27 Dec | Fixes; feature freeze on 27 Dec |
| W7 | 28 Dec–3 Jan | Handover; report draft |
| W8 | 4–10 Jan | Bug fixes only; report final |
| W9 | 11–13 Jan | Report submitted on 13 Jan |
| W10 | 14–20 Jan | Defense rehearsal; defense on 20 Jan |

## Person 2 — Data collection

| ID | Task | Start | Due | Needs | Status |
|---|---|---|---|---|---|
| P2-1 | Collector reads all 20 feeds every 15 minutes and stores the articles (not only counts) | W1 | W1 | — | ✅ |
| P2-2 | Map each source's category names to the 5 shared categories | W1 | W1 | — | ✅ |
| P2-3 | Measure feed retention for VnExpress, Tuổi Trẻ and Thanh Niên | W1 | W1 | P2-1 | ✅ |
| P2-4 | Run the 7-day trial; log the metrics in FEED_TRIAL.md | W1 | W2 | P2-1 | 🟡 |
| P2-5 | Trial summary per feed: new per day, both duplicate rates, errors, retention, description length | W2 | W3 | P2-4 | ⬜ |
| P2-6 | Export the shared sample articles (source, URL, title, publish date) | W2 | W2 | P2-4 | ⬜ |
| P2-7 | Normalize and deduplicate in the collector; feed articles into the pipeline | W3 | W4 | P2-1 | 🟡 |
| P2-8 | Tests: broken feeds, missing dates, duplicates | W5 | W5 | P2-7 | ✅ |
| P2-9 | Handover: collector and a guide for adding sources | W7 | W7 | P2-8 | ✅ |

## Person 3 — Vietnamese NLP

| ID | Task | Start | Due | Needs | Status |
|---|---|---|---|---|---|
| P3-1 | Sample cleaned text and keywords on the first day's articles | W2 | W2 | P2-1 | 🟡 |
| P3-2 | Segment words, remove stopwords, extract keywords (input = title + RSS description) | W3 | W3 | P3-1 | ⬜ |
| P3-3 | Label clusters with keywords | W3 | W4 | P4-2 | ⬜ |
| P3-4 | Return keywords and topic labels to the pipeline | W4 | W4 | P3-2 | ⬜ |
| P3-5 | Check for overly generic or out-of-context keywords | W5 | W5 | P3-4 | ⬜ |
| P3-6 | Decide with Person 4 whether full text is needed for any source (after the trial) | W2 | W3 | P2-5 | ⬜ |
| P3-7 | Handover: NLP module with input/output examples | W7 | W7 | P3-5 | ⬜ |

## Person 4 — Topic detection

| ID | Task | Start | Due | Needs | Status |
|---|---|---|---|---|---|
| P4-1 | Sample cluster with `topic_id` and article list | W2 | W2 | P3-1 | ⬜ |
| P4-2 | Baseline: TF-IDF + cosine similarity + clustering | W3 | W3 | P3-2 | ⬜ |
| P4-3 | Keep `topic_id` stable across runs (the URL scheme depends on it) | W3 | W4 | P4-2 | ⬜ |
| P4-4 | Hand-check clustering on title + description after the trial; set the error-rate threshold | W2 | W3 | P2-5 | ⬜ |
| P4-5 | Return clusters and representative articles | W4 | W4 | P4-3 | ⬜ |
| P4-6 | Check wrongly merged and wrongly split events | W5 | W5 | P4-5 | ⬜ |
| P4-7 | Optional: try an embedding model and compare with the baseline | W5 | W6 | P4-6 | ⬜ |
| P4-8 | Handover: clustering module and evaluation results | W7 | W7 | P4-6 | ⬜ |

## Person 5 — Trend analysis

| ID | Task | Start | Due | Needs | Status |
|---|---|---|---|---|---|
| P5-1 | Sample score, growth rate and article-count time series | W2 | W2 | P4-1 | ⬜ |
| P5-2 | Set the minimum baseline count below which no percentage is shown | W2 | W3 | P2-5 | ⬜ |
| P5-3 | One trend score per topic over the latest 24 hours | W3 | W3 | P5-1 | ⬜ |
| P5-4 | Growth per range; 6 giờ compares with the same hours on the previous day | W3 | W3 | P5-3 | ⬜ |
| P5-5 | Rank topics, handle new topics, store score history | W3 | W4 | P5-3 | ⬜ |
| P5-6 | Return the ranking table and chart data | W4 | W4 | P5-5 | ⬜ |
| P5-7 | Compare against ranking by article count only | W5 | W5 | P5-6 | ⬜ |
| P5-8 | Handover: formula, experiment results, how to re-run | W7 | W7 | P5-7 | ⬜ |

7-day growth needs 14 days of data, so the 7-day view is only real from about two weeks after collection starts.

## Person 6 — Backend and database

| ID | Task | Start | Due | Needs | Status |
|---|---|---|---|---|---|
| P6-1 | Answer the 3 open questions in [api-samples/README.md](api-samples/README.md) | W1 | W1 | — | ✅ |
| P6-2 | Review the sample JSON and confirm or change the schema | W2 | W2 | P6-1 | 🟡 |
| P6-3 | Database and migrations; store article counts per hour and start/end/status per run | W3 | W3 | P6-2 | ⬜ |
| P6-4 | `GET /api/topics` with `range`, `source`, `sort`, `q`, `limit`, `offset` | W3 | W4 | P6-3 | ⬜ |
| P6-5 | `GET /api/topics/{id}` (and `/articles` if agreed) and `GET /api/status` | W4 | W4 | P6-3 | ⬜ |
| P6-6 | Replace the sample API with real data | W4 | W4 | P5-6 | ⬜ |
| P6-7 | Tests: filters, pagination, error responses (404 for an unknown topic) | W5 | W5 | P6-5 | ⬜ |
| P6-8 | Handover: schema, API docs, DB setup steps | W7 | W7 | P6-7 | ⬜ |

## Person 1 — Lead and integration

| ID | Task | Start | Due | Needs | Status |
|---|---|---|---|---|---|
| P1-1 | Weekly sync and PLAN.md update | — | every week | — | 🟡 |
| P1-2 | Shared sample dataset finalized from the trial articles | W2 | W2 | P2-6 | ⬜ |
| P1-3 | Orchestration flow for the processing steps; keeps running when a feed fails and records "Hoàn thành một phần" | W3 | W4 | P2-7 | ⬜ |
| P1-4 | Trial run from RSS to dashboard | W4 | W4 | P6-6 | ⬜ |
| P1-5 | Full-flow test, including when one source fails | W5 | W5 | P1-4 | ⬜ |
| P1-6 | Feature freeze | W6 | W6 (27 Dec) | — | ⬜ |
| P1-7 | Demo and shared run guide finalized | W7 | W7 | P1-5 | ⬜ |
| P1-8 | Report: draft W7, final W8, submit 13 Jan | W7 | W9 | — | ⬜ |

## Person 7 — Frontend

| ID | Task | Start | Due | Needs | Status |
|---|---|---|---|---|---|
| P7-1 | Pages, top bar, sidebar, restyle, tests and handover on sample data | — | done | — | ✅ |
| P7-2 | Connect `api.js` to the real API, turn off `SAMPLE_MODE`, set the API address ([steps](FRONTEND_HANDOVER.md)) | W4 | W4 | P6-5 | ⬜ |
| P7-3 | Rewrite `api.test.js` and the `states.test.jsx` mocks against real responses | W4 | W5 | P7-2 | ⬜ |
| P7-4 | Test small screens, loading/empty/error states, original-article links on real data and real devices | W5 | W5 | P7-2 | ⬜ |
| P7-5 | Returning to the list keeps the filters (verify with the real API) | W5 | W5 | P7-2 | ⬜ |
| P7-6 | Update the handover and demo script for the real API | W7 | W7 | P7-4 | ⬜ |

## Load across the team

The frontend is the person with the least work left until the API exists, while Person 6 and the pipeline owners carry most of weeks 3 to 5. Two ways to balance it, to decide at the first sync:

- Person 7 helps Person 6 with the API tests (P6-7) and the API documentation (P6-8).
- Person 7 helps Person 1 with the full-flow test (P1-5) and the report.

If one person holds both Person 1 and Person 7, they carry the integration, the report and the connection to the API in the same weeks (W4–W5). Moving part of P1-8 to another person early avoids a bottleneck.
