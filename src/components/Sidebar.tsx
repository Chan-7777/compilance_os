// ============================================================================
// Sidebar — deep navy + teal active state, logo-aligned
// ============================================================================

import { colors, spacing, borderRadius, transition, fontSize, fontWeight } from '@theme/index'
import type { ViewType } from '@/types'

const DashboardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const RiskIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const ChecklistIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
)
const AlertsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
)
const FTAIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
)
const ShipmentsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
)
const LabelIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)
const SettingsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)
const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const EUIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
)
const RoDTEPIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)
const DocReviewIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)
const CAIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IGSTIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <path d="M2 10h20"/>
    <path d="M7 15h2M12 15h3"/>
  </svg>
)
const BRCIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const LicenseIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

type NavItem = { id: ViewType; label: string; Icon: () => React.ReactElement }


export interface SidebarProps {
  currentView: ViewType | 'settings'
  onNavigate: (view: ViewType | 'settings') => void
  alertCount?: number
  isMobile?: boolean
  isOpen?: boolean
  onClose?: () => void
  onLogout?: () => void
  euEnabled?: boolean
  caEnabled?: boolean
}

export function Sidebar({
  currentView, onNavigate, alertCount = 0,
  isMobile = false, isOpen = false, onClose, onLogout, euEnabled = false, caEnabled = false,
}: SidebarProps) {
  const isActive = (id: string) => currentView === id

  const handleNavigate = (view: ViewType | 'settings') => {
    onNavigate(view)
    if (isMobile && onClose) onClose()
  }

  const navBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '9px',
    padding: '7px 10px', borderRadius: borderRadius.md, border: 'none',
    background: active ? colors.sidebarActive : 'transparent',
    boxShadow: active ? `inset 3px 0 0 ${colors.accent}` : 'none',
    color: active ? colors.sidebarActiveText : colors.sidebarText,
    fontWeight: active ? fontWeight.semibold : fontWeight.normal,
    fontSize: fontSize.sm, cursor: 'pointer',
    transition: `background ${transition.fast}, color ${transition.fast}, box-shadow ${transition.fast}`,
    textAlign: 'left' as const, width: '100%', fontFamily: 'inherit',
  })

  // Items that start a new logical group get a thin divider above them
  const spacerBefore = new Set<ViewType>(['risk', 'shipments', 'igst-tracker'])

  const flatItems: NavItem[] = [
    { id: 'dashboard',       label: 'Dashboard',         Icon: DashboardIcon },
    { id: 'checklist',       label: 'My Checklist',       Icon: ChecklistIcon },
    { id: 'alerts',          label: 'Regulatory Updates', Icon: AlertsIcon },
    { id: 'risk',            label: 'Risk Score',         Icon: RiskIcon },
    { id: 'fta',             label: 'Trade Deals',        Icon: FTAIcon },
    { id: 'rodtep',          label: 'RoDTEP Recovery',    Icon: RoDTEPIcon },
    { id: 'shipments',       label: 'Shipments',          Icon: ShipmentsIcon },
    { id: 'doc-review',      label: 'Document Review',    Icon: DocReviewIcon },
    { id: 'contract-review' as ViewType, label: 'Contract Review',    Icon: DocReviewIcon },
    ...(euEnabled ? [{ id: 'eu-compliance' as ViewType, label: 'EU Compliance', Icon: EUIcon }] : []),
    ...(caEnabled ? [{ id: 'ca-dashboard' as ViewType, label: 'CA Dashboard',   Icon: CAIcon }] : []),
    { id: 'label-validator', label: 'Label Checker',      Icon: LabelIcon },
    { id: 'igst-tracker',    label: 'IGST Refunds',       Icon: IGSTIcon },
    { id: 'brc-firc',        label: 'BRC / FIRC',         Icon: BRCIcon },
    { id: 'license-tracker', label: 'AA & EPCG',          Icon: LicenseIcon },
  ]

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      style={{
        width: 228, height: '100vh', position: 'fixed', top: 0,
        left: isMobile ? (isOpen ? 0 : -228) : 0,
        backgroundColor: colors.sidebar,
        display: 'flex', flexDirection: 'column',
        padding: `${spacing.md} ${spacing.sm}`,
        overflowY: 'auto',
        zIndex: isMobile ? 200 : 10,
        transition: isMobile ? `left ${transition.slow}` : undefined,
        borderRight: `1px solid ${colors.sidebarBorder}`,
      }}
    >
      {/* Logo. The PNG is a 4 MB image on an opaque white background, and the
          white-out filter turned the whole rectangle into a pale box. */}
      <div style={{ padding: `0 ${spacing.xs}`, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 6, backgroundColor: colors.accent,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', color: '#fff' }}>
          ComplianceOS
        </span>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {flatItems.map(item => {
          const active = isActive(item.id)
          return (
            <div key={item.id} style={{ marginTop: spacerBefore.has(item.id) ? spacing.sm : 0 }}>
              {spacerBefore.has(item.id) && (
                <div style={{ height: 1, backgroundColor: colors.sidebarBorder, marginBottom: spacing.sm, marginLeft: spacing.xs, marginRight: spacing.xs }} />
              )}
            <button
              onClick={() => handleNavigate(item.id)}
              style={navBtn(active)}
              aria-current={active ? 'page' : undefined}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
            >
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.65 }}>
                <item.Icon />
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === 'alerts' && alertCount > 0 && (
                <span
                  data-testid="alert-badge"
                  style={{
                    backgroundColor: colors.risk.high, color: colors.white,
                    fontSize: '0.625rem', fontWeight: fontWeight.bold,
                    padding: '1px 5px', borderRadius: borderRadius.full,
                    minWidth: '1rem', textAlign: 'center' as const,
                  }}
                >
                  {alertCount}
                </span>
              )}
            </button>
            </div>
          )
        })}

        {/* Settings — pinned to bottom */}
        <div style={{ marginTop: 'auto', paddingTop: spacing.md, borderTop: `1px solid ${colors.sidebarBorder}` }}>
          <button
            onClick={() => handleNavigate('settings')}
            style={navBtn(isActive('settings'))}
            aria-current={isActive('settings') ? 'page' : undefined}
            onMouseEnter={e => { if (!isActive('settings')) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { if (!isActive('settings')) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
          >
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: isActive('settings') ? 1 : 0.65 }}>
              <SettingsIcon />
            </span>
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Logout */}
      <div style={{ borderTop: `1px solid ${colors.sidebarBorder}`, paddingTop: spacing.sm, marginTop: spacing.sm }}>
        <button
          onClick={onLogout}
          style={{ ...navBtn(false), opacity: 0.55 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.55' }}
        >
          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><LogoutIcon /></span>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}
