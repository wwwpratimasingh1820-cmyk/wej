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

    const { post_id, score } = await req.json()
    if (score < 1 || score > 5) throw new Error('Invalid score')

    // 1. Verify user unlocked the post
    const { data: unlock } = await supabaseClient
      .from('reveals')
      .select('id')
      .eq('post_id', post_id)
      .eq('unlocker_id', user.id)
      .single()

    const { data: post } = await supabaseClient
      .from('posts')
      .select('creator_id')
      .eq('id', post_id)
      .single()

    if (!unlock && post?.creator_id !== user.id) {
       throw new Error('Must unlock post before rating')
    }

    // 2. Insert or update rating
    const { data: existingRating } = await supabaseClient
      .from('ratings')
      .select('id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .single()

    if (existingRating) {
      await supabaseClient
        .from('ratings')
        .update({ score })
        .eq('id', existingRating.id)
    } else {
      await supabaseClient
        .from('ratings')
        .insert({ post_id, user_id: user.id, score })
    }

    return new Response(JSON.stringify({ success: true }), {
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
