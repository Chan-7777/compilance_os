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
    const { fileBase64, filename } = await req.json()

    if (!fileBase64 || !filename) {
      throw new Error('Missing file data or filename')
    }

    // In a real implementation:
    // 1. const AWS_TEXTRACT_KEY = Deno.env.get('AWS_TEXTRACT_KEY') || Deno.env.get('PARSEUR_API_KEY')
    // 2. Decode the base64 string and send a POST request to the IDP API
    // 3. Receive the bounding boxes and text blocks
    // 4. Use an LLM (or regex) to map the unstructured text to our JSON schema

    // Simulate network delay for OCR processing (IDP APIs can take a few seconds)
    await new Promise(resolve => setTimeout(resolve, 2500))

    // Mock IDP extraction logic
    // We intentionally return structured data that perfectly matches the ComplianceOS Shipment form
    // to simulate a perfect "zero data entry" user experience.
    const extractedData = {
      name: `Imported from ${filename}`,
      product: 'machinery', // Best guess based on invoice contents
      description: 'Industrial Air Compressor (Model AC-200X)',
      country: 'EU',
      origin: 'IN',
      value: 12500,
      currency: 'USD',
      weight: 450,
      hsCode: '841480',
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        message: 'Invoice parsed successfully via simulated IDP',
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
