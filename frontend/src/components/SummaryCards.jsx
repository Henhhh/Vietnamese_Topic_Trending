import { RANGES, formatNumber } from '../labels'

export default function SummaryCards({ summary, range }) {
  const failing = summary.feeds_total - summary.feeds_ok
  const cards = [
    {
      title: 'Bài viết trong khoảng thời gian',
      value: formatNumber(summary.article_count),
      note: `Trong ${RANGES[range]} gần nhất`,
    },
    {
      title: 'Chủ đề được phát hiện',
      value: formatNumber(summary.topic_count),
      note: `${formatNumber(summary.rising_topic_count)} chủ đề đang tăng`,
    },
    {
      title: 'Feed đọc được',
      value: `${summary.feeds_ok} / ${summary.feeds_total}`,
      note: failing > 0 ? `${failing} feed cần kiểm tra` : 'Tất cả đều hoạt động',
    },
  ]
  return (
    <section className="cards">
      {cards.map((c) => (
        <div className="card" key={c.title}>
          <div className="card-title">{c.title}</div>
          <div className="card-value">{c.value}</div>
          <div className="card-note">{c.note}</div>
        </div>
      ))}
    </section>
  )
}
