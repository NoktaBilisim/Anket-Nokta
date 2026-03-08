import { create } from 'zustand'

const saved = localStorage.getItem('theme') || 'light'
if (saved === 'dark') document.documentElement.classList.add('dark')

export const useThemeStore = create((set) => ({
  theme: saved,
  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    set({ theme })
  },
  toggle: () => {
    const current = localStorage.getItem('theme') || 'light'
    const next = current === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    set({ theme: next })
  }
}))
