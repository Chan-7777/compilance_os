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
  rodtepEstimate?: number | null
}

function formatINR(value: number): string {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)} Cr`
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} L`
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

const CBAM_PRODUCTS = ['steel', 'chemicals', 'aluminium', 'cement', 'fertilizer', 'electricity']

export function Dashboard({ companyProfile, selectedProduct, selectedCountries, riskResults, alerts, onNavigate, shipments = [], rodtepEstimate = null }: DashboardProps) {
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
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: colors.status.pending, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          Reference data — verify critical deadlines with official sources
        </span>
      </div>

      {/* Empty state */}
      {(selectedCountries.length === 0 || !selectedProduct) && (
        <EmptyState
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent }}>
              <path d="M4.5 16.5c-1.5 1.25-2.5 3.5-2.5 3.5s2.25-1 3.5-2.5M12 2C6.5 2 2 6.5 2 12c0 2.5.5 4.5 1.5 6l12.5-12.5C14.5 4.5 12.5 4 12 2zM22 2s-5.5 2-8 4.5L19.5 12C22 9.5 22 2 22 2zM9 15c-1 0-2-1-2-2" />
            </svg>
          }
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
            padding: spacing.lg, backgroundColor: colors.surfaces.successBg,
            borderRadius: borderRadius.lg, border: `2px solid ${colors.status.success}66`,
            marginBottom: spacing.lg,
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.surfaces.successText, marginBottom: spacing.md }}>
              Your compliance saves you money
            </div>
            <div style={{ display: 'flex', gap: spacing.xl, flexWrap: 'wrap' as const }}>
              {activeFTACount > 0 && (
                <div>
                  <div style={{ ...bigNum, color: colors.surfaces.successText }}>
                    {activeFTACount} active
                  </div>
                  <div style={{ fontSize: '0.75rem', color: colors.surfaces.successText, marginTop: 2 }}>
                    <J term="FTA">Trade deals</J> available for your markets — use the Trade Deals tab to calculate exact savings
                  </div>
                </div>
              )}
              <div>
                <div style={{ ...bigNum, color: colors.surfaces.successText }}>
                  {rodtepEstimate != null ? formatINR(rodtepEstimate) : '—'}
                </div>
                <div style={{ fontSize: '0.75rem', color: colors.surfaces.successText, marginTop: 2 }}>
                  Estimated unclaimed RoDTEP entitlement
                </div>
                {rodtepEstimate != null ? (
                  <button onClick={() => onNavigate('fta')} style={{
                    marginTop: 6, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
                    color: colors.surfaces.successText, backgroundColor: 'transparent',
                    border: `1px solid ${colors.status.success}66`, borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Run full recovery audit →
                  </button>
                ) : (
                  <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: 4 }}>
                    Add your HS code in Settings to see estimate
                  </div>
                )}
              </div>
              <div>
                <div style={{ ...bigNum, color: colors.status.pending }}>
                  {overallRisk ? overallRisk.level.toUpperCase() : '—'}
                </div>
                <div style={{ fontSize: '0.75rem', color: colors.status.pending, marginTop: 2 }}>
                  Overall compliance risk level
                </div>
              </div>
            </div>
          </div>

          {/* Problem Cockpit */}
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: spacing.md, marginBottom: spacing.xl }}>
            {/* Shipment At Risk */}
            <div style={{
              flex: '1 1 280px', padding: spacing.lg,
              backgroundColor: colors.surfaces.dangerBg, borderRadius: borderRadius.lg,
              border: `1px solid ${colors.status.error}33`, borderLeft: `4px solid ${colors.status.error}`,
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.surfaces.dangerText, marginBottom: spacing.xs }}>
                Shipment At Risk
              </div>
              <div style={{
                ...bigNum,
                color: overallRisk?.level === 'high' ? colors.risk.high : overallRisk?.level === 'medium' ? colors.risk.medium : overallRisk?.level === 'low' ? colors.risk.low : colors.textMuted,
              }}>
                {overallRisk?.level.toUpperCase() || '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md }}>
                Compliance gaps detected
              </div>
              <button onClick={() => onNavigate('risk')} style={{
                padding: `${spacing.xs} ${spacing.sm}`, fontSize: '0.8rem', fontWeight: 600,
                color: colors.surfaces.dangerText, backgroundColor: `${colors.status.error}22`,
                border: `1px solid ${colors.status.error}44`, borderRadius: borderRadius.md, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                View risk breakdown →
              </button>
            </div>

            {/* Buyer Docs Needed */}
            <div style={{
              flex: '1 1 280px', padding: spacing.lg,
              backgroundColor: colors.surfaces.warningBg, borderRadius: borderRadius.lg,
              border: `1px solid ${colors.status.pending}33`, borderLeft: `4px solid ${colors.status.pending}`,
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.surfaces.warningText, marginBottom: spacing.xs }}>
                Buyer Docs Needed
              </div>
              <div style={{ ...bigNum, color: colors.surfaces.warningText }}>
                Open checklist
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md }}>
                Generate your export document pack
              </div>
              <button onClick={() => onNavigate('checklist')} style={{
                padding: `${spacing.xs} ${spacing.sm}`, fontSize: '0.8rem', fontWeight: 600,
                color: colors.surfaces.warningText, backgroundColor: `${colors.status.pending}22`,
                border: `1px solid ${colors.status.pending}44`, borderRadius: borderRadius.md, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Open checklist →
              </button>
            </div>

            {/* Margin Under Pressure */}
            <div style={{
              flex: '1 1 280px', padding: spacing.lg,
              backgroundColor: colors.surfaces.successBg, borderRadius: borderRadius.lg,
              border: `1px solid ${colors.status.success}33`, borderLeft: `4px solid ${colors.status.success}`,
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.surfaces.successText, marginBottom: spacing.xs }}>
                Margin Under Pressure
              </div>
              <div style={{ ...bigNum, color: colors.surfaces.successText, fontSize: '1.5rem' }}>
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
                color: colors.surfaces.successText, backgroundColor: `${colors.status.success}22`,
                border: `1px solid ${colors.status.success}44`, borderRadius: borderRadius.md, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                See savings →
              </button>
            </div>

            {/* Finance This Shipment */}
            <div style={{
              flex: '1 1 280px', padding: spacing.lg,
              backgroundColor: colors.accentSurface, borderRadius: borderRadius.lg,
              border: `1px solid ${colors.accent}33`, borderLeft: `4px solid ${colors.accent}`,
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.accentHover, marginBottom: spacing.xs }}>
                Finance This Shipment
              </div>
              <div style={{ ...bigNum, color: colors.accent }}>
                {`${shipments.length} shipment${shipments.length !== 1 ? 's' : ''}`}
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md }}>
                Track finance &amp; execution status
              </div>
              <button onClick={() => onNavigate('shipments')} style={{
                padding: `${spacing.xs} ${spacing.sm}`, fontSize: '0.8rem', fontWeight: 600,
                color: colors.accent, backgroundColor: `${colors.accent}22`,
                border: `1px solid ${colors.accent}44`, borderRadius: borderRadius.md, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Open shipments →
              </button>
            </div>
          </div>

          {/* Carbon compliance widget — only for EU + carbon-heavy products */}
          {showCBAM && (
            <div style={{
              padding: spacing.lg, backgroundColor: colors.surfaces.dangerBg,
              borderRadius: borderRadius.lg, border: `2px solid ${colors.status.error}44`,
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
                    color: colors.surfaces.dangerText, backgroundColor: `${colors.status.error}22`,
                    border: `1px solid ${colors.status.error}44`, borderRadius: borderRadius.md, cursor: 'pointer', fontFamily: 'inherit',
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
                    style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaces.dangerBg, border: `1px solid ${colors.status.error}44`, borderRadius: borderRadius.md, cursor: 'pointer' }}
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
