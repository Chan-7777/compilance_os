// ============================================================================
// Invoices — reads and writes for the invoices / invoice_line_items tables.
//
// The database does the enforcing (see invoices_guard() in migration
// 20260923000001): invoices are born drafts, only drafts are editable, an
// issued invoice can only be cancelled, and a commercial invoice can't be
// issued without a real exchange rate. This module never mints an invoice
// number; it stores the one the exporter typed.
// ============================================================================

import { supabase } from './supabase'
import type { LinkedInvoice } from './shipment-lines'
import { invoiceDocumentFromRows, type InvoiceDocument, type InvoiceKind, type InvoiceStatus } from './invoice-documents'

/** Everything on the invoice row a user can type into a draft. */
export interface InvoiceHeaderInput {
  kind: InvoiceKind
  invoiceNumber: string
  invoiceDate: string
  irn: string

  exporterName: string
  exporterAddress: string
  exporterGstin: string
  exporterIec: string
  exporterStateCode: string
  exporterBankName: string
  exporterBankBranch: string
  exporterBankAccount: string
  exporterBankIfsc: string
  exporterBankSwift: string
  exporterBankAdCode: string

  buyerName: string
  buyerAddress: string
  buyerCountry: string
  buyerTaxId: string
  consigneeName: string
  consigneeAddress: string
  consigneeCountry: string

  incoterm: string
  incotermPlace: string
  portOfLoading: string
  portOfDischarge: string
  destinationCountry: string
  originCountry: string
  paymentTerms: string

  currency: string
  /** INR per 1 unit of currency, as typed. Empty = no rate. */
  fxRateInr: string
  fxRateDate: string
  /** Invoice currency. Needed for CFR/CPT (freight) and CIF/CIP (both). */
  freightAmount: string
  insuranceAmount: string
}

export interface InvoiceLineInput {
  description: string
  hsCode: string
  quantity: string
  uom: string
  unitPrice: string
  marks: string
  packageCount: string
  packageKind: string
  netWeightKg: string
  grossWeightKg: string
}

export interface InvoiceListItem {
  id: string
  shipmentId: string | null
  kind: InvoiceKind
  status: InvoiceStatus
  invoiceNumber: string | null
  invoiceDate: string | null
  buyerName: string | null
  currency: string
  updatedAt: string
}

// ── Pure mapping (tested) ────────────────────────────────────────────────────

const text = (v: string) => (v.trim() === '' ? null : v.trim())
const upper = (v: string) => (v.trim() === '' ? null : v.trim().toUpperCase())
const decimal = (v: string) => {
  const t = v.trim().replace(/,/g, '')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

/**
 * Draft header -> invoices columns. Blank strings become NULL so the
 * database's issue checks see a missing field as missing. No number, date or
 * IRN is ever derived here.
 */
export function invoiceHeaderToRow(h: InvoiceHeaderInput): Record<string, unknown> {
  const fx = decimal(h.fxRateInr)
  return {
    kind: h.kind,
    invoice_number: text(h.invoiceNumber),
    invoice_date: text(h.invoiceDate),
    irn: h.irn.trim() === '' ? null : h.irn.trim().toLowerCase(),
    exporter_name: text(h.exporterName),
    exporter_address: text(h.exporterAddress),
    exporter_gstin: upper(h.exporterGstin),
    exporter_iec: upper(h.exporterIec),
    exporter_state_code: text(h.exporterStateCode),
    exporter_bank_name: text(h.exporterBankName),
    exporter_bank_branch: text(h.exporterBankBranch),
    exporter_bank_account: text(h.exporterBankAccount),
    exporter_bank_ifsc: upper(h.exporterBankIfsc),
    exporter_bank_swift: upper(h.exporterBankSwift),
    exporter_bank_ad_code: text(h.exporterBankAdCode),
    buyer_name: text(h.buyerName),
    buyer_address: text(h.buyerAddress),
    buyer_country: text(h.buyerCountry),
    buyer_tax_id: text(h.buyerTaxId),
    consignee_name: text(h.consigneeName),
    consignee_address: text(h.consigneeAddress),
    consignee_country: text(h.consigneeCountry),
    incoterm: upper(h.incoterm),
    incoterm_place: text(h.incotermPlace),
    port_of_loading: text(h.portOfLoading),
    port_of_discharge: text(h.portOfDischarge),
    destination_country: text(h.destinationCountry),
    origin_country: text(h.originCountry),
    payment_terms: text(h.paymentTerms),
    currency: upper(h.currency) ?? 'USD',
    fx_rate_inr: fx,
    fx_rate_date: fx === null ? null : text(h.fxRateDate),
    // A rate the user typed is 'manual'. 'cbic' arrives only once a notified
    // table is loaded; 'fallback' is never written, the database refuses to
    // issue a commercial invoice on it anyway.
    fx_rate_source: fx === null ? null : 'manual',
    freight_amount: decimal(h.freightAmount),
    insurance_amount: decimal(h.insuranceAmount),
  }
}

/**
 * Validate and map lines. Returns the rows to write, or the problems found,
 * numbered as the user sees them (1-based). The database checks the same
 * things; this just says so before a round trip, in words.
 */
export function invoiceLinesToRows(
  lines: InvoiceLineInput[],
): { rows: Record<string, unknown>[]; errors: string[] } {
  const errors: string[] = []
  const rows = lines.map((l, i) => {
    const n = i + 1
    const qty = decimal(l.quantity)
    const price = decimal(l.unitPrice)
    const pkgs = decimal(l.packageCount)
    const net = decimal(l.netWeightKg)
    const gross = decimal(l.grossWeightKg)
    const hs = l.hsCode.replace(/[\s.]/g, '')

    if (!l.description.trim()) errors.push(`Line ${n}: description is required`)
    if (!/^[0-9]{4,8}$/.test(hs)) errors.push(`Line ${n}: HS code must be 4 to 8 digits`)
    if (qty === null || !(qty > 0)) errors.push(`Line ${n}: quantity must be greater than 0`)
    if (!l.uom.trim()) errors.push(`Line ${n}: unit is required`)
    if (price === null || !(price >= 0)) errors.push(`Line ${n}: unit price must be 0 or more`)
    if (pkgs !== null && !(Number.isInteger(pkgs) && pkgs > 0)) errors.push(`Line ${n}: packages must be a whole number above 0`)
    if (net !== null && !(net > 0)) errors.push(`Line ${n}: net weight must be greater than 0`)
    if (gross !== null && !(gross > 0)) errors.push(`Line ${n}: gross weight must be greater than 0`)
    if (net !== null && gross !== null && gross < net) errors.push(`Line ${n}: gross weight can't be less than net weight`)

    return {
      line_no: n,
      description: l.description.trim(),
      hs_code: hs,
      quantity: qty,
      uom: l.uom.trim(),
      unit_price: price,
      marks: text(l.marks),
      package_count: pkgs,
      package_kind: text(l.packageKind),
      net_weight_kg: net,
      gross_weight_kg: gross,
    }
  })
  if (lines.length === 0) errors.push('Add at least one line')
  return { rows, errors }
}

/** Turn the database's refusals into something an exporter can act on. */
export function friendlyInvoiceError(message: string): string {
  if (message.includes('invoices_issue_requires_snapshot')) {
    return 'To issue, fill in invoice number, invoice date, exporter name, IEC, buyer name, buyer country and Incoterm.'
  }
  if (message.includes('invoices_commercial_issue_requires_real_fx')) {
    return 'A commercial invoice needs the exchange rate you are invoicing at: INR per unit of currency, and its date.'
  }
  if (message.includes('invoices_number_unique_per_fy')) {
    return 'That invoice number is already used in this financial year (cancelled numbers stay reserved).'
  }
  if (message.includes('with no line items')) return 'Add at least one line before issuing.'
  if (message.includes('needs a freight amount') || message.includes('needs an insurance amount')) {
    return 'A CFR or CPT invoice needs its freight amount, and a CIF or CIP invoice needs freight and insurance, before it can be issued. RoDTEP is paid on FOB and these reduce the value to FOB.'
  }
  if (message.includes('exporter_bank_ifsc')) return 'IFSC must be 11 characters, like SBIN0001234.'
  if (message.includes('exporter_bank_swift')) return 'SWIFT / BIC must be 8 or 11 characters, like SBININBB or SBININBBXXX.'
  if (message.includes('irn')) return 'IRN must be the 64-character hash from the e-invoice portal.'
  if (message.includes('invoice_number')) return 'Invoice number must be 1 to 16 characters.'
  if (message.includes('cannot be edited') || message.includes('immutable')) {
    return 'This invoice has been issued and can no longer be edited. Cancel it and issue a new one.'
  }
  return message
}

// ── Database calls ───────────────────────────────────────────────────────────

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(friendlyInvoiceError(error?.message ?? fallback))
}

export async function listInvoices(companyId: string): Promise<InvoiceListItem[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, shipment_id, kind, status, invoice_number, invoice_date, buyer_name, currency, updated_at')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
  if (error) fail(error, 'Could not load invoices')
  return (data ?? []).map(r => ({
    id: r.id,
    shipmentId: r.shipment_id,
    kind: r.kind,
    status: r.status,
    invoiceNumber: r.invoice_number,
    invoiceDate: r.invoice_date,
    buyerName: r.buyer_name,
    currency: r.currency,
    updatedAt: r.updated_at,
  }))
}

export async function fetchInvoiceDocument(id: string): Promise<InvoiceDocument> {
  const [inv, lines] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('line_no'),
  ])
  if (inv.error || !inv.data) fail(inv.error, 'Invoice not found')
  if (lines.error) fail(lines.error, 'Could not load invoice lines')
  return invoiceDocumentFromRows(inv.data, lines.data ?? [])
}

/**
 * Create or update a DRAFT and replace its lines. Returns the invoice id.
 * Lines are upserted by line_no and any beyond the new count removed, so a
 * failure part-way leaves a (still editable) draft, never an empty one.
 */
export async function saveInvoiceDraft(
  companyId: string,
  id: string | null,
  header: InvoiceHeaderInput,
  lines: InvoiceLineInput[],
): Promise<string> {
  const { rows, errors } = invoiceLinesToRows(lines)
  if (errors.length) throw new Error(errors.join('\n'))
  const row = invoiceHeaderToRow(header)
  if (Number.isNaN(row.fx_rate_inr)) throw new Error('Exchange rate must be a number')
  for (const [col, label] of [['freight_amount', 'Freight'], ['insurance_amount', 'Insurance']] as const) {
    const v = row[col] as number | null
    if (v !== null && (Number.isNaN(v) || v < 0)) throw new Error(`${label} must be a number, 0 or more`)
  }

  let invoiceId = id
  if (invoiceId) {
    const { error } = await supabase.from('invoices').update(row).eq('id', invoiceId)
    if (error) fail(error, 'Could not save invoice')
  } else {
    const { data, error } = await supabase
      .from('invoices')
      .insert({ ...row, company_id: companyId, status: 'draft' })
      .select('id')
      .single()
    if (error || !data) fail(error, 'Could not create invoice')
    invoiceId = data.id as string
  }

  const { error: upsertErr } = await supabase
    .from('invoice_line_items')
    .upsert(rows.map(r => ({ ...r, invoice_id: invoiceId, company_id: companyId })), { onConflict: 'invoice_id,line_no' })
  if (upsertErr) fail(upsertErr, 'Could not save invoice lines')

  const { error: trimErr } = await supabase
    .from('invoice_line_items')
    .delete()
    .eq('invoice_id', invoiceId)
    .gt('line_no', rows.length)
  if (trimErr) fail(trimErr, 'Could not remove deleted lines')

  return invoiceId as string
}

export async function issueInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').update({ status: 'issued' }).eq('id', id)
  if (error) fail(error, 'Could not issue invoice')
}

export async function cancelInvoice(id: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'cancelled', cancel_reason: reason.trim() })
    .eq('id', id)
  if (error) fail(error, 'Could not cancel invoice')
}

export async function deleteInvoiceDraft(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id).eq('status', 'draft')
  if (error) fail(error, 'Could not delete draft')
}

/**
 * Attach an invoice to a shipment, or detach it (null). Allowed at any status:
 * invoices_guard() treats shipment_id as a link, not document content. An
 * issued commercial invoice linked here drives that shipment's gate check and
 * RoDTEP per line.
 */
export async function linkInvoiceToShipment(invoiceId: string, shipmentId: string | null): Promise<void> {
  const { error } = await supabase.from('invoices').update({ shipment_id: shipmentId }).eq('id', invoiceId)
  if (error) fail(error, 'Could not link invoice to shipment')
}

/**
 * Issued commercial invoices (with lines) for the given shipments, grouped by
 * shipment. Drafts, cancelled and proforma invoices are left out here AND by
 * countingInvoices(); a shipment absent from the map keeps the single-HS path.
 */
export async function fetchLinkedInvoices(shipmentIds: string[]): Promise<Map<string, LinkedInvoice[]>> {
  const out = new Map<string, LinkedInvoice[]>()
  // Chunked: 500 uuids in one in() filter is an ~18 kB query string.
  const rows: any[] = []
  for (let i = 0; i < shipmentIds.length; i += 100) {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, shipment_id, invoice_number, kind, status, incoterm, currency, fx_rate_inr, freight_amount, insurance_amount, invoice_line_items(line_no, hs_code, amount)')
      .in('shipment_id', shipmentIds.slice(i, i + 100))
      .eq('kind', 'commercial')
      .eq('status', 'issued')
    if (error) fail(error, 'Could not load invoices for shipments')
    rows.push(...(data ?? []))
  }
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  for (const r of rows) {
    const list = out.get(r.shipment_id) ?? []
    list.push({
      id: r.id,
      invoiceNumber: r.invoice_number,
      kind: r.kind,
      status: r.status,
      incoterm: r.incoterm,
      currency: r.currency,
      fxRateInr: n(r.fx_rate_inr),
      freightAmount: n(r.freight_amount),
      insuranceAmount: n(r.insurance_amount),
      lines: ((r.invoice_line_items ?? []) as Array<{ line_no: number; hs_code: string; amount: number | string }>)
        .map(l => ({ lineNo: l.line_no, hsCode: l.hs_code, amount: Number(l.amount) })),
    })
    out.set(r.shipment_id, list)
  }
  return out
}

export interface ShipmentOption { id: string; name: string; date: string }

/** The company's shipments, newest first, for the invoice -> shipment picker. */
export async function listShipmentOptions(companyId: string): Promise<ShipmentOption[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('id, name, date')
    .eq('company_id', companyId)
    .order('date', { ascending: false })
  if (error) fail(error, 'Could not load shipments')
  return (data ?? []) as ShipmentOption[]
}
