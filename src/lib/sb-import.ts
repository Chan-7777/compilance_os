// ============================================================================
// Shipping bill import — matching plan (pure; api.ts does the I/O)
// ============================================================================

import { convertToINR } from './fx'
import { rodtepEntitlement } from './rodtep'

export type SbMatchType = 'exact' | 'prefix' | 'default'

export interface ShippingBillRow {
  shippingBillNo: string
  date: string              // YYYY-MM-DD
  hsCode: string
  fobValue: number
  currency: string          // INR | USD | EUR | GBP | AED
  description?: string
  country?: string          // destination; defaults to 'EU'
  buyerName?: string
  iec?: string
  gstin?: string
  invoiceNumber?: string
  invoiceDate?: string      // YYYY-MM-DD
}

export interface ImportInvoice {
  id: string
  shipment_id: string | null
  kind: string
  status: string
  invoice_number: string | null
  invoice_date: string | null
  exporter_gstin: string | null
}

export interface ImportShipment {
  id: string
  shipping_bill_no: string | null
  country: string | null
  buyer_name: string | null
}

export interface ImportContext {
  companyId: string
  companyIec: string | null
  invoices: ImportInvoice[]
  shipments: ImportShipment[]
  rateFor: (hsDigits: string) => { rate: number; matchType: SbMatchType } | undefined
}

export type ImportAction =
  | { kind: 'insert'; row: number; values: Record<string, unknown>; linkInvoiceId: string | null
      entitlementInr: number; matchType: SbMatchType }
  | { kind: 'update'; row: number; shipmentId: string; patch: Record<string, unknown>; linkInvoiceId: string | null
      entitlementInr: number; matchType: SbMatchType }

export interface ImportPlan {
  actions: ImportAction[]
  rejected: Array<{ row: number; reason: string }>
  skippedDuplicates: number
  iecUnchecked: number
  invoiceNotFound: number
}

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, '').toUpperCase()
const isIsoDate = (s: string | undefined) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

/**
 * Decides, row by row, whether a shipping bill updates an existing shipment,
 * creates one, links an invoice, or is refused. Nothing is guessed: any row
 * that could land on more than one shipment, or would put one shipping bill on
 * two shipments, is rejected with a reason for the user to resolve.
 *
 * Match order:
 *  1. IEC on the row (if any) must be the company's.
 *  2. An ISSUED COMMERCIAL invoice with the same number (trimmed,
 *     case-insensitive) and date, under the row's GSTIN when it carries one.
 *     GST numbers invoices per GSTIN, so branches in different states can
 *     share a number; with no GSTIN on the row, two matches are ambiguous.
 *  3. Otherwise the shipment already carrying this shipping bill number.
 *  4. Otherwise a new shipment.
 */
export function planShippingBillImport(rows: ShippingBillRow[], ctx: ImportContext): ImportPlan {
  const plan: ImportPlan = { actions: [], rejected: [], skippedDuplicates: 0, iecUnchecked: 0, invoiceNotFound: 0 }
  const companyIec = norm(ctx.companyIec)

  // Working state, updated as rows are accepted so later rows in the same file
  // see earlier ones.
  const shipments = new Map(ctx.shipments.map(s => [s.id, { ...s }]))
  const invoiceLink = new Map(ctx.invoices.map(i => [i.id, i.shipment_id]))
  const holdersOf = (sb: string) => [...shipments.values()].filter(s => norm(s.shipping_bill_no) === norm(sb))
  const eligible = ctx.invoices.filter(i => i.kind === 'commercial' && i.status === 'issued' && i.invoice_number)
  const seenSb = new Set<string>()

  rows.forEach((r, i) => {
    const rowNo = i + 2 // 1-based + header line
    const reject = (reason: string) => { plan.rejected.push({ row: rowNo, reason }) }
    const sb = r.shippingBillNo.trim()
    if (!sb) return reject('Missing shipping bill number')
    if (seenSb.has(norm(sb))) { plan.skippedDuplicates++; return }
    const hsDigits = r.hsCode.replace(/\D/g, '')
    if (hsDigits.length < 4) return reject(`Invalid HS code "${r.hsCode}"`)
    if (!(r.fobValue > 0)) return reject('FOB value must be > 0')
    if (!isIsoDate(r.date)) return reject(`Date "${r.date}" is not YYYY-MM-DD`)

    const rowIec = norm(r.iec)
    if (rowIec && !companyIec) return reject(`Row carries IEC ${rowIec} but your company has no IEC on file. Set it in Settings first.`)
    if (rowIec && rowIec !== companyIec) return reject(`IEC ${rowIec} is not your company's IEC (${companyIec}). This is another exporter's shipping bill.`)

    // ── Invoice match ──
    let invoiceId: string | null = null
    let invoiceNamed = false
    if (r.invoiceNumber?.trim()) {
      invoiceNamed = true
      if (isIsoDate(r.invoiceDate)) {
        const rowGstin = norm(r.gstin)
        const matches = eligible.filter(inv =>
          norm(inv.invoice_number) === norm(r.invoiceNumber) &&
          inv.invoice_date === r.invoiceDate &&
          (!rowGstin || norm(inv.exporter_gstin) === rowGstin))
        if (matches.length > 1) {
          return reject(rowGstin
            ? `Invoice ${r.invoiceNumber!.trim()} dated ${r.invoiceDate} matches ${matches.length} issued invoices under GSTIN ${rowGstin}.`
            : `Invoice ${r.invoiceNumber!.trim()} dated ${r.invoiceDate} was issued under more than one GSTIN. Add a GSTIN column to say which branch.`)
        }
        if (matches.length === 1) invoiceId = matches[0].id
      }
    }
    if (invoiceNamed && !invoiceId) plan.invoiceNotFound++

    const holders = holdersOf(sb)
    let targetId: string | null = null
    let linkInvoiceId: string | null = null

    if (invoiceId) {
      const linked = invoiceLink.get(invoiceId) ?? null
      if (linked) {
        const target = shipments.get(linked)
        if (!target) return reject(`Invoice ${r.invoiceNumber!.trim()} is linked to a shipment that is not in your company.`)
        if (target.shipping_bill_no && norm(target.shipping_bill_no) !== norm(sb)) {
          return reject(`Invoice ${r.invoiceNumber!.trim()} is already on a shipment with shipping bill ${target.shipping_bill_no.trim()}.`)
        }
        if (holders.some(h => h.id !== target.id)) {
          return reject(`Shipping bill ${sb} is already on another shipment than the one invoice ${r.invoiceNumber!.trim()} is linked to. Merge them by hand before re-importing.`)
        }
        targetId = target.id
      } else {
        if (holders.length > 1) return reject(`Shipping bill ${sb} is on ${holders.length} shipments. Merge them by hand before re-importing.`)
        targetId = holders[0]?.id ?? null
        linkInvoiceId = invoiceId
      }
    } else {
      if (holders.length > 1) return reject(`Shipping bill ${sb} is on ${holders.length} shipments. Merge them by hand before re-importing.`)
      targetId = holders[0]?.id ?? null
    }

    // ── Accepted ──
    if (!rowIec) plan.iecUnchecked++
    seenSb.add(norm(sb))

    const rate = ctx.rateFor(hsDigits) ?? { rate: 0, matchType: 'default' as const }
    // A shipping bill states FOB, so the basis is genuine here. Its date drives
    // both the exchange rate and whether RoDTEP is notified at all.
    const fobInr = convertToINR(r.fobValue, r.currency, r.date)
    const entitlementInr = rodtepEntitlement({ fobInr, ratePct: rate.rate, letExportDate: r.date }).amountInr ?? 0
    const currency = (r.currency || 'USD').toUpperCase()
    const sbFields = {
      shipping_bill_no: sb,
      date: r.date,
      hs_code: hsDigits,
      shipment_value: r.fobValue,
      value_currency: currency,
      rodtep_rate: rate.rate,
      rodtep_match_type: rate.matchType,
    }

    if (targetId) {
      const target = shipments.get(targetId)!
      const patch: Record<string, unknown> = { ...sbFields }
      if (!target.country?.trim() && r.country?.trim()) patch.country = r.country.trim()
      if (!target.buyer_name?.trim() && r.buyerName?.trim()) patch.buyer_name = r.buyerName.trim()
      target.shipping_bill_no = sb
      if (linkInvoiceId) invoiceLink.set(linkInvoiceId, targetId)
      plan.actions.push({ kind: 'update', row: rowNo, shipmentId: targetId, patch, linkInvoiceId, entitlementInr, matchType: rate.matchType })
    } else {
      const placeholder = `new:${rowNo}`
      shipments.set(placeholder, { id: placeholder, shipping_bill_no: sb, country: null, buyer_name: null })
      if (linkInvoiceId) invoiceLink.set(linkInvoiceId, placeholder)
      plan.actions.push({
        kind: 'insert', row: rowNo, linkInvoiceId, entitlementInr, matchType: rate.matchType,
        values: {
          company_id: ctx.companyId,
          name: r.description?.trim() || `SB ${sb}`,
          product: 'general',
          country: r.country?.trim() || 'EU',
          buyer_name: r.buyerName?.trim() || null,
          ...sbFields,
          rodtep_claimed: false,
          rodtep_claim_status: 'unclaimed',
          status: 'delivered',
        },
      })
    }
  })
  return plan
}
