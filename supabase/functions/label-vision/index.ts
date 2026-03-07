import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── Auth ──────────────────────────────────────────────────────
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

        // ── Parse Payload ────────────────────────────────────────────
        const body = await req.json()
        const { imageBase64, rules, country, product } = body

        if (!imageBase64 || !rules || !Array.isArray(rules)) {
            return new Response(JSON.stringify({ error: 'Missing imageBase64 or rules array' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ── OpenAI Vision API ─────────────────────────────────────────
        const openAIApiKey = Deno.env.get('OPENAI_API_KEY')

        // Fallback if no real API key is present: simulate the AI response
        if (!openAIApiKey || openAIApiKey.startsWith('sk-test') || openAIApiKey === '') {
            console.log('No valid OPENAI_API_KEY found, returning MOCK validation results.')
            const mockResult: Record<string, boolean> = {}

            // Simulate that most rules pass, but a couple fail randomly for realism
            rules.forEach((rule: any, idx: number) => {
                // Make the second or third rule fail to demonstrate UI capability
                mockResult[rule.id] = (idx !== 1 && idx !== 2)
            })

            // Simulate network delay of 2.5 seconds to feel like an AI processing it
            await new Promise(r => setTimeout(r, 2500))

            return new Response(
                JSON.stringify({ answers: mockResult, mock: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        const systemPrompt = `You are a compliance officer reviewing product labels for customs clearance. 
Product Category: ${product}
Destination Country: ${country}

Evaluate the provided label artwork against the compliance rules below.
Respond ONLY with a JSON object containing a single key "results" which is an array of objects.
Each object must have exactly two fields: "id" (the rule id string) and "compliant" (boolean: true if fulfilled, false otherwise).

Rules to evaluate:
${rules.map((r: any) => `- ID: ${r.id}\n  Rule: ${r.rule}\n  Guidance: ${r.guidance}`).join('\n\n')}`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAIApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Please evaluate this label artwork. Output JSON with a "results" array.' },
                            { type: 'image_url', image_url: { url: imageBase64 } }
                        ]
                    }
                ],
                max_tokens: 1500,
                temperature: 0.1,
                response_format: { type: 'json_object' }
            })
        })

        if (!response.ok) {
            const errorData = await response.text()
            console.error('OpenAI API Error:', errorData)
            throw new Error(`OpenAI API failed: ${response.status}`)
        }

        const aiData = await response.json()
        const content = aiData.choices[0].message.content

        let parsedArr: any[] = []
        try {
            const parsed = JSON.parse(content)
            if (parsed.results && Array.isArray(parsed.results)) {
                parsedArr = parsed.results
            } else {
                throw new Error('Missing "results" array in JSON response')
            }
        } catch (e) {
            console.error('Failed to parse OpenAI JSON response:', content)
            throw new Error('Failed to parse AI validation results')
        }

        const answers: Record<string, boolean> = {}
        parsedArr.forEach((item: any) => {
            if (item && item.id && typeof item.compliant === 'boolean') {
                answers[item.id] = item.compliant
            }
        })

        // If any rules were missing from AI response, assume true
        rules.forEach((r: any) => {
            if (answers[r.id] === undefined) {
                answers[r.id] = true
            }
        })

        return new Response(
            JSON.stringify({ answers, mock: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error('Label Vision error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
        })
    }
})
