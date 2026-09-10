import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { seller, buyer, invoiceValue, currency, referenceNumber } = await req.json()

    if (!seller || !buyer || !invoiceValue || !referenceNumber) {
      throw new Error('Missing required invoice or trading party details')
    }

    const tredsApiKey =
      Deno.env.get('RXIL_API_KEY') ?? Deno.env.get('INVOICEMART_API_KEY')

    if (!tredsApiKey) {
      // No TReDS platform is connected. Refuse rather than returning a
      // fabricated reference id and promising an advisor callback that
      // nothing in this system would ever produce.
      return new Response(
        JSON.stringify({
          error:
            'TReDS financing is not connected. Set RXIL_API_KEY or INVOICEMART_API_KEY in Supabase secrets to enable it.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503,
        }
      )
    }

    // TODO: with a key present, map to the TReDS Factoring Unit schema and POST
    // it to RXIL or Invoicemart, then return the FU id the platform issues.
    // Until that exists, do not pretend a submission happened.
    return new Response(
      JSON.stringify({
        error:
          'TReDS submission is not implemented yet. A key is configured but no factoring unit was created.',
        factoring_unit_draft: {
          seller_iec: seller.iec,
          buyer_name: buyer.name,
          currency: currency || 'INR',
          base_amount: invoiceValue,
          customs_reference: referenceNumber,
          terms: '30_DAYS_NET',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 501,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
