import { NavLink, Outlet } from 'react-router-dom'
import TopBar from './components/TopBar'

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
      <div className="main">
        <TopBar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
