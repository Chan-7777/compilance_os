// ============================================================================
// Masters — buyers, products, bank accounts and signatories.
//
// These fill in invoice DRAFTS. An invoice keeps its own copy of whatever was
// filled in, so editing or deleting a master here never changes an invoice
// already saved or issued (there is no link to change; see migration
// 20260924000001).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { colors, spacing, borderRadius } from '@theme/index'
import {
  INCOTERMS, NO_MASTERS, bankAccountToRow, buyerToRow, deleteMaster, loadMasters, productToRow, saveMaster, signatoryToRow,
  type MasterTable, type Masters as MasterData,
} from '@/lib/masters'

export interface MastersProps {
  companyId: string | null
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'JPY', 'AUD', 'CAD', 'SGD', 'CHF', 'INR']

type FieldDef =
  | { key: string; label: string; kind: 'text'; placeholder?: string; required?: boolean }
  | { key: string; label: string; kind: 'area' }
  | { key: string; label: string; kind: 'select'; options: readonly string[]; blank: string }
  | { key: string; label: string; kind: 'check' }

type Form = Record<string, string | boolean>
type Mapped = { row: Record<string, unknown>; errors: string[] }

interface TabDef {
  table: MasterTable
  label: string
  noun: string
  fields: FieldDef[]
  toRow: (f: Form) => Mapped
  /** Master -> form values for editing. */
  items: (m: MasterData) => { id: string; form: Form; title: string; detail: string; isDefault?: boolean }[]
}

const TABS: TabDef[] = [
  {
    table: 'buyers', label: 'Buyers', noun: 'buyer',
    fields: [
      { key: 'name', label: 'Buyer name', kind: 'text', required: true },
      { key: 'country', label: 'Country', kind: 'text', required: true },
      { key: 'address', label: 'Address', kind: 'area' },
      { key: 'taxId', label: 'Tax ID / EORI / VAT', kind: 'text' },
      { key: 'paymentTerms', label: 'Default payment terms', kind: 'text', placeholder: 'e.g. 30% advance, 70% against BL' },
      { key: 'currency', label: 'Default currency', kind: 'select', options: CURRENCIES, blank: 'No default' },
      { key: 'incoterm', label: 'Default Incoterm', kind: 'select', options: INCOTERMS, blank: 'No default' },
    ],
    toRow: f => buyerToRow(f as never),
    items: m => m.buyers.map(b => ({
      id: b.id, title: b.name,
      detail: [b.country, b.taxId, b.currency, b.incoterm].filter(Boolean).join(' · '),
      form: { name: b.name, country: b.country, address: b.address ?? '', taxId: b.taxId ?? '',
        paymentTerms: b.paymentTerms ?? '', currency: b.currency ?? '', incoterm: b.incoterm ?? '' },
    })),
  },
  {
    table: 'products', label: 'Products', noun: 'product',
    fields: [
      { key: 'description', label: 'Description of goods', kind: 'text', required: true },
      { key: 'hsCode', label: 'HS code', kind: 'text', required: true, placeholder: '4 to 8 digits' },
      { key: 'uom', label: 'Unit', kind: 'text', required: true, placeholder: 'KGS' },
      { key: 'unitPrice', label: 'Default unit price', kind: 'text', placeholder: 'optional' },
    ],
    toRow: f => productToRow(f as never),
    items: m => m.products.map(p => ({
      id: p.id, title: p.description,
      detail: [`HS ${p.hsCode}`, p.uom, p.unitPrice === null ? null : `@ ${p.unitPrice}`].filter(Boolean).join(' · '),
      form: { description: p.description, hsCode: p.hsCode, uom: p.uom, unitPrice: p.unitPrice === null ? '' : String(p.unitPrice) },
    })),
  },
  {
    table: 'bank_accounts', label: 'Bank accounts', noun: 'bank account',
    fields: [
      { key: 'bankName', label: 'Bank', kind: 'text', required: true },
      { key: 'branch', label: 'Branch', kind: 'text' },
      { key: 'accountNumber', label: 'Account number', kind: 'text', required: true },
      { key: 'ifsc', label: 'IFSC', kind: 'text', placeholder: 'SBIN0001234' },
      { key: 'swift', label: 'SWIFT / BIC', kind: 'text', placeholder: 'SBININBB' },
      { key: 'adCode', label: 'AD code', kind: 'text' },
      { key: 'isDefault', label: 'Fill into new invoices', kind: 'check' },
    ],
    toRow: f => bankAccountToRow(f as never),
    items: m => m.banks.map(k => ({
      id: k.id, title: `${k.bankName} · ${k.accountNumber}`, isDefault: k.isDefault,
      detail: [k.branch, k.ifsc, k.swift].filter(Boolean).join(' · '),
      form: { bankName: k.bankName, branch: k.branch ?? '', accountNumber: k.accountNumber, ifsc: k.ifsc ?? '',
        swift: k.swift ?? '', adCode: k.adCode ?? '', isDefault: k.isDefault },
    })),
  },
  {
    table: 'signatories', label: 'Signatories', noun: 'signatory',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      { key: 'designation', label: 'Designation', kind: 'text', placeholder: 'e.g. Director, Proprietor' },
      { key: 'isDefault', label: 'Fill into new invoices', kind: 'check' },
    ],
    toRow: f => signatoryToRow(f as never),
    items: m => m.signatories.map(x => ({
      id: x.id, title: x.name, isDefault: x.isDefault, detail: x.designation ?? '',
      form: { name: x.name, designation: x.designation ?? '', isDefault: x.isDefault },
    })),
  },
]

const blankForm = (tab: TabDef): Form =>
  Object.fromEntries(tab.fields.map(f => [f.key, f.kind === 'check' ? false : '']))

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: borderRadius.md,
  fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: colors.white, color: colors.text,
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, marginBottom: 4,
}
const fluidGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing.sm,
}

export function Masters({ companyId }: MastersProps) {
  const [tabIndex, setTabIndex] = useState(0)
  const [data, setData] = useState<MasterData>(NO_MASTERS)
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)
  const tab = TABS[tabIndex]

  const refresh = useCallback(async () => {
    if (!companyId) return
    try { setData(await loadMasters(companyId)) }
    catch (e) { setMessage({ kind: 'error', text: (e as Error).message }) }
  }, [companyId])

  useEffect(() => { void refresh() }, [refresh])

  if (!companyId) return <Card><CardContent>Sign in to manage masters.</CardContent></Card>

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true); setMessage(null)
    try { await fn(); setMessage({ kind: 'ok', text: ok }) }
    catch (e) { setMessage({ kind: 'error', text: (e as Error).message }) }
    finally { setBusy(false) }
  }

  const save = () => {
    if (!editing) return
    const { row, errors } = tab.toRow(editing.form)
    if (errors.length) { setMessage({ kind: 'error', text: errors.join('\n') }); return }
    void run(async () => {
      await saveMaster(tab.table, companyId, editing.id, row)
      setEditing(null)
      await refresh()
    }, `${tab.noun[0].toUpperCase()}${tab.noun.slice(1)} saved`)
  }

  const items = tab.items(data)

  return (
    <div style={{ padding: spacing.lg, maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ margin: `0 0 ${spacing.xs}` }}>Masters</h2>
      <p style={{ fontSize: '0.875rem', color: colors.textMuted, margin: `0 0 ${spacing.md}` }}>
        Save buyers, products, bank accounts and signatories once, then fill them into an invoice draft with one pick.
        The invoice keeps its own copy: changing or deleting a master here never changes an invoice already saved or issued.
      </p>

      <div role="tablist" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: spacing.md }}>
        {TABS.map((t, i) => (
          <Button key={t.table} role="tab" aria-selected={i === tabIndex} size="sm" variant={i === tabIndex ? 'primary' : 'outline'}
            onClick={() => { setTabIndex(i); setEditing(null); setMessage(null) }}>
            {t.label} ({t.items(data).length})
          </Button>
        ))}
      </div>

      {message && <Banner {...message} />}

      {editing ? (
        <Card>
          <CardContent>
            <h3 style={{ margin: `0 0 ${spacing.sm}` }}>{editing.id ? `Edit ${tab.noun}` : `New ${tab.noun}`}</h3>
            <div style={fluidGrid}>
              {tab.fields.map(f => {
                const value = editing.form[f.key]
                const set = (v: string | boolean) => setEditing(e => e && { ...e, form: { ...e.form, [f.key]: v } })
                if (f.kind === 'check') {
                  return (
                    <label key={f.key} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem', alignSelf: 'end', paddingBottom: 8 }}>
                      <input type="checkbox" checked={value === true} onChange={e => set(e.target.checked)} />
                      {f.label}
                    </label>
                  )
                }
                return (
                  <label key={f.key} style={f.kind === 'area' ? { gridColumn: '1 / -1' } : undefined}>
                    <span style={labelStyle}>{f.label}{f.kind === 'text' && f.required ? ' *' : ''}</span>
                    {f.kind === 'area' ? (
                      <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={String(value)} onChange={e => set(e.target.value)} />
                    ) : f.kind === 'select' ? (
                      <select style={inputStyle} value={String(value)} onChange={e => set(e.target.value)}>
                        <option value="">{f.blank}</option>
                        {[...f.options, ...(value && !f.options.includes(String(value)) ? [String(value)] : [])].map(o => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input style={inputStyle} value={String(value)} placeholder={f.placeholder} onChange={e => set(e.target.value)} />
                    )}
                  </label>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
              <Button variant="primary" loading={busy} disabled={busy} onClick={save}>Save</Button>
              <Button variant="ghost" disabled={busy} onClick={() => { setEditing(null); setMessage(null) }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <strong>{tab.label}</strong>
              <Button size="sm" variant="primary" onClick={() => { setMessage(null); setEditing({ id: null, form: blankForm(tab) }) }}>
                Add {tab.noun}
              </Button>
            </div>
            {items.length === 0 ? (
              <p style={{ margin: 0, color: colors.textMuted }}>No {tab.label.toLowerCase()} yet.</p>
            ) : (
              <div style={{ display: 'grid' }}>
                {items.map((it, n) => (
                  <div key={it.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap',
                    padding: `${spacing.sm} 0`, borderTop: n ? `1px solid ${colors.border}` : 'none',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                        {it.title} {it.isDefault && <Badge variant="success" size="sm">default</Badge>}
                      </div>
                      {it.detail && <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>{it.detail}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button size="sm" variant="secondary" disabled={busy}
                        onClick={() => { setMessage(null); setEditing({ id: it.id, form: it.form }) }}>Edit</Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => {
                        if (window.confirm(`Delete ${it.title}? Invoices that used it keep their own copy.`)) {
                          void run(async () => { await deleteMaster(tab.table, it.id); await refresh() }, 'Deleted')
                        }
                      }}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
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
