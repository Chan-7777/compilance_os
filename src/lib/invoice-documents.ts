// ============================================================================
// Commercial Invoice, Proforma Invoice and Packing List
//
// Multi-line documents rendered from ONE invoice row and its line items
// (tables from migrations 20260923000001 and 20260923000002). Uses the print
// harness in eu-documents.ts.
//
// Two rules this module exists to keep:
//   * Everything printed comes from the invoice's snapshot columns. Nothing
//     here reads the live company profile or a buyer record, so a document
//     reprinted next year says exactly what the one sent to the buyer said.
//   * Invoice numbers are never minted. A draft without a number prints as
//     unnumbered; no reference, timestamp or sequence stands in for one,
//     because IGST refunds match the shipping bill to GSTR-1 by that number.
// ============================================================================

import { BASE_CSS, PRINT_BUTTONS, escapeHtml as esc, openAndPrint } from './eu-documents'

export type InvoiceKind = 'proforma' | 'commercial'
export type InvoiceStatus = 'draft' | 'issued' | 'cancelled'

/** The invoices row, as the snapshot it is. Field names mirror the columns. */
export interface InvoiceSnapshot {
  id: string
  kind: InvoiceKind
  status: InvoiceStatus
  invoiceNumber: string | null
  invoiceDate: string | null
  irn: string | null

  exporterName: string | null
  exporterAddress: string | null
  exporterGstin: string | null
  exporterIec: string | null
  exporterStateCode: string | null
  exporterBankName: string | null
  exporterBankBranch: string | null
  exporterBankAccount: string | null
  exporterBankIfsc: string | null
  exporterBankSwift: string | null
  exporterBankAdCode: string | null

  buyerName: string | null
  buyerAddress: string | null
  buyerCountry: string | null
  buyerTaxId: string | null
  consigneeName: string | null
  consigneeAddress: string | null
  consigneeCountry: string | null

  incoterm: string | null
  incotermPlace: string | null
  portOfLoading: string | null
  portOfDischarge: string | null
  destinationCountry: string | null
  originCountry: string | null
  paymentTerms: string | null

  currency: string
  fxRateInr: number | null
  fxRateDate: string | null
  fxRateSource: 'cbic' | 'manual' | 'fallback' | null
  /** Invoice currency. Reduce a CFR/CPT or CIF/CIP value to FOB. */
  freightAmount: number | null
  insuranceAmount: number | null
  /** Link to the shipment this invoice covers; editable even after issue. */
  shipmentId: string | null

  issuedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
}

export interface InvoiceLine {
  lineNo: number
  description: string
  hsCode: string
  quantity: number
  uom: string
  unitPrice: number
  /** Generated column: round(quantity * unit_price, 2), in the invoice currency. */
  amount: number
  marks: string | null
  packageCount: number | null
  packageKind: string | null
  netWeightKg: number | null
  grossWeightKg: number | null
}

export interface InvoiceDocument {
  invoice: InvoiceSnapshot
  lines: InvoiceLine[]
}

// ── Row mapping ──────────────────────────────────────────────────────────────

type Row = Record<string, unknown>

const str = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : String(v))
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Map a PostgREST invoices row + its line rows. Lines are sorted by line_no. */
export function invoiceDocumentFromRows(row: Row, lineRows: Row[]): InvoiceDocument {
  const invoice: InvoiceSnapshot = {
    id: String(row.id),
    kind: row.kind as InvoiceKind,
    status: row.status as InvoiceStatus,
    invoiceNumber: str(row.invoice_number),
    invoiceDate: str(row.invoice_date),
    irn: str(row.irn),
    exporterName: str(row.exporter_name),
    exporterAddress: str(row.exporter_address),
    exporterGstin: str(row.exporter_gstin),
    exporterIec: str(row.exporter_iec),
    exporterStateCode: str(row.exporter_state_code),
    exporterBankName: str(row.exporter_bank_name),
    exporterBankBranch: str(row.exporter_bank_branch),
    exporterBankAccount: str(row.exporter_bank_account),
    exporterBankIfsc: str(row.exporter_bank_ifsc),
    exporterBankSwift: str(row.exporter_bank_swift),
    exporterBankAdCode: str(row.exporter_bank_ad_code),
    buyerName: str(row.buyer_name),
    buyerAddress: str(row.buyer_address),
    buyerCountry: str(row.buyer_country),
    buyerTaxId: str(row.buyer_tax_id),
    consigneeName: str(row.consignee_name),
    consigneeAddress: str(row.consignee_address),
    consigneeCountry: str(row.consignee_country),
    incoterm: str(row.incoterm),
    incotermPlace: str(row.incoterm_place),
    portOfLoading: str(row.port_of_loading),
    portOfDischarge: str(row.port_of_discharge),
    destinationCountry: str(row.destination_country),
    originCountry: str(row.origin_country),
    paymentTerms: str(row.payment_terms),
    currency: String(row.currency ?? 'USD'),
    fxRateInr: num(row.fx_rate_inr),
    fxRateDate: str(row.fx_rate_date),
    fxRateSource: str(row.fx_rate_source) as InvoiceSnapshot['fxRateSource'],
    freightAmount: num(row.freight_amount),
    insuranceAmount: num(row.insurance_amount),
    shipmentId: str(row.shipment_id),
    issuedAt: str(row.issued_at),
    cancelledAt: str(row.cancelled_at),
    cancelReason: str(row.cancel_reason),
  }
  const lines: InvoiceLine[] = lineRows
    .map(l => ({
      lineNo: Number(l.line_no),
      description: String(l.description ?? ''),
      hsCode: String(l.hs_code ?? ''),
      quantity: num(l.quantity) ?? 0,
      uom: String(l.uom ?? ''),
      unitPrice: num(l.unit_price) ?? 0,
      amount: num(l.amount) ?? 0,
      marks: str(l.marks),
      packageCount: num(l.package_count),
      packageKind: str(l.package_kind),
      netWeightKg: num(l.net_weight_kg),
      grossWeightKg: num(l.gross_weight_kg),
    }))
    .sort((a, b) => a.lineNo - b.lineNo)
  return { invoice, lines }
}

// ── Totals ───────────────────────────────────────────────────────────────────

export interface InvoiceTotals {
  /** Sum of line amounts in the invoice currency, summed in paise/cents. */
  amount: number
  /** amount * fx_rate_inr, or null when the invoice carries no rate. */
  amountInr: number | null
  /** null unless EVERY line states it; a partial sum would understate. */
  packages: number | null
  netWeightKg: number | null
  grossWeightKg: number | null
  /** Line numbers missing any of package count, net or gross weight. */
  linesMissingPacking: number[]
}

function sumIfComplete(values: (number | null)[], scale: number): number | null {
  if (values.length === 0 || values.some(v => v === null)) return null
  return values.reduce<number>((s, v) => s + Math.round((v as number) * scale), 0) / scale
}

export function invoiceTotals({ invoice, lines }: InvoiceDocument): InvoiceTotals {
  const amount = lines.reduce((s, l) => s + Math.round(l.amount * 100), 0) / 100
  return {
    amount,
    amountInr: invoice.fxRateInr === null ? null : Math.round(amount * invoice.fxRateInr * 100) / 100,
    packages: sumIfComplete(lines.map(l => l.packageCount), 1),
    netWeightKg: sumIfComplete(lines.map(l => l.netWeightKg), 1000),
    grossWeightKg: sumIfComplete(lines.map(l => l.grossWeightKg), 1000),
    linesMissingPacking: lines
      .filter(l => l.packageCount === null || l.netWeightKg === null || l.grossWeightKg === null)
      .map(l => l.lineNo),
  }
}

// ── Formatting ───────────────────────────────────────────────────────────────

/** Lakh grouping for rupees only; a foreign buyer reads 100,000.00. */
function money(value: number, currency: string): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Unit prices keep up to 4 decimals when the exporter priced that finely. */
function unitPrice(value: number, currency: string): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function quantity(value: number, maxDigits = 3): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: maxDigits })
}

function isoDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
  if (Number.isNaN(d.getTime())) return esc(value)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const orDash = (v: string | null | undefined) => (v ? esc(v) : '—')

// ── Shared blocks ────────────────────────────────────────────────────────────

const DOC_TITLE: Record<'commercial' | 'proforma' | 'packing', string> = {
  commercial: 'Commercial Invoice',
  proforma: 'Proforma Invoice',
  packing: 'Packing List',
}

function letterhead(inv: InvoiceSnapshot): string {
  const ids = [
    inv.exporterIec ? `IEC: ${esc(inv.exporterIec)}` : null,
    inv.exporterGstin ? `GSTIN: ${esc(inv.exporterGstin)}` : null,
    inv.exporterStateCode ? `State code: ${esc(inv.exporterStateCode)}` : null,
  ].filter(Boolean).join(' &nbsp;·&nbsp; ')
  return `
  <div class="letterhead">
    <div class="letterhead-name">${orDash(inv.exporterName)}</div>
    ${inv.exporterAddress ? `<div class="letterhead-line">${esc(inv.exporterAddress)}</div>` : ''}
    ${ids ? `<div class="letterhead-line">${ids}</div>` : ''}
  </div>`
}

function statusBanner(inv: InvoiceSnapshot, docLabel: string): string {
  if (inv.status === 'draft') {
    return `<div class="status-banner draft">DRAFT — this ${esc(docLabel.toLowerCase())} has not been issued and is not valid for shipment, payment or customs.</div>`
  }
  if (inv.status === 'cancelled') {
    return `<div class="status-banner cancelled">CANCELLED on ${isoDate(inv.cancelledAt)} — ${orDash(inv.cancelReason)}. This document is void.</div>`
  }
  return ''
}

function numberLabel(inv: InvoiceSnapshot): string {
  return inv.kind === 'proforma' ? 'Proforma No.' : 'Invoice No.'
}

function referenceBlock(inv: InvoiceSnapshot, extra: [string, string][] = []): string {
  const rows: [string, string][] = [
    [numberLabel(inv), inv.invoiceNumber ? `<span class="mono">${esc(inv.invoiceNumber)}</span>` : '<em>Not yet numbered</em>'],
    ['Date', isoDate(inv.invoiceDate)],
    ...(inv.irn ? [['IRN', `<span class="mono" style="font-size:10px;word-break:break-all">${esc(inv.irn)}</span>`] as [string, string]] : []),
    ...extra,
  ]
  return `<div class="kv">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}</div>`
}

function partiesBlock(inv: InvoiceSnapshot): string {
  const buyer = `
      <div class="info-box">
        <div class="data-label" style="margin-bottom:6px">Buyer</div>
        <div class="data-value" style="font-size:14px">${orDash(inv.buyerName)}</div>
        ${inv.buyerAddress ? `<div style="font-size:12px;color:#555;white-space:pre-line;margin-top:4px">${esc(inv.buyerAddress)}</div>` : ''}
        <div style="font-size:12px;margin-top:4px">${orDash(inv.buyerCountry)}</div>
        ${inv.buyerTaxId ? `<div style="font-size:11px;margin-top:6px"><span class="data-label">Tax / EORI: </span><span class="mono">${esc(inv.buyerTaxId)}</span></div>` : ''}
      </div>`
  const consignee = inv.consigneeName
    ? `
      <div class="info-box">
        <div class="data-label" style="margin-bottom:6px">Consignee</div>
        <div class="data-value" style="font-size:14px">${esc(inv.consigneeName)}</div>
        ${inv.consigneeAddress ? `<div style="font-size:12px;color:#555;white-space:pre-line;margin-top:4px">${esc(inv.consigneeAddress)}</div>` : ''}
        <div style="font-size:12px;margin-top:4px">${orDash(inv.consigneeCountry)}</div>
      </div>`
    : `
      <div class="info-box">
        <div class="data-label" style="margin-bottom:6px">Consignee</div>
        <div class="data-value">Same as buyer</div>
      </div>`
  return `<div class="section"><div class="grid-2">${buyer}${consignee}</div></div>`
}

function shipmentBlock(inv: InvoiceSnapshot): string {
  const incoterm = inv.incoterm ? `${esc(inv.incoterm)}${inv.incotermPlace ? ` ${esc(inv.incotermPlace)}` : ''}` : '—'
  return `
  <div class="section">
    <div class="grid-3">
      <div><div class="data-label">Country of origin</div><div class="data-value">${orDash(inv.originCountry)}</div></div>
      <div><div class="data-label">Final destination</div><div class="data-value">${orDash(inv.destinationCountry)}</div></div>
      <div><div class="data-label">Incoterm (2020)</div><div class="data-value">${incoterm}</div></div>
      <div><div class="data-label">Port of loading</div><div class="data-value">${orDash(inv.portOfLoading)}</div></div>
      <div><div class="data-label">Port of discharge</div><div class="data-value">${orDash(inv.portOfDischarge)}</div></div>
      <div><div class="data-label">Payment terms</div><div class="data-value">${orDash(inv.paymentTerms)}</div></div>
    </div>
  </div>`
}

function bankBlock(inv: InvoiceSnapshot): string {
  const rows: [string, string | null][] = [
    ['Bank', inv.exporterBankName],
    ['Branch', inv.exporterBankBranch],
    ['Account no.', inv.exporterBankAccount],
    ['IFSC', inv.exporterBankIfsc],
    ['SWIFT / BIC', inv.exporterBankSwift],
    ['AD code', inv.exporterBankAdCode],
  ]
  const present = rows.filter(([, v]) => v)
  const body = present.length
    ? `<div class="kv">${present.map(([k, v]) => `<div class="k">${k}</div><div class="v mono">${esc(v)}</div>`).join('')}</div>`
    : '<div style="font-size:12px;color:#888">No bank details on this invoice.</div>'
  return `<div><div class="section-title">Exporter's bank</div>${body}</div>`
}

function signatureBlock(inv: InvoiceSnapshot): string {
  return `
  <div class="sig-block">
    <div></div>
    <div style="text-align:right">
      <div class="data-label">For ${orDash(inv.exporterName)}</div>
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>`
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="page">
  ${PRINT_BUTTONS}
  ${body}
</div>
</body>
</html>`
}

function assertPrintable(doc: InvoiceDocument, expectedKind: InvoiceKind | null, docLabel: string): void {
  if (expectedKind && doc.invoice.kind !== expectedKind) {
    throw new Error(`A ${docLabel} is printed from a ${expectedKind} invoice, not a ${doc.invoice.kind} one`)
  }
  if (doc.lines.length === 0) {
    throw new Error(`A ${docLabel} needs at least one line item`)
  }
}

// ── Commercial / Proforma invoice ────────────────────────────────────────────

function invoiceHtml(doc: InvoiceDocument, which: 'commercial' | 'proforma'): string {
  const docLabel = DOC_TITLE[which]
  assertPrintable(doc, which, docLabel)
  const { invoice: inv, lines } = doc
  const totals = invoiceTotals(doc)
  const cur = esc(inv.currency)

  const rows = lines.map(l => `
      <tr>
        <td class="num">${l.lineNo}</td>
        <td>${esc(l.description)}</td>
        <td class="mono">${esc(l.hsCode)}</td>
        <td class="num">${quantity(l.quantity)}</td>
        <td>${esc(l.uom)}</td>
        <td class="num">${unitPrice(l.unitPrice, inv.currency)}</td>
        <td class="num">${money(l.amount, inv.currency)}</td>
      </tr>`).join('')

  let fxLine = ''
  if (totals.amountInr !== null && inv.currency !== 'INR') {
    const source = inv.fxRateSource === 'cbic' ? 'CBIC notified rate'
      : inv.fxRateSource === 'manual' ? 'rate entered by exporter'
      : 'indicative rate, not CBIC notified'
    fxLine = `
      <tr>
        <td colspan="6" style="text-align:right;font-weight:600;color:#555">INR equivalent @ ${quantity(inv.fxRateInr as number, 6)} (${esc(source)}${inv.fxRateDate ? `, ${isoDate(inv.fxRateDate)}` : ''})</td>
        <td class="num" style="font-weight:600;color:#555">INR ${money(totals.amountInr, 'INR')}</td>
      </tr>`
  }

  const proformaNote = which === 'proforma'
    ? `<div class="info-box" style="font-size:11px;color:#555">This is a proforma invoice: a quotation and request for payment or LC opening. It is not a tax invoice and is not valid for customs clearance. The commercial invoice will be issued at shipment.</div>`
    : ''

  const declaration = which === 'commercial'
    ? `<div class="section"><div class="section-title">Declaration</div><div style="font-size:12px;line-height:1.7">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div></div>`
    : ''

  const body = `
  ${statusBanner(inv, docLabel)}
  ${letterhead(inv)}
  <div class="doc-title">${docLabel}</div>

  <div class="section">
    <div class="grid-2">
      <div>${referenceBlock(inv)}</div>
      <div class="kv">
        <div class="k">Currency</div><div class="v">${cur}</div>
        ${inv.status === 'issued' && inv.issuedAt ? `<div class="k">Issued</div><div class="v">${isoDate(inv.issuedAt)}</div>` : ''}
      </div>
    </div>
  </div>

  ${partiesBlock(inv)}
  ${shipmentBlock(inv)}

  <div class="section">
    <table class="doc-lines">
      <thead><tr>
        <th class="num">#</th><th>Description of goods</th><th>HS code</th>
        <th class="num">Qty</th><th>Unit</th><th class="num">Rate (${cur})</th><th class="num">Amount (${cur})</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="6" style="text-align:right">TOTAL ${cur}</td><td class="num">${money(totals.amount, inv.currency)}</td></tr>
        ${fxLine}
      </tfoot>
    </table>
  </div>

  ${proformaNote}

  <div class="section"><div class="grid-2">${bankBlock(inv)}<div></div></div></div>

  ${declaration}
  ${signatureBlock(inv)}`

  const number = inv.invoiceNumber ?? 'unnumbered draft'
  return page(`${docLabel} ${esc(number)} — ${orDash(inv.exporterName)}`, body)
}

export function buildCommercialInvoiceHtml(doc: InvoiceDocument): string {
  return invoiceHtml(doc, 'commercial')
}

export function buildProformaInvoiceHtml(doc: InvoiceDocument): string {
  return invoiceHtml(doc, 'proforma')
}

// ── Packing list ─────────────────────────────────────────────────────────────

export function buildPackingListHtml(doc: InvoiceDocument): string {
  const docLabel = DOC_TITLE.packing
  assertPrintable(doc, null, docLabel)
  const { invoice: inv, lines } = doc
  const totals = invoiceTotals(doc)
  const kg = (v: number | null) => (v === null ? '—' : quantity(v))

  const rows = lines.map(l => `
      <tr>
        <td class="num">${l.lineNo}</td>
        <td style="white-space:pre-line">${orDash(l.marks)}</td>
        <td>${l.packageCount === null ? '—' : `${quantity(l.packageCount, 0)}${l.packageKind ? ` ${esc(l.packageKind)}` : ''}`}</td>
        <td>${esc(l.description)}</td>
        <td class="mono">${esc(l.hsCode)}</td>
        <td class="num">${quantity(l.quantity)} ${esc(l.uom)}</td>
        <td class="num">${kg(l.netWeightKg)}</td>
        <td class="num">${kg(l.grossWeightKg)}</td>
      </tr>`).join('')

  const missing = totals.linesMissingPacking.length
    ? `<div class="doc-flag no-print"><strong>Packing data incomplete</strong> on line${totals.linesMissingPacking.length > 1 ? 's' : ''} ${totals.linesMissingPacking.join(', ')}. Totals that depend on those lines print as "—" rather than a partial sum.${inv.status === 'draft' ? ' Add the packages and weights to the draft before issuing.' : ' This invoice is no longer a draft, so correcting it means cancel-and-reissue.'}</div>`
    : ''

  const body = `
  ${statusBanner(inv, docLabel)}
  ${letterhead(inv)}
  <div class="doc-title">${docLabel}</div>
  ${missing}

  <div class="section">${referenceBlock(inv)}</div>

  ${partiesBlock(inv)}
  ${shipmentBlock(inv)}

  <div class="section">
    <table class="doc-lines">
      <thead><tr>
        <th class="num">#</th><th>Marks &amp; nos.</th><th>Packages</th><th>Description of goods</th><th>HS code</th>
        <th class="num">Quantity</th><th class="num">Net wt (kg)</th><th class="num">Gross wt (kg)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td></td><td style="text-align:right">TOTAL</td>
          <td>${totals.packages === null ? '—' : `${quantity(totals.packages, 0)} package${totals.packages === 1 ? '' : 's'}`}</td>
          <td colspan="3"></td>
          <td class="num">${kg(totals.netWeightKg)}</td>
          <td class="num">${kg(totals.grossWeightKg)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  ${signatureBlock(inv)}`

  const number = inv.invoiceNumber ?? 'unnumbered draft'
  return page(`${docLabel} — ${inv.kind === 'proforma' ? 'Proforma' : 'Invoice'} ${esc(number)} — ${orDash(inv.exporterName)}`, body)
}

// ── Print entry points ───────────────────────────────────────────────────────

// These run after a save and a fetch, by which time some browsers no longer
// treat the click as permission to open a window. Say so rather than do nothing.
function open(html: string): void {
  if (!openAndPrint(html)) {
    throw new Error('Your browser blocked the print window. Allow pop-ups for this site and try again.')
  }
}

export function printCommercialInvoice(doc: InvoiceDocument): void {
  open(buildCommercialInvoiceHtml(doc))
}

export function printProformaInvoice(doc: InvoiceDocument): void {
  open(buildProformaInvoiceHtml(doc))
}

export function printPackingList(doc: InvoiceDocument): void {
  open(buildPackingListHtml(doc))
}
