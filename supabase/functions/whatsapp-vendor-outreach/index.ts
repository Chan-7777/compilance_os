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
    const { phoneNumber, vendorName, product, companyName } = await req.json()

    if (!phoneNumber || !vendorName) {
      throw new Error('Missing vendor phone number or name')
    }

    // --- REAL IMPLEMENTATION NOTES ---
    // 1. const META_WHATSAPP_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN')
    // 2. const PHONE_NUMBER_ID = Deno.env.get('META_PHONE_NUMBER_ID')
    // 3. POST https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages
    //
    // --- ASYNC WEBHOOK SETUP ---
    // A separate Edge Function (`whatsapp-webhook`) would be needed to receive POST requests
    // from Meta when the vendor replies. It would use an LLM to parse the replied unstructured 
    // text (e.g., "we used 5 tons of coal") into structured JSON and save it to the DB against this supplier's ID.

    const mockPayload = {
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "template",
      template: {
        name: "cbam_scope_3_data_request",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: vendorName },
              { type: "text", text: companyName || "ComplianceOS Exporter" },
              { type: "text", text: product || "your supplied materials" }
            ]
          }
        ]
      }
    }

    // Simulate Network API Latency
    await new Promise(resolve => setTimeout(resolve, 800))

    return new Response(
      JSON.stringify({
        success: true,
        message: `Template message successfully queued to ${phoneNumber}.`,
        simulated_meta_payload: mockPayload
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
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
