import { Menu, Bell } from 'lucide-react'
import { useLocation } from 'react-router-dom'

interface Props { onMenuClick: () => void }

const titleMap: Record<string, string> = {
  '/':              'Visão Geral',
  '/pacientes':     'Pacientes',
  '/prontuarios':   'Prontuários',
  '/agenda':        'Agenda',
  '/configuracoes': 'Configurações',
}

export default function Topbar({ onMenuClick }: Props) {
  const { pathname } = useLocation()
  const title = titleMap[pathname] ?? (pathname.startsWith('/pacientes/') ? 'Prontuário' : 'PsiDecot')

  return (
    <header className="h-16 bg-card/80 backdrop-blur-xl border-b border-border flex items-center px-4 lg:px-7 gap-4 sticky top-0 z-[100]">
      <button
        className="lg:hidden text-muted hover:text-fg p-2 rounded-xl hover:bg-fg/5 transition-colors"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </button>

      <h1 className="font-serif text-xl font-light italic text-fg/90 flex-1">
        {title}
      </h1>

      <button className="w-10 h-10 bg-card-alt border border-border rounded-xl flex items-center justify-center text-muted hover:text-fg hover:border-accent/40 transition-all relative">
        <Bell size={17} />
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
      </button>
    </header>
  )
}
