import { Link } from 'react-router-dom'
import { formatGrowth, formatNumber } from '../labels'
import Sparkline from './Sparkline'
import StatusBadge from './StatusBadge'

const growthClass = (pct) => (pct == null ? 'growth-new' : pct > 0 ? 'growth-up' : pct < 0 ? 'growth-down' : '')

// The whole row is one link to Topic Detail, carrying the selected range.
export default function TopicRow({ topic, range }) {
  const to = `/topics/${topic.topic_id}` + (range === '24h' ? '' : `?range=${range}`)
  return (
    <Link className="row" to={to}>
      <div className="cell-rank">{topic.rank}</div>
      <div className="cell-topic">
        <div className="topic-title">{topic.title}</div>
        <div className="topic-meta">
          <StatusBadge status={topic.status} />
          {topic.keywords.slice(0, 3).map((k) => (
            <span className="tag" key={k}>
              {k}
            </span>
          ))}
        </div>
      </div>
      <div className="cell-score" data-label="Điểm">
        {topic.score} / 100
      </div>
      <div className="cell-articles" data-label="Bài viết">
        {formatNumber(topic.article_count)}
      </div>
      <div className="cell-sources" data-label="Nguồn">
        {topic.source_count}
      </div>
      <div className={`cell-growth ${growthClass(topic.growth_pct)}`} data-label="Mức tăng">
        {formatGrowth(topic.growth_pct)}
      </div>
      <div className="cell-spark">
        <Sparkline counts={topic.sparkline} />
      </div>
    </Link>
  )
}
