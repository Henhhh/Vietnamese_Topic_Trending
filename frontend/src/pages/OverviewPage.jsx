import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getTopics } from '../api'
import FilterBar from '../components/FilterBar'
import Icon from '../components/Icon'
import PageIntro from '../components/PageIntro'
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
  const reset = () => setParams({})

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
      <PageIntro title="Xu hướng tin tức" subtitle="Phát hiện chủ đề mới nổi từ các nguồn báo tiếng Việt" />

      {data && <SummaryCards summary={data.summary} range={filters.range} />}

      <section className="panel trends-panel">
        {data && (
          <FilterBar
            filters={filters}
            sources={data.sources}
            onChange={setFilter}
            onReset={reset}
            canReset={canReset}
          />
        )}

        <div className="table-heading">
          <div>
            <h2>Chủ đề nổi bật</h2>
            <p>
              Khoảng thời gian: <strong>{RANGES[filters.range]} gần nhất</strong> · {sourceName}
            </p>
          </div>
          {data && <span className="result-count">{data.total} kết quả</span>}
        </div>

        {status === 'loading' && !data && <p className="state">Đang tải…</p>}
        {status === 'error' && (
          <p className="state">
            Không tải được dữ liệu.
            <button type="button" className="secondary-button" onClick={() => setAttempt((n) => n + 1)}>
              Thử lại
            </button>
          </p>
        )}
        {status === 'ready' && data && rows.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="search" size={24} />
            </div>
            <h3>Không tìm thấy chủ đề phù hợp</h3>
            <p>Hãy thử từ khóa khác hoặc đặt lại các bộ lọc hiện tại.</p>
            <button type="button" className="primary-button" onClick={reset}>
              Xóa bộ lọc
            </button>
          </div>
        )}

        {rows.length > 0 && (
          <div className={status === 'loading' ? 'desktop-table-wrap is-loading' : 'desktop-table-wrap'}>
            <table className="trends-table">
              <thead>
                <tr>
                  <th>Thứ hạng</th>
                  <th>Chủ đề</th>
                  <th>Điểm xu hướng</th>
                  <th>Số bài viết</th>
                  <th>Số nguồn</th>
                  <th>Mức tăng</th>
                  <th>Diễn biến</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <TopicRow key={t.topic_id} topic={t} range={filters.range} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {status === 'ready' && data && rows.length > 0 && rows.length < data.total && (
          <div className="table-footer">
            <button type="button" className="secondary-button" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Đang tải…' : 'Xem thêm chủ đề'}
              {!loadingMore && <Icon name="arrow" size={16} />}
            </button>
          </div>
        )}
      </section>

      <div className="coverage-note">
        <Icon name="info" size={17} />
        <span>
          Xu hướng phản ánh mức độ đưa tin trong tập nguồn đã thu thập, không phải lượng tìm kiếm hay ý kiến của toàn bộ
          người dân.
        </span>
      </div>
    </>
  )
}
