import { describe, expect, it } from 'vitest'
import { ApiError, getStatus, getTopic, getTopicArticles, getTopics } from './api'

const sum = (arr) => arr.reduce((a, b) => a + b, 0)
const ids = (res) => res.topics.map((t) => t.topic_id)

describe('getTopics', () => {
  it('returns the first page with defaults and recomputed ranks', async () => {
    const res = await getTopics()
    expect(res.range).toBe('24h')
    expect(res.total).toBe(5)
    expect(res.topics).toHaveLength(4)
    expect(res.topics.map((t) => t.rank)).toEqual([1, 2, 3, 4])
    expect(res.topics[0].topic_id).toBe(1042)
  })

  it('paginates with offset and keeps ranks continuous', async () => {
    const res = await getTopics({ offset: 4 })
    expect(res.topics).toHaveLength(1)
    expect(res.topics[0].rank).toBe(5)
    expect(await getTopics({ offset: 99 })).toMatchObject({ topics: [], total: 5 })
  })

  it('sorts by score, article count and growth', async () => {
    const byScore = (await getTopics({ limit: 5 })).topics.map((t) => t.score)
    expect(byScore).toEqual([...byScore].sort((a, b) => b - a))

    const byArticles = (await getTopics({ sort: 'articles', limit: 5 })).topics.map((t) => t.article_count)
    expect(byArticles).toEqual([...byArticles].sort((a, b) => b - a))
  })

  it('treats a new topic (no growth figure) as the fastest growing', async () => {
    const res = await getTopics({ sort: 'growth', limit: 5 })
    expect(res.topics[0].growth_pct).toBeNull()
    const rest = res.topics.slice(1).map((t) => t.growth_pct)
    expect(rest).toEqual([...rest].sort((a, b) => b - a))
  })

  it('falls back to score order for an unknown sort', async () => {
    expect(ids(await getTopics({ sort: 'nonsense' }))).toEqual(ids(await getTopics()))
  })

  it('searches title and keywords, ignoring case and accents', async () => {
    expect(ids(await getTopics({ q: 'GIA VANG' }))).toEqual([1042])
    expect(ids(await getTopics({ q: 'sjc' }))).toEqual([1042])
    expect(ids(await getTopics({ q: 'miền trung' }))).toEqual([1057])
  })

  it('reports no results with total 0', async () => {
    expect(await getTopics({ q: 'zzzz' })).toMatchObject({ topics: [], total: 0 })
  })

  it('filters by source: a subset of all topics, and unknown sources match nothing', async () => {
    const all = ids(await getTopics({ limit: 5 }))
    const filtered = ids(await getTopics({ source: 'dantri', limit: 5 }))
    expect(filtered.every((id) => all.includes(id))).toBe(true)
    expect(filtered.length).toBeGreaterThan(0)
    expect((await getTopics({ source: 'khong-co' })).total).toBe(0)
  })

  it('applies search and source together', async () => {
    const res = await getTopics({ q: 'gia vang', source: 'khong-co' })
    expect(res.total).toBe(0)
  })

  it('changes counts with the range: 6h <= 24h <= 7d for every topic', async () => {
    const counts = async (range) =>
      Object.fromEntries((await getTopics({ range, limit: 5 })).topics.map((t) => [t.topic_id, t.article_count]))
    const [h6, h24, d7] = [await counts('6h'), await counts('24h'), await counts('7d')]
    for (const id of Object.keys(h24)) {
      expect(h6[id]).toBeLessThanOrEqual(h24[id])
      expect(d7[id]).toBeGreaterThanOrEqual(h24[id])
    }
  })

  it('gives each range the agreed number of sparkline points', async () => {
    const points = async (range) => (await getTopics({ range })).topics[0].sparkline.length
    expect(await points('6h')).toBe(6)
    expect(await points('24h')).toBe(12)
    expect(await points('7d')).toBe(7)
  })

  it('scales the summary article count with the range, 24h being the sample value', async () => {
    const h24 = (await getTopics({ range: '24h' })).summary.article_count
    expect(h24).toBe(1284)
    expect((await getTopics({ range: '6h' })).summary.article_count).toBeLessThan(h24)
    expect((await getTopics({ range: '7d' })).summary.article_count).toBeGreaterThan(h24)
  })

  it('makes the older days of an existing topic smaller than yesterday in the 7d view', async () => {
    const [topic] = (await getTopics({ range: '7d', q: 'giá vàng' })).topics
    const daysBeforeToday = topic.sparkline.slice(0, 6)
    expect(daysBeforeToday).toEqual([...daysBeforeToday].sort((a, b) => a - b))
  })

  it('keeps a new topic at zero before yesterday in the 7d view', async () => {
    const res = await getTopics({ range: '7d', q: 'mưa lớn' })
    expect(res.topics[0].sparkline.slice(0, 5)).toEqual([0, 0, 0, 0, 0])
  })
})

describe('getTopic', () => {
  it('returns topic 1042 with the sample numbers for 24h', async () => {
    const res = await getTopic(1042)
    expect(res.topic.article_count).toBe(148)
    expect(res.topic.score).toBe(92)
    expect(res.timeline.bucket).toBe('2h')
    expect(res.timeline.points).toHaveLength(12)
  })

  it('accepts the id as a string (it comes from the URL)', async () => {
    expect((await getTopic('1042')).topic.topic_id).toBe(1042)
  })

  it('rejects an unknown id with a 404 ApiError', async () => {
    const err = await getTopic('9999').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(404)
  })

  it('uses round clock buckets and marks only the last one incomplete', async () => {
    for (const [range, n, bucket] of [['6h', 6, '1h'], ['24h', 12, '2h'], ['7d', 7, '1d']]) {
      const { timeline } = await getTopic(1042, { range })
      expect(timeline.bucket).toBe(bucket)
      expect(timeline.points).toHaveLength(n)
      expect(timeline.points.map((p) => p.complete)).toEqual([...Array(n - 1).fill(true), false])
    }
  })

  it('starts buckets on round times, in Vietnam time', async () => {
    const hourly = (await getTopic(1042, { range: '6h' })).timeline.points
    expect(hourly.map((p) => p.start.slice(11))).toEqual(['03:00:00+07:00', '04:00:00+07:00', '05:00:00+07:00', '06:00:00+07:00', '07:00:00+07:00', '08:00:00+07:00'])
    const two = (await getTopic(1042)).timeline.points
    expect(two.every((p) => Number(p.start.slice(11, 13)) % 2 === 0)).toBe(true)
    const daily = (await getTopic(1042, { range: '7d' })).timeline.points
    expect(daily.every((p) => p.start.endsWith('T00:00:00+07:00'))).toBe(true)
    expect(daily.at(-1).start.slice(0, 10)).toBe('2026-11-16')
  })

  it('keeps the numbers consistent with the chart for every range', async () => {
    for (const range of ['6h', '24h', '7d']) {
      const res = await getTopic(1042, { range })
      expect(res.topic.article_count).toBe(sum(res.timeline.points.map((p) => p.count)))
      expect(sum(res.source_distribution.map((s) => s.article_count))).toBe(res.topic.article_count)
    }
  })

  it('keeps the trend score the same whatever the range', async () => {
    for (const range of ['6h', '24h', '7d']) expect((await getTopic(1042, { range })).topic.score).toBe(92)
  })

  it('compares 6h with the same hours yesterday, other ranges with the previous period', async () => {
    expect((await getTopic(1042, { range: '6h' })).topic.growth_baseline).toBe('same_hours_yesterday')
    expect((await getTopic(1042, { range: '24h' })).topic.growth_baseline).toBe('previous_period')
    expect((await getTopic(1042, { range: '7d' })).topic.growth_baseline).toBe('previous_period')
  })

  it('never returns a keyword count below 1', async () => {
    const res = await getTopic(1042, { range: '6h' })
    expect(res.related_keywords.every((k) => k.count >= 1)).toBe(true)
  })
})

describe('getTopicArticles', () => {
  it('lists articles newest first with the full total', async () => {
    const res = await getTopicArticles(1042)
    expect(res.total).toBe(148)
    const times = res.items.map((a) => a.published_at)
    expect(times).toEqual([...times].sort().reverse())
  })

  it('filters by source and reports that source\'s total', async () => {
    const res = await getTopicArticles(1042, { source: 'tuoitre' })
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items.every((a) => a.source.code === 'tuoitre')).toBe(true)
    expect(res.total).toBe(39)
  })

  it('pages with limit and offset', async () => {
    const first = await getTopicArticles(1042, { limit: 1 })
    const second = await getTopicArticles(1042, { limit: 1, offset: 1 })
    expect(first.items).toHaveLength(1)
    expect(second.items[0].url).not.toBe(first.items[0].url)
    expect((await getTopicArticles(1042, { offset: 99 })).items).toEqual([])
  })

  it('reports a total that matches the topic article count of the same range', async () => {
    for (const range of ['6h', '24h', '7d']) {
      const { topic } = await getTopic(1042, { range })
      expect((await getTopicArticles(1042, { range })).total).toBe(topic.article_count)
    }
  })

  it('splits the range total by source', async () => {
    const { source_distribution } = await getTopic(1042, { range: '7d' })
    const tuoitre = source_distribution.find((s) => s.source.code === 'tuoitre')
    expect((await getTopicArticles(1042, { range: '7d', source: 'tuoitre' })).total).toBe(tuoitre.article_count)
  })

  it('rejects an unknown topic with a 404', async () => {
    await expect(getTopicArticles(9999)).rejects.toMatchObject({ status: 404 })
  })
})

describe('getStatus', () => {
  it('returns the 20 feeds with a summary that matches them', async () => {
    const s = await getStatus()
    expect(s.feeds).toHaveLength(20)
    expect(s.summary.feeds_total).toBe(20)
    expect(s.summary.feeds_ok).toBe(s.feeds.filter((f) => f.status === 'ok').length)
    expect(s.summary.feeds_error).toBe(s.feeds.filter((f) => f.status === 'error').length)
  })

  it('has a warning for every feed in error', async () => {
    const s = await getStatus()
    const failing = s.feeds.filter((f) => f.status === 'error').map((f) => f.feed_id)
    expect(s.warnings.map((w) => w.feed_id)).toEqual(failing)
  })
})
