import { create } from 'zustand'
import type { User } from '@/types'
import { authApi } from '@/api'

interface AuthStore {
  user:      User | null
  isLoading: boolean
  hydrated:  boolean
  login:   (email: string, password: string) => Promise<void>
  logout:  () => Promise<void>
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:      null,
  isLoading: false,
  hydrated:  false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const user = await authApi.login(email, password)
      set({ user })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    await authApi.logout()
    set({ user: null })
  },

  // Chama no boot da app — tenta revalidar sessão via refresh cookie
  hydrate: async () => {
    try {
      const user = await authApi.refresh()
      set({ user, hydrated: true })
    } catch {
      set({ user: null, hydrated: true })
    }
  },
}))
