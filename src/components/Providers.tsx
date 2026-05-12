'use client'

import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { createClient } from '@/lib/supabase/client'
import { useAdminCheatCode } from '@/hooks/useAdminCheatCode'

export default function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useStore((state) => state.setUser)
  const setSessionLoading = useStore((state) => state.setSessionLoading)
  const setTheme = useStore((state) => state.setTheme)
  useAdminCheatCode()

  useEffect(() => {
    // Set initial theme based on class
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')

    const supabase = createClient()
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('users').select('*').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data) {
              setUser({
                id: data.id,
                username: data.username,
                points: data.points,
                is_premium: data.is_premium,
                avatar_url: data.avatar_url
              })
            }
            setSessionLoading(false)
          })
      } else {
        setSessionLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase.from('users').select('*').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data) {
              setUser({
                id: data.id,
                username: data.username,
                points: data.points,
                is_premium: data.is_premium,
                avatar_url: data.avatar_url
              })
            }
          })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setSessionLoading, setTheme])

  return <>{children}</>
}
