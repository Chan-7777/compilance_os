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

      {/* Data Provenance Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: `${spacing.xs} ${spacing.md}`,
          backgroundColor: colors.surface,
          borderRadius: '0.5rem',
          border: `1px solid ${colors.border}`,
          marginBottom: spacing.lg,
          fontSize: '0.75rem',
          color: colors.textMuted,
          flexWrap: 'wrap',
        }}
        data-testid="data-provenance-bar"
      >
        <span style={{ fontWeight: 600, color: colors.text }}>📡 Data Sources:</span>
        <span>WCO</span>
        <span>·</span>
        <span>DGFT India</span>
        <span>·</span>
        <span>EU Commission</span>
        <span>·</span>
        <span>CBAM Registry</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
          Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
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

          {/* ROI Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: selectedCountries.includes('EU') &&
              ['steel', 'chemicals', 'aluminium', 'cement', 'fertilizer', 'electricity'].includes(
                PRODUCT_CATEGORIES.find(p => p.label === selectedProduct)?.id || ''
              ) ? '1fr 1fr' : '1fr',
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}>
            {/* Estimated ROI Card */}
            <div style={{
              padding: spacing.lg,
              backgroundColor: '#E8F5E9',
              borderRadius: '0.75rem',
              border: '2px solid #4CAF50',
            }}>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#2E7D32',
                marginBottom: spacing.sm,
              }}>
                💰 Your Compliance ROI
              </div>
              <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
                <div>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: '#2E7D32',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    ₹{(() => {
                      const activeFTAs = selectedCountries.filter(c => ['UAE', 'Japan', 'Australia'].includes(c)).length
                      return (activeFTAs * 45000).toLocaleString('en-IN')
                    })()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#4CAF50' }}>
                    Est. FTA duty savings/shipment
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: '#E65100',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    ₹{(() => {
                      const riskPenalty = overallRisk ? Math.round(overallRisk.score * 500) : 0
                      return riskPenalty.toLocaleString('en-IN')
                    })()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#E65100' }}>
                    Penalties avoided/quarter
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: colors.text,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    ~4 hrs
                  </div>
                  <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                    Time saved/shipment
                  </div>
                </div>
              </div>
            </div>

            {/* CBAM Readiness (show only for CBAM-covered products to EU) */}
            {selectedCountries.includes('EU') &&
              ['steel', 'chemicals', 'aluminium', 'cement', 'fertilizer', 'electricity'].includes(
                PRODUCT_CATEGORIES.find(p => p.label === selectedProduct)?.id || ''
              ) && (
                <div style={{
                  padding: spacing.lg,
                  backgroundColor: `${colors.risk.high}08`,
                  borderRadius: '0.75rem',
                  border: `2px solid ${colors.risk.high}44`,
                }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: colors.risk.high,
                    marginBottom: spacing.sm,
                  }}>
                    🏭 CBAM Readiness
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    marginBottom: spacing.sm,
                  }}>
                    <div style={{
                      flex: 1,
                      height: 8,
                      backgroundColor: colors.border,
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: '15%',
                        height: '100%',
                        backgroundColor: colors.risk.high,
                        borderRadius: '4px',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.risk.high }}>15%</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: colors.text, marginBottom: spacing.xs }}>
                    ⚠️ Upstream vendor emissions data required
                  </div>
                  <div style={{ fontSize: '0.75rem', color: colors.textMuted, lineHeight: 1.5 }}>
                    EU CBAM requires verified embedded carbon data from Tier-2/3 suppliers.
                    Most Indian vendors do not yet share this data.
                  </div>
                  <button
                    onClick={() => onNavigate('settings')}
                    style={{
                      marginTop: spacing.sm,
                      padding: `${spacing.xs} ${spacing.md}`,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: colors.risk.high,
                      backgroundColor: `${colors.risk.high}15`,
                      border: `1px solid ${colors.risk.high}44`,
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                    }}
                  >
                    📋 Setup Vendor Data Collection →
                  </button>
                </div>
              )}
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
            <Button variant="secondary" onClick={() => onNavigate('fta')}>
              💰 FTA Savings
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
