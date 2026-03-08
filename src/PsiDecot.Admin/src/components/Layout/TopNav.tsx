import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText,
  Calendar, Settings, LogOut, Menu,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface Props { onMenuClick: () => void }

type NavItem = { to: string; icon: React.ElementType; label: string; end?: boolean }

const NAV_ITEMS: NavItem[] = [
  { to: '/',            icon: LayoutDashboard, label: 'Visão Geral', end: true },
  { to: '/pacientes',   icon: Users,           label: 'Pacientes'             },
  { to: '/prontuarios', icon: FileText,        label: 'Prontuários'           },
  { to: '/agenda',      icon: Calendar,        label: 'Agenda'                },
]

export default function TopNav({ onMenuClick }: Props) {
  const { user, logout } = useAuthStore()
  const initials = user?.fullName.split(' ').slice(0, 2).map(n => n[0]).join('') ?? '?'

  return (
    <header className="fixed top-0 inset-x-0 z-[100] h-14 bg-card/90 backdrop-blur-xl border-b border-border">
      <div className="h-full flex items-center px-4 lg:px-6">

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 flex-shrink-0 lg:pr-5 lg:mr-2 lg:border-r lg:border-border">
          {/* Small icon mark */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-gold flex items-center justify-center flex-shrink-0">
            <span className="font-serif text-[11px] font-bold text-bg leading-none">P</span>
          </div>
          <span className="font-serif text-[18px] font-light leading-none hidden sm:block">
            Psi<span className="text-accent">Decot</span>
          </span>
        </div>

        {/* ── Desktop nav ───────────────────────────────────────────────── */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 px-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => [
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all whitespace-nowrap',
                isActive
                  ? 'bg-accent/[0.12] text-accent'
                  : 'text-muted hover:text-fg hover:bg-fg/[0.04]',
              ].join(' ')}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} className={isActive ? 'text-accent' : ''} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Spacer on mobile ──────────────────────────────────────────── */}
        <div className="flex-1 lg:hidden" />

        {/* ── Right side ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1">

          {/* Settings icon — desktop */}
          <NavLink
            to="/configuracoes"
            className={({ isActive }) => [
              'hidden lg:flex items-center justify-center w-9 h-9 rounded-xl transition-all',
              isActive
                ? 'bg-accent/[0.12] text-accent'
                : 'text-muted hover:text-fg hover:bg-fg/[0.04]',
            ].join(' ')}
            title="Configurações"
          >
            <Settings size={16} />
          </NavLink>

          {/* Vertical divider — desktop */}
          <div className="hidden lg:block w-px h-5 bg-border mx-2" />

          {/* User info block — desktop */}
          <div className="hidden lg:flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-gold flex items-center justify-center font-serif text-[11px] font-bold text-bg flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-[12px] font-medium text-fg max-w-[120px] truncate">
                {user?.fullName}
              </p>
              <p className="text-[10px] text-muted">CRP {user?.crp}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-all"
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="lg:hidden p-2 rounded-xl text-muted hover:text-fg hover:bg-fg/5 transition-colors"
            onClick={onMenuClick}
          >
            <Menu size={20} />
          </button>
        </div>

      </div>
    </header>
  )
}
