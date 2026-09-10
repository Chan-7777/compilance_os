// ============================================================
// sanctions-check
// Screens a buyer/entity name against the OFAC SDN list.
//
// POST { name: string }
// Returns { risk_level: 'clear'|'flag'|'block', matches: [...], query_name: string }
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Normalize: uppercase, strip punctuation, collapse whitespace
function normalize(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Score how closely two normalized strings match (0-100)
function matchScore(query: string, candidate: string): number {
  if (query === candidate) return 100

  // Check if query tokens all appear in candidate
  const qTokens = query.split(' ').filter(t => t.length > 2)
  const cTokens = new Set(candidate.split(' '))
  const matched = qTokens.filter(t => cTokens.has(t)).length
  if (qTokens.length === 0) return 0
  const tokenScore = Math.round((matched / qTokens.length) * 100)

  // Substring bonus: if full query appears inside candidate or vice-versa
  const substringBonus = candidate.includes(query) || query.includes(candidate) ? 20 : 0

  return Math.min(100, tokenScore + substringBonus)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { name } = await req.json()

    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return new Response(
        JSON.stringify({ risk_level: 'clear', matches: [], query_name: name || '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Guard: if the sanctions table has never been seeded, refuse to return 'clear'
    const { count } = await supabase
      .from('sanctions_entries')
      .select('*', { count: 'exact', head: true })
    if (count === 0 || count === null) {
      return new Response(
        JSON.stringify({
          risk_level: 'error',
          error: 'sanctions_data_missing',
          matches: [],
          query_name: name.trim(),
          checked_at: new Date().toISOString(),
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const queryNorm = normalize(name.trim())

    // ── 1. Search entries (FTS on name_norm) ──────────────────
    const { data: entryMatches } = await supabase
      .from('sanctions_entries')
      .select('uid, name, entity_type, program, remarks')
      .textSearch('name_norm', queryNorm.split(' ').filter(t => t.length > 2).join(' | '), {
        type: 'websearch',
        config: 'simple',
      })
      .limit(10)

    // ── 2. Search aliases ─────────────────────────────────────
    const { data: aliasMatches } = await supabase
      .from('sanctions_aliases')
      .select('uid, alias, alias_norm, alias_type, sanctions_entries!inner(name, entity_type, program)')
      .textSearch('alias_norm', queryNorm.split(' ').filter(t => t.length > 2).join(' | '), {
        type: 'websearch',
        config: 'simple',
      })
      .limit(10)

    // ── 3. Score and merge results ────────────────────────────
    const scored: Array<{
      uid: string; name: string; matched_as: string
      entity_type: string; program: string; score: number
    }> = []

    for (const e of entryMatches || []) {
      const score = matchScore(queryNorm, normalize(e.name))
      if (score >= 40) scored.push({ ...e, matched_as: 'primary', score })
    }

    for (const a of aliasMatches || []) {
      const entry = (a as any).sanctions_entries
      const score = matchScore(queryNorm, normalize(a.alias))
      if (score >= 40) scored.push({
        uid: a.uid,
        name: entry?.name || a.alias,
        matched_as: `${a.alias_type || 'aka'}: ${a.alias}`,
        entity_type: entry?.entity_type || 'entity',
        program: entry?.program || '',
        score,
      })
    }

    // Deduplicate by uid, keep highest score
    const deduped = new Map<string, typeof scored[0]>()
    for (const m of scored) {
      const existing = deduped.get(m.uid)
      if (!existing || m.score > existing.score) deduped.set(m.uid, m)
    }

    const results = [...deduped.values()].sort((a, b) => b.score - a.score).slice(0, 5)

    // ── 4. Determine risk level ───────────────────────────────
    const topScore = results[0]?.score ?? 0
    const risk_level = topScore >= 90 ? 'block'
                     : topScore >= 65 ? 'flag'
                     : 'clear'

    return new Response(
      JSON.stringify({
        risk_level,
        matches: results,
        query_name: name.trim(),
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('sanctions-check error:', err)
    return new Response(
      JSON.stringify({ error: String(err), risk_level: 'clear', matches: [], query_name: '' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
