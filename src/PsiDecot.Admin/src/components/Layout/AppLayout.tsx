import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopNav  from './TopNav'
import Sidebar from './Sidebar'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-bg">

      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="blob-1 absolute -top-32 -right-32 w-[640px] h-[640px] bg-accent opacity-[0.04]" />
        <div className="blob-2 absolute -bottom-32 -left-32 w-[520px] h-[520px] bg-gold opacity-[0.03]" />
      </div>

      {/* Top nav — desktop: logo + nav items + user | mobile: logo + hamburger */}
      <TopNav onMenuClick={() => setSidebarOpen(true)} />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-sm lg:hidden animate-[fadeIn_.2s_ease-out]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content — offset by h-14 (top nav height) */}
      <main className="relative z-10 pt-14">
        <div className="px-5 py-6 lg:px-8 lg:py-8 max-w-[1280px] mx-auto">
          <Outlet />
        </div>
      </main>

    </div>
  )
}
