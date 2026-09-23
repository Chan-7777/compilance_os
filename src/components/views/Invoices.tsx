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
import { colors, spacing, borderRadius } from '@theme/index'
import {
  listInvoices, fetchInvoiceDocument, saveInvoiceDraft, issueInvoice, cancelInvoice, deleteInvoiceDraft,
  type InvoiceHeaderInput, type InvoiceLineInput, type InvoiceListItem,
} from '@/lib/invoices'
import { printCommercialInvoice, printPackingList, printProformaInvoice, type InvoiceDocument } from '@/lib/invoice-documents'
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
const grid = (cols: number): React.CSSProperties => ({
  display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: spacing.sm,
})

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
    currency: 'USD', fxRateInr: '', fxRateDate: '',
  }
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

export function Invoices({ companyProfile, companyId }: InvoicesProps) {
  const [list, setList] = useState<InvoiceListItem[]>([])
  const [editing, setEditing] = useState<{ id: string | null; header: InvoiceHeaderInput; lines: InvoiceLineInput[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)

  const refresh = useCallback(async () => {
    if (!companyId) return
    try { setList(await listInvoices(companyId)) }
    catch (e) { setMessage({ kind: 'error', text: (e as Error).message }) }
  }, [companyId])

  useEffect(() => { void refresh() }, [refresh])

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
      const id = await saveInvoiceDraft(companyId, editing.id, h, editing.lines)
      setEditing(e => e && { ...e, id })
      await refresh()
      return id
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{editing.id ? 'Edit draft' : 'New draft'} — {h.kind === 'proforma' ? 'Proforma invoice' : 'Commercial invoice'}</h2>
          <Button variant="ghost" onClick={() => { setEditing(null); setMessage(null) }}>Back to list</Button>
        </div>
        {message && <Banner {...message} />}
        <Card>
          <CardContent>
            <div style={grid(4)}>
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
            <div style={grid(3)}>
              {field('Name', 'exporterName')}
              {field('IEC', 'exporterIec')}
              {field('GSTIN', 'exporterGstin')}
            </div>
            <div style={{ ...grid(3), marginTop: spacing.sm }}>
              <div style={{ gridColumn: 'span 2' }}>{area('Address', 'exporterAddress')}</div>
              {field('State code', 'exporterStateCode')}
            </div>

            <div style={groupTitle}>Bank for payment</div>
            <div style={grid(3)}>
              {field('Bank', 'exporterBankName')}
              {field('Branch', 'exporterBankBranch')}
              {field('Account number', 'exporterBankAccount')}
              {field('IFSC', 'exporterBankIfsc', { placeholder: 'SBIN0001234' })}
              {field('SWIFT / BIC', 'exporterBankSwift', { placeholder: 'SBININBB' })}
              {field('AD code', 'exporterBankAdCode')}
            </div>

            <div style={groupTitle}>Buyer and consignee</div>
            <div style={grid(2)}>
              <div style={{ display: 'grid', gap: spacing.sm }}>
                {field('Buyer name', 'buyerName')}
                {area('Buyer address', 'buyerAddress')}
                <div style={grid(2)}>{field('Buyer country', 'buyerCountry')}{field('Tax ID / EORI / VAT', 'buyerTaxId')}</div>
              </div>
              <div style={{ display: 'grid', gap: spacing.sm }}>
                {field('Consignee name (blank = same as buyer)', 'consigneeName')}
                {area('Consignee address', 'consigneeAddress')}
                {field('Consignee country', 'consigneeCountry')}
              </div>
            </div>

            <div style={groupTitle}>Shipment and terms</div>
            <div style={grid(4)}>
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
              <div style={{ gridColumn: 'span 2' }}>{field('Payment terms', 'paymentTerms', { placeholder: 'e.g. 30% advance, 70% against BL' })}</div>
            </div>

            <div style={groupTitle}>Currency and exchange rate</div>
            <div style={grid(4)}>
              <label>
                <span style={labelStyle}>Currency</span>
                <select style={inputStyle} value={h.currency} onChange={e => setH({ currency: e.target.value })}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              {field(`INR per 1 ${h.currency}`, 'fxRateInr', { inputMode: 'decimal', placeholder: h.kind === 'commercial' ? 'required to issue' : 'optional' })}
              {field('Rate date', 'fxRateDate', { type: 'date' })}
              <p style={{ fontSize: '0.75rem', color: colors.textMuted, margin: 0, alignSelf: 'end' }}>
                Use the CBIC notified export rate for the shipping bill date. The app&apos;s built-in rates are placeholders and can&apos;t be used to issue.
              </p>
            </div>

            <div style={groupTitle}>Lines</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 1100 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: colors.textMuted }}>
                    {['#', 'Description', 'HS code', 'Qty', 'Unit', 'Unit price', 'Marks & nos.', 'Pkgs', 'Pkg kind', 'Net kg', 'Gross kg', ''].map(t => (
                      <th key={t} style={{ padding: '4px 4px', fontWeight: 600 }}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editing.lines.map((l, i) => {
                    const cell = (key: keyof InvoiceLineInput, width: number, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
                      <td style={{ padding: 2, width }}>
                        <input style={inputStyle} value={l[key]} onChange={e => setLine(i, { [key]: e.target.value })} {...props} />
                      </td>
                    )
                    return (
                      <tr key={i}>
                        <td style={{ padding: 2, color: colors.textMuted }}>{i + 1}</td>
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
            <Button size="sm" variant="outline" style={{ marginTop: spacing.sm }}
              onClick={() => setEditing(e => e && { ...e, lines: [...e.lines, blankLine()] })}>Add line</Button>

            <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' }}>
              <Button variant="secondary" loading={busy} disabled={busy} onClick={() => run(async () => { await save() }, 'Draft saved')}>Save draft</Button>
              <Button variant="outline" disabled={busy} onClick={() => run(async () => { await printSaved(await save(), 'invoice') })}>Save &amp; preview invoice</Button>
              <Button variant="outline" disabled={busy} onClick={() => run(async () => { await printSaved(await save(), 'packing') })}>Save &amp; preview packing list</Button>
              <Button variant="primary" disabled={busy} onClick={() => run(async () => {
                if (!window.confirm('Issue this invoice? Once issued it can never be edited: corrections mean cancelling it and issuing a new one.')) return
                const id = await save()
                await issueInvoice(id)
                setEditing(null)
                await refresh()
              }, 'Invoice issued')}>Issue</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── List ──
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Invoices</h2>
        <Button variant="primary" onClick={() => { setMessage(null); setEditing({ id: null, header: blankHeader(companyProfile), lines: [blankLine()] }) }}>
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
                    <td style={{ padding: 6, fontFamily: 'monospace' }}>{inv.invoiceNumber ?? <em style={{ color: colors.textMuted }}>unnumbered</em>}</td>
                    <td style={{ padding: 6 }}>{inv.kind === 'proforma' ? 'Proforma' : 'Commercial'}</td>
                    <td style={{ padding: 6 }}>{inv.invoiceDate ?? '—'}</td>
                    <td style={{ padding: 6 }}>{inv.buyerName ?? '—'}</td>
                    <td style={{ padding: 6 }}><Badge variant={statusVariant[inv.status]} size="sm">{inv.status}</Badge></td>
                    <td style={{ padding: 6, display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {inv.status === 'draft' && (
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(async () => {
                          const doc = await fetchInvoiceDocument(inv.id)
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
