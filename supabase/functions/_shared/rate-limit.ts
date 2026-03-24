// Shared rate limiting helper for expensive edge functions
// Uses the rate_limits table — 1 row per (user, function, day)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DAILY_LIMITS: Record<string, number> = {
  'climatiq-emissions': 50,
  'document-ocr':       20,
  'label-vision':       30,
  'hs-lookup':         200,
  'sanctions-check':   200,
}

export async function checkRateLimit(
  userId: string,
  fnName: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = DAILY_LIMITS[fnName] ?? 100

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const today = new Date().toISOString().slice(0, 10)

  // Upsert: increment count or create row
  const { data, error } = await serviceClient
    .from('rate_limits')
    .upsert(
      { user_id: userId, fn_name: fnName, window_date: today, count: 1, updated_at: new Date().toISOString() },
      {
        onConflict: 'user_id,fn_name,window_date',
        ignoreDuplicates: false,
      }
    )
    .select('count')
    .single()

  if (error) {
    // On error, increment manually
    const { data: existing } = await serviceClient
      .from('rate_limits')
      .select('count')
      .eq('user_id', userId)
      .eq('fn_name', fnName)
      .eq('window_date', today)
      .maybeSingle()

    const currentCount = (existing?.count ?? 0) + 1
    await serviceClient
      .from('rate_limits')
      .update({ count: currentCount, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('fn_name', fnName)
      .eq('window_date', today)

    return { allowed: currentCount <= limit, remaining: Math.max(0, limit - currentCount), limit }
  }

  const count = data?.count ?? 1
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit }
}

export function rateLimitResponse(limit: number) {
  return new Response(
    JSON.stringify({
      error: `Daily limit of ${limit} requests reached. Resets at midnight UTC.`,
      code: 'RATE_LIMIT_EXCEEDED',
    }),
    { status: 429, headers: { 'Content-Type': 'application/json' } }
  )
}
