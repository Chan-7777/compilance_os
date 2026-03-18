// ============================================================================
// Dashboard View - v2 (plain language, phase-conditional widgets, ROI first)
// ============================================================================

import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { J } from '@/components/JargonTip'
import { colors, spacing, borderRadius } from '@theme/index'
import { PRODUCT_CATEGORIES } from '@/data/products'
import type { RiskResult, Alert, CompanyProfile, ViewType, CountryCode } from '@/types'

export interface DashboardProps {
  companyProfile: CompanyProfile
  selectedProduct: string
  selectedCountries: readonly CountryCode[] | CountryCode[]
  riskResults: RiskResult[]
  alerts: Alert[]
  onNavigate: (view: ViewType) => void
  shipments?: { gateStatus?: string }[]
}

const CBAM_PRODUCTS = ['steel', 'chemicals', 'aluminium', 'cement', 'fertilizer', 'electricity']

export function Dashboard({ companyProfile, selectedProduct, selectedCountries, riskResults, alerts, onNavigate, shipments = [] }: DashboardProps) {
  const overallRisk = riskResults.length > 0 ? {
    score: Math.round(riskResults.reduce((s, r) => s + r.score, 0) / riskResults.length),
    level: (() => {
      const avg = riskResults.reduce((s, r) => s + r.score, 0) / riskResults.length
      return avg >= 60 ? 'high' : avg >= 30 ? 'medium' : 'low'
    })() as 'high' | 'medium' | 'low',
  } : null

  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  const productId = PRODUCT_CATEGORIES.find(p => p.label === selectedProduct)?.id || selectedProduct
  const showCBAM = selectedCountries.includes('EU') && CBAM_PRODUCTS.includes(productId)
  const activeFTACount = selectedCountries.filter(c => ['UAE', 'Japan', 'Australia'].includes(c)).length
  const processedShipments = shipments.filter(s => s.gateStatus === 'approved' || s.gateStatus === 'blocked').length
  const timeSavedLabel = processedShipments > 0 ? `${processedShipments * 4} hrs` : '~4 hrs'
  const timeSavedSublabel = processedShipments > 0
    ? `Saved across ${processedShipments} processed shipment${processedShipments > 1 ? 's' : ''}`
    : 'Avg. time saved per shipment on documentation'

  const bigNum: React.CSSProperties = {
    fontSize: '2.25rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1,
  }

  const sectionTitle: React.CSSProperties = {
    fontSize: '0.9rem', fontWeight: 600, color: colors.text, marginBottom: spacing.md,
  }

  return (
    <div style={{ padding: spacing.lg }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, marginBottom: spacing.xs, color: colors.text }}>
          Your Compliance Dashboard
        </h2>
        <p style={{ color: colors.textMuted, fontSize: '0.875rem', margin: 0 }}>
          {companyProfile.name || 'Your company'} · {selectedProduct} · {selectedCountries.length} market{selectedCountries.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Data source bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' as const,
        padding: `${spacing.xs} ${spacing.md}`, backgroundColor: colors.surface,
        borderRadius: borderRadius.md, border: `1px solid ${colors.border}`,
        marginBottom: spacing.lg, fontSize: '0.72rem', color: colors.textMuted,
      }} data-testid="data-provenance-bar">
        <span style={{ fontWeight: 600, color: colors.text }}>Regulatory sources:</span>
        <span>World Customs Org</span><span>·</span>
        <span>India DGFT</span><span>·</span>
        <span>EU Commission</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#D97706', fontWeight: 500 }}>
          ⚠ Reference data — verify critical deadlines with official sources
        </span>
      </div>

      {/* Empty state */}
      {(selectedCountries.length === 0 || !selectedProduct) && (
        <EmptyState
          icon="🚀"
          title="Welcome to ComplianceOS!"
          description="Let's get started by setting up your compliance profile. Select your target markets and products to see personalised risk analysis, checklists, and trade deal savings."
          actionLabel="Set up my profile"
          onAction={() => onNavigate('settings')}
        />
      )}

      {selectedCountries.length > 0 && selectedProduct && (
        <>
          {/* ROI card — always first, most business-relevant */}
          <div style={{
            padding: spacing.lg, backgroundColor: '#F0FDF4',
            borderRadius: borderRadius.lg, border: '2px solid #86EFAC',
            marginBottom: spacing.lg,
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#15803D', marginBottom: spacing.md }}>
              Your compliance saves you money
            </div>
            <div style={{ display: 'flex', gap: spacing.xl, flexWrap: 'wrap' as const }}>
              {activeFTACount > 0 && (
                <div>
                  <div style={{ ...bigNum, color: '#15803D' }}>
                    {activeFTACount} active
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#16A34A', marginTop: 2 }}>
                    <J term="FTA">Trade deals</J> available for your markets — use the Trade Deals tab to calculate exact savings
                  </div>
                </div>
              )}
              <div>
                <div style={{ ...bigNum, color: colors.text }}>{timeSavedLabel}</div>
                <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: 2 }}>
                  {timeSavedSublabel}
                </div>
              </div>
              <div>
                <div style={{ ...bigNum, color: '#D97706' }}>
                  {overallRisk ? overallRisk.level.toUpperCase() : '—'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#D97706', marginTop: 2 }}>
                  Overall compliance risk level
                </div>
              </div>
            </div>
          </div>

          {/* Problem Cockpit */}
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: spacing.md, marginBottom: spacing.xl }}>
            {/* 🚨 Shipment At Risk */}
            <div style={{
              flex: '1 1 280px', padding: spacing.lg,
              backgroundColor: '#FFF5F5', borderRadius: borderRadius.lg,
              border: '1px solid #FED7D7', borderLeft: '4px solid #E53E3E',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#C53030', marginBottom: spacing.xs }}>
                🚨 Shipment At Risk
              </div>
              <div style={{
                ...bigNum,
                color: overallRisk?.level === 'high' ? '#C53030' : overallRisk?.level === 'medium' ? '#D97706' : overallRisk?.level === 'low' ? '#276749' : colors.textMuted,
              }}>
                {overallRisk?.level.toUpperCase() || '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md }}>
                Compliance gaps detected
              </div>
              <button onClick={() => onNavigate('risk')} style={{
                padding: `${spacing.xs} ${spacing.sm}`, fontSize: '0.8rem', fontWeight: 600,
                color: '#C53030', backgroundColor: '#FED7D7',
                border: '1px solid #FCA5A5', borderRadius: borderRadius.md, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                View risk breakdown →
              </button>
            </div>

            {/* 📋 Buyer Docs Needed */}
            <div style={{
              flex: '1 1 280px', padding: spacing.lg,
              backgroundColor: '#FFFBEB', borderRadius: borderRadius.lg,
              border: '1px solid #FDE68A', borderLeft: '4px solid #D97706',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#92400E', marginBottom: spacing.xs }}>
                📋 Buyer Docs Needed
              </div>
              <div style={{ ...bigNum, color: '#92400E' }}>
                Open checklist
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md }}>
                Generate your export document pack
              </div>
              <button onClick={() => onNavigate('checklist')} style={{
                padding: `${spacing.xs} ${spacing.sm}`, fontSize: '0.8rem', fontWeight: 600,
                color: '#92400E', backgroundColor: '#FDE68A',
                border: '1px solid #F6D860', borderRadius: borderRadius.md, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Open checklist →
              </button>
            </div>

            {/* 📉 Margin Under Pressure */}
            <div style={{
              flex: '1 1 280px', padding: spacing.lg,
              backgroundColor: '#F0FDF4', borderRadius: borderRadius.lg,
              border: '1px solid #BBF7D0', borderLeft: '4px solid #16A34A',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#166534', marginBottom: spacing.xs }}>
                📉 Margin Under Pressure
              </div>
              <div style={{ ...bigNum, color: '#166534', fontSize: '1.5rem' }}>
                {activeFTACount > 0
                  ? `${activeFTACount} FTA${activeFTACount > 1 ? 's' : ''} available`
                  : 'Calculate savings'}
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md }}>
                {activeFTACount > 0
                  ? 'Trade deals you can use right now'
                  : 'Check if FTA applies to your product'}
              </div>
              <button onClick={() => onNavigate('fta')} style={{
                padding: `${spacing.xs} ${spacing.sm}`, fontSize: '0.8rem', fontWeight: 600,
                color: '#166534', backgroundColor: '#BBF7D0',
                border: '1px solid #86EFAC', borderRadius: borderRadius.md, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                See savings →
              </button>
            </div>

            {/* 💰 Finance This Shipment */}
            <div style={{
              flex: '1 1 280px', padding: spacing.lg,
              backgroundColor: '#EFF6FF', borderRadius: borderRadius.lg,
              border: '1px solid #BFDBFE', borderLeft: '4px solid #2563EB',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#1E40AF', marginBottom: spacing.xs }}>
                💰 Finance This Shipment
              </div>
              <div style={{ ...bigNum, color: '#1E40AF' }}>
                {`${shipments.length} shipment${shipments.length !== 1 ? 's' : ''}`}
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md }}>
                Track finance &amp; execution status
              </div>
              <button onClick={() => onNavigate('shipments')} style={{
                padding: `${spacing.xs} ${spacing.sm}`, fontSize: '0.8rem', fontWeight: 600,
                color: '#1E40AF', backgroundColor: '#BFDBFE',
                border: '1px solid #93C5FD', borderRadius: borderRadius.md, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Open shipments →
              </button>
            </div>
          </div>

          {/* Carbon compliance widget — only for EU + carbon-heavy products */}
          {showCBAM && (
            <div style={{
              padding: spacing.lg, backgroundColor: '#FEF2F2',
              borderRadius: borderRadius.lg, border: '2px solid #FCA5A5',
              marginBottom: spacing.lg,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.risk.high, marginBottom: spacing.xs }}>
                    Action required — Carbon compliance for EU exports
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
                    The EU now charges a carbon tax on imports of your product type.
                  </div>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted, lineHeight: 1.5, marginBottom: spacing.sm }}>
                    To export to the EU, you need carbon emission data from your raw material suppliers.
                    Most Indian suppliers do not yet provide this — setting it up now avoids delays at EU customs.
                    {' '}<J term="CBAM">What is this tax called?</J>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                    <div style={{ flex: 1, height: 8, backgroundColor: colors.border, borderRadius: borderRadius.full, overflow: 'hidden' }}>
                      <div style={{ width: '15%', height: '100%', backgroundColor: colors.risk.high, borderRadius: borderRadius.full }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: colors.risk.high }}>15% ready</span>
                  </div>
                  <button onClick={() => onNavigate('settings')} style={{
                    padding: `${spacing.xs} ${spacing.md}`, fontSize: '0.8rem', fontWeight: 600,
                    color: colors.risk.high, backgroundColor: '#FEE2E2',
                    border: `1px solid #FCA5A5`, borderRadius: borderRadius.md, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Set up supplier data collection →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xl, flexWrap: 'wrap' as const }}>
            <Button variant="primary" onClick={() => onNavigate('risk')}>View risk breakdown</Button>
            <Button variant="secondary" onClick={() => onNavigate('checklist')}>My compliance checklist</Button>
            <Button variant="secondary" onClick={() => onNavigate('alerts')}>Regulatory updates</Button>
            <Button variant="secondary" onClick={() => onNavigate('fta')}>Trade deal savings</Button>
          </div>

          {/* Priority actions */}
          {criticalAlerts.length > 0 && (
            <div style={{ marginBottom: spacing.xl }}>
              <h3 style={sectionTitle}>Act now — these affect your next shipment</h3>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing.sm }}>
                {criticalAlerts.slice(0, 3).map(alert => (
                  <div key={alert.id}
                    style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: borderRadius.md, cursor: 'pointer' }}
                    onClick={() => onNavigate('alerts')} role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onNavigate('alerts') }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.risk.high} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: colors.text }}>{alert.countryName}: {alert.message}</div>
                      <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{alert.date} · Action required immediately</div>
                    </div>
                    <span style={{ color: colors.textMuted, fontSize: '0.75rem' }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent updates */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Recent regulatory updates</h3>
              {alerts.length > 0 && <Button variant="ghost" size="sm" onClick={() => onNavigate('alerts')}>View all →</Button>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing.sm }}>
              {alerts.slice(0, 5).map(alert => (
                <div key={alert.id}
                  style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.surface, borderRadius: borderRadius.md, fontSize: '0.875rem', cursor: 'pointer' }}
                  onClick={() => onNavigate('alerts')} role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onNavigate('alerts') }}
                >
                  <span>{alert.flag}</span>
                  <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'} size="sm">
                    {alert.severity === 'critical' ? 'Urgent' : alert.severity === 'warning' ? 'Review soon' : 'Info'}
                  </Badge>
                  <span style={{ flex: 1 }}>{alert.message}</span>
                  <span style={{ color: colors.textMuted, fontSize: '0.75rem' }}>{alert.date}</span>
                </div>
              ))}
              {alerts.length === 0 && <div style={{ color: colors.textMuted, padding: spacing.md, fontSize: '0.875rem' }}>No updates at this time</div>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
