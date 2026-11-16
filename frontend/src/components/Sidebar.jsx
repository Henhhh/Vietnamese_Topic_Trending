import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const icon = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true }
const OverviewIcon = () => (
  <svg {...icon}>
    <path d="M3 3v18h18" />
    <path d="M7 15l4-5 3 3 5-7" />
  </svg>
)
const StatusIcon = () => (
  <svg {...icon}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </svg>
)

const SCORE_NOTE = 'Điểm xu hướng: Chỉ số tương đối 0–100 dựa trên lượng bài, mức tăng, độ mới và đa dạng nguồn.'

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <nav className={collapsed ? 'sidebar collapsed' : 'sidebar'} aria-label="Điều hướng chính">
      <div className="logo">{collapsed ? 'VT' : 'VietTrend'}</div>

      <div className="nav-group">
        <div className="nav-heading">KHÁM PHÁ</div>
        <NavLink to="/" end title="Tổng quan">
          <OverviewIcon />
          <span className="nav-text">Tổng quan</span>
        </NavLink>
        <NavLink to="/status" title="Trạng thái hệ thống">
          <StatusIcon />
          <span className="nav-text">Trạng thái hệ thống</span>
        </NavLink>
      </div>

      <div className="sidebar-note">{SCORE_NOTE}</div>
      <div className="sidebar-foot">ĐỒ ÁN PHÂN TÍCH TIN TỨC</div>

      <button
        type="button"
        className="collapse-btn"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        onClick={() => setCollapsed((c) => !c)}
      >
        {collapsed ? '»' : '« Thu gọn'}
      </button>
    </nav>
  )
}
