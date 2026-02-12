import { useState, useEffect } from 'react'
import { Badge } from '@/components/Badge'
import { Spinner } from '@/components/Spinner'
import { colors, spacing, borderRadius } from '@theme/index'
import { fetchFTAAgreements, fetchExportSchemes, fetchBatchFTASavings, fetchCountries } from '@/lib/api'
import type { CountryCode, ProductCode } from '@/types'

interface FTAAgreement {
  country_code: string
  name: string
  status: string
  preferential_tariff: boolean
  effective_date?: string
  round?: string
  notes?: string
}

interface ExportScheme {
  name: string
  description: string
  status: string
}

interface CountryInfo {
  code: string
  name: string
  flag: string
}

interface SavingsResult {
  country: string
  agreement?: string
  mfn_rate: number
  preferential_rate: number
  mfn_duty: number
  preferential_duty: number
  savings: number
}

export interface FTASchemesProps {
  selectedCountries: CountryCode[]
  selectedProduct?: ProductCode
}

export function FTASchemes({ selectedCountries, selectedProduct }: FTASchemesProps) {
  const [savingsInput, setSavingsInput] = useState(1000000)

  // API-fetched data
  const [agreements, setAgreements] = useState<FTAAgreement[]>([])
  const [schemes, setSchemes] = useState<ExportScheme[]>([])
  const [countries, setCountries] = useState<Record<string, CountryInfo>>({})
  const [savingsResults, setSavingsResults] = useState<SavingsResult[]>([])

  const [loading, setLoading] = useState(true)
  const [savingsLoading, setSavingsLoading] = useState(false)

  // Fetch FTA agreements, export schemes, and countries on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([fetchFTAAgreements(), fetchExportSchemes(), fetchCountries()])
      .then(([ftaData, schemeData, countryData]) => {
        if (cancelled) return
        setAgreements(ftaData.agreements)
        setSchemes(schemeData.schemes)
        const countryMap: Record<string, CountryInfo> = {}
        for (const c of countryData.countries) {
          countryMap[c.code] = c
        }
        setCountries(countryMap)
      })
      .catch(err => {
        console.error('Failed to load FTA data:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // Fetch savings when countries, product, or shipment value changes
  useEffect(() => {
    if (selectedCountries.length === 0) {
      setSavingsResults([])
      return
    }

    let cancelled = false
    setSavingsLoading(true)

    fetchBatchFTASavings(selectedCountries, savingsInput, selectedProduct)
      .then(data => {
        if (!cancelled) setSavingsResults(data.results || [])
      })
      .catch(err => {
        console.error('Savings calc failed:', err)
        if (!cancelled) setSavingsResults([])
      })
      .finally(() => {
        if (!cancelled) setSavingsLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedCountries, selectedProduct, savingsInput])

  // Styles
  const containerStyle: React.CSSProperties = { padding: spacing.lg }
  const headerStyle: React.CSSProperties = { marginBottom: spacing.xl }
  const titleStyle: React.CSSProperties = {
    fontSize: '1.5rem', fontWeight: 700, margin: 0, marginBottom: spacing.xs, color: colors.text,
  }
  const sectionStyle: React.CSSProperties = { marginBottom: spacing.xl }
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.125rem', fontWeight: 600, marginBottom: spacing.md, color: colors.text,
  }
  const ftaListStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: spacing.md }
  const ftaCardStyle: React.CSSProperties = {
    display: 'flex', gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.white, border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg,
  }
  const flagStyle: React.CSSProperties = { fontSize: '2rem' }
  const ftaContentStyle: React.CSSProperties = { flex: 1 }
  const ftaNameStyle: React.CSSProperties = {
    fontWeight: 600, marginBottom: spacing.xs, display: 'flex', alignItems: 'center', gap: spacing.sm,
  }
  const ftaNotesStyle: React.CSSProperties = { fontSize: '0.875rem', color: colors.textMuted, marginTop: spacing.xs }
  const schemeGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.md }
  const schemeCardStyle: React.CSSProperties = {
    padding: spacing.md, backgroundColor: colors.white,
    border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg,
  }
  const schemeNameStyle: React.CSSProperties = {
    fontWeight: 600, marginBottom: spacing.xs, display: 'flex', alignItems: 'center', gap: spacing.sm,
  }
  const schemeDescStyle: React.CSSProperties = { fontSize: '0.875rem', color: colors.textMuted }
  const emptyStyle: React.CSSProperties = { textAlign: 'center', padding: spacing['2xl'], color: colors.textMuted }

  const getStatusVariant = (status: string) => {
    if (status === 'Active') return 'success' as const
    if (status === 'Under Negotiation') return 'warning' as const
    return 'default' as const
  }

  if (loading) {
    return (
      <div style={{ ...containerStyle, display: 'flex', justifyContent: 'center', paddingTop: spacing['2xl'] }}>
        <Spinner />
      </div>
    )
  }

  if (selectedCountries.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>FTA & Schemes</h2>
        </div>
        <div style={emptyStyle}>
          <p>Select destination markets to see applicable trade agreements</p>
        </div>
      </div>
    )
  }

  // Build agreement map by country code for quick lookup
  const agreementMap: Record<string, FTAAgreement> = {}
  for (const a of agreements) {
    agreementMap[a.country_code] = a
  }

  const totalSavings = savingsResults.reduce((s, d) => s + d.savings, 0)

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>FTA & Export Schemes</h2>
        <p style={{ color: colors.textMuted, fontSize: '0.875rem', margin: 0 }}>
          Trade agreements and Indian government export benefits
        </p>
      </div>

      {/* FTA Savings Calculator */}
      {(savingsResults.length > 0 || savingsLoading) && (
        <div style={{ ...sectionStyle, padding: spacing.lg, backgroundColor: '#E8F5E9', borderRadius: borderRadius.lg, border: `3px solid #4CAF50` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
            <div>
              <h3 style={{ ...sectionTitleStyle, margin: 0, marginBottom: spacing.xs }}>
                💰 FTA Duty Savings Calculator
              </h3>
              <p style={{ fontSize: '0.75rem', color: colors.textMuted, margin: 0 }}>
                Estimated savings from preferential tariffs vs. MFN rates
              </p>
            </div>
            {totalSavings > 0 && !savingsLoading && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.625rem', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Total Savings</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4CAF50', fontFamily: "'JetBrains Mono', monospace" }}>
                  ₹{totalSavings.toLocaleString('en-IN')}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: spacing.md }}>
            <label style={{ fontSize: '0.625rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: spacing.xs }}>
              Shipment Value (₹)
            </label>
            <input
              type="number"
              value={savingsInput}
              onChange={e => setSavingsInput(Number(e.target.value) || 0)}
              style={{
                width: 240, padding: '10px 14px', backgroundColor: colors.white,
                border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, color: colors.text,
                fontSize: '0.875rem', fontFamily: "'JetBrains Mono', monospace", outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs }}>
              {[500000, 1000000, 5000000, 10000000].map(v => (
                <button
                  key={v}
                  onClick={() => setSavingsInput(v)}
                  style={{
                    padding: '4px 10px', borderRadius: borderRadius.sm, fontSize: '0.625rem', fontWeight: 600,
                    border: `1px solid ${savingsInput === v ? '#4CAF50' : colors.border}`,
                    backgroundColor: savingsInput === v ? '#E8F5E9' : 'transparent',
                    color: savingsInput === v ? '#4CAF50' : colors.textMuted,
                    cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  ₹{(v / 100000).toFixed(0)}L
                </button>
              ))}
            </div>
          </div>

          {savingsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.md }}>
              <Spinner />
            </div>
          ) : savingsResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              {savingsResults.map(s => (
                <div key={s.country} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', backgroundColor: colors.white, borderRadius: borderRadius.md,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.125rem' }}>{countries[s.country]?.flag}</span>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{s.agreement || agreementMap[s.country]?.name}</div>
                      <div style={{ fontSize: '0.625rem', color: colors.textMuted }}>
                        MFN {s.mfn_rate}% → Preferential {s.preferential_rate}%
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#4CAF50', fontFamily: "'JetBrains Mono', monospace" }}>
                      ₹{s.savings.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: colors.textMuted }}>saved per shipment</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ marginTop: spacing.sm, fontSize: '0.625rem', color: colors.textMuted, lineHeight: 1.5 }}>
            ℹ️ Rates are indicative. Actual preferential tariffs depend on HS code and Rules of Origin compliance. Ensure Certificate of Origin is filed correctly to claim benefits.
          </div>
        </div>
      )}

      {/* Free Trade Agreements Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Free Trade Agreements</h3>
        <div style={ftaListStyle}>
          {selectedCountries.map(countryCode => {
            const fta = agreementMap[countryCode]
            const country = countries[countryCode]
            if (!fta) return null

            return (
              <div key={countryCode} style={ftaCardStyle}>
                <span style={flagStyle}>{country?.flag}</span>
                <div style={ftaContentStyle}>
                  <div style={ftaNameStyle}>
                    {fta.name}
                    <Badge variant={getStatusVariant(fta.status)} size="sm">
                      {fta.status}
                    </Badge>
                    {fta.preferential_tariff && (
                      <Badge variant="success" size="sm">
                        Preferential Tariff
                      </Badge>
                    )}
                  </div>
                  {fta.effective_date && (
                    <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                      Effective: {fta.effective_date}
                    </div>
                  )}
                  <div style={ftaNotesStyle}>{fta.notes}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Indian Export Schemes Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Indian Export Schemes & Benefits</h3>
        <div style={schemeGridStyle}>
          {schemes.map(scheme => (
            <div key={scheme.name} style={schemeCardStyle}>
              <div style={schemeNameStyle}>
                {scheme.name}
                <Badge variant={scheme.status === 'Active' ? 'success' : 'warning'} size="sm">
                  {scheme.status}
                </Badge>
              </div>
              <div style={schemeDescStyle}>{scheme.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
