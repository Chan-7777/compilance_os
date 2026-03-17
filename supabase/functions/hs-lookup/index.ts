// ============================================================
// hs-lookup
// Searches the hs_codes table for matching products.
// Falls back to OpenAI for trade-name / regional-name queries
// that don't match standard HS descriptions.
//
// POST { query: string, category?: string }
// Returns { results: [{hsCode, name, confidence, reason}] }
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// HS chapter prefixes by product category (to narrow DB search)
const CATEGORY_CHAPTERS: Record<string, string[]> = {
  food:        ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24'],
  textiles:    ['50','51','52','53','54','55','56','57','58','59','60','61','62','63'],
  chemicals:   ['28','29','30','31','32','33','34','35','36','37','38'],
  electronics: ['84','85'],
  steel:       ['72','73'],
  pharma:      ['30'],
  automotive:  ['87'],
  machinery:   ['84'],
}

const AI_SYSTEM_PROMPT = `You are a customs classification expert specialising in Indian exports.
Given a product name or description (which may be in Hindi, a regional name, or trade jargon),
return the most likely HS codes under the HS 2022 nomenclature.

Rules:
- Use 6-digit sub-headings in the format XXXX.XX (e.g. "0904.21")
- Focus on the Indian export context (origin: India)
- Understand regional/trade names: e.g. "Guntur Mirchi" → dried chilli, "Byadagi" → chilli variety, "HRC" → hot-rolled coil steel
- Return up to 5 matches ordered by confidence (highest first)
- Return ONLY a valid JSON array — no markdown, no explanation

Output format:
[{ "hsCode": "0904.21", "name": "Dried peppers/chillies, neither crushed nor ground", "confidence": "high", "reason": "Guntur Mirchi is a variety of whole dried red chilli" }]`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Parse payload ──────────────────────────────────────────────────────
    const { query, category } = await req.json()
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const q = query.trim()
    // chapters only used as hint in AI prompt — never restrict DB results
    const chapters = category ? (CATEGORY_CHAPTERS[category] ?? null) : null

    // ── 1. DB search — no category filter, search all 5,613 codes ──────────
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Full-text search
    const { data: ftsRows } = await serviceClient
      .from('hs_codes')
      .select('code, description')
      .textSearch('description', q, { type: 'websearch' })
      .limit(10)

    // ilike fallback
    const { data: ilikeRows } = await serviceClient
      .from('hs_codes')
      .select('code, description')
      .ilike('description', `%${q}%`)
      .limit(10)

    // Merge and dedupe
    const seen = new Set<string>()
    const combined: { code: string; description: string }[] = []
    for (const r of [...(ftsRows ?? []), ...(ilikeRows ?? [])]) {
      if (!seen.has(r.code)) {
        seen.add(r.code)
        combined.push(r)
      }
    }

    const dbResults = combined.slice(0, 5)

    const dbFormatted = dbResults.map(r => ({
      hsCode: r.code,
      name: r.description,
      confidence: 'high' as const,
      reason: 'HS 2022 nomenclature',
      source: 'db',
    }))

    // 3+ DB results → return immediately, no AI cost
    if (dbFormatted.length >= 3) {
      return new Response(
        JSON.stringify({ results: dbFormatted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ── 2. AI fallback — regional/trade names not in standard HS text ──────
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ results: dbFormatted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const userPrompt = category
      ? `Product: "${q}"\nProduct category hint: ${category}`
      : `Product: "${q}"`

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
    })

    let aiFormatted: any[] = []
    if (aiResponse.ok) {
      const aiData = await aiResponse.json()
      const raw = aiData.choices?.[0]?.message?.content?.trim() ?? '[]'
      const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      try {
        const parsed = JSON.parse(clean)
        const dbCodes = new Set(dbFormatted.map(r => r.hsCode))
        aiFormatted = parsed
          .filter((r: any) => r?.hsCode && !dbCodes.has(r.hsCode))
          .map((r: any) => ({ ...r, source: 'ai' }))
      } catch { /* ignore */ }
    }

    return new Response(
      JSON.stringify({ results: [...dbFormatted, ...aiFormatted].slice(0, 5) }),
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
