'use client'

import { useStore } from '@/store/useStore'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import PostCard from '@/components/PostCard'
import { LogOut, Coins, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Profile() {
  const { user, setUser } = useStore()
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [revealsEarned, setRevealsEarned] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    const fetchProfileData = async () => {
      const supabase = createClient()
      
      // Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })

      setPosts(postsData || [])

      if (postsData && postsData.length > 0) {
        // Fetch reveals earned
        const { count } = await supabase
          .from('reveals')
          .select('id', { count: 'exact', head: true })
          .in('post_id', postsData.map(p => p.id))
        
        setRevealsEarned(count || 0)
      }
      setLoading(false)
    }

    fetchProfileData()
  }, [user, router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
  }

  if (!user || loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-foreground"></div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center text-3xl font-bold uppercase shadow-inner border border-foreground/10">
            {user.username.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">{user.username}</h1>
            <p className="text-muted font-medium">Joined recently</p>
          </div>
        </div>
        
        <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 rounded-full border hover:bg-accent transition-colors font-medium text-sm">
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
        <div className="bg-background p-6 rounded-2xl border shadow-sm flex items-center gap-5 group hover:border-foreground/30 transition-colors">
          <div className="p-4 bg-yellow-500/10 text-yellow-500 rounded-2xl group-hover:scale-110 transition-transform">
            <Coins size={32} />
          </div>
          <div>
            <p className="text-muted text-xs font-bold uppercase tracking-widest mb-1">Points Balance</p>
            <p className="text-3xl font-bold">{user.points}</p>
          </div>
        </div>
        
        <div className="bg-background p-6 rounded-2xl border shadow-sm flex items-center gap-5 group hover:border-foreground/30 transition-colors">
          <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
            <ImageIcon size={32} />
          </div>
          <div>
            <p className="text-muted text-xs font-bold uppercase tracking-widest mb-1">Total Reveals Earned</p>
            <p className="text-3xl font-bold">{revealsEarned}</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6 tracking-tight">Your Prompts</h2>
      
      {posts.length === 0 ? (
        <div className="text-center p-16 border-2 border-dashed rounded-3xl text-muted bg-accent/30">
          <p className="font-medium text-lg">You haven't shared any prompts yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
