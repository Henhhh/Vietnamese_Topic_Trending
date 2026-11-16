import { RANGES, formatNumber } from '../labels'
import Metric from './Metric'

export default function SummaryCards({ summary, range }) {
  const failing = summary.feeds_total - summary.feeds_ok
  return (
    <div className="metrics-grid three">
      <Metric
        icon="file"
        label="Bài viết trong khoảng thời gian"
        value={formatNumber(summary.article_count)}
        helper={`Trong ${RANGES[range]} gần nhất`}
      />
      <Metric
        icon="trend"
        label="Chủ đề được phát hiện"
        value={formatNumber(summary.topic_count)}
        helper={`${formatNumber(summary.rising_topic_count)} chủ đề đang tăng`}
      />
      <Metric
        icon="database"
        label="Feed đọc được"
        value={`${summary.feeds_ok} / ${summary.feeds_total}`}
        helper={failing > 0 ? `${failing} feed cần kiểm tra` : 'Tất cả đều hoạt động'}
      />
    </div>
  )
}
