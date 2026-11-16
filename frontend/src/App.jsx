import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} close={() => setMenuOpen(false)} />
      <main className="main-shell">
        <TopBar openMenu={() => setMenuOpen(true)} />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
