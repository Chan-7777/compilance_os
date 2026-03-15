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

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    // Determine mime type broadly (assume jpeg if not recognized, just for the data URI)
    let mimeType = 'image/jpeg'
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'png') mimeType = 'image/png'
    else if (ext === 'webp') mimeType = 'image/webp'
    else if (ext === 'pdf') mimeType = 'application/pdf' // Note: GPT-4o API natively supports images. 
    // If it's a PDF, we might need a different approach, but for this implementation we will pass 
    // it to the vision model via high-res image or assume it's an image upload for now.
    // For robust PDF parsing we'd normally convert pages to images first or use Assistants API, 
    // but we'll try the direct base64 image approach.

    const systemPrompt = `You are a strict JSON-only Trade Compliance Data Extractor. 
The user will upload an image of a Commercial Invoice, Bill of Lading, or similar trade document.
Extract the following information and return ONLY a valid JSON object matching this exact TypeScript structure:
{
  "name": "string", // A short internal name for the shipment based on the document, e.g., 'Imported from [filename]'
  "product": "string", // Match closely to one of these broad categories if possible: 'steel', 'textiles', 'machinery', 'agricultural', 'electronics', 'chemicals', or returning a generic noun.
  "description": "string", // A short description of the goods
  "country": "string", // Destination country code (e.g., 'US', 'EU', 'GB', 'UAE')
  "origin": "string", // Origin country code (e.g., 'IN')
  "value": number, // Total numerical value of the shipment
  "currency": "string", // 3-letter currency code (e.g., 'USD', 'INR', 'EUR')
  "weight": number, // Total weight as a number, preferably in kg
  "hsCode": "string" // The HS Code (preferably 6 to 8 digits if found)
}
If a value is not found, make a smart guess based on the context (e.g. Origin is likely IN for Indian exports), or leave it empty string/0. Do not wrap the JSON in markdown blocks.`

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Filename: ${filename}\nExtract the data from this document:` },
              {
                type: 'image_url',
                image_url: {
                  url: fileBase64.startsWith('data:') ? fileBase64 : `data:${mimeType};base64,${fileBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
      })
    })

    if (!openAiResponse.ok) {
        const err = await openAiResponse.text()
        console.error("OpenAI API Error:", err)
        throw new Error(`OpenAI API failed: ${openAiResponse.statusText}`)
    }

    const aiData = await openAiResponse.json()
    const content = aiData.choices[0].message.content.trim()
    
    // Clean potential markdown blocks
    let jsonStr = content
    if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace("```json", "").replace("```", "").trim()
    } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace("```", "").replace("```", "").trim()
    }

    const extractedData = JSON.parse(jsonStr)

    // Ensure name is meaningful
    if (!extractedData.name || extractedData.name.length < 2) {
        extractedData.name = `Imported from ${filename}`
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        message: 'Invoice parsed successfully via GPT-4o',
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
