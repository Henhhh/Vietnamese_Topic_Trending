import { NavLink, Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="app">
      <nav className="sidebar">
        <strong>VietTrend</strong>
        <NavLink to="/" end>
          Tổng quan
        </NavLink>
        <NavLink to="/status">Trạng thái hệ thống</NavLink>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
