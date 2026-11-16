import { LineChart, Line } from 'recharts'

// Tiny trend line. The last bucket is still filling, so it is drawn dashed.
export default function Sparkline({ counts, width = 110, height = 36 }) {
  const data = counts.map((count, i) => ({
    solid: i < counts.length - 1 ? count : null,
    dashed: i >= counts.length - 2 ? count : null,
  }))
  const line = { type: 'monotone', dot: false, strokeWidth: 2, isAnimationActive: false, connectNulls: false }
  return (
    <LineChart width={width} height={height} data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
      <Line dataKey="solid" stroke="#2563eb" {...line} />
      <Line dataKey="dashed" stroke="#2563eb" strokeDasharray="3 3" {...line} />
    </LineChart>
  )
}
