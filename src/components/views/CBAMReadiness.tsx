import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { useToast } from '@/hooks/useToast'
import { colors, spacing, borderRadius } from '@theme/index'
import { sendWhatsAppOutreach, estimateEmissions } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { getCBAMSector, type CBAMSector } from '@/data/cbam-hs-codes'
import { generateCBAMDeclaration, quarterOf, CBAM_DEFAULT_INTENSITY, type CBAMConsignment } from '@/lib/cbam-report'
import type { CompanyProfile } from '@/types'

interface ScopedShipment {
  id: string
  name: string
  hs_code: string
  country: string
  date: string
  shipping_bill_no: string | null
  shipment_value: number | null
  value_currency: string | null
  product: string | null
  sector: CBAMSector | null
}

const FX_TO_INR: Record<string, number> = { INR: 1, USD: 84, EUR: 91, GBP: 107, AED: 23 }
// Rough ₹/kg used to back out tonnage from FOB when no weight is on file —
// same heuristic runGateCheck already uses (₹150/kg for industrial goods).
const INR_PER_KG = 150

export function CBAMReadiness({ product, companyProfile, children }: { product: string; companyProfile?: CompanyProfile; children?: React.ReactNode }) {
  const [vendorName, setVendorName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isSending, setIsSending] = useState(false)
  const { success, error } = useToast()

  // ── Bulk scope classifier ──
  const [rows, setRows] = useState<ScopedShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [quarter, setQuarter] = useState<string>('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
        if (!profile) return
        const { data } = await supabase
          .from('shipments')
          .select('id, name, hs_code, country, date, shipping_bill_no, shipment_value, value_currency, product')
          .eq('company_id', profile.company_id)
          .not('hs_code', 'is', null)
          .order('date', { ascending: false })
          .limit(500)
        const scoped: ScopedShipment[] = (data ?? []).map((s: any) => ({ ...s, sector: getCBAMSector(s.hs_code) }))
        setRows(scoped)
        const quarters = [...new Set(scoped.filter(s => s.sector && s.country === 'EU').map(s => quarterOf(s.date)))]
        if (quarters.length) setQuarter(quarters[0])
      } catch {
        // Not signed in / Supabase disabled — render the empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const euRows = rows.filter(r => r.country === 'EU')
  const inScope = euRows.filter(r => r.sector)
  const outOfScope = euRows.filter(r => !r.sector)
  const nonEUScopedHS = rows.filter(r => r.country !== 'EU' && r.sector)
  const quarters = [...new Set(inScope.map(s => quarterOf(s.date)))]
  const inQuarter = inScope.filter(s => quarterOf(s.date) === quarter)
  const distinctHS = [...new Set(rows.map(r => r.hs_code))]
  const scopedHS = [...new Set(inScope.map(r => r.hs_code))]

  async function handleDeclaration() {
    if (inQuarter.length === 0) return
    setGenerating(true)
    try {
      const consignments: CBAMConsignment[] = await Promise.all(inQuarter.map(async s => {
        const inr = (s.shipment_value ?? 0) * (FX_TO_INR[(s.value_currency ?? 'USD').toUpperCase()] ?? 84)
        const weightKg = Math.max(1, Math.round(inr / INR_PER_KG))
        const weightTonnes = weightKg / 1000
        const sector = s.sector as CBAMSector
        let co2eTonnes = weightTonnes * CBAM_DEFAULT_INTENSITY[sector]
        let emissionsSource: CBAMConsignment['emissionsSource'] = 'default'
        try {
          const est = await estimateEmissions(weightKg, s.hs_code, 'IN', s.product ?? 'steel', 'EU')
          if (est?.co2e_tonnes > 0) { co2eTonnes = est.co2e_tonnes; emissionsSource = 'climatiq' }
        } catch { /* fall back to default intensity */ }
        return {
          shippingBillNo: s.shipping_bill_no, date: s.date, hsCode: s.hs_code, description: s.name,
          sector, weightTonnes, weightSource: 'estimated', co2eTonnes, emissionsSource,
          intensity: weightTonnes > 0 ? co2eTonnes / weightTonnes : 0,
        }
      }))
      generateCBAMDeclaration(consignments, quarter, {
        name: companyProfile?.name ?? 'Exporter', iec: companyProfile?.iec, gstin: companyProfile?.gstin,
        address: companyProfile?.address, city: companyProfile?.city, state: companyProfile?.state,
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleSendRequest = async () => {
    if (!vendorName || !phoneNumber) return
    setIsSending(true)
    try {
      const result = await sendWhatsAppOutreach({ vendorName, phoneNumber, product, companyName: companyProfile?.name ?? 'ComplianceOS Exporter' })
      if (result.success) {
        success('Request preview generated — WhatsApp Business API integration required to send live messages.')
        setVendorName(''); setPhoneNumber('')
      }
    } catch (err: any) {
      error(`Failed to send WhatsApp request: ${err.message}`)
    } finally {
      setIsSending(false)
    }
  }

  const sectionStyle: React.CSSProperties = { marginTop: spacing.xl, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: borderRadius.lg, border: `1px solid ${colors.border}` }
  const inputStyle: React.CSSProperties = { padding: spacing.sm, border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const kpi = (label: string, value: string | number, color: string) => (
    <div style={{ padding: spacing.sm, backgroundColor: colors.white, borderRadius: borderRadius.md, border: `1px solid ${colors.border}`, minWidth: 120 }}>
      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, color: colors.textMuted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color }}>{value}</div>
    </div>
  )

  return (
    <>
      {/* ── Which of my SKUs are actually in CBAM scope? ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.md, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: colors.text }}>Which shipments need a CBAM declaration</h3>
            <p style={{ margin: `${spacing.xs} 0 0 0`, color: colors.textMuted, fontSize: '0.875rem' }}>
              Every HS code on file checked against Annex I of Regulation (EU) 2023/956. Only EU-bound goods in these headings need a declaration.
            </p>
          </div>
          {inQuarter.length > 0 && (
            <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
              <select value={quarter} onChange={e => setQuarter(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '8px 10px' }}>
                {quarters.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <Button variant="primary" onClick={handleDeclaration} disabled={generating}>
                {generating ? 'Calculating emissions…' : `Generate ${quarter} declaration · ${inQuarter.length} consignment${inQuarter.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ color: colors.textMuted, fontSize: '0.875rem' }}>Classifying your HS codes…</div>
        ) : rows.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: '0.875rem' }}>No shipments with HS codes yet. Import your shipping bills from the RoDTEP Recovery page and this will populate automatically.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md }}>
              {kpi('HS codes on file', distinctHS.length, colors.text)}
              {kpi('In CBAM scope', scopedHS.length, scopedHS.length ? colors.status.pending : colors.status.success)}
              {kpi('EU consignments in scope', inScope.length, inScope.length ? colors.status.pending : colors.status.success)}
              {kpi('EU consignments clear', outOfScope.length, colors.status.success)}
            </div>

            {inScope.length === 0 ? (
              <div style={{ padding: spacing.sm, backgroundColor: colors.surfaces.successBg, color: colors.surfaces.successText, borderRadius: borderRadius.md, fontSize: '0.85rem' }}>
                None of your EU-bound HS codes fall under CBAM Annex I. No declaration required today. We'll flag it if the scope expands to your products.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ color: colors.textMuted, textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>HS code</th><th style={{ padding: '6px 8px' }}>Sector</th><th style={{ padding: '6px 8px' }}>EU consignments</th><th style={{ padding: '6px 8px' }}>Most recent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopedHS.map(hs => {
                      const ships = inScope.filter(s => s.hs_code === hs)
                      return (
                        <tr key={hs} style={{ borderTop: `1px solid ${colors.border}` }}>
                          <td style={{ padding: '6px 8px', fontFamily: "'JetBrains Mono', monospace" }}>{hs}</td>
                          <td style={{ padding: '6px 8px' }}><Badge variant="warning">{ships[0].sector}</Badge></td>
                          <td style={{ padding: '6px 8px' }}>{ships.length}</td>
                          <td style={{ padding: '6px 8px', color: colors.textMuted }}>{ships[0].date}{ships[0].shipping_bill_no ? ` · SB ${ships[0].shipping_bill_no}` : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {nonEUScopedHS.length > 0 && (
              <div style={{ marginTop: spacing.sm, fontSize: '0.75rem', color: colors.textMuted }}>
                {nonEUScopedHS.length} non-EU consignment{nonEUScopedHS.length > 1 ? 's' : ''} use CBAM-listed HS codes — no declaration needed unless the destination changes to the EU.
              </div>
            )}
          </>
        )}
      </div>

      {children}

      {/* ── Supplier data collection (existing) ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: colors.text, display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent, flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
              <span>Supplier emissions data</span>
            </h3>
            <p style={{ margin: `${spacing.xs} 0 0 0`, color: colors.textMuted, fontSize: '0.875rem' }}>
              Replace default emission values with actual data from your input suppliers. Collect it via WhatsApp.
            </p>
          </div>
          <Badge variant="warning">BETA</Badge>
        </div>

        <div style={{ padding: spacing.lg, backgroundColor: colors.background, borderRadius: borderRadius.md }}>
          <h4 style={{ margin: `0 0 ${spacing.md} 0`, color: colors.text }}>Request Vendor Data via WhatsApp</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, marginBottom: spacing.xs }}>Vendor Name</label>
              <input style={inputStyle} value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="e.g. Apex Steel Rollers Ltd." />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, marginBottom: spacing.xs }}>WhatsApp Number</label>
              <input style={inputStyle} value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <Button variant="primary" onClick={handleSendRequest} disabled={isSending || !vendorName || !phoneNumber}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  <span>{isSending ? 'Generating...' : 'Preview Request'}</span>
                </span>
              </Button>
            </div>
          </div>
          <div style={{ marginTop: spacing.md, padding: spacing.sm, backgroundColor: colors.surfaces.warningBg, borderRadius: borderRadius.md, border: `1px solid ${colors.status.pending}44` }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: colors.surfaces.warningText }}>
              <strong>Template Preview</strong> (requires WhatsApp Business API to send live): "ComplianceOS request from {companyProfile?.name ?? 'ComplianceOS Exporter'}: Please reply with your monthly energy usage for {product || 'your supplied materials'} to ensure EU export compliance."
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
