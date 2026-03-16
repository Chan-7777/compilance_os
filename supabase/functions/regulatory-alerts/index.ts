// ============================================================
// regulatory-alerts
// Returns live alerts from regulatory_changes table (populated
// by fetch-regulatory-feeds every 6 hours).
// Falls back to curated static alerts only if DB has no data yet.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Static fallback (shown before first feed fetch runs) ─────────────────────
const STATIC_FALLBACK = [
  {
    id: 1, alert_type: 'deadline', severity: 'critical',
    country_code: 'EU', country_name: 'European Union', flag: '🇪🇺',
    date: new Date().toISOString().split('T')[0],
    title: 'CBAM quarterly emissions report',
    change_description: 'CBAM quarterly emissions report due for all imported covered goods (steel, aluminium, cement, fertilizers, electricity, hydrogen).',
    source_url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    source_name: 'EU Taxation & Customs',
    product_tags: ['steel', 'chemicals'],
  },
  {
    id: 2, alert_type: 'regulation_change', severity: 'critical',
    country_code: 'US', country_name: 'United States', flag: '🇺🇸',
    date: new Date().toISOString().split('T')[0],
    title: 'UFLPA forced-labor supply chain scrutiny',
    change_description: 'UFLPA forced-labor scrutiny increasing on textile and automotive component imports. Withhold Release Orders (WROs) being issued.',
    source_url: 'https://www.cbp.gov/trade/forced-labor/UFLPA',
    source_name: 'US CBP Forced Labor',
    product_tags: ['textiles'],
  },
  {
    id: 3, alert_type: 'fta_update', severity: 'info',
    country_code: 'UK', country_name: 'United Kingdom', flag: '🇬🇧',
    date: '2024-11-15',
    title: 'India-UK FTA negotiations final round',
    change_description: 'India-UK Free Trade Agreement negotiations enter final round. Preferential tariffs expected on textiles, pharmaceuticals, and engineering goods.',
    source_url: 'https://www.gov.uk/government/collections/uk-india-free-trade-agreement',
    source_name: 'UK HMRC',
    product_tags: ['textiles', 'chemicals'],
  },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse payload ───────────────────────────────────────────────────────
    const body = await req.json()
    const countries: string[] = body.countries ?? []
    const products: string[] = body.products ?? []

    // ── Query regulatory_changes DB ─────────────────────────────────────────
    let query = supabaseClient
      .from('regulatory_changes')
      .select('id, country_code, country_name, flag, title, change_description, source_url, source_name, severity, alert_type, product_tags, date, scraped_at')
      .order('scraped_at', { ascending: false })
      .limit(50)

    // Filter by user's selected countries if provided
    if (countries.length > 0) {
      query = query.in('country_code', countries)
    }

    const { data: dbAlerts, error: dbError } = await query

    if (dbError) {
      console.error('DB query error:', dbError.message)
    }

    // ── Format DB rows into Alert shape ─────────────────────────────────────
    let alerts: any[] = []

    if (dbAlerts && dbAlerts.length > 0) {
      // Optionally boost alerts matching the user's product tags
      const sorted = [...dbAlerts].sort((a, b) => {
        const aMatch = products.some(p => (a.product_tags ?? []).includes(p)) ? 1 : 0
        const bMatch = products.some(p => (b.product_tags ?? []).includes(p)) ? 1 : 0
        if (bMatch !== aMatch) return bMatch - aMatch
        // Then sort critical first
        const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
        return (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2)
      })

      alerts = sorted.map((row, idx) => ({
        id: idx + 1,
        type: row.alert_type ?? 'regulation_change',
        severity: row.severity,
        country: row.country_code,
        countryName: row.country_name ?? row.country_code,
        flag: row.flag ?? '🌐',
        date: row.date,
        message: row.title
          ? `${row.title}: ${row.change_description}`
          : row.change_description,
        sourceUrl: row.source_url,
        sourceName: row.source_name,
      }))
    } else {
      // ── Fallback: static alerts filtered by user's countries ───────────────
      console.log('No DB alerts found — using static fallback')
      const filtered = countries.length === 0
        ? STATIC_FALLBACK
        : STATIC_FALLBACK.filter(a => countries.includes(a.country_code))

      alerts = (filtered.length > 0 ? filtered : STATIC_FALLBACK).map((a, idx) => ({
        id: idx + 1,
        type: a.alert_type,
        severity: a.severity,
        country: a.country_code,
        countryName: a.country_name,
        flag: a.flag,
        date: a.date,
        message: `${a.title}: ${a.change_description}`,
        sourceUrl: a.source_url,
        sourceName: a.source_name,
      }))
    }

    return new Response(
      JSON.stringify({ alerts, source: dbAlerts && dbAlerts.length > 0 ? 'live' : 'fallback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )

  } catch (error: any) {
    console.error('Regulatory alerts error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
