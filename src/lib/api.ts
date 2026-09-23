import { supabase } from './supabase'
import { calculateRiskScore } from '@/utils/risk-scoring'
import { generateChecklist } from '@/utils/checklist-generator'
import { generateBankReadyDealPack } from './deal-pack'
import { FTA_DATABASE, applyFTARows, getFTAMeta, type FTAAgreementRow, type FTASourceMeta } from '@/data/fta'
import { INDIAN_EXPORT_SCHEMES } from '@/data/indian-schemes'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { getHSProduct } from '@/data/hs-product-db'
import { isCBAMScope, getCBAMSector } from '@/data/cbam-hs-codes'
import { convertToINR } from './fx'
import { deriveFobValue, rodtepEntitlement, RODTEP_NOTIFIED_UNTIL, type ValueBasis } from './rodtep'
import { isUnrelatedToTrade, cappedSeverity } from './feed-relevance'
import {
  mergeGateResults, shipmentLines, distinctHsCodes, primaryHsCode, rodtepForLines,
  type LinesRodtep, type ShipmentLine,
} from './shipment-lines'
import { fetchLinkedInvoices } from './invoices'
import type { CountryCode, GateCheckResult, GateStatus, APIKeyInfo, Shipment, CompanyProfile, CompanySize } from '@/types'

// ─── Local Helpers ────────────────────────────────────────────

const MFN_RATES: Record<string, number> = {
  EU: 7.5, US: 5.0, UK: 6.0, UAE: 5.0, Japan: 4.0, Australia: 5.0,
}

function getMFNRate(country: string): number {
  return MFN_RATES[country] ?? 5.0
}

// ─── RoDTEP Rate Lookup ───────────────────────────────────────
// Looks up Appendix 4R (rodtep_rates table). Rates already reflect
// Notification 60/2025-26 (ch25+ halved).
//
// matchType tells the caller how trustworthy the number is:
//   exact   — 8-digit HS code found in the schedule. Safe to file on.
//   prefix  — no 8-digit row; used the first row sharing the 6-digit
//             sub-heading. Usually right, must be confirmed before filing.
//   default — nothing in the schedule; 0.5% placeholder. Do NOT file on this.
export type RodtepMatchType = 'exact' | 'prefix' | 'default'

export interface RodtepRateResult {
  rate: number
  matchType: RodtepMatchType
  matchedHs: string | null   // the schedule row actually used
}

export const RODTEP_DEFAULT_RATE = 0.5

export async function fetchRodtepRateDetailed(hsCode: string): Promise<RodtepRateResult> {
  const digits = hsCode.replace(/\D/g, '')
  if (digits.length < 4) return { rate: RODTEP_DEFAULT_RATE, matchType: 'default', matchedHs: null }
  const hs8 = digits.padEnd(8, '0')
  const hs6prefix = digits.slice(0, 6)

  // Try exact 8-digit match first
  const { data: exact } = await supabase
    .from('rodtep_rates')
    .select('hs_code, rate')
    .eq('hs_code', hs8)
    .maybeSingle()
  if (exact?.rate != null) return { rate: Number(exact.rate), matchType: 'exact', matchedHs: exact.hs_code }

  // Fall back to first row matching 6-digit prefix
  const { data: approx } = await supabase
    .from('rodtep_rates')
    .select('hs_code, rate')
    .like('hs_code', `${hs6prefix}%`)
    .limit(1)
    .maybeSingle()
  if (approx?.rate != null) return { rate: Number(approx.rate), matchType: 'prefix', matchedHs: approx.hs_code }

  return { rate: RODTEP_DEFAULT_RATE, matchType: 'default', matchedHs: null }
}

export interface ShipmentLineFigures {
  lines: ShipmentLine[]
  /** Distinct line HS codes: what the gate check iterates. */
  hsCodes: string[]
  /** HS code of the highest-value line: what Shipment.hsCode becomes. */
  primaryHs: string | null
  /** Per-line RoDTEP, each line at its own HS rate. */
  rodtep: LinesRodtep
}

/**
 * Per-line figures for the shipments that have an issued commercial invoice.
 * Shipments absent from the result keep today's single-HS behaviour. Each
 * distinct HS code's rate is looked up once. `date` is the Let Export date the
 * RoDTEP notification window is keyed to, as elsewhere.
 */
export async function fetchShipmentLineFigures(
  shipments: Array<{ id: string; date: string }>
): Promise<Map<string, ShipmentLineFigures>> {
  const invoices = await fetchLinkedInvoices(shipments.map(s => s.id))
  const linesById = new Map<string, ShipmentLine[]>()
  for (const s of shipments) {
    const lines = shipmentLines(invoices.get(s.id) ?? [])
    if (lines && lines.length > 0) linesById.set(s.id, lines)
  }
  const allHs = [...new Set([...linesById.values()].flatMap(distinctHsCodes))]
  const rates = new Map(await Promise.all(allHs.map(async hs => [hs, await fetchRodtepRateDetailed(hs)] as const)))

  const out = new Map<string, ShipmentLineFigures>()
  for (const s of shipments) {
    const lines = linesById.get(s.id)
    if (!lines) continue
    out.set(s.id, {
      lines,
      hsCodes: distinctHsCodes(lines),
      primaryHs: primaryHsCode(lines),
      rodtep: rodtepForLines(lines, hs => rates.get(hs), s.date),
    })
  }
  return out
}

// Backward-compatible number-only wrapper (dashboard estimate, FTA view).
export async function fetchRodtepRate(hsCode: string): Promise<number> {
  return (await fetchRodtepRateDetailed(hsCode)).rate
}

// ─── RoDTEP Look-back Audit ───────────────────────────────────
// Shipments created before rodtep_rate was cached (or via the add-shipment
// form, which never wrote it) have rodtep_rate = NULL and are invisible to
// the recovery tracker and CA dashboard. This backfills them in place.
export async function backfillRodtepRates(companyId: string): Promise<number> {
  const { data } = await supabase
    .from('shipments')
    .select('id, hs_code')
    .eq('company_id', companyId)
    .is('rodtep_rate', null)
    .not('hs_code', 'is', null)
    // No shipping bill means no let-export order, so nothing is claimable yet.
    // Filling a rate here would count unshipped goods as unclaimed RoDTEP.
    .not('shipping_bill_no', 'is', null)

  if (!data || data.length === 0) return 0

  // Rate lookup once per distinct HS code, not per shipment
  const distinct = [...new Set(data.map(s => s.hs_code as string))]
  const rateByHs = new Map<string, RodtepRateResult>()
  await Promise.all(distinct.map(async hs => rateByHs.set(hs, await fetchRodtepRateDetailed(hs))))

  let updated = 0
  await Promise.all(data.map(async s => {
    const r = rateByHs.get(s.hs_code)
    if (!r) return
    const { error } = await supabase
      .from('shipments')
      .update({ rodtep_rate: r.rate, rodtep_match_type: r.matchType })
      .eq('id', s.id)
    if (!error) updated++
  }))
  return updated
}

export type RodtepClaimStatus = 'unclaimed' | 'filed' | 'credited' | 'rejected'

export async function updateRodtepClaimStatus(
  shipmentId: string,
  status: RodtepClaimStatus,
  note?: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('shipments')
    .update({
      rodtep_claim_status: status,
      rodtep_claimed: status === 'filed' || status === 'credited',
      rodtep_claim_date: status === 'unclaimed' ? null : today,
      rodtep_claim_note: note ?? null,
    })
    .eq('id', shipmentId)
  if (error) throw new Error(error.message)
}

// ─── Bulk Shipping Bill Import ────────────────────────────────
// Accepts rows parsed from a CSV export of the customer's shipping bills
// (ICEGATE / CHA register / Tally). Looks up the RoDTEP rate for every
// distinct HS code once, then inserts everything with the rate cached so the
// look-back audit is populated immediately.
export interface ShippingBillRow {
  shippingBillNo: string
  date: string              // YYYY-MM-DD
  hsCode: string
  fobValue: number
  currency: string          // INR | USD | EUR | GBP | AED
  description?: string
  country?: string          // destination; defaults to 'EU'
  buyerName?: string
}

export interface BulkImportResult {
  inserted: number
  skippedDuplicates: number
  errors: Array<{ row: number; reason: string }>
  totalEntitlementINR: number
  byMatchType: Record<RodtepMatchType, number>
}

export async function bulkImportShippingBills(
  rows: ShippingBillRow[],
  companyId: string
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    inserted: 0, skippedDuplicates: 0, errors: [], totalEntitlementINR: 0,
    byMatchType: { exact: 0, prefix: 0, default: 0 },
  }
  if (rows.length === 0) return result

  // Skip shipping bills already on file for this company
  const { data: existing } = await supabase
    .from('shipments')
    .select('shipping_bill_no')
    .eq('company_id', companyId)
    .not('shipping_bill_no', 'is', null)
  const known = new Set((existing ?? []).map(e => String(e.shipping_bill_no).trim()))

  const distinct = [...new Set(rows.map(r => r.hsCode.replace(/\D/g, '')))]
  const rateByHs = new Map<string, RodtepRateResult>()
  await Promise.all(distinct.map(async hs => rateByHs.set(hs, await fetchRodtepRateDetailed(hs))))

  const inserts: any[] = []
  rows.forEach((r, i) => {
    const rowNo = i + 2 // 1-based + header line
    const sb = r.shippingBillNo.trim()
    if (!sb) { result.errors.push({ row: rowNo, reason: 'Missing shipping bill number' }); return }
    if (known.has(sb)) { result.skippedDuplicates++; return }
    const hsDigits = r.hsCode.replace(/\D/g, '')
    if (hsDigits.length < 4) { result.errors.push({ row: rowNo, reason: `Invalid HS code "${r.hsCode}"` }); return }
    if (!(r.fobValue > 0)) { result.errors.push({ row: rowNo, reason: 'FOB value must be > 0' }); return }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) { result.errors.push({ row: rowNo, reason: `Date "${r.date}" is not YYYY-MM-DD` }); return }

    const rate = rateByHs.get(hsDigits)!
    // An ICEGATE shipping bill states FOB, so basis is genuine here — unlike a
    // manually entered shipment value, which may be CIF. Shipping bill date
    // drives both the exchange rate and whether RoDTEP is notified at all.
    const fobInr = convertToINR(r.fobValue, r.currency, r.date)
    result.totalEntitlementINR += rodtepEntitlement({
      fobInr, ratePct: rate.rate, letExportDate: r.date,
    }).amountInr ?? 0
    result.byMatchType[rate.matchType]++
    known.add(sb)

    inserts.push({
      company_id: companyId,
      name: r.description?.trim() || `SB ${sb}`,
      product: 'general',
      country: r.country?.trim() || 'EU',
      date: r.date,
      hs_code: hsDigits,
      shipment_value: r.fobValue,
      value_currency: (r.currency || 'USD').toUpperCase(),
      shipping_bill_no: sb,
      buyer_name: r.buyerName?.trim() || null,
      rodtep_rate: rate.rate,
      rodtep_match_type: rate.matchType,
      rodtep_claimed: false,
      rodtep_claim_status: 'unclaimed',
      status: 'delivered',
    })
  })

  for (let i = 0; i < inserts.length; i += 100) {
    const batch = inserts.slice(i, i + 100)
    const { error } = await supabase.from('shipments').insert(batch)
    if (error) {
      result.errors.push({ row: i + 2, reason: `Insert failed: ${error.message}` })
    } else {
      result.inserted += batch.length
    }
  }
  return result
}

// Minimal RFC-4180-ish CSV parser (handles quoted fields with commas/newlines).
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(f => f.trim() !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some(f => f.trim() !== '')) rows.push(row)
  return rows
}

// Maps a parsed CSV (header row + data) into ShippingBillRow[] using
// forgiving header matching so ICEGATE / Tally / CHA exports all work.
export function csvToShippingBills(rows: string[][]): { bills: ShippingBillRow[]; missing: string[] } {
  if (rows.length < 2) return { bills: [], missing: ['No data rows found'] }
  const header = rows[0].map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
  const find = (...aliases: string[]) => header.findIndex(h => aliases.some(a => h === a || h.includes(a)))

  const iSB = find('shippingbillno', 'sbno', 'shippingbill', 'sbnumber', 'billno')
  const iDate = find('sbdate', 'shippingbilldate', 'date', 'leodate')
  const iHS = find('hscode', 'ritc', 'hsn', 'tariff')
  const iFOB = find('fobvalue', 'fob', 'value', 'amount')
  const iCur = find('currency', 'curr', 'ccy')
  const iDesc = find('description', 'product', 'goods', 'item')
  const iCountry = find('destination', 'country', 'dest')
  const iBuyer = find('buyer', 'consignee', 'importer')

  const missing: string[] = []
  if (iSB < 0) missing.push('Shipping Bill No')
  if (iDate < 0) missing.push('Date')
  if (iHS < 0) missing.push('HS Code')
  if (iFOB < 0) missing.push('FOB Value')
  if (missing.length) return { bills: [], missing }

  const toISO = (raw: string): string => {
    const s = raw.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/) // DD/MM/YYYY (Indian default)
    if (m) {
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3]
      return `${yyyy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    }
    return s
  }

  const bills = rows.slice(1).map(r => ({
    shippingBillNo: (r[iSB] ?? '').trim(),
    date: toISO(r[iDate] ?? ''),
    hsCode: (r[iHS] ?? '').trim(),
    fobValue: Number(String(r[iFOB] ?? '').replace(/[^\d.]/g, '')) || 0,
    currency: iCur >= 0 ? (r[iCur] ?? 'USD').trim() : 'USD',
    description: iDesc >= 0 ? r[iDesc] : undefined,
    country: iCountry >= 0 ? r[iCountry] : undefined,
    buyerName: iBuyer >= 0 ? r[iBuyer] : undefined,
  }))
  return { bills, missing: [] }
}

// ─── RoDTEP Claim File (CHA / ICEGATE upload) ─────────────────
// Structured claim register — one row per unclaimed shipping bill with the
// exact rate, schedule row used, and computed entitlement. This is what a CHA
// needs to file, instead of a prose "how to claim" page.
export function buildRodtepClaimCSV(
  shipments: Array<{
    shipping_bill_no: string | null; date: string; hs_code: string; name: string
    shipment_value: number; value_currency: string; rodtep_rate: number | null
    rodtep_match_type?: string | null
    /** Incoterm basis of shipment_value. Absent means not recorded. */
    value_basis?: ValueBasis | null
    freight_value?: number | null
    insurance_value?: number | null
    /**
     * Per-line RoDTEP from the shipment's issued commercial invoices. When
     * present it replaces the shipment-level value, currency and rate: one
     * row per invoice line.
     */
    line_rodtep?: LinesRodtep | null
  }>,
  profile: { name: string; iec?: string; gstin?: string; portOfLoading?: string }
): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines: string[] = []
  lines.push(`# ComplianceOS RoDTEP Claim Register — generated ${new Date().toISOString().slice(0, 10)}`)
  lines.push(`# Exporter: ${profile.name} | IEC: ${profile.iec ?? 'NOT SET'} | GSTIN: ${profile.gstin ?? 'NOT SET'} | Port: ${profile.portOfLoading ?? 'NOT SET'}`)
  lines.push(`# Rates: DGFT Appendix 4R as amended by Notification 60/2025-26. match_type=exact is filing-ready; prefix must be confirmed; default must NOT be filed.`)
  lines.push(`# Entitlement is ${'FOB'} x rate. Where incoterm is not recorded the value is assumed FOB — see the basis column. A CIF or CFR value not reduced to FOB overstates the claim.`)
  lines.push(`# RoDTEP notified to ${RODTEP_NOTIFIED_UNTIL}. Rows past that date carry no claimable entitlement.`)
  lines.push(['shipping_bill_no', 'sb_date', 'ritc_hs_code', 'description', 'fob_value', 'currency', 'fob_value_inr', 'value_basis', 'rodtep_rate_pct', 'entitlement_inr', 'claimable', 'match_type', 'claim_deadline', 'iec', 'gstin'].join(','))
  let total = 0
  for (const s of shipments) {
    const dl = new Date(s.date); dl.setFullYear(dl.getFullYear() + 1)
    if (s.line_rodtep) {
      for (const e of s.line_rodtep.lines) {
        const l = e.line
        // Same rule as the shipment-level file: a default rate must not be filed.
        const isDefault = e.matchType === 'default'
        const counts = e.claimable && !isDefault
        if (counts) total += e.amountInr ?? 0
        lines.push([
          s.shipping_bill_no ?? '', s.date, l.hsCode,
          `${s.name} — ${l.invoiceNumber ?? 'invoice'} line ${l.lineNo}`,
          l.fob ?? '', l.currency, l.fobInr ?? '', l.basis ?? 'none',
          e.ratePct, e.amountInr ?? '',
          counts ? 'yes' : `no: ${isDefault ? 'default rate — confirm the HS code before filing' : (e.note ?? '')}`,
          e.matchType ?? '', dl.toISOString().slice(0, 10), profile.iec ?? '', profile.gstin ?? '',
        ].map(esc).join(','))
      }
      continue
    }
    const rate = s.rodtep_rate ?? 0
    const basis = deriveFobValue({
      value: s.shipment_value,
      basis: s.value_basis ?? 'unknown',
      freight: s.freight_value ?? undefined,
      insurance: s.insurance_value ?? undefined,
    })
    const fobInr = basis.fob === null ? null : Math.round(convertToINR(basis.fob, s.value_currency, s.date))
    const { amountInr, claimable, note } = rodtepEntitlement({ fobInr, ratePct: rate, letExportDate: s.date })
    total += amountInr ?? 0
    lines.push([
      s.shipping_bill_no ?? '', s.date, s.hs_code, s.name, basis.fob ?? '', s.value_currency, fobInr ?? '',
      basis.assumed ? 'assumed_fob' : (s.value_basis ?? 'fob'),
      rate, amountInr ?? '', claimable ? 'yes' : `no: ${note ?? ''}`,
      s.rodtep_match_type ?? '', dl.toISOString().slice(0, 10), profile.iec ?? '', profile.gstin ?? '',
    ].map(esc).join(','))
  }
  lines.push(`# TOTAL_ENTITLEMENT_INR,${total}`)
  return lines.join('\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Normalise HS code to DB format XXXX.XX (6 digits, dot after 4th)
function normaliseHS(code: string): string {
  const digits = code.replace(/\D/g, '').padStart(6, '0')
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}`
}

// Fetch India's own MFN import duty for a given HS code (used for duty drawback calculation)
export async function fetchIndiaMFNRate(hsCode: string): Promise<number | null> {
  if (!hsCode || hsCode.replace(/\D/g, '').length < 6) return null
  const { data } = await supabase
    .from('hs_tariff_rates')
    .select('mfn_rate')
    .eq('hs_code', normaliseHS(hsCode))
    .eq('country_code', 'IN')
    .maybeSingle()
  return data?.mfn_rate ?? null
}

// ─── Risk ──────────────────────────────────────────────────────
export function fetchRiskScore(product: string, country: string, companySize: string) {
  const result = calculateRiskScore(product, country, { name: '', size: companySize as CompanySize })
  return Promise.resolve({ ...result, country })
}

// ─── HS Code Lookup (AI-powered) ───────────────────────────────
export interface HSLookupResult {
  hsCode: string
  name: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
  source: 'api' | 'local'
}

export async function fetchHSLookup(query: string, category?: string): Promise<HSLookupResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke('hs-lookup', {
      body: { query, category },
    })
    if (error) return []
    return (data?.results || []).map((r: any) => ({ ...r, source: 'api' as const }))
  } catch {
    return []
  }
}

// ─── AI Checklist for specific HS code ─────────────────────────
async function fetchAIChecklist(
  hsCode: string,
  productName: string,
  countries: string[]
): Promise<any[]> {
  try {
    const { data, error } = await supabase.functions.invoke('hs-checklist', {
      body: { hsCode, productName, countries },
    })
    if (error) return []
    return data?.items || []
  } catch {
    return []
  }
}

// ─── Checklist ─────────────────────────────────────────────────
export async function fetchChecklist(
  product: string,
  country: string,
  hsCode?: string,
  hsProductName?: string,
  allCountries?: string[]
) {
  // Base checklist from local generator (always runs)
  const baseItems = generateChecklist(product, country, hsCode)

  // If an HS code is provided, check whether we have local DB items for it
  if (hsCode) {
    const inLocalDB = !!getHSProduct(hsCode)

    if (!inLocalDB) {
      // Not in local DB — call AI to generate specific items for all target countries
      const countries = allCountries?.length ? allCountries : [country]
      const name = hsProductName || hsCode
      const aiItems = await fetchAIChecklist(hsCode, name, countries)

      // Merge: base items first (documentation, COO, packaging etc.), then AI-specific items
      const merged = [...baseItems, ...aiItems]
      const withDrawback = await injectDutyDrawbackItem(merged, hsCode)
      return { items: withDrawback }
    }

    // In local DB — inject drawback item if applicable
    const withDrawback = await injectDutyDrawbackItem(baseItems, hsCode)
    return { items: withDrawback }
  }

  // No HS code — return base items as-is
  return { items: baseItems }
}

async function injectDutyDrawbackItem(items: import('@/types').ChecklistItem[], hsCode: string): Promise<import('@/types').ChecklistItem[]> {
  const indiaRate = await fetchIndiaMFNRate(hsCode)
  if (!indiaRate || indiaRate <= 0) return items

  const drawbackItem: import('@/types').ChecklistItem = {
    id: 9001,
    category: 'Indian Compliance',
    item: `Claim Duty Drawback — India's import duty on HS ${normaliseHS(hsCode)} is ${indiaRate}%`,
    priority: 'high',
    phase: 'per-shipment',
    details: `India charges ${indiaRate}% MFN duty on this product. If you used any imported inputs in manufacture, file a duty drawback claim at ICEGATE within 3 months of export using your Shipping Bill number. Even if inputs were domestic, All-Industry Rate (AIR) drawback may apply. Check CBIC Drawback Schedule.`,
  }

  return [...items, drawbackItem]
}

// ─── FTA Savings ───────────────────────────────────────────────
export async function fetchFTASavings(
  country: string,
  shipmentValue: number,
  hsCode?: string,
  _product?: string
) {
  const fta = FTA_DATABASE[country as CountryCode]
  let mfnRate = getMFNRate(country)
  let prefRate = fta?.preferentialTariff ? Math.max(0, mfnRate - 3.5) : mfnRate
  let agreement: string | undefined = fta?.name

  if (hsCode && hsCode.replace(/\D/g, '').length >= 6) {
    const { data } = await supabase
      .from('hs_tariff_rates')
      .select('mfn_rate, preferential_rate, agreement')
      .eq('hs_code', normaliseHS(hsCode))
      .eq('country_code', country)
      .maybeSingle()

    if (data) {
      mfnRate = data.mfn_rate
      prefRate = data.preferential_rate
      agreement = data.agreement
    }
  }

  return {
    country,
    agreement,
    mfn_rate: mfnRate,
    preferential_rate: prefRate,
    mfn_duty: shipmentValue * (mfnRate / 100),
    preferential_duty: shipmentValue * (prefRate / 100),
    savings: shipmentValue * ((mfnRate - prefRate) / 100),
  }
}

export async function classifyProductHSCode(description: string, _destinationCountry: string, category?: string) {
  const { data, error } = await supabase.functions.invoke('hs-lookup', {
    body: { query: description, category },
  })

  if (error) throw new Error(error.message)

  const results: Array<{ hsCode: string; name: string; confidence: string; reason: string }> =
    data?.results ?? []

  if (results.length === 0) throw new Error('No HS codes found for that description')

  return {
    hs_code: results[0].hsCode,
    confidence: results[0].confidence === 'high' ? 0.9 : 0.6,
    description: results[0].name,
    suggestions: results,
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
    // supabase-js replaces the function's own message with a generic
    // "non-2xx status code"; the real reason is in the response body.
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(body?.error ?? error.message)
  }

  return data as {
    co2e: number
    co2e_unit: string
    co2e_tonnes: number
    activity_id: string
    source: string
    year: number | null
    region?: string | null
    /** cbam_default: the EU CBAM default value for this HS code and origin. */
    factor_kind?: 'cbam_default' | 'generic'
    factor_name?: string | null
    cn_code?: string | null
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
export async function fetchBatchFTASavings(
  countries: string[],
  shipmentValue: number,
  _product?: string,
  hsCode?: string
) {
  // Try to look up per-country rates from DB if we have a 6-digit HS code
  const dbRates: Record<string, { mfn_rate: number; preferential_rate: number; agreement: string }> = {}

  if (hsCode && hsCode.replace(/\D/g, '').length >= 6) {
    const { data } = await supabase
      .from('hs_tariff_rates')
      .select('country_code, mfn_rate, preferential_rate, agreement')
      .eq('hs_code', normaliseHS(hsCode))
      .in('country_code', countries)

    if (data) {
      for (const row of data) {
        dbRates[row.country_code] = { mfn_rate: row.mfn_rate, preferential_rate: row.preferential_rate, agreement: row.agreement }
      }
    }
  }

  const results = countries.map(country => {
    const fta = FTA_DATABASE[country as CountryCode]
    const db = dbRates[country]
    const mfnRate = db?.mfn_rate ?? getMFNRate(country)
    const prefRate = db?.preferential_rate ?? (fta?.preferentialTariff ? Math.max(0, mfnRate - 3.5) : mfnRate)
    const agreement = db?.agreement ?? fta?.name
    return {
      country,
      agreement,
      mfn_rate: mfnRate,
      preferential_rate: prefRate,
      mfn_duty: shipmentValue * (mfnRate / 100),
      preferential_duty: shipmentValue * (prefRate / 100),
      savings: shipmentValue * ((mfnRate - prefRate) / 100),
    }
  })
  return { results }
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

/**
 * Overlay the fta_agreements table onto the built-in table. Safe to call on
 * every sign-in: a missing table, a blocked read or an empty result all leave
 * the built-in values in place.
 */
export async function loadFTAAgreements(): Promise<FTASourceMeta> {
  try {
    const { data, error } = await supabase
      .from('fta_agreements')
      .select('country_code, name, status, effective_date, round, preferential_tariff, notes, updated_at')
    if (error || !data || data.length === 0) return getFTAMeta()
    applyFTARows(data as FTAAgreementRow[])
  } catch {
    // Keep the built-in values.
  }
  return getFTAMeta()
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
type SanctionsResponse = { data: unknown } | null

function screenBuyer(buyerName: string | undefined): Promise<SanctionsResponse> {
  return buyerName && buyerName.trim().length > 2
    ? supabase.functions.invoke('sanctions-check', { body: { name: buyerName } })
    : Promise.resolve(null)
}

/**
 * Gate check. A shipment with invoice lines (lineHsCodes) is checked once per
 * distinct line HS code and the worst status wins; the buyer is screened once
 * for all of them. Without lines it is the single-HS check on hsCode.
 */
export async function runGateCheck(
  shipment: Shipment,
  checkedItems: Record<string, boolean> = {},
  companyProfile: CompanyProfile = { name: '', size: 'small' }
): Promise<GateCheckResult> {
  const sanctions = screenBuyer(shipment.buyerName)
  const codes = shipment.lineHsCodes
  if (!codes || codes.length === 0) {
    return gateCheckForHs(shipment, checkedItems, companyProfile, sanctions)
  }
  const primary = shipment.hsCode && codes.includes(shipment.hsCode) ? shipment.hsCode : codes[0]
  const ordered = [primary, ...codes.filter(c => c !== primary)]
  const results = await Promise.all(
    ordered.map(hsCode => gateCheckForHs({ ...shipment, hsCode }, checkedItems, companyProfile, sanctions))
  )
  return mergeGateResults(results)
}

async function gateCheckForHs(
  shipment: Shipment,
  checkedItems: Record<string, boolean>,
  companyProfile: CompanyProfile,
  sanctionsPromise: Promise<SanctionsResponse>
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
  const shipmentValue = shipment.shipmentValue || 0

  // Look up real tariff rates from DB if HS code is available
  let mfnRate = MFN_RATES[shipment.country] ?? 5.0
  let prefRate = fta?.preferentialTariff ? Math.max(0, mfnRate - 3.5) : mfnRate
  let indiaImportDuty: number | undefined

  // Sanctions check + CBAM emissions — fire in parallel with tariff lookups
  let sanctionsResult: import('@/types').SanctionsCheckResult | undefined

  // CBAM emissions estimate — only for EU + CBAM-scoped HS code
  let cbamEmissions: { co2e_tonnes: number; formatted: string; activity_id: string } | undefined
  const cbamEmissionsPromise =
    shipment.hsCode && isCBAMScope(shipment.hsCode, shipment.country) && shipmentValue > 0
      ? supabase.functions.invoke('climatiq-emissions', {
          body: {
            weight_kg: Math.round(shipmentValue / 150), // rough estimate: ₹150/kg for industrial goods
            hs_code: shipment.hsCode,
            product_type: shipment.product,
            origin_country: 'IN',
            destination_country: shipment.country,
          },
        })
      : Promise.resolve(null)

  if (shipment.hsCode && shipment.hsCode.replace(/\D/g, '').length >= 6) {
    const [destData, indiaData] = await Promise.all([
      supabase
        .from('hs_tariff_rates')
        .select('mfn_rate, preferential_rate')
        .eq('hs_code', normaliseHS(shipment.hsCode))
        .eq('country_code', shipment.country)
        .maybeSingle(),
      supabase
        .from('hs_tariff_rates')
        .select('mfn_rate')
        .eq('hs_code', normaliseHS(shipment.hsCode))
        .eq('country_code', 'IN')
        .maybeSingle(),
    ])
    if (destData.data) {
      mfnRate = destData.data.mfn_rate
      prefRate = destData.data.preferential_rate
    }
    if (indiaData.data) {
      indiaImportDuty = indiaData.data.mfn_rate
    }
  }

  // Resolve CBAM emissions
  const cbamEmissionsResponse = await cbamEmissionsPromise
  if (cbamEmissionsResponse?.data) {
    cbamEmissions = cbamEmissionsResponse.data
  }

  // Resolve sanctions check (was kicked off in parallel)
  const sanctionsResponse = await sanctionsPromise
  if (sanctionsResponse?.data) {
    sanctionsResult = sanctionsResponse.data as import('@/types').SanctionsCheckResult
  }

  // ── Gate decision ─────────────────────────────────────────
  const blockingReasons: string[] = []
  const conditionalReasons: string[] = []

  if ((sanctionsResult as any)?.risk_level === 'error') {
    blockingReasons.push('Sanctions screening unavailable — OFAC database not seeded. Cannot verify buyer. Run scripts/seed_sanctions.mjs then retry.')
  } else if (sanctionsResult?.risk_level === 'block') {
    blockingReasons.push(`Buyer "${shipment.buyerName}" matches OFAC sanctions list (${sanctionsResult.matches[0]?.program}) — transaction prohibited`)
  } else if (sanctionsResult?.risk_level === 'flag') {
    conditionalReasons.push(`Buyer name similar to sanctioned entity "${sanctionsResult.matches[0]?.name}" — manual verification required`)
  } else if (shipment.buyerName && shipment.buyerName.trim().length > 2 && !sanctionsResult) {
    blockingReasons.push('Sanctions screening did not complete — cannot clear this buyer. Check network connectivity and retry.')
  }

  if (risk.score >= 70) blockingReasons.push(`Risk score is high (${risk.score}/100) — lender approval unlikely`)
  if (criticalPending > 2) blockingReasons.push(`${criticalPending} critical compliance items are incomplete`)
  if (completionPct < 40) blockingReasons.push(`Checklist only ${completionPct}% complete — below 40% minimum`)

  // CBAM check: EU shipments for covered goods require CBAM declaration
  const cbamSector = shipment.hsCode ? getCBAMSector(shipment.hsCode) : null
  if (shipment.hsCode && isCBAMScope(shipment.hsCode, shipment.country)) {
    const emissionsText = cbamEmissions
      ? ` Estimated embedded emissions: ${cbamEmissions.formatted} (≈ €${Math.round(cbamEmissions.co2e_tonnes * 65)} CBAM levy at €65/tCO₂e).`
      : ''
    conditionalReasons.push(
      `CBAM scope: HS ${shipment.hsCode} (${cbamSector}) requires EU Carbon Border Adjustment report — file via EU CBAM portal before customs clearance.${emissionsText}`
    )
  }

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
      india_import_duty: indiaImportDuty,
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
    sanctions_check: sanctionsResult,
    cbam_scope: {
      applies: !!(shipment.hsCode && isCBAMScope(shipment.hsCode, shipment.country)),
      sector: cbamSector,
      co2e_tonnes: cbamEmissions?.co2e_tonnes,
      estimated_levy_eur: cbamEmissions ? Math.round(cbamEmissions.co2e_tonnes * 65) : undefined,
      emissions_formatted: cbamEmissions?.formatted,
    },
  }

  return result
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

/**
 * Worksheet an exporter takes to their issuing agency to APPLY for a
 * Certificate of Origin. It is deliberately not a certificate.
 *
 * This replaces downloadCOOPdf, which drew an A4 document headed
 * "CERTIFICATE OF ORIGIN" with a locally generated reference number, a
 * declaration and signature lines. No agency issued it and nothing verified
 * it, but it left the customer's premises and could reach a bank or a foreign
 * customs broker. Watermarking it was a stopgap; with the DGFT API integration
 * frozen there is nothing to replace it with, so the lookalike goes.
 *
 * India-UK CETA has been in force since 15 July, so UK shipments need a real
 * preferential certificate — which makes a convincing-looking fake worse, not
 * better.
 */
export async function generateCoOApplicationSheet(
  shipmentId: string,
  shipment?: Partial<Shipment>
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const today = new Date().toISOString().slice(0, 10)
  const W = 210, margin = 18
  const BLANK = '________________________'

  doc.setFillColor(243, 244, 246)
  doc.rect(0, 0, W, 26, 'F')
  doc.setTextColor(17, 24, 39); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text('Certificate of Origin — Application Worksheet', margin, 13)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
  doc.text('Working document. This is NOT a Certificate of Origin and has no legal effect.', margin, 20)

  doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.6)
  doc.rect(margin, 32, W - margin * 2, 20)
  doc.setTextColor(185, 28, 28); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
  doc.text('Only a designated issuing agency can issue a Certificate of Origin.', margin + 4, 39)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(75, 85, 99)
  doc.text('Take this worksheet to your chamber of commerce, EIC or the DGFT eCoO portal.', margin + 4, 45)
  doc.text('Do not send it to a buyer, bank or customs broker as evidence of origin.', margin + 4, 50)

  let y = 62
  const section = (label: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(107, 114, 128)
    doc.text(label.toUpperCase(), margin, y); y += 2
    doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.3)
    doc.line(margin, y, W - margin, y); y += 6
  }
  const field = (label: string, value?: string | number | null) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(107, 114, 128)
    doc.text(label, margin, y)
    const shown = value === undefined || value === null || value === '' ? BLANK : String(value)
    doc.setFontSize(10); doc.setTextColor(17, 24, 39)
    doc.text(shown, margin + 62, y)
    y += 8
  }

  section('Exporter')
  field('Firm name', shipment?.exporterName)
  field('IEC', undefined)
  field('GSTIN', undefined)
  field('Address', undefined)

  section('Consignee')
  field('Name', shipment?.buyer ?? shipment?.buyerName)
  field('Country', shipment?.country)
  field('Address', undefined)

  section('Goods')
  field('Description', shipment?.name ?? shipment?.product)
  field('HS code (8 digit)', shipment?.hsCode)
  field('Quantity', shipment?.quantity)
  field('Unit of measure', undefined)
  field('Invoice number', undefined)
  field('Invoice date', shipment?.date)
  field('FOB value', shipment?.shipmentValue)
  field('Marks and numbers', undefined)

  section('Shipment')
  field('Port of loading', undefined)
  field('Port of discharge', undefined)
  field('Transport mode', shipment?.transportMode)
  field('Vessel / flight', undefined)
  field('Departure date', undefined)

  section('Origin claim')
  field('Trade agreement', undefined)
  field('Origin criterion', undefined)

  doc.setFontSize(7); doc.setTextColor(156, 163, 175)
  doc.text(
    `Prepared by ComplianceOS from shipment ${shipmentId.slice(0, 8).toUpperCase()} on ${today}. `
    + 'Blank fields are not held in your ComplianceOS record and must be completed before you apply.',
    margin, 285, { maxWidth: W - margin * 2 }
  )

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
// Feed items arrive with HTML markup and double-escaped entities baked into the
// text, e.g. "&amp;nbsp;" or "&lt;p&gt;". Decode twice, drop tags, collapse space.
function cleanFeedText(raw: string | null | undefined): string {
  if (!raw) return ''
  let text = String(raw)
  for (let pass = 0; pass < 2; pass++) {
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;|&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
  }
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

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

  // If table is empty (pg_cron not yet configured), return curated seed alerts
  // so the Alerts view is never blank in demos or early production.
  const effectiveRows = rows.length > 0 ? rows : [
    { id: 's1', country_code: 'EU', country_name: 'European Union', flag: '🇪🇺', title: 'CBAM levy now active', change_description: 'Carbon Border Adjustment Mechanism levy applies from January 2026. Exporters of steel, cement, aluminium, fertilisers, and hydrogen must report embedded emissions quarterly or face penalties up to 3× the carbon price.', source_url: 'https://taxation-customs.ec.europa.eu', source_name: 'EU Taxation & Customs', severity: 'critical', alert_type: 'regulation_change', product_tags: ['Steel', 'Chemicals'], date: '2026-01-01', scraped_at: '2026-01-01' },
    { id: 's2', country_code: 'IN', country_name: 'India', flag: '🇮🇳', title: 'RoDTEP Notification 60 — revised rates', change_description: 'DGFT Notification No. 60/2025-26 (Feb 2026) revised RoDTEP rates for Chapter 25+ products. Rates for several HS chapters reduced by 50%. Review your entitlement calculation against the updated Appendix 4R.', source_url: 'https://dgft.gov.in', source_name: 'DGFT India', severity: 'critical', alert_type: 'regulation_change', product_tags: ['Chemicals', 'Steel'], date: '2026-02-23', scraped_at: '2026-02-23' },
    { id: 's3', country_code: 'EU', country_name: 'European Union', flag: '🇪🇺', title: 'EUDR enforcement delayed to Dec 2025 — now active', change_description: 'EU Deforestation Regulation (EUDR) enforcement for large companies began December 2025. SME deadline is June 2026. Exporters of wood, leather, palm oil, soy, cocoa, coffee, and rubber must provide due diligence statements.', source_url: 'https://environment.ec.europa.eu', source_name: 'EU Environment', severity: 'critical', alert_type: 'regulation_change', product_tags: ['Food & Agriculture'], date: '2025-12-30', scraped_at: '2025-12-30' },
    { id: 's4', country_code: 'US', country_name: 'United States', flag: '🇺🇸', title: 'UFLPA enforcement expanded — textile sector', change_description: "US CBP has expanded Uyghur Forced Labor Prevention Act (UFLPA) enforcement to include yarn, fabric, and garment inputs from Xinjiang. Shipments may be detained at US ports pending importer's rebuttal evidence.", source_url: 'https://www.cbp.gov', source_name: 'US CBP', severity: 'warning', alert_type: 'enforcement_action', product_tags: ['Textiles'], date: '2026-03-01', scraped_at: '2026-03-01' },
    { id: 's5', country_code: 'UAE', country_name: 'UAE', flag: '🇦🇪', title: 'India-UAE CEPA — Rules of Origin updated', change_description: 'India-UAE Comprehensive Economic Partnership Agreement Rules of Origin for textiles and engineering goods updated. Review Chapter 3 qualification criteria before claiming 0% preferential duty on CEPA-covered shipments.', source_url: 'https://mofaic.gov.ae', source_name: 'UAE MoFAIC', severity: 'warning', alert_type: 'regulation_change', product_tags: ['Textiles', 'Machinery'], date: '2026-02-15', scraped_at: '2026-02-15' },
  ]

  // The feed classifier keys off words like "ban", "penalty" or "withhold
  // release" anywhere in the text, so a vape-smuggling story arrives as
  // critical for a steel exporter. An alert is only urgent here when it is
  // about this company's goods; everything else is demoted a level.
  const productTerms = products
    .flatMap(p => p.toLowerCase().split(/[^a-z]+/))
    .filter(w => w.length > 3)

  const isRelevant = (row: { product_tags?: string[] | null; title?: string | null; change_description?: string | null }) => {
    const tags = (row.product_tags ?? []).map(t => t.toLowerCase())
    if (products.some(p => tags.includes(p.toLowerCase()))) return true
    const text = `${row.title ?? ''} ${row.change_description ?? ''}`.toLowerCase()
    return productTerms.some(term => text.includes(term))
  }

  const seen = new Set<string>()
  const alerts = effectiveRows
    // Drop items that are not regulation at all. The ingestion function stores
    // whatever a keyword search returns, which is how an exam-prep roundup
    // reached the dashboard tagged "Urgent — action required before your next
    // shipment". Filtering on read fixes the rows already stored.
    .filter(row => !isUnrelatedToTrade({
      title: row.title, description: row.change_description, sourceName: row.source_name,
    }))
    .map(row => {
      const title = cleanFeedText(row.title)
      const body = cleanFeedText(row.change_description)
      const relevant = isRelevant(row)
      const byProduct = (relevant
        ? row.severity
        : row.severity === 'critical' ? 'warning' : row.severity) as 'critical' | 'warning' | 'info'
      // An item with no regulatory signal may still be listed, but it must not
      // present itself as urgent.
      const severity = cappedSeverity(
        { title: row.title, description: row.change_description, sourceName: row.source_name },
        byProduct
      )
      return { row, title, body, relevant, severity }
    })
    // The same story often arrives from several feeds on the same day.
    .filter(a => {
      const key = `${a.title}|${a.row.country_code}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => {
      if (a.relevant !== b.relevant) return a.relevant ? -1 : 1
      const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
      return (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2)
    })
    .map((a, idx) => ({
      id: idx + 1,
      type: a.row.alert_type ?? 'regulation_change',
      severity: a.severity,
      country: a.row.country_code,
      countryName: a.row.country_name ?? a.row.country_code,
      flag: a.row.flag ?? '🌐',
      date: a.row.date,
      message: a.title ? `${a.title}: ${a.body}` : a.body,
      sourceUrl: a.row.source_url,
      sourceName: a.row.source_name,
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
    status: 'submitted' | 'submission_failed' | 'payload_ready'
    /** Issued by ICEGATE. Null whenever the payload was not actually submitted. */
    reference_number: string | null
    live_submission: boolean
    icegate_job_number: number | null
    draft_job_number: number
    icegate_response: unknown
    payload: unknown
    schema_version: string
    note: string
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
    warnings?: string[]
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

// ─── Document AI Review ───────────────────────────────────────
export interface DocumentReviewIssue {
  severity: 'critical' | 'warning' | 'info'
  field: string
  finding: string
  fix: string
}

export interface DocumentReviewResult {
  verdict: 'pass' | 'flag' | 'fail'
  score: number
  issues: DocumentReviewIssue[]
  summary: string
}

export async function reviewDocuments(
  documents: Array<{ name: string; base64: string; type: 'invoice' | 'packing_list' | 'shipping_bill' | 'other' }>,
  context?: { hsCode?: string; destinationCountry?: string; product?: string }
): Promise<DocumentReviewResult> {
  const { data, error } = await supabase.functions.invoke('document-review', {
    body: { documents, ...context },
  })
  if (error) throw new Error(error.message)
  return data as DocumentReviewResult
}

// ─── Export Contract Review ───────────────────────────────────
export type ContractType = 'sale_contract' | 'letter_of_credit' | 'freight_agreement' | 'bank_guarantee' | 'insurance_policy' | 'other'
export type PartyPosition = 'exporter' | 'buyer'

export interface ContractRedFlag {
  clause: string
  current_text: string
  risk: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface ContractKeyTerm {
  term: string
  value: string
  market_standard: string
  rating: 'favourable' | 'standard' | 'unfavourable'
}

export interface ContractMissingProvision {
  provision: string
  importance: 'critical' | 'recommended'
  why: string
  suggested_language: string
}

export interface ContractNegotiability {
  clause: string
  current: string
  suggested_change: string
  realistic: 'high' | 'medium' | 'low'
  reason: string
}

export interface ContractProtectiveClause {
  name: string
  purpose: string
  language: string
}

export interface ContractReviewResult {
  verdict: 'clear' | 'review' | 'risky'
  risk_score: number
  contract_type_detected: string
  summary: string
  red_flags: ContractRedFlag[]
  key_terms: ContractKeyTerm[]
  missing_provisions: ContractMissingProvision[]
  negotiability: ContractNegotiability[]
  protective_clauses: ContractProtectiveClause[]
  rbi_fema_flags: string[]
  incoterms_notes: string | null
}

export async function reviewExportContract(params: {
  contractText?: string
  base64?: string
  fileName?: string
  contractType: ContractType
  partyPosition: PartyPosition
  counterpartyCountry?: string
}): Promise<ContractReviewResult> {
  const { data, error } = await supabase.functions.invoke('contract-review', { body: params })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data as ContractReviewResult
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

// ─── WhatsApp Notification Settings ─────────────────────────
export interface NotificationSettings {
  whatsapp_number: string | null
  whatsapp_alerts: boolean
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { whatsapp_number: null, whatsapp_alerts: false }

  const { data, error } = await supabase
    .from('companies')
    .select('whatsapp_number, whatsapp_alerts')
    .eq('id', profile.company_id)
    .single()

  if (error) throw new Error(error.message)
  return { whatsapp_number: data?.whatsapp_number ?? null, whatsapp_alerts: data?.whatsapp_alerts ?? false }
}

export async function updateNotificationSettings(settings: NotificationSettings): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('No company found')

  const { error } = await supabase
    .from('companies')
    .update({ whatsapp_number: settings.whatsapp_number, whatsapp_alerts: settings.whatsapp_alerts })
    .eq('id', profile.company_id)

  if (error) throw new Error(error.message)
}

export async function sendWhatsAppAlert(payload: {
  to: string
  severity: 'critical' | 'warning' | 'info'
  country: string
  message: string
  date?: string
  alertKey?: string
  companyId?: string
}): Promise<{ success: boolean; messageId?: string; simulated?: boolean; skipped?: boolean }> {
  const { data, error } = await supabase.functions.invoke('whatsapp-alert', { body: payload })
  if (error) throw new Error(error.message)
  return data
}

// ─── HS Code Mismatch Detector ───────────────────────────────
export interface HSMismatchSuggestedCode {
  code: string
  description: string
  reason: string
  confidence: number
}

export interface HSMismatchResult {
  mismatch: boolean
  risk: 'high' | 'medium' | 'low' | 'clear'
  confidence: number
  currentCode: { code: string; description: string }
  suggestedCodes: HSMismatchSuggestedCode[]
  findings: string[]
  penaltyRisk: string
  summary: string
}

export async function checkHSMismatch(payload: {
  hsCode: string
  productDescription: string
  product?: string
  invoiceValue?: number
  destinationCountry?: string
  quantity?: number
  unit?: string
}): Promise<HSMismatchResult> {
  const { data, error } = await supabase.functions.invoke('hs-mismatch-check', { body: payload })
  if (error) throw new Error(error.message)
  if (!data?.success) throw new Error(data?.error ?? 'Mismatch check failed')
  return data.data as HSMismatchResult
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

  // treds-financing refuses with 503 when no TReDS platform is connected and
  // 501 until submission is implemented, so this resolves only on a real
  // factoring unit being created.
  return data as {
    success: boolean
    message: string
    reference_id: string
    factoring_unit: unknown
  }
}

// ─── API Keys (Supabase-persisted) ───────────────────────────
// Keys are stored in the api_keys table. Only the SHA-256 hash and
// the first 12-character prefix are stored — the full key is shown
// to the user once at creation time and never persisted in plaintext.

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function fetchAPIKeys(): Promise<APIKeyInfo[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, rate_limit, permissions')
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as APIKeyInfo[]
}

export async function createAPIKey(name: string): Promise<{ key: string; id: string }> {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const key = `cos_${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40)}`
  const keyHash = await sha256Hex(key)
  const keyPrefix = key.slice(0, 12)

  const { data: userResp } = await supabase.auth.getUser()
  if (!userResp.user) throw new Error('Not authenticated')

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', userResp.user.id)
    .single()
  if (profileErr || !profile) throw new Error('Company profile not found')

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      company_id: profile.company_id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      permissions: ['read'],
      rate_limit: 1000,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create API key')

  return { key, id: data.id }
}

export async function revokeAPIKey(id: string): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Compliance Doc Pack PDF ──────────────────────────────────
export async function generateChecklistPDF(
  selectedProduct: string,
  selectedCountries: string[],
  checklist: Array<{ id: string | number; item: string; category: string; priority: string; phase: string; details?: string }>,
  checkedItems: Record<string, boolean>
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 18
  const colW = W - margin * 2
  let y = 20

  // Header
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('ComplianceOS — Export Compliance Pack', margin, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Product: ${selectedProduct}   |   Markets: ${selectedCountries.join(', ')}   |   ${new Date().toLocaleDateString('en-IN')}`, margin, 21)
  y = 36

  // Progress summary
  const total = checklist.length
  const completed = checklist.filter(i => checkedItems[String(i.id)]).length
  const critical = checklist.filter(i => i.priority === 'critical' && !checkedItems[String(i.id)]).length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  doc.setTextColor(30, 30, 30)
  doc.setFillColor(240, 253, 244)
  doc.roundedRect(margin, y, colW, 18, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text(`${completed}/${total} items complete — ${pct}%`, margin + 4, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(
    critical > 0 ? `  ${critical} critical item${critical > 1 ? 's' : ''} still pending` : 'All critical items complete',
    margin + 4, y + 14
  )
  y += 26

  // Group by category
  const categories = [...new Set(checklist.map(i => i.category))]

  const priorityColor = (p: string): [number, number, number] => {
    if (p === 'critical') return [220, 38, 38]
    if (p === 'high') return [234, 88, 12]
    if (p === 'medium') return [202, 138, 4]
    return [100, 116, 139]
  }

  for (const category of categories) {
    const items = checklist.filter(i => i.category === category)
    if (items.length === 0) continue

    if (y > 260) { doc.addPage(); y = 20 }
    doc.setFillColor(241, 245, 249)
    doc.rect(margin, y, colW, 8, 'F')
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(category.toUpperCase(), margin + 3, y + 5.5)
    const catDone = items.filter(i => checkedItems[String(i.id)]).length
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`${catDone}/${items.length}`, margin + colW - 12, y + 5.5)
    y += 10

    for (const item of items) {
      if (y > 272) { doc.addPage(); y = 20 }
      const checked = !!checkedItems[String(item.id)]
      const [r, g, b] = priorityColor(item.priority)

      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.3)
      doc.rect(margin, y + 0.5, 4, 4)
      if (checked) {
        doc.setTextColor(22, 163, 74)
        doc.setFontSize(8)
        doc.text('v', margin + 0.7, y + 3.8)
      }

      doc.setFillColor(r, g, b)
      doc.circle(margin + 7, y + 2.5, 1.2, 'F')

      doc.setTextColor(checked ? 140 : 30, checked ? 140 : 30, checked ? 140 : 30)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(item.item, colW - 30) as string[]
      doc.text(lines, margin + 10, y + 3.5)

      doc.setTextColor(100, 116, 139)
      doc.setFontSize(7)
      doc.text(item.phase, margin + colW - 20, y + 3.5)

      y += Math.max(6, lines.length * 4.5)
    }
    y += 3
  }

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(margin, 287, W - margin, 287)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text('ComplianceOS — informational guidance only. Not legal, tax, or trade advice.', margin, 292)
    doc.text(`Page ${p}/${pageCount}`, W - margin - 15, 292)
  }

  doc.save(`compliance-pack-${selectedProduct.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
