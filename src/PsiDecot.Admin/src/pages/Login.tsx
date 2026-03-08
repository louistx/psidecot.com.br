import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'

const schema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [serverErr, setServerErr] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerErr(null)
    try {
      await login(data.email, data.password)
      navigate('/', { replace: true })
    } catch {
      setServerErr('E-mail ou senha incorretos.')
    }
  }

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-32 -right-40 w-[600px] h-[600px] rounded-full bg-accent/[0.05] blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-gold/[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] animate-[fadeIn_.4s_ease-out]">
        <div className="bg-card border border-border rounded-2xl p-10 shadow-2xl shadow-black/30">
          {/* Logo */}
          <div className="text-center mb-10">
            <p className="font-serif text-[44px] font-light tracking-wide text-fg leading-none">
              Psi<span className="text-accent">Decot</span>
            </p>
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted mt-2">
              Gestão Clínica
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-muted">
                E-mail
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="seuemail@clinica.com.br"
                  autoComplete="email"
                  className="w-full bg-input-bg border border-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-fg placeholder-subtle outline-none focus:border-accent focus-ring transition-all"
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-muted">
                Senha
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-input-bg border border-border rounded-xl pl-11 pr-12 py-3.5 text-sm text-fg placeholder-subtle outline-none focus:border-accent focus-ring transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle hover:text-muted transition-colors p-0.5"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-error">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverErr && (
              <div className="bg-error/10 border border-error/25 rounded-xl px-4 py-3 animate-[fadeIn_.2s_ease-out]">
                <p className="text-sm text-error">{serverErr}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent-hover text-bg font-semibold text-sm py-3.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/15 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-1"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>

            <p className="text-center text-[11px] text-subtle tracking-wide mt-1">
              Acesso restrito · admin.psidecot.com.br
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
