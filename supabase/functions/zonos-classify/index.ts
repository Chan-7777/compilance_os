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
        const { description, destination_country } = body

        if (!description) {
            return new Response(JSON.stringify({ error: 'Missing product description' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ── Zonos GraphQL Classify ────────────────────────────────────
        // Auth: credentialToken header (discovered via introspection)
        // Mutation: classificationsCalculate(input: [ClassificationCalculateInput!]!)
        // Returns: [Classification!]! with hsCode { code }, confidenceScore, description
        const zonosKey = Deno.env.get('ZONOS_API_KEY')
        if (!zonosKey) throw new Error('Missing ZONOS_API_KEY')

        const zonosResponse = await fetch('https://api.zonos.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'credentialToken': zonosKey,
            },
            body: JSON.stringify({
                query: `mutation ($input: [ClassificationCalculateInput!]!) {
          classificationsCalculate(input: $input) {
            id
            hsCode { code }
            confidenceScore
            description
            name
            shipFromCountry
          }
        }`,
                variables: {
                    input: [{
                        name: description.substring(0, 50),
                        description: description,
                        ...(destination_country ? { shipToCountry: destination_country } : {}),
                        countryOfOrigin: 'IN',
                    }]
                },
            }),
        })

        if (!zonosResponse.ok) {
            const errText = await zonosResponse.text()
            console.error('Zonos API error:', errText)
            throw new Error(`Zonos API failed with status ${zonosResponse.status}`)
        }

        const zonosData = await zonosResponse.json()

        if (zonosData.errors && zonosData.errors.length > 0) {
            console.error('Zonos GraphQL errors:', JSON.stringify(zonosData.errors))
            throw new Error(zonosData.errors[0].message || 'Zonos Classify returned errors')
        }

        const classifications = zonosData.data?.classificationsCalculate || []
        const best = classifications[0]

        return new Response(
            JSON.stringify({
                hs_code: best?.hsCode?.code || '9999.99',
                confidence: best?.confidenceScore ? parseFloat(best.confidenceScore) : 0,
                description: best?.description || best?.name || 'Not classified',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Classification error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
        })
    }
})
