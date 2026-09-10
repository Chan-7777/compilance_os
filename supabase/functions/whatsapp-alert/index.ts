import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🚨',
  warning:  '⚠️',
  info:     'ℹ️',
}

function buildMessageText(alert: {
  severity: string
  country: string
  message: string
  date?: string
}): string {
  const emoji = SEVERITY_EMOJI[alert.severity] ?? '📋'
  const date  = alert.date ? ` (${alert.date})` : ''
  return `${emoji} *ComplianceOS Alert*\n\n*${alert.country}*${date}\n${alert.message}\n\n_Sent via ComplianceOS — reply STOP to unsubscribe_`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      to,           // E.164 phone number e.g. "+919876543210"
      severity,     // "critical" | "warning" | "info"
      country,      // display name e.g. "European Union"
      message,      // alert body text
      date,         // optional ISO date string
      alertKey,     // dedup key e.g. "regulation_change:EU:2026-06-29"
      companyId,    // UUID — used for dedup log
    } = await req.json()

    if (!to || !message) {
      throw new Error('Missing required fields: to, message')
    }

    // Dedup check via Supabase (optional — skip if no companyId)
    if (companyId && alertKey) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      const { data: existing } = await supabase
        .from('whatsapp_alert_log')
        .select('id')
        .eq('company_id', companyId)
        .eq('alert_key', alertKey)
        .maybeSingle()

      if (existing) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'already_sent' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const META_TOKEN       = Deno.env.get('META_WHATSAPP_TOKEN')
    const PHONE_NUMBER_ID  = Deno.env.get('META_PHONE_NUMBER_ID')

    let messageId: string | null = null
    let simulated = false

    if (META_TOKEN && PHONE_NUMBER_ID) {
      // Real Meta Cloud API call
      const body = {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: buildMessageText({ severity, country, message, date }) },
      }

      const resp = await fetch(
        `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${META_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )

      const json = await resp.json()
      if (!resp.ok) {
        throw new Error(json?.error?.message ?? `Meta API error ${resp.status}`)
      }
      messageId = json?.messages?.[0]?.id ?? null
    } else {
      // Sandbox mode — log and succeed
      console.log('[whatsapp-alert] SANDBOX — would send to', to, ':', buildMessageText({ severity, country, message, date }))
      simulated = true
      messageId = `sim_${Date.now()}`
    }

    // Write dedup log
    if (companyId && alertKey) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabase.from('whatsapp_alert_log').insert({
        company_id: companyId,
        alert_key: alertKey,
        phone_to: to,
      })
    }

    return new Response(
      JSON.stringify({ success: true, messageId, simulated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
