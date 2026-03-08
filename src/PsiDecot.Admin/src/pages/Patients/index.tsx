import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, CircleX, CircleCheck, Search, UserPlus,
  Phone, Calendar, Activity,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { patientsApi } from '@/api'
import type { PatientSummary, CreatePatientPayload } from '@/types'
import Modal from '@/components/UI/Modal'
import Badge from '@/components/UI/Badge'

// ── CPF helpers ───────────────────────────────────────────────────────────────
function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

// ── Form schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  fullName:         z.string().min(3, 'Nome obrigatório'),
  cpf:              z.string().optional().refine(
    v => !v || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v),
    { message: 'CPF inválido (000.000.000-00)' }
  ),
  phone:            z.string().min(8, 'Telefone obrigatório'),
  email:            z.string().email('E-mail inválido').optional().or(z.literal('')),
  dateOfBirth:      z.string().optional(),
  gender:           z.string().optional(),
  maritalStatus:    z.string().optional(),
  address:          z.string().optional(),
  emergencyContact: z.string().optional(),
  chiefComplaint:   z.string().min(5, 'Descreva a queixa principal'),
  internalNotes:    z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ── Shared classes ────────────────────────────────────────────────────────────
const inputCls = 'w-full bg-input-bg border border-border rounded-xl px-4 py-3 text-sm text-fg placeholder-subtle outline-none focus:border-accent focus-ring transition-all'
const primaryBtn = 'flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg font-semibold text-sm px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/10 disabled:opacity-50 disabled:hover:translate-y-0'
const ghostBtn = 'border border-border text-muted hover:text-fg hover:border-accent/50 text-sm px-5 py-2.5 rounded-xl transition-all'

// ── Avatar color by name ──────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  'from-accent to-accent-hover',
  'from-gold to-gold',
  'from-purple to-purple',
  'from-info to-info',
  'from-blush to-blush',
]
function avatarGrad(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PatientsPage() {
  const [filter, setFilter] = useState<boolean | undefined>(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModal] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['patients', filter, search],
    queryFn: () => patientsApi.list({ active: filter, search: search || undefined }),
  })

  const toggleMutation = useMutation({
    mutationFn: patientsApi.toggleActive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })

  return (
    <div className="page-enter flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl italic text-fg/90">Pacientes</h2>
          <p className="text-sm text-muted mt-1">{data?.total ?? 0} pacientes cadastrados</p>
        </div>
        <button onClick={() => setModal(true)} className={primaryBtn}>
          <UserPlus size={16} /> Novo Paciente
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {([
            [undefined, 'Todos'],
            [true, 'Ativos'],
            [false, 'Inativos'],
          ] as const).map(([val, label]) => (
            <button
              key={String(val)}
              onClick={() => setFilter(val)}
              className={[
                'px-4 py-2 rounded-xl text-xs font-semibold border transition-all',
                filter === val
                  ? 'bg-accent/[0.12] border-accent/40 text-accent'
                  : 'bg-transparent border-border text-muted hover:text-fg hover:border-muted/30',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5 bg-input-bg border border-border rounded-xl px-4 py-2.5 min-w-[200px]">
          <Search size={14} className="text-subtle flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="bg-transparent border-none outline-none text-sm text-fg placeholder-subtle w-full"
          />
        </div>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card-alt border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-28 mb-2" />
                  <div className="skeleton h-3 w-20" />
                </div>
              </div>
              <div className="skeleton h-3 w-full mb-2" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="w-16 h-16 rounded-full bg-border/40 flex items-center justify-center">
            <Search size={24} className="text-subtle" />
          </div>
          <p className="text-sm text-subtle">Nenhum paciente encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.items.map(p => (
            <PatientCard
              key={p.id}
              patient={p}
              onView={() => navigate(`/pacientes/${p.id}`)}
              onToggle={() => toggleMutation.mutate(p.id)}
            />
          ))}
        </div>
      )}

      {/* Modal Cadastro */}
      <PatientModal open={modalOpen} onClose={() => setModal(false)} />
    </div>
  )
}

// ── Patient Card ──────────────────────────────────────────────────────────────
function PatientCard({ patient: p, onView, onToggle }: {
  patient: PatientSummary
  onView: () => void
  onToggle: () => void
}) {
  const initials = p.fullName.split(' ').slice(0, 2).map(n => n[0]).join('')
  const grad = avatarGrad(p.fullName)

  return (
    <div className="bg-card-alt border border-border rounded-2xl p-5 card-hover flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-serif text-[14px] font-semibold text-bg flex-shrink-0`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-fg text-sm truncate">{p.fullName}</p>
          {p.cpf ? (
            <p className="text-[11px] text-muted mt-0.5">{p.cpf}</p>
          ) : (
            <p className="text-[11px] text-subtle mt-0.5 italic">Sem CPF</p>
          )}
        </div>
        <Badge active={p.isActive} />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Phone size={12} className="text-subtle flex-shrink-0" />
          <span className="truncate">{p.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Activity size={12} className="text-subtle flex-shrink-0" />
          <span>{p.sessionCount} {p.sessionCount === 1 ? 'sessão' : 'sessões'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Calendar size={12} className="text-subtle flex-shrink-0" />
          <span>Desde {new Date(p.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
        >
          <FileText size={13} /> Prontuário
        </button>
        <button
          onClick={onToggle}
          className={[
            'flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-colors',
            p.isActive
              ? 'text-muted hover:text-error hover:bg-error/10'
              : 'text-muted hover:text-accent hover:bg-accent/10',
          ].join(' ')}
        >
          {p.isActive ? <CircleX size={13} /> : <CircleCheck size={13} />}
          {p.isActive ? 'Inativar' : 'Reativar'}
        </button>
      </div>
    </div>
  )
}

// ── Patient Modal ─────────────────────────────────────────────────────────────
function PatientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: CreatePatientPayload) => patientsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); onClose() },
  })

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: FormData) => mutation.mutate({
    ...data,
    cpf: data.cpf || undefined,
    email: data.email || undefined,
  } as CreatePatientPayload)

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Novo Paciente">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Personal info section */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-4 rounded-full bg-accent" />
          <p className="text-xs font-semibold tracking-wider uppercase text-muted">Dados Pessoais</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome completo *" error={errors.fullName?.message}>
            <input {...register('fullName')} placeholder="Nome completo" className={inputCls} />
          </Field>
          <Field label="Data de nascimento" error={errors.dateOfBirth?.message}>
            <input {...register('dateOfBirth')} type="date" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="CPF" error={errors.cpf?.message}>
            <input
              value={watch('cpf') ?? ''}
              onChange={e => setValue('cpf', formatCpf(e.target.value), { shouldValidate: true })}
              placeholder="000.000.000-00"
              className={inputCls}
            />
          </Field>
          <Field label="Telefone *" error={errors.phone?.message}>
            <input {...register('phone')} placeholder="(00) 00000-0000" className={inputCls} />
          </Field>
        </div>

        <Field label="E-mail" error={errors.email?.message}>
          <input {...register('email')} type="email" placeholder="email@paciente.com" className={inputCls} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Gênero">
            <select {...register('gender')} className={inputCls}>
              <option value="">Selecione</option>
              <option>Feminino</option><option>Masculino</option>
              <option>Não-binário</option><option>Prefiro não informar</option>
            </select>
          </Field>
          <Field label="Estado civil">
            <select {...register('maritalStatus')} className={inputCls}>
              <option value="">Selecione</option>
              <option>Solteiro(a)</option><option>Casado(a)</option>
              <option>Divorciado(a)</option><option>Viúvo(a)</option>
            </select>
          </Field>
        </div>

        <Field label="Endereço">
          <input {...register('address')} placeholder="Rua, número, bairro, cidade" className={inputCls} />
        </Field>
        <Field label="Contato de emergência">
          <input {...register('emergencyContact')} placeholder="Nome e telefone" className={inputCls} />
        </Field>

        {/* Clinical section */}
        <div className="flex items-center gap-2 mt-2 mb-1">
          <div className="w-1 h-4 rounded-full bg-gold" />
          <p className="text-xs font-semibold tracking-wider uppercase text-muted">Dados Clínicos</p>
        </div>

        <Field label="Queixa principal *" error={errors.chiefComplaint?.message}>
          <textarea {...register('chiefComplaint')} rows={3} placeholder="Motivo do atendimento..." className={inputCls + ' resize-none'} />
        </Field>
        <Field label="Observações internas">
          <textarea {...register('internalNotes')} rows={2} placeholder="Anotações privadas..." className={inputCls + ' resize-none'} />
        </Field>

        {mutation.isError && (
          <div className="bg-error/10 border border-error/25 rounded-xl px-4 py-3">
            <p className="text-xs text-error">Erro ao cadastrar. Verifique os dados e tente novamente.</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <button type="button" onClick={() => { onClose(); reset() }} className={ghostBtn}>
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? 'Salvando...' : 'Cadastrar Paciente'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Field({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted">{label}</label>
      {children}
      {error && <p className="text-[11px] text-error -mt-0.5">{error}</p>}
    </div>
  )
}
