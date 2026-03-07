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
        const { products, countries } = body

        // ── Get Alerts (Mocked for Demo but struct returns live format)
        // In a real production system, this would query a regulatory RSS feed 
        // or an API like NewsCatcher / LexisNexis Regulatory
        // For this build, we aggregate smart alerts based on the exact user context.

        const allAlerts = []
        let idCounter = 1

        // Global EU Rules
        if (countries?.includes('EU') || countries?.length === 0) {
            allAlerts.push({
                id: idCounter++,
                type: 'deadline',
                severity: 'critical',
                country: 'EU',
                countryName: 'European Union',
                flag: '🇪🇺',
                date: new Date().toISOString().split('T')[0],
                message: 'CBAM quarterly emissions report due next week for all imported covered goods.',
            })

            if (products?.includes('food') || products?.includes('agricultural')) {
                allAlerts.push({
                    id: idCounter++,
                    type: 'regulation_change',
                    severity: 'warning',
                    country: 'EU',
                    countryName: 'European Union',
                    flag: '🇪🇺',
                    date: '2024-12-30',
                    message: 'EUDR (Deforestation Regulation) enforcement delay. Additional guidance published for traceability.',
                })
            }
        }

        // US Rules
        if (countries?.includes('US') || countries?.length === 0) {
            allAlerts.push({
                id: idCounter++,
                type: 'regulation_change',
                severity: 'critical',
                country: 'US',
                countryName: 'United States',
                flag: '🇺🇸',
                date: new Date().toISOString().split('T')[0],
                message: 'UFLPA forced-labor scrutiny increasing on textile and automotive component imports.',
            })
        }

        // UK Rules
        if (countries?.includes('GB') || countries?.length === 0) {
            allAlerts.push({
                id: idCounter++,
                type: 'fta_update',
                severity: 'info',
                country: 'GB',
                countryName: 'United Kingdom',
                flag: '🇬🇧',
                date: '2024-11-15',
                message: 'India-UK Free Trade Agreement negotiations enter final round; preferential tariffs expected on textiles.',
            })
        }

        // Default generic alert if no specific ones match
        if (allAlerts.length === 0) {
            allAlerts.push({
                id: idCounter++,
                type: 'info',
                severity: 'info',
                country: 'GLOBAL',
                countryName: 'International',
                flag: '🌐',
                date: new Date().toISOString().split('T')[0],
                message: 'Monitoring global trade compliance updates for your product categories.',
            })
        }

        return new Response(
            JSON.stringify({ alerts: allAlerts }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error('Regulatory alerts error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
        })
    }
})
