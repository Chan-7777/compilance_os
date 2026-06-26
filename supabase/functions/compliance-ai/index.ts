// ============================================================
// compliance-ai — Claude Opus 4.8 powered compliance Q&A
// Called from the app to explain checklist items, answer
// RoDTEP/CBAM questions, or handle free-form compliance queries.
//
// POST { item?, question?, hsCode?, product?, countries? }
// Returns { answer: string }
// ============================================================

import Anthropic from 'npm:@anthropic-ai/sdk@latest'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a senior trade compliance consultant specialising in Indian export regulations. You advise Indian exporters on customs compliance, documentation, and regulatory requirements.

You have expert knowledge of:
- DGFT Foreign Trade Policy 2023 and its notifications
- RoDTEP (Notification No. 60 dated 23.02.2026) — rates by HS code chapter
- CBAM (EU Regulation 2023/956) — covered sectors, CBAM certificates, reporting since Jan 2026
- Indian Customs Act 1962, ICEGATE Shipping Bill procedures (CACHE01 format)
- FSSAI for food products, BIS for electronics/industrial, CDSCO for pharma/cosmetics
- EIC, APEDA, MPEDA export inspection bodies
- FTA certificates of origin: ASEAN Form D, UAE CEPA Form, Australia ECTA Form, UK-India interim
- OFAC/EU sanctions screening requirements

When explaining a checklist item:
1. What the requirement is and which regulation mandates it (cite the exact act/notification/regulation number)
2. Exactly what the exporter needs to do — the specific document, test, agency, or action
3. Where to get it, who issues it, and the approximate cost and timeline
4. Any common mistakes Indian exporters make with this requirement

Always be specific. If you don't know a specific fee or timeline, say so and point to the authoritative source.
Keep answers under 200 words — the exporter needs to take action, not read a textbook.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { item, question, hsCode, product, countries } = await req.json()
    const marketList = Array.isArray(countries) ? countries.join(', ') : (countries ?? 'Not specified')

    let userPrompt: string
    if (item) {
      userPrompt = `I am an Indian exporter. My compliance checklist has this item:

"${item}"

My product: ${product ?? 'Not specified'}
HS code: ${hsCode ?? 'Not specified'}
Target markets: ${marketList}

Explain:
1. What this requirement is and WHY (which regulation/notification number mandates it)
2. Exactly what I need to do — the specific document, test, or action
3. Where to get it, who issues it, cost and timeline
4. Common mistakes Indian exporters make here`
    } else if (question) {
      userPrompt = `Question from an Indian exporter:

${question}

Product: ${product ?? 'Not specified'}
HS code: ${hsCode ?? 'Not specified'}
Target markets: ${marketList}`
    } else {
      return new Response(JSON.stringify({ error: 'Provide either item or question' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({ apiKey: anthropicKey })
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content.find(b => b.type === 'text')?.text ?? ''

    return new Response(
      JSON.stringify({ answer: text, usage: message.usage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('compliance-ai error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
