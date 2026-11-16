import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatAxisLabel, formatDateTime, formatNumber } from '../labels'

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="chart-tip">
      <div>{p.when}</div>
      <strong>{formatNumber(p.count)} bài viết</strong>
      {!p.complete && <div className="muted">Chưa đủ khoảng thời gian</div>}
    </div>
  )
}

const tick = { fontSize: 11, fill: '#9aa3b2' }
const line = { type: 'monotone', stroke: '#3575dd', strokeWidth: 2.2, isAnimationActive: false }

// Article count per bucket, in the style of the design. The last bucket is still filling,
// so its segment is dashed.
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
  const hover = { r: 3, fill: '#fff', stroke: '#3575dd', strokeWidth: 1.7 }
  return (
    <ResponsiveContainer width="100%" height={265}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#edf0f4" vertical={false} />
        <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} width={34} tick={tick} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTip />} cursor={{ stroke: '#dfe5ed' }} />
        <Area dataKey="count" stroke="none" fill="#3978df" fillOpacity={0.07} activeDot={false} isAnimationActive={false} />
        <Line dataKey="solid" dot={false} activeDot={hover} {...line} />
        <Line dataKey="dashed" dot={false} activeDot={false} strokeDasharray="4 4" {...line} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
