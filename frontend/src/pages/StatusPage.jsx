import { useEffect, useState } from 'react'
import { getStatus } from '../api'
import Icon from '../components/Icon'
import Metric from '../components/Metric'
import PageIntro from '../components/PageIntro'
import StatusBadge from '../components/StatusBadge'
import { STEP_NAME, formatDateTime, formatDay, formatNumber, formatTime, label } from '../labels'

const STEP_ICON = { collect: 'database', nlp: 'file', cluster: 'grid', score: 'trend' }

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

function PipelineStep({ step }) {
  const done = step.status === 'completed'
  const cls = `pipeline-step${done ? ' done' : ''}${step.status === 'running' ? ' active' : ''}`
  return (
    <div className={cls}>
      <div className="pipeline-line" />
      <div className="pipeline-icon">
        <Icon name={done ? 'check' : STEP_ICON[step.step] ?? 'file'} size={17} />
      </div>
      <div className="pipeline-copy">
        <strong>{label(STEP_NAME, step.step)}</strong>
        <span>{stepTime(step)}</span>
      </div>
      <StatusBadge kind="step" status={step.status} />
    </div>
  )
}

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
        Không tải được dữ liệu.
        <button type="button" className="secondary-button" onClick={() => setAttempt((n) => n + 1)}>
          Thử lại
        </button>
      </p>
    )
  }
  if (!data) return <p className="state">Đang tải…</p>

  const { summary, warnings, feeds, latest_run: run, last_completed_run: done, recent_runs: runs } = data
  const okPct = Math.round((summary.feeds_ok / summary.feeds_total) * 100)
  const dupPct = (done.duplicate_count / (done.new_article_count + done.duplicate_count)) * 100
  // Runs from an earlier day show the date as well as the time.
  const runTime = (r) =>
    formatDay(r.started_at) === formatDay(run.started_at)
      ? formatTime(r.started_at)
      : `${formatDay(r.started_at)} ${formatTime(r.started_at)}`

  return (
    <>
      <PageIntro
        eyebrow="Trạng thái hệ thống"
        title="Theo dõi thu thập & xử lý"
        subtitle="Giám sát tình trạng nguồn tin và các bước xử lý dữ liệu gần nhất"
      />

      {warnings.map((w) => (
        <div className="stale-warning" role="alert" key={w.feed_id}>
          <Icon name="alert" size={18} />
          <div>
            <strong>
              Dữ liệu từ {w.source.name} ({w.category.name}) có thể đã cũ
            </strong>
            <span>
              Hiển thị kết quả khả dụng gần nhất từ {formatDateTime(w.last_success_at)}. Hệ thống sẽ tự thử lại ở lần
              chạy kế tiếp.
            </span>
          </div>
        </div>
      ))}

      <div className="metrics-grid four system-metrics">
        <Metric label="Feed hoạt động" value={`${summary.feeds_ok} / ${summary.feeds_total}`} helper={`${okPct}% tổng số feed`} />
        <Metric
          label="Feed gặp lỗi"
          value={summary.feeds_error}
          helper={summary.feeds_error > 0 ? 'Cần kiểm tra kết nối' : 'Không có lỗi'}
          alert={summary.feeds_error > 0}
        />
        <Metric
          label="Bài mới lần hoàn thành gần nhất"
          value={formatNumber(done.new_article_count)}
          helper={`Lúc ${formatDateTime(done.started_at)}`}
        />
        <Metric
          label="Bài trùng đã loại"
          value={formatNumber(done.duplicate_count)}
          helper={`${dupPct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% dữ liệu thu thập`}
        />
      </div>

      <section className="panel system-panel">
        <div className="section-heading">
          <div>
            <h2>Tình trạng nguồn tin</h2>
            <p>Cập nhật tự động mỗi 15 phút</p>
          </div>
          <span className="last-success">
            <Icon name="check" size={15} />
            {summary.feeds_ok} / {summary.feeds_total} feed đọc được ở lần chạy gần nhất
          </span>
        </div>
        <div className="desktop-table-wrap">
          <table className="source-table">
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
                  <td className="cell-name">
                    <strong>{f.source.name}</strong> <span className="muted">· {f.category.name}</span>
                  </td>
                  <td className="cell-url">
                    <span className="url-cell" title={f.rss_url}>
                      {f.rss_url}
                    </span>
                  </td>
                  <td className="cell-status">
                    <StatusBadge kind="feed" status={f.status} />
                  </td>
                  <td className="cell-time">{f.last_fetched_at ? formatDateTime(f.last_fetched_at) : 'Chưa thu thập'}</td>
                  <td className="cell-count">{f.new_article_count}</td>
                  <td
                    className={`cell-error${f.status === 'error' ? ' error-text' : ''}${f.error_message ? '' : ' is-empty'}`}
                  >
                    {f.error_message ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="system-lower-grid">
        <section className="panel pipeline-panel">
          <div className="section-heading">
            <div>
              <h2>Luồng xử lý dữ liệu</h2>
              <p>
                {run.status === 'running' ? 'Lần chạy hiện tại' : 'Lần chạy gần nhất'} bắt đầu lúc{' '}
                {formatTime(run.started_at)}
              </p>
            </div>
            <StatusBadge kind="run" status={run.status} />
          </div>
          <div className="pipeline">
            {run.steps.map((s) => (
              <PipelineStep key={s.step} step={s} />
            ))}
          </div>
        </section>

        <section className="panel runs-panel">
          <div className="section-heading">
            <div>
              <h2>Nhật ký gần đây</h2>
              <p>{Math.min(5, runs.length)} lần chạy mới nhất</p>
            </div>
          </div>
          {runs.slice(0, 5).map((r) => (
            <div className="run-row" key={r.run_id}>
              <time dateTime={r.started_at} title={formatDateTime(r.started_at)}>
                {runTime(r)}
              </time>
              <StatusBadge kind="run" status={r.status} />
              <span>{runSummary(r)}</span>
            </div>
          ))}
          <div className="attempt-note">
            <Icon name="info" size={15} />
            <span>
              Lần chạy gần nhất: <strong>{formatTime(run.started_at)}</strong>
              {run.status === 'running' && ' (đang chạy)'} · Lần hoàn thành gần nhất: <strong>{runSpan(done)}</strong>
            </span>
          </div>
        </section>
      </div>
    </>
  )
}
