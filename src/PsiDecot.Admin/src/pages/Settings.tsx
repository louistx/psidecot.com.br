import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Shield, User, CheckCircle2, AlertCircle, Palette, Check } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api'
import { useThemeStore, THEMES } from '@/store/themeStore'

const inputCls = 'w-full bg-input-bg border border-border rounded-xl px-4 py-3 text-sm text-fg placeholder-subtle outline-none focus:border-accent focus-ring transition-all'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword: z.string().min(10, 'A nova senha deve ter pelo menos 10 caracteres'),
  confirmPassword: z.string().min(1, 'Confirme a nova senha'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
})

type PasswordFormData = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const { user } = useAuthStore()

  return (
    <div className="page-enter flex flex-col gap-6 max-w-2xl">
      {/* Profile Card */}
      <Card
        icon={<User size={16} className="text-accent" />}
        title="Perfil Profissional"
        subtitle="Informações do seu cadastro profissional"
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome completo">
              <input className={inputCls} defaultValue={user?.fullName} readOnly />
            </Field>
            <Field label="CRP">
              <input className={inputCls} defaultValue={user?.crp} readOnly />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="E-mail">
              <input className={inputCls} type="email" defaultValue={user?.email} readOnly />
            </Field>
            <Field label="Especialidade">
              <input className={inputCls} defaultValue={user?.specialty} readOnly />
            </Field>
          </div>
          <p className="text-[11px] text-subtle italic">
            Para alterar dados do perfil, entre em contato com o suporte.
          </p>
        </div>
      </Card>

      {/* Theme Card */}
      <ThemeCard />

      {/* Security Card */}
      <PasswordChangeCard />
    </div>
  )
}

function ThemeCard() {
  const { theme, setTheme } = useThemeStore()

  return (
    <Card
      icon={<Palette size={16} className="text-purple" />}
      title="Aparência"
      subtitle="Personalize a paleta de cores do sistema"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {THEMES.map(t => {
          const isActive = theme === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={[
                'flex items-center gap-3 p-4 rounded-xl border text-left transition-all',
                isActive
                  ? 'border-accent bg-accent/[0.08]'
                  : 'border-border hover:border-muted/50 bg-card hover:bg-card',
              ].join(' ')}
            >
              {/* Color swatch */}
              <div
                className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ring-2 ring-border"
                style={{ background: t.bg }}
              >
                <div className="w-4 h-4 rounded-full" style={{ background: t.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isActive ? 'text-accent' : 'text-fg'}`}>
                  {t.label}
                </p>
                <p className="text-[11px] text-muted truncate">{t.description}</p>
              </div>
              {isActive && <Check size={16} className="text-accent flex-shrink-0" />}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function PasswordChangeCard() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const onSubmit = async (data: PasswordFormData) => {
    setStatus('idle')
    setErrorMsg('')
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword)
      setStatus('success')
      reset()
      setTimeout(() => setStatus('idle'), 5000)
    } catch (err: any) {
      setStatus('error')
      const apiErrors = err?.response?.data?.errors
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setErrorMsg(apiErrors.join('. '))
      } else {
        setErrorMsg('Senha atual incorreta ou a nova senha não atende aos requisitos.')
      }
    }
  }

  return (
    <Card
      icon={<Shield size={16} className="text-gold" />}
      title="Segurança"
      subtitle="Altere sua senha de acesso ao sistema"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Field label="Senha atual" error={errors.currentPassword?.message}>
          <div className="relative">
            <input
              {...register('currentPassword')}
              type={showCurrent ? 'text' : 'password'}
              placeholder="Digite sua senha atual"
              className={inputCls + ' pr-11'}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle hover:text-muted transition-colors"
            >
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nova senha" error={errors.newPassword?.message}>
            <div className="relative">
              <input
                {...register('newPassword')}
                type={showNew ? 'text' : 'password'}
                placeholder="Mínimo 10 caracteres"
                className={inputCls + ' pr-11'}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle hover:text-muted transition-colors"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          <Field label="Confirmar nova senha" error={errors.confirmPassword?.message}>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="Repita a nova senha"
              className={inputCls}
            />
          </Field>
        </div>

        {/* Requirements hint */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-2">Requisitos da senha</p>
          <ul className="text-xs text-muted space-y-1.5">
            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-subtle" /> Mínimo de 10 caracteres</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-subtle" /> Pelo menos um caractere especial (!@#$...)</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-subtle" /> Letras maiúsculas e minúsculas</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-subtle" /> Pelo menos um número</li>
          </ul>
        </div>

        {status === 'success' && (
          <div className="flex items-center gap-3 bg-accent/10 border border-accent/25 rounded-xl px-4 py-3 animate-[fadeIn_.3s_ease-out]">
            <CheckCircle2 size={16} className="text-accent flex-shrink-0" />
            <p className="text-sm text-accent">Senha atualizada com sucesso!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-3 bg-error/10 border border-error/25 rounded-xl px-4 py-3 animate-[fadeIn_.3s_ease-out]">
            <AlertCircle size={16} className="text-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error">{errorMsg}</p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent hover:bg-accent-hover text-bg font-semibold text-sm px-6 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSubmitting ? 'Atualizando...' : 'Atualizar Senha'}
          </button>
        </div>
      </form>
    </Card>
  )
}

function Card({ icon, title, subtitle, children }: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-card-alt border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-border/60 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h2 className="font-serif text-lg italic text-fg/90">{title}</h2>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</label>
      {children}
      {error && <p className="text-[11px] text-error -mt-0.5">{error}</p>}
    </div>
  )
}
