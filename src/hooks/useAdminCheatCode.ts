import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'

export function useAdminCheatCode() {
  const setShowAdmin = useStore((state) => state.setShowAdmin)
  // The code sequence to unlock the admin panel
  const code = 'WEJADMIN'
  const index = useRef(0)
  const timer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const key = e.key.toUpperCase()

      // The user must press Enter after typing the code
      if (index.current === code.length && key === 'ENTER') {
        setShowAdmin(true)
        index.current = 0
        if (timer.current) clearTimeout(timer.current)
        return
      }

      if (key === code[index.current]) {
        index.current++
        
        if (timer.current) clearTimeout(timer.current)
        
        timer.current = setTimeout(() => {
          index.current = 0
        }, 3000) // 3 seconds window

      } else {
        index.current = 0
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setShowAdmin])
}
