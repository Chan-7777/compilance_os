// ============================================================================
// BRC / FIRC Tracker — Bank Realization Certificate & Foreign Inward Remittance
// Required for RoDTEP claims and AD code compliance
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  isRealisationOverdue,
  BRC_RULE_CHANGE_DATE,
  BRC_PERIOD_MONTHS_LEGACY,
  BRC_PERIOD_MONTHS_STANDARD,
  BRC_PERIOD_MONTHS_INR,
} from '@/lib/brc'
import { colors, spacing, borderRadius, shadow, fontSize, fontWeight, transition } from '@theme/index'

type DocType = 'brc' | 'firc'
type BRCStatus = 'pending' | 'partial' | 'realized' | 'overdue'

interface BRCRecord {
  id: string
  document_type: DocType
  document_no: string | null
  invoice_no: string | null
  invoice_date: string | null
  invoice_amount: number
  invoice_currency: string
  realized_amount: number | null
  realized_currency: string | null
  realization_date: string | null
  bank_name: string | null
  ad_code: string | null
  status: BRCStatus
  notes: string | null
  created_at: string
}

const STATUS_STYLE: Record<BRCStatus, React.CSSProperties> = {
  pending:  { backgroundColor: colors.surfaces.neutralBg,  color: colors.surfaces.neutralText },
  partial:  { backgroundColor: colors.surfaces.warningBg,  color: colors.surfaces.warningText },
  realized: { backgroundColor: colors.surfaces.successBg,  color: colors.surfaces.successText },
  overdue:  { backgroundColor: colors.surfaces.dangerBg,   color: colors.surfaces.dangerText },
}

const STATUS_LABELS: Record<BRCStatus, string> = {
  pending: 'Pending', partial: 'Partial', realized: 'Realized', overdue: 'Overdue',
}

const fmtCurrency = (n: number | null, currency = 'USD') => {
  if (n == null) return '—'
  if (currency === 'INR' || currency === '₹') {
    if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`
    return `₹${Math.round(n).toLocaleString('en-IN')}`
  }
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const isOverdue = (record: Pick<BRCRecord, 'invoice_date' | 'invoice_currency' | 'realized_currency' | 'status'>) =>
  isRealisationOverdue(
    record.invoice_date,
    record.invoice_currency,
    record.status === 'realized',
    new Date(),
    record.realized_currency
  )

const BLANK_FORM = {
  document_type: 'brc' as DocType,
  document_no: '',
  invoice_no: '',
  invoice_date: '',
  invoice_amount: '',
  invoice_currency: 'USD',
  realized_amount: '',
  realized_currency: 'INR',
  realization_date: '',
  bank_name: '',
  ad_code: '',
  status: 'pending' as BRCStatus,
  notes: '',
}

export function BRCFIRCTracker() {
  const [companyId, setCompanyId]   = useState<string | null>(null)
  const [records, setRecords]       = useState<BRCRecord[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState(BLANK_FORM)
  const [editId, setEditId]         = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
        .then(({ data }) => { if (data?.company_id) setCompanyId(data.company_id) })
    })
  }, [])

  const loadRecords = useCallback(async (cid: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('brc_firc_records')
      .select('*')
      .eq('company_id', cid)
      .order('invoice_date', { ascending: false })
    const rows = (data ?? []) as BRCRecord[]
    // Auto-flag overdue records in local state (without writing back)
    const withOverdue = rows.map(r => ({
      ...r,
      status: isOverdue(r) ? 'overdue' as BRCStatus : r.status,
    }))
    setRecords(withOverdue)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (companyId) loadRecords(companyId)
  }, [companyId, loadRecords])

  const handleSave = async () => {
    if (!companyId) return
    if (!form.invoice_amount || !form.invoice_date) {
      setError('Invoice Amount and Invoice Date are required.')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      company_id: companyId,
      document_type: form.document_type,
      document_no: form.document_no.trim() || null,
      invoice_no: form.invoice_no.trim() || null,
      invoice_date: form.invoice_date || null,
      invoice_amount: parseFloat(form.invoice_amount),
      invoice_currency: form.invoice_currency,
      realized_amount: form.realized_amount ? parseFloat(form.realized_amount) : null,
      realized_currency: form.realized_currency || 'INR',
      realization_date: form.realization_date || null,
      bank_name: form.bank_name.trim() || null,
      ad_code: form.ad_code.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    }
    if (editId) {
      await supabase.from('brc_firc_records').update(payload).eq('id', editId)
    } else {
      await supabase.from('brc_firc_records').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm(BLANK_FORM)
    loadRecords(companyId)
  }

  const handleEdit = (r: BRCRecord) => {
    setForm({
      document_type: r.document_type,
      document_no: r.document_no ?? '',
      invoice_no: r.invoice_no ?? '',
      invoice_date: r.invoice_date?.slice(0, 10) ?? '',
      invoice_amount: r.invoice_amount?.toString() ?? '',
      invoice_currency: r.invoice_currency ?? 'USD',
      realized_amount: r.realized_amount?.toString() ?? '',
      realized_currency: r.realized_currency ?? 'INR',
      realization_date: r.realization_date?.slice(0, 10) ?? '',
      bank_name: r.bank_name ?? '',
      ad_code: r.ad_code ?? '',
      status: r.status,
      notes: r.notes ?? '',
    })
    setEditId(r.id)
    setShowForm(true)
    setError(null)
  }

  const handleDelete = async (id: string) => {
    if (!companyId || !window.confirm('Delete this record?')) return
    await supabase.from('brc_firc_records').delete().eq('id', id)
    loadRecords(companyId)
  }

  const totalInvoiced  = records.reduce((s, r) => s + Number(r.invoice_amount), 0)
  const totalRealized  = records.filter(r => r.status === 'realized').reduce((s, r) => s + Number(r.realized_amount ?? r.invoice_amount), 0)
  const pendingCount   = records.filter(r => r.status === 'pending' || r.status === 'partial').length
  const overdueCount   = records.filter(r => r.status === 'overdue').length

  const card: React.CSSProperties = {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, boxShadow: shadow.sm, border: `1px solid ${colors.border}`,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md, fontSize: fontSize.sm, color: colors.text,
    fontFamily: 'inherit', backgroundColor: colors.surface, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.medium,
    color: colors.textMuted, marginBottom: '4px',
  }

  return (
    <div style={{ padding: spacing.lg, maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <div>
          <h1 style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.text, margin: 0 }}>
            BRC / FIRC Tracker
          </h1>
          <p style={{ fontSize: fontSize.sm, color: colors.textMuted, margin: '4px 0 0' }}>
            Track bank realization of export invoices. Required for RoDTEP claims and AD code compliance.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(BLANK_FORM); setError(null) }}
          style={{
            backgroundColor: colors.accent, color: colors.white, border: 'none',
            borderRadius: borderRadius.md, padding: '9px 16px', fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold, cursor: 'pointer', transition: `background ${transition.fast}`,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.accentHover }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.accent }}
        >
          + Add Record
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.md, marginBottom: spacing.lg }}>
        {[
          { label: 'Total Invoiced',   value: `USD ${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sub: `${records.length} invoices`, accent: colors.text },
          { label: 'Realized (INR)',   value: totalRealized > 0 ? `₹${(totalRealized / 100000).toFixed(2)} L` : '₹0', sub: `${records.filter(r => r.status === 'realized').length} realized`, accent: colors.status.success },
          { label: 'Pending / Partial',value: String(pendingCount), sub: 'awaiting realization', accent: colors.status.pending },
          { label: 'Past realisation deadline', value: String(overdueCount), sub: overdueCount > 0 ? 'action required' : 'all on track', accent: overdueCount > 0 ? colors.risk.high : colors.status.success },
        ].map(s => (
          <div key={s.label} style={card}>
            <div style={{ fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium, marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: s.accent }}>{s.value}</div>
            <div style={{ fontSize: fontSize.xs, color: colors.textSubtle, marginTop: '2px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ ...card, marginBottom: spacing.lg }}>
          <h3 style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text, margin: `0 0 ${spacing.md}` }}>
            {editId ? 'Edit Record' : 'Add BRC / FIRC Record'}
          </h3>
          {error && (
            <div style={{ backgroundColor: colors.surfaces.dangerBg, color: colors.surfaces.dangerText, padding: '8px 12px', borderRadius: borderRadius.md, fontSize: fontSize.sm, marginBottom: spacing.md }}>
              {error}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md }}>
            <div>
              <label style={labelStyle}>Document Type</label>
              <select style={inputStyle} value={form.document_type}
                onChange={e => setForm(f => ({ ...f, document_type: e.target.value as DocType }))}>
                <option value="brc">BRC (Bank Realization Certificate)</option>
                <option value="firc">FIRC (Foreign Inward Remittance)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Document / BRC No</label>
              <input style={inputStyle} placeholder="Bank-issued reference number" value={form.document_no}
                onChange={e => setForm(f => ({ ...f, document_no: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Invoice No</label>
              <input style={inputStyle} placeholder="Your export invoice number" value={form.invoice_no}
                onChange={e => setForm(f => ({ ...f, invoice_no: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Invoice Date *</label>
              <input type="date" style={inputStyle} value={form.invoice_date}
                onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Invoice Amount *</label>
              <input type="number" step="0.01" style={inputStyle} placeholder="0.00" value={form.invoice_amount}
                onChange={e => setForm(f => ({ ...f, invoice_amount: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Invoice Currency</label>
              <select style={inputStyle} value={form.invoice_currency}
                onChange={e => setForm(f => ({ ...f, invoice_currency: e.target.value }))}>
                {['USD', 'EUR', 'GBP', 'AED', 'JPY', 'AUD', 'SGD'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Realized Amount (INR)</label>
              <input type="number" step="0.01" style={inputStyle} placeholder="Amount received in INR" value={form.realized_amount}
                onChange={e => setForm(f => ({ ...f, realized_amount: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Realization Date</label>
              <input type="date" style={inputStyle} value={form.realization_date}
                onChange={e => setForm(f => ({ ...f, realization_date: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as BRCStatus }))}>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="realized">Fully Realized</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Bank Name</label>
              <input style={inputStyle} placeholder="e.g. HDFC Bank, SBI" value={form.bank_name}
                onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>AD Code</label>
              <input style={inputStyle} placeholder="Authorized Dealer code" value={form.ad_code}
                onChange={e => setForm(f => ({ ...f, ad_code: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <input style={inputStyle} placeholder="Optional notes…" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditId(null); setError(null) }}
              style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, backgroundColor: 'transparent', color: colors.textMuted, fontSize: fontSize.sm, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '8px 16px', backgroundColor: colors.accent, color: colors.white, border: 'none', borderRadius: borderRadius.md, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Record'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textMuted, fontSize: fontSize.sm }}>Loading records…</div>
        ) : records.length === 0 ? (
          <div style={{ padding: `${spacing.xl} ${spacing.lg}`, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>🏦</div>
            <div style={{ fontWeight: fontWeight.semibold, color: colors.text, marginBottom: '4px' }}>No BRC / FIRC records yet</div>
            <div style={{ fontSize: fontSize.sm, color: colors.textMuted }}>Add export invoices to track bank realization. Invoices past their realisation deadline are flagged automatically.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize.sm }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                  {['Type', 'Invoice No', 'Invoice Date', 'Invoice Amt', 'Bank', 'AD Code', 'Realized Amt', 'Realized Date', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: fontWeight.semibold, color: colors.textMuted, fontSize: fontSize.xs, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: i % 2 === 1 ? colors.background : 'transparent' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', color: r.document_type === 'firc' ? colors.surfaces.infoText : colors.textMuted, backgroundColor: r.document_type === 'firc' ? colors.surfaces.infoBg : colors.surfaces.neutralBg, padding: '2px 7px', borderRadius: borderRadius.full }}>
                        {r.document_type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: colors.text, fontWeight: fontWeight.medium }}>{r.invoice_no || r.document_no || '—'}</td>
                    <td style={{ padding: '10px 12px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{fmtDate(r.invoice_date)}</td>
                    <td style={{ padding: '10px 12px', color: colors.text, whiteSpace: 'nowrap' }}>{fmtCurrency(r.invoice_amount, r.invoice_currency)}</td>
                    <td style={{ padding: '10px 12px', color: colors.textMuted }}>{r.bank_name || '—'}</td>
                    <td style={{ padding: '10px 12px', color: colors.textMuted, fontSize: fontSize.xs, fontFamily: 'monospace' }}>{r.ad_code || '—'}</td>
                    <td style={{ padding: '10px 12px', color: r.status === 'realized' ? colors.status.success : colors.textMuted, fontWeight: r.status === 'realized' ? fontWeight.semibold : fontWeight.normal, whiteSpace: 'nowrap' }}>
                      {fmtCurrency(r.realized_amount, 'INR')}
                    </td>
                    <td style={{ padding: '10px 12px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{fmtDate(r.realization_date)}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ ...STATUS_STYLE[r.status], padding: '2px 8px', borderRadius: borderRadius.full, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => handleEdit(r)} style={{ marginRight: '8px', background: 'none', border: 'none', color: colors.accent, fontSize: fontSize.xs, cursor: 'pointer', fontWeight: fontWeight.medium, padding: 0, fontFamily: 'inherit' }}>Edit</button>
                      <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', color: colors.risk.high, fontSize: fontSize.xs, cursor: 'pointer', fontWeight: fontWeight.medium, padding: 0, fontFamily: 'inherit' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: spacing.md, padding: '10px 14px', backgroundColor: colors.surfaces.warningBg, borderRadius: borderRadius.md, fontSize: fontSize.xs, color: colors.surfaces.warningText, border: `1px solid #FCD34D` }}>
        <strong>Note:</strong> Export proceeds must be realised within {BRC_PERIOD_MONTHS_LEGACY} months for invoices raised before {BRC_RULE_CHANGE_DATE}, and {BRC_PERIOD_MONTHS_STANDARD} months for invoices from that date — {BRC_PERIOD_MONTHS_INR} months where the export is invoiced or settled in rupees. Each invoice is measured against its own deadline. Whether the longer period also extends invoices already outstanding on {BRC_RULE_CHANGE_DATE} should be confirmed with your AD bank.
      </div>
    </div>
  )
}
