import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, FileText, ArrowRight, Calendar } from 'lucide-react'
import { patientsApi } from '@/api'
import Badge from '@/components/UI/Badge'

const AVATAR_GRADIENTS = [
  'from-accent to-accent-hover',
  'from-gold to-gold',
  'from-purple to-purple',
]

export default function RecordsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['patients', true],
    queryFn: () => patientsApi.list({ active: true, pageSize: 50 }),
  })

  const filtered = data?.items.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (p.cpf ?? '').includes(search)
  ) ?? []

  return (
    <div className="page-enter flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-serif text-2xl italic text-fg/90">Prontuários</h2>
          <p className="text-sm text-muted mt-1">
            Selecione um paciente para acessar o prontuário completo.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-input-bg border border-border rounded-xl px-4 py-2.5 min-w-[240px]">
          <Search size={14} className="text-subtle flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            className="bg-transparent border-none outline-none text-sm text-fg placeholder-subtle w-full"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card-alt border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="skeleton w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-20" />
                </div>
              </div>
              <div className="skeleton h-3 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-border/40 flex items-center justify-center">
            <FileText size={24} className="text-subtle" />
          </div>
          <p className="text-sm text-subtle">
            {search ? 'Nenhum paciente encontrado para esta busca.' : 'Nenhum paciente ativo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const initials = p.fullName.split(' ').slice(0, 2).map(n => n[0]).join('')
            const grad = AVATAR_GRADIENTS[p.fullName.charCodeAt(0) % AVATAR_GRADIENTS.length]
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/pacientes/${p.id}`)}
                className="bg-card-alt border border-border rounded-2xl p-5 text-left card-hover group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center font-serif text-base font-semibold text-bg flex-shrink-0 ring-2 ring-transparent group-hover:ring-fg/10 transition-all`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate group-hover:text-accent transition-colors">
                      {p.fullName}
                    </p>
                    <Badge active={p.isActive} />
                  </div>
                  <ArrowRight size={14} className="text-subtle group-hover:text-accent flex-shrink-0 transition-all group-hover:translate-x-0.5" />
                </div>

                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <FileText size={11} className="text-subtle" />
                    <strong className="text-fg/70 font-medium">{p.sessionCount}</strong> sessões
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-subtle" />
                    Desde {new Date(p.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
