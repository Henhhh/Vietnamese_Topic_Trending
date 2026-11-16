import { useEffect, useState } from 'react'
import { getStatus } from '../api'
import { FEED_STATUS, RUN_STATUS, STEP_NAME, STEP_STATUS, formatDateTime, formatNumber, formatTime, label } from '../labels'

const badge = (map, code) => <span className={`badge badge-${code}`}>{label(map, code)}</span>

function stepTime(step) {
  if (step.finished_at) return `${formatTime(step.started_at)}–${formatTime(step.finished_at)}`
  if (step.started_at) return `Bắt đầu lúc ${formatTime(step.started_at)}`
  return '—'
}

function runSummary(run) {
  if (run.status === 'failed') return run.error_message ?? 'Lần chạy thất bại'
  const parts = [`${formatNumber(run.new_article_count)} bài mới`, `${formatNumber(run.duplicate_count)} bài trùng`]
  if (run.failed_feed_count > 0) parts.push(`${run.failed_feed_count} feed lỗi`)
  return parts.join(' · ')
}

// "08:15–08:28" for a finished run.
const runSpan = (run) => `${formatTime(run.started_at)}–${formatTime(run.finished_at)}`

export default function StatusPage() {
  const [state, setState] = useState({ status: 'loading', data: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let stale = false
    getStatus()
      .then((data) => !stale && setState({ status: 'ready', data }))
      .catch(() => !stale && setState({ status: 'error', data: null }))
    return () => {
      stale = true
    }
  }, [attempt])

  const { status, data } = state
  if (status === 'error') {
    return (
      <p className="state">
        Không tải được dữ liệu.{' '}
        <button type="button" onClick={() => setAttempt((n) => n + 1)}>
          Thử lại
        </button>
      </p>
    )
  }
  if (!data) return <p className="state">Đang tải…</p>

  const { summary, warnings, feeds, latest_run: run, last_completed_run: done, recent_runs: runs } = data
  const okPct = Math.round((summary.feeds_ok / summary.feeds_total) * 100)
  const dupPct = (done.duplicate_count / (done.new_article_count + done.duplicate_count)) * 100
  const cards = [
    { title: 'Feed hoạt động', value: `${summary.feeds_ok} / ${summary.feeds_total}`, note: `${okPct}% tổng số feed` },
    {
      title: 'Feed gặp lỗi',
      value: summary.feeds_error,
      note: summary.feeds_error > 0 ? 'Cần kiểm tra kết nối' : 'Không có lỗi',
    },
    {
      title: 'Bài mới lần hoàn thành gần nhất',
      value: formatNumber(done.new_article_count),
      note: `Lúc ${formatDateTime(done.started_at)}`,
    },
    {
      title: 'Bài trùng đã loại',
      value: formatNumber(done.duplicate_count),
      note: `${dupPct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% dữ liệu thu thập`,
    },
  ]

  return (
    <>
      <h1>Theo dõi thu thập &amp; xử lý</h1>
      <p className="subtitle">Giám sát tình trạng nguồn tin và các bước xử lý dữ liệu gần nhất</p>

      {warnings.map((w) => (
        <div className="banner" role="alert" key={w.feed_id}>
          Dữ liệu từ {w.source.name} ({w.category.name}) có thể đã cũ — hiển thị kết quả khả dụng gần nhất từ{' '}
          {formatDateTime(w.last_success_at)}. Hệ thống sẽ tự thử lại ở lần chạy kế tiếp.
        </div>
      ))}

      <section className="cards">
        {cards.map((c) => (
          <div className="card" key={c.title}>
            <div className="card-title">{c.title}</div>
            <div className="card-value">{c.value}</div>
            <div className="card-note">{c.note}</div>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Tình trạng nguồn tin</h2>
        <div className="table-sub">
          Cập nhật tự động mỗi 15 phút · {summary.feeds_ok} / {summary.feeds_total} feed đọc được ở lần chạy gần nhất
        </div>
        <div className="table-wrap">
          <table className="feeds">
            <thead>
              <tr>
                <th>Nguồn</th>
                <th>RSS URL</th>
                <th>Trạng thái</th>
                <th>Lần thu thập gần nhất</th>
                <th>Số bài mới</th>
                <th>Thông tin lỗi</th>
              </tr>
            </thead>
            <tbody>
              {feeds.map((f) => (
                <tr key={f.feed_id}>
                  <td>
                    {f.source.name} <span className="muted">· {f.category.name}</span>
                  </td>
                  <td className="url">{f.rss_url}</td>
                  <td>{badge(FEED_STATUS, f.status)}</td>
                  <td>{f.last_fetched_at ? formatDateTime(f.last_fetched_at) : 'Chưa thu thập'}</td>
                  <td>{f.new_article_count}</td>
                  <td>{f.error_message ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="status-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Luồng xử lý dữ liệu</h2>
            {badge(RUN_STATUS, run.status)}
          </div>
          <div className="table-sub">
            {run.status === 'running' ? 'Lần chạy hiện tại' : 'Lần chạy gần nhất'} bắt đầu lúc{' '}
            {formatTime(run.started_at)}
          </div>
          <ol className="steps">
            {run.steps.map((s) => (
              <li key={s.step}>
                <div>
                  <strong>{label(STEP_NAME, s.step)}</strong>
                  <div className="muted">{stepTime(s)}</div>
                </div>
                {badge(STEP_STATUS, s.status)}
              </li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <h2>Nhật ký gần đây</h2>
          <ul className="runs">
            {runs.slice(0, 5).map((r) => (
              <li key={r.run_id}>
                <div>
                  <strong>{formatDateTime(r.started_at)}</strong>
                  <div className="muted">{runSummary(r)}</div>
                </div>
                {badge(RUN_STATUS, r.status)}
              </li>
            ))}
          </ul>
          <div className="table-sub">
            Lần chạy gần nhất: {formatTime(run.started_at)}
            {run.status === 'running' && ' (đang chạy)'} · Lần hoàn thành gần nhất: {runSpan(done)}
          </div>
        </section>
      </div>
    </>
  )
}
