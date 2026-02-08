// ============================================================================
// Risk Analysis View - Per-country risk breakdown
// ============================================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { RiskGauge } from '@/components/RiskGauge'
import { colors, spacing } from '@theme/index'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { PRODUCT_CATEGORIES } from '@/data/products'
import type { RiskResult, RiskFactor, CountryCode } from '@/types'

export interface RiskAnalysisProps {
  selectedProduct: string
  riskResults: Array<RiskResult & { country: CountryCode }>
}

export function RiskAnalysis({ selectedProduct, riskResults }: RiskAnalysisProps) {
  const productLabel =
    PRODUCT_CATEGORIES.find(p => p.id === selectedProduct)?.label || selectedProduct

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

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Risk Analysis</h2>
        <p style={subtitleStyle}>
          {productLabel} · {riskResults.length} market{riskResults.length !== 1 ? 's' : ''}
        </p>
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
                  {result.factors.map((factor, idx) => (
                    <div key={idx} style={factorItemStyle}>
                      <Badge variant={getSeverityVariant(factor.severity)} size="sm">
                        {factor.severity}
                      </Badge>
                      <div style={factorDetailStyle}>
                        <strong>{factor.category}:</strong> {factor.detail}
                      </div>
                    </div>
                  ))}
                </div>

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
