import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Users, CalendarDays, FileText, UserX,
  TrendingUp, ArrowRight, Clock,
} from 'lucide-react'
import { patientsApi, sessionsApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import type { DashboardSession } from '@/types'

const ACCENT_COLORS = ['bg-accent', 'bg-gold', 'bg-purple', 'bg-info', 'bg-blush']

function sessionColor(idx: number) {
  return ACCENT_COLORS[idx % ACCENT_COLORS.length]
}

function formatTime(t?: string) {
  if (!t) return '--:--'
  return t.substring(0, 5)
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const { data: patients, isLoading: loadingPatients } = useQuery({
    queryKey: ['patients', 'all'],
    queryFn: () => patientsApi.list({ pageSize: 100 }),
  })

  const { data: todaySessions, isLoading: loadingToday } = useQuery({
    queryKey: ['sessions', 'today', todayStr],
    queryFn: () => sessionsApi.listAll({ date: todayStr, pageSize: 20 }),
  })

  const { data: upcomingSessions } = useQuery({
    queryKey: ['sessions', 'upcoming'],
    queryFn: () => sessionsApi.listAll({ upcoming: true, pageSize: 1 }),
  })

  const total        = patients?.total ?? 0
  const active       = patients?.items.filter(p => p.isActive).length ?? 0
  const inactive     = total - active
  const totalSessions = patients?.items.reduce((s, p) => s + p.sessionCount, 0) ?? 0

  const stats = [
    { label: 'Pacientes Ativos', value: active,        icon: Users,       color: 'accent' as const },
    { label: 'Total de Sessões', value: totalSessions,  icon: FileText,    color: 'accent' as const },
    { label: 'Hoje na agenda',   value: todaySessions?.total ?? 0, icon: CalendarDays, color: 'gold' as const },
    { label: 'Inativos',         value: inactive,       icon: UserX,       color: 'red' as const },
  ]

  const colorMap = {
    accent: { bg: 'bg-accent/10', text: 'text-accent', ring: 'ring-accent/20' },
    gold:   { bg: 'bg-gold/10',   text: 'text-gold',   ring: 'ring-gold/20' },
    red:    { bg: 'bg-error/10',  text: 'text-error',  ring: 'ring-error/20' },
  }

  const firstName = user?.fullName?.split(' ')[0] ?? ''

  const recentPatients = patients?.items
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5) ?? []

  const nextSession: DashboardSession | undefined = upcomingSessions?.items[0]
  const isLoading = loadingPatients || loadingToday

  return (
    <div className="page-enter flex flex-col gap-6">
      {/* Greeting */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-[28px] font-light text-fg">
            Olá, <span className="text-accent italic">{firstName}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Aqui está o resumo da sua clínica
          </p>
        </div>
        <button
          onClick={() => navigate('/agenda')}
          className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
        >
          <CalendarDays size={16} /> Ver agenda completa <ArrowRight size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
          const c = colorMap[s.color]
          return (
            <div
              key={s.label}
              className="bg-card-alt border border-border rounded-2xl p-5 card-hover group"
            >
              <div className={`w-10 h-10 rounded-xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                <s.icon size={18} className={c.text} />
              </div>
              <p className="font-serif text-[34px] font-light text-fg leading-none">
                {isLoading ? <span className="skeleton inline-block w-12 h-8" /> : s.value}
              </p>
              <p className="text-[12px] text-muted font-medium mt-2 tracking-wide">
                {s.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Agenda hoje */}
        <div className="bg-card-alt border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                <Clock size={16} className="text-accent" />
              </div>
              <div>
                <h2 className="font-serif text-lg italic text-fg/90">Agenda de hoje</h2>
                {nextSession && nextSession.sessionDate !== todayStr && (
                  <p className="text-[11px] text-muted">
                    Próximo: {nextSession.patientName} em {format(new Date(nextSession.sessionDate + 'T00:00:00'), 'dd/MM')}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/agenda')}
              className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors"
            >
              Ver tudo <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-4">
            {loadingToday ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-3 py-3">
                  <div className="skeleton w-1 h-10 rounded-full flex-shrink-0" />
                  <div className="skeleton w-12 h-4" />
                  <div className="flex-1">
                    <div className="skeleton h-4 w-32 mb-1" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                </div>
              ))
            ) : todaySessions?.items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-12 h-12 rounded-full bg-border/40 flex items-center justify-center">
                  <CalendarDays size={20} className="text-subtle" />
                </div>
                <p className="text-sm text-subtle text-center">Hoje você não tem pacientes agendados</p>
              </div>
            ) : (
              todaySessions?.items.map((session, idx) => (
                <div
                  key={session.id}
                  className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-fg/[0.02] transition-colors group cursor-pointer"
                  onClick={() => navigate(`/pacientes/${session.patientId}`)}
                >
                  <div className={`w-1 h-10 rounded-full ${sessionColor(idx)} flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity`} />
                  <span className="font-serif text-[15px] text-accent min-w-[50px] font-light tabular-nums">
                    {formatTime(session.sessionTime)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-fg truncate">{session.patientName}</p>
                    <p className="text-[11px] text-muted">Sessão {session.sessionNumber} · {session.durationMin}min</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pacientes recentes */}
        <div className="bg-card-alt border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-gold" />
              </div>
              <h2 className="font-serif text-lg italic text-fg/90">Pacientes recentes</h2>
            </div>
            <button
              onClick={() => navigate('/pacientes')}
              className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors"
            >
              Ver todos <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-4">
            {recentPatients.length === 0 ? (
              <p className="text-sm text-subtle text-center py-8">Nenhum paciente cadastrado</p>
            ) : (
              recentPatients.map(p => {
                const initials = p.fullName.split(' ').slice(0, 2).map(n => n[0]).join('')
                const gradients = ['from-accent to-accent-hover', 'from-gold to-gold', 'from-purple to-purple']
                const grad = gradients[p.fullName.charCodeAt(0) % 3]
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/pacientes/${p.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-fg/[0.02] transition-colors group text-left"
                  >
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-serif text-[12px] font-semibold text-bg flex-shrink-0`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-fg truncate group-hover:text-accent transition-colors">{p.fullName}</p>
                      <p className="text-[11px] text-muted">{p.sessionCount} sessões</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isActive ? 'bg-accent' : 'bg-subtle'}`} />
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
