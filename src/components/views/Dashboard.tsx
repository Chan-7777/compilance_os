// ============================================================================
// Dashboard View - Main compliance overview
// ============================================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { RiskGauge } from '@/components/RiskGauge'
import { colors, spacing } from '@theme/index'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { PRODUCT_CATEGORIES } from '@/data/products'
import type { RiskResult, Alert, CompanyProfile, ViewType, CountryCode } from '@/types'

export interface DashboardProps {
  companyProfile: CompanyProfile
  selectedProduct: string
  selectedCountries: readonly CountryCode[] | CountryCode[]
  riskResults: RiskResult[]
  alerts: Alert[]
  onNavigate: (view: ViewType) => void
}

export function Dashboard({
  companyProfile,
  selectedProduct,
  selectedCountries,
  riskResults,
  alerts,
  onNavigate,
}: DashboardProps) {
  // Calculate overall risk
  const overallRisk =
    riskResults.length > 0
      ? {
          score: Math.round(riskResults.reduce((s, r) => s + r.score, 0) / riskResults.length),
          level: (() => {
            const avg = riskResults.reduce((s, r) => s + r.score, 0) / riskResults.length
            return avg >= 60 ? 'high' : avg >= 30 ? 'medium' : 'low'
          })() as 'high' | 'medium' | 'low',
        }
      : null

  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  const productLabel =
    PRODUCT_CATEGORIES.find(p => p.id === selectedProduct)?.label || selectedProduct

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
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: spacing.md,
    marginBottom: spacing.xl,
  }

  const cardLabelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  }

  const largeNumberStyle: React.CSSProperties = {
    fontSize: '2.5rem',
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
  }

  const quickActionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: spacing.md,
    color: colors.text,
  }

  const alertListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  }

  const alertItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Compliance Dashboard</h2>
        <p style={subtitleStyle}>
          {companyProfile.name || 'Your company'} · {productLabel} ·{' '}
          {selectedCountries.length} market{selectedCountries.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={gridStyle}>
        {/* Overall Risk */}
        <Card>
          <CardContent>
            <div style={cardLabelStyle}>Overall Risk</div>
            {overallRisk ? (
              <RiskGauge score={overallRisk.score} level={overallRisk.level} size="sm" />
            ) : (
              <div style={{ color: colors.textMuted }}>No risk data</div>
            )}
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card>
          <CardContent>
            <div style={cardLabelStyle}>Critical Alerts</div>
            <div
              data-testid="critical-count"
              style={{
                ...largeNumberStyle,
                color: criticalAlerts.length > 0 ? colors.risk.high : colors.risk.low,
              }}
            >
              {criticalAlerts.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
              {alerts.length} total alerts
            </div>
          </CardContent>
        </Card>

        {/* Markets */}
        <Card>
          <CardContent>
            <div style={cardLabelStyle}>Markets</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
              {selectedCountries.map(c => (
                <Badge key={c} variant="info">
                  {REGULATORY_DB[c]?.flag} {c}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active FTAs */}
        <Card>
          <CardContent>
            <div style={cardLabelStyle}>Active FTAs</div>
            <div style={largeNumberStyle}>
              {selectedCountries.filter(c => ['UAE', 'Japan', 'Australia'].includes(c)).length}
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
              of {selectedCountries.length} markets
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div style={quickActionsStyle}>
        <Button variant="primary" onClick={() => onNavigate('risk')}>
          Risk Analysis
        </Button>
        <Button variant="secondary" onClick={() => onNavigate('checklist')}>
          View Checklist
        </Button>
        <Button variant="secondary" onClick={() => onNavigate('alerts')}>
          View Alerts
        </Button>
      </div>

      {/* Recent Alerts */}
      <div>
        <h3 style={sectionTitleStyle}>Recent Alerts</h3>
        <div style={alertListStyle}>
          {alerts.slice(0, 5).map(alert => (
            <div key={alert.id} style={alertItemStyle}>
              <span>{alert.flag}</span>
              <Badge
                variant={
                  alert.severity === 'critical'
                    ? 'danger'
                    : alert.severity === 'warning'
                      ? 'warning'
                      : 'info'
                }
                size="sm"
              >
                {alert.severity}
              </Badge>
              <span style={{ flex: 1 }}>{alert.message}</span>
              <span style={{ color: colors.textMuted, fontSize: '0.75rem' }}>{alert.date}</span>
            </div>
          ))}
          {alerts.length === 0 && (
            <div style={{ color: colors.textMuted, padding: spacing.md }}>
              No alerts at this time
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
