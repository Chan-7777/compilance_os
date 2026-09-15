import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts'

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

        // ── Rate limit: 50 calls/user/day ────────────────────────────
        const rl = await checkRateLimit(user.id, 'climatiq-emissions')
        if (!rl.allowed) return rateLimitResponse(rl.limit)

        // ── Parse Payload ────────────────────────────────────────────
        const body = await req.json()
        const { weight_kg, hs_code, origin_country, product_type, destination_country } = body

        if (!weight_kg) {
            return new Response(JSON.stringify({ error: 'Missing weight_kg' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ── CBAM covered product types ───────────────────────────────
        const CBAM_COVERED_PRODUCTS = ['steel', 'aluminium', 'cement', 'chemicals', 'machinery']

        // ── Map product/HS code to Climatiq activity ID ──────────────
        // steel uses the activity ID from Climatiq's own estimate example.
        // The other IDs predate that and have not been checked against the
        // Climatiq data explorer; an unknown ID comes back as a 400 whose
        // message is now passed through to the user.
        const activityMap: Record<string, string> = {
            steel: 'metals-type_steel_section',
            chemicals: 'chemicals-type_basic_chemicals',
            textiles: 'textiles-type_textile_fibre',
            food: 'food_drink_tobacco-type_food_products',
            electronics: 'electrical_equipment-type_electrical_equipment',
            pharma: 'chemicals-type_pharmaceutical',
            automotive: 'motor_vehicles-type_motor_vehicle',
            machinery: 'machinery-type_general_purpose_machinery',
            general: 'manufacturing-type_other_manufactured_goods',
        }

        const activityId = activityMap[product_type || 'general'] || activityMap.general

        // ── Climatiq API Call ─────────────────────────────────────────
        const climatiqKey = Deno.env.get('CLIMATIQ_API_KEY')
        if (!climatiqKey) throw new Error('Missing CLIMATIQ_API_KEY')

        // /data/v1/estimate replaced the unversioned /estimate endpoint, and the
        // Selector now requires data_version. The old request also pinned a UK
        // government source (BEIS) to region IN for 2023, a combination with
        // no matching factor. Ask for the origin region, and accept a broader
        // region or year rather than failing.
        const climatiqResponse = await fetch('https://api.climatiq.io/data/v1/estimate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${climatiqKey}`,
            },
            body: JSON.stringify({
                emission_factor: {
                    activity_id: activityId,
                    data_version: '^33',
                    region: origin_country || 'IN',
                    region_fallback: true,
                    year_fallback: true,
                },
                parameters: {
                    weight: weight_kg,
                    weight_unit: 'kg',
                },
            }),
        })

        if (!climatiqResponse.ok) {
            const errText = await climatiqResponse.text()
            console.error('Climatiq API error:', errText)
            let reason = errText.slice(0, 200)
            try { reason = JSON.parse(errText).message ?? reason } catch { /* not JSON */ }
            throw new Error(`Climatiq returned ${climatiqResponse.status}: ${reason}`)
        }

        const climatiqData = await climatiqResponse.json()

        // ── Return Unified Response ──────────────────────────────────
        return new Response(
            JSON.stringify({
                co2e: climatiqData.co2e ?? 0,
                co2e_unit: climatiqData.co2e_unit || 'kg',
                co2e_tonnes: (climatiqData.co2e ?? 0) / 1000,
                activity_id: activityId,
                source: climatiqData.emission_factor?.source || 'BEIS',
                year: climatiqData.emission_factor?.year || 2023,
                cbam_applicable: destination_country === 'EU' && CBAM_COVERED_PRODUCTS.includes(product_type || ''),
                formatted: `${((climatiqData.co2e ?? 0) / 1000).toFixed(2)} tCO₂e`,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        console.error('Emissions estimate error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
        })
    }
})
