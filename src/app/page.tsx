'use client'

import { useEffect, useState } from 'react'
import PostCard from '@/components/PostCard'
import { createClient } from '@/lib/supabase/client'

export default function Feed() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Admin setup reminder
    if (!process.env.NEXT_PUBLIC_ADMIN_USER_ID || process.env.NEXT_PUBLIC_ADMIN_USER_ID === 'placeholder_admin_id') {
      console.warn("⚠️ Admin ID not set! Remember to set NEXT_PUBLIC_ADMIN_USER_ID in Vercel after signing up.");
    }

    const fetchPosts = async () => {
      const supabase = createClient()
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset: 0, limit: 20 })
        })

        if (res.ok) {
          const data = await res.json()
          setPosts(data.posts || [])
        } else {
          console.error("Failed to fetch feed")
        }
      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-foreground"></div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center mt-32 text-muted animate-in fade-in zoom-in duration-500">
        <h2 className="text-3xl font-semibold mb-3 tracking-tight">No prompts yet</h2>
        <p className="text-lg">Be the first to share an AI masterpiece.</p>
      </div>
    )
  }

  return (
    <div className="space-y-12 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
