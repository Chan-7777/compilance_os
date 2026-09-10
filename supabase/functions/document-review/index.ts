// ============================================================
// document-review
// Multi-document AI compliance review using Claude Opus 4.8.
//
// POST {
//   documents: Array<{ name: string, base64: string, type: 'invoice'|'packing_list'|'shipping_bill'|'other' }>,
//   hsCode?: string,
//   destinationCountry?: string,
//   product?: string
// }
// Returns {
//   verdict: 'pass' | 'flag' | 'fail',
//   score: number (0-100, higher = more issues),
//   issues: Array<{ severity: 'critical'|'warning'|'info', field: string, finding: string, fix: string }>,
//   summary: string
// }
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@latest'
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── Auth + rate limit ─────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user } } = await anonClient.auth.getUser()
      if (user) {
        const rl = await checkRateLimit(user.id, 'document-review')
        if (!rl.allowed) return rateLimitResponse(rl.limit)
      }
    }

    const { documents, hsCode, destinationCountry, product } = await req.json()

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      throw new Error('At least one document is required')
    }
    if (documents.length > 5) {
      throw new Error('Maximum 5 documents per review')
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY is not configured')

    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // Build the message content — text context first, then each document image
    const messageContent: Anthropic.MessageParam['content'] = []

    messageContent.push({
      type: 'text',
      text: `You are an Indian export compliance expert reviewing trade documents before customs filing.

Context:
- HS Code: ${hsCode || 'not provided'}
- Destination: ${destinationCountry || 'not provided'}
- Product category: ${product || 'not provided'}
- Exporter origin: India

You will be shown ${documents.length} trade document(s): ${documents.map((d: { type: string; name: string }) => `${d.type.replace('_', ' ')} (${d.name})`).join(', ')}.

Review all documents and check for:
1. HS code vs product description mismatch (most common cause of customs queries in India)
2. Value declarations that may trigger scrutiny (e.g. undervaluation vs market rates)
3. Missing mandatory fields for the destination country
4. Cross-document inconsistencies (quantity in invoice ≠ packing list, weight discrepancies)
5. LC compliance issues — terms that may not be met by these documents
6. DGFT/CBIC mandatory declarations missing
7. Country of origin declaration completeness

Return ONLY a valid JSON object (no markdown):
{
  "verdict": "pass" | "flag" | "fail",
  "score": <0-100 where 0 = perfect, 100 = reject at customs>,
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "field": "<specific field or section name>",
      "finding": "<exactly what is wrong or missing>",
      "fix": "<exactly what to change or add>"
    }
  ],
  "summary": "<2-3 sentence plain-English summary for the exporter>"
}

Verdict rules: pass = score < 20, flag = score 20-60, fail = score > 60.
If no issues found, return verdict: pass, score: 0, issues: [], summary: all clear message.`,
    })

    // Attach each document image
    for (const doc of documents) {
      const ext = doc.name.split('.').pop()?.toLowerCase()
      let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
      if (ext === 'png') mediaType = 'image/png'
      else if (ext === 'webp') mediaType = 'image/webp'

      const rawBase64 = doc.base64.startsWith('data:')
        ? doc.base64.split(',')[1]
        : doc.base64

      messageContent.push({
        type: 'text',
        text: `--- Document: ${doc.type.replace('_', ' ').toUpperCase()} (${doc.name}) ---`,
      })
      messageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: rawBase64 },
      })
    }

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      messages: [{ role: 'user', content: messageContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = fenceMatch ? fenceMatch[1].trim() : text

    let result: { verdict: string; score: number; issues: unknown[]; summary: string }
    try {
      result = JSON.parse(jsonStr)
    } catch {
      throw new Error('AI returned invalid JSON — please try again')
    }

    // Normalize verdict
    if (!['pass', 'flag', 'fail'].includes(result.verdict)) result.verdict = 'flag'
    if (typeof result.score !== 'number') result.score = 50
    result.score = Math.max(0, Math.min(100, result.score))
    if (!Array.isArray(result.issues)) result.issues = []

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
