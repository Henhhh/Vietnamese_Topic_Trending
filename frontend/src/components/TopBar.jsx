import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SAMPLE_MODE, getStatus } from '../api'
import { RUN_STATUS, formatDateTime, label } from '../labels'

// One timestamp for the whole app: when the latest completed run collected its data.
// A run in progress does not change it; the pages keep showing the previous results.
export default function TopBar() {
  const [status, setStatus] = useState(null)
  const { pathname } = useLocation()

  useEffect(() => {
    let stale = false
    getStatus()
      .then((s) => !stale && setStatus(s))
      .catch(() => !stale && setStatus(null))
    return () => {
      stale = true
    }
  }, [])

  const done = status?.last_completed_run
  return (
    <header className="topbar">
      <div className="topbar-main">
        {status ? (
          <>
            <span className={`dot dot-${done.status}`} aria-hidden="true" />
            <span>Dữ liệu tính đến {formatDateTime(status.data_as_of)}</span>
            {done.status === 'partial' && <span className="muted">({label(RUN_STATUS, done.status).toLowerCase()})</span>}
            {status.latest_run.status === 'running' && <span className="muted">Đang cập nhật…</span>}
          </>
        ) : (
          <span className="muted">Chưa có dữ liệu cập nhật</span>
        )}
      </div>
      <div className="topbar-badges">
        {SAMPLE_MODE && <span className="badge badge-sample">Dữ liệu minh họa</span>}
        {pathname === '/status' && <span className="badge badge-monitor">Giám sát hệ thống</span>}
      </div>
    </header>
  )
}
