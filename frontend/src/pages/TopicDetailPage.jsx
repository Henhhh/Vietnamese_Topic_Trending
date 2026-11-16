import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getTopic } from '../api'
import ArticleItem from '../components/ArticleItem'
import RelatedArticles from '../components/RelatedArticles'
import StatusBadge from '../components/StatusBadge'
import TrendChart from '../components/TrendChart'
import { GROWTH_BASELINE, RANGES, RANGE_NOUN, formatDateTime, formatGrowth, formatNumber, label } from '../labels'

const SCORE_TIP =
  'Chỉ số tương đối dựa trên lượng bài, mức tăng, độ mới và mức độ đa dạng nguồn. Không phải xác suất.'

export default function TopicDetailPage() {
  const { topicId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const rangeParam = params.get('range')
  const range = rangeParam in RANGES ? rangeParam : '24h'
  function setRange(value) {
    const next = new URLSearchParams(params)
    if (value === '24h') next.delete('range')
    else next.set('range', value)
    // Replace, so "Quay lại danh sách" still lands on the Overview and not on the previous range.
    setParams(next, { replace: true })
  }

  const [state, setState] = useState({ status: 'loading', data: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let stale = false
    setState((s) => ({ ...s, status: 'loading' }))
    getTopic(topicId, { range })
      .then((data) => !stale && setState({ status: 'ready', data }))
      .catch((e) => !stale && setState({ status: e.status === 404 ? 'notfound' : 'error', data: null }))
    return () => {
      stale = true
    }
  }, [topicId, range, attempt])

  // Back restores the Overview filters when we came from there; a direct visit falls back to "/".
  const cameFromApp = location.key !== 'default'
  const back = cameFromApp ? (
    <button type="button" className="link-button" onClick={() => navigate(-1)}>
      ← Quay lại danh sách
    </button>
  ) : (
    <Link to="/">← Quay lại danh sách</Link>
  )

  const { status, data } = state
  if (status === 'notfound') {
    return (
      <>
        <h1>Không tìm thấy chủ đề</h1>
        <p className="subtitle">Chủ đề này không tồn tại hoặc đã được gộp vào chủ đề khác.</p>
        <Link to="/">← Về trang Tổng quan</Link>
      </>
    )
  }
  if (status === 'error') {
    return (
      <p className="state">
        Không tải được dữ liệu.{' '}
        <button type="button" onClick={() => setAttempt((n) => n + 1)}>
          Thử lại
        </button>
      </p>
    )
  }
  if (!data) return <p className="state">Đang tải…</p>

  const { topic } = data
  const maxSource = Math.max(...data.source_distribution.map((s) => s.article_count))
  const cards = [
    {
      title: 'Điểm xu hướng',
      tip: SCORE_TIP,
      value: `${topic.score} / 100`,
      note: 'Tính trên 24 giờ gần nhất, không đổi theo khoảng thời gian',
    },
    {
      title: 'Số bài viết',
      value: formatNumber(topic.article_count),
      note: `Trong ${RANGES[range]} gần nhất`,
    },
    {
      title: 'Số nguồn',
      value: topic.source_count,
      note: `Trong ${topic.source_total} nguồn theo dõi`,
    },
    {
      title: 'Mức tăng',
      value: formatGrowth(topic.growth_pct),
      note: label(GROWTH_BASELINE, topic.growth_baseline),
    },
  ]

  return (
    <>
      <nav className="breadcrumb">
        <Link to="/">Tổng quan</Link> › Chi tiết chủ đề
      </nav>
      {back}

      <header className="detail-head">
        <div>
          <h1>{topic.title}</h1>
          <div className="topic-meta">
            <StatusBadge status={topic.status} />
            {topic.keywords.map((k) => (
              <span className="tag" key={k}>
                {k}
              </span>
            ))}
          </div>
          <div className="table-sub">
            Phát hiện đầu tiên: {formatDateTime(topic.first_seen_at)} · Cập nhật: {formatDateTime(topic.updated_at)}
          </div>
        </div>
        <div className="range-tabs" role="group" aria-label="Khoảng thời gian">
          {Object.entries(RANGES).map(([code, name]) => (
            <button
              type="button"
              key={code}
              className={code === range ? 'active' : ''}
              aria-pressed={code === range}
              onClick={() => setRange(code)}
            >
              {name}
            </button>
          ))}
        </div>
      </header>

      <section className="cards">
        {cards.map((c) => (
          <div className="card" key={c.title}>
            <div className="card-title">
              {c.title}
              {c.tip && (
                <span className="info" title={c.tip} aria-label={c.tip}>
                  ⓘ
                </span>
              )}
            </div>
            <div className="card-value">{c.value}</div>
            <div className="card-note">{c.note}</div>
          </div>
        ))}
      </section>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel">
            <h2>Diễn biến đưa tin</h2>
            <div className="table-sub">
              Số bài viết {RANGE_NOUN[range]} · Nét đứt: khoảng thời gian hiện tại chưa đủ
            </div>
            <TrendChart points={data.timeline.points} range={range} />
          </section>

          <section className="panel">
            <h2>Bài viết đại diện</h2>
            <ArticleItem article={data.representative_article} />
          </section>

          <RelatedArticles
            topicId={topic.topic_id}
            sources={data.source_distribution.map((s) => s.source)}
            total={data.articles.total}
            sourceCount={topic.source_count}
          />
        </div>

        <aside className="detail-side">
          <section className="panel">
            <h2>Từ khóa liên quan</h2>
            <div className="table-sub">Trích xuất từ cụm bài viết</div>
            <ul className="kw-list">
              {data.related_keywords.map((k) => (
                <li key={k.keyword}>
                  <span>{k.keyword}</span>
                  <strong>{formatNumber(k.count)}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Phân bố nguồn</h2>
            <ul className="bars">
              {data.source_distribution.map((s) => (
                <li key={s.source.code}>
                  <div className="bar-label">
                    <span>{s.source.name}</span>
                    <strong>{formatNumber(s.article_count)}</strong>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(s.article_count / maxSource) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Về dữ liệu</h2>
            <p className="table-sub">
              Chủ đề được nhóm từ các bài viết có nội dung liên quan. Số liệu chỉ phản ánh tập nguồn đã thu thập.
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}
