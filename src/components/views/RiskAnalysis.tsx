// ============================================================================
// Risk Analysis View - Per-country risk breakdown
// ============================================================================

import { useState } from 'react'
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
import type { RiskResult, RiskFactor, CountryCode } from '@/types'

export interface RiskAnalysisProps {
  selectedProduct: string
  riskResults: Array<RiskResult & { country: CountryCode }>
}

export function RiskAnalysis({ selectedProduct, riskResults }: RiskAnalysisProps) {
  const [emissionsData, setEmissionsData] = useState<Record<string, any>>({})
  const [isEstimating, setIsEstimating] = useState<Record<string, boolean>>({})
  const [emissionsWeight, setEmissionsWeight] = useState<Record<string, string>>({})

  const productLabel =
    PRODUCT_CATEGORIES.find(p => p.id === selectedProduct)?.label || selectedProduct

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

  const handleEstimateEmissions = async (countryCode: string, weight: number) => {
    setIsEstimating(prev => ({ ...prev, [countryCode]: true }))
    try {
      const hsCode = PRODUCT_HS_MAP[selectedProduct] ?? '9999.99'
      const result = await estimateEmissions(weight, hsCode, 'IN', selectedProduct, countryCode)
      setEmissionsData(prev => ({ ...prev, [countryCode]: result }))
    } catch (err: any) {
      console.error('Failed to estimate emissions:', err)
      setEmissionsData(prev => ({ ...prev, [countryCode]: { error: err?.message ?? 'Estimation failed' } }))
    } finally {
      setIsEstimating(prev => ({ ...prev, [countryCode]: false }))
    }
  }

  // Sort by risk score descending
  const sortedResults = [...riskResults].sort((a, b) => b.score - a.score)

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
    gridTemplateColumns: 'repeat(2, 1fr)',
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
        <strong style={{ color: colors.text }}>📊 How is this score calculated?</strong>
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
                            <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: '2px', fontStyle: 'italic' }}>
                              📖 {source}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* CBAM Emissions Panel */}
                {country?.cbam?.active && (
                  <div style={{
                    marginTop: spacing.md,
                    padding: spacing.md,
                    backgroundColor: '#eff6ff', // blue-50
                    borderRadius: borderRadius.md,
                    border: '1px solid #bfdbfe' // blue-200
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: emissionsData[result.country] ? spacing.sm : 0 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e3a8a' }}>🌍 CBAM CO₂e Scope 3 Estimate</div>
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Powered by Climatiq API</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.sm }}>
                      <input
                        type="number"
                        value={emissionsWeight[result.country] ?? ''}
                        onChange={e => setEmissionsWeight(prev => ({ ...prev, [result.country]: e.target.value }))}
                        placeholder="Weight (kg)"
                        min="1"
                        style={{
                          width: 130,
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: borderRadius.md,
                          border: `1px solid ${colors.border}`,
                          fontSize: '0.875rem',
                          backgroundColor: colors.white,
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>kg per shipment</span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEstimateEmissions(result.country, parseFloat(emissionsWeight[result.country] || '1000'))}
                        disabled={isEstimating[result.country]}
                      >
                        {isEstimating[result.country] ? 'Calculating...' : 'Estimate Emissions'}
                      </Button>
                    </div>

                    {emissionsData[result.country] && (
                      emissionsData[result.country].error ? (
                        <div style={{ marginTop: spacing.sm, padding: spacing.sm, backgroundColor: '#fef2f2', borderRadius: borderRadius.sm, fontSize: '0.8rem', color: '#991b1b' }}>
                          ⚠️ {emissionsData[result.country].error}
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.sm, marginTop: spacing.md }}>
                          <div style={{ padding: spacing.sm, backgroundColor: '#ffffff', borderRadius: borderRadius.sm }}>
                            <div style={{ fontSize: '0.75rem', color: colors.textMuted, textTransform: 'uppercase' }}>Est. Emissions (Per Tonne)</div>
                            <div style={{ fontWeight: 700, fontSize: '1.25rem', fontFamily: "'JetBrains Mono', monospace", color: '#166534' }}>
                              {emissionsData[result.country].formatted}
                            </div>
                          </div>
                          <div style={{ padding: spacing.sm, backgroundColor: '#ffffff', borderRadius: borderRadius.sm }}>
                            <div style={{ fontSize: '0.75rem', color: colors.textMuted, textTransform: 'uppercase' }}>Data Source</div>
                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                              {emissionsData[result.country].source} ({emissionsData[result.country].year})
                            </div>
                            <div style={{ fontSize: '0.65rem', color: colors.textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {emissionsData[result.country].activity_id}
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    <CBAMReadiness product={productLabel} />
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
    </div>
  )
}

