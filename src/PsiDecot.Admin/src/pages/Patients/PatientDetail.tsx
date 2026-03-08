import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, Plus, ChevronDown, Pill,
  Paperclip, Upload, Calendar, Clock, Brain,
  Phone, Mail, MapPin, AlertCircle, User,
} from 'lucide-react'
import { patientsApi, sessionsApi, documentsApi } from '@/api'
import { MOOD_LABELS, type PatientMood, type CreateSessionPayload } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Modal from '@/components/UI/Modal'
import Badge from '@/components/UI/Badge'
import { useForm } from 'react-hook-form'

const inputCls = 'w-full bg-input-bg border border-border rounded-xl px-4 py-3 text-sm text-fg placeholder-subtle outline-none focus:border-accent focus-ring transition-all'

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sessionModal, setSessionModal] = useState(false)
  const [tab, setTab] = useState<'sessions' | 'meds' | 'docs'>('sessions')

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientsApi.getById(id!),
    enabled: !!id,
  })

  if (isLoading) return (
    <div className="flex flex-col gap-5 max-w-4xl page-enter">
      <div className="skeleton h-5 w-24" />
      <div className="bg-card-alt border border-border rounded-2xl p-6">
        <div className="flex gap-5">
          <div className="skeleton w-16 h-16 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-4 w-64" />
          </div>
        </div>
      </div>
    </div>
  )

  if (!patient) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 rounded-full bg-border/40 flex items-center justify-center">
        <User size={24} className="text-subtle" />
      </div>
      <p className="text-subtle">Paciente não encontrado.</p>
      <button onClick={() => navigate('/pacientes')} className="text-sm text-accent hover:underline">
        Voltar para pacientes
      </button>
    </div>
  )

  const initials = patient.fullName.split(' ').slice(0, 2).map(n => n[0]).join('')

  return (
    <div className="page-enter flex flex-col gap-5 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate('/pacientes')}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors w-fit group"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Pacientes
      </button>

      {/* Header card */}
      <div className="bg-card-alt border border-border rounded-2xl overflow-hidden">
        {/* Top section */}
        <div className="p-6 flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center font-serif text-2xl font-semibold text-bg flex-shrink-0 ring-4 ring-accent/10">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-serif text-2xl font-light text-fg">{patient.fullName}</h2>
              <Badge active={patient.isActive} />
            </div>

            {/* Contact info grid */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
              {patient.cpf && <InfoChip icon={<User size={12} />} label="CPF" value={patient.cpf} />}
              <InfoChip icon={<Phone size={12} />} label="Tel" value={patient.phone} />
              {patient.email && <InfoChip icon={<Mail size={12} />} label="E-mail" value={patient.email} />}
              {patient.dateOfBirth && <InfoChip icon={<Calendar size={12} />} label="Nasc." value={patient.dateOfBirth} />}
              {patient.address && <InfoChip icon={<MapPin size={12} />} label="End." value={patient.address} />}
            </div>
          </div>
          <button
            onClick={() => setSessionModal(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg font-semibold text-sm px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/10 flex-shrink-0"
          >
            <Plus size={15} /> Nova Sessão
          </button>
        </div>

        {/* Clinical info */}
        {patient.chiefComplaint && (
          <div className="px-6 pb-5">
            <div className="bg-input-bg rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={13} className="text-gold" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">Queixa Principal</p>
              </div>
              <p className="text-sm text-muted leading-relaxed">{patient.chiefComplaint}</p>
            </div>
          </div>
        )}

        {/* Quick stats bar */}
        <div className="px-6 py-3 border-t border-border flex items-center gap-6 text-xs text-muted bg-input-bg/50">
          <span><strong className="text-fg font-medium">{patient.sessions.length}</strong> sessões</span>
          <span><strong className="text-fg font-medium">{patient.medications.length}</strong> medicamentos</span>
          <span><strong className="text-fg font-medium">{patient.documents.length}</strong> documentos</span>
          <span className="ml-auto text-[11px]">
            Desde {new Date(patient.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card-alt border border-border rounded-2xl p-1.5 w-fit">
        {([
          ['sessions', `Sessões (${patient.sessions.length})`, Calendar],
          ['meds', `Medicamentos (${patient.medications.length})`, Pill],
          ['docs', `Documentos (${patient.documents.length})`, Paperclip],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
              tab === key
                ? 'bg-accent/12 text-accent shadow-sm'
                : 'text-muted hover:text-fg hover:bg-fg/[0.03]',
            ].join(' ')}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Sessions */}
      {tab === 'sessions' && (
        <div className="flex flex-col gap-3">
          {patient.sessions.length === 0 ? (
            <EmptyState
              icon={<Calendar size={24} />}
              text="Nenhuma sessão registrada ainda."
              action={
                <button onClick={() => setSessionModal(true)} className="text-sm text-accent hover:text-accent-hover font-medium mt-2">
                  + Registrar primeira sessão
                </button>
              }
            />
          ) : patient.sessions.map(s => (
            <SessionCard key={s.id} session={s} patientId={patient.id} />
          ))}
        </div>
      )}

      {/* Medications */}
      {tab === 'meds' && (
        <div className="bg-card-alt border border-border rounded-2xl overflow-hidden">
          {patient.medications.length === 0 ? (
            <EmptyState icon={<Pill size={24} />} text="Nenhum medicamento registrado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Medicamento', 'Dose', 'Frequência', 'Prescritor', 'Status'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-subtle">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patient.medications.map(m => (
                    <tr key={m.id} className="border-b border-border/30 last:border-0 hover:bg-fg/[0.015] transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-fg">{m.name}</td>
                      <td className="px-5 py-3.5 text-sm text-muted">{m.dosage ?? '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-muted">{m.frequency ?? '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-muted">{m.prescriber ?? '—'}</td>
                      <td className="px-5 py-3.5"><Badge active={m.isActive} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Documents */}
      {tab === 'docs' && (
        <DocsTab patientId={patient.id} docs={patient.documents} />
      )}

      {/* Session Modal */}
      <SessionModal
        open={sessionModal}
        onClose={() => setSessionModal(false)}
        patientId={patient.id}
        nextNumber={patient.sessions.length + 1}
      />
    </div>
  )
}

// ── Info Chip ─────────────────────────────────────────────────────────────────
function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span className="text-subtle">{icon}</span>
      <strong className="text-fg/60 font-medium">{label}</strong>
      <span>{value}</span>
    </span>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ icon, text, action }: { icon: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="bg-card-alt border border-border rounded-2xl py-16 flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-full bg-border/40 flex items-center justify-center text-subtle">
        {icon}
      </div>
      <p className="text-sm text-subtle">{text}</p>
      {action}
    </div>
  )
}

// ── Session Card (accordion) ──────────────────────────────────────────────────
function SessionCard({ session: s }: { session: any; patientId: string }) {
  const [open, setOpen] = useState(false)
  const { data: detail } = useQuery({
    queryKey: ['session', s.id],
    queryFn: () => sessionsApi.getById(s.id),
    enabled: open,
  })

  const date = new Date(s.sessionDate + 'T12:00:00')
  const dateStr = format(date, "d 'de' MMMM, yyyy", { locale: ptBR })

  const moodColors: Record<number, string> = {
    1: 'bg-error/15 text-error',
    2: 'bg-gold/15 text-gold',
    3: 'bg-muted/15 text-muted',
    4: 'bg-accent/15 text-accent',
    5: 'bg-accent/20 text-accent',
  }

  return (
    <div className="bg-card-alt border border-border rounded-2xl overflow-hidden card-hover">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left group"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Calendar size={16} className="text-accent" />
          </div>
          <div>
            <p className="font-serif text-base text-fg">{dateStr}</p>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted">
              <span>Sessão #{s.sessionNumber}</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {s.durationMin} min</span>
              {s.mood && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${moodColors[s.mood] ?? ''}`}>
                  {MOOD_LABELS[s.mood as PatientMood]}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <ChevronDown size={16} className="text-muted" />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border animate-[fadeIn_.2s_ease-out]">
          {detail ? (
            <>
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={13} className="text-accent" />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Relato da Sessão</p>
                </div>
                <p className="text-sm text-muted leading-relaxed">{detail.notes}</p>
              </div>
              {detail.plan && (
                <div className="mt-4 bg-accent/[0.06] rounded-xl px-4 py-3 border border-accent/15">
                  <p className="text-[11px] font-semibold text-accent mb-1.5 uppercase tracking-wider">Plano / Tarefas</p>
                  <p className="text-sm text-fg/70 leading-relaxed">{detail.plan}</p>
                </div>
              )}
              {detail.documents.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Anexos</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.documents.map((d: any) => (
                      <button key={d.id} className="flex items-center gap-2 text-xs text-accent hover:text-accent-hover bg-accent/8 px-3 py-1.5 rounded-lg transition-colors">
                        <Paperclip size={11} />{d.fileName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-sm text-subtle">
              <div className="w-4 h-4 border-2 border-subtle border-t-transparent rounded-full animate-spin" />
              Carregando...
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Docs Tab ──────────────────────────────────────────────────────────────────
function DocsTab({ patientId, docs }: { patientId: string; docs: any[] }) {
  const qc = useQueryClient()
  const upload = useMutation({
    mutationFn: ({ file }: { file: File }) => documentsApi.uploadToPatient(patientId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient', patientId] }),
  })

  return (
    <div className="bg-card-alt border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
            <Paperclip size={15} className="text-gold" />
          </div>
          <p className="font-serif italic text-lg text-fg/90">Documentos</p>
        </div>
        <label className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg font-semibold text-sm px-4 py-2.5 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5">
          <Upload size={14} /> Upload
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={e => e.target.files?.[0] && upload.mutate({ file: e.target.files[0] })}
          />
        </label>
      </div>
      {docs.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-full bg-border/40 flex items-center justify-center mx-auto mb-3">
            <Paperclip size={20} className="text-subtle" />
          </div>
          <p className="text-sm text-subtle">Nenhum documento anexado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {docs.map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 p-3.5 bg-input-bg rounded-xl border border-border hover:border-accent/25 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Paperclip size={14} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-fg truncate group-hover:text-accent transition-colors">{d.fileName}</p>
                <p className="text-[11px] text-muted">{(d.fileSizeBytes / 1024).toFixed(0)} KB</p>
              </div>
              <button
                onClick={() => documentsApi.download(d.id, d.fileName)}
                className="text-xs text-accent hover:text-accent-hover font-medium px-3 py-1.5 rounded-lg hover:bg-accent/10 transition-all"
              >
                Baixar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Session Modal ─────────────────────────────────────────────────────────────
function SessionModal({ open, onClose, patientId, nextNumber }: {
  open: boolean; onClose: () => void; patientId: string; nextNumber: number
}) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: CreateSessionPayload) => sessionsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patient', patientId] }); onClose() },
  })
  const { register, handleSubmit, reset } = useForm<any>()

  const onSubmit = (data: any) => mutation.mutate({
    ...data,
    patientId,
    durationMin: Number(data.durationMin),
    mood: data.mood ? Number(data.mood) : undefined,
  })

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title={`Nova Sessão #${nextNumber}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">Data *</label>
            <input {...register('sessionDate', { required: true })} type="date" className={inputCls} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">Duração</label>
            <select {...register('durationMin')} className={inputCls}>
              <option value={50}>50 min</option>
              <option value={60}>60 min</option>
              <option value={80}>80 min</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">Relato da sessão *</label>
          <textarea {...register('notes', { required: true })} rows={5} placeholder="Descreva os principais pontos trabalhados..." className={inputCls + ' resize-none'} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">Plano / Próxima sessão</label>
          <textarea {...register('plan')} rows={2} placeholder="Tarefas de casa, pontos a retomar..." className={inputCls + ' resize-none'} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">Humor do paciente</label>
          <select {...register('mood')} className={inputCls}>
            <option value="">Não informado</option>
            {([1, 2, 3, 4, 5] as PatientMood[]).map(m => (
              <option key={m} value={m}>{MOOD_LABELS[m]}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <button type="button" onClick={() => { onClose(); reset() }}
            className="border border-border text-muted hover:text-fg hover:border-accent/50 text-sm px-5 py-2.5 rounded-xl transition-all">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="bg-accent hover:bg-accent-hover text-bg font-semibold text-sm px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 hover:-translate-y-0.5">
            {mutation.isPending ? 'Salvando...' : 'Salvar Sessão'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
