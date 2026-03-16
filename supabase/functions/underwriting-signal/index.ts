// ============================================================================
// Underwriting Signal API — exposes compliance score as an HTTP endpoint
// for financing platforms (Ben Finserv, TReDS, lenders, etc.)
//
// Usage:
//   GET /functions/v1/underwriting-signal?product=steel&country=EU&companySize=small
//   Header: x-api-key: cos_<your-api-key>
//
// Response: JSON compliance signal with risk score, gate status, FTA, CBAM
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// ── Embedded scoring logic (mirrors client-side risk-scoring.ts) ────────────
// Kept inline so the edge function is self-contained with no bundler needed.

const CBAM_PRODUCTS = ['steel', 'chemicals', 'aluminium', 'cement', 'fertilizer', 'electricity']
const MFN_RATES: Record<string, number> = {
  EU: 7.5, US: 5.0, UK: 6.0, UAE: 5.0, Japan: 4.0, Australia: 5.0,
}
const FTA_PREFERENTIAL: Record<string, boolean> = {
  EU: false, US: false, UK: false, UAE: true, Japan: true, Australia: true,
}
const FTA_NAMES: Record<string, string> = {
  EU: 'India-EU FTA (Under Negotiation)',
  US: 'No active FTA',
  UK: 'India-UK FTA (Under Negotiation)',
  UAE: 'India-UAE CEPA',
  Japan: 'India-Japan CEPA',
  Australia: 'India-Australia ECTA',
}
const CBAM_ACTIVE_COUNTRIES = ['EU']

function computeRiskScore(product: string, country: string, companySize: string): number {
  let score = 0

  // CBAM
  if (CBAM_ACTIVE_COUNTRIES.includes(country)) {
    score += CBAM_PRODUCTS.includes(product) ? 30 : 5
  }

  // Certifications burden (proxy by country complexity)
  const certBurden: Record<string, number> = { EU: 15, US: 10, UK: 12, UAE: 8, Japan: 13, Australia: 8 }
  score += certBurden[country] ?? 8

  // Sanctions screening required
  score += 10

  // ESG
  if (['EU', 'US', 'UK'].includes(country)) score += 15

  // FTA bonus
  if (FTA_PREFERENTIAL[country]) score -= 5

  // Company size modifier
  if (companySize === 'micro' || companySize === 'small') score += 10

  return Math.max(0, Math.min(100, score))
}

function computeGateStatus(riskScore: number, checklistPct: number, criticalPending: number): string {
  if (riskScore >= 70 || criticalPending > 2 || checklistPct < 40) return 'blocked'
  if (riskScore >= 50 || criticalPending > 0 || checklistPct < 75) return 'conditional'
  return 'approved'
}

// ── API Key validation ──────────────────────────────────────────────────────
// Keys are stored in Supabase table `api_keys` with columns:
//   id, name, key_hash, key_prefix, created_at, last_used_at, permissions
// For now we validate the key format and check against the DB.

async function validateApiKey(apiKey: string, supabaseClient: any): Promise<boolean> {
  if (!apiKey || !apiKey.startsWith('cos_')) return false

  // Look up by prefix (first 12 chars)
  const prefix = apiKey.slice(0, 12)
  const { data, error } = await supabaseClient
    .from('api_keys')
    .select('id, key_prefix')
    .eq('key_prefix', prefix)
    .maybeSingle()

  if (error || !data) return false

  // Update last_used_at
  await supabaseClient
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return true
}

// ── Handler ─────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth ────────────────────────────────────────────────────
    const apiKey = req.headers.get('x-api-key') || ''

    // Init Supabase admin client for key lookup
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const isValid = await validateApiKey(apiKey, supabase)
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing API key. Pass x-api-key header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Parse params ────────────────────────────────────────────
    const url = new URL(req.url)

    // Support both GET (query params) and POST (JSON body)
    let product: string, country: string, companySize: string, shipmentValue: number

    if (req.method === 'POST') {
      const body = await req.json()
      product = (body.product || 'general').toLowerCase()
      country = (body.country || 'EU').toUpperCase()
      companySize = (body.company_size || 'small').toLowerCase()
      shipmentValue = Number(body.shipment_value) || 0
    } else {
      product = (url.searchParams.get('product') || 'general').toLowerCase()
      country = (url.searchParams.get('country') || 'EU').toUpperCase()
      companySize = (url.searchParams.get('company_size') || 'small').toLowerCase()
      shipmentValue = Number(url.searchParams.get('shipment_value')) || 0
    }

    // ── Compute signal ──────────────────────────────────────────
    const riskScore = computeRiskScore(product, country, companySize)
    const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low'

    // Checklist defaults (exporter hasn't checked anything — conservative)
    const checklistPct = 0
    const criticalPending = 5
    const gateStatus = computeGateStatus(riskScore, checklistPct, criticalPending)

    const ftaEligible = FTA_PREFERENTIAL[country] ?? false
    const mfnRate = MFN_RATES[country] ?? 5.0
    const prefRate = ftaEligible ? Math.max(0, mfnRate - 3.5) : mfnRate
    const ftaSavings = ftaEligible && shipmentValue > 0
      ? Math.round(shipmentValue * ((mfnRate - prefRate) / 100))
      : 0

    const cbamApplicable = CBAM_ACTIVE_COUNTRIES.includes(country) && CBAM_PRODUCTS.includes(product)

    const signal = {
      // ── Core signal ──
      compliance_score: riskScore,
      risk_level: riskLevel,
      gate_status: gateStatus,

      // ── Financing eligibility ──
      financing_eligible: gateStatus !== 'blocked',
      financing_condition: gateStatus === 'approved'
        ? 'Eligible for pre-shipment financing'
        : gateStatus === 'conditional'
          ? 'Conditional — compliance gaps must be resolved before disbursement'
          : 'Not eligible — significant compliance risks identified',

      // ── Trade intelligence ──
      fta: {
        eligible: ftaEligible,
        agreement: FTA_NAMES[country] || 'No active FTA',
        mfn_rate_pct: mfnRate,
        preferential_rate_pct: prefRate,
        estimated_duty_savings_inr: ftaSavings,
      },

      // ── Carbon exposure ──
      cbam: {
        applicable: cbamApplicable,
        note: cbamApplicable
          ? 'Product subject to EU Carbon Border Adjustment. Emissions declaration required.'
          : 'Product not currently in CBAM scope.',
      },

      // ── Metadata ──
      meta: {
        product,
        country,
        company_size: companySize,
        shipment_value_inr: shipmentValue,
        generated_at: new Date().toISOString(),
        api_version: '1.0',
        powered_by: 'ComplianceOS Export Intelligence',
      },
    }

    return new Response(JSON.stringify(signal, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
