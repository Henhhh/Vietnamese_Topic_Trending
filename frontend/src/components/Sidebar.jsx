import { NavLink } from 'react-router-dom'
import Icon from './Icon'

// Fixed on wide screens; below 820 px it becomes a drawer opened from the top bar.
export default function Sidebar({ open, close }) {
  return (
    <>
      {open && <button type="button" className="drawer-overlay" onClick={close} aria-label="Đóng trình đơn" />}
      <aside className={open ? 'sidebar drawer-open' : 'sidebar'}>
        <div className="side-top">
          <div className="logo">
            <span className="logo-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>VietTrend</span>
          </div>
          <button type="button" className="icon-button drawer-close" onClick={close} aria-label="Đóng trình đơn">
            <Icon name="close" />
          </button>
        </div>

        <nav aria-label="Điều hướng chính">
          <div className="nav-label">KHÁM PHÁ</div>
          <NavLink to="/" end className="nav-item" onClick={close}>
            <Icon name="grid" />
            <span>Tổng quan</span>
          </NavLink>
          <NavLink to="/status" className="nav-item" onClick={close}>
            <Icon name="activity" />
            <span>Trạng thái hệ thống</span>
          </NavLink>
        </nav>

        <div className="score-note">
          <div className="score-note-icon">
            <Icon name="trend" size={16} />
          </div>
          <div>
            <strong>Điểm xu hướng</strong>
            <p>Chỉ số tương đối 0–100 dựa trên lượng bài, mức tăng, độ mới và đa dạng nguồn.</p>
          </div>
        </div>
        <div className="university-tag">Đồ án phân tích tin tức</div>
      </aside>
    </>
  )
}
