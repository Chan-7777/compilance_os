// ============================================================================
// Onboarding — 6-step setup flow shown to first-time users
// Step 1: Who are you? (role)
// Step 2: Company profile (name, designation, city, whatsapp, turnover, years)
// Step 3: What do you trade? (product + HS code)
// Step 4: Which markets?
// Step 5: Compliance self-assessment
// Step 6: Export credentials (IEC + GSTIN)
// ============================================================================

import { useState, useRef, useEffect } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { colors, spacing, borderRadius } from '@theme/index'
import type { CountryCode } from '@/types'
import { searchHSProducts } from '@/data/hs-product-db'
import { fetchHSLookup } from '@/lib/api'
import type { HSLookupResult } from '@/lib/api'

interface OnboardingDetails {
  iec?: string
  gstin?: string
  name?: string
  designation?: string
  city?: string
  whatsapp?: string
  turnoverRange?: string
  yearsExporting?: string
  knownRegulations?: string[]
  complianceConfidence?: number
  pastComplianceIssues?: string[]
  painPoints?: string[]
}

interface OnboardingProps {
  onComplete: (
    product: string,
    countries: CountryCode[],
    companyDetails?: OnboardingDetails,
    hsCode?: string,
    hsProductName?: string
  ) => void
}

const PRODUCTS = [
  { id: 'food', label: 'Food & Agriculture', hint: 'Grains, spices, processed food' },
  { id: 'textiles', label: 'Textiles & Apparel', hint: 'Fabric, garments, yarn' },
  { id: 'chemicals', label: 'Chemicals & Fertilizers', hint: 'Industrial chemicals, dyes' },
  { id: 'electronics', label: 'Electronics & Electricals', hint: 'Consumer electronics, cables' },
  { id: 'steel', label: 'Steel & Iron Products', hint: 'Rolled steel, pipes, structural' },
  { id: 'pharma', label: 'Pharmaceuticals', hint: 'Medicines, APIs, medical devices' },
  { id: 'automotive', label: 'Automotive & Parts', hint: 'Vehicles, spare parts' },
  { id: 'machinery', label: 'Machinery & Equipment', hint: 'Industrial machinery, tools' },
  { id: 'general', label: 'Other / General', hint: 'Handicrafts, gems, leather' },
]

const MARKETS = [
  { code: 'EU' as CountryCode, name: 'European Union', flag: '🇪🇺', note: 'CBAM + EUDR rules' },
  { code: 'US' as CountryCode, name: 'United States', flag: '🇺🇸', note: 'Large volume market' },
  { code: 'UK' as CountryCode, name: 'United Kingdom', flag: '🇬🇧', note: 'Post-Brexit ruleset' },
  { code: 'UAE' as CountryCode, name: 'UAE / GCC', flag: '🇦🇪', note: 'CEPA with India' },
  { code: 'Japan' as CountryCode, name: 'Japan', flag: '🇯🇵', note: 'IJCEPA with India' },
  { code: 'Australia' as CountryCode, name: 'Australia', flag: '🇦🇺', note: 'ECTA with India' },
]

const ROLES = [
  { id: 'exporter', label: 'Exporter', description: 'I sell goods to buyers in other countries', icon: '→' },
  { id: 'importer', label: 'Importer', description: 'I bring goods into India', icon: '←' },
  { id: 'both', label: 'Both', description: 'I export and import goods', icon: '⇄' },
]

const TURNOVER_OPTIONS = ['< ₹1 Crore', '₹1–5 Crore', '₹5–25 Crore', '₹25–100 Crore', '₹100 Crore+']
const YEARS_OPTIONS = ['Less than 1 year', '1–3 years', '3–10 years', '10+ years']

const KNOWN_REGULATIONS = [
  'CBAM (Carbon Tax)', 'EUDR (Deforestation)', 'REACH / Chemicals',
  'UFLPA (Forced Labour)', 'FDA FSMA', 'Rules of Origin (FTA)',
  'None — I am not sure',
]

const PAST_ISSUES = [
  'Shipment detained', 'Order cancelled', 'Penalty / fine paid',
  'Bank rejected financing', 'No problem so far',
]

const PAIN_POINTS = [
  'Fear of shipment seizure',
  'Buyer demanding docs I don\'t have',
  'Not knowing which FTA tariff I qualify for',
  'Capital locked for too long',
  'Don\'t know where to start',
  'Lack of CA / advisor who understands export compliance',
]

const DESIGNATIONS = [
  'Owner / Proprietor', 'Export Manager', 'CFO / Finance Head',
  'Compliance Officer', 'Director', 'Other',
]

export function Onboarding({ onComplete }: OnboardingProps) {
  const isMobile = useMobile()
  const TOTAL_STEPS = 6
  const [step, setStep] = useState(1)

  // Step 1
  const [role, setRole] = useState<string | null>(null)

  // Step 2
  const [companyName, setCompanyName] = useState('')
  const [designation, setDesignation] = useState('')
  const [city, setCity] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [turnoverRange, setTurnoverRange] = useState('')
  const [yearsExporting, setYearsExporting] = useState('')

  // Step 3
  const [product, setProduct] = useState<string | null>(null)
  const [hsQuery, setHsQuery] = useState('')
  const [hsResults, setHsResults] = useState<HSLookupResult[]>([])
  const [hsLoading, setHsLoading] = useState(false)
  const [selectedHsProduct, setSelectedHsProduct] = useState<HSLookupResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Step 4
  const [countries, setCountries] = useState<CountryCode[]>([])

  // Step 5
  const [knownRegulations, setKnownRegulations] = useState<string[]>([])
  const [complianceConfidence, setComplianceConfidence] = useState(3)
  const [pastIssues, setPastIssues] = useState<string[]>([])
  const [painPoints, setPainPoints] = useState<string[]>([])

  // Step 6
  const [iec, setIec] = useState('')
  const [gstin, setGstin] = useState('')

  const toggleCountry = (code: CountryCode) =>
    setCountries(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])

  const toggleChip = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])

  const canProceed =
    (step === 1 && role !== null) ||
    (step === 2 && companyName.trim().length > 1) ||
    (step === 3 && product !== null) ||
    (step === 4 && countries.length > 0) ||
    step === 5 ||
    step === 6

  const handleHsQueryChange = (q: string) => {
    setHsQuery(q)
    setSelectedHsProduct(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setHsResults([]); setHsLoading(false); return }
    const local = searchHSProducts(q, product ?? undefined).map(p => ({
      hsCode: p.hsCode, name: p.name, confidence: 'high' as const, reason: '', source: 'local' as const,
    }))
    setHsResults(local)
    setHsLoading(true)
    debounceRef.current = setTimeout(async () => {
      const apiResults = await fetchHSLookup(q, product ?? undefined)
      const apiCodes = new Set(apiResults.map(r => r.hsCode))
      setHsResults([...apiResults, ...local.filter(l => !apiCodes.has(l.hsCode))].slice(0, 8))
      setHsLoading(false)
    }, 600)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handleSelectHsProduct = (p: HSLookupResult) => {
    setSelectedHsProduct(p); setHsQuery(p.name); setHsResults([]); setHsLoading(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

  const handleFinish = () => {
    if (product && countries.length > 0) {
      onComplete(product, countries, {
        iec: iec || undefined,
        gstin: gstin || undefined,
        name: companyName,
        designation: designation || undefined,
        city: city || undefined,
        whatsapp: whatsapp || undefined,
        turnoverRange: turnoverRange || undefined,
        yearsExporting: yearsExporting || undefined,
        knownRegulations: knownRegulations.length > 0 ? knownRegulations : undefined,
        complianceConfidence,
        pastComplianceIssues: pastIssues.length > 0 ? pastIssues : undefined,
        painPoints: painPoints.length > 0 ? painPoints : undefined,
      }, selectedHsProduct?.hsCode, selectedHsProduct?.name)
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: spacing.lg, overflowY: 'auto',
  }

  const modal: React.CSSProperties = {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    padding: spacing.xl, width: '100%', maxWidth: 520,
    boxShadow: '0 20px 48px rgb(0 0 0 / 0.18)', maxHeight: '90vh', overflowY: 'auto',
  }

  const dot = (active: boolean, done: boolean): React.CSSProperties => ({
    width: active ? 24 : 8, height: 8, borderRadius: borderRadius.full,
    backgroundColor: done || active ? colors.primary : colors.border,
    transition: 'all 200ms ease',
  })

  const title: React.CSSProperties = { fontSize: '1.2rem', fontWeight: 700, color: colors.text, marginBottom: spacing.xs }
  const subtitle: React.CSSProperties = { fontSize: '0.875rem', color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 1.5 }

  const chip = (selected: boolean): React.CSSProperties => ({
    display: 'inline-block', padding: '6px 14px',
    border: `1.5px solid ${selected ? colors.primary : colors.border}`,
    borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
    background: selected ? colors.accentSurface : colors.white,
    color: selected ? colors.primary : colors.text,
    fontWeight: selected ? 600 : 400, transition: 'all 150ms ease',
    margin: '4px 4px 4px 0',
  })

  const card = (selected: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    border: `2px solid ${selected ? colors.primary : colors.border}`,
    borderRadius: borderRadius.lg, cursor: 'pointer',
    background: selected ? colors.accentSurface : colors.white, transition: 'all 150ms ease',
    width: '100%', textAlign: 'left',
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: `${spacing.sm} ${spacing.md}`,
    border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg,
    fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  }

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'auto' }

  const label: React.CSSProperties = {
    display: 'block', marginBottom: spacing.xs,
    fontWeight: 600, fontSize: '0.8rem', color: colors.text,
  }

  const footer: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.xl, paddingTop: spacing.lg, borderTop: `1px solid ${colors.border}`,
  }

  const btnPrimary: React.CSSProperties = {
    padding: `${spacing.sm} ${spacing.lg}`,
    backgroundColor: canProceed ? colors.primary : colors.border,
    color: canProceed ? colors.white : colors.textMuted,
    border: 'none', borderRadius: borderRadius.md, fontWeight: 600,
    fontSize: '0.875rem', cursor: canProceed ? 'pointer' : 'not-allowed',
    transition: 'background 150ms ease', fontFamily: 'inherit',
  }

  const btnGhost: React.CSSProperties = {
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: 'transparent', color: colors.textMuted,
    border: 'none', borderRadius: borderRadius.md, fontWeight: 500,
    fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit',
  }

  const confidenceLabels = ['Not at all', 'Somewhat', 'Moderate', 'Confident', 'Very confident']

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Setup your compliance profile">
      <div style={modal}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xl, alignItems: 'center' }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
            <div key={s} style={dot(s === step, s < step)} />
          ))}
          <span style={{ fontSize: '0.75rem', color: colors.textMuted, marginLeft: 'auto' }}>
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>

        {/* ── Step 1: Role ──────────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <img src="/logo.png" alt="ComplianceOS" style={{ height: 44, width: 'auto' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <p style={title}>Welcome to ComplianceOS</p>
            <p style={subtitle}>
              Let's set up your compliance profile in a few quick steps so we only show you what's relevant to your business.
            </p>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              What best describes you?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {ROLES.map(r => (
                <button key={r.id} onClick={() => setRole(r.id)} style={card(role === r.id)}>
                  <span style={{ fontSize: '1.4rem', minWidth: 28, textAlign: 'center' }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: colors.text }}>{r.label}</div>
                    <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>{r.description}</div>
                  </div>
                  {role === r.id && (
                    <span style={{ marginLeft: 'auto', color: colors.primary, display: 'inline-flex', alignItems: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Company Profile ───────────────────────────────────────── */}
        {step === 2 && (
          <>
            <p style={title}>About your company</p>
            <p style={subtitle}>This helps us personalise your compliance dashboard.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: spacing.md }}>
                <div>
                  <label style={label}>Company Name *</label>
                  <input style={inputStyle} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ABC Exports Pvt Ltd" />
                </div>
                <div>
                  <label style={label}>Your Designation</label>
                  <select style={selectStyle} value={designation} onChange={e => setDesignation(e.target.value)}>
                    <option value="">Select role</option>
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: spacing.md }}>
                <div>
                  <label style={label}>City / State</label>
                  <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} placeholder="Tirupur, Tamil Nadu" />
                </div>
                <div>
                  <label style={label}>WhatsApp Number</label>
                  <input style={inputStyle} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+91 98400 00000" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: spacing.md }}>
                <div>
                  <label style={label}>Annual Export Turnover</label>
                  <select style={selectStyle} value={turnoverRange} onChange={e => setTurnoverRange(e.target.value)}>
                    <option value="">Select range</option>
                    {TURNOVER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Years in Exporting</label>
                  <select style={selectStyle} value={yearsExporting} onChange={e => setYearsExporting(e.target.value)}>
                    <option value="">Select</option>
                    {YEARS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: Product ───────────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <p style={title}>What do you trade?</p>
            <p style={subtitle}>Choose your product category, then search for the exact product for HS code-specific compliance.</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: spacing.sm, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
              {PRODUCTS.map(p => (
                <button key={p.id} onClick={() => { setProduct(p.id); setSelectedHsProduct(null); setHsQuery(''); setHsResults([]) }}
                  style={{ ...card(product === p.id), flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: colors.text }}>{p.label}</div>
                  <div style={{ fontSize: '0.75rem', color: colors.textMuted, lineHeight: 1.4 }}>{p.hint}</div>
                </button>
              ))}
            </div>
            {product && (
              <div style={{ marginTop: spacing.md, borderTop: `1px solid ${colors.border}`, paddingTop: spacing.md }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Specific product (optional)
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={hsQuery} onChange={e => handleHsQueryChange(e.target.value)}
                    placeholder={`e.g. "Basmati Rice", "SS 304 coil"…`} style={inputStyle} />
                  {selectedHsProduct && (
                    <button onClick={() => { setSelectedHsProduct(null); setHsQuery(''); setHsResults([]) }}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, fontSize: '1.1rem' }}>
                      ×
                    </button>
                  )}
                </div>
                {hsLoading && hsResults.length === 0 && (
                  <div style={{ padding: `${spacing.sm} 0`, fontSize: '0.8rem', color: colors.textMuted }}>Searching…</div>
                )}
                {hsResults.length > 0 && (
                  <div style={{ marginTop: 4, border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, background: colors.white, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                    {hsResults.map(r => (
                      <button key={r.hsCode} onClick={() => handleSelectHsProduct(r)}
                        style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, width: '100%', padding: `${spacing.sm} ${spacing.md}`, border: 'none', borderBottom: `1px solid ${colors.border}`, background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: colors.primary, backgroundColor: colors.accentSurface, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{r.hsCode}</span>
                        <span style={{ fontSize: '0.875rem', color: colors.text, flex: 1 }}>{r.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedHsProduct && (
                  <div style={{ marginTop: spacing.sm, padding: `${spacing.xs} ${spacing.sm}`, backgroundColor: colors.accentSurface, border: `1px solid ${colors.accent}44`, borderRadius: borderRadius.md, fontSize: '0.8rem', color: colors.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent, flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
                    <span><strong>{selectedHsProduct.hsCode}</strong> — {selectedHsProduct.name}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Step 4: Markets ───────────────────────────────────────────────── */}
        {step === 4 && (
          <>
            <p style={title}>Which markets do you target?</p>
            <p style={subtitle}>Select all countries you sell to. We'll show compliance rules only for your chosen markets.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {MARKETS.map(m => (
                <button key={m.code} onClick={() => toggleCountry(m.code)} style={card(countries.includes(m.code))}>
                  <span style={{ fontSize: '1.4rem' }}>{m.flag}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: colors.text }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{m.note}</div>
                  </div>
                  {countries.includes(m.code) && (
                    <span style={{ color: colors.primary, display: 'inline-flex', alignItems: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
            {countries.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: colors.primary, marginTop: spacing.sm, fontWeight: 500 }}>
                {countries.length} market{countries.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </>
        )}

        {/* ── Step 5: Compliance Assessment ────────────────────────────────── */}
        {step === 5 && (
          <>
            <p style={title}>Your compliance situation</p>
            <p style={subtitle}>Help us understand your current setup so we can flag what matters most.</p>

            <div style={{ marginBottom: spacing.lg }}>
              <div style={label}>Which regulations are you aware of but not yet compliant with?</div>
              <div>
                {KNOWN_REGULATIONS.map(r => (
                  <button key={r} onClick={() => toggleChip(knownRegulations, setKnownRegulations, r)} style={chip(knownRegulations.includes(r))}>{r}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <div style={{ ...label, marginBottom: spacing.sm }}>
                How confident are you in your current compliance setup?
                <span style={{ fontWeight: 400, color: colors.primary, marginLeft: 8 }}>{confidenceLabels[complianceConfidence - 1]}</span>
              </div>
              <input type="range" min={1} max={5} value={complianceConfidence}
                onChange={e => setComplianceConfidence(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.primary }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: colors.textMuted, marginTop: 4 }}>
                <span>Not at all</span><span>Very confident</span>
              </div>
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <div style={label}>Have you ever faced a compliance-related problem?</div>
              <div>
                {PAST_ISSUES.map(i => (
                  <button key={i} onClick={() => toggleChip(pastIssues, setPastIssues, i)} style={chip(pastIssues.includes(i))}>{i}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={label}>What's keeping you up at night about your exports?</div>
              <div>
                {PAIN_POINTS.map(p => (
                  <button key={p} onClick={() => toggleChip(painPoints, setPainPoints, p)} style={chip(painPoints.includes(p))}>{p}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Step 6: Credentials ──────────────────────────────────────────── */}
        {step === 6 && (
          <>
            <p style={title}>Your export credentials</p>
            <p style={subtitle}>Used for customs filing and document generation. You can add these later in Settings.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <div>
                <label style={label}>IEC Code (Import Export Code)</label>
                <input type="text" value={iec} onChange={e => setIec(e.target.value)} placeholder="e.g. 0388277364" maxLength={10} style={inputStyle} />
              </div>
              <div>
                <label style={label}>GSTIN</label>
                <input type="text" value={gstin} onChange={e => setGstin(e.target.value)} placeholder="e.g. 27AABCU9603R1Z5" maxLength={15} style={inputStyle} />
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                Both fields are optional — you can skip and add them later.
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={footer}>
          {step > 1 ? (
            <button style={btnGhost} onClick={() => setStep(s => s - 1)}>← Back</button>
          ) : <div />}
          {step < TOTAL_STEPS ? (
            <button style={btnPrimary} onClick={() => canProceed && setStep(s => s + 1)} disabled={!canProceed}>
              Next →
            </button>
          ) : (
            <button style={{ ...btnPrimary, backgroundColor: colors.cta ?? colors.primary, color: colors.white, cursor: 'pointer' }} onClick={handleFinish}>
              Set up my dashboard →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
