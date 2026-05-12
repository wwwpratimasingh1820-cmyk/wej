'use client'

import { useStore } from '@/store/useStore'
import { X, PlayCircle, Coins, Crown } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export const AD_CONFIG = {
  enabled: false,
  adUnitPath: "/XXXXXXXXXX/rewarded",
  fallbackMethod: "free"
}

export default function UnlockModal({ isOpen, onClose, postId, onUnlocked }: { isOpen: boolean, onClose: () => void, postId: string, onUnlocked: (fullData: any) => void }) {
  const { user } = useStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleUnlock = async (method: 'ad' | 'points' | 'free' | 'premium') => {
    if (!user) {
      setError('You must be logged in to unlock.')
      return
    }

    setLoading(true)
    setError('')
    try {
      let finalMethod = method
      if (method === 'ad') {
        if (AD_CONFIG.enabled) {
          await new Promise(r => setTimeout(r, 2000))
        } else {
          finalMethod = AD_CONFIG.fallbackMethod as 'free'
          alert('You unlocked it for free – ads coming soon!')
        }
      }

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/unlock-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ post_id: postId, method: finalMethod })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to unlock')
      
      onUnlocked(data.post)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background w-full max-w-md rounded-t-3xl sm:rounded-2xl border p-6 shadow-2xl relative animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent transition-colors disabled:opacity-50" disabled={loading}>
          <X size={20} />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center">Unlock Prompt</h2>
        
        {error && <div className="p-3 mb-4 text-sm text-red-500 bg-red-500/10 rounded-lg">{error}</div>}
        
        <div className="space-y-3">
          <button
            onClick={() => handleUnlock('ad')}
            disabled={loading}
            className="w-full flex items-center justify-between p-4 rounded-xl border hover:border-foreground transition-all group disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <PlayCircle className="text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Watch an Ad</span>
            </div>
            <span className="text-xs text-muted uppercase tracking-wider font-semibold">Free</span>
          </button>

          <button
            onClick={() => handleUnlock('points')}
            disabled={loading || (user?.points ?? 0) < 5}
            className="w-full flex items-center justify-between p-4 rounded-xl border hover:border-foreground transition-all group disabled:opacity-50 disabled:hover:border-inherit"
          >
            <div className="flex items-center gap-3">
              <Coins className="text-yellow-500 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Use Points</span>
            </div>
            <span className="text-xs text-muted font-semibold">5 pts required</span>
          </button>

          <button
            disabled
            className="w-full flex items-center justify-between p-4 rounded-xl border opacity-50 relative overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <Crown className="text-purple-500" />
              <span className="font-medium">Go Premium</span>
            </div>
            <span className="text-xs uppercase tracking-wider font-semibold">Coming Soon</span>
          </button>
        </div>
      </div>
    </div>
  )
}
