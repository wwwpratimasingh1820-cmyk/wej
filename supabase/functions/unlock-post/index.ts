import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { post_id, method } = await req.json()

    // 1. Check if user already unlocked this post
    const { data: existingReveal } = await supabaseClient
      .from('reveals')
      .select('id')
      .eq('post_id', post_id)
      .eq('unlocker_id', user.id)
      .single()

    if (existingReveal) {
      return new Response(JSON.stringify({ success: true, message: 'Already unlocked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Handle method rules
    if (method === 'points') {
      const { data: userData } = await supabaseClient
        .from('users')
        .select('points')
        .eq('id', user.id)
        .single()
      
      if (!userData || userData.points < 5) {
        throw new Error('Insufficient points')
      }
      
      // Deduct points
      await supabaseClient
        .from('users')
        .update({ points: userData.points - 5 })
        .eq('id', user.id)

      await supabaseClient
        .from('points_ledger')
        .insert({ user_id: user.id, amount: -5, reason: 'unlock_spend', related_post_id: post_id })
    } else if (method === 'free') {
      // Check if free unlock was used today
      const today = new Date()
      today.setUTCHours(0,0,0,0)
      
      const { data: freeReveals } = await supabaseClient
        .from('reveals')
        .select('id')
        .eq('unlocker_id', user.id)
        .eq('method', 'free')
        .gte('created_at', today.toISOString())
        
      if (freeReveals && freeReveals.length > 0) {
        throw new Error('Free unlock already used today')
      }
    }

    // 3. Insert Reveal
    await supabaseClient
      .from('reveals')
      .insert({ post_id, unlocker_id: user.id, method })

    // 4. Process Creator Earn (simplified logic)
    const { data: post } = await supabaseClient
      .from('posts')
      .select('creator_id, created_at, jumpstart_phase, is_curated')
      .eq('id', post_id)
      .single()

    if (post && !post.is_curated) {
      // Calculate days since creation
      const createdDate = new Date(post.created_at)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - createdDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let phase = 3
      if (diffDays <= 5) phase = 1
      else if (diffDays <= 12) phase = 2

      // Very simple earn logic: give 1 point if conditions met (can be enhanced with ratings multiplier later)
      // For MVP, if phase = 1, give 1 point directly. If phase 2 or 3, would need fractional logic.
      // To simplify the MVP fractional logic: we'll randomly award based on odds (e.g. 1/3 chance for phase 2).
      let earned = false
      if (phase === 1) earned = true
      else if (phase === 2 && Math.random() < 0.33) earned = true
      else if (phase === 3 && Math.random() < 0.20) earned = true

      if (earned) {
        const { data: creator } = await supabaseClient
          .from('users')
          .select('points')
          .eq('id', post.creator_id)
          .single()
        
        if (creator) {
          await supabaseClient
            .from('users')
            .update({ points: creator.points + 1 })
            .eq('id', post.creator_id)
          
          await supabaseClient
            .from('points_ledger')
            .insert({ user_id: post.creator_id, amount: 1, reason: 'reveal_earn', related_post_id: post_id })
        }
      }
    }

    // Return the full prompt
    const { data: fullPost } = await supabaseClient
      .from('posts')
      .select('prompt_text, full_image_url')
      .eq('id', post_id)
      .single()

    return new Response(JSON.stringify({ success: true, post: fullPost }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
