// Tiny trend line in the design's style: blue when the topic is rising, red when falling.
// The last bucket is still filling, so the final segment is dashed.
export default function Sparkline({ counts, down = false }) {
  const max = Math.max(...counts)
  const min = Math.min(...counts)
  const step = 104 / Math.max(1, counts.length - 1)
  const pts = counts.map((v, i) => [4 + i * step, 31 - ((v - min) / Math.max(1, max - min)) * 23])
  const toPoints = (list) => list.map((p) => p.join(',')).join(' ')
  const cls = down ? 'spark-down' : 'spark-up'
  return (
    <svg className="sparkline" viewBox="0 0 112 38" role="img" aria-label="Biểu đồ diễn biến nhỏ">
      <path d="M4 32H108" className="spark-base" />
      <polyline points={toPoints(pts.slice(0, -1))} className={cls} />
      <polyline points={toPoints(pts.slice(-2))} className={cls} strokeDasharray="3 3" />
    </svg>
  )
}
