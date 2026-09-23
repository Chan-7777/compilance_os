// ============================================================================
// Risk Analysis View - Per-country risk breakdown
// ============================================================================

import { useState } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { Card, CardContent } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { RiskGauge } from '@/components/RiskGauge'
import { RiskScoreLegend } from '@/components/RiskScoreLegend'
import { CBAMReadiness } from './CBAMReadiness'
import { colors, spacing, borderRadius } from '@theme/index'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { PRODUCT_CATEGORIES } from '@/data/products'
import { estimateEmissions } from '@/lib/api'
import type { RiskResult, RiskFactor, CountryCode, CompanyProfile } from '@/types'

export interface RiskAnalysisProps {
  selectedProduct: string
  /** The company HS code on file. Falls back to the product default. */
  hsCode?: string | null
  riskResults: Array<RiskResult & { country: CountryCode }>
  companyProfile?: CompanyProfile
}

export function RiskAnalysis({ selectedProduct, riskResults, companyProfile, hsCode = null }: RiskAnalysisProps) {
  const isMobile = useMobile()
  const [emissions, setEmissions] = useState<null | { error?: string; formatted?: string; source?: string; year?: number | null; region?: string | null; activity_id?: string; factor_kind?: 'cbam_default' | 'generic'; factor_name?: string | null; cn_code?: string | null }>(null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [emissionsWeight, setEmissionsWeight] = useState('1000')

  const productLabel =
    PRODUCT_CATEGORIES.find(p => p.id === selectedProduct)?.label || selectedProduct
  // Views are handed the product label, not its id, so map back before any
  // lookup keyed by id.
  const productId =
    PRODUCT_CATEGORIES.find(p => p.label === selectedProduct)?.id ?? selectedProduct

  // Map product category to a representative HS code for emissions estimation
  const PRODUCT_HS_MAP: Record<string, string> = {
    steel: '7208.51',
    textiles: '5208.11',
    chemicals: '2901.10',
    electronics: '8471.30',
    pharma: '3004.90',
    automotive: '8703.23',
    machinery: '8428.90',
    food: '1001.99',
    general: '9999.99',
  }

  const handleEstimateEmissions = async () => {
    const weight = parseFloat(emissionsWeight)
    if (!weight || weight <= 0) return
    setIsEstimating(true)
    try {
      const effectiveHs = hsCode ?? PRODUCT_HS_MAP[productId] ?? '9999.99'
      setEmissions(await estimateEmissions(weight, effectiveHs, 'IN', productId, 'EU'))
    } catch (err: any) {
      console.error('Failed to estimate emissions:', err)
      setEmissions({ error: err?.message ?? 'Estimation failed' })
    } finally {
      setIsEstimating(false)
    }
  }

  // Sort by risk score descending
  const sortedResults = [...riskResults].sort((a, b) => b.score - a.score)
  const showCbamSection = sortedResults.some(r => REGULATORY_DB[r.country]?.cbam?.active)

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

  const subtitleStyle: React.CSSProperties = {
    color: colors.textMuted,
    fontSize: '0.875rem',
    margin: 0,
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
    gap: spacing.lg,
  }

  const countryHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  }

  const countryNameStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  }

  const flagStyle: React.CSSProperties = {
    fontSize: '1.5rem',
  }

  const factorListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.md,
  }

  const factorItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
  }

  const factorDetailStyle: React.CSSProperties = {
    flex: 1,
    color: colors.text,
  }

  const recommendationsStyle: React.CSSProperties = {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTop: `1px solid ${colors.border}`,
  }

  const recommendationsTitleStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: 600,
    marginBottom: spacing.sm,
    color: colors.text,
  }

  const recommendationItemStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: colors.textMuted,
    padding: `${spacing.xs} 0`,
    paddingLeft: spacing.md,
    position: 'relative',
  }

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: spacing['2xl'],
    color: colors.textMuted,
  }

  const getSeverityVariant = (severity: RiskFactor['severity']) => {
    switch (severity) {
      case 'high':
        return 'risk-high' as const
      case 'medium':
        return 'warning' as const
      case 'low':
        return 'risk-low' as const
      case 'positive':
        return 'success' as const
      default:
        return 'info' as const
    }
  }

  if (riskResults.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Risk Analysis</h2>
          <p style={subtitleStyle}>{productLabel}</p>
        </div>
        <div style={emptyStyle}>
          <p>No markets selected</p>
          <p>Select destination markets to see risk analysis</p>
        </div>
      </div>
    )
  }

  // Map factor categories to regulatory source references
  const getSourceReference = (category: string): string | null => {
    const cat = category.toLowerCase()
    if (cat.includes('cbam')) return 'EU Regulation 2023/956 (CBAM)'
    if (cat.includes('esg') || cat.includes('scope')) return 'EU CSRD 2022/2464 & SEC Climate Rules'
    if (cat.includes('uflpa') || cat.includes('forced labor')) return 'UFLPA § 307, 19 U.S.C. § 1307'
    if (cat.includes('eudr') || cat.includes('deforestation')) return 'EU Regulation 2023/1115 (EUDR)'
    if (cat.includes('fta') || cat.includes('trade agreement')) return 'DGFT Foreign Trade Policy 2023'
    if (cat.includes('certification')) return 'WCO HS Convention & DGFT'
    if (cat.includes('msme') || cat.includes('capacity')) return 'MSME Development Act 2006'
    return null
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Risk Analysis</h2>
        <p style={subtitleStyle}>
          {productLabel} · {riskResults.length} market{riskResults.length !== 1 ? 's' : ''}
        </p>
      </div>

      <RiskScoreLegend />

      {/* Methodology note */}
      <div style={{
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: '0.5rem',
        border: `1px solid ${colors.border}`,
        marginBottom: spacing.lg,
        fontSize: '0.8rem',
        color: colors.textMuted,
        lineHeight: 1.6,
      }}>
        <strong style={{ color: colors.text, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent, flexShrink: 0 }}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          How is this score calculated?
        </strong>
        <span style={{ marginLeft: spacing.sm }}>
          Scores are computed using a multi-factor model covering CBAM exposure, ESG Scope 3 requirements,
          certification complexity, FTA preferential access, and MSME capacity constraints.
          All regulatory data is sourced from the World Customs Organization (WCO), DGFT India, and
          EU Commission official databases.
        </span>
      </div>

      <div style={gridStyle}>
        {sortedResults.map(result => {
          const country = REGULATORY_DB[result.country]
          return (
            <Card key={result.country} variant="outlined">
              <CardContent>
                <div style={countryHeaderStyle}>
                  <div style={countryNameStyle}>
                    <span style={flagStyle}>{country?.flag}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{country?.name}</div>
                      <Badge variant={`risk-${result.level}` as const} size="sm">
                        {result.level} risk
                      </Badge>
                    </div>
                  </div>
                  <div data-testid="risk-score">
                    <RiskGauge score={result.score} level={result.level} size="sm" />
                  </div>
                </div>

                {/* Risk Factors */}
                <div style={factorListStyle}>
                  {result.factors.map((factor, idx) => {
                    const source = getSourceReference(factor.category)
                    return (
                      <div key={idx} style={factorItemStyle}>
                        <Badge variant={getSeverityVariant(factor.severity)} size="sm">
                          {factor.severity}
                        </Badge>
                        <div style={factorDetailStyle}>
                          <strong>{factor.category}:</strong> {factor.detail}
                          {source && (
                            <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: '2px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.textMuted, flexShrink: 0 }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5L4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z"/></svg>
                              <span>{source}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* CBAM is shown once, below the market cards; each card only notes it. */}
                {country?.cbam?.active && (
                  <div style={{
                    marginTop: spacing.md,
                    padding: `${spacing.sm} ${spacing.md}`,
                    backgroundColor: colors.accentSurface,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.accent}44`,
                    fontSize: '0.8125rem',
                    color: colors.text,
                    lineHeight: 1.5,
                  }}>
                    <strong>CBAM:</strong> {country.cbam.phase}
                    {result.country === 'EU' && (
                      <span style={{ color: colors.textMuted }}> See the CBAM section below for declarations and emissions.</span>
                    )}
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div style={recommendationsStyle}>
                    <div style={recommendationsTitleStyle}>Recommendations</div>
                    {result.recommendations.map((rec, idx) => (
                      <div key={idx} style={recommendationItemStyle}>
                        • {rec}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {showCbamSection && (
        <section style={{ marginTop: spacing.xl }} aria-labelledby="cbam-heading">
          <h2 id="cbam-heading" style={{ ...titleStyle, fontSize: '1.375rem' }}>CBAM</h2>
          <p style={subtitleStyle}>
            Carbon border rules for your {productLabel.toLowerCase()} exports. The EU charges from 2026, and the UK from January 2027.
          </p>

          <CBAMReadiness product={productLabel} companyProfile={companyProfile}>
            <div style={{
              marginTop: spacing.xl,
              padding: spacing.xl,
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: colors.text }}>Embedded emissions estimate</h3>
              <p style={{ margin: `${spacing.xs} 0 ${spacing.md} 0`, color: colors.textMuted, fontSize: '0.875rem' }}>
                Estimated carbon embedded in one shipment, from generic Climatiq emission factors — not measured at your facility or your suppliers'. Declarations fall back to EU default values when no estimate is available. Replace both with actual supplier data before filing.
              </p>
              <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                <label htmlFor="cbam-weight" style={{ fontSize: '0.8125rem', color: colors.textMuted }}>Shipment weight</label>
                <input
                  id="cbam-weight"
                  type="number"
                  min="1"
                  value={emissionsWeight}
                  onChange={e => setEmissionsWeight(e.target.value)}
                  style={{
                    width: 120,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: '0.875rem',
                    backgroundColor: colors.white,
                  }}
                />
                <span style={{ fontSize: '0.8125rem', color: colors.textMuted }}>kg</span>
                <Button variant="primary" size="sm" onClick={handleEstimateEmissions} disabled={isEstimating}>
                  {isEstimating ? 'Calculating…' : 'Estimate emissions'}
                </Button>
              </div>

              {emissions?.error && (
                <div role="alert" style={{
                  marginTop: spacing.md,
                  padding: spacing.sm,
                  backgroundColor: colors.surfaces.warningBg,
                  color: colors.surfaces.warningText,
                  borderRadius: borderRadius.md,
                  fontSize: '0.8125rem',
                }}>
                  Estimate unavailable: {emissions.error}. CBAM declarations will use EU default values instead.
                </div>
              )}

              {emissions && !emissions.error && (
                <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.md }}>
                  <div style={{ padding: spacing.sm, backgroundColor: colors.white, borderRadius: borderRadius.md, border: `1px solid ${colors.border}`, minWidth: 180 }}>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, color: colors.textMuted, fontWeight: 600 }}>Estimated emissions</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: colors.text }}>{emissions.formatted}</div>
                  </div>
                  <div style={{ padding: spacing.sm, backgroundColor: colors.white, borderRadius: borderRadius.md, border: `1px solid ${colors.border}`, minWidth: 180 }}>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, color: colors.textMuted, fontWeight: 600 }}>Emission factor</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.text }}>
                      {emissions.factor_kind === 'cbam_default'
                        ? `EU CBAM default · ${emissions.region ?? 'IN'} · ${emissions.year ?? ''}`
                        : `Generic factor · ${emissions.source ?? 'Climatiq'}${emissions.year ? ` · ${emissions.year}` : ''}`}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: 2, maxWidth: 320 }}>
                      {emissions.factor_name ?? emissions.activity_id}{emissions.cn_code ? ` (CN ${emissions.cn_code})` : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CBAMReadiness>
        </section>
      )}
    </div>
  )
}

