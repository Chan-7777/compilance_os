// ============================================================================
// Dashboard View - Main compliance overview
// ============================================================================

import { Card, CardContent } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { RiskGauge } from '@/components/RiskGauge'
import { EmptyState } from '@/components/EmptyState'
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
    fontSize: '1rem',
    margin: 0,
    opacity: 0.85,
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
    color: colors.text,
    opacity: 0.7,
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

      {/* Empty State for First-Time Users */}
      {(selectedCountries.length === 0 || !selectedProduct) && (
        <EmptyState
          icon="🚀"
          title="Welcome to ComplianceOS!"
          description="Let's get started by setting up your compliance profile. Select your target markets and products to see personalized risk analysis, checklists, and FTA opportunities."
          actionLabel="Configure Settings"
          onAction={() => onNavigate('settings')}
        />
      )}

      {/* Show Dashboard Content Only When Configured */}
      {selectedCountries.length > 0 && selectedProduct && (
        <>
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

          {/* Priority Actions */}
          {criticalAlerts.length > 0 && (
            <div style={{ marginBottom: spacing.xl }}>
              <h3 style={sectionTitleStyle}>Priority Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {criticalAlerts.slice(0, 3).map(alert => (
                  <div
                    key={alert.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: spacing.md,
                      backgroundColor: `${colors.risk.high}08`,
                      border: `1px solid ${colors.risk.high}33`,
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => onNavigate('alerts')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onNavigate('alerts') }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{"⚠"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{alert.countryName}: {alert.message}</div>
                      <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                        {alert.date} · Requires immediate action
                      </div>
                    </div>
                    <span style={{ color: colors.textMuted, fontSize: '0.75rem' }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Alerts */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Recent Alerts</h3>
              {alerts.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => onNavigate('alerts')}>
                  View All →
                </Button>
              )}
            </div>
            <div style={alertListStyle}>
              {alerts.slice(0, 5).map(alert => (
                <div
                  key={alert.id}
                  style={{ ...alertItemStyle, cursor: 'pointer' }}
                  onClick={() => onNavigate('alerts')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onNavigate('alerts') }}
                >
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
        </>
      )}
    </div>
  )
}
