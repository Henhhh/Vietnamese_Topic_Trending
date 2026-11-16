// Vietnamese labels and formatters. API responses carry codes; the UI shows these labels.

export const TOPIC_STATUS = {
  rising: 'Đang tăng',
  new: 'Mới xuất hiện',
  stable: 'Ổn định',
  falling: 'Đang giảm',
}

export const FEED_STATUS = {
  ok: 'Hoạt động',
  error: 'Lỗi',
  no_data: 'Chưa có dữ liệu',
}

export const RUN_STATUS = {
  running: 'Đang chạy',
  completed: 'Hoàn thành',
  partial: 'Hoàn thành một phần',
  failed: 'Lỗi',
}

export const STEP_NAME = {
  collect: 'Thu thập dữ liệu',
  nlp: 'Xử lý văn bản',
  cluster: 'Gom chủ đề',
  score: 'Tính điểm xu hướng',
}

export const STEP_STATUS = {
  completed: 'Hoàn thành',
  running: 'Đang chạy',
  pending: 'Chờ xử lý',
  failed: 'Lỗi',
}

export const RANGES = { '6h': '6 giờ', '24h': '24 giờ', '7d': '7 ngày' }

export const SORTS = { score: 'Điểm xu hướng', articles: 'Số bài viết', growth: 'Mức tăng' }

export const GROWTH_BASELINE = {
  previous_period: 'So với kỳ liền trước',
  same_hours_yesterday: 'So với cùng khung giờ hôm qua',
}

// Falls back to the raw code so an unknown value is visible instead of blank.
export const label = (map, code) => map[code] ?? code

export const formatNumber = (n) => n.toLocaleString('vi-VN')

// "Mới xuất hiện" when there is no percentage (new topic or baseline too small).
export function formatGrowth(pct) {
  if (pct == null) return 'Mới xuất hiện'
  if (pct > 0) return `↑ ${pct}%`
  if (pct < 0) return `↓ ${Math.abs(pct)}%`
  return '0%'
}

// All times are shown in Vietnam time regardless of the viewer's own time zone.
const partsFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parts(iso) {
  const out = {}
  for (const p of partsFormat.formatToParts(new Date(iso))) out[p.type] = p.value
  return out
}

export function formatTime(iso) {
  const p = parts(iso)
  return `${p.hour}:${p.minute}`
}

export function formatDay(iso) {
  const p = parts(iso)
  return `${p.day}/${p.month}`
}

export function formatDate(iso) {
  const p = parts(iso)
  return `${p.day}/${p.month}/${p.year}`
}

export const formatDateTime = (iso) => `${formatTime(iso)}, ${formatDate(iso)}`

// Chart axis label: HH:00 for the hourly ranges, dd/MM for 7 days.
export function formatAxisLabel(iso, range) {
  return range === '7d' ? formatDay(iso) : `${parts(iso).hour}:00`
}
