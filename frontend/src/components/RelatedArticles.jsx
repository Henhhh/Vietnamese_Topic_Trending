import { useEffect, useState } from 'react'
import { getTopicArticles } from '../api'
import ArticleItem from './ArticleItem'
import Icon from './Icon'

const PAGE_SIZE = 10

// Related articles, newest first, with its own source filter and "load more".
// "Load more" shows while fewer articles are loaded than the total; a page that comes back empty ends it.
export default function RelatedArticles({ topicId, range, sources, total, sourceCount }) {
  const [source, setSource] = useState('')
  const [state, setState] = useState({ status: 'loading', items: [], total, done: false })
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let stale = false
    setState((s) => ({ ...s, status: 'loading' }))
    getTopicArticles(topicId, { range, source, limit: PAGE_SIZE, offset: 0 })
      .then((r) => !stale && setState({ status: 'ready', items: r.items, total: r.total, done: r.items.length === 0 }))
      .catch(() => !stale && setState((s) => ({ ...s, status: 'error' })))
    return () => {
      stale = true
    }
  }, [topicId, range, source, attempt])

  function loadMore() {
    setLoadingMore(true)
    getTopicArticles(topicId, { range, source, limit: PAGE_SIZE, offset: state.items.length })
      .then((r) => setState((s) => ({ ...s, items: [...s.items, ...r.items], done: r.items.length === 0 })))
      .catch(() => setState((s) => ({ ...s, status: 'error' })))
      .finally(() => setLoadingMore(false))
  }

  const { status, items } = state
  return (
    <section className="panel articles-panel">
      <div className="section-heading articles-title">
        <div>
          <h2>Các bài viết liên quan</h2>
          <p>{source ? `${state.total} bài viết từ nguồn đã chọn` : `${total} bài viết từ ${sourceCount} nguồn`}</p>
        </div>
        <label className="select-wrap">
          <span className="sr-only">Nguồn báo</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Tất cả nguồn</option>
            {sources.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="sort-note">
        <Icon name="filter" size={15} />
        Mới nhất trước
      </div>

      {status === 'error' && (
        <p className="state">
          Không tải được bài viết.
          <button type="button" className="secondary-button" onClick={() => setAttempt((n) => n + 1)}>
            Thử lại
          </button>
        </p>
      )}
      {status === 'loading' && items.length === 0 && <p className="state">Đang tải…</p>}
      {status === 'ready' && items.length === 0 && <p className="state">Chưa có bài viết từ nguồn này.</p>}

      <div className={status === 'loading' ? 'is-loading' : ''}>
        {items.map((a) => (
          <ArticleItem key={a.url} article={a} />
        ))}
      </div>

      {status === 'ready' && !state.done && items.length < state.total && (
        <div className="table-footer">
          <button type="button" className="secondary-button" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Đang tải…' : 'Xem thêm bài viết'}
            {!loadingMore && <Icon name="arrow" size={16} />}
          </button>
        </div>
      )}
    </section>
  )
}
