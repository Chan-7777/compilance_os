import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@latest'
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COUNTRY_MAP: Record<string, string> = {
  'US': 'US', 'USA': 'US', 'UNITED STATES': 'US',
  'EU': 'EU', 'EUROPEAN UNION': 'EU', 'DE': 'EU', 'FR': 'EU', 'NL': 'EU',
  'UK': 'UK', 'GB': 'UK', 'UNITED KINGDOM': 'UK',
  'UAE': 'UAE', 'AE': 'UAE', 'UNITED ARAB EMIRATES': 'UAE',
  'JP': 'Japan', 'JAPAN': 'Japan',
  'AU': 'Australia', 'AUSTRALIA': 'Australia',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
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
    if (!fileBase64 || !filename) throw new Error('Missing file data or filename')

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY is not configured')

    const ext = filename.split('.').pop()?.toLowerCase()
    let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
    if (ext === 'png') mediaType = 'image/png'
    else if (ext === 'webp') mediaType = 'image/webp'

    // Strip data URI prefix if present — Claude SDK wants raw base64
    const rawBase64 = fileBase64.startsWith('data:')
      ? fileBase64.split(',')[1]
      : fileBase64

    const anthropic = new Anthropic({ apiKey: anthropicKey })

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: rawBase64 },
            },
            {
              type: 'text',
              text: `You are a strict JSON-only Trade Compliance Data Extractor.
Extract the following fields from this trade document (Commercial Invoice, Bill of Lading, Packing List, or similar).
Return ONLY a valid JSON object — no markdown, no explanation:

{
  "name": "short internal shipment name based on the document",
  "product": "one of: steel, textiles, machinery, agricultural, electronics, chemicals — or a generic noun",
  "description": "short description of the goods",
  "country": "destination country code (e.g. US, EU, UK, UAE)",
  "origin": "origin country code — likely IN for Indian exports",
  "value": <total shipment value as a number>,
  "currency": "3-letter currency code (USD, INR, EUR, etc.)",
  "weight": <total weight in kg as a number>,
  "hsCode": "HS code, 6–8 digits if found"
}

Filename: ${filename}
If a field is not found, use smart defaults (origin = IN) or empty string / 0. No markdown blocks.`,
            },
          ],
        },
      ],
    })

    const content = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    // Strip any accidental markdown fences
    let jsonStr = content
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) jsonStr = fenceMatch[1].trim()

    let extractedData: Record<string, unknown>
    try {
      extractedData = JSON.parse(jsonStr)
    } catch {
      throw new Error('AI returned invalid JSON — please try again or upload a clearer image')
    }

    const warnings: string[] = []

    if (typeof extractedData.name !== 'string' || (extractedData.name as string).length < 2) {
      extractedData.name = `Invoice from ${filename}`
    }
    if (typeof extractedData.product !== 'string' || !extractedData.product) {
      extractedData.product = 'general'
      warnings.push('Product type could not be identified — defaulted to general')
    }
    if (typeof extractedData.description !== 'string') extractedData.description = ''
    if (typeof extractedData.country !== 'string' || !extractedData.country) {
      warnings.push('Destination country not found — please set manually')
      extractedData.country = ''
    }

    if (extractedData.country) {
      const mapped = COUNTRY_MAP[(extractedData.country as string).toUpperCase().trim()]
      if (mapped) extractedData.country = mapped
      else warnings.push(`Unrecognized country "${extractedData.country}" — please verify`)
    }

    if (typeof extractedData.value !== 'number' || isNaN(extractedData.value as number) || (extractedData.value as number) < 0) {
      warnings.push('Shipment value not found — please enter manually')
      extractedData.value = 0
    }
    if (typeof extractedData.weight !== 'number' || isNaN(extractedData.weight as number) || (extractedData.weight as number) < 0) {
      extractedData.weight = 0
    }

    if (extractedData.hsCode) {
      const hsClean = String(extractedData.hsCode).replace(/[^0-9]/g, '')
      if (hsClean.length >= 4) {
        extractedData.hsCode = hsClean.length >= 6
          ? `${hsClean.slice(0, 4)}.${hsClean.slice(4, 6)}${hsClean.length > 6 ? '.' + hsClean.slice(6) : ''}`
          : hsClean
      } else {
        warnings.push('HS Code found but too short — please verify')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        warnings: warnings.length > 0 ? warnings : undefined,
        message: warnings.length > 0
          ? `Invoice parsed with ${warnings.length} warning(s). Please review highlighted fields.`
          : 'Invoice parsed successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
