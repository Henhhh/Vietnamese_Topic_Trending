import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getTopics } from '../api'
import FilterBar from '../components/FilterBar'
import SummaryCards from '../components/SummaryCards'
import TopicRow from '../components/TopicRow'
import { RANGES, SORTS } from '../labels'

const PAGE_SIZE = 4
const DEFAULTS = { range: '24h', source: '', sort: 'score', q: '' }

export default function OverviewPage() {
  const [params, setParams] = useSearchParams()

  // Filters live in the URL; defaults are omitted from it. Unknown values fall back to the default.
  const range = params.get('range')
  const sort = params.get('sort')
  const filters = {
    range: range in RANGES ? range : DEFAULTS.range,
    sort: sort in SORTS ? sort : DEFAULTS.sort,
    source: params.get('source') ?? DEFAULTS.source,
    q: params.get('q') ?? DEFAULTS.q,
  }
  const canReset = [...params.keys()].length > 0

  function setFilter(key, value) {
    const next = new URLSearchParams(params)
    if (value === DEFAULTS[key]) next.delete(key)
    else next.set(key, value)
    // Typing in the search box must not fill the Back history.
    setParams(next, { replace: key === 'q' })
  }

  const [state, setState] = useState({ status: 'loading', data: null, rows: [] })
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // First page, again whenever a filter changes (or on retry).
  useEffect(() => {
    let stale = false
    setState((s) => ({ ...s, status: 'loading' }))
    getTopics({ ...filters, limit: PAGE_SIZE, offset: 0 })
      .then((data) => !stale && setState({ status: 'ready', data, rows: data.topics }))
      .catch(() => !stale && setState((s) => ({ ...s, status: 'error' })))
    return () => {
      stale = true
    }
  }, [filters.range, filters.source, filters.sort, filters.q, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadMore() {
    setLoadingMore(true)
    getTopics({ ...filters, limit: PAGE_SIZE, offset: state.rows.length })
      .then((data) => setState((s) => ({ ...s, data, rows: [...s.rows, ...data.topics] })))
      .catch(() => setState((s) => ({ ...s, status: 'error' })))
      .finally(() => setLoadingMore(false))
  }

  const { status, data, rows } = state
  const sourceName = data?.sources.find((s) => s.code === filters.source)?.name ?? 'Tất cả nguồn'

  return (
    <>
      <h1>Xu hướng tin tức</h1>
      <p className="subtitle">Phát hiện chủ đề mới nổi từ các nguồn báo tiếng Việt</p>

      {data && <SummaryCards summary={data.summary} range={filters.range} />}
      {data && (
        <FilterBar
          filters={filters}
          sources={data.sources}
          onChange={setFilter}
          onReset={() => setParams({})}
          canReset={canReset}
        />
      )}

      <section className="table">
        <header className="table-head">
          <h2>Chủ đề nổi bật</h2>
          <div className="table-sub">
            Khoảng thời gian: {RANGES[filters.range]} gần nhất · {sourceName}
            {data && ` · ${data.total} kết quả`}
          </div>
        </header>

        {status === 'loading' && !data && <p className="state">Đang tải…</p>}
        {status === 'error' && (
          <p className="state">
            Không tải được dữ liệu.{' '}
            <button type="button" onClick={() => setAttempt((n) => n + 1)}>
              Thử lại
            </button>
          </p>
        )}
        {status !== 'error' && data && rows.length === 0 && status === 'ready' && (
          <p className="state">
            Không có chủ đề phù hợp.{' '}
            <button type="button" onClick={() => setParams({})}>
              Xóa bộ lọc
            </button>
          </p>
        )}

        {rows.length > 0 && (
          <div className={status === 'loading' ? 'rows is-loading' : 'rows'}>
            {rows.map((t) => (
              <TopicRow key={t.topic_id} topic={t} range={filters.range} />
            ))}
          </div>
        )}

        {status === 'ready' && data && rows.length < data.total && (
          <button type="button" className="more" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Đang tải…' : 'Xem thêm chủ đề'}
          </button>
        )}
      </section>

      <p className="footnote">
        Xu hướng phản ánh mức độ đưa tin trong tập nguồn đã thu thập, không phải lượng tìm kiếm hay ý kiến của toàn bộ
        người dân.
      </p>
    </>
  )
}
