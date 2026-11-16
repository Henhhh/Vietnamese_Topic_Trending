import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SAMPLE_MODE, getTopic } from '../api'
import ArticleItem from '../components/ArticleItem'
import Icon from '../components/Icon'
import Metric from '../components/Metric'
import RelatedArticles from '../components/RelatedArticles'
import StatusBadge from '../components/StatusBadge'
import TrendChart from '../components/TrendChart'
import {
  GROWTH_BASELINE,
  RANGES,
  RANGE_NOUN,
  formatDay,
  formatGrowth,
  formatNumber,
  formatTime,
  label,
} from '../labels'

const SCORE_TIP =
  'Chỉ số tương đối dựa trên lượng bài, mức tăng, độ mới và mức độ đa dạng nguồn. Không phải xác suất.'

// "14/11, 06:15" as in the design (no year).
const formatShort = (iso) => `${formatDay(iso)}, ${formatTime(iso)}`

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

  const { status, data } = state
  if (status === 'notfound') {
    return (
      <div className="detail-page">
        <div className="page-intro">
          <h1>Không tìm thấy chủ đề</h1>
          <p>Chủ đề này không tồn tại hoặc đã được gộp vào chủ đề khác.</p>
        </div>
        <Link className="back-button" to="/">
          <Icon name="back" size={17} /> Về trang Tổng quan
        </Link>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <p className="state">
        Không tải được dữ liệu.
        <button type="button" className="secondary-button" onClick={() => setAttempt((n) => n + 1)}>
          Thử lại
        </button>
      </p>
    )
  }
  if (!data) return <p className="state">Đang tải…</p>

  // Back restores the Overview filters when we came from there; a direct visit falls back to "/".
  const cameFromApp = location.key !== 'default'
  const backLabel = (
    <>
      <Icon name="back" size={17} /> Quay lại danh sách
    </>
  )

  const { topic } = data
  const maxSource = Math.max(...data.source_distribution.map((s) => s.article_count))

  return (
    <div className="detail-page">
      <div className="breadcrumb">
        <Link to="/">Tổng quan</Link>
        <Icon name="chevron" size={13} />
        <span>Chi tiết chủ đề</span>
      </div>
      {cameFromApp ? (
        <button type="button" className="back-button" onClick={() => navigate(-1)}>
          {backLabel}
        </button>
      ) : (
        <Link className="back-button" to="/">
          {backLabel}
        </Link>
      )}

      <div className="detail-title-row">
        <div>
          <h1>{topic.title}</h1>
          <div className="keyword-row detail-keywords">
            {topic.keywords.map((k) => (
              <span className="keyword" key={k}>
                {k}
              </span>
            ))}
            <StatusBadge status={topic.status} />
          </div>
        </div>
        <div className="detail-side-head">
          <div className="filter-group" role="group" aria-label="Khoảng thời gian">
            {Object.entries(RANGES).map(([code, name]) => (
              <button
                type="button"
                key={code}
                className={code === range ? 'selected' : ''}
                aria-pressed={code === range}
                onClick={() => setRange(code)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="timestamps">
            <span>
              <Icon name="clock" size={15} />
              Phát hiện đầu tiên <strong>{formatShort(topic.first_seen_at)}</strong>
            </span>
            <span>
              Cập nhật <strong>{formatShort(topic.updated_at)}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="metrics-grid four">
        <Metric
          label="Điểm xu hướng"
          tooltip={SCORE_TIP}
          value={`${topic.score} / 100`}
          helper="Chỉ số tương đối · tính trên 24 giờ gần nhất"
        />
        <Metric label="Số bài viết" value={formatNumber(topic.article_count)} helper={`Trong ${RANGES[range]} gần nhất`} />
        <Metric label="Số nguồn" value={topic.source_count} helper={`Trong ${topic.source_total} nguồn theo dõi`} />
        <Metric
          label="Mức tăng"
          value={formatGrowth(topic.growth_pct)}
          helper={label(GROWTH_BASELINE, topic.growth_baseline)}
        />
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel chart-panel">
            <div className="section-heading">
              <div>
                <h2>Diễn biến đưa tin</h2>
                <p>Số bài viết {RANGE_NOUN[range]} · Nét đứt: khoảng thời gian hiện tại chưa đủ</p>
              </div>
            </div>
            <TrendChart points={data.timeline.points} range={range} />
          </section>

          <section className="panel representative">
            <div className="section-heading">
              <div>
                <h2>Bài viết đại diện</h2>
                <p>Bài viết có độ liên quan cao với cụm chủ đề</p>
              </div>
              {SAMPLE_MODE && <span className="illustrative">MINH HỌA</span>}
            </div>
            <ArticleItem article={data.representative_article} variant="featured" />
          </section>

          <RelatedArticles
            topicId={topic.topic_id}
            sources={data.source_distribution.map((s) => s.source)}
            total={data.articles.total}
            sourceCount={topic.source_count}
          />
        </div>

        <aside className="detail-aside">
          <section className="panel side-panel">
            <h2>Từ khóa liên quan</h2>
            <p className="side-caption">Trích xuất từ cụm bài viết</p>
            <div className="keyword-cloud">
              {data.related_keywords.map((k) => (
                <span key={k.keyword}>
                  {k.keyword} <b>{formatNumber(k.count)}</b>
                </span>
              ))}
            </div>
          </section>

          <section className="panel side-panel">
            <div className="section-heading">
              <h2>Phân bố nguồn</h2>
            </div>
            {data.source_distribution.map((s) => (
              <div className="source-bar" key={s.source.code}>
                <div>
                  <span>{s.source.name}</span>
                  <strong>{formatNumber(s.article_count)} bài</strong>
                </div>
                <div className="bar-track">
                  <span style={{ width: `${(s.article_count / maxSource) * 100}%` }} />
                </div>
              </div>
            ))}
          </section>

          <div className="method-note">
            <Icon name="info" size={17} />
            <p>
              <strong>Về dữ liệu</strong>
              Chủ đề được nhóm từ các bài viết có nội dung liên quan. Số liệu chỉ phản ánh tập nguồn đã thu thập.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
