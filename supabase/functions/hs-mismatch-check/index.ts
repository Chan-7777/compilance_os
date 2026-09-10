import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Anthropic from "npm:@anthropic-ai/sdk@latest"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a senior CESTAT (Customs, Excise, Service Tax Appellate Tribunal) classification expert specialising in Indian export compliance under the Customs Act 1962 and the Harmonized System of Nomenclature (HSN).

Your task: determine whether a declared HS code accurately describes the product. You must flag misdeclaration, misclassification, and potential Customs investigation triggers.

Common misdeclaration patterns you must catch:
- Declaring processed goods as raw materials to claim higher RoDTEP or drawback
- Using a lower-duty chapter code for a higher-duty product (e.g., coding steel articles as scrap)
- Splitting shipments across HS codes to avoid scrutiny thresholds
- Incorrect chapter headings for dual-use items (e.g., chemicals that could be pharma vs industrial)
- Textile articles misdeclared to avoid quota or anti-dumping duties
- Electronics classified as components instead of finished goods

Respond ONLY with a valid JSON object — no markdown, no explanation outside the JSON:
{
  "mismatch": boolean,
  "risk": "high" | "medium" | "low" | "clear",
  "confidence": 0-100,
  "currentCode": {
    "code": "XXXX.XX",
    "description": "Official HSN description for declared code"
  },
  "suggestedCodes": [
    {
      "code": "XXXX.XX",
      "description": "Official HSN description",
      "reason": "Why this is a better fit",
      "confidence": 0-100
    }
  ],
  "findings": ["specific finding 1", "specific finding 2"],
  "penaltyRisk": "Description of potential penalty under Section 111/112/114AA of Customs Act if misdeclaration confirmed",
  "summary": "One-sentence plain-language summary of the verdict"
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      hsCode,
      productDescription,
      product,
      invoiceValue,
      destinationCountry,
      quantity,
      unit,
    } = await req.json()

    if (!hsCode || !productDescription) {
      throw new Error('Missing required fields: hsCode, productDescription')
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const client = new Anthropic({ apiKey: anthropicKey })

    const userMessage = [
      `Declared HS Code: ${hsCode}`,
      `Product Description: ${productDescription}`,
      product     ? `Product Category: ${product}` : null,
      invoiceValue ? `Invoice Value: USD ${invoiceValue}` : null,
      destinationCountry ? `Destination: ${destinationCountry}` : null,
      quantity && unit ? `Quantity: ${quantity} ${unit}` : null,
    ].filter(Boolean).join('\n')

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    const raw = (textBlock as { type: 'text'; text: string }).text.trim()
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const result = JSON.parse(clean)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
