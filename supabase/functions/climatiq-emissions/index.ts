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
        const { weight_kg, hs_code, origin_country, product_type, destination_country } = body

        if (!weight_kg) {
            return new Response(JSON.stringify({ error: 'Missing weight_kg' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ── CBAM covered product types ───────────────────────────────
        const CBAM_COVERED_PRODUCTS = ['steel', 'aluminium', 'cement', 'chemicals', 'machinery']

        // ── Map product/HS code to Climatiq activity ID ──────────────
        // Climatiq uses specific activity_ids for different commodity types.
        // This mapping covers the main ComplianceOS product categories.
        const activityMap: Record<string, string> = {
            steel: 'steel-type_steel_product_hot_rolled_coil',
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

        const climatiqResponse = await fetch('https://api.climatiq.io/estimate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${climatiqKey}`,
            },
            body: JSON.stringify({
                emission_factor: {
                    activity_id: activityId,
                    source: 'BEIS',
                    region: origin_country || 'IN',
                    year: 2023,
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
            throw new Error(`Climatiq API failed: ${climatiqResponse.status}`)
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
