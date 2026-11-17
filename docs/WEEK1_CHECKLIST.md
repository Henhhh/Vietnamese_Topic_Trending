# Week 1 checklist (16–22 November 2026)

Goal of the week: data collection is running, the API contract is agreed, and everyone knows what to do while data accumulates. Owner of this file: Person 1 (Lead). Update it as answers come in; when an item is confirmed, tick it and note the date.

Legend: `[ ]` open · `[x]` done.

## Person 2 — Data collection

- [ ] Collector runs on all 20 feeds (4 sources × 5 categories), polling every 15 minutes.
- [ ] It runs on a machine that stays on for 7 days. Machine: ______
- [ ] Articles are stored, not only counts ([FEED_TRIAL.md](FEED_TRIAL.md), "Store the articles, not only the counts").
- [ ] The metrics in FEED_TRIAL.md "What to record" are logged per feed.
- [ ] Feed retention measured for VnExpress, Tuổi Trẻ and Thanh Niên (only Dân trí is measured so far).
- [ ] Trial start date: ______ · expected end date (start + 7 days): ______

## Person 6 — Backend and database

Answers to the open questions in [api-samples/README.md](api-samples/README.md). The frontend cannot connect to the real API until these are settled. Deadline: Sunday 22 November.

- [ ] Question 1: is a separate `GET /api/topics/{topic_id}/articles` endpoint acceptable?
- [ ] Question 2: keep `sources` inside `overview.json`, or move it to its own endpoint?
- [ ] Question 3: type of `topic_id` (integer in the sample).
- [ ] Person 6 has reviewed the three sample JSON files and listed any field they want renamed.

## Persons 3, 4, 5 — start from day-one data

They do not wait for the full 7 days ([FEED_TRIAL.md](FEED_TRIAL.md), "Do not block other roles").

- [ ] Person 3 has the first day's articles and has started word segmentation and keywords.
- [ ] Person 4 has started the TF-IDF + cosine baseline on them.
- [ ] Person 5 has started the scoring formula on the first counts.

## Person 1 — Lead

- [ ] Message to Person 2 sent.
- [ ] Message to Person 6 sent.
- [ ] Message to the whole group sent (what each role does this week).
- [ ] Short sync meeting held (about 15 minutes): done, blocked, next. Date: ______
- [ ] [PLAN.md](PLAN.md) updated from what each person reported.

## Person 7 — Frontend

Nothing blocking this week; the pages are built on sample data ([FRONTEND_HANDOVER.md](FRONTEND_HANDOVER.md)).

- [ ] Re-check the frontend once Person 6 answers (field renames may touch `api.js`).

## Risks to watch

| Risk | Sign | Action |
|---|---|---|
| Collection starts late | Person 2 has no start date by Friday 20 November | Escalate in the sync meeting; every missing day is lost data |
| Collector stops mid-trial | Gaps in stored articles | Ask Person 2 for a daily check; restart and record the gap |
| API contract still open | Person 6 has not answered by Sunday | Frontend keeps sample mode; connection moves to the next week |
| A source feed fails | Errors in the feed log | Keep going; this feeds the System Status page and the failure tests |

## End of week

Week 1 is done when: the trial has started with a date, Person 6's three answers are in, Persons 3–5 have first-day data, and PLAN.md reflects it. Anything left open moves to week 2 with the reason noted here.
