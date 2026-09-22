// ============================================================================
// License Tracker — Advance Authorization (AA) and EPCG licenses
// Tracks import/export obligation fulfillment and expiry deadlines
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { colors, spacing, borderRadius, shadow, fontSize, fontWeight, transition } from '@theme/index'

// ── Types ─────────────────────────────────────────────────────────────────────

type AAStatus   = 'active' | 'fulfilled' | 'expired' | 'surrendered'
type EPCGStatus = 'active' | 'fulfilled' | 'defaulted' | 'extended'

interface AALicense {
  id: string
  license_no: string
  issue_date: string
  validity_date: string
  hs_codes: string[] | null
  import_obligation: number | null
  export_obligation: number | null
  import_fulfilled: number
  export_fulfilled: number
  status: AAStatus
  notes: string | null
  created_at: string
}

interface EPCGLicense {
  id: string
  license_no: string
  issue_date: string
  validity_date: string
  duty_saved: number
  export_obligation: number
  export_fulfilled: number
  obligation_period_years: number
  status: EPCGStatus
  notes: string | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

const pct = (done: number, total: number | null) => total ? Math.min(100, Math.round((done / total) * 100)) : 0

const AA_STATUS_STYLE: Record<AAStatus, React.CSSProperties> = {
  active:      { backgroundColor: colors.surfaces.infoBg,     color: colors.surfaces.infoText },
  fulfilled:   { backgroundColor: colors.surfaces.successBg,  color: colors.surfaces.successText },
  expired:     { backgroundColor: colors.surfaces.dangerBg,   color: colors.surfaces.dangerText },
  surrendered: { backgroundColor: colors.surfaces.neutralBg,  color: colors.surfaces.neutralText },
}

const EPCG_STATUS_STYLE: Record<EPCGStatus, React.CSSProperties> = {
  active:    { backgroundColor: colors.surfaces.infoBg,     color: colors.surfaces.infoText },
  fulfilled: { backgroundColor: colors.surfaces.successBg,  color: colors.surfaces.successText },
  defaulted: { backgroundColor: colors.surfaces.dangerBg,   color: colors.surfaces.dangerText },
  extended:  { backgroundColor: colors.surfaces.warningBg,  color: colors.surfaces.warningText },
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) {
  return (
    <div style={{ width: '100%', height: '6px', backgroundColor: colors.border, borderRadius: borderRadius.full, overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', backgroundColor: value >= 100 ? colors.status.success : color, borderRadius: borderRadius.full, transition: `width ${transition.slow}` }} />
    </div>
  )
}

// ── Blank forms ───────────────────────────────────────────────────────────────
const BLANK_AA = {
  license_no: '', issue_date: '', validity_date: '', hs_codes: '',
  import_obligation: '', export_obligation: '',
  import_fulfilled: '', export_fulfilled: '',
  status: 'active' as AAStatus, notes: '',
}

const BLANK_EPCG = {
  license_no: '', issue_date: '', validity_date: '',
  duty_saved: '', export_obligation: '', export_fulfilled: '',
  obligation_period_years: '6', status: 'active' as EPCGStatus, notes: '',
}

// ── Main component ─────────────────────────────────────────────────────────────
export function LicenseTracker() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [tab, setTab]             = useState<'aa' | 'epcg'>('aa')

  // AA state
  const [aaLicenses, setAALicenses] = useState<AALicense[]>([])
  const [aaLoading, setAALoading]   = useState(true)
  const [showAAForm, setShowAAForm] = useState(false)
  const [aaForm, setAAForm]         = useState(BLANK_AA)
  const [aaEditId, setAAEditId]     = useState<string | null>(null)
  const [aaSaving, setAASaving]     = useState(false)
  const [aaError, setAAError]       = useState<string | null>(null)

  // EPCG state
  const [epcgLicenses, setEPCGLicenses] = useState<EPCGLicense[]>([])
  const [epcgLoading, setEPCGLoading]   = useState(true)
  const [showEPCGForm, setShowEPCGForm] = useState(false)
  const [epcgForm, setEPCGForm]         = useState(BLANK_EPCG)
  const [epcgEditId, setEPCGEditId]     = useState<string | null>(null)
  const [epcgSaving, setEPCGSaving]     = useState(false)
  const [epcgError, setEPCGError]       = useState<string | null>(null)

  // Resolve company
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
        .then(({ data }) => { if (data?.company_id) setCompanyId(data.company_id) })
    })
  }, [])

  const loadAA = useCallback(async (cid: string) => {
    setAALoading(true)
    const { data } = await supabase.from('aa_licenses').select('*').eq('company_id', cid).order('validity_date', { ascending: true })
    setAALicenses((data ?? []) as AALicense[])
    setAALoading(false)
  }, [])

  const loadEPCG = useCallback(async (cid: string) => {
    setEPCGLoading(true)
    const { data } = await supabase.from('epcg_licenses').select('*').eq('company_id', cid).order('validity_date', { ascending: true })
    setEPCGLicenses((data ?? []) as EPCGLicense[])
    setEPCGLoading(false)
  }, [])

  useEffect(() => {
    if (companyId) { loadAA(companyId); loadEPCG(companyId) }
  }, [companyId, loadAA, loadEPCG])

  // ── AA handlers ──────────────────────────────────────────────────────────────
  const handleSaveAA = async () => {
    if (!companyId) return
    if (!aaForm.license_no || !aaForm.issue_date || !aaForm.validity_date) {
      setAAError('License No, Issue Date, and Validity Date are required.')
      return
    }
    setAASaving(true); setAAError(null)
    const payload = {
      company_id: companyId,
      license_no: aaForm.license_no.trim(),
      issue_date: aaForm.issue_date,
      validity_date: aaForm.validity_date,
      hs_codes: aaForm.hs_codes.trim() ? aaForm.hs_codes.split(',').map(h => h.trim()) : null,
      import_obligation: aaForm.import_obligation ? parseFloat(aaForm.import_obligation) : null,
      export_obligation: aaForm.export_obligation ? parseFloat(aaForm.export_obligation) : null,
      import_fulfilled:  parseFloat(aaForm.import_fulfilled)  || 0,
      export_fulfilled:  parseFloat(aaForm.export_fulfilled)  || 0,
      status: aaForm.status,
      notes: aaForm.notes.trim() || null,
    }
    if (aaEditId) { await supabase.from('aa_licenses').update(payload).eq('id', aaEditId) }
    else          { await supabase.from('aa_licenses').insert(payload) }
    setAASaving(false); setShowAAForm(false); setAAEditId(null); setAAForm(BLANK_AA)
    loadAA(companyId)
  }

  const handleEditAA = (l: AALicense) => {
    setAAForm({
      license_no: l.license_no,
      issue_date: l.issue_date.slice(0, 10),
      validity_date: l.validity_date.slice(0, 10),
      hs_codes: (l.hs_codes ?? []).join(', '),
      import_obligation: l.import_obligation?.toString() ?? '',
      export_obligation: l.export_obligation?.toString() ?? '',
      import_fulfilled: l.import_fulfilled?.toString() ?? '0',
      export_fulfilled: l.export_fulfilled?.toString() ?? '0',
      status: l.status,
      notes: l.notes ?? '',
    })
    setAAEditId(l.id); setShowAAForm(true); setAAError(null)
  }

  const handleDeleteAA = async (id: string) => {
    if (!companyId || !window.confirm('Delete this AA license?')) return
    await supabase.from('aa_licenses').delete().eq('id', id)
    loadAA(companyId)
  }

  // ── EPCG handlers ─────────────────────────────────────────────────────────────
  const handleSaveEPCG = async () => {
    if (!companyId) return
    if (!epcgForm.license_no || !epcgForm.issue_date || !epcgForm.duty_saved) {
      setEPCGError('License No, Issue Date, and Duty Saved are required.')
      return
    }
    setEPCGSaving(true); setEPCGError(null)
    const dutySaved = parseFloat(epcgForm.duty_saved)
    const exportObl = epcgForm.export_obligation ? parseFloat(epcgForm.export_obligation) : dutySaved * 6
    const payload = {
      company_id: companyId,
      license_no: epcgForm.license_no.trim(),
      issue_date: epcgForm.issue_date,
      validity_date: epcgForm.validity_date || new Date(new Date(epcgForm.issue_date).setFullYear(new Date(epcgForm.issue_date).getFullYear() + parseInt(epcgForm.obligation_period_years))).toISOString().slice(0, 10),
      duty_saved: dutySaved,
      export_obligation: exportObl,
      export_fulfilled: parseFloat(epcgForm.export_fulfilled) || 0,
      obligation_period_years: parseInt(epcgForm.obligation_period_years) || 6,
      status: epcgForm.status,
      notes: epcgForm.notes.trim() || null,
    }
    if (epcgEditId) { await supabase.from('epcg_licenses').update(payload).eq('id', epcgEditId) }
    else            { await supabase.from('epcg_licenses').insert(payload) }
    setEPCGSaving(false); setShowEPCGForm(false); setEPCGEditId(null); setEPCGForm(BLANK_EPCG)
    loadEPCG(companyId)
  }

  const handleEditEPCG = (l: EPCGLicense) => {
    setEPCGForm({
      license_no: l.license_no,
      issue_date: l.issue_date.slice(0, 10),
      validity_date: l.validity_date.slice(0, 10),
      duty_saved: l.duty_saved?.toString() ?? '',
      export_obligation: l.export_obligation?.toString() ?? '',
      export_fulfilled: l.export_fulfilled?.toString() ?? '0',
      obligation_period_years: l.obligation_period_years?.toString() ?? '6',
      status: l.status,
      notes: l.notes ?? '',
    })
    setEPCGEditId(l.id); setShowEPCGForm(true); setEPCGError(null)
  }

  const handleDeleteEPCG = async (id: string) => {
    if (!companyId || !window.confirm('Delete this EPCG license?')) return
    await supabase.from('epcg_licenses').delete().eq('id', id)
    loadEPCG(companyId)
  }

  // ── Computed stats ────────────────────────────────────────────────────────────
  const aaActive   = aaLicenses.filter(l => l.status === 'active')
  const aaExpiring = aaActive.filter(l => daysUntil(l.validity_date) <= 90)
  const epcgActive = epcgLicenses.filter(l => l.status === 'active')
  const epcgDuty   = epcgLicenses.reduce((s, l) => s + Number(l.duty_saved), 0)
  const epcgObl    = epcgLicenses.reduce((s, l) => s + Number(l.export_obligation), 0)
  const epcgFulfil = epcgLicenses.reduce((s, l) => s + Number(l.export_fulfilled), 0)

  // ── Shared styles ─────────────────────────────────────────────────────────────
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

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: fontSize.sm, fontWeight: active ? fontWeight.semibold : fontWeight.normal,
    color: active ? colors.accent : colors.textMuted,
    backgroundColor: 'transparent',
    borderBottom: `2px solid ${active ? colors.accent : 'transparent'}`,
    transition: `all ${transition.fast}`,
  })

  return (
    <div style={{ padding: spacing.lg, maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.lg }}>
        <h1 style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.text, margin: 0 }}>
          License Tracker
        </h1>
        <p style={{ fontSize: fontSize.sm, color: colors.textMuted, margin: '4px 0 0' }}>
          Advance Authorization and EPCG licenses — track obligations and avoid default penalties.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${colors.border}`, marginBottom: spacing.lg }}>
        <button style={tabBtn(tab === 'aa')}   onClick={() => setTab('aa')}>Advance Authorization (AA)</button>
        <button style={tabBtn(tab === 'epcg')} onClick={() => setTab('epcg')}>EPCG Licenses</button>
      </div>

      {/* ── AA Tab ── */}
      {tab === 'aa' && (
        <>
          {/* AA Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.md, marginBottom: spacing.lg }}>
            {[
              { label: 'Active Licenses', value: String(aaActive.length), sub: `${aaLicenses.length} total`, accent: colors.text },
              { label: 'Expiring ≤90 days', value: String(aaExpiring.length), sub: aaExpiring.length > 0 ? 'action required' : 'none expiring soon', accent: aaExpiring.length > 0 ? colors.risk.high : colors.status.success },
              { label: 'Fulfilled', value: String(aaLicenses.filter(l => l.status === 'fulfilled').length), sub: 'fully discharged', accent: colors.status.success },
              { label: 'Expired', value: String(aaLicenses.filter(l => l.status === 'expired').length), sub: 'need review', accent: aaLicenses.filter(l => l.status === 'expired').length > 0 ? colors.status.error : colors.textSubtle },
            ].map(s => (
              <div key={s.label} style={card}>
                <div style={{ fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium, marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: s.accent }}>{s.value}</div>
                <div style={{ fontSize: fontSize.xs, color: colors.textSubtle, marginTop: '2px' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* AA Add button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: spacing.md }}>
            <button onClick={() => { setShowAAForm(true); setAAEditId(null); setAAForm(BLANK_AA); setAAError(null) }}
              style={{ backgroundColor: colors.accent, color: colors.white, border: 'none', borderRadius: borderRadius.md, padding: '9px 16px', fontSize: fontSize.sm, fontWeight: fontWeight.semibold, cursor: 'pointer', transition: `background ${transition.fast}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.accentHover }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.accent }}>
              + Add AA License
            </button>
          </div>

          {/* AA Form */}
          {showAAForm && (
            <div style={{ ...card, marginBottom: spacing.lg }}>
              <h3 style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text, margin: `0 0 ${spacing.md}` }}>
                {aaEditId ? 'Edit AA License' : 'Add Advance Authorization License'}
              </h3>
              {aaError && <div style={{ backgroundColor: colors.surfaces.dangerBg, color: colors.surfaces.dangerText, padding: '8px 12px', borderRadius: borderRadius.md, fontSize: fontSize.sm, marginBottom: spacing.md }}>{aaError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md }}>
                <div><label style={labelStyle}>License No *</label><input style={inputStyle} placeholder="AA/XXXXXXXXXX/XXXXXX" value={aaForm.license_no} onChange={e => setAAForm(f => ({ ...f, license_no: e.target.value }))} /></div>
                <div><label style={labelStyle}>Issue Date *</label><input type="date" style={inputStyle} value={aaForm.issue_date} onChange={e => setAAForm(f => ({ ...f, issue_date: e.target.value }))} /></div>
                <div><label style={labelStyle}>Validity Date *</label><input type="date" style={inputStyle} value={aaForm.validity_date} onChange={e => setAAForm(f => ({ ...f, validity_date: e.target.value }))} /></div>
                <div><label style={labelStyle}>HS Codes (comma-separated)</label><input style={inputStyle} placeholder="72081000, 72082000" value={aaForm.hs_codes} onChange={e => setAAForm(f => ({ ...f, hs_codes: e.target.value }))} /></div>
                <div><label style={labelStyle}>Import Obligation (₹ CIF)</label><input type="number" style={inputStyle} placeholder="0.00" value={aaForm.import_obligation} onChange={e => setAAForm(f => ({ ...f, import_obligation: e.target.value }))} /></div>
                <div><label style={labelStyle}>Export Obligation (₹ FOB)</label><input type="number" style={inputStyle} placeholder="0.00" value={aaForm.export_obligation} onChange={e => setAAForm(f => ({ ...f, export_obligation: e.target.value }))} /></div>
                <div><label style={labelStyle}>Import Fulfilled (₹)</label><input type="number" style={inputStyle} placeholder="0.00" value={aaForm.import_fulfilled} onChange={e => setAAForm(f => ({ ...f, import_fulfilled: e.target.value }))} /></div>
                <div><label style={labelStyle}>Export Fulfilled (₹)</label><input type="number" style={inputStyle} placeholder="0.00" value={aaForm.export_fulfilled} onChange={e => setAAForm(f => ({ ...f, export_fulfilled: e.target.value }))} /></div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={aaForm.status} onChange={e => setAAForm(f => ({ ...f, status: e.target.value as AAStatus }))}>
                    <option value="active">Active</option><option value="fulfilled">Fulfilled</option><option value="expired">Expired</option><option value="surrendered">Surrendered</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 3' }}><label style={labelStyle}>Notes</label><input style={inputStyle} placeholder="Optional notes…" value={aaForm.notes} onChange={e => setAAForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowAAForm(false); setAAEditId(null); setAAError(null) }} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, backgroundColor: 'transparent', color: colors.textMuted, fontSize: fontSize.sm, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={handleSaveAA} disabled={aaSaving} style={{ padding: '8px 16px', backgroundColor: colors.accent, color: colors.white, border: 'none', borderRadius: borderRadius.md, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, cursor: aaSaving ? 'not-allowed' : 'pointer', opacity: aaSaving ? 0.7 : 1, fontFamily: 'inherit' }}>{aaSaving ? 'Saving…' : aaEditId ? 'Save Changes' : 'Add License'}</button>
              </div>
            </div>
          )}

          {/* AA Table */}
          <div style={{ ...card, overflow: 'hidden' }}>
            {aaLoading ? (
              <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textMuted, fontSize: fontSize.sm }}>Loading licenses…</div>
            ) : aaLicenses.length === 0 ? (
              <div style={{ padding: `${spacing.xl} ${spacing.lg}`, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>📄</div>
                <div style={{ fontWeight: fontWeight.semibold, color: colors.text, marginBottom: '4px' }}>No AA licenses yet</div>
                <div style={{ fontSize: fontSize.sm, color: colors.textMuted }}>Add your DGFT Advance Authorization licenses to track import/export obligations and expiry deadlines.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize.sm }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                      {['License No', 'Issue Date', 'Valid Until', 'Days Left', 'HS Codes', 'Import Obligation', 'Import %', 'Export Obligation', 'Export %', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: fontWeight.semibold, color: colors.textMuted, fontSize: fontSize.xs, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aaLicenses.map((l, i) => {
                      const days = daysUntil(l.validity_date)
                      const expPct = pct(l.export_fulfilled, l.export_obligation)
                      const impPct = pct(l.import_fulfilled, l.import_obligation)
                      return (
                        <tr key={l.id} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: i % 2 === 1 ? colors.background : 'transparent' }}>
                          <td style={{ padding: '10px 12px', fontWeight: fontWeight.semibold, color: colors.text }}>{l.license_no}</td>
                          <td style={{ padding: '10px 12px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{fmtDate(l.issue_date)}</td>
                          <td style={{ padding: '10px 12px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{fmtDate(l.validity_date)}</td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ color: days <= 0 ? colors.risk.high : days <= 90 ? colors.status.pending : colors.status.success, fontWeight: fontWeight.semibold }}>
                              {days <= 0 ? 'Expired' : `${days}d`}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: colors.textMuted, fontSize: fontSize.xs }}>{(l.hs_codes ?? []).join(', ') || '—'}</td>
                          <td style={{ padding: '10px 12px', color: colors.text, whiteSpace: 'nowrap' }}>{fmtInr(l.import_obligation)}</td>
                          <td style={{ padding: '12px', minWidth: '80px' }}>
                            <ProgressBar value={impPct} color={impPct >= 100 ? colors.status.success : colors.accent} />
                            <span style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{impPct}%</span>
                          </td>
                          <td style={{ padding: '10px 12px', color: colors.text, whiteSpace: 'nowrap' }}>{fmtInr(l.export_obligation)}</td>
                          <td style={{ padding: '12px', minWidth: '80px' }}>
                            <ProgressBar value={expPct} color={expPct >= 100 ? colors.status.success : colors.accent} />
                            <span style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{expPct}%</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ ...AA_STATUS_STYLE[l.status], padding: '2px 8px', borderRadius: borderRadius.full, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'capitalize' }}>{l.status}</span>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <button onClick={() => handleEditAA(l)} style={{ marginRight: '8px', background: 'none', border: 'none', color: colors.accent, fontSize: fontSize.xs, cursor: 'pointer', fontWeight: fontWeight.medium, padding: 0, fontFamily: 'inherit' }}>Edit</button>
                            <button onClick={() => handleDeleteAA(l.id)} style={{ background: 'none', border: 'none', color: colors.risk.high, fontSize: fontSize.xs, cursor: 'pointer', fontWeight: fontWeight.medium, padding: 0, fontFamily: 'inherit' }}>Delete</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ marginTop: spacing.md, padding: '10px 14px', backgroundColor: colors.surfaces.infoBg, borderRadius: borderRadius.md, fontSize: fontSize.xs, color: colors.surfaces.infoText }}>
            <strong>Note:</strong> AA licenses require fulfilment of both import (CIF basis) and export (FOB basis) obligations within the validity period. Failure attracts customs duty + 15% interest. Export fulfillment must be 100% of the license value.
          </div>
        </>
      )}

      {/* ── EPCG Tab ── */}
      {tab === 'epcg' && (
        <>
          {/* EPCG Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.md, marginBottom: spacing.lg }}>
            {[
              { label: 'Active Licenses', value: String(epcgActive.length), sub: `${epcgLicenses.length} total`, accent: colors.text },
              { label: 'Total Duty Saved', value: fmtInr(epcgDuty), sub: 'across all licenses', accent: colors.status.success },
              { label: 'Export Obligation', value: fmtInr(epcgObl), sub: '6× duty saved', accent: colors.text },
              { label: 'Fulfilled', value: fmtInr(epcgFulfil), sub: epcgObl > 0 ? `${pct(epcgFulfil, epcgObl)}% of total obligation` : '—', accent: colors.status.success },
            ].map(s => (
              <div key={s.label} style={card}>
                <div style={{ fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium, marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: s.accent }}>{s.value}</div>
                <div style={{ fontSize: fontSize.xs, color: colors.textSubtle, marginTop: '2px' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* EPCG Add button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: spacing.md }}>
            <button onClick={() => { setShowEPCGForm(true); setEPCGEditId(null); setEPCGForm(BLANK_EPCG); setEPCGError(null) }}
              style={{ backgroundColor: colors.accent, color: colors.white, border: 'none', borderRadius: borderRadius.md, padding: '9px 16px', fontSize: fontSize.sm, fontWeight: fontWeight.semibold, cursor: 'pointer', transition: `background ${transition.fast}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.accentHover }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.accent }}>
              + Add EPCG License
            </button>
          </div>

          {/* EPCG Form */}
          {showEPCGForm && (
            <div style={{ ...card, marginBottom: spacing.lg }}>
              <h3 style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text, margin: `0 0 ${spacing.md}` }}>
                {epcgEditId ? 'Edit EPCG License' : 'Add EPCG License'}
              </h3>
              {epcgError && <div style={{ backgroundColor: colors.surfaces.dangerBg, color: colors.surfaces.dangerText, padding: '8px 12px', borderRadius: borderRadius.md, fontSize: fontSize.sm, marginBottom: spacing.md }}>{epcgError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md }}>
                <div><label style={labelStyle}>License No *</label><input style={inputStyle} placeholder="EPCG/XXXXXXXXXX" value={epcgForm.license_no} onChange={e => setEPCGForm(f => ({ ...f, license_no: e.target.value }))} /></div>
                <div><label style={labelStyle}>Issue Date *</label><input type="date" style={inputStyle} value={epcgForm.issue_date} onChange={e => setEPCGForm(f => ({ ...f, issue_date: e.target.value }))} /></div>
                <div><label style={labelStyle}>Validity / Obligation End Date</label><input type="date" style={inputStyle} value={epcgForm.validity_date} onChange={e => setEPCGForm(f => ({ ...f, validity_date: e.target.value }))} /></div>
                <div><label style={labelStyle}>Duty Saved (₹) *</label><input type="number" style={inputStyle} placeholder="0.00" value={epcgForm.duty_saved} onChange={e => setEPCGForm(f => ({ ...f, duty_saved: e.target.value }))} /></div>
                <div>
                  <label style={labelStyle}>Export Obligation (₹)</label>
                  <input type="number" style={inputStyle} placeholder={`Auto-calculated as 6× duty saved: ${epcgForm.duty_saved ? fmtInr(parseFloat(epcgForm.duty_saved) * 6) : '—'}`}
                    value={epcgForm.export_obligation} onChange={e => setEPCGForm(f => ({ ...f, export_obligation: e.target.value }))} />
                </div>
                <div><label style={labelStyle}>Export Fulfilled to Date (₹)</label><input type="number" style={inputStyle} placeholder="0.00" value={epcgForm.export_fulfilled} onChange={e => setEPCGForm(f => ({ ...f, export_fulfilled: e.target.value }))} /></div>
                <div>
                  <label style={labelStyle}>Obligation Period (years)</label>
                  <select style={inputStyle} value={epcgForm.obligation_period_years} onChange={e => setEPCGForm(f => ({ ...f, obligation_period_years: e.target.value }))}>
                    <option value="6">6 years (standard)</option>
                    <option value="12">12 years (extended for technology)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={epcgForm.status} onChange={e => setEPCGForm(f => ({ ...f, status: e.target.value as EPCGStatus }))}>
                    <option value="active">Active</option><option value="fulfilled">Fulfilled</option><option value="defaulted">Defaulted</option><option value="extended">Extended</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Notes</label><input style={inputStyle} placeholder="Optional notes…" value={epcgForm.notes} onChange={e => setEPCGForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowEPCGForm(false); setEPCGEditId(null); setEPCGError(null) }} style={{ padding: '8px 16px', border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, backgroundColor: 'transparent', color: colors.textMuted, fontSize: fontSize.sm, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={handleSaveEPCG} disabled={epcgSaving} style={{ padding: '8px 16px', backgroundColor: colors.accent, color: colors.white, border: 'none', borderRadius: borderRadius.md, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, cursor: epcgSaving ? 'not-allowed' : 'pointer', opacity: epcgSaving ? 0.7 : 1, fontFamily: 'inherit' }}>{epcgSaving ? 'Saving…' : epcgEditId ? 'Save Changes' : 'Add License'}</button>
              </div>
            </div>
          )}

          {/* EPCG Table */}
          <div style={{ ...card, overflow: 'hidden' }}>
            {epcgLoading ? (
              <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textMuted, fontSize: fontSize.sm }}>Loading licenses…</div>
            ) : epcgLicenses.length === 0 ? (
              <div style={{ padding: `${spacing.xl} ${spacing.lg}`, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>🏭</div>
                <div style={{ fontWeight: fontWeight.semibold, color: colors.text, marginBottom: '4px' }}>No EPCG licenses yet</div>
                <div style={{ fontSize: fontSize.sm, color: colors.textMuted }}>Add your DGFT EPCG licenses to track the 6× export obligation and avoid interest penalties (15% p.a. on duty saved).</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize.sm }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                      {['License No', 'Issue Date', 'Deadline', 'Days Left', 'Duty Saved', 'Export Obligation', 'Fulfilled', 'Remaining', 'Progress', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: fontWeight.semibold, color: colors.textMuted, fontSize: fontSize.xs, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {epcgLicenses.map((l, i) => {
                      const days = daysUntil(l.validity_date)
                      const fulfillPct = pct(l.export_fulfilled, l.export_obligation)
                      const remaining = Math.max(0, Number(l.export_obligation) - Number(l.export_fulfilled))
                      return (
                        <tr key={l.id} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: i % 2 === 1 ? colors.background : 'transparent' }}>
                          <td style={{ padding: '10px 12px', fontWeight: fontWeight.semibold, color: colors.text }}>{l.license_no}</td>
                          <td style={{ padding: '10px 12px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{fmtDate(l.issue_date)}</td>
                          <td style={{ padding: '10px 12px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{fmtDate(l.validity_date)}</td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ color: days <= 0 ? colors.risk.high : days <= 180 ? colors.status.pending : colors.status.success, fontWeight: fontWeight.semibold }}>
                              {days <= 0 ? 'Expired' : days <= 365 ? `${days}d` : `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m`}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: colors.text, whiteSpace: 'nowrap' }}>{fmtInr(l.duty_saved)}</td>
                          <td style={{ padding: '10px 12px', color: colors.text, whiteSpace: 'nowrap' }}>{fmtInr(l.export_obligation)}</td>
                          <td style={{ padding: '10px 12px', color: colors.status.success, fontWeight: fontWeight.semibold, whiteSpace: 'nowrap' }}>{fmtInr(l.export_fulfilled)}</td>
                          <td style={{ padding: '10px 12px', color: remaining > 0 ? colors.status.pending : colors.status.success, whiteSpace: 'nowrap' }}>{fmtInr(remaining)}</td>
                          <td style={{ padding: '12px', minWidth: '100px' }}>
                            <ProgressBar value={fulfillPct} />
                            <span style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{fulfillPct}%</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ ...EPCG_STATUS_STYLE[l.status], padding: '2px 8px', borderRadius: borderRadius.full, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'capitalize' }}>{l.status}</span>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <button onClick={() => handleEditEPCG(l)} style={{ marginRight: '8px', background: 'none', border: 'none', color: colors.accent, fontSize: fontSize.xs, cursor: 'pointer', fontWeight: fontWeight.medium, padding: 0, fontFamily: 'inherit' }}>Edit</button>
                            <button onClick={() => handleDeleteEPCG(l.id)} style={{ background: 'none', border: 'none', color: colors.risk.high, fontSize: fontSize.xs, cursor: 'pointer', fontWeight: fontWeight.medium, padding: 0, fontFamily: 'inherit' }}>Delete</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ marginTop: spacing.md, padding: '10px 14px', backgroundColor: colors.surfaces.dangerBg, borderRadius: borderRadius.md, fontSize: fontSize.xs, color: colors.surfaces.dangerText }}>
            <strong>Critical:</strong> EPCG default attracts customs duty + 15% interest p.a. + possible debarment from future licenses. File EO fulfillment with DGFT before the deadline using ANF 5B. Partial fulfillment reduces penalty proportionally.
          </div>
        </>
      )}
    </div>
  )
}
