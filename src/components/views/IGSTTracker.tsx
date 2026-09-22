// ============================================================================
// IGST Refund Tracker — track shipping bills, refund status, and credited amounts
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { colors, spacing, borderRadius, shadow, fontSize, fontWeight, transition } from '@theme/index'

type RefundStatus = 'filed' | 'under_processing' | 'sanctioned' | 'credited' | 'deficiency_memo'

interface IGSTClaim {
  id: string
  shipping_bill_no: string
  shipping_bill_date: string
  port_code: string | null
  hs_code: string | null
  invoice_value: number
  igst_paid: number
  arn_no: string | null
  refund_status: RefundStatus
  refund_amount: number | null
  credited_date: string | null
  notes: string | null
  created_at: string
}

const STATUS_LABELS: Record<RefundStatus, string> = {
  filed: 'Filed',
  under_processing: 'Processing',
  sanctioned: 'Sanctioned',
  credited: 'Credited',
  deficiency_memo: 'Deficiency',
}

const STATUS_STYLE: Record<RefundStatus, React.CSSProperties> = {
  filed:            { backgroundColor: colors.surfaces.warningBg,  color: colors.surfaces.warningText },
  under_processing: { backgroundColor: colors.surfaces.infoBg,     color: colors.surfaces.infoText },
  sanctioned:       { backgroundColor: colors.surfaces.successBg,  color: colors.surfaces.successText },
  credited:         { backgroundColor: '#A7F3D0',                   color: '#064E3B' },
  deficiency_memo:  { backgroundColor: colors.surfaces.dangerBg,   color: colors.surfaces.dangerText },
}

const fmtInr = (n: number | null | undefined) => {
  if (n == null) return '—'
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const BLANK_FORM = {
  shipping_bill_no: '',
  shipping_bill_date: '',
  port_code: '',
  hs_code: '',
  invoice_value: '',
  igst_paid: '',
  arn_no: '',
  refund_status: 'filed' as RefundStatus,
  refund_amount: '',
  credited_date: '',
  notes: '',
}

export function IGSTTracker() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [claims, setClaims]       = useState<IGSTClaim[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState(BLANK_FORM)
  const [editId, setEditId]       = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  // Resolve company ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
        .then(({ data }) => { if (data?.company_id) setCompanyId(data.company_id) })
    })
  }, [])

  const loadClaims = useCallback(async (cid: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('igst_claims')
      .select('*')
      .eq('company_id', cid)
      .order('shipping_bill_date', { ascending: false })
    setClaims((data ?? []) as IGSTClaim[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (companyId) loadClaims(companyId)
  }, [companyId, loadClaims])

  const handleSave = async () => {
    if (!companyId) return
    if (!form.shipping_bill_no.trim() || !form.shipping_bill_date || !form.igst_paid) {
      setError('Shipping Bill No, Date, and IGST Paid are required.')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      company_id: companyId,
      shipping_bill_no: form.shipping_bill_no.trim(),
      shipping_bill_date: form.shipping_bill_date,
      port_code: form.port_code.trim() || null,
      hs_code: form.hs_code.trim() || null,
      invoice_value: parseFloat(form.invoice_value) || 0,
      igst_paid: parseFloat(form.igst_paid),
      arn_no: form.arn_no.trim() || null,
      refund_status: form.refund_status,
      refund_amount: form.refund_amount ? parseFloat(form.refund_amount) : null,
      credited_date: form.credited_date || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }
    if (editId) {
      await supabase.from('igst_claims').update(payload).eq('id', editId)
    } else {
      await supabase.from('igst_claims').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm(BLANK_FORM)
    loadClaims(companyId)
  }

  const handleEdit = (c: IGSTClaim) => {
    setForm({
      shipping_bill_no: c.shipping_bill_no,
      shipping_bill_date: c.shipping_bill_date.slice(0, 10),
      port_code: c.port_code ?? '',
      hs_code: c.hs_code ?? '',
      invoice_value: c.invoice_value?.toString() ?? '',
      igst_paid: c.igst_paid?.toString() ?? '',
      arn_no: c.arn_no ?? '',
      refund_status: c.refund_status,
      refund_amount: c.refund_amount?.toString() ?? '',
      credited_date: c.credited_date?.slice(0, 10) ?? '',
      notes: c.notes ?? '',
    })
    setEditId(c.id)
    setShowForm(true)
    setError(null)
  }

  const handleDelete = async (id: string) => {
    if (!companyId) return
    if (!window.confirm('Delete this claim?')) return
    await supabase.from('igst_claims').delete().eq('id', id)
    loadClaims(companyId)
  }

  // Summary stats
  const totalPaid      = claims.reduce((s, c) => s + Number(c.igst_paid), 0)
  const totalPending   = claims.filter(c => !['credited'].includes(c.refund_status)).reduce((s, c) => s + Number(c.igst_paid), 0)
  const totalSanctioned= claims.filter(c => c.refund_status === 'sanctioned').reduce((s, c) => s + Number(c.refund_amount ?? c.igst_paid), 0)
  const totalCredited  = claims.filter(c => c.refund_status === 'credited').reduce((s, c) => s + Number(c.refund_amount ?? c.igst_paid), 0)

  const card: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: shadow.sm,
    border: `1px solid ${colors.border}`,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    border: `1px solid ${colors.border}`, borderRadius: borderRadius.md,
    fontSize: fontSize.sm, color: colors.text, fontFamily: 'inherit',
    backgroundColor: colors.surface, outline: 'none', boxSizing: 'border-box',
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
            IGST Refund Tracker
          </h1>
          <p style={{ fontSize: fontSize.sm, color: colors.textMuted, margin: '4px 0 0' }}>
            Track your IGST refunds from the GST portal — from filing to bank credit.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(BLANK_FORM); setError(null) }}
          style={{
            backgroundColor: colors.accent, color: colors.white,
            border: 'none', borderRadius: borderRadius.md, padding: '9px 16px',
            fontSize: fontSize.sm, fontWeight: fontWeight.semibold, cursor: 'pointer',
            transition: `background ${transition.fast}`,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.accentHover }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.accent }}
        >
          + Add Claim
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.md, marginBottom: spacing.lg }}>
        {[
          { label: 'Total IGST Paid', value: fmtInr(totalPaid),       sub: `${claims.length} bills`,                    accent: colors.text },
          { label: 'Pending Refund',  value: fmtInr(totalPending),    sub: `${claims.filter(c => c.refund_status !== 'credited').length} pending`,  accent: colors.status.pending },
          { label: 'Sanctioned',      value: fmtInr(totalSanctioned), sub: `${claims.filter(c => c.refund_status === 'sanctioned').length} orders`,  accent: colors.surfaces.infoText },
          { label: 'Credited to Bank',value: fmtInr(totalCredited),   sub: `${claims.filter(c => c.refund_status === 'credited').length} claims`,   accent: colors.status.success },
        ].map(s => (
          <div key={s.label} style={card}>
            <div style={{ fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium, marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: s.accent }}>{s.value}</div>
            <div style={{ fontSize: fontSize.xs, color: colors.textSubtle, marginTop: '2px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div style={{ ...card, marginBottom: spacing.lg }}>
          <h3 style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text, margin: `0 0 ${spacing.md}` }}>
            {editId ? 'Edit Claim' : 'Add IGST Claim'}
          </h3>
          {error && (
            <div style={{ backgroundColor: colors.surfaces.dangerBg, color: colors.surfaces.dangerText, padding: '8px 12px', borderRadius: borderRadius.md, fontSize: fontSize.sm, marginBottom: spacing.md }}>
              {error}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md }}>
            {/* Row 1 */}
            <div>
              <label style={labelStyle}>Shipping Bill No *</label>
              <input style={inputStyle} placeholder="e.g. 1234567" value={form.shipping_bill_no}
                onChange={e => setForm(f => ({ ...f, shipping_bill_no: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Shipping Bill Date *</label>
              <input type="date" style={inputStyle} value={form.shipping_bill_date}
                onChange={e => setForm(f => ({ ...f, shipping_bill_date: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Port Code</label>
              <input style={inputStyle} placeholder="e.g. INMUN1" value={form.port_code}
                onChange={e => setForm(f => ({ ...f, port_code: e.target.value }))} />
            </div>
            {/* Row 2 */}
            <div>
              <label style={labelStyle}>HS Code</label>
              <input style={inputStyle} placeholder="e.g. 72081000" value={form.hs_code}
                onChange={e => setForm(f => ({ ...f, hs_code: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Invoice Value (₹)</label>
              <input type="number" style={inputStyle} placeholder="0.00" value={form.invoice_value}
                onChange={e => setForm(f => ({ ...f, invoice_value: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>IGST Paid (₹) *</label>
              <input type="number" style={inputStyle} placeholder="0.00" value={form.igst_paid}
                onChange={e => setForm(f => ({ ...f, igst_paid: e.target.value }))} />
            </div>
            {/* Row 3 */}
            <div>
              <label style={labelStyle}>ARN No (GST Portal)</label>
              <input style={inputStyle} placeholder="AA0000000000000" value={form.arn_no}
                onChange={e => setForm(f => ({ ...f, arn_no: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={form.refund_status}
                onChange={e => setForm(f => ({ ...f, refund_status: e.target.value as RefundStatus }))}>
                <option value="filed">Filed</option>
                <option value="under_processing">Under Processing</option>
                <option value="sanctioned">Sanctioned</option>
                <option value="credited">Credited to Bank</option>
                <option value="deficiency_memo">Deficiency Memo</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Refund Amount (₹)</label>
              <input type="number" style={inputStyle} placeholder="Actual refund if different" value={form.refund_amount}
                onChange={e => setForm(f => ({ ...f, refund_amount: e.target.value }))} />
            </div>
            {/* Row 4 */}
            <div>
              <label style={labelStyle}>Credited Date</label>
              <input type="date" style={inputStyle} value={form.credited_date}
                onChange={e => setForm(f => ({ ...f, credited_date: e.target.value }))} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Notes</label>
              <input style={inputStyle} placeholder="Optional notes..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowForm(false); setEditId(null); setError(null) }}
              style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, backgroundColor: 'transparent', color: colors.textMuted, fontSize: fontSize.sm, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 16px', backgroundColor: colors.accent, color: colors.white, border: 'none', borderRadius: borderRadius.md, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
            >
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Claim'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textMuted, fontSize: fontSize.sm }}>Loading claims…</div>
        ) : claims.length === 0 ? (
          <div style={{ padding: `${spacing.xl} ${spacing.lg}`, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>📋</div>
            <div style={{ fontWeight: fontWeight.semibold, color: colors.text, marginBottom: '4px' }}>No IGST claims yet</div>
            <div style={{ fontSize: fontSize.sm, color: colors.textMuted }}>Add your shipping bills to track IGST refunds from the GST portal.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize.sm }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                  {['SB No', 'Date', 'Port', 'HS Code', 'Invoice Value', 'IGST Paid', 'ARN No', 'Status', 'Refund Amt', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: fontWeight.semibold, color: colors.textMuted, fontSize: fontSize.xs, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {claims.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: i % 2 === 1 ? colors.background : 'transparent' }}>
                    <td style={{ padding: '10px 12px', fontWeight: fontWeight.semibold, color: colors.text, whiteSpace: 'nowrap' }}>{c.shipping_bill_no}</td>
                    <td style={{ padding: '10px 12px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{fmtDate(c.shipping_bill_date)}</td>
                    <td style={{ padding: '10px 12px', color: colors.textMuted }}>{c.port_code || '—'}</td>
                    <td style={{ padding: '10px 12px', color: colors.textMuted, fontFamily: 'monospace', fontSize: fontSize.xs }}>{c.hs_code || '—'}</td>
                    <td style={{ padding: '10px 12px', color: colors.text, whiteSpace: 'nowrap' }}>{fmtInr(c.invoice_value)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: fontWeight.semibold, color: colors.text, whiteSpace: 'nowrap' }}>{fmtInr(c.igst_paid)}</td>
                    <td style={{ padding: '10px 12px', color: colors.textMuted, fontSize: fontSize.xs, fontFamily: 'monospace' }}>{c.arn_no || '—'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ ...STATUS_STYLE[c.refund_status], padding: '2px 8px', borderRadius: borderRadius.full, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                        {STATUS_LABELS[c.refund_status]}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: c.refund_status === 'credited' ? colors.status.success : colors.textMuted, fontWeight: c.refund_status === 'credited' ? fontWeight.semibold : fontWeight.normal, whiteSpace: 'nowrap' }}>
                      {c.refund_amount ? fmtInr(c.refund_amount) : (c.refund_status === 'credited' ? fmtInr(c.igst_paid) : '—')}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => handleEdit(c)} style={{ marginRight: '8px', background: 'none', border: 'none', color: colors.accent, fontSize: fontSize.xs, cursor: 'pointer', fontWeight: fontWeight.medium, padding: 0, fontFamily: 'inherit' }}>Edit</button>
                      <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: colors.risk.high, fontSize: fontSize.xs, cursor: 'pointer', fontWeight: fontWeight.medium, padding: 0, fontFamily: 'inherit' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tip */}
      <div style={{ marginTop: spacing.md, padding: '10px 14px', backgroundColor: colors.surfaces.infoBg, borderRadius: borderRadius.md, fontSize: fontSize.xs, color: colors.surfaces.infoText, border: `1px solid ${colors.accentSurface}` }}>
        <strong>Tip:</strong> Log your ARN number from the GST portal after filing. Refunds typically credit within 60 days of the shipping bill date. If a Deficiency Memo is issued, correct and re-file within 90 days to avoid lapsing.
      </div>
    </div>
  )
}
