import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLIMATIQ = 'https://api.climatiq.io/data/v1'
const DATA_VERSION = '^33'

// Used only when no EU CBAM default value matches the HS code.
// steel is Climatiq's documented example activity; the others predate it and
// have not been checked against the Climatiq data explorer.
const GENERIC_ACTIVITY: Record<string, string> = {
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

const CBAM_COVERED_PRODUCTS = ['steel', 'aluminium', 'cement', 'chemicals', 'machinery']

interface FactorChoice {
    kind: 'cbam_default' | 'generic'
    activity_id: string
    source?: string
    region?: string
    year?: number
    name?: string
    cn_code?: string
}

// Climatiq carries the EU's CBAM default values per exporting country, one
// factor per CN code, with the CN code written into the description. Pick the
// factor whose CN code is the longest prefix of the HS code; ties go to the
// newest year.
async function findCbamDefault(hsCode: string, region: string, key: string): Promise<FactorChoice | null> {
    const digits = (hsCode ?? '').replace(/\D/g, '')
    if (digits.length < 4) return null

    const params = new URLSearchParams({
        query: digits.slice(0, 4),
        data_version: DATA_VERSION,
        source: 'CBAM',
        region,
        unit_type: 'Weight',
        results_per_page: '100',
    })
    const res = await fetch(`${CLIMATIQ}/search?${params}`, { headers: { Authorization: `Bearer ${key}` } })
    if (!res.ok) {
        console.error('Climatiq search failed:', res.status, await res.text())
        return null
    }

    const json = await res.json()
    let best: FactorChoice | null = null
    for (const r of json.results ?? []) {
        const match = String(r.description ?? '').match(/CN code:\s*([0-9 ]+)/)
        if (!match) continue
        const cn = match[1].replace(/\s/g, '')
        if (!cn || !digits.startsWith(cn)) continue

        const bestLen = best?.cn_code?.length ?? 0
        const newer = (r.year ?? 0) > (best?.year ?? 0)
        if (cn.length > bestLen || (cn.length === bestLen && newer)) {
            best = {
                kind: 'cbam_default',
                activity_id: r.activity_id,
                source: r.source,
                region: r.region,
                year: r.year,
                name: r.name,
                cn_code: cn,
            }
        }
    }
    return best
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

        const climatiqKey = Deno.env.get('CLIMATIQ_API_KEY')
        if (!climatiqKey) throw new Error('Missing CLIMATIQ_API_KEY')

        const region = origin_country || 'IN'

        // ── Choose the emission factor ───────────────────────────────
        // Prefer the EU CBAM default value for this HS code and origin; fall
        // back to a generic product factor. Climatiq rejects region_fallback
        // and year_fallback together, and year_fallback needs a year, so the
        // generic path uses region_fallback alone.
        const choice: FactorChoice = (await findCbamDefault(hs_code, region, climatiqKey)) ?? {
            kind: 'generic',
            activity_id: GENERIC_ACTIVITY[product_type || 'general'] || GENERIC_ACTIVITY.general,
        }

        const emissionFactor = choice.kind === 'cbam_default'
            ? { activity_id: choice.activity_id, data_version: DATA_VERSION, source: choice.source, region: choice.region, year: choice.year }
            : { activity_id: choice.activity_id, data_version: DATA_VERSION, region, region_fallback: true }

        const climatiqResponse = await fetch(`${CLIMATIQ}/estimate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${climatiqKey}`,
            },
            body: JSON.stringify({
                emission_factor: emissionFactor,
                parameters: { weight: weight_kg, weight_unit: 'kg' },
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
        const ef = climatiqData.emission_factor ?? {}
        const co2e = climatiqData.co2e ?? 0

        // ── Return Unified Response ──────────────────────────────────
        return new Response(
            JSON.stringify({
                co2e,
                co2e_unit: climatiqData.co2e_unit || 'kg',
                co2e_tonnes: co2e / 1000,
                activity_id: ef.activity_id ?? choice.activity_id,
                source: ef.source ?? choice.source ?? 'Climatiq',
                year: ef.year ?? choice.year ?? null,
                region: ef.region ?? choice.region ?? null,
                factor_kind: choice.kind,
                factor_name: ef.name ?? choice.name ?? null,
                cn_code: choice.cn_code ?? null,
                cbam_applicable: destination_country === 'EU' && CBAM_COVERED_PRODUCTS.includes(product_type || ''),
                formatted: `${(co2e / 1000).toFixed(2)} tCO₂e`,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        console.error('Emissions estimate error:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
        })
    }
})
