// ============================================================================
// Dashboard View — simplified: one priority action, savings, recent updates
// ============================================================================

import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { J } from '@/components/JargonTip'
import { colors, spacing, borderRadius, shadow, fontFamily } from '@theme/index'
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

const RupeeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="5" x2="18" y2="5"/><line x1="6" y1="11" x2="18" y2="11"/>
    <path d="M6 5h4.5a4.5 4.5 0 0 1 0 9H8l8 5"/>
  </svg>
)
const GlobeHandshakeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const TruckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
)

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

  // Derive the single most important action for this user right now
  const priorityAction: { label: string; detail: string; cta: string; view: ViewType; color: string; bg: string } | null = (() => {
    if (criticalAlerts.length > 0) {
      const top = criticalAlerts[0]
      return {
        label: `${top.countryName}: ${top.message.length > 80 ? top.message.slice(0, 80) + '…' : top.message}`,
        detail: 'Regulatory alert — action required before your next shipment',
        cta: 'View alert →',
        view: 'alerts',
        color: colors.surfaces.dangerText,
        bg: colors.surfaces.dangerBg,
      }
    }
    if (showCBAM) {
      return {
        label: 'Your EU export now has a carbon levy',
        detail: 'The EU charges a carbon tax on your product type from Jan 2026. You need emission data from suppliers.',
        cta: 'Set up CBAM compliance →',
        view: 'settings',
        color: colors.surfaces.warningText,
        bg: colors.surfaces.warningBg,
      }
    }
    if (overallRisk?.level === 'high') {
      return {
        label: 'High compliance risk detected',
        detail: 'Your shipment profile has gaps that could cause delays or penalties at customs.',
        cta: 'See what needs fixing →',
        view: 'risk',
        color: colors.surfaces.dangerText,
        bg: colors.surfaces.dangerBg,
      }
    }
    return {
      label: 'Your compliance checklist is ready',
      detail: 'Review what documents and certifications you need for your next shipment.',
      cta: 'Open checklist →',
      view: 'checklist',
      color: colors.surfaces.successText,
      bg: colors.surfaces.successBg,
    }
  })()

  const bigNum: React.CSSProperties = {
    fontSize: '2.25rem', fontWeight: 700, fontFamily: fontFamily.mono, lineHeight: 1.1,
  }

  const tileLabelStyle: React.CSSProperties = {
    fontSize: '0.72rem', fontWeight: 600, color: colors.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  }

  const tileEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.boxShadow = shadow.lg
    e.currentTarget.style.transform = 'translateY(-3px)'
  }
  const tileLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.boxShadow = shadow.sm
    e.currentTarget.style.transform = 'translateY(0)'
  }

  return (
    <div style={{ padding: spacing.lg, maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, marginBottom: spacing.xs, color: colors.text }}>
          Good to see you{companyProfile.name ? `, ${companyProfile.name.split(' ')[0]}` : ''}
        </h2>
        <p style={{ color: colors.textMuted, fontSize: '0.875rem', margin: 0 }}>
          {selectedProduct} · {selectedCountries.length} market{selectedCountries.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Empty state */}
      {(selectedCountries.length === 0 || !selectedProduct) && (
        <EmptyState
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent }}>
              <path d="M4.5 16.5c-1.5 1.25-2.5 3.5-2.5 3.5s2.25-1 3.5-2.5M12 2C6.5 2 2 6.5 2 12c0 2.5.5 4.5 1.5 6l12.5-12.5C14.5 4.5 12.5 4 12 2zM22 2s-5.5 2-8 4.5L19.5 12C22 9.5 22 2 22 2zM9 15c-1 0-2-1-2-2" />
            </svg>
          }
          title="Welcome to ComplianceOS"
          description="Set up your profile to see your personalised risk score, compliance checklist, and trade deal savings."
          actionLabel="Get started"
          onAction={() => onNavigate('settings')}
        />
      )}

      {selectedCountries.length > 0 && selectedProduct && (
        <>
          {/* ── Section 1: What to do right now ── */}
          {priorityAction && (
            <div style={{
              padding: spacing.lg,
              backgroundColor: priorityAction.bg,
              borderRadius: borderRadius.lg,
              border: `1px solid ${priorityAction.color}33`,
              borderLeft: `4px solid ${priorityAction.color}`,
              marginBottom: spacing.lg,
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: priorityAction.color, marginBottom: spacing.xs }}>
                Action needed
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
                {priorityAction.label}
              </div>
              <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginBottom: spacing.md, lineHeight: 1.5 }}>
                {priorityAction.detail}
              </div>
              <button
                onClick={() => onNavigate(priorityAction.view)}
                style={{
                  padding: '8px 20px', backgroundColor: priorityAction.color, color: colors.white,
                  border: 'none', borderRadius: borderRadius.md, fontSize: '0.875rem',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'opacity 0.15s ease, transform 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {priorityAction.cta}
              </button>
            </div>
          )}

          {/* ── Section 2: Your savings at a glance ── */}
          <div style={{
            display: 'flex', gap: spacing.md, flexWrap: 'wrap' as const,
            marginBottom: spacing.xl,
          }}>
            {/* RoDTEP tile */}
            <div
              style={{
                flex: '1 1 180px', padding: spacing.lg,
                backgroundColor: colors.white, borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border}`,
                borderTop: `2px solid ${colors.status.success}`,
                boxShadow: shadow.sm,
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={tileEnter} onMouseLeave={tileLeave}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <span style={tileLabelStyle}>RoDTEP refund est.</span>
                <span style={{ color: rodtepEstimate != null ? colors.status.success : colors.textSubtle }}><RupeeIcon /></span>
              </div>
              <div style={{ ...bigNum, color: rodtepEstimate != null ? colors.status.success : colors.textMuted }}>
                {rodtepEstimate != null ? formatINR(rodtepEstimate) : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs }}>
                {rodtepEstimate != null ? 'Unclaimed per shipment' : 'Add HS code in Settings'}
              </div>
            </div>

            {/* Trade deals tile */}
            <div
              style={{
                flex: '1 1 180px', padding: spacing.lg,
                backgroundColor: colors.white, borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border}`,
                borderTop: `2px solid ${colors.accent}`,
                boxShadow: shadow.sm,
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={tileEnter} onMouseLeave={tileLeave}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <span style={tileLabelStyle}><J term="FTA">Trade deals</J> available</span>
                <span style={{ color: activeFTACount > 0 ? colors.accent : colors.textSubtle }}><GlobeHandshakeIcon /></span>
              </div>
              <div style={{ ...bigNum, color: activeFTACount > 0 ? colors.status.success : colors.textMuted }}>
                {activeFTACount > 0 ? activeFTACount : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs }}>
                {activeFTACount > 0 ? 'for your selected markets' : 'No FTAs for current markets'}
              </div>
            </div>

            {/* Risk tile */}
            <div
              style={{
                flex: '1 1 180px', padding: spacing.lg,
                backgroundColor: colors.white, borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border}`,
                borderTop: `2px solid ${overallRisk?.level === 'high' ? colors.risk.high : overallRisk?.level === 'medium' ? colors.risk.medium : overallRisk?.level === 'low' ? colors.risk.low : colors.border}`,
                boxShadow: shadow.sm,
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={tileEnter} onMouseLeave={tileLeave}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <span style={tileLabelStyle}>Compliance risk</span>
                <span style={{ color: overallRisk?.level === 'high' ? colors.risk.high : overallRisk?.level === 'medium' ? colors.risk.medium : overallRisk?.level === 'low' ? colors.risk.low : colors.textSubtle }}><ShieldIcon /></span>
              </div>
              <div style={{
                ...bigNum,
                color: overallRisk?.level === 'high' ? colors.risk.high
                  : overallRisk?.level === 'medium' ? colors.risk.medium
                  : overallRisk?.level === 'low' ? colors.risk.low
                  : colors.textMuted,
              }}>
                {overallRisk ? overallRisk.level.toUpperCase() : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs }}>
                {overallRisk ? `Score ${overallRisk.score}/100` : 'Run risk analysis'}
              </div>
            </div>

            {/* Shipments tile */}
            <div
              style={{
                flex: '1 1 180px', padding: spacing.lg,
                backgroundColor: colors.white, borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border}`,
                borderTop: `2px solid ${colors.accent}`,
                boxShadow: shadow.sm,
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={tileEnter} onMouseLeave={tileLeave}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <span style={tileLabelStyle}>Active shipments</span>
                <span style={{ color: shipments.length > 0 ? colors.accent : colors.textSubtle }}><TruckIcon /></span>
              </div>
              <div style={{ ...bigNum, color: shipments.length > 0 ? colors.accent : colors.textMuted }}>
                {shipments.length > 0 ? shipments.length : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: spacing.xs }}>
                {shipments.length > 0 ? 'in progress' : 'No shipments yet'}
              </div>
            </div>
          </div>

          {/* ── Section 3: Recent regulatory updates ── */}
          {alerts.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, margin: 0 }}>
                  Recent regulatory updates
                </h3>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('alerts')}>View all →</Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing.sm }}>
                {alerts.slice(0, 4).map(alert => (
                  <div
                    key={alert.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: spacing.sm,
                      padding: `${spacing.sm} ${spacing.md}`,
                      backgroundColor: colors.white,
                      border: `1px solid ${colors.border}`,
                      borderLeft: `3px solid ${alert.severity === 'critical' ? colors.severity.critical : alert.severity === 'warning' ? colors.severity.warning : colors.severity.info}`,
                      borderRadius: borderRadius.md,
                      boxShadow: shadow.sm,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s ease, background-color 0.15s ease',
                    }}
                    onClick={() => onNavigate('alerts')}
                    role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onNavigate('alerts') }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = shadow.md; e.currentTarget.style.backgroundColor = colors.surfaceHover }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = shadow.sm; e.currentTarget.style.backgroundColor = colors.white }}
                  >
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{alert.flag}</span>
                    <Badge
                      variant={alert.severity === 'critical' ? 'danger-soft' : alert.severity === 'warning' ? 'warning-soft' : 'info-soft'}
                      size="sm"
                    >
                      {alert.severity === 'critical' ? 'Urgent' : alert.severity === 'warning' ? 'Review' : 'Info'}
                    </Badge>
                    <span style={{ flex: 1, color: colors.text, fontSize: '0.8rem' }}>{alert.message}</span>
                    <span style={{ color: colors.textMuted, fontSize: '0.72rem', flexShrink: 0 }}>{alert.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
