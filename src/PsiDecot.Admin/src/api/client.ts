import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

export const api: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: true,   // envia cookie refresh_token httpOnly
})

// ── Request: injeta Authorization header ────────────────────────────────────
api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Response: 401 → tenta refresh → retry ───────────────────────────────────
let isRefreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config

    // Nunca intercepta 401 do próprio /auth/refresh (evita loop)
    if (original?.url?.includes('/auth/refresh')) {
      return Promise.reject(err)
    }

    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise(resolve => {
          queue.push(token => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      original._retry = true
      isRefreshing     = true

      try {
        const { data } = await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true })
        const newToken = data.accessToken
        setAccessToken(newToken)
        queue.forEach(cb => cb(newToken))
        queue = []
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        clearAccessToken()
        queue = []
        // Só redireciona se não estiver já na /login
        if (!window.location.pathname.startsWith('/login')) {
          window.location.replace('/login')
        }
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

// ── Token memory (não localStorage — segurança) ─────────────────────────────
let _token: string | null = null
export const getAccessToken  = ()          => _token
export const setAccessToken  = (t: string) => { _token = t }
export const clearAccessToken = ()         => { _token = null }
