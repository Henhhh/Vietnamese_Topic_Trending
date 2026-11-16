import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatAxisLabel, formatDateTime, formatNumber } from '../labels'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="chart-tip">
      <div>{p.when}</div>
      <strong>{formatNumber(p.count)} bài viết</strong>
      {!p.complete && <div className="chart-tip-note">Chưa đủ khoảng thời gian</div>}
    </div>
  )
}

// Article count per bucket. The last bucket is still filling, so its segment is dashed.
export default function TrendChart({ points, range }) {
  const last = points.length - 1
  const data = points.map((p, i) => ({
    label: formatAxisLabel(p.start, range),
    when: formatDateTime(p.start),
    count: p.count,
    complete: p.complete,
    solid: i < last ? p.count : null,
    dashed: i >= last - 1 ? p.count : null,
  }))
  const line = { type: 'monotone', strokeWidth: 2, stroke: '#2563eb', isAnimationActive: false }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} width={36} tick={{ fontSize: 12 }} />
        <Tooltip content={<ChartTooltip />} />
        <Line dataKey="solid" dot={{ r: 3 }} {...line} />
        <Line dataKey="dashed" dot={false} activeDot={false} strokeDasharray="4 4" {...line} />
      </LineChart>
    </ResponsiveContainer>
  )
}
