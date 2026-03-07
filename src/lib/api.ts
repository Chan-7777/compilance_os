import { supabase } from './supabase'
import { calculateRiskScore } from '@/utils/risk-scoring'
import { generateChecklist } from '@/utils/checklist-generator'
import { FTA_DATABASE } from '@/data/fta'
import { INDIAN_EXPORT_SCHEMES } from '@/data/indian-schemes'
import { REGULATORY_DB } from '@/data/regulatory-db'
import type { CountryCode, GateCheckResult, GateStatus, APIKeyInfo } from '@/types'

// ─── Local Helpers ────────────────────────────────────────────

const MFN_RATES: Record<string, number> = {
  EU: 7.5, US: 5.0, UK: 6.0, UAE: 5.0, Japan: 4.0, Australia: 5.0,
}

function getMFNRate(country: string): number {
  return MFN_RATES[country] ?? 5.0
}

// ─── Risk ──────────────────────────────────────────────────────
export function fetchRiskScore(product: string, country: string, companySize: string) {
  const result = calculateRiskScore(product, country, { name: '', size: companySize as any })
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

// ─── Shipments (CRUD via Supabase direct — stubs kept for compat) ──
export function fetchShipments() { return Promise.resolve([] as any[]) }

export function createShipment(data: {
  name: string; product: string; country: string; date: string; notes?: string
}) {
  return Promise.resolve(data as any)
}

export function updateShipment(_id: string, data: Record<string, any>) {
  return Promise.resolve(data as any)
}

export function deleteShipment(_id: string) {
  return Promise.resolve(undefined as void)
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
    console.error('Edge Function invoke error:', error)
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
    console.error('Landed Cost Edge Function error:', error)
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
  productType: string
) {
  const { data, error } = await supabase.functions.invoke('climatiq-emissions', {
    body: {
      weight_kg: weightKg,
      hs_code: hsCode,
      origin_country: originCountry,
      product_type: productType,
    },
  })

  if (error) {
    console.error('Emissions Edge Function error:', error)
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
    console.error('Label Vision Edge Function error:', error)
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
    const result = calculateRiskScore(product, country, { name: '', size: companySize as any })
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
  return Promise.resolve({ jobs: [] as any[] })
}

export function triggerScraper(_scraperName: string) {
  return Promise.resolve({ status: 'ok' })
}

// ─── Compliance Gate (local mock) ──────────────────────────────
export async function runGateCheck(_shipmentId: string): Promise<GateCheckResult> {
  // Simulate processing delay
  await new Promise(r => setTimeout(r, 1200))
  return {
    shipment_id: _shipmentId,
    gate_status: 'approved' as GateStatus,
    checked_at: new Date().toISOString(),
    hs_validation: { valid: true, hs_code: '7208.51', description: 'HS code validated against WCO Harmonized System database', suggestions: [] },
    fta_eligibility: {
      eligible: true,
      agreement: 'India-UAE CEPA',
      mfn_rate: 5,
      preferential_rate: 1.5,
      potential_savings: 50000,
    },
    coo_requirement: {
      required: true,
      agreement_name: 'India-UAE CEPA',
      issuing_authority: 'Federation of Indian Export Organisations (FIEO)',
      document_type: 'Certificate of Origin (Non-Preferential)',
    },
    rules_of_origin: {
      applicable: true,
      rule_text: 'Product must meet Change in Tariff Classification (CTC) or Value Addition (VA) criteria of min 35%',
    },
    checklist_progress: {
      completion_percentage: 85,
      completed_items: 17,
      total_items: 20,
      critical_pending: 1,
    },
    blocking_reasons: [] as string[],
  }
}

export function getGateStatus(shipmentId: string) {
  return runGateCheck(shipmentId)
}

export async function downloadCOOPdf(shipmentId: string): Promise<Blob> {
  const content = [
    'CERTIFICATE OF ORIGIN (Non-Preferential)',
    '',
    `Reference: COO-${shipmentId}-${Date.now()}`,
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    '',
    'Issuing Authority: Federation of Indian Export Organisations (FIEO)',
    '',
    'This is a simulated Certificate of Origin document.',
    'In production, this PDF would be generated by the compliance backend.',
  ].join('\n')
  return new Blob([content], { type: 'application/pdf' })
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
export async function fetchAlerts(countries: string[], products: string[]) {
  const { data, error } = await supabase.functions.invoke('regulatory-alerts', {
    body: {
      countries,
      products,
    },
  })

  if (error) {
    console.error('Alerts Edge Function error:', error)
    throw new Error(error.message)
  }

  return data as { alerts: any[] }
}

// ─── Customs Filing ─────────────────────────────────────────────
export async function generateCustomsPayload(shipment: any) {
  const { data, error } = await supabase.functions.invoke('customs-filing', {
    body: { shipment },
  })

  if (error) {
    console.error('Customs filing Edge Function error:', error)
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
    console.error('OCR Edge Function error:', error)
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
    console.error('WhatsApp Edge Function error:', error)
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
    console.error('TReDS Edge Function error:', error)
    throw new Error(error.message)
  }

  return data as {
    success: boolean
    message: string
    fu_id: string
    simulated_payload: any
  }
}

// ─── API Keys (local mock) ───────────────────────────────────
let mockApiKeys: APIKeyInfo[] = []
let mockKeyCounter = 0

export function fetchAPIKeys(): Promise<APIKeyInfo[]> {
  return Promise.resolve(mockApiKeys)
}

export function createAPIKey(name: string): Promise<{ key: string; id: string }> {
  mockKeyCounter++
  const id = `key-${mockKeyCounter}`
  const key = `cos_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
  const newKey: APIKeyInfo = {
    id,
    name,
    key_prefix: key.slice(0, 8),
    created_at: new Date().toISOString(),
    rate_limit: 1000,
    permissions: ['read', 'write'],
  }
  mockApiKeys = [...mockApiKeys, newKey]
  return Promise.resolve({ key, id })
}

export function revokeAPIKey(id: string): Promise<void> {
  mockApiKeys = mockApiKeys.filter(k => k.id !== id)
  return Promise.resolve(undefined as void)
}
