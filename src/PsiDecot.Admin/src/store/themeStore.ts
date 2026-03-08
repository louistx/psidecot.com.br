import { create } from 'zustand'

export type ThemeId = 'default-dark' | 'default-light' | 'decot-dark' | 'decot-light'

export interface ThemeOption {
  id: ThemeId
  label: string
  description: string
  accent: string
  bg: string
}

export const THEMES: ThemeOption[] = [
  {
    id: 'default-dark',
    label: 'Default Dark',
    description: 'Tema escuro padrão do sistema',
    accent: '#7eb8a4',
    bg: '#0f1219',
  },
  {
    id: 'default-light',
    label: 'Default Light',
    description: 'Tema claro padrão do sistema',
    accent: '#5a9e8a',
    bg: '#f5f7fa',
  },
  {
    id: 'decot-dark',
    label: 'Decot Dark',
    description: 'Identidade visual Decot escura',
    accent: '#f7c9cf',
    bg: '#2e2e33',
  },
  {
    id: 'decot-light',
    label: 'Decot Light',
    description: 'Identidade visual Decot clara',
    accent: '#c97a84',
    bg: '#f9f5f0',
  },
]

const STORAGE_KEY = 'psidecot:theme'
const DEFAULT_THEME: ThemeId = 'default-dark'

function applyTheme(id: ThemeId) {
  if (id === 'default-dark') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', id)
  }
}

interface ThemeState {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
  initTheme: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: DEFAULT_THEME,

  setTheme: (id) => {
    set({ theme: id })
    applyTheme(id)
    localStorage.setItem(STORAGE_KEY, id)
  },

  initTheme: () => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null
    const id = saved && THEMES.some(t => t.id === saved) ? saved : DEFAULT_THEME
    set({ theme: id })
    applyTheme(id)
  },
}))
