import { create } from 'zustand'

export type User = {
  id: string
  username: string
  points: number
  is_premium: boolean
  avatar_url: string | null
}

type Store = {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  user: User | null
  setUser: (user: User | null) => void
  sessionLoading: boolean
  setSessionLoading: (loading: boolean) => void
  showAdmin: boolean
  setShowAdmin: (show: boolean) => void
}

export const useStore = create<Store>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set(() => {
    if (typeof window !== 'undefined') {
      if (theme === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }
    return { theme }
  }),
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light'
    if (typeof window !== 'undefined') {
      if (newTheme === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }
    return { theme: newTheme }
  }),
  user: null,
  setUser: (user) => set({ user }),
  sessionLoading: true,
  setSessionLoading: (sessionLoading) => set({ sessionLoading }),
  showAdmin: false,
  setShowAdmin: (showAdmin) => set({ showAdmin }),
}))
