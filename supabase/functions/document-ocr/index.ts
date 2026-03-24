import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts'

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
    // ── Auth + rate limit ────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user } } = await anonClient.auth.getUser()
      if (user) {
        const rl = await checkRateLimit(user.id, 'document-ocr')
        if (!rl.allowed) return rateLimitResponse(rl.limit)
      }
    }

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

    let extractedData: any
    try {
      extractedData = JSON.parse(jsonStr)
    } catch (parseErr) {
      throw new Error('AI returned invalid JSON — please try again or upload a clearer image')
    }

    // Validate and sanitize extracted data
    const warnings: string[] = []

    // Ensure required string fields are proper strings
    if (typeof extractedData.name !== 'string' || extractedData.name.length < 2) {
      extractedData.name = `Imported from ${filename}`
    }
    if (typeof extractedData.product !== 'string' || !extractedData.product) {
      extractedData.product = 'general'
      warnings.push('Product type could not be identified — defaulted to general')
    }
    if (typeof extractedData.description !== 'string') {
      extractedData.description = ''
    }
    if (typeof extractedData.country !== 'string' || !extractedData.country) {
      warnings.push('Destination country not found in document — please set manually')
      extractedData.country = ''
    }

    // Validate country code — must be one of our supported codes or map common ones
    const COUNTRY_MAP: Record<string, string> = {
      'US': 'US', 'USA': 'US', 'UNITED STATES': 'US',
      'EU': 'EU', 'EUROPEAN UNION': 'EU', 'DE': 'EU', 'FR': 'EU', 'NL': 'EU',
      'UK': 'UK', 'GB': 'UK', 'UNITED KINGDOM': 'UK',
      'UAE': 'UAE', 'AE': 'UAE', 'UNITED ARAB EMIRATES': 'UAE',
      'JP': 'Japan', 'JAPAN': 'Japan',
      'AU': 'Australia', 'AUSTRALIA': 'Australia',
    }
    if (extractedData.country) {
      const normalized = COUNTRY_MAP[extractedData.country.toUpperCase().trim()]
      if (normalized) {
        extractedData.country = normalized
      } else {
        warnings.push(`Unrecognized country code "${extractedData.country}" — please verify`)
      }
    }

    // Validate numeric fields
    if (typeof extractedData.value !== 'number' || isNaN(extractedData.value) || extractedData.value < 0) {
      warnings.push('Shipment value not found or invalid — please enter manually')
      extractedData.value = 0
    }
    if (typeof extractedData.weight !== 'number' || isNaN(extractedData.weight) || extractedData.weight < 0) {
      extractedData.weight = 0
    }

    // Validate HS code — should be numeric digits, 6-8 chars
    if (extractedData.hsCode) {
      const hsClean = String(extractedData.hsCode).replace(/[^0-9]/g, '')
      if (hsClean.length >= 4) {
        // Format with dot: XXXX.XX or XXXX.XX.XX
        extractedData.hsCode = hsClean.length >= 6
          ? `${hsClean.slice(0,4)}.${hsClean.slice(4,6)}${hsClean.length > 6 ? '.' + hsClean.slice(6) : ''}`
          : hsClean
      } else {
        warnings.push('HS Code found but appears too short — please verify')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        warnings: warnings.length > 0 ? warnings : undefined,
        message: warnings.length > 0
          ? `Invoice parsed with ${warnings.length} warning(s). Please review highlighted fields.`
          : 'Invoice parsed successfully via GPT-4o',
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
