'use client'

import { useStore } from '@/store/useStore'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function AdminPanel() {
  const { showAdmin, setShowAdmin, user } = useStore()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Note: NEXT_PUBLIC_ADMIN_USER_ID should be set in Vercel after your first signup.
    // 1. Deploy with a placeholder or missing.
    // 2. Sign up on the live site.
    // 3. Get your UUID from Supabase Auth dashboard.
    // 4. Set NEXT_PUBLIC_ADMIN_USER_ID in Vercel and redeploy.
    if (user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      setIsAdmin(true)
    } else {
      setIsAdmin(false)
    }
  }, [user])

  if (!showAdmin) return null

  if (!isAdmin) {
    return (
      <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-background border-l shadow-2xl z-[100] flex flex-col p-6 transition-transform">
        <button onClick={() => setShowAdmin(false)} className="absolute top-4 right-4 p-2 hover:bg-accent rounded-full">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-red-500 mt-8">Access Denied</h2>
        <p className="text-muted mt-2 text-sm">You do not have administrative privileges.</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-background border-l shadow-2xl z-[100] flex flex-col transition-transform">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-bold tracking-tight">Admin Console</h2>
        <button onClick={() => setShowAdmin(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          <div className="p-4 border rounded-xl">
            <h3 className="font-semibold mb-2">Platform Stats</h3>
            <p className="text-sm text-muted">Analytics placeholder.</p>
          </div>
          <div className="p-4 border rounded-xl">
            <h3 className="font-semibold mb-2">Reported Posts</h3>
            <p className="text-sm text-muted">Review queue placeholder.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
