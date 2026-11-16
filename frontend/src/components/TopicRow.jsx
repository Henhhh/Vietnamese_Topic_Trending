import { Link, useNavigate } from 'react-router-dom'
import { formatGrowth, formatNumber } from '../labels'
import Icon from './Icon'
import Sparkline from './Sparkline'
import StatusBadge from './StatusBadge'

// One table row. The whole row opens Topic Detail (carrying the selected range); the title is also
// a real link so keyboard users and "open in new tab" work.
export default function TopicRow({ topic, range }) {
  const navigate = useNavigate()
  const to = `/topics/${topic.topic_id}` + (range === '24h' ? '' : `?range=${range}`)
  const g = topic.growth_pct

  return (
    <tr onClick={(e) => !e.target.closest('a') && navigate(to)}>
      <td className="cell-rank">
        <span className="rank">{topic.rank}</span>
      </td>
      <td className="cell-topic">
        <Link className="topic-link" to={to} title={topic.title}>
          {topic.title}
        </Link>
        <div className="keyword-row">
          {topic.keywords.slice(0, 3).map((k) => (
            <span className="keyword" key={k}>
              {k}
            </span>
          ))}
          <StatusBadge status={topic.status} />
        </div>
      </td>
      <td className="cell-score" data-label="Điểm">
        <strong className="score-number">{topic.score}</strong>
        <span className="score-denom"> / 100</span>
      </td>
      <td className="cell-articles" data-label="Bài viết">
        <strong>{formatNumber(topic.article_count)}</strong>
      </td>
      <td className="cell-sources" data-label="Nguồn">
        {topic.source_count}
      </td>
      <td className="cell-growth" data-label="Mức tăng">
        {g == null ? (
          <span className="new-growth">{formatGrowth(g)}</span>
        ) : (
          <span className={g < 0 ? 'growth negative' : 'growth'}>{formatGrowth(g)}</span>
        )}
      </td>
      <td className="cell-spark">
        <Sparkline counts={topic.sparkline} down={(g ?? 1) < 0} />
      </td>
      <td className="cell-chevron">
        <Icon name="chevron" size={18} />
      </td>
    </tr>
  )
}
