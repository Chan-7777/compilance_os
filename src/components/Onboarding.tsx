// ============================================================================
// Onboarding — 4-step setup flow shown to first-time users
// Step 1: Who are you? (exporter / importer / both)
// Step 2: What do you trade? (product selection)
// Step 3: Which markets? (country selection)
// Step 4: Company credentials (IEC + GSTIN, optional)
// ============================================================================

import { useState, useRef, useEffect } from 'react'
import { colors, spacing, borderRadius } from '@theme/index'
import type { CountryCode } from '@/types'
import { searchHSProducts } from '@/data/hs-product-db'
import type { HSProduct } from '@/data/hs-product-db'
import { fetchHSLookup } from '@/lib/api'
import type { HSLookupResult } from '@/lib/api'

interface OnboardingProps {
  onComplete: (product: string, countries: CountryCode[], companyDetails?: { iec?: string; gstin?: string }, hsCode?: string, hsProductName?: string) => void
}

const PRODUCTS = [
  { id: 'food', label: 'Food & Agriculture', hint: 'Grains, spices, processed food, beverages' },
  { id: 'textiles', label: 'Textiles & Apparel', hint: 'Fabric, garments, yarn, made-ups' },
  { id: 'chemicals', label: 'Chemicals & Fertilizers', hint: 'Industrial chemicals, fertilizers, dyes' },
  { id: 'electronics', label: 'Electronics & Electricals', hint: 'Consumer electronics, components, cables' },
  { id: 'steel', label: 'Steel & Iron Products', hint: 'Rolled steel, pipes, structural products' },
  { id: 'pharma', label: 'Pharmaceuticals', hint: 'Medicines, APIs, medical devices' },
  { id: 'automotive', label: 'Automotive & Parts', hint: 'Vehicles, spare parts, components' },
  { id: 'machinery', label: 'Machinery & Equipment', hint: 'Industrial machinery, pumps, tools' },
  { id: 'general', label: 'Other / General', hint: 'Handicrafts, gems, leather, other goods' },
]

const MARKETS = [
  { code: 'EU' as CountryCode, name: 'European Union', flag: '🇪🇺', note: 'Strict sustainability rules' },
  { code: 'US' as CountryCode, name: 'United States', flag: '🇺🇸', note: 'Large volume market' },
  { code: 'UK' as CountryCode, name: 'United Kingdom', flag: '🇬🇧', note: 'Post-Brexit own ruleset' },
  { code: 'UAE' as CountryCode, name: 'United Arab Emirates', flag: '🇦🇪', note: 'Trade deal with India' },
  { code: 'Japan' as CountryCode, name: 'Japan', flag: '🇯🇵', note: 'Trade deal with India' },
  { code: 'Australia' as CountryCode, name: 'Australia', flag: '🇦🇺', note: 'Trade deal with India' },
]

const ROLES = [
  {
    id: 'exporter',
    label: 'Exporter',
    description: 'I sell goods to buyers in other countries',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    ),
  },
  {
    id: 'importer',
    label: 'Importer',
    description: 'I bring goods into India from other countries',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    ),
  },
  {
    id: 'both',
    label: 'Both',
    description: 'I export and import goods',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
      </svg>
    ),
  },
]

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<string | null>(null)
  const [product, setProduct] = useState<string | null>(null)
  const [countries, setCountries] = useState<CountryCode[]>([])
  const [iec, setIec] = useState('')
  const [gstin, setGstin] = useState('')

  // HS product search state
  const [hsQuery, setHsQuery] = useState('')
  const [hsResults, setHsResults] = useState<HSLookupResult[]>([])
  const [hsLoading, setHsLoading] = useState(false)
  const [selectedHsProduct, setSelectedHsProduct] = useState<HSLookupResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggleCountry = (code: CountryCode) => {
    setCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const canProceed =
    (step === 1 && role !== null) ||
    (step === 2 && product !== null) ||
    (step === 3 && countries.length > 0) ||
    step === 4

  const handleHsQueryChange = (q: string) => {
    setHsQuery(q)
    setSelectedHsProduct(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.trim().length < 2) {
      setHsResults([])
      setHsLoading(false)
      return
    }

    // Show local DB results immediately
    const local = searchHSProducts(q, product ?? undefined).map(p => ({
      hsCode: p.hsCode,
      name: p.name,
      confidence: 'high' as const,
      reason: '',
      source: 'local' as const,
    }))
    setHsResults(local)

    // Then call AI after 600ms debounce
    setHsLoading(true)
    debounceRef.current = setTimeout(async () => {
      const apiResults = await fetchHSLookup(q, product ?? undefined)
      // Merge: API results first, then any local results not already covered
      const apiCodes = new Set(apiResults.map(r => r.hsCode))
      const merged = [
        ...apiResults,
        ...local.filter(l => !apiCodes.has(l.hsCode)),
      ]
      setHsResults(merged.slice(0, 8))
      setHsLoading(false)
    }, 600)
  }

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handleSelectHsProduct = (p: HSLookupResult) => {
    setSelectedHsProduct(p)
    setHsQuery(p.name)
    setHsResults([])
    setHsLoading(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

  const handleFinish = () => {
    if (product && countries.length > 0) {
      const companyDetails = (iec || gstin) ? { iec: iec || undefined, gstin: gstin || undefined } : undefined
      onComplete(product, countries, companyDetails, selectedHsProduct?.hsCode, selectedHsProduct?.name)
    }
  }

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: spacing.lg,
  }

  const modal: React.CSSProperties = {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 20px 48px rgb(0 0 0 / 0.18)',
  }

  const stepIndicator: React.CSSProperties = {
    display: 'flex',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    alignItems: 'center',
  }

  const dot = (active: boolean, done: boolean): React.CSSProperties => ({
    width: active ? 24 : 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: done || active ? colors.primary : colors.border,
    transition: 'all 200ms ease',
  })

  const title: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.text,
    marginBottom: spacing.xs,
  }

  const subtitle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 1.5,
  }

  const grid: React.CSSProperties = {
    display: 'grid',
    gap: spacing.sm,
  }

  const card = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    border: `2px solid ${selected ? colors.primary : colors.border}`,
    borderRadius: borderRadius.lg,
    cursor: 'pointer',
    background: selected ? '#EFF6FF' : colors.white,
    transition: 'all 150ms ease',
  })

  const footer: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTop: `1px solid ${colors.border}`,
  }

  const btnPrimary: React.CSSProperties = {
    padding: `${spacing.sm} ${spacing.lg}`,
    backgroundColor: canProceed ? colors.primary : colors.border,
    color: canProceed ? colors.white : colors.textMuted,
    border: 'none',
    borderRadius: borderRadius.md,
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: canProceed ? 'pointer' : 'not-allowed',
    transition: 'background 150ms ease',
    fontFamily: 'inherit',
  }

  const btnGhost: React.CSSProperties = {
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: 'transparent',
    color: colors.textMuted,
    border: 'none',
    borderRadius: borderRadius.md,
    fontWeight: 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
  }

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Setup your compliance profile">
      <div style={modal}>
        {/* Step indicator */}
        <div style={stepIndicator}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={dot(s === step, s < step)} />
          ))}
          <span style={{ fontSize: '0.75rem', color: colors.textMuted, marginLeft: 'auto' }}>
            Step {step} of 4
          </span>
        </div>

        {/* Step 1 — Role */}
        {step === 1 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <img src="/logo.png" alt="ComplianceOS" style={{ height: 44, width: 'auto' }} />
            </div>
            <p style={title}>Welcome to ComplianceOS</p>
            <p style={subtitle}>
              Let's set up your profile in 3 quick steps so we only show you what's relevant to your business.
            </p>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              What best describes you?
            </div>
            <div style={grid}>
              {ROLES.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  style={card(role === r.id)}
                >
                  <span style={{ color: role === r.id ? colors.primary : colors.textMuted }}>
                    {r.icon}
                  </span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: colors.text }}>{r.label}</div>
                    <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>{r.description}</div>
                  </div>
                  {role === r.id && (
                    <span style={{ marginLeft: 'auto', color: colors.primary }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2 — Product */}
        {step === 2 && (
          <>
            <p style={title}>What do you trade?</p>
            <p style={subtitle}>
              Choose your product category, then search for the exact product to get an HS code-specific compliance checklist.
            </p>
            <div style={{ ...grid, gridTemplateColumns: '1fr 1fr', maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
              {PRODUCTS.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setProduct(p.id)
                    setSelectedHsProduct(null)
                    setHsQuery('')
                    setHsResults([])
                  }}
                  style={{ ...card(product === p.id), flexDirection: 'column', alignItems: 'flex-start', gap: spacing.xs }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: colors.text }}>{p.label}</div>
                  <div style={{ fontSize: '0.75rem', color: colors.textMuted, lineHeight: 1.4 }}>{p.hint}</div>
                  {product === p.id && (
                    <span style={{ position: 'absolute', top: 8, right: 8, color: colors.primary }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* HS product search — shown once a category is selected */}
            {product && (
              <div style={{ marginTop: spacing.md, borderTop: `1px solid ${colors.border}`, paddingTop: spacing.md }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Specific product (optional)
                </div>
                <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginBottom: spacing.sm }}>
                  Search by product name or HS code for a more precise compliance checklist.
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={hsQuery}
                    onChange={e => handleHsQueryChange(e.target.value)}
                    placeholder={`e.g. "Guntur Mirchi", "Basmati Rice", "SS 304 coil"…`}
                    style={{
                      width: '100%',
                      padding: `${spacing.sm} ${spacing.md}`,
                      border: `1px solid ${selectedHsProduct ? colors.primary : colors.border}`,
                      borderRadius: borderRadius.lg,
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  {selectedHsProduct && (
                    <button
                      onClick={() => { setSelectedHsProduct(null); setHsQuery(''); setHsResults([]) }}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, fontSize: '1rem', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Loading indicator */}
                {hsLoading && hsResults.length === 0 && (
                  <div style={{ padding: `${spacing.sm} ${spacing.md}`, fontSize: '0.8rem', color: colors.textMuted }}>
                    Searching…
                  </div>
                )}

                {/* Search results dropdown */}
                {hsResults.length > 0 && (
                  <div style={{
                    marginTop: 4,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.white,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}>
                    {hsLoading && (
                      <div style={{ padding: '4px 12px', fontSize: '0.7rem', color: colors.textMuted, backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
                        Refining with AI…
                      </div>
                    )}
                    {hsResults.map(r => (
                      <button
                        key={r.hsCode}
                        onClick={() => handleSelectHsProduct(r)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.sm,
                          width: '100%',
                          padding: `${spacing.sm} ${spacing.md}`,
                          border: 'none',
                          borderBottom: `1px solid ${colors.border}`,
                          background: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: colors.primary, backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                          {r.hsCode}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: colors.text, flex: 1 }}>{r.name}</span>
                        {r.source === 'api' && r.confidence === 'high' && (
                          <span style={{ fontSize: '0.65rem', color: colors.risk?.low ?? '#16a34a', whiteSpace: 'nowrap' }}>AI ✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected HS product pill */}
                {selectedHsProduct && (
                  <div style={{
                    marginTop: spacing.sm,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    backgroundColor: '#EFF6FF',
                    border: `1px solid #BFDBFE`,
                    borderRadius: borderRadius.md,
                    fontSize: '0.8rem',
                    color: colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                  }}>
                    <span>✓</span>
                    <span><strong>{selectedHsProduct.hsCode}</strong> — {selectedHsProduct.name}</span>
                    <span style={{ marginLeft: 'auto', color: colors.textMuted, fontSize: '0.75rem' }}>HS code locked in</span>
                  </div>
                )}

                {!selectedHsProduct && (
                  <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs }}>
                    Skip if unsure — you can set this later in Settings.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Step 3 — Markets */}
        {step === 3 && (
          <>
            <p style={title}>Which markets do you target?</p>
            <p style={subtitle}>
              Select all countries you sell to or plan to sell to. We'll only show compliance rules for your chosen markets.
            </p>
            <div style={grid}>
              {MARKETS.map(m => (
                <button
                  key={m.code}
                  onClick={() => toggleCountry(m.code)}
                  style={card(countries.includes(m.code))}
                >
                  <span style={{ fontSize: '1.4rem' }}>{m.flag}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: colors.text }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{m.note}</div>
                  </div>
                  {countries.includes(m.code) && (
                    <span style={{ color: colors.primary }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
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

        {/* Step 4 — Company Credentials */}
        {step === 4 && (
          <>
            <p style={title}>Your export credentials</p>
            <p style={subtitle}>
              These are needed for customs filing. You can update them later in Settings.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <div>
                <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem', color: colors.text }}>
                  IEC Code (Import Export Code)
                </label>
                <input
                  type="text"
                  value={iec}
                  onChange={e => setIec(e.target.value)}
                  placeholder="e.g. 0388277364"
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: spacing.sm,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.lg,
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem', color: colors.text }}>
                  GSTIN
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={e => setGstin(e.target.value)}
                  placeholder="e.g. 27AABCU9603R1Z5"
                  maxLength={15}
                  style={{
                    width: '100%',
                    padding: spacing.sm,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.lg,
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
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
            <button style={btnGhost} onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          ) : (
            <div />
          )}
          {step < 4 ? (
            <button
              style={btnPrimary}
              onClick={() => canProceed && setStep(s => s + 1)}
              disabled={!canProceed}
            >
              Next →
            </button>
          ) : (
            <button
              style={{ ...btnPrimary, backgroundColor: colors.cta, color: colors.white, cursor: 'pointer' }}
              onClick={handleFinish}
            >
              Set up my dashboard →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
