import { useState } from 'react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { colors, spacing, borderRadius } from '@theme/index'
import { FTA_DATABASE } from '@/data/fta'
import { INDIAN_EXPORT_SCHEMES } from '@/data/indian-schemes'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { FTA_COMPLIANCE_DETAILS } from '@/data/fta_compliance_details'
import type { CountryCode, ProductCode } from '@/types'

// Build tariff rates from real scraped data (FTA_COMPLIANCE_DETAILS)
// Maps product category → { mfn, preferential } using actual CEPA rates
function getRatesForCategory(category: string): { mfn: number; preferential: number } {
  const match = FTA_COMPLIANCE_DETAILS.find(d => d.category === category)
  if (match) {
    return { mfn: match.mfnRate, preferential: match.preferentialRate }
  }
  // Fallback: average across all products
  const avg = FTA_COMPLIANCE_DETAILS.reduce(
    (acc, d) => ({ mfn: acc.mfn + d.mfnRate, pref: acc.pref + d.preferentialRate }),
    { mfn: 0, pref: 0 }
  )
  const len = FTA_COMPLIANCE_DETAILS.length || 1
  return { mfn: Math.round(avg.mfn / len), preferential: Math.round(avg.pref / len) }
}

// FTA TARIFF RATES — built from real scraped data for UAE
// Japan and Australia rates kept as reference (not yet scraped)
type ProductTariffRates = {
  steel: { mfn: number; preferential: number }
  food: { mfn: number; preferential: number }
  textiles: { mfn: number; preferential: number }
  chemicals: { mfn: number; preferential: number }
  electronics: { mfn: number; preferential: number }
  jewelry: { mfn: number; preferential: number }
  general: { mfn: number; preferential: number }
}

const FTA_TARIFF_RATES: Record<string, ProductTariffRates> = {
  UAE: {
    steel: getRatesForCategory('steel'),
    food: getRatesForCategory('food'),
    textiles: getRatesForCategory('textiles'),
    chemicals: getRatesForCategory('chemicals'),
    electronics: getRatesForCategory('electronics'),
    jewelry: getRatesForCategory('jewelry'),
    general: { mfn: 5, preferential: 2 },
  },
  Japan: {
    steel: { mfn: 3.3, preferential: 0 },
    food: { mfn: 10, preferential: 5 },
    textiles: { mfn: 8.4, preferential: 0 },
    chemicals: { mfn: 3.1, preferential: 0 },
    electronics: { mfn: 0, preferential: 0 },
    jewelry: { mfn: 5, preferential: 0 },
    general: { mfn: 4, preferential: 1.5 },
  },
  Australia: {
    steel: { mfn: 5, preferential: 0 },
    food: { mfn: 5, preferential: 0 },
    textiles: { mfn: 5, preferential: 0 },
    chemicals: { mfn: 5, preferential: 2.5 },
    electronics: { mfn: 5, preferential: 0 },
    jewelry: { mfn: 5, preferential: 0 },
    general: { mfn: 5, preferential: 2 },
  },
}

export interface FTASchemesProps {
  selectedCountries: CountryCode[]
  selectedProduct?: ProductCode
}

export function FTASchemes({ selectedCountries, selectedProduct }: FTASchemesProps) {
  const [savingsInput, setSavingsInput] = useState(1000000)

  const containerStyle: React.CSSProperties = {
    padding: spacing.lg,
  }

  const headerStyle: React.CSSProperties = {
    marginBottom: spacing.xl,
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: 0,
    marginBottom: spacing.xs,
    color: colors.text,
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: spacing.xl,
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: spacing.md,
    color: colors.text,
  }

  const ftaListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  }

  const ftaCardStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
  }

  const flagStyle: React.CSSProperties = {
    fontSize: '2rem',
  }

  const ftaContentStyle: React.CSSProperties = {
    flex: 1,
  }

  const ftaNameStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: spacing.xs,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  }

  const ftaNotesStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: colors.textMuted,
    marginTop: spacing.xs,
  }

  const schemeGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing.md,
  }

  const schemeCardStyle: React.CSSProperties = {
    padding: spacing.md,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
  }

  const schemeNameStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: spacing.xs,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  }

  const schemeDescStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: colors.textMuted,
  }

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: spacing['2xl'],
    color: colors.textMuted,
  }

  const getStatusVariant = (status: string) => {
    if (status === 'Active') return 'success' as const
    if (status === 'Under Negotiation') return 'warning' as const
    return 'default' as const
  }

  // Calculate FTA savings
  const activeFTAs = selectedCountries.filter(c => FTA_DATABASE[c]?.preferentialTariff)
  const productId = (selectedProduct || 'general') as keyof ProductTariffRates

  const savingsData = activeFTAs.map(c => {
    const rates = FTA_TARIFF_RATES[c]?.[productId] || FTA_TARIFF_RATES[c]?.general
    if (!rates) return { country: c, savings: 0, mfn: 0, pref: 0, mfnDuty: 0, prefDuty: 0 }
    const mfnDuty = savingsInput * (rates.mfn / 100)
    const prefDuty = savingsInput * (rates.preferential / 100)
    return { country: c, savings: mfnDuty - prefDuty, mfn: rates.mfn, pref: rates.preferential, mfnDuty, prefDuty }
  }).filter(s => s.savings > 0)

  const totalSavings = savingsData.reduce((s, d) => s + d.savings, 0)

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

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>FTA & Export Schemes</h2>
        <p style={{ color: colors.textMuted, fontSize: '0.875rem', margin: 0 }}>
          Trade agreements and Indian government export benefits
        </p>
      </div>

      {/* FTA Savings Calculator */}
      {activeFTAs.length > 0 && (
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
            {totalSavings > 0 && (
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

          {savingsData.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              {savingsData.map(s => (
                <div key={s.country} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', backgroundColor: colors.white, borderRadius: borderRadius.md,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.125rem' }}>{REGULATORY_DB[s.country]?.flag}</span>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{FTA_DATABASE[s.country]?.name}</div>
                      <div style={{ fontSize: '0.625rem', color: colors.textMuted }}>
                        MFN {s.mfn}% → Preferential {s.pref}%
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
          )}

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
            const fta = FTA_DATABASE[countryCode]
            const country = REGULATORY_DB[countryCode]
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
                    {fta.preferentialTariff && (
                      <Badge variant="success" size="sm">
                        Preferential Tariff
                      </Badge>
                    )}
                  </div>
                  {fta.effectiveDate && (
                    <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                      Effective: {fta.effectiveDate}
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
          {INDIAN_EXPORT_SCHEMES.map(scheme => (
            <div key={scheme.name} style={schemeCardStyle}>
              <div style={schemeNameStyle}>
                {scheme.name}
                <Badge variant={scheme.status === 'Active' ? 'success' : 'warning'} size="sm">
                  {scheme.status}
                </Badge>
              </div>
              <div style={schemeDescStyle}>{scheme.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
