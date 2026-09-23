// ============================================================================
// Invoices — multi-line Commercial Invoice, Proforma Invoice and Packing List
//
// Drafts are edited here; issuing freezes the row (the database enforces it,
// see invoices_guard()). Printing always re-reads the saved row, so what
// prints is the snapshot, never the form or the live company profile.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { useMobile } from '@/hooks/useMobile'
import { colors, spacing, borderRadius } from '@theme/index'
import {
  listInvoices, fetchInvoiceDocument, saveInvoiceDraft, issueInvoice, cancelInvoice, deleteInvoiceDraft,
  linkInvoiceToShipment, listShipmentOptions, type ShipmentOption,
  type InvoiceHeaderInput, type InvoiceLineInput, type InvoiceListItem,
} from '@/lib/invoices'
import { printCommercialInvoice, printPackingList, printProformaInvoice, type InvoiceDocument } from '@/lib/invoice-documents'
import {
  NO_MASTERS, applyBank, applyBuyer, applyConsignee, applyDefaults, applyProduct, applySignatory, loadMasters,
  type Masters,
} from '@/lib/masters'
import type { CompanyProfile } from '@/types'

export interface InvoicesProps {
  companyProfile: CompanyProfile
  companyId: string | null
}

const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'JPY', 'AUD', 'CAD', 'SGD', 'CHF', 'INR']

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: borderRadius.md,
  fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: colors.white, color: colors.text,
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, marginBottom: 4,
}
const groupTitle: React.CSSProperties = {
  fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
  color: colors.textMuted, margin: `${spacing.lg} 0 ${spacing.sm}`,
}
const pageStyle: React.CSSProperties = { padding: spacing.lg, maxWidth: '1200px', margin: '0 auto' }
const grid = (cols: number): React.CSSProperties => ({
  display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: spacing.sm,
})
// Up to `cols` columns, dropping one whenever a field would get narrower than
// 170px. It sizes from the space the form actually has (the sidebar takes
// 228px on a tablet), so no viewport breakpoint can be wrong for it.
const fluidGrid = (cols: number): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(max(170px, calc((100% - ${cols - 1} * ${spacing.sm}) / ${cols})), 1fr))`,
  gap: spacing.sm,
})
// Takes the whole row at any column count (a span of 2 in a 1-column grid
// would add a column and overflow).
const FULL_ROW = '1 / -1'

function blankHeader(profile: CompanyProfile): InvoiceHeaderInput {
  // Prefilled from the profile once, when the draft is started. From then on
  // the invoice holds its own copy; editing the profile doesn't change it.
  const address = [profile.address, [profile.city, profile.state].filter(Boolean).join(', '), profile.pin]
    .filter(Boolean).join('\n')
  return {
    kind: 'commercial', invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10), irn: '',
    exporterName: profile.name ?? '', exporterAddress: address, exporterGstin: profile.gstin ?? '',
    exporterIec: profile.iec ?? '', exporterStateCode: profile.stateCode ?? '',
    exporterBankName: '', exporterBankBranch: '', exporterBankAccount: '', exporterBankIfsc: '',
    exporterBankSwift: '', exporterBankAdCode: '',
    buyerName: '', buyerAddress: '', buyerCountry: '', buyerTaxId: '',
    consigneeName: '', consigneeAddress: '', consigneeCountry: '',
    incoterm: 'FOB', incotermPlace: '', portOfLoading: profile.portOfLoading ?? '', portOfDischarge: '',
    destinationCountry: '', originCountry: 'India', paymentTerms: '',
    currency: 'USD', fxRateInr: '', fxRateDate: '', freightAmount: '', insuranceAmount: '',
    signatoryName: '', signatoryDesignation: '',
  }
}

// Incoterms whose value includes freight, and those that also include insurance.
const FREIGHT_TERMS = new Set(['CFR', 'CPT', 'CIF', 'CIP'])
const INSURANCE_TERMS = new Set(['CIF', 'CIP'])

const LINE_LABELS: Record<keyof InvoiceLineInput, string> = {
  description: 'description', hsCode: 'HS code', quantity: 'quantity', uom: 'unit', unitPrice: 'unit price',
  marks: 'marks and numbers', packageCount: 'packages', packageKind: 'package kind',
  netWeightKg: 'net weight kg', grossWeightKg: 'gross weight kg',
}

const blankLine = (): InvoiceLineInput => ({
  description: '', hsCode: '', quantity: '', uom: '', unitPrice: '',
  marks: '', packageCount: '', packageKind: '', netWeightKg: '', grossWeightKg: '',
})

const s = (v: string | number | null) => (v === null ? '' : String(v))

function formFromDocument(doc: InvoiceDocument): { header: InvoiceHeaderInput; lines: InvoiceLineInput[] } {
  const i = doc.invoice
  return {
    header: {
      kind: i.kind, invoiceNumber: s(i.invoiceNumber), invoiceDate: s(i.invoiceDate), irn: s(i.irn),
      exporterName: s(i.exporterName), exporterAddress: s(i.exporterAddress), exporterGstin: s(i.exporterGstin),
      exporterIec: s(i.exporterIec), exporterStateCode: s(i.exporterStateCode),
      exporterBankName: s(i.exporterBankName), exporterBankBranch: s(i.exporterBankBranch),
      exporterBankAccount: s(i.exporterBankAccount), exporterBankIfsc: s(i.exporterBankIfsc),
      exporterBankSwift: s(i.exporterBankSwift), exporterBankAdCode: s(i.exporterBankAdCode),
      buyerName: s(i.buyerName), buyerAddress: s(i.buyerAddress), buyerCountry: s(i.buyerCountry), buyerTaxId: s(i.buyerTaxId),
      consigneeName: s(i.consigneeName), consigneeAddress: s(i.consigneeAddress), consigneeCountry: s(i.consigneeCountry),
      incoterm: s(i.incoterm) || 'FOB', incotermPlace: s(i.incotermPlace), portOfLoading: s(i.portOfLoading),
      portOfDischarge: s(i.portOfDischarge), destinationCountry: s(i.destinationCountry), originCountry: s(i.originCountry),
      paymentTerms: s(i.paymentTerms), currency: i.currency, fxRateInr: s(i.fxRateInr), fxRateDate: s(i.fxRateDate),
      freightAmount: s(i.freightAmount), insuranceAmount: s(i.insuranceAmount),
      signatoryName: s(i.signatoryName), signatoryDesignation: s(i.signatoryDesignation),
    },
    lines: doc.lines.map(l => ({
      description: l.description, hsCode: l.hsCode, quantity: s(l.quantity), uom: l.uom, unitPrice: s(l.unitPrice),
      marks: s(l.marks), packageCount: s(l.packageCount), packageKind: s(l.packageKind),
      netWeightKg: s(l.netWeightKg), grossWeightKg: s(l.grossWeightKg),
    })),
  }
}

async function printSaved(id: string, which: 'invoice' | 'packing') {
  const doc = await fetchInvoiceDocument(id)
  if (which === 'packing') printPackingList(doc)
  else if (doc.invoice.kind === 'proforma') printProformaInvoice(doc)
  else printCommercialInvoice(doc)
}

const statusVariant = { draft: 'warning', issued: 'success', cancelled: 'danger' } as const

/**
 * "Fill from master" dropdown. It copies values into the draft and resets, so
 * it never shows a selection: the draft holds values, not a link to a master.
 */
function MasterPick<T extends { id: string }>({ label, items, text, onPick }: {
  label: string; items: T[]; text: (item: T) => string; onPick: (item: T) => void
}) {
  if (items.length === 0) return null
  return (
    <label>
      <span style={labelStyle}>{label}</span>
      <select style={inputStyle} value="" onChange={e => {
        const item = items.find(x => x.id === e.target.value)
        if (item) onPick(item)
      }}>
        <option value="">Choose from Masters…</option>
        {items.map(item => <option key={item.id} value={item.id}>{text(item)}</option>)}
      </select>
    </label>
  )
}

export function Invoices({ companyProfile, companyId }: InvoicesProps) {
  const [list, setList] = useState<InvoiceListItem[]>([])
  const [editing, setEditing] = useState<{ id: string | null; header: InvoiceHeaderInput; lines: InvoiceLineInput[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)
  // Header grids reflow on their own (fluidGrid). The invoice list becomes
  // cards on phones; the line table needs ~1100px of form, which only a wide
  // desktop has, so lines become cards below that.
  const isMobile = useMobile()
  const linesAsCards = useMobile(1440)
  const g = fluidGrid

  const refresh = useCallback(async () => {
    if (!companyId) return
    try { setList(await listInvoices(companyId)) }
    catch (e) { setMessage({ kind: 'error', text: (e as Error).message }) }
  }, [companyId])

  useEffect(() => { void refresh() }, [refresh])

  const [shipments, setShipments] = useState<ShipmentOption[]>([])
  useEffect(() => {
    if (!companyId) return
    listShipmentOptions(companyId).then(setShipments, () => setShipments([]))
  }, [companyId])

  // Masters only prefill; without them the form works exactly as before.
  const [masters, setMasters] = useState<Masters>(NO_MASTERS)
  useEffect(() => {
    if (!companyId) return
    loadMasters(companyId).then(setMasters, () => setMasters(NO_MASTERS))
  }, [companyId])
  const [fxNote, setFxNote] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true); setMessage(null)
    try { await fn(); if (ok) setMessage({ kind: 'ok', text: ok }) }
    catch (e) { setMessage({ kind: 'error', text: (e as Error).message }) }
    finally { setBusy(false) }
  }

  if (!companyId) {
    return <Card><CardContent>Sign in to create invoices.</CardContent></Card>
  }

  // ── Editor ──
  if (editing) {
    const h = editing.header
    const setH = (patch: Partial<InvoiceHeaderInput>) => setEditing(e => e && { ...e, header: { ...e.header, ...patch } })
    const setLine = (i: number, patch: Partial<InvoiceLineInput>) =>
      setEditing(e => e && { ...e, lines: e.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) })
    const field = (label: string, key: keyof InvoiceHeaderInput, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
      <label>
        <span style={labelStyle}>{label}</span>
        <input style={inputStyle} value={h[key]} onChange={e => setH({ [key]: e.target.value })} {...props} />
      </label>
    )
    const area = (label: string, key: keyof InvoiceHeaderInput) => (
      <label>
        <span style={labelStyle}>{label}</span>
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={h[key]} onChange={e => setH({ [key]: e.target.value })} />
      </label>
    )
    const save = async () => {
      const id = await saveInvoiceDraft(companyId, editing.id, h, editing.lines, companyProfile.gstin)
      setEditing(e => e && { ...e, id })
      await refresh()
      return id
    }

    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{editing.id ? 'Edit draft' : 'New draft'} — {h.kind === 'proforma' ? 'Proforma invoice' : 'Commercial invoice'}</h2>
          <Button variant="ghost" onClick={() => { setEditing(null); setMessage(null) }}>Back to list</Button>
        </div>
        <Card>
          <CardContent>
            <div style={g(4)}>
              <label>
                <span style={labelStyle}>Document</span>
                <select style={inputStyle} value={h.kind} onChange={e => setH({ kind: e.target.value as InvoiceHeaderInput['kind'] })}>
                  <option value="commercial">Commercial invoice</option>
                  <option value="proforma">Proforma invoice</option>
                </select>
              </label>
              {field('Invoice number (your own series)', 'invoiceNumber', { maxLength: 16, placeholder: 'e.g. EXP/26-27/014' })}
              {field('Invoice date', 'invoiceDate', { type: 'date' })}
              {field('IRN (if e-invoiced)', 'irn', { placeholder: '64-character hash from the IRP' })}
            </div>

            <div style={groupTitle}>Exporter (copied onto this invoice)</div>
            <div style={g(3)}>
              {field('Name', 'exporterName')}
              {field('IEC', 'exporterIec')}
              {field('GSTIN', 'exporterGstin')}
            </div>
            <div style={{ ...g(3), marginTop: spacing.sm }}>
              <div style={{ gridColumn: FULL_ROW }}>{area('Address', 'exporterAddress')}</div>
              {field('State code', 'exporterStateCode')}
            </div>

            <div style={groupTitle}>Bank for payment</div>
            <div style={g(3)}>
              {masters.banks.length > 0 && (
                <div style={{ gridColumn: FULL_ROW }}>
                  <MasterPick label="Fill bank" items={masters.banks} text={k => `${k.bankName} · ${k.accountNumber}${k.isDefault ? ' (default)' : ''}`}
                    onPick={k => setEditing(e => e && { ...e, header: applyBank(e.header, k) })} />
                </div>
              )}
              {field('Bank', 'exporterBankName')}
              {field('Branch', 'exporterBankBranch')}
              {field('Account number', 'exporterBankAccount')}
              {field('IFSC', 'exporterBankIfsc', { placeholder: 'SBIN0001234' })}
              {field('SWIFT / BIC', 'exporterBankSwift', { placeholder: 'SBININBB' })}
              {field('AD code', 'exporterBankAdCode')}
            </div>

            <div style={groupTitle}>Buyer and consignee</div>
            <div style={g(2)}>
              <div style={{ display: 'grid', gap: spacing.sm, alignContent: 'start' }}>
                <MasterPick label="Fill buyer" items={masters.buyers} text={b => `${b.name} · ${b.country}`} onPick={b => {
                  const next = applyBuyer(h, b)
                  setFxNote(next.currency !== h.currency && h.fxRateInr
                    ? `Currency changed to ${next.currency}, the buyer's default. The exchange rate was cleared: enter INR per 1 ${next.currency}.`
                    : null)
                  setEditing(e => e && { ...e, header: next })
                }} />
                {field('Buyer name', 'buyerName')}
                {area('Buyer address', 'buyerAddress')}
                <div style={g(2)}>{field('Buyer country', 'buyerCountry')}{field('Tax ID / EORI / VAT', 'buyerTaxId')}</div>
              </div>
              <div style={{ display: 'grid', gap: spacing.sm, alignContent: 'start' }}>
                <MasterPick label="Fill consignee" items={masters.buyers} text={b => `${b.name} · ${b.country}`}
                  onPick={b => setEditing(e => e && { ...e, header: applyConsignee(e.header, b) })} />
                {field('Consignee name (blank = same as buyer)', 'consigneeName')}
                {area('Consignee address', 'consigneeAddress')}
                {field('Consignee country', 'consigneeCountry')}
              </div>
            </div>

            <div style={groupTitle}>Shipment and terms</div>
            <div style={g(4)}>
              <label>
                <span style={labelStyle}>Incoterm</span>
                <select style={inputStyle} value={h.incoterm} onChange={e => setH({ incoterm: e.target.value })}>
                  {INCOTERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
              {field('Incoterm place', 'incotermPlace', { placeholder: 'e.g. Nhava Sheva' })}
              {field('Port of loading', 'portOfLoading')}
              {field('Port of discharge', 'portOfDischarge')}
              {field('Final destination', 'destinationCountry')}
              {field('Country of origin', 'originCountry')}
              <div style={{ gridColumn: FULL_ROW }}>{field('Payment terms', 'paymentTerms', { placeholder: 'e.g. 30% advance, 70% against BL' })}</div>
            </div>

            <div style={groupTitle}>Currency and exchange rate</div>
            <div style={g(4)}>
              <label>
                <span style={labelStyle}>Currency</span>
                <select style={inputStyle} value={h.currency} onChange={e => setH({ currency: e.target.value })}>
                  {(CURRENCIES.includes(h.currency) ? CURRENCIES : [...CURRENCIES, h.currency]).map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              {field(`INR per 1 ${h.currency}`, 'fxRateInr', { inputMode: 'decimal', placeholder: h.kind === 'commercial' ? 'required to issue' : 'optional' })}
              {field('Rate date', 'fxRateDate', { type: 'date' })}
              <p style={{ fontSize: '0.75rem', color: colors.textMuted, margin: 0, alignSelf: 'end' }}>
                Use the CBIC notified export rate for the shipping bill date. The app&apos;s built-in rates are placeholders and can&apos;t be used to issue.
              </p>
            </div>

            {FREIGHT_TERMS.has(h.incoterm) && (
              <>
                <div style={groupTitle}>Freight and insurance</div>
                <div style={g(4)}>
                  {field(`Freight (${h.currency})`, 'freightAmount', { inputMode: 'decimal', placeholder: h.kind === 'commercial' ? 'required to issue' : 'optional' })}
                  {INSURANCE_TERMS.has(h.incoterm) &&
                    field(`Insurance (${h.currency})`, 'insuranceAmount', { inputMode: 'decimal', placeholder: h.kind === 'commercial' ? 'required to issue' : 'optional' })}
                  <p style={{ fontSize: '0.75rem', color: colors.textMuted, margin: 0, alignSelf: 'end' }}>
                    The amounts included in this {h.incoterm} value. RoDTEP is paid on FOB, so they are taken off, split across the lines by line value.
                  </p>
                </div>
              </>
            )}

            {fxNote && !h.fxRateInr && (
              <p role="status" style={{ fontSize: '0.8rem', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: borderRadius.md, padding: '6px 10px', margin: `${spacing.sm} 0 0` }}>
                {fxNote}
              </p>
            )}

            <div style={groupTitle}>Authorised signatory</div>
            <div style={g(3)}>
              <MasterPick label="Fill signatory" items={masters.signatories} text={x => `${x.name}${x.designation ? ` · ${x.designation}` : ''}`}
                onPick={x => setEditing(e => e && { ...e, header: applySignatory(e.header, x) })} />
              {field('Name (printed under the signature)', 'signatoryName')}
              {field('Designation', 'signatoryDesignation', { placeholder: 'e.g. Director' })}
            </div>

            <div style={groupTitle}>Lines</div>
            {linesAsCards ? (
              <div style={{ display: 'grid', gap: spacing.md }}>
                {editing.lines.map((l, i) => {
                  const f = (key: keyof InvoiceLineInput, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
                    <label>
                      <span style={labelStyle}>{label}</span>
                      <input style={inputStyle} aria-label={`Line ${i + 1} ${LINE_LABELS[key]}`} value={l[key]} onChange={e => setLine(i, { [key]: e.target.value })} {...props} />
                    </label>
                  )
                  return (
                    <div key={i} style={{ border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, padding: spacing.sm, display: 'grid', gap: spacing.sm }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.85rem' }}>Line {i + 1}</strong>
                        <Button size="sm" variant="ghost" disabled={editing.lines.length === 1}
                          onClick={() => setEditing(e => e && { ...e, lines: e.lines.filter((_, j) => j !== i) })}>Remove</Button>
                      </div>
                      <MasterPick label="Fill from product" items={masters.products} text={p => `${p.description} · HS ${p.hsCode}`}
                        onPick={p => setLine(i, applyProduct(l, p))} />
                      {f('description', 'Description')}
                      <div style={grid(2)}>
                        {f('hsCode', 'HS code', { inputMode: 'numeric' })}
                        {f('uom', 'Unit', { placeholder: 'KGS' })}
                        {f('quantity', 'Quantity', { inputMode: 'decimal' })}
                        {f('unitPrice', 'Unit price', { inputMode: 'decimal' })}
                      </div>
                      {f('marks', 'Marks & nos.')}
                      <div style={grid(2)}>
                        {f('packageCount', 'Packages', { inputMode: 'numeric' })}
                        {f('packageKind', 'Package kind', { placeholder: 'cartons' })}
                        {f('netWeightKg', 'Net kg', { inputMode: 'decimal' })}
                        {f('grossWeightKg', 'Gross kg', { inputMode: 'decimal' })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 1100 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: colors.textMuted }}>
                    {['#', ...(masters.products.length ? ['Product'] : []), 'Description', 'HS code', 'Qty', 'Unit', 'Unit price', 'Marks & nos.', 'Pkgs', 'Pkg kind', 'Net kg', 'Gross kg', ''].map(t => (
                      <th key={t} style={{ padding: '4px 4px', fontWeight: 600 }}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editing.lines.map((l, i) => {
                    const cell = (key: keyof InvoiceLineInput, width: number, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
                      <td style={{ padding: 2, width }}>
                        <input style={inputStyle} aria-label={`Line ${i + 1} ${LINE_LABELS[key]}`} value={l[key]} onChange={e => setLine(i, { [key]: e.target.value })} {...props} />
                      </td>
                    )
                    return (
                      <tr key={i}>
                        <td style={{ padding: 2, color: colors.textMuted }}>{i + 1}</td>
                        {masters.products.length > 0 && (
                          <td style={{ padding: 2, width: 130 }}>
                            <select style={inputStyle} aria-label={`Line ${i + 1} fill from product`} value="" onChange={e => {
                              const p = masters.products.find(x => x.id === e.target.value)
                              if (p) setLine(i, applyProduct(l, p))
                            }}>
                              <option value="">Choose…</option>
                              {masters.products.map(p => <option key={p.id} value={p.id}>{p.description} · HS {p.hsCode}</option>)}
                            </select>
                          </td>
                        )}
                        {cell('description', 260)}
                        {cell('hsCode', 100, { inputMode: 'numeric' })}
                        {cell('quantity', 80, { inputMode: 'decimal' })}
                        {cell('uom', 60, { placeholder: 'KGS' })}
                        {cell('unitPrice', 90, { inputMode: 'decimal' })}
                        {cell('marks', 120)}
                        {cell('packageCount', 60, { inputMode: 'numeric' })}
                        {cell('packageKind', 90, { placeholder: 'cartons' })}
                        {cell('netWeightKg', 80, { inputMode: 'decimal' })}
                        {cell('grossWeightKg', 80, { inputMode: 'decimal' })}
                        <td style={{ padding: 2 }}>
                          <Button size="sm" variant="ghost" aria-label={`Remove line ${i + 1}`} disabled={editing.lines.length === 1}
                            onClick={() => setEditing(e => e && { ...e, lines: e.lines.filter((_, j) => j !== i) })}>✕</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            )}
            <Button size="sm" variant="outline" style={{ marginTop: spacing.sm }}
              onClick={() => setEditing(e => e && { ...e, lines: [...e.lines, blankLine()] })}>Add line</Button>

            {message && <div style={{ marginTop: spacing.lg }}><Banner {...message} /></div>}
            <div style={{ display: 'flex', gap: spacing.sm, marginTop: message ? 0 : spacing.lg, flexWrap: 'wrap' }}>
              <Button variant="secondary" loading={busy} disabled={busy} onClick={() => run(async () => { await save() }, 'Draft saved')}>Save draft</Button>
              <Button variant="outline" disabled={busy} onClick={() => run(async () => { await printSaved(await save(), 'invoice') })}>Save &amp; preview invoice</Button>
              <Button variant="outline" disabled={busy} onClick={() => run(async () => { await printSaved(await save(), 'packing') })}>Save &amp; preview packing list</Button>
              <Button variant="primary" disabled={busy} onClick={() => {
                // Confirm outside run(): returning early inside it would still report success.
                if (!window.confirm('Issue this invoice? Once issued it can never be edited: corrections mean cancelling it and issuing a new one.')) return
                void run(async () => {
                  const id = await save()
                  await issueInvoice(id)
                  setEditing(null)
                  await refresh()
                }, 'Invoice issued')
              }}>Issue</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── List ──
  const rowActions = (inv: InvoiceListItem) => (
    <>
      <select
        aria-label="Shipment" title="The shipment this invoice covers" disabled={busy}
        style={{ ...inputStyle, width: 'auto', maxWidth: 220, padding: '4px 6px', fontSize: '0.8rem' }}
        value={inv.shipmentId ?? ''}
        onChange={e => {
          const shipmentId = e.target.value || null
          void run(async () => { await linkInvoiceToShipment(inv.id, shipmentId); await refresh() },
            shipmentId ? 'Linked to shipment' : 'Unlinked from shipment')
        }}>
        <option value="">No shipment</option>
        {shipments.map(sh => <option key={sh.id} value={sh.id}>{sh.name} · {sh.date}</option>)}
      </select>
      {inv.status === 'draft' && (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(async () => {
          const doc = await fetchInvoiceDocument(inv.id)
          setFxNote(null)
          setEditing({ id: inv.id, ...formFromDocument(doc) })
        })}>Edit</Button>
      )}
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => printSaved(inv.id, 'invoice'))}>
        {inv.kind === 'proforma' ? 'Proforma' : 'Invoice'}
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => printSaved(inv.id, 'packing'))}>Packing list</Button>
      {inv.status === 'issued' && (
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => {
          const reason = window.prompt('Reason for cancelling? The number stays reserved and cannot be reused.')
          if (reason && reason.trim()) void run(async () => { await cancelInvoice(inv.id, reason); await refresh() }, 'Invoice cancelled')
        }}>Cancel</Button>
      )}
      {inv.status === 'draft' && (
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => {
          if (window.confirm('Delete this draft?')) void run(async () => { await deleteInvoiceDraft(inv.id); await refresh() })
        }}>Delete</Button>
      )}
    </>
  )

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Invoices</h2>
        <Button variant="primary" onClick={() => {
          setMessage(null); setFxNote(null)
          // Default bank and signatory go into NEW drafts only; an existing draft is never refilled.
          setEditing({ id: null, header: applyDefaults(blankHeader(companyProfile), masters.banks, masters.signatories), lines: [blankLine()] })
        }}>
          New invoice
        </Button>
      </div>
      <p style={{ fontSize: '0.875rem', color: colors.textMuted, margin: `0 0 ${spacing.md}` }}>
        Multi-line commercial and proforma invoices with a matching packing list. Use your own invoice number (the one that goes on GSTR-1 and the shipping bill); ComplianceOS never generates one. Issued invoices are frozen.
      </p>
      {message && <Banner {...message} />}
      <Card>
        <CardContent>
          {list.length === 0 ? (
            <p style={{ margin: 0, color: colors.textMuted }}>No invoices yet.</p>
          ) : isMobile ? (
            <div style={{ display: 'grid' }}>
              {list.map((inv, n) => (
                <div key={inv.id} style={{ padding: `${spacing.sm} 0`, borderTop: n ? `1px solid ${colors.border}` : 'none', display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, overflowWrap: 'anywhere' }}>
                      {inv.invoiceNumber ?? <em style={{ color: colors.textMuted }}>unnumbered</em>}
                    </span>
                    <Badge variant={statusVariant[inv.status]} size="sm">{inv.status}</Badge>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                    {inv.kind === 'proforma' ? 'Proforma' : 'Commercial'} · {inv.invoiceDate ?? 'no date'} · {inv.buyerName ?? 'no buyer'}
                    {inv.exporterGstin && <> · GSTIN <span style={{ fontFamily: 'monospace' }}>{inv.exporterGstin}</span></>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{rowActions(inv)}</div>
                </div>
              ))}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: colors.textMuted }}>
                  <th style={{ padding: 6 }}>Number</th><th style={{ padding: 6 }}>Type</th><th style={{ padding: 6 }}>Date</th>
                  <th style={{ padding: 6 }}>Buyer</th><th style={{ padding: 6 }}>Status</th><th style={{ padding: 6 }} />
                </tr>
              </thead>
              <tbody>
                {list.map(inv => (
                  <tr key={inv.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 6, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {inv.invoiceNumber ?? <em style={{ color: colors.textMuted }}>unnumbered</em>}
                      {/* Two branches may share a number; the GSTIN tells them apart. */}
                      {inv.exporterGstin && <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{inv.exporterGstin}</div>}
                    </td>
                    <td style={{ padding: 6 }}>{inv.kind === 'proforma' ? 'Proforma' : 'Commercial'}</td>
                    <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{inv.invoiceDate ?? '—'}</td>
                    <td style={{ padding: 6 }}>{inv.buyerName ?? '—'}</td>
                    <td style={{ padding: 6 }}><Badge variant={statusVariant[inv.status]} size="sm">{inv.status}</Badge></td>
                    <td style={{ padding: 6, display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>{rowActions(inv)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Banner({ kind, text }: { kind: 'error' | 'ok'; text: string }) {
  const error = kind === 'error'
  return (
    <div role={error ? 'alert' : 'status'} style={{
      whiteSpace: 'pre-line', padding: '10px 14px', borderRadius: borderRadius.md, marginBottom: spacing.md, fontSize: '0.85rem',
      background: error ? '#FEF2F2' : '#F0FDF4', color: error ? '#991B1B' : '#166534',
      border: `1px solid ${error ? '#FECACA' : '#BBF7D0'}`,
    }}>{text}</div>
  )
}
