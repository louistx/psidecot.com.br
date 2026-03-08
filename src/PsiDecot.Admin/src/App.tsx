import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import AppLayout from '@/components/Layout/AppLayout'
import LoginPage    from '@/pages/Login'
import DashboardPage from '@/pages/Dashboard'
import PatientsPage  from '@/pages/Patients'
import PatientDetailPage from '@/pages/Patients/PatientDetail'
import RecordsPage   from '@/pages/Records'
import SchedulePage  from '@/pages/Schedule'
import SettingsPage  from '@/pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuthStore()
  if (!hydrated) return <SplashScreen />
  if (!user)     return <Navigate to="/login" replace />
  return <>{children}</>
}

function SplashScreen() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <div className="text-center">
        <p className="font-serif text-4xl text-fg/90 font-light italic animate-pulse">
          Psi<span className="text-accent">Decot</span>
        </p>
        <p className="text-xs text-muted mt-2 tracking-widest uppercase font-medium">
          Carregando...
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const hydrate = useAuthStore(s => s.hydrate)
  const initTheme = useThemeStore(s => s.initTheme)

  useEffect(() => {
    hydrate()
    initTheme()
  }, [hydrate, initTheme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="pacientes"         element={<PatientsPage />} />
          <Route path="pacientes/:id"     element={<PatientDetailPage />} />
          <Route path="prontuarios"       element={<RecordsPage />} />
          <Route path="agenda"            element={<SchedulePage />} />
          <Route path="configuracoes"     element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
