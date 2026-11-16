// The only place that knows where data comes from.
//
// SAMPLE MODE: until the backend exists, every function reads the JSON samples in
// docs/api-samples and applies the filters itself. The samples only hold 24-hour data
// for one topic, so some results are DERIVED for demo purposes, not real data:
//   - 6h and 7d series are built from the 24h counts (see buildSeries);
//   - which sources a topic belongs to (Overview source filter) is made up from source_count;
//   - Topic Detail only exists for topic 1042; any other id is a 404.
// When the API is ready, replace the bodies below with fetch() calls; keep the signatures.

import overviewSample from '@samples/overview.json'
import detailSample from '@samples/topic-detail.json'
import statusSample from '@samples/status.json'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const HOUR = 3600_000
const VN_OFFSET = 7 * HOUR
const BUCKET = { '6h': '1h', '24h': '2h', '7d': '1d' }

const sum = (arr) => arr.reduce((a, b) => a + b, 0)
const toIso = (ms) => new Date(ms + VN_OFFSET).toISOString().slice(0, 19) + '+07:00'
// Round a Vietnam-clock time down to a multiple of `size`, returned as a real timestamp.
const floorVn = (ms, size) => ms + VN_OFFSET - ((ms + VN_OFFSET) % size) - VN_OFFSET

const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()

// Build the chart series for `range` from the 12 two-hour counts of the last 24 hours.
// Buckets start on round clock times; the last one is still filling (complete: false).
function buildSeries(counts24, growthPct, asOf, range) {
  const last = floorVn(Date.parse(asOf), 2 * HOUR)
  const point = (start, count, complete = true) => ({ start: toIso(start), count, complete })

  if (range === '24h') {
    return counts24.map((c, i) => point(last - (11 - i) * 2 * HOUR, c, i < 11))
  }

  if (range === '6h') {
    // Split the 3 full two-hour buckets before the current one into hours, keep the last 5,
    // then add the current (partial) hour.
    const hourly = counts24.slice(-4, -1).flatMap((c) => [Math.ceil(c / 2), c - Math.ceil(c / 2)]).slice(1)
    const pts = hourly.map((c, i) => point(last - (5 - i) * HOUR, c))
    return [...pts, point(last, counts24[11], false)]
  }

  // 7d: today = buckets since midnight; yesterday is at least its known evening hours and otherwise
  // derived from growth; earlier days decay from yesterday. So the 7d total is never below the 24h total.
  const dayStart = floorVn(last, 24 * HOUR)
  const sinceMidnight = (last - dayStart) / (2 * HOUR) + 1
  const todayCount = sum(counts24.slice(-sinceMidnight))
  const evening = sum(counts24.slice(0, counts24.length - sinceMidnight))
  const derived = growthPct == null ? 0 : sum(counts24) / (1 + growthPct / 100)
  const yesterday = Math.max(evening, derived)
  // A new topic (no growth figure) did not exist before yesterday evening.
  const earlier = [6, 5, 4, 3, 2, 1].map((k) => (k > 1 && growthPct == null ? 0 : Math.round(yesterday * 0.9 ** (k - 1))))
  return [...earlier, todayCount].map((c, i) => point(dayStart - (6 - i) * 24 * HOUR, c, i < 6))
}

const SORTERS = {
  score: (a, b) => b.score - a.score,
  articles: (a, b) => b.article_count - a.article_count,
  // A new topic has no percentage; it counts as the fastest growing.
  growth: (a, b) => {
    const g = (t) => t.growth_pct ?? Infinity
    return g(a) === g(b) ? 0 : g(b) - g(a)
  },
}

// Made up for the sample: which sources a topic appears in.
function sourcesOf(topic) {
  const codes = overviewSample.sources.map((s) => s.code)
  const start = topic.topic_id % codes.length
  return Array.from({ length: topic.source_count }, (_, i) => codes[(start + i) % codes.length])
}

function applyRange(topic, range) {
  const counts = buildSeries(topic.sparkline, topic.growth_pct, overviewSample.data_as_of, range).map((p) => p.count)
  return { ...topic, article_count: sum(counts), sparkline: counts }
}

// GET /api/topics
export async function getTopics({ range = '24h', source = '', sort = 'score', q = '', limit = 4, offset = 0 } = {}) {
  const all = overviewSample.topics.map((t) => applyRange(t, range))
  let rows = all
  if (source) rows = rows.filter((t) => sourcesOf(t).includes(source))
  if (q) {
    const needle = normalize(q)
    rows = rows.filter((t) => normalize([t.title, ...t.keywords].join(' ')).includes(needle))
  }
  rows = [...rows].sort(SORTERS[sort] ?? SORTERS.score)

  const ratio = sum(all.map((t) => t.article_count)) / sum(overviewSample.topics.map((t) => t.article_count))
  return {
    ...overviewSample,
    range,
    summary: { ...overviewSample.summary, article_count: Math.round(overviewSample.summary.article_count * ratio) },
    total: rows.length, // in sample mode: only the sample topics, not the 36 in the summary
    limit,
    offset,
    topics: rows.slice(offset, offset + limit).map((t, i) => ({ ...t, rank: offset + i + 1 })),
  }
}

function assertTopic(topicId) {
  if (String(detailSample.topic.topic_id) !== String(topicId)) throw new ApiError(404, 'Không tìm thấy chủ đề')
}

// Scale integer counts to a new total, putting the rounding remainder on the largest one.
function scaleTo(counts, total) {
  const base = sum(counts)
  const scaled = counts.map((c) => Math.round((c * total) / base))
  scaled[scaled.indexOf(Math.max(...scaled))] += total - sum(scaled)
  return scaled
}

// GET /api/topics/{topic_id}
export async function getTopic(topicId, { range = '24h' } = {}) {
  assertTopic(topicId)
  const d = detailSample
  const points = buildSeries(d.timeline.points.map((p) => p.count), d.topic.growth_pct, d.data_as_of, range)
  const total = sum(points.map((p) => p.count))
  const dist = scaleTo(d.source_distribution.map((s) => s.article_count), total)
  const kw = d.related_keywords.map((k) => Math.max(1, Math.round((k.count * total) / d.topic.article_count)))

  return {
    ...d,
    range,
    topic: {
      ...d.topic,
      article_count: total,
      growth_baseline: range === '6h' ? 'same_hours_yesterday' : 'previous_period',
    },
    timeline: { bucket: BUCKET[range], points },
    source_distribution: d.source_distribution.map((s, i) => ({ ...s, article_count: dist[i] })),
    related_keywords: d.related_keywords.map((k, i) => ({ ...k, count: kw[i] })),
    articles: { ...d.articles, total },
  }
}

// GET /api/topics/{topic_id}/articles  (proposed; see docs/api-samples/README.md, open question 1)
export async function getTopicArticles(topicId, { source = '', limit = 10, offset = 0 } = {}) {
  assertTopic(topicId)
  const items = detailSample.articles.items
    .filter((a) => !source || a.source.code === source)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
  const total = source
    ? (detailSample.source_distribution.find((s) => s.source.code === source)?.article_count ?? 0)
    : detailSample.articles.total
  return { total, limit, offset, items: items.slice(offset, offset + limit) }
}

// GET /api/status
export async function getStatus() {
  return statusSample
}
