import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Clock,
  Calendar as CalIcon, Plus, ArrowRight,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay,
  isToday, addDays, getDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { patientsApi, sessionsApi } from '@/api'

// ── Types ─────────────────────────────────────────────────────────────────────
interface CalendarSession {
  id: string
  patientId: string
  patientName: string
  sessionDate: string
  sessionTime?: string
  sessionNumber: number
  durationMin: number
  mood?: number
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const PATIENT_COLORS = [
  { bg: 'bg-accent/15',  text: 'text-accent',  dot: 'bg-accent'  },
  { bg: 'bg-gold/15',   text: 'text-gold',   dot: 'bg-gold'   },
  { bg: 'bg-purple/15', text: 'text-purple', dot: 'bg-purple' },
  { bg: 'bg-error/15',  text: 'text-error',  dot: 'bg-error'  },
  { bg: 'bg-info/15',   text: 'text-info',   dot: 'bg-info'   },
  { bg: 'bg-blush/15',  text: 'text-blush',  dot: 'bg-blush'  },
]

function getPatientColor(name: string) {
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % PATIENT_COLORS.length
  return PATIENT_COLORS[idx]
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const navigate = useNavigate()

  const { data: patientsData } = useQuery({
    queryKey: ['patients', 'schedule'],
    queryFn: () => patientsApi.list({ pageSize: 200 }),
  })

  const patientIds = patientsData?.items.map(p => p.id) ?? []
  const patientMap = useMemo(() => {
    const map = new Map<string, string>()
    patientsData?.items.forEach(p => map.set(p.id, p.fullName))
    return map
  }, [patientsData])

  const { data: allSessions } = useQuery({
    queryKey: ['sessions', 'all', patientIds.join(',')],
    queryFn: async () => {
      if (!patientIds.length) return []
      const results = await Promise.all(
        patientIds.map(async id => {
          try {
            const data = await sessionsApi.listByPatient(id, 1)
            return data.items.map((s: any) => ({
              ...s,
              patientId: id,
              patientName: patientMap.get(id) ?? 'Paciente',
            }))
          } catch {
            return []
          }
        })
      )
      return results.flat() as CalendarSession[]
    },
    enabled: patientIds.length > 0,
  })

  // Calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, CalendarSession[]>()
    allSessions?.forEach(s => {
      const key = s.sessionDate
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    })
    return map
  }, [allSessions])

  const selectedDaySessions = useMemo(() => {
    if (!selectedDay) return []
    const key = format(selectedDay, 'yyyy-MM-dd')
    return (sessionsByDate.get(key) ?? []).sort((a, b) =>
      (a.sessionTime ?? '00:00').localeCompare(b.sessionTime ?? '00:00')
    )
  }, [selectedDay, sessionsByDate])

  const totalThisMonth = useMemo(() => {
    let count = 0
    sessionsByDate.forEach((sessions, dateStr) => {
      const d = new Date(dateStr + 'T12:00:00')
      if (isSameMonth(d, currentMonth)) count += sessions.length
    })
    return count
  }, [sessionsByDate, currentMonth])

  const upcomingSessions = useMemo(() => {
    const today = new Date()
    const upcoming: CalendarSession[] = []
    for (let i = 0; i < 7; i++) {
      const day = addDays(today, i)
      const key = format(day, 'yyyy-MM-dd')
      const sessions = sessionsByDate.get(key) ?? []
      upcoming.push(...sessions)
    }
    return upcoming.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))
  }, [sessionsByDate])

  return (
    <div className="page-enter flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl italic text-fg/90">Agenda</h2>
          <p className="text-sm text-muted mt-1">
            {totalThisMonth} {totalThisMonth === 1 ? 'sessão' : 'sessões'} em{' '}
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>
        <button
          onClick={() => navigate('/pacientes')}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg font-semibold text-sm px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/10"
        >
          <Plus size={16} /> Nova Sessão
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Calendar Grid */}
        <div className="bg-card-alt border border-border rounded-2xl overflow-hidden">
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-10 h-10 rounded-xl bg-border/40 hover:bg-border/70 flex items-center justify-center text-muted hover:text-fg transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h3 className="font-serif text-xl font-light text-fg capitalize">
                {format(currentMonth, 'MMMM', { locale: ptBR })}
              </h3>
              <p className="text-xs text-muted font-medium mt-0.5">
                {format(currentMonth, 'yyyy')}
              </p>
            </div>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-10 h-10 rounded-xl bg-border/40 hover:bg-border/70 flex items-center justify-center text-muted hover:text-fg transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map(day => (
              <div key={day} className="py-3 text-center text-[11px] font-semibold tracking-widest uppercase text-subtle">
                {day}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const daySessions = sessionsByDate.get(dateKey) ?? []
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
              const todayDay = isToday(day)
              const isWeekend = getDay(day) === 0 || getDay(day) === 6

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(day)}
                  className={[
                    'relative min-h-[100px] p-2 border-b border-r border-border/40 text-left transition-all group',
                    isCurrentMonth ? '' : 'opacity-30',
                    isSelected ? 'bg-accent/[0.06] ring-1 ring-inset ring-accent/30' : 'hover:bg-fg/[0.02]',
                    isWeekend && isCurrentMonth ? 'bg-input-bg/50' : '',
                  ].join(' ')}
                >
                  <span className={[
                    'inline-flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-medium',
                    todayDay
                      ? 'bg-accent text-bg font-semibold'
                      : isSelected
                        ? 'text-accent'
                        : 'text-muted group-hover:text-fg',
                  ].join(' ')}>
                    {format(day, 'd')}
                  </span>

                  <div className="mt-1 flex flex-col gap-[3px]">
                    {daySessions.slice(0, 3).map(s => {
                      const color = getPatientColor(s.patientName)
                      return (
                        <div
                          key={s.id}
                          className={`${color.bg} ${color.text} rounded-md px-1.5 py-[2px] text-[10px] font-medium truncate leading-tight`}
                        >
                          {s.sessionTime && (
                            <span className="opacity-70">{s.sessionTime.slice(0, 5)} </span>
                          )}
                          {s.patientName.split(' ')[0]}
                        </div>
                      )
                    })}
                    {daySessions.length > 3 && (
                      <span className="text-[10px] text-muted font-medium pl-1">
                        +{daySessions.length - 3} mais
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-5">
          {/* Selected Day Detail */}
          <div className="bg-card-alt border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <CalIcon size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-fg capitalize">
                  {selectedDay
                    ? format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })
                    : 'Selecione um dia'}
                </p>
                <p className="text-xs text-muted">
                  {selectedDaySessions.length}{' '}
                  {selectedDaySessions.length === 1 ? 'sessão agendada' : 'sessões agendadas'}
                </p>
              </div>
            </div>

            <div className="p-4">
              {selectedDaySessions.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-border/40 flex items-center justify-center mx-auto mb-3">
                    <CalIcon size={20} className="text-subtle" />
                  </div>
                  <p className="text-sm text-subtle">Nenhuma sessão neste dia</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedDaySessions.map(s => {
                    const color = getPatientColor(s.patientName)
                    return (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/pacientes/${s.patientId}`)}
                        className="flex items-start gap-3 p-3 rounded-xl bg-input-bg border border-border hover:border-accent/30 transition-all group text-left"
                      >
                        <div className={`w-1 self-stretch rounded-full ${color.dot} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-fg group-hover:text-accent transition-colors truncate">
                            {s.patientName}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted">
                            {s.sessionTime && (
                              <span className="flex items-center gap-1">
                                <Clock size={10} /> {s.sessionTime.slice(0, 5)}
                              </span>
                            )}
                            <span>Sessão #{s.sessionNumber}</span>
                            <span>{s.durationMin}min</span>
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-subtle group-hover:text-accent mt-1 flex-shrink-0 transition-colors" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="bg-card-alt border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-serif text-lg italic text-fg/90">Próximas sessões</h3>
              <p className="text-xs text-muted mt-0.5">Nos próximos 7 dias</p>
            </div>
            <div className="p-4">
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-subtle text-center py-6">Nenhuma sessão agendada</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcomingSessions.slice(0, 6).map(s => {
                    const color = getPatientColor(s.patientName)
                    const date = new Date(s.sessionDate + 'T12:00:00')
                    return (
                      <div key={s.id} className="flex items-center gap-3 py-2">
                        <div className={`w-2 h-2 rounded-full ${color.dot} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-fg truncate">{s.patientName}</p>
                          <p className="text-[11px] text-muted">
                            {format(date, "EEE, d 'de' MMM", { locale: ptBR })}
                            {s.sessionTime ? ` · ${s.sessionTime.slice(0, 5)}` : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card-alt border border-border rounded-2xl p-4 text-center">
              <p className="font-serif text-2xl font-light text-accent">{totalThisMonth}</p>
              <p className="text-[11px] text-muted font-medium mt-1">Este mês</p>
            </div>
            <div className="bg-card-alt border border-border rounded-2xl p-4 text-center">
              <p className="font-serif text-2xl font-light text-gold">{upcomingSessions.length}</p>
              <p className="text-[11px] text-muted font-medium mt-1">Próx. 7 dias</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
