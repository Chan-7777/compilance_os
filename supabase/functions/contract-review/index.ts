// ============================================================
// contract-review
// AI-powered export contract analysis for Indian exporters.
// Covers: Sale Contracts, LCs, Freight Agreements, Bank Guarantees
//
// POST {
//   contractText?: string,          // pasted text
//   base64?: string,                 // image/PDF as base64 data URI
//   fileName?: string,
//   contractType: 'sale_contract'|'letter_of_credit'|'freight_agreement'|'bank_guarantee'|'insurance_policy'|'other',
//   partyPosition: 'exporter'|'buyer',
//   counterpartyCountry?: string
// }
// Returns ContractReviewResult
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@latest'
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  sale_contract: 'Export Sale Contract / Purchase Order',
  letter_of_credit: 'Letter of Credit (Documentary Credit)',
  freight_agreement: 'Freight Forwarder / Shipping Agreement',
  bank_guarantee: 'Bank Guarantee / Standby LC',
  insurance_policy: 'Marine / Cargo Insurance Policy',
  other: 'Trade Document',
}

function buildSystemPrompt(contractType: string, partyPosition: string, counterpartyCountry?: string): string {
  const typeLabel = CONTRACT_TYPE_LABELS[contractType] ?? 'trade document'
  const position = partyPosition === 'exporter' ? 'Indian Exporter (Seller)' : 'Buyer (Importer)'

  const counterpartyNote = counterpartyCountry
    ? `Counterparty country: ${counterpartyCountry}. ${NON_RECIPROCATING.includes(counterpartyCountry.toUpperCase()) ? `IMPORTANT: ${counterpartyCountry} is NOT a reciprocating territory under CPC Section 44-A — foreign court judgments from this country CANNOT be directly enforced in India; flag any governing law / jurisdiction clause choosing this country as CRITICAL.` : ''}`
    : ''

  return `You are a senior Indian trade finance and export compliance lawyer with 20 years of experience reviewing export contracts for Indian exporters. You are advising an Indian SME exporter who is frequently sued by foreign buyers and needs maximum contractual protection.

You are reviewing a ${typeLabel} from the perspective of the ${position}.
${counterpartyNote}

═══════════════════════════════════════════════════════
LEGAL FRAMEWORK — apply all of the following
═══════════════════════════════════════════════════════

FEMA & RBI (UPDATED 2025-2026):
- FEMA 23(R)/2026-RB: export proceeds must be realised within 15 months from shipment (extended from 9 months — November 2025 update)
- AD Banks can grant extensions of up to 6 months at a time without RBI reference
- Advance payment against exports: liberalised up to USD 10M with simple declaration to AD Bank
- Self write-off: exporters can write off up to 10% of annual export proceeds with CA certificate to AD Bank
- Buyer delays causing FEMA violations are recoverable as damages if the contract has the right clause

INDIAN CONTRACT ACT 1872:
- Section 28: Clauses that ABSOLUTELY restrict a party from enforcing rights are void — always frame as "sole and exclusive remedy," never "no recourse whatsoever"
- Sections 73-74: Liquidated damages must be a genuine pre-estimate of loss (ONGC v. SAW Pipes 2003 5 SCC 705) — include recital that LD amount "represents a genuine pre-estimate agreed between commercially sophisticated parties"
- Limitation of liability clauses ARE enforceable in B2B export contracts (Bharathi Knitting Co. v. DHL 1996 4 SCC 704)
- Acceptance-on-use principle: buyer cannot reject goods after putting them to use (Remi Sales v. Godrej & Boyce, Bombay HC 2023)

UCP 600 (LETTERS OF CREDIT):
- Soft clauses (conditions only buyer/applicant can fulfil) render an LC non-operative — CRITICAL flag
- Documents must strictly comply; banks pay on conforming documents regardless of underlying trade dispute
- Confirming bank requirement eliminates issuing-bank country risk
- Always specify UCP 600 by express reference; RBI/FEMA timelines take precedence over UCP terms

INCOTERMS 2020:
- FOB: risk transfers at port of loading; seller has no insurance obligation beyond this point
- CIF/CIP: seller arranges and pays for insurance to destination — but risk still transfers at origin
- DDP: seller responsible for all import duties, taxes, and customs clearance at destination — extreme exposure
- EXW: minimal seller obligations but minimal payment security
- DAP/DAT: check if seller can practically deliver to named destination

ARBITRATION (preference order for Indian SME exporters):
- SIAC 2025 Rules: best for Southeast Asia/Japan/Korea buyers; disputes <SGD 1M qualify for Streamlined Procedure (3-month award, capped fees ~INR 24L); seat = Singapore
- DIAC: best for UAE/Gulf buyers; UAE is a reciprocating territory under CPC 44-A — awards directly enforceable in India
- ICC 2021 Rules: best for Europe/Americas buyers; globally enforceable
- Indian domestic (MCIA/DIAC India): for disputes <INR 1 crore; fastest
- ALWAYS specify: (1) Indian law governs the substantive contract, (2) English is the arbitration language, (3) number of arbitrators

RECIPROCATING TERRITORIES (CPC Section 44-A — direct enforcement in India):
UK, Singapore, UAE, Malaysia, New Zealand, Bangladesh, Hong Kong, Fiji, Trinidad and Tobago.
NON-RECIPROCATING (fresh Indian suit required): USA, Germany, China, France, most others.

JURISDICTION TRAPS — flag as CRITICAL if present:
1. Governing law = USA/Germany/China/France (non-reciprocating)
2. Exclusive jurisdiction of foreign courts in non-reciprocating territory
3. Buyer's standard T&Cs govern (likely contain jurisdiction traps and unlimited deduction rights)
4. No dispute resolution clause at all

INSPECTION & ACCEPTANCE:
- Pre-shipment inspection by SGS/BV/Intertek alone does NOT bar post-delivery quality claims unless contract explicitly says the PSI certificate is "final and conclusive"
- "Acceptance on use" principle: once buyer uses goods, right to reject is extinguished
- Time bars shorter than Limitation Act's 3-year default ARE enforceable in B2B export contracts

ECGC:
- ECGC covers: buyer insolvency, protracted default (4 months past due), political risk; pays 90% of loss
- CRITICAL: coverage only extends to the written, pre-approved BUYER-SPECIFIC credit limit — paying full premium on higher shipment value does NOT create higher coverage (Prakruthi Products v. ECGC, Karnataka HC 2024)
- Contract must contain ECGC consent/subrogation clause for clean claim processing

DGFT / FORCE MAJEURE:
- Always include specific DGFT notification carve-out: DGFT trade notices restricting export (wheat, cotton, steel scrap, onions, etc.) must be an enumerated force majeure event
- Post-COVID standard: enumerate port closures, regulatory changes, sanctions, shipping line cancellations as separate FM events
- Include mandatory 5-day notice, mitigation obligation, 60-90 day termination right, payment for goods in transit at termination

═══════════════════════════════════════════════════════
AUTO-FLAG AS CRITICAL (regardless of contract type)
═══════════════════════════════════════════════════════
1. No arbitration clause / vague "amicable settlement" only
2. Governing law = USA, Germany, China, France (non-reciprocating)
3. No limitation of liability cap — exporter exposed to unlimited consequential damages
4. Uncapped indemnification by seller/exporter
5. No time bar on quality/defect claims
6. Unilateral amendment right for buyer
7. LC soft clause (condition only buyer/applicant can fulfil)
8. Open account payment with first-time buyer (no ECGC limit in place)
9. No force majeure clause or clause without DGFT regulatory event carve-out
10. Payment terms beyond 15 months from shipment (FEMA violation risk)
11. DDP INCOTERMS without explicit limit on import duty liability
12. Buyer's standard T&Cs govern without seller's counter-terms

═══════════════════════════════════════════════════════
OUTPUT FORMAT — return ONLY valid JSON (no markdown)
═══════════════════════════════════════════════════════
{
  "verdict": "clear" | "review" | "risky",
  "risk_score": <0-100, 0=excellent, 100=do not sign>,
  "contract_type_detected": "<what type you identified>",
  "summary": "<3-4 sentences: what the contract is, biggest risk, #1 action>",
  "red_flags": [
    {
      "clause": "<clause title or section>",
      "current_text": "<brief quote or paraphrase>",
      "risk": "<specific risk for the exporter>",
      "severity": "critical" | "high" | "medium" | "low"
    }
  ],
  "key_terms": [
    {
      "term": "<term name>",
      "value": "<as stated in contract>",
      "market_standard": "<what is typical>",
      "rating": "favourable" | "standard" | "unfavourable"
    }
  ],
  "missing_provisions": [
    {
      "provision": "<clause name>",
      "importance": "critical" | "recommended",
      "why": "<why this matters specifically for Indian exporters>",
      "suggested_language": "<ready-to-use clause, 2-5 sentences>"
    }
  ],
  "negotiability": [
    {
      "clause": "<clause name>",
      "current": "<current position>",
      "suggested_change": "<exactly what to ask for>",
      "realistic": "high" | "medium" | "low",
      "reason": "<why this is or isn't negotiable given counterparty country and contract type>"
    }
  ],
  "protective_clauses": [
    {
      "name": "<clause name>",
      "purpose": "<one sentence: what this protects against>",
      "language": "<complete, ready-to-paste clause text, 3-8 sentences>"
    }
  ],
  "rbi_fema_flags": ["<specific FEMA/RBI compliance issue>"],
  "incoterms_notes": "<INCOTERMS analysis if applicable, else null>"
}

Verdict: clear = 0-25 (standard terms, minor issues only), review = 26-60 (notable issues, get these fixed before signing), risky = 61-100 (significant red flags, do not sign without qualified legal review).

For protective_clauses: generate the 3-5 most important protective clauses this specific contract is MISSING or has inadequately drafted, with complete ready-to-use language adapted to the contract type and counterparty country. Prioritise clauses that directly protect against the red flags you identified.`
}

const NON_RECIPROCATING = ['US', 'USA', 'UNITED STATES', 'DE', 'GERMANY', 'CN', 'CHINA', 'FR', 'FRANCE', 'JP', 'JAPAN', 'KR', 'SOUTH KOREA', 'KOREA', 'IT', 'ITALY', 'NL', 'NETHERLANDS', 'BE', 'BELGIUM', 'CH', 'SWITZERLAND', 'AU', 'AUSTRALIA', 'BR', 'BRAZIL', 'CA', 'CANADA']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── Auth + rate limit ─────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user } } = await anonClient.auth.getUser()
      if (user) {
        const rl = await checkRateLimit(user.id, 'contract-review')
        if (!rl.allowed) return rateLimitResponse(rl.limit)
      }
    }

    const { contractText, base64, fileName, contractType, partyPosition, counterpartyCountry } = await req.json()

    if (!contractText && !base64) {
      throw new Error('Provide either contract text or a document image/PDF')
    }
    if (!contractType) throw new Error('contractType is required')
    if (!partyPosition) throw new Error('partyPosition is required')

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY is not configured')

    const anthropic = new Anthropic({ apiKey: anthropicKey })

    const systemPrompt = buildSystemPrompt(contractType, partyPosition, counterpartyCountry)

    // Build message content
    const messageContent: Anthropic.MessageParam['content'] = []

    if (contractText) {
      messageContent.push({
        type: 'text',
        text: `Please review the following contract:\n\n---\n${contractText}\n---`,
      })
    } else if (base64) {
      const name = fileName ?? 'contract'
      const ext = name.split('.').pop()?.toLowerCase()
      let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
      if (ext === 'png') mediaType = 'image/png'
      else if (ext === 'webp') mediaType = 'image/webp'

      const rawBase64 = base64.startsWith('data:') ? base64.split(',')[1] : base64

      messageContent.push({
        type: 'text',
        text: `Please review the following contract document (${CONTRACT_TYPE_LABELS[contractType] ?? contractType}):`,
      })
      messageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: rawBase64 },
      })
    }

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = fenceMatch ? fenceMatch[1].trim() : text

    let result: Record<string, unknown>
    try {
      result = JSON.parse(jsonStr)
    } catch {
      throw new Error('AI returned invalid JSON — please try again')
    }

    // Normalize
    if (!['clear', 'review', 'risky'].includes(result.verdict as string)) result.verdict = 'review'
    if (typeof result.risk_score !== 'number') result.risk_score = 50
    result.risk_score = Math.max(0, Math.min(100, result.risk_score as number))
    if (!Array.isArray(result.red_flags)) result.red_flags = []
    if (!Array.isArray(result.key_terms)) result.key_terms = []
    if (!Array.isArray(result.missing_provisions)) result.missing_provisions = []
    if (!Array.isArray(result.negotiability)) result.negotiability = []
    if (!Array.isArray(result.rbi_fema_flags)) result.rbi_fema_flags = []
    if (!Array.isArray(result.protective_clauses)) result.protective_clauses = []

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
