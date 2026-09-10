// ============================================================================
// razorpay-webhook
// Receives Razorpay payment events and upgrades the company plan on success.
//
// Razorpay Dashboard → Webhooks → add this function URL.
// Subscribe to: payment_link.paid
//
// Required Supabase secrets:
//   RAZORPAY_WEBHOOK_SECRET — the secret you set in Razorpay webhook settings
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const sigBytes = new Uint8Array(
      (signature.match(/../g) ?? []).map(h => parseInt(h, 16))
    )
    return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(body))
  } catch {
    return false
  }
}

const VALID_PLANS = new Set(['growth', 'enterprise'])

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not set')
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }

    const signature = req.headers.get('x-razorpay-signature') ?? ''
    const bodyText = await req.text()

    const valid = await verifySignature(bodyText, signature, webhookSecret)
    if (!valid) {
      console.warn('Invalid Razorpay webhook signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }

    const event = JSON.parse(bodyText)
    const eventType: string = event.event ?? ''

    // We only care about successful payments on payment links
    if (eventType !== 'payment_link.paid') {
      return new Response(JSON.stringify({ received: true, action: 'ignored', event: eventType }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }

    const notes = event.payload?.payment_link?.entity?.notes ?? {}
    const companyId: string = notes.company_id ?? ''
    const plan: string = notes.plan ?? ''

    if (!companyId || !VALID_PLANS.has(plan)) {
      console.error('Missing or invalid company_id/plan in webhook notes', { companyId, plan })
      return new Response(JSON.stringify({ error: 'Missing company_id or plan in notes' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: updateErr } = await supabase
      .from('companies')
      .update({ plan, updated_at: new Date().toISOString() })
      .eq('id', companyId)

    if (updateErr) {
      console.error('Failed to update company plan:', updateErr)
      return new Response(JSON.stringify({ error: 'DB update failed', detail: updateErr.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Plan updated: company=${companyId} → ${plan}`)
    return new Response(
      JSON.stringify({ received: true, company_id: companyId, plan_set: plan }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('razorpay-webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
