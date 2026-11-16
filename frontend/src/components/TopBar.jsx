import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SAMPLE_MODE, getStatus } from '../api'
import { RUN_STATUS, formatDateTime, label } from '../labels'
import Icon from './Icon'

const Logo = () => (
  <div className="logo">
    <span className="logo-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
    <span>VietTrend</span>
  </div>
)

// One timestamp for the whole app: when the latest completed run collected its data.
// A run in progress does not change it; the pages keep showing the previous results.
export default function TopBar({ openMenu }) {
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
    <header className="app-header">
      <button type="button" className="icon-button menu-button" onClick={openMenu} aria-label="Mở trình đơn">
        <Icon name="menu" />
      </button>
      <div className="mobile-logo">
        <Logo />
      </div>
      <div className="update-state">
        {status ? (
          <>
            <span className={done.status === 'partial' ? 'status-dot is-partial' : 'status-dot'} />
            <span>Dữ liệu tính đến</span>
            <strong>{formatDateTime(status.data_as_of)}</strong>
            {done.status === 'partial' && <span className="muted">({label(RUN_STATUS, done.status).toLowerCase()})</span>}
            {status.latest_run.status === 'running' && <span className="muted">Đang cập nhật…</span>}
          </>
        ) : (
          <span className="muted">Chưa có dữ liệu cập nhật</span>
        )}
      </div>
      {SAMPLE_MODE && <div className="header-divider" />}
      {SAMPLE_MODE && (
        <div className="data-label">
          <Icon name="database" size={16} />
          <span>Dữ liệu minh họa</span>
        </div>
      )}
      {pathname === '/status' && <span className="header-system-label">Giám sát hệ thống</span>}
    </header>
  )
}
