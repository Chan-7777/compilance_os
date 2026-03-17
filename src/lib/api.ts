import { supabase } from './supabase'
import { calculateRiskScore } from '@/utils/risk-scoring'
import { generateChecklist } from '@/utils/checklist-generator'
import { generateBankReadyDealPack } from './deal-pack'
import { FTA_DATABASE } from '@/data/fta'
import { INDIAN_EXPORT_SCHEMES } from '@/data/indian-schemes'
import { REGULATORY_DB } from '@/data/regulatory-db'
import type { CountryCode, GateCheckResult, GateStatus, APIKeyInfo, Shipment, CompanyProfile, CompanySize } from '@/types'

// ─── Local Helpers ────────────────────────────────────────────

const MFN_RATES: Record<string, number> = {
  EU: 7.5, US: 5.0, UK: 6.0, UAE: 5.0, Japan: 4.0, Australia: 5.0,
}

function getMFNRate(country: string): number {
  return MFN_RATES[country] ?? 5.0
}

// ─── Risk ──────────────────────────────────────────────────────
export function fetchRiskScore(product: string, country: string, companySize: string) {
  const result = calculateRiskScore(product, country, { name: '', size: companySize as CompanySize })
  return Promise.resolve({ ...result, country })
}

// ─── Checklist ─────────────────────────────────────────────────
export function fetchChecklist(product: string, country: string) {
  const items = generateChecklist(product, country)
  return Promise.resolve({ items })
}

// ─── FTA Savings ───────────────────────────────────────────────
export function fetchFTASavings(
  country: string,
  shipmentValue: number,
  _hsCode?: string,
  _product?: string
) {
  const fta = FTA_DATABASE[country as CountryCode]
  const mfnRate = getMFNRate(country)
  const prefRate = fta?.preferentialTariff ? Math.max(0, mfnRate - 3.5) : mfnRate
  return Promise.resolve({
    country,
    agreement: fta?.name,
    mfn_rate: mfnRate,
    preferential_rate: prefRate,
    mfn_duty: shipmentValue * (mfnRate / 100),
    preferential_duty: shipmentValue * (prefRate / 100),
    savings: shipmentValue * ((mfnRate - prefRate) / 100),
  })
}

// ─── HS Lookup ─────────────────────────────────────────────────
export function fetchHSLookup(hsCode: string) {
  return Promise.resolve({ hs_code: hsCode, description: 'HS Lookup (local)' })
}

export async function classifyProductHSCode(description: string, destinationCountry: string) {
  // Call the Supabase Edge Function securely
  const { data, error } = await supabase.functions.invoke('zonos-classify', {
    body: { description, destination_country: destinationCountry },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as {
    hs_code: string
    confidence: number
    description: string
  }
}

// ─── Landed Cost ───────────────────────────────────────────────
export async function calculateLandedCost(
  hsCode: string,
  shipmentValue: number,
  destinationCountry: string,
  originCountry = 'IN',
  currency = 'INR'
) {
  const { data, error } = await supabase.functions.invoke('zonos-landed-cost', {
    body: {
      hs_code: hsCode,
      shipment_value: shipmentValue,
      destination_country: destinationCountry,
      origin_country: originCountry,
      currency,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as {
    duties: Array<{ amount: number; currency: string; description: string; type: string }>
    taxes: Array<{ amount: number; currency: string; description: string; type: string }>
    fees: Array<{ amount: number; currency: string; description: string; type: string }>
    total_duties: number
    total_taxes: number
    total_fees: number
    grand_total: number
    currency: string
  }
}

// ─── CBAM Emissions (Climatiq) ─────────────────────────────────
export async function estimateEmissions(
  weightKg: number,
  hsCode: string,
  originCountry: string,
  productType: string,
  destinationCountry?: string
) {
  const { data, error } = await supabase.functions.invoke('climatiq-emissions', {
    body: {
      weight_kg: weightKg,
      hs_code: hsCode,
      origin_country: originCountry,
      product_type: productType,
      destination_country: destinationCountry,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as {
    co2e: number
    co2e_unit: string
    co2e_tonnes: number
    activity_id: string
    source: string
    year: number
    cbam_applicable: boolean
    formatted: string
  }
}

// ─── Label Vision API ──────────────────────────────────────────
export async function analyzeLabelVision(
  imageBase64: string,
  rules: { id: string; rule: string; guidance: string }[],
  country: string,
  product: string
) {
  const { data, error } = await supabase.functions.invoke('label-vision', {
    body: {
      imageBase64,
      rules,
      country,
      product,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as {
    answers: Record<string, boolean>
    mock: boolean
  }
}

// ─── Batch Risk Score ─────────────────────────────────────────
export function fetchBatchRiskScore(
  product: string,
  countries: string[],
  companySize: string
) {
  const results = countries.map(country => {
    const result = calculateRiskScore(product, country, { name: '', size: companySize as CompanySize })
    return { country, ...result }
  })
  return Promise.resolve({ results })
}

// ─── Batch FTA Savings ────────────────────────────────────────
export function fetchBatchFTASavings(
  countries: string[],
  shipmentValue: number,
  _product?: string,
  _hsCode?: string
) {
  const results = countries.map(country => {
    const fta = FTA_DATABASE[country as CountryCode]
    const mfnRate = getMFNRate(country)
    const prefRate = fta?.preferentialTariff ? Math.max(0, mfnRate - 3.5) : mfnRate
    return {
      country,
      agreement: fta?.name,
      mfn_rate: mfnRate,
      preferential_rate: prefRate,
      mfn_duty: shipmentValue * (mfnRate / 100),
      preferential_duty: shipmentValue * (prefRate / 100),
      savings: shipmentValue * ((mfnRate - prefRate) / 100),
    }
  })
  return Promise.resolve({ results })
}

// ─── Countries ───────────────────────────────────────────────
export function fetchCountries(): Promise<{ countries: Array<{ code: string; name: string; flag: string }> }> {
  const countries = (Object.keys(REGULATORY_DB) as CountryCode[]).map(code => ({
    code: code as string,
    name: REGULATORY_DB[code].name,
    flag: REGULATORY_DB[code].flag,
  }))
  return Promise.resolve({ countries })
}

// ─── FTA Agreements & Export Schemes ─────────────────────────
export function fetchFTAAgreements(): Promise<{ agreements: Array<{
  country_code: string; name: string; status: string; preferential_tariff: boolean;
  effective_date?: string; round?: string; notes?: string
}> }> {
  const agreements = (Object.keys(FTA_DATABASE) as CountryCode[]).map(code => {
    const fta = FTA_DATABASE[code]
    return {
      country_code: code as string,
      name: fta.name,
      status: fta.status as string,
      preferential_tariff: fta.preferentialTariff,
      effective_date: fta.effectiveDate,
      round: fta.round,
      notes: fta.notes,
    }
  })
  return Promise.resolve({ agreements })
}

export function fetchExportSchemes() {
  const schemes = INDIAN_EXPORT_SCHEMES.map(s => ({
    name: s.name,
    description: s.desc,
    status: s.status,
  }))
  return Promise.resolve({ schemes })
}

// ─── Admin: Scraper Status ────────────────────────────────────
export function fetchScraperStatus() {
  return Promise.resolve({ jobs: [] as { name: string; status: string }[] })
}

export function triggerScraper(_scraperName: string) {
  return Promise.resolve({ status: 'ok' })
}

// ─── Compliance Gate (real logic) ─────────────────────────────
export function runGateCheck(
  shipment: Shipment,
  checkedItems: Record<string, boolean> = {},
  companyProfile: CompanyProfile = { name: '', size: 'small' }
): Promise<GateCheckResult> {
  const risk = calculateRiskScore(shipment.product, shipment.country, companyProfile)
  const checklist = generateChecklist(shipment.product, shipment.country)

  const total = checklist.length
  const completed = checklist.filter(c => checkedItems[String(c.id)]).length
  const criticalPending = checklist.filter(
    c => c.priority === 'critical' && !checkedItems[String(c.id)]
  ).length
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0

  const fta = FTA_DATABASE[shipment.country as CountryCode]
  const mfnRate = MFN_RATES[shipment.country] ?? 5.0
  const prefRate = fta?.preferentialTariff ? Math.max(0, mfnRate - 3.5) : mfnRate
  const shipmentValue = shipment.shipmentValue || 0

  // ── Gate decision ─────────────────────────────────────────
  const blockingReasons: string[] = []
  const conditionalReasons: string[] = []

  if (risk.score >= 70) blockingReasons.push(`Risk score is high (${risk.score}/100) — lender approval unlikely`)
  if (criticalPending > 2) blockingReasons.push(`${criticalPending} critical compliance items are incomplete`)
  if (completionPct < 40) blockingReasons.push(`Checklist only ${completionPct}% complete — below 40% minimum`)

  if (risk.score >= 50 && risk.score < 70) conditionalReasons.push(`Moderate risk (${risk.score}/100) — lender review required`)
  if (criticalPending === 1 || criticalPending === 2) conditionalReasons.push(`${criticalPending} critical item(s) pending — resolve before disbursement`)
  if (completionPct >= 40 && completionPct < 75) conditionalReasons.push(`Checklist at ${completionPct}% — complete remaining items before funding`)

  let gate_status: GateStatus
  let activeReasons: string[]

  if (blockingReasons.length > 0) {
    gate_status = 'blocked'
    activeReasons = blockingReasons
  } else if (conditionalReasons.length > 0) {
    gate_status = 'pending'
    activeReasons = conditionalReasons
  } else {
    gate_status = 'approved'
    activeReasons = []
  }

  const result: GateCheckResult = {
    shipment_id: shipment.id,
    gate_status,
    checked_at: new Date().toISOString(),
    blocking_reasons: activeReasons,
    hs_validation: {
      valid: !!shipment.hsCode,
      hs_code: shipment.hsCode || 'Not provided',
      description: shipment.hsCode
        ? `HS code ${shipment.hsCode} provided by exporter`
        : 'HS code not entered — required for customs clearance',
      suggestions: [],
    },
    fta_eligibility: {
      eligible: fta?.preferentialTariff ?? false,
      agreement: fta?.name || 'No active FTA',
      mfn_rate: mfnRate,
      preferential_rate: prefRate,
      potential_savings: fta?.preferentialTariff
        ? Math.round(shipmentValue * ((mfnRate - prefRate) / 100))
        : 0,
    },
    coo_requirement: {
      required: fta?.preferentialTariff ?? false,
      agreement_name: fta?.name || '',
      issuing_authority: 'Federation of Indian Export Organisations (FIEO)',
      document_type: fta?.preferentialTariff
        ? 'Certificate of Origin (Preferential)'
        : 'Certificate of Origin (Non-Preferential)',
    },
    rules_of_origin: {
      applicable: fta?.preferentialTariff ?? false,
      rule_text: fta?.preferentialTariff
        ? 'Product must meet Change in Tariff Classification (CTC) or Value Addition (VA) criteria of min 35%'
        : 'Standard rules of origin apply',
    },
    checklist_progress: {
      completion_percentage: completionPct,
      completed_items: completed,
      total_items: total,
      critical_pending: criticalPending,
    },
  }

  return Promise.resolve(result)
}

export function getGateStatus(shipment: Shipment, checkedItems?: Record<string, boolean>, companyProfile?: CompanyProfile) {
  return runGateCheck(shipment, checkedItems, companyProfile)
}

// ─── Bank-Ready Deal Pack ──────────────────────────────────────
export function generateDealPack(
  shipment: Shipment,
  companyProfile: CompanyProfile,
  checkedItems: Record<string, boolean>
): void {
  generateBankReadyDealPack(shipment, companyProfile, checkedItems)
}

export async function downloadCOOPdf(shipmentId: string, shipment?: Partial<Shipment>): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ref = `COO-${shipmentId.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`
  const today = new Date().toISOString().slice(0, 10)
  const W = 210, margin = 20

  // Border
  doc.setDrawColor(30, 60, 114); doc.setLineWidth(1.2)
  doc.rect(10, 10, W - 20, 277)
  doc.setLineWidth(0.4); doc.rect(12, 12, W - 24, 273)

  // Header band
  doc.setFillColor(30, 60, 114); doc.rect(12, 12, W - 24, 22, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text('CERTIFICATE OF ORIGIN', W / 2, 22, { align: 'center' })
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text('(Non-Preferential)', W / 2, 30, { align: 'center' })

  doc.setTextColor(20, 20, 20)
  doc.setFontSize(9); doc.setFont('helvetica', 'bold')
  doc.text(`Reference No: ${ref}`, margin, 44)
  doc.text(`Date of Issue: ${today}`, W - margin, 44, { align: 'right' })
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
  doc.line(margin, 47, W - margin, 47)

  let y = 53
  const row = (label: string, value: string) => {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
    doc.text(label.toUpperCase(), margin, y)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 20, 20); doc.setFontSize(10)
    doc.text(value || '—', margin, y + 5); y += 14
  }

  row('Exporter / Producer', shipment?.exporterName ?? 'As per company profile')
  row('Consignee', shipment?.buyer ?? 'Foreign Buyer')
  row('Country of Origin', 'India')
  row('Country of Destination', shipment?.country ?? '—')
  row('Description of Goods', shipment?.name ?? shipment?.product ?? '—')
  row('HS Code (RITC)', shipment?.hsCode ?? '—')
  row('Quantity', shipment?.quantity ? `${shipment.quantity} units` : '—')
  row('Invoice Number', `INV-${shipmentId.slice(0, 8).toUpperCase()}`)
  row('Invoice Date', shipment?.date ?? today)
  row('FOB Value (USD)', shipment?.shipmentValue ? `USD ${shipment.shipmentValue.toLocaleString()}` : '—')
  row('Port of Loading', 'JNPT, Mumbai, India')
  row('Transport Mode', shipment?.transportMode ?? 'Sea')

  doc.line(margin, y, W - margin, y); y += 6
  doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(60, 60, 60)
  const decl = 'The undersigned hereby declares that the above details are correct, that all goods were produced in India and comply with the origin requirements specified in trade agreements applicable to exports from India.'
  const lines = doc.splitTextToSize(decl, W - margin * 2)
  doc.text(lines, margin, y); y += lines.length * 4 + 10

  // Issuing authority box
  doc.setFillColor(245, 247, 252); doc.setDrawColor(30, 60, 114); doc.setLineWidth(0.5)
  doc.rect(margin, y, W - margin * 2, 28, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 60, 114)
  doc.text('Issuing Authority', margin + 4, y + 7)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 20, 20); doc.setFontSize(9)
  doc.text('Federation of Indian Export Organisations (FIEO)', margin + 4, y + 14)
  doc.text('/ Export Inspection Council (EIC) / Chamber of Commerce', margin + 4, y + 20)
  y += 36

  // Signature lines
  const sigY = Math.min(y + 10, 265)
  doc.setDrawColor(80, 80, 80)
  doc.line(margin, sigY, margin + 55, sigY)
  doc.line(W - margin - 55, sigY, W - margin, sigY)
  doc.setFontSize(8); doc.setTextColor(80, 80, 80)
  doc.text('Authorised Signatory', margin, sigY + 5)
  doc.text('Stamp & Signature of Issuing Body', W - margin, sigY + 5, { align: 'right' })

  doc.setFontSize(7); doc.setTextColor(150, 150, 150)
  doc.text('Generated by ComplianceOS · For official use, get this countersigned by your Chamber of Commerce or FIEO', W / 2, 284, { align: 'center' })

  return doc.output('blob')
}

export function validateHSCode(hsCode: string, _product?: string) {
  const valid = /^\d{4}(\.\d{2}(\.\d{2})?)?$/.test(hsCode)
  return Promise.resolve({
    valid,
    hs_code: hsCode,
    description: valid ? 'Valid HS code format' : 'Invalid HS code format',
  })
}

// ─── Alerts & Intelligence ──────────────────────────────────────
export async function fetchAlerts(countries: string[], products: string[], offset = 0) {
  // Query regulatory_changes directly — faster and avoids edge function auth issues
  let query = supabase
    .from('regulatory_changes')
    .select('id, country_code, country_name, flag, title, change_description, source_url, source_name, severity, alert_type, product_tags, date, scraped_at')
    .order('scraped_at', { ascending: false })
    .range(offset, offset + 99)

  if (countries.length > 0) {
    query = query.in('country_code', countries)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const rows = data ?? []

  // Boost product-matched alerts to top
  const sorted = [...rows].sort((a, b) => {
    const aMatch = products.some(p => (a.product_tags ?? []).includes(p)) ? 1 : 0
    const bMatch = products.some(p => (b.product_tags ?? []).includes(p)) ? 1 : 0
    if (bMatch !== aMatch) return bMatch - aMatch
    const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
    return (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2)
  })

  const alerts = sorted.map((row, idx) => ({
    id: idx + 1,
    type: row.alert_type ?? 'regulation_change',
    severity: row.severity,
    country: row.country_code,
    countryName: row.country_name ?? row.country_code,
    flag: row.flag ?? '🌐',
    date: row.date,
    message: row.title ? `${row.title}: ${row.change_description}` : row.change_description,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
  }))

  return { alerts }
}

// ─── Customs Filing ─────────────────────────────────────────────
export async function generateCustomsPayload(shipment: Partial<Shipment>) {
  const { data, error } = await supabase.functions.invoke('customs-filing', {
    body: { shipment },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as {
    status: string
    reference_number: string
    payload_generated: any
    timestamp: string
  }
}

// ─── Document OCR (Invoice/BoL) ───────────────────────────────
export async function processInvoiceOCR(fileBase64: string, filename: string) {
  const { data, error } = await supabase.functions.invoke('document-ocr', {
    body: { fileBase64, filename },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as {
    success: boolean
    data: {
      name: string
      product: string
      description: string
      country: string
      origin: string
      value: number
      currency: string
      weight: number
      hsCode: string
    }
  }
}

// ─── WhatsApp Vendor Outreach (CBAM Scope 3) ──────────────────
export async function sendWhatsAppOutreach(vendorData: {
  phoneNumber: string
  vendorName: string
  product: string
  companyName: string
}) {
  const { data, error } = await supabase.functions.invoke('whatsapp-vendor-outreach', {
    body: vendorData,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as {
    success: boolean
    message: string
    simulated_meta_payload: any
  }
}

// ─── TReDS Trade Financing ───────────────────────────────────
export async function submitTReDSFinancing(financingData: {
  seller: { iec?: string }
  buyer: { name: string }
  invoiceValue: number
  currency?: string
  referenceNumber: string
}) {
  const { data, error } = await supabase.functions.invoke('treds-financing', {
    body: financingData,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as {
    success: boolean
    message: string
    fu_id: string
    simulated_payload: any
  }
}

// ─── API Keys (localStorage-persisted) ───────────────────────
const API_KEYS_STORE = 'cos_api_keys'

function loadKeys(): APIKeyInfo[] {
  try {
    const raw = localStorage.getItem(API_KEYS_STORE)
    return raw ? (JSON.parse(raw) as APIKeyInfo[]) : []
  } catch {
    return []
  }
}

function saveKeys(keys: APIKeyInfo[]): void {
  localStorage.setItem(API_KEYS_STORE, JSON.stringify(keys))
}

export function fetchAPIKeys(): Promise<APIKeyInfo[]> {
  return Promise.resolve(loadKeys())
}

export function createAPIKey(name: string): Promise<{ key: string; id: string }> {
  const id = `key-${Date.now()}`
  // Generate a secure-looking key using crypto.getRandomValues
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const key = `cos_${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40)}`
  const newKey: APIKeyInfo = {
    id,
    name,
    key_prefix: key.slice(0, 12),
    created_at: new Date().toISOString(),
    rate_limit: 1000,
    permissions: ['read'],
  }
  saveKeys([...loadKeys(), newKey])
  return Promise.resolve({ key, id })
}

export function revokeAPIKey(id: string): Promise<void> {
  saveKeys(loadKeys().filter(k => k.id !== id))
  return Promise.resolve(undefined as void)
}
