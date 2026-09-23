import { useState, useEffect, useRef } from 'react'
import { colors, spacing, borderRadius, shadow } from '@theme/index'
import {
  fetchRodtepRateDetailed, backfillRodtepRates, bulkImportShippingBills,
  parseCSV, csvToShippingBills, buildRodtepClaimCSV, downloadTextFile, updateRodtepClaimStatus,
  checkHSMismatch, fetchShipmentLineFigures,
} from '@/lib/api'
import type { RodtepMatchType, RodtepClaimStatus, BulkImportResult } from '@/lib/api'
import type { LinesRodtep } from '@/lib/shipment-lines'
import { generateRoDTEPReport } from '@/lib/rodtep-report'
import { convertToINR } from '@/lib/fx'
import { supabase } from '@/lib/supabase'
import type { CompanyProfile } from '@/types'

export interface RoDTEPCalculatorProps {
  companyProfile: CompanyProfile
}

interface ShipmentRodtep {
  id: string
  name: string
  hs_code: string
  shipment_value: number
  value_currency: string
  shipping_bill_no: string | null
  date: string
  rodtep_rate: number | null
  rodtep_match_type: RodtepMatchType | null
  rodtep_claimed: boolean
  rodtep_claim_status: RodtepClaimStatus | null
  rodtep_claim_note: string | null
  entitlement?: number
  /** Present when the shipment has an issued commercial invoice: RoDTEP per line. */
  line_rodtep?: LinesRodtep | null
}

function formatINR(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(2)} L`
  return `₹${v.toLocaleString('en-IN')}`
}

function toINR(value: number, currency: string, onDate?: string): number {
  return convertToINR(value, currency, onDate)
}

// RoDTEP deadline: 1 year from shipment date
function getDeadline(shipmentDate: string): { date: string; daysLeft: number; overdue: boolean } {
  const d = new Date(shipmentDate)
  d.setFullYear(d.getFullYear() + 1)
  const deadline = d.toISOString().slice(0, 10)
  const daysLeft = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return { date: deadline, daysLeft, overdue: daysLeft < 0 }
}

const PRESETS = [
  { label: '₹5L',  value: 500_000 },
  { label: '₹10L', value: 1_000_000 },
  { label: '₹50L', value: 5_000_000 },
  { label: '₹1Cr', value: 10_000_000 },
]

const CSV_TEMPLATE = `shipping_bill_no,sb_date,hs_code,description,fob_value,currency,destination,buyer
1234567,15/03/2026,72081000,Hot-rolled steel coils,45000,USD,EU,Muller Stahl GmbH
1234890,02/04/2026,61091000,Cotton T-shirts,12000,EUR,EU,Textil Nord AB`

// ── Audit-trail badge: tells the customer how much to trust the number ──
const MATCH_META: Record<RodtepMatchType, { label: string; bg: string; fg: string; hint: string }> = {
  exact:   { label: 'Exact match',      bg: colors.surfaces.successBg, fg: colors.surfaces.successText, hint: '8-digit HS code found in Appendix 4R. Filing-ready.' },
  prefix:  { label: 'Estimated',        bg: colors.surfaces.amberBg,   fg: colors.surfaces.amberText,   hint: 'No 8-digit row — rate taken from the same 6-digit sub-heading. Confirm the exact RITC with your CHA before filing.' },
  default: { label: 'Not in schedule',  bg: colors.surfaces.dangerBg, fg: colors.surfaces.dangerText, hint: 'HS code not found in Appendix 4R. 0.5% placeholder shown — do NOT file on this figure.' },
}

function MatchBadge({ type, compact }: { type: RodtepMatchType | null | undefined; compact?: boolean }) {
  const m = MATCH_META[type ?? 'default']
  return (
    <span title={m.hint} style={{
      fontSize: compact ? '0.65rem' : '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
      backgroundColor: m.bg, color: m.fg, padding: compact ? '1px 6px' : '3px 10px',
      borderRadius: borderRadius.full, cursor: 'help',
    }}>
      {m.label}
    </span>
  )
}

const STATUS_META: Record<RodtepClaimStatus, { label: string; color: string }> = {
  unclaimed: { label: 'Unclaimed', color: colors.textMuted },
  filed:     { label: 'Filed',     color: colors.status.pending },
  credited:  { label: 'Credited',  color: colors.status.success },
  rejected:  { label: 'Rejected',  color: colors.status.error },
}

export function RoDTEPCalculator({ companyProfile }: RoDTEPCalculatorProps) {
  const [hsCode, setHsCode] = useState('')
  const [exportValue, setExportValue] = useState(1_000_000)
  const [result, setResult] = useState<{ rate: number; entitlement: number; matchType: RodtepMatchType; matchedHs: string | null } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Claim tracker state
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [shipments, setShipments] = useState<ShipmentRodtep[]>([])
  const [trackLoading, setTrackLoading] = useState(false)
  const [backfilled, setBackfilled] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [showAll, setShowAll] = useState(false)

  // Import state
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const chapter = parseInt(hsCode.replace(/\D/g, '').slice(0, 2), 10)
  const notif60 = !isNaN(chapter) && chapter >= 25

  async function handleCalculate() {
    const digits = hsCode.replace(/\D/g, '')
    if (digits.length < 4) { setError('Enter at least a 4-digit HS code'); return }
    if (exportValue <= 0) { setError('Enter a valid export value'); return }
    setError(null)
    setLoading(true)
    try {
      const r = await fetchRodtepRateDetailed(hsCode)
      setResult({ rate: r.rate, entitlement: Math.round(exportValue * (r.rate / 100)), matchType: r.matchType, matchedHs: r.matchedHs })
    } catch {
      setError('Could not fetch RoDTEP rate. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function loadShipments(cid: string) {
    setTrackLoading(true)
    const { data } = await supabase
      .from('shipments')
      .select('id, name, hs_code, shipment_value, value_currency, shipping_bill_no, date, rodtep_rate, rodtep_match_type, rodtep_claimed, rodtep_claim_status, rodtep_claim_note')
      .eq('company_id', cid)
      // A RoDTEP claim needs a shipping bill. Without one the shipment has not
      // been cleared for export and cannot appear as claimable entitlement.
      .not('shipping_bill_no', 'is', null)
      .order('date', { ascending: false })
      .limit(500)

    if (data) {
      // Shipments with an issued commercial invoice are valued per invoice
      // line; the rest keep the single-HS figure, and still need an HS code
      // and value to have one.
      const figures = await fetchShipmentLineFigures(data.map((s: ShipmentRodtep) => ({ id: s.id, date: s.date })))
        .catch(() => new Map<string, never>())
      const enriched: ShipmentRodtep[] = data.flatMap((s: ShipmentRodtep) => {
        const claimStatus = s.rodtep_claim_status ?? (s.rodtep_claimed ? 'filed' : 'unclaimed')
        const f = figures.get(s.id)
        if (f) {
          return [{
            ...s,
            hs_code: f.primaryHs ?? s.hs_code,
            rodtep_claim_status: claimStatus,
            entitlement: f.rodtep.amountInr ?? undefined,
            line_rodtep: f.rodtep,
          }]
        }
        if (s.hs_code == null || s.shipment_value == null) return []
        const inrValue = toINR(s.shipment_value, s.value_currency)
        const rate = s.rodtep_rate ?? 0
        return [{
          ...s,
          rodtep_claim_status: claimStatus,
          entitlement: rate > 0 ? Math.round(inrValue * (rate / 100)) : undefined,
        }]
      })
      setShipments(enriched)
    }
    setTrackLoading(false)
  }

  // Resolve company, backfill any shipments missing a cached rate, then load
  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', user.id)
          .single()
        if (!profile) return
        setCompanyId(profile.company_id)
        setTrackLoading(true)
        try {
          const n = await backfillRodtepRates(profile.company_id)
          if (n > 0) setBackfilled(n)
        } catch { /* backfill is best-effort */ }
        await loadShipments(profile.company_id)
      } catch {
        setTrackLoading(false) // not signed in / Supabase disabled
      }
    }
    init()
  }, [])

  /**
   * Run the HS-vs-description check before a claim is marked filed.
   *
   * "HS code on the shipping bill did not match the invoice description" is
   * the rejection reason already sitting in this table. The detector that
   * catches it existed and was deployed, but lived on another screen and was
   * never consulted here — so the rejection was only ever recorded after the
   * fact, never prevented. This is the gate it was missing.
   */
  async function confirmedDespiteHsMismatch(s: ShipmentRodtep): Promise<boolean> {
    if (!s.hs_code || !s.name) return true
    try {
      const result = await checkHSMismatch({ hsCode: s.hs_code, productDescription: s.name })
      if (!result.mismatch || result.risk === 'clear') return true
      const suggested = result.suggestedCodes?.[0]
      return window.confirm(
        `HS code may not match the goods description.\n\n` +
        `${s.hs_code} — "${s.name}"\n\n` +
        `${result.summary}\n` +
        (suggested ? `\nSuggested: ${suggested.code}\n` : '') +
        `\nThis is the mismatch that gets RoDTEP claims rejected. File anyway?`
      )
    } catch {
      // Never block filing because the checker is unavailable — the exporter
      // has a deadline and this is advisory.
      return true
    }
  }

  async function handleStatus(shipmentId: string, status: RodtepClaimStatus, note?: string) {
    if (status === 'filed') {
      const shipment = shipments.find(s => s.id === shipmentId)
      setBusyId(shipmentId)
      const proceed = shipment ? await confirmedDespiteHsMismatch(shipment) : true
      setBusyId(null)
      if (!proceed) return
    }
    setBusyId(shipmentId)
    try {
      await updateRodtepClaimStatus(shipmentId, status, note)
      setShipments(prev => prev.map(s => s.id === shipmentId
        ? { ...s, rodtep_claim_status: status, rodtep_claimed: status === 'filed' || status === 'credited', rodtep_claim_note: note ?? null }
        : s))
      setNoteFor(null); setNoteText('')
    } finally {
      setBusyId(null)
    }
  }

  async function handleFile(file: File) {
    if (!companyId) { setImportError('Sign in and complete your company profile first.'); return }
    setImporting(true); setImportError(null); setImportResult(null)
    try {
      const text = await file.text()
      const { bills, missing } = csvToShippingBills(parseCSV(text))
      if (missing.length) { setImportError(`Could not find column(s): ${missing.join(', ')}. Download the template to see the expected headers.`); return }
      const res = await bulkImportShippingBills(bills, companyId)
      setImportResult(res)
      await loadShipments(companyId)
    } catch (e: any) {
      setImportError(e?.message ?? 'Import failed')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleClaimFile() {
    // Per-line shipments carry their own match type per line; the file marks
    // default-rate lines unclaimable itself.
    const rows = unclaimed.filter(s => s.line_rodtep || s.rodtep_match_type !== 'default')
    if (rows.length === 0) return
    const csv = buildRodtepClaimCSV(rows, companyProfile)
    downloadTextFile(`rodtep-claim-register-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  const unclaimed = shipments.filter(s => (s.rodtep_claim_status === 'unclaimed' || s.rodtep_claim_status === 'rejected') && s.entitlement !== undefined)
  const filingReady = unclaimed.filter(s => s.rodtep_match_type !== 'default')
  const needsReview = unclaimed.filter(s => s.rodtep_match_type === 'default')
  const totalUnclaimed = unclaimed.reduce((sum, s) => sum + (s.entitlement ?? 0), 0)
  const totalFilingReady = filingReady.reduce((sum, s) => sum + (s.entitlement ?? 0), 0)
  const rejected = shipments.filter(s => s.rodtep_claim_status === 'rejected')
  const credited = shipments.filter(s => s.rodtep_claim_status === 'credited').reduce((sum, s) => sum + (s.entitlement ?? 0), 0)
  const urgentCount = unclaimed.filter(s => {
    const dl = getDeadline(s.date)
    return dl.daysLeft <= 90 && !dl.overdue
  }).length
  const visibleRows = showAll ? unclaimed : unclaimed.slice(0, 12)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    backgroundColor: colors.white, border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md, color: colors.text,
    fontSize: '0.875rem', fontFamily: "'JetBrains Mono', monospace",
    outline: 'none', boxSizing: 'border-box' as const,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.625rem', fontWeight: 600, color: colors.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: 1,
    display: 'block', marginBottom: spacing.xs,
  }

  const primaryBtn: React.CSSProperties = {
    padding: '8px 18px', backgroundColor: colors.accent, color: colors.white,
    border: 'none', borderRadius: borderRadius.md, fontSize: '0.8rem',
    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
  const ghostBtn: React.CSSProperties = {
    ...primaryBtn, backgroundColor: 'transparent', color: colors.textMuted,
    border: `1px solid ${colors.border}`, fontWeight: 500,
  }
  const tinyBtn = (active: boolean, color: string): React.CSSProperties => ({
    padding: '2px 8px', fontSize: '0.68rem', fontWeight: 600, fontFamily: 'inherit',
    backgroundColor: active ? color : 'transparent', color: active ? colors.white : color,
    border: `1px solid ${color}`, borderRadius: borderRadius.sm, cursor: 'pointer',
  })

  return (
    <div style={{ padding: spacing.lg, maxWidth: 860 }}>

      {/* ── Look-back audit summary ── */}
      <div style={{
        padding: spacing.lg,
        backgroundColor: totalUnclaimed > 0 ? colors.surfaces.successBg : colors.surface,
        borderRadius: borderRadius.lg,
        border: `1px solid ${totalUnclaimed > 0 ? colors.status.success : colors.border}44`,
        borderLeft: `4px solid ${totalUnclaimed > 0 ? colors.status.success : colors.border}`,
        marginBottom: spacing.lg,
        boxShadow: shadow.sm,
      }}>
        {trackLoading ? (
          <div style={{ color: colors.textMuted, fontSize: '0.875rem' }}>Auditing your shipping bills against Appendix 4R…</div>
        ) : (
          <>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.surfaces.successText, marginBottom: spacing.xs }}>
              Unclaimed RoDTEP across your export history
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.md, flexWrap: 'wrap' as const, marginBottom: spacing.sm }}>
              <span style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: colors.surfaces.successText, lineHeight: 1.1 }}>
                {formatINR(totalUnclaimed)}
              </span>
              <span style={{ fontSize: '0.875rem', color: colors.textMuted }}>
                across {unclaimed.length} shipping bill{unclaimed.length !== 1 ? 's' : ''}
              </span>
              {urgentCount > 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: colors.surfaces.warningBg, color: colors.surfaces.warningText, padding: '2px 8px', borderRadius: borderRadius.full }}>
                  {urgentCount} filing deadline{urgentCount > 1 ? 's' : ''} within 90 days
                </span>
              )}
              {rejected.length > 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: colors.surfaces.dangerBg, color: colors.status.error, padding: '2px 8px', borderRadius: borderRadius.full }}>
                  {rejected.length} rejected — needs escalation
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' as const, fontSize: '0.78rem', color: colors.textMuted, marginBottom: spacing.md }}>
              <span><strong style={{ color: colors.surfaces.successText }}>{formatINR(totalFilingReady)}</strong> filing-ready ({filingReady.length})</span>
              {needsReview.length > 0 && <span><strong style={{ color: colors.status.error }}>{needsReview.length}</strong> not in schedule — manual check</span>}
              {credited > 0 && <span><strong style={{ color: colors.text }}>{formatINR(credited)}</strong> credited to date</span>}
              {backfilled != null && <span>{backfilled} shipment{backfilled > 1 ? 's' : ''} had no cached rate — fixed on load</span>}
            </div>

            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' as const }}>
              <button onClick={handleClaimFile} disabled={filingReady.length === 0} style={{ ...primaryBtn, opacity: filingReady.length === 0 ? 0.5 : 1, cursor: filingReady.length === 0 ? 'not-allowed' : 'pointer' }}>
                Download claim register (CSV) · {filingReady.length}
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={importing} style={ghostBtn}>
                {importing ? 'Importing…' : 'Import shipping bills (CSV)'}
              </button>
              <button onClick={() => downloadTextFile('shipping-bills-template.csv', CSV_TEMPLATE)} style={ghostBtn}>
                Template
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>

            {importError && <div style={{ marginTop: spacing.sm, fontSize: '0.8rem', color: colors.status.error }}>{importError}</div>}
            {importResult && (
              <div style={{ marginTop: spacing.sm, padding: spacing.sm, backgroundColor: colors.white, border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, fontSize: '0.8rem', color: colors.text }}>
                <strong>Imported {importResult.inserted}</strong> shipping bill{importResult.inserted !== 1 ? 's' : ''} → <strong style={{ color: colors.surfaces.successText }}>{formatINR(importResult.totalEntitlementINR)}</strong> new entitlement found
                {importResult.skippedDuplicates > 0 && <> · {importResult.skippedDuplicates} already on file</>}
                <span style={{ color: colors.textMuted }}> · {importResult.byMatchType.exact} exact / {importResult.byMatchType.prefix} estimated / {importResult.byMatchType.default} not in schedule</span>
                {importResult.errors.length > 0 && (
                  <ul style={{ margin: `${spacing.xs} 0 0`, paddingLeft: 18, color: colors.status.error }}>
                    {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>Row {e.row}: {e.reason}</li>)}
                    {importResult.errors.length > 5 && <li>…and {importResult.errors.length - 5} more</li>}
                  </ul>
                )}
              </div>
            )}

            {/* Per-shipment rows */}
            {unclaimed.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing.xs, marginTop: spacing.md }}>
                {visibleRows.map(s => {
                  const dl = getDeadline(s.date)
                  const st = s.rodtep_claim_status ?? 'unclaimed'
                  return (
                    <div key={s.id} style={{
                      padding: `${spacing.xs} ${spacing.sm}`,
                      backgroundColor: colors.white,
                      border: `1px solid ${st === 'rejected' ? colors.status.error + '66' : dl.daysLeft <= 90 ? colors.risk.medium + '44' : colors.border}`,
                      borderRadius: borderRadius.md, fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' as const }}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <span style={{ fontWeight: 500, color: colors.text }}>{s.name}</span>
                          {s.shipping_bill_no && <span style={{ color: colors.textMuted, marginLeft: spacing.xs }}>· SB {s.shipping_bill_no}</span>}
                          <span style={{ color: colors.textMuted, marginLeft: spacing.xs }}>· HS {s.hs_code}</span>
                          <span style={{ color: colors.textMuted, marginLeft: spacing.xs }}>
                            {s.line_rodtep
                              ? `· ${s.line_rodtep.lines.length} invoice lines, rate per line${s.line_rodtep.complete ? '' : ' (some lines have no figure)'}`
                              : `· ${s.rodtep_rate}%`}
                          </span>
                        </div>
                        {!s.line_rodtep && <MatchBadge type={s.rodtep_match_type} compact />}
                        <span style={{ fontWeight: 600, color: colors.status.success, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatINR(s.entitlement!)}
                        </span>
                        <span style={{ fontSize: '0.72rem', flexShrink: 0, color: dl.overdue ? colors.risk.high : dl.daysLeft <= 90 ? colors.risk.medium : colors.textMuted, fontWeight: dl.daysLeft <= 90 ? 600 : 400 }}>
                          {dl.overdue ? 'OVERDUE' : `${dl.daysLeft}d left`}
                        </span>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button disabled={busyId === s.id} onClick={() => handleStatus(s.id, 'filed')} style={tinyBtn(false, STATUS_META.filed.color)}>Filed</button>
                          <button disabled={busyId === s.id} onClick={() => handleStatus(s.id, 'credited')} style={tinyBtn(false, STATUS_META.credited.color)}>Credited</button>
                          <button disabled={busyId === s.id} onClick={() => { setNoteFor(noteFor === s.id ? null : s.id); setNoteText(s.rodtep_claim_note ?? '') }} style={tinyBtn(st === 'rejected', STATUS_META.rejected.color)}>Rejected</button>
                        </div>
                      </div>
                      {st === 'rejected' && s.rodtep_claim_note && noteFor !== s.id && (
                        <div style={{ marginTop: 4, fontSize: '0.72rem', color: colors.status.error }}>Rejection: {s.rodtep_claim_note}</div>
                      )}
                      {noteFor === s.id && (
                        <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs, alignItems: 'center' }}>
                          <input
                            value={noteText} onChange={e => setNoteText(e.target.value)}
                            placeholder="ICEGATE rejection reason / query text (so we can help you rectify it)"
                            style={{ ...inputStyle, fontFamily: 'inherit', fontSize: '0.75rem', padding: '6px 10px' }}
                          />
                          <button onClick={() => handleStatus(s.id, 'rejected', noteText)} style={tinyBtn(true, STATUS_META.rejected.color)}>Save</button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {unclaimed.length > 12 && (
                  <button onClick={() => setShowAll(v => !v)} style={{ ...ghostBtn, alignSelf: 'flex-start', padding: '4px 12px', fontSize: '0.72rem' }}>
                    {showAll ? 'Show fewer' : `Show all ${unclaimed.length}`}
                  </button>
                )}
              </div>
            )}

            {unclaimed.length === 0 && shipments.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginTop: spacing.sm }}>
                No shipping bills on file yet. Import a CSV of your last 12–24 months of shipping bills (from ICEGATE, your CHA, or Tally) to see everything you have not claimed — in one pass.
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Single-shipment calculator ── */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, marginBottom: spacing.xs, color: colors.text }}>
          RoDTEP Recovery Calculator
        </h2>
        <p style={{ color: colors.textMuted, fontSize: '0.875rem', margin: 0 }}>
          Enter your HS code and FOB export value to estimate entitlement for a single shipment.
        </p>
      </div>

      <div style={{ backgroundColor: colors.surface, borderRadius: borderRadius.lg, border: `1px solid ${colors.border}`, padding: spacing.lg, marginBottom: spacing.lg }}>
        <div style={{ marginBottom: spacing.md }}>
          <label style={labelStyle}>HS Code (4–8 digits)</label>
          <input
            type="text" placeholder="e.g. 72081000" value={hsCode}
            onChange={e => { setHsCode(e.target.value); setResult(null); setError(null) }}
            maxLength={10} style={inputStyle}
          />
          {notif60 && (
            <div style={{ fontSize: '0.7rem', color: colors.status.pending, marginTop: 4 }}>
              Chapter {chapter} — Notification 60/2025-26 revised rates apply
            </div>
          )}
        </div>

        <div style={{ marginBottom: spacing.md }}>
          <label style={labelStyle}>Export Value — FOB (₹)</label>
          <input type="number" value={exportValue} onChange={e => { setExportValue(Number(e.target.value) || 0); setResult(null) }} style={{ ...inputStyle, maxWidth: 240 }} />
          <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' as const }}>
            {PRESETS.map(p => (
              <button key={p.value} onClick={() => { setExportValue(p.value); setResult(null) }} style={{
                padding: '4px 10px', borderRadius: borderRadius.sm, fontSize: '0.625rem', fontWeight: 600,
                border: `1px solid ${exportValue === p.value ? colors.accent : colors.border}`,
                backgroundColor: exportValue === p.value ? colors.accentSurface : 'transparent',
                color: exportValue === p.value ? colors.surfaces.infoText : colors.textMuted,
                cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
              }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ fontSize: '0.8rem', color: colors.status.error, marginBottom: spacing.sm }}>{error}</div>}

        <button onClick={handleCalculate} disabled={loading} style={{ ...primaryBtn, padding: '10px 24px', fontSize: '0.875rem', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Fetching rate…' : 'Calculate Entitlement'}
        </button>
      </div>

      {result && (
        <div style={{ backgroundColor: colors.surfaces.successBg, borderRadius: borderRadius.lg, border: `2px solid ${colors.status.success}66`, padding: spacing.lg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.surfaces.successText }}>
              Estimated Entitlement
            </div>
            <MatchBadge type={result.matchType} />
          </div>
          <div style={{ display: 'flex', gap: spacing.xl, flexWrap: 'wrap' as const, marginBottom: spacing.md }}>
            <div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: colors.surfaces.successText, lineHeight: 1.1 }}>
                {formatINR(result.entitlement)}
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.surfaces.successText, marginTop: 2 }}>
                Unclaimed RoDTEP on {formatINR(exportValue)} export value
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: colors.text, lineHeight: 1.1 }}>
                {result.rate}%
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: 2 }}>
                RoDTEP rate · Appendix 4R{result.matchedHs ? ` · row ${result.matchedHs}` : ''}
              </div>
            </div>
          </div>

          {/* How this number was produced — the audit trail */}
          <div style={{ padding: '8px 12px', backgroundColor: colors.white, borderRadius: borderRadius.md, border: `1px solid ${colors.border}`, fontSize: '0.75rem', color: colors.text, marginBottom: spacing.md, lineHeight: 1.6 }}>
            <strong>How we got this:</strong> {MATCH_META[result.matchType].hint}
            {' '}Calculation: {formatINR(exportValue)} × {result.rate}% = {formatINR(result.entitlement)}.
            {notif60 && <> Notification 60/2025-26 (Feb 2026) revised chapter {chapter}+ rates; the rate shown is post-revision.</>}
          </div>

          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button onClick={() => generateRoDTEPReport(hsCode, exportValue, result.rate, companyProfile.name || 'Exporter', result.matchType, result.matchedHs)} style={primaryBtn}>
              Download Report
            </button>
            <button onClick={() => { setHsCode(''); setExportValue(1_000_000); setResult(null) }} style={ghostBtn}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
