import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText,
  Calendar, Settings, LogOut, X,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface Props { open: boolean; onClose: () => void }

// Sidebar — usado apenas em mobile (< lg).
// No desktop, a navegação fica na TopNav.
export default function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAuthStore()

  const initials = user?.fullName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('') ?? '?'

  return (
    <aside
      className={[
        'fixed top-0 left-0 bottom-0 z-[200] w-[270px]',
        'bg-card border-r border-border',
        'flex flex-col transition-transform duration-300 ease-out',
        // Só aparece quando open=true — nunca fixo no desktop (TopNav cuida disso)
        open ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      {/* Header */}
      <div className="px-5 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-gold flex items-center justify-center flex-shrink-0">
            <span className="font-serif text-xs font-bold text-bg">P</span>
          </div>
          <div>
            <p className="font-serif text-[20px] font-light leading-none text-fg">
              Psi<span className="text-accent">Decot</span>
            </p>
            <p className="text-[9px] font-semibold tracking-[0.16em] uppercase text-muted mt-0.5">
              Gestão Clínica
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted hover:text-fg p-1.5 rounded-lg hover:bg-fg/5 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <SectionLabel>Principal</SectionLabel>
        <NavItem to="/" icon={LayoutDashboard} label="Visão Geral" end onClick={onClose} />

        <SectionLabel className="mt-5">Clínica</SectionLabel>
        <NavItem to="/pacientes"   icon={Users}     label="Pacientes"    onClick={onClose} />
        <NavItem to="/prontuarios" icon={FileText}   label="Prontuários"  onClick={onClose} />
        <NavItem to="/agenda"      icon={Calendar}   label="Agenda"       onClick={onClose} />

        <SectionLabel className="mt-5">Sistema</SectionLabel>
        <NavItem to="/configuracoes" icon={Settings} label="Configurações" onClick={onClose} />
      </nav>

      {/* Footer user */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-gold flex items-center justify-center font-serif text-sm font-semibold text-bg flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-fg truncate">{user?.fullName}</p>
            <p className="text-[11px] text-muted truncate">CRP {user?.crp}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-all"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`px-5 pb-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase text-subtle ${className}`}>
      {children}
    </p>
  )
}

function NavItem({ to, icon: Icon, label, end, onClick }: {
  to: string; icon: any; label: string; end?: boolean; onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => [
        'flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm transition-all',
        'select-none cursor-pointer',
        isActive
          ? 'text-accent bg-accent/10 font-medium'
          : 'text-muted hover:text-fg hover:bg-fg/[0.04]',
      ].join(' ')}
    >
      {({ isActive }) => (
        <>
          <Icon size={17} className={isActive ? 'text-accent' : ''} />
          <span className="flex-1">{label}</span>
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
        </>
      )}
    </NavLink>
  )
}
