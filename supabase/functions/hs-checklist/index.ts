// ============================================================
// hs-checklist
// Given an HS code, product name, and target countries, generates
// a specific compliance checklist for Indian exporters using AI.
// This covers ALL HS codes — not just the 18 in the local DB.
//
// POST { hsCode: string, productName: string, countries: string[] }
// Returns { items: ChecklistItem[] }
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a senior customs compliance consultant specialising in Indian export regulations.
Your job is to generate product-specific compliance checklist items for Indian exporters.

You will receive an HS code, product name, and list of target import countries.
Generate checklist items that are SPECIFIC to this product and HS code — things the exporter must do
BEYOND the standard documents (commercial invoice, packing list, bill of lading, shipping bill, certificate of origin).

Focus on:
- Product-specific testing certificates (e.g. aflatoxin for food, flammability for textiles, RoHS for electronics)
- Import permits, registrations, or prior approvals required for this HS code in the destination
- Specific labeling rules that apply to this product category
- Known regulatory alerts for this HS code (restricted substances, contaminant limits, banned colorants)
- Certifications that must be obtained before or during production (not just at shipment)
- Any anti-dumping / countervailing duty checks relevant to India-origin goods in this HS chapter

RULES:
- Be accurate and specific. Do not hallucinate requirements that don't exist.
- Where a specific regulation or limit exists, mention it (e.g. "EU limit: 5 µg/kg", "21 CFR Part 117")
- Cover each requested country separately where requirements differ
- If a requirement applies to all countries, use country: "ALL"
- Priority "critical" = legal requirement, shipment will be rejected without it
- Priority "high" = strongly recommended, buyer will likely ask for it
- Priority "medium" = best practice, helps with market entry
- Phase values: "immediate" (do now, one-off setup), "one-time" (get once, valid long-term),
  "pre-production" (before manufacturing), "pre-shipment" (before this shipment leaves),
  "per-shipment" (every shipment), "annual" (renew yearly), "quarterly"
- Return ONLY a valid JSON array — no markdown, no explanation

Output format:
[
  {
    "category": "Testing",
    "item": "Aflatoxin B1 + B2 test report from NABL-accredited lab (EU limit: 5 µg/kg)",
    "priority": "critical",
    "phase": "per-shipment",
    "country": "EU",
    "details": "EU Regulation 1881/2006 — mandatory for all consignments of peppers/chillies"
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
    const { hsCode, productName, countries } = await req.json()

    if (!hsCode || !productName || !Array.isArray(countries) || countries.length === 0) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const countriesList = countries.join(', ')

    const userPrompt = `Generate a specific compliance checklist for exporting the following product from India:

HS Code: ${hsCode}
Product: ${productName}
Target Markets: ${countriesList}

Return checklist items specific to this product and HS code for each market.
Cover testing, certifications, labeling, import permits, and known regulatory requirements.`

    // ── OpenAI call ───────────────────────────────────────────────────────
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured', items: [] }), {
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
        model: 'gpt-4o',           // Use full GPT-4o for compliance accuracy
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,          // Low temperature for factual accuracy
        max_tokens: 2000,
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error('OpenAI error:', errText)
      throw new Error(`OpenAI API failed: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    const rawContent = aiData.choices?.[0]?.message?.content?.trim() ?? '[]'

    // Strip markdown fences if present
    const clean = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let rawItems: Array<{
      category: string
      item: string
      priority: string
      phase: string
      country: string
      details?: string
    }> = []

    try {
      rawItems = JSON.parse(clean)
    } catch {
      console.error('Failed to parse AI checklist output:', clean)
      rawItems = []
    }

    // Validate and shape into ChecklistItem format
    const validPriorities = ['critical', 'high', 'medium', 'low']
    const validPhases = ['immediate', 'one-time', 'pre-production', 'pre-shipment', 'per-shipment', 'annual', 'quarterly']

    let idCounter = 9000  // Start high to avoid collisions with static checklist IDs

    const items = rawItems
      .filter(r => r && typeof r.item === 'string' && r.item.length > 0)
      .map(r => ({
        id: idCounter++,
        category: r.category || 'Compliance',
        item: r.country && r.country !== 'ALL'
          ? `[${r.country}] ${r.item}`
          : r.item,
        priority: validPriorities.includes(r.priority) ? r.priority : 'medium',
        phase: validPhases.includes(r.phase) ? r.phase : 'pre-shipment',
        required: r.priority === 'critical',
        details: r.details,
      }))

    return new Response(
      JSON.stringify({ items, hsCode, productName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('hs-checklist error:', error)
    return new Response(
      JSON.stringify({ error: error.message, items: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
