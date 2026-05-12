'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react'
import { processImage, filterPrompt } from '@/lib/imageProcessing'
import { createClient } from '@/lib/supabase/client'

export default function CreatePost() {
  const { user } = useStore()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  if (!user) {
    return (
      <div className="text-center mt-32 text-muted">
        <h2 className="text-2xl font-bold mb-2">Login Required</h2>
        <p>Please log in to share your prompts.</p>
      </div>
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setPreview(URL.createObjectURL(e.target.files[0]))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !prompt) return

    setLoading(true)
    setError('')

    try {
      if (filterPrompt(prompt)) {
        throw new Error("Prompt contains inappropriate words.")
      }

      // Process image (NSFW check + Blur)
      const { original, blurred } = await processImage(file)
      
      const supabase = createClient()
      const postId = crypto.randomUUID()
      
      // Upload blurred (Public)
      const blurredPath = `${user.id}/${postId}-blurred.webp`
      const { error: blurErr } = await supabase.storage
        .from('post-images-public')
        .upload(blurredPath, blurred)
        
      if (blurErr) throw new Error("Failed to upload blurred image: " + blurErr.message)

      // Upload original (Private)
      const originalPath = `${user.id}/${postId}-original.${original.name.split('.').pop()}`
      const { error: origErr } = await supabase.storage
        .from('post-images-private')
        .upload(originalPath, original)
        
      if (origErr) throw new Error("Failed to upload original image: " + origErr.message)

      // Get public URL for blurred image
      const { data: { publicUrl } } = supabase.storage
        .from('post-images-public')
        .getPublicUrl(blurredPath)

      // Get public URL for full image (Using a public URL proxy for MVP, RLS restricts if using download but since prompt says "full_image_url", we'll just store path and use edge function to get signed URL later. For MVP, we can store path.)
      
      // Create Post Record
      const preview_text = prompt.split(' ').slice(0, 6).join(' ')
      
      const { error: dbErr } = await supabase.from('posts').insert({
        id: postId,
        creator_id: user.id,
        image_url: publicUrl,
        full_image_url: originalPath,
        prompt_text: prompt,
        preview_text
      })

      if (dbErr) throw new Error("Failed to save post to database: " + dbErr.message)

      router.push('/')
      
    } catch (err: any) {
      if (err.message === 'NSFW_DETECTED') {
        setError("This image doesn't meet our content guidelines.")
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-bold mb-8 tracking-tight">Create Prompt</h1>
      
      {error && <div className="p-4 mb-6 text-red-500 bg-red-500/10 rounded-xl font-medium text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div 
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${preview ? 'border-foreground/50 hover:border-foreground' : 'border-muted hover:border-foreground/50'}`}
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="max-h-72 mx-auto rounded-lg object-contain shadow-lg" />
          ) : (
            <div className="flex flex-col items-center text-muted">
              <ImageIcon size={48} className="mb-4 opacity-50" />
              <p className="font-medium">Click to upload image</p>
              <p className="text-xs mt-2 uppercase tracking-widest font-semibold">JPEG / PNG</p>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 uppercase tracking-wide">The Prompt</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cinematic shot of a neon cyberpunk city..."
            rows={4}
            className="w-full bg-accent/50 text-foreground rounded-xl p-4 outline-none focus:ring-2 focus:ring-foreground transition-shadow resize-none"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || !file || !prompt}
          className="w-full bg-foreground text-background font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
          {loading ? 'Processing & Uploading...' : 'Publish Prompt'}
        </button>
      </form>
    </div>
  )
}
