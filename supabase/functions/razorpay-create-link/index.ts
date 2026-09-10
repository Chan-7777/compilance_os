// ============================================================================
// razorpay-create-link
// Creates a Razorpay Payment Link for a ComplianceOS plan upgrade.
//
// POST { plan: 'growth'|'enterprise', amount_paise: number, callback_url: string }
// Returns { payment_link_url: string }
//
// Required Supabase secrets:
//   RAZORPAY_KEY_ID      — from Razorpay Dashboard → Settings → API Keys
//   RAZORPAY_KEY_SECRET  — same location
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  growth: 'ComplianceOS Growth Plan — Monthly (unlimited shipments, gate check, FTA, CBAM)',
  enterprise: 'ComplianceOS Enterprise Plan — Monthly (Growth + API access + priority support)',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userErr } = await supabaseClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('company_id, companies(name)')
      .eq('id', user.id)
      .single()

    const { plan, amount_paise, callback_url } = await req.json()

    if (!plan || !amount_paise) {
      return new Response(JSON.stringify({ error: 'Missing plan or amount_paise' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: 'Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Supabase secrets.' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const credentials = btoa(`${keyId}:${keySecret}`)
    const companyName = (profile?.companies as any)?.name ?? user.email

    const body = {
      amount: amount_paise,
      currency: 'INR',
      description: PLAN_DESCRIPTIONS[plan] ?? `ComplianceOS ${plan} Plan`,
      customer: { email: user.email, name: companyName },
      notify: { email: true },
      reminder_enable: false,
      notes: {
        company_id: profile?.company_id ?? '',
        plan,
        user_id: user.id,
      },
      callback_url: callback_url ?? 'https://app.complianceos.in/?payment=success',
      callback_method: 'get',
    }

    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Razorpay API error ${response.status}: ${errText}`)
    }

    const link = await response.json()

    return new Response(
      JSON.stringify({ payment_link_url: link.short_url, payment_link_id: link.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('razorpay-create-link error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
