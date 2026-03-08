import { api, setAccessToken, clearAccessToken } from './client'
import type {
  User, PatientSummary, PatientDetail, CreatePatientPayload,
  SessionDetail, CreateSessionPayload, PagedResult, Medication,
  DashboardSession,
} from '@/types'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    setAccessToken(data.accessToken)
    return data.user as User
  },

  logout: async () => {
    await api.post('/auth/logout')
    clearAccessToken()
  },

  refresh: async () => {
    const { data } = await api.post('/auth/refresh')
    setAccessToken(data.accessToken)
    return data.user as User
  },

  me: async () => {
    const { data } = await api.get<User>('/auth/me')
    return data
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword })
    return data
  },
}

// ── Patients ──────────────────────────────────────────────────────────────────
export const patientsApi = {
  list: async (params?: {
    search?: string
    active?: boolean
    page?: number
    pageSize?: number
  }) => {
    const { data } = await api.get<PagedResult<PatientSummary>>('/patients', { params })
    return data
  },

  getById: async (id: string) => {
    const { data } = await api.get<PatientDetail>(`/patients/${id}`)
    return data
  },

  create: async (payload: CreatePatientPayload) => {
    const { data } = await api.post<PatientSummary>('/patients', payload)
    return data
  },

  update: async (id: string, payload: Partial<CreatePatientPayload>) => {
    const { data } = await api.put<PatientSummary>(`/patients/${id}`, payload)
    return data
  },

  toggleActive: async (id: string) => {
    const { data } = await api.patch<{ id: string; isActive: boolean }>(
      `/patients/${id}/toggle-active`
    )
    return data
  },
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export const sessionsApi = {
  listAll: async (params?: {
    date?: string
    upcoming?: boolean
    page?: number
    pageSize?: number
  }) => {
    const { data } = await api.get<PagedResult<DashboardSession>>('/sessions', { params })
    return data
  },

  listByPatient: async (patientId: string, page = 1) => {
    const { data } = await api.get<PagedResult<SessionDetail>>(
      `/sessions/patient/${patientId}`, { params: { page } }
    )
    return data
  },

  getById: async (id: string) => {
    const { data } = await api.get<SessionDetail>(`/sessions/${id}`)
    return data
  },

  create: async (payload: CreateSessionPayload) => {
    const { data } = await api.post<SessionDetail>('/sessions', payload)
    return data
  },

  update: async (id: string, payload: Partial<CreateSessionPayload>) => {
    const { data } = await api.put<SessionDetail>(`/sessions/${id}`, payload)
    return data
  },

  delete: async (id: string) => {
    await api.delete(`/sessions/${id}`)
  },
}

// ── Medications ───────────────────────────────────────────────────────────────
export const medicationsApi = {
  listByPatient: async (patientId: string) => {
    const { data } = await api.get<Medication[]>(`/medications/patient/${patientId}`)
    return data
  },

  create: async (payload: {
    patientId: string; name: string; dosage?: string; frequency?: string
    prescriber?: string; notes?: string; startDate?: string
  }) => {
    const { data } = await api.post<Medication>('/medications', payload)
    return data
  },

  update: async (id: string, payload: Partial<Medication>) => {
    const { data } = await api.put<Medication>(`/medications/${id}`, payload)
    return data
  },

  toggle: async (id: string) => {
    const { data } = await api.patch<{ id: string; isActive: boolean }>(
      `/medications/${id}/toggle-active`
    )
    return data
  },
}

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  uploadToPatient: async (patientId: string, file: File, description?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (description) form.append('description', description)
    const { data } = await api.post(`/documents/patient/${patientId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  uploadToSession: async (sessionId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post(`/documents/session/${sessionId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  listByPatient: async (patientId: string) => {
    const { data } = await api.get(`/documents/patient/${patientId}`)
    return data
  },

  download: async (id: string, fileName: string) => {
    const { data } = await api.get(`/documents/${id}/download`, { responseType: 'blob' })
    const url  = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url; link.download = fileName; link.click()
    URL.revokeObjectURL(url)
  },

  delete: async (id: string) => {
    await api.delete(`/documents/${id}`)
  },
}
