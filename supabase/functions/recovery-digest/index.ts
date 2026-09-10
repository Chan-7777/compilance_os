// ============================================================
// recovery-digest
// Monthly (pg_cron, 1st of month) — for every company with a
// WhatsApp number and recovery_digest = true, totals unclaimed
// RoDTEP across their shipping bills, counts deadlines inside 90
// days and rejected claims, and sends one WhatsApp summary.
// Reuses the whatsapp_alert_log for dedup (one digest per month).
//
// Invoked with the service-role key (cron) — no per-user auth.
// Can also be POSTed { companyId } to send one company's digest
// on demand (e.g. "send me my report now" from Settings).
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FX_TO_INR: Record<string, number> = { INR: 1, USD: 84, EUR: 91, GBP: 107, AED: 23 }

function fmtINR(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(2)} L`
  return `₹${Math.round(v).toLocaleString('en-IN')}`
}

interface Ship {
  date: string
  shipment_value: number
  value_currency: string | null
  rodtep_rate: number | null
  rodtep_match_type: string | null
  rodtep_claim_status: string | null
  rodtep_claimed: boolean
}

function summarise(ships: Ship[]) {
  const now = Date.now()
  let unclaimed = 0, unclaimedCount = 0, filingReady = 0, urgent = 0, rejected = 0, credited = 0, notInSchedule = 0
  for (const s of ships) {
    const status = s.rodtep_claim_status ?? (s.rodtep_claimed ? 'filed' : 'unclaimed')
    const rate = Number(s.rodtep_rate ?? 0)
    if (rate <= 0) continue
    const inr = Number(s.shipment_value) * (FX_TO_INR[(s.value_currency ?? 'USD').toUpperCase()] ?? 84)
    const ent = Math.round(inr * (rate / 100))
    if (status === 'credited') { credited += ent; continue }
    if (status === 'filed') continue
    if (status === 'rejected') rejected++
    unclaimed += ent; unclaimedCount++
    if (s.rodtep_match_type === 'default') notInSchedule++; else filingReady += ent
    const dl = new Date(s.date); dl.setFullYear(dl.getFullYear() + 1)
    const daysLeft = (dl.getTime() - now) / 86_400_000
    if (daysLeft >= 0 && daysLeft <= 90) urgent++
  }
  return { unclaimed, unclaimedCount, filingReady, urgent, rejected, credited, notInSchedule }
}

function buildMessage(company: string, month: string, s: ReturnType<typeof summarise>): string {
  const lines = [
    `📊 *ComplianceOS — ${month} Recovery Report*`,
    `*${company}*`,
    '',
    `Unclaimed RoDTEP: *${fmtINR(s.unclaimed)}* across ${s.unclaimedCount} shipping bill${s.unclaimedCount === 1 ? '' : 's'}`,
    `Filing-ready now: *${fmtINR(s.filingReady)}*`,
  ]
  if (s.urgent > 0) lines.push(`⏰ ${s.urgent} claim${s.urgent === 1 ? '' : 's'} expire within 90 days — file these first`)
  if (s.rejected > 0) lines.push(`🚨 ${s.rejected} rejected claim${s.rejected === 1 ? '' : 's'} need rectification — reply "HELP" and we'll walk you through it`)
  if (s.notInSchedule > 0) lines.push(`⚠️ ${s.notInSchedule} shipment${s.notInSchedule === 1 ? '' : 's'} with HS codes not in Appendix 4R — needs a manual check`)
  if (s.credited > 0) lines.push(`✅ Credited to date: ${fmtINR(s.credited)}`)
  lines.push('', 'Open ComplianceOS → RoDTEP Recovery to download your claim register.', '_Reply STOP to unsubscribe_')
  return lines.join('\n')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    let onlyCompany: string | undefined = body?.companyId

    // ── Auth: cron (service role) may run for everyone; a signed-in user may
    //    only trigger their own company's digest on demand.
    const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const isServiceRole = bearer === SERVICE_KEY
    if (!isServiceRole) {
      const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: `Bearer ${bearer}` } } })
      const { data: { user } } = await userClient.auth.getUser()
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const { data: prof } = await supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
      if (!prof?.company_id) return new Response(JSON.stringify({ error: 'No company' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      onlyCompany = prof.company_id
    }

    let q = supabase
      .from('companies')
      .select('id, name, whatsapp_number, whatsapp_alerts, recovery_digest')
      .not('whatsapp_number', 'is', null)
      .eq('recovery_digest', true)
    if (onlyCompany) q = q.eq('id', onlyCompany)
    const { data: companies, error: cErr } = await q
    if (cErr) throw cErr

    const now = new Date()
    const month = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    const alertKey = `recovery_digest:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const META_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN')
    const PHONE_NUMBER_ID = Deno.env.get('META_PHONE_NUMBER_ID')

    const results: Array<{ companyId: string; sent: boolean; skipped?: string; unclaimed?: number }> = []

    for (const co of companies ?? []) {
      // Dedup: one digest per company per month (unless forced on-demand)
      if (!onlyCompany) {
        const { data: dup } = await supabase.from('whatsapp_alert_log')
          .select('id').eq('company_id', co.id).eq('alert_key', alertKey).maybeSingle()
        if (dup) { results.push({ companyId: co.id, sent: false, skipped: 'already_sent' }); continue }
      }

      const { data: ships } = await supabase
        .from('shipments')
        .select('date, shipment_value, value_currency, rodtep_rate, rodtep_match_type, rodtep_claim_status, rodtep_claimed')
        .eq('company_id', co.id)
        .not('hs_code', 'is', null)
        .not('shipment_value', 'is', null)
      const s = summarise((ships ?? []) as Ship[])
      if (s.unclaimedCount === 0 && s.rejected === 0) { results.push({ companyId: co.id, sent: false, skipped: 'nothing_to_report' }); continue }

      const text = buildMessage(co.name, month, s)
      const to = String(co.whatsapp_number).replace(/\D/g, '')

      if (META_TOKEN && PHONE_NUMBER_ID) {
        const resp = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
        })
        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}))
          console.error('[recovery-digest] Meta error for', co.id, j?.error?.message ?? resp.status)
          results.push({ companyId: co.id, sent: false, skipped: 'meta_error' }); continue
        }
      } else {
        console.log('[recovery-digest] SANDBOX — would send to', to, '\n', text)
      }

      await supabase.from('whatsapp_alert_log').insert({
        company_id: co.id, alert_key: onlyCompany ? `${alertKey}:manual:${Date.now()}` : alertKey, phone_to: to,
      })
      results.push({ companyId: co.id, sent: true, unclaimed: s.unclaimed })
    }

    return new Response(JSON.stringify({ success: true, month, simulated: !(META_TOKEN && PHONE_NUMBER_ID), results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})
