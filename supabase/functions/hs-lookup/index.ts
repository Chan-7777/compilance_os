// ============================================================
// hs-lookup
// Given a product name or description (in any language/regional name),
// returns up to 5 HS code suggestions using OpenAI.
// Falls back to Zonos classify if available.
// POST { query: string, category?: string }
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a customs classification expert specialising in Indian exports.
Given a product name or description (which may be in Hindi, a regional name, or trade jargon),
return the most likely HS codes under the HS 2022 nomenclature.

Rules:
- Use 6-digit sub-headings in the format XXXX.XX (e.g. "0904.21")
- Focus on the Indian export context (origin: India)
- Understand regional/trade names: e.g. "Guntur Mirchi" → dried chilli, "Byadagi" → chilli variety, "HRC" → hot-rolled coil steel
- Return up to 5 matches ordered by confidence (highest first)
- Return ONLY a valid JSON array — no markdown, no explanation outside the array

Output format:
[
  {
    "hsCode": "0904.21",
    "name": "Dried peppers/chillies, neither crushed nor ground",
    "confidence": "high",
    "reason": "Guntur Mirchi is a variety of whole dried red chilli"
  }
]`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse payload ─────────────────────────────────────────────────────
    const { query, category } = await req.json()
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userPrompt = category
      ? `Product: "${query}"\nProduct category hint: ${category} (use this to narrow HS chapter if relevant)`
      : `Product: "${query}"`

    // ── OpenAI call ───────────────────────────────────────────────────────
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error('OpenAI error:', errText)
      throw new Error(`OpenAI API failed: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    const rawContent = aiData.choices?.[0]?.message?.content?.trim() ?? '[]'

    // Strip markdown code fences if model wraps in ```json ... ```
    const clean = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let results: Array<{
      hsCode: string
      name: string
      confidence: string
      reason: string
    }> = []

    try {
      results = JSON.parse(clean)
    } catch {
      console.error('Failed to parse AI output:', clean)
      results = []
    }

    // Validate shape — drop entries that don't have an hsCode
    results = results.filter(r => r && typeof r.hsCode === 'string' && r.hsCode.length >= 4)

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('hs-lookup error:', error)
    return new Response(
      JSON.stringify({ error: error.message, results: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
