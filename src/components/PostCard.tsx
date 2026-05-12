'use client'

import { useState } from 'react'
import { Star, Flag, Unlock, AlertTriangle } from 'lucide-react'
import UnlockModal from './UnlockModal'
import { createClient } from '@/lib/supabase/client'

export default function PostCard({ post }: { post: any }) {
  const [unlockedData, setUnlockedData] = useState<{ full_image_url: string, prompt_text: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [rating, setRating] = useState(0)

  const isUnlocked = !!unlockedData

  const handleRate = async (score: number) => {
    setRating(score)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/rate-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ post_id: post.id, score })
      })
    } catch (e) {
      console.error('Failed to rate', e)
    }
  }

  const handleReport = async () => {
    const confirmReport = confirm("Are you sure you want to report this post?")
    if (confirmReport) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('reports').insert({ post_id: post.id, reporter_id: user.id })
        alert("Post reported successfully.")
      } else {
        alert("You must be logged in to report.")
      }
    }
  }

  return (
    <div className="bg-background border rounded-2xl overflow-hidden group hover:border-foreground/20 transition-colors shadow-sm">
      <div className="relative aspect-square sm:aspect-[4/3] bg-muted w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={isUnlocked ? unlockedData.full_image_url : post.image_url} 
          alt="AI Art"
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
        />
        {!isUnlocked && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-6 text-center text-white">
            <h3 className="font-bold text-xl sm:text-2xl mb-2 drop-shadow-lg">
              &quot;{post.preview_text}...&quot;
            </h3>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-6 flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-100 hover:scale-105 transition-all active:scale-95 shadow-xl"
            >
              <Unlock size={18} />
              Reveal Prompt
            </button>
          </div>
        )}
      </div>

      {isUnlocked && (
        <div className="p-6">
          <p className="text-base sm:text-lg font-medium mb-6 select-all leading-relaxed">
            {unlockedData.prompt_text}
          </p>
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => handleRate(star)}
                  className={`transition-colors p-1 ${rating >= star ? 'text-yellow-500' : 'text-muted hover:text-yellow-400'}`}
                >
                  <Star size={24} fill={rating >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <button onClick={handleReport} className="text-muted hover:text-red-500 transition-colors p-2" title="Report Post">
              <Flag size={20} />
            </button>
          </div>
        </div>
      )}

      <UnlockModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        postId={post.id}
        onUnlocked={setUnlockedData}
      />
    </div>
  )
}
