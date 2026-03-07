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
        const { hs_code, shipment_value, origin_country, destination_country, currency } = body

        if (!hs_code || !shipment_value || !destination_country) {
            return new Response(JSON.stringify({ error: 'Missing required fields: hs_code, shipment_value, destination_country' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ── Zonos GraphQL Landed Cost ────────────────────────────────
        // Auth: credentialToken header (discovered via introspection)
        const zonosKey = Deno.env.get('ZONOS_API_KEY')
        if (!zonosKey) throw new Error('Missing ZONOS_API_KEY')

        const zonosResponse = await fetch('https://api.zonos.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'credentialToken': zonosKey,
            },
            body: JSON.stringify({
                query: `mutation ($input: LandedCostCalculateInput!) {
          landedCostCalculate(input: $input) {
            id
            duties { amount currency description type }
            taxes { amount currency description type }
            fees { amount currency description type }
            amountSubtotals {
              duties
              taxes
              fees
              items
            }
          }
        }`,
                variables: {
                    input: {
                        items: [{
                            hsCode: hs_code,
                            amount: shipment_value,
                            currencyCode: currency || 'INR',
                            countryOfOrigin: origin_country || 'IN',
                            description: `Shipment item ${hs_code}`,
                        }],
                        shipToCountry: destination_country,
                        shipFromCountry: origin_country || 'IN',
                    },
                },
            }),
        })

        if (!zonosResponse.ok) {
            const errText = await zonosResponse.text()
            console.error('Zonos Landed Cost API error:', errText)
            throw new Error(`Zonos API failed: ${zonosResponse.status}`)
        }

        const zonosData = await zonosResponse.json()

        if (zonosData.errors && zonosData.errors.length > 0) {
            console.error('Zonos GraphQL errors:', JSON.stringify(zonosData.errors))
            throw new Error(zonosData.errors[0].message || 'Zonos Landed Cost returned errors')
        }

        const lc = zonosData.data?.landedCostCalculate
        const subs = lc?.amountSubtotals || {}

        return new Response(
            JSON.stringify({
                duties: lc?.duties || [],
                taxes: lc?.taxes || [],
                fees: lc?.fees || [],
                total_duties: subs.duties ?? 0,
                total_taxes: subs.taxes ?? 0,
                total_fees: subs.fees ?? 0,
                grand_total: (subs.items ?? 0) + (subs.duties ?? 0) + (subs.taxes ?? 0) + (subs.fees ?? 0),
                currency: currency || 'INR',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        console.error('Landed cost error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
        })
    }
})
