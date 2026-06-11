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

type NavGroup = {
  label: string
  dot: string
  items: Array<{ id: ViewType; label: string; Icon: () => React.ReactElement; tier?: 'pro' }>
}

export interface SidebarProps {
  currentView: ViewType | 'settings'
  onNavigate: (view: ViewType | 'settings') => void
  alertCount?: number
  isMobile?: boolean
  isOpen?: boolean
  onClose?: () => void
  onLogout?: () => void
  euEnabled?: boolean
}

export function Sidebar({
  currentView, onNavigate, alertCount = 0,
  isMobile = false, isOpen = false, onClose, onLogout, euEnabled = false,
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
    color: active ? colors.sidebarActiveText : colors.sidebarText,
    fontWeight: active ? fontWeight.semibold : fontWeight.normal,
    fontSize: fontSize.sm, cursor: 'pointer',
    transition: `background ${transition.fast}, color ${transition.fast}`,
    textAlign: 'left' as const, width: '100%', fontFamily: 'inherit',
  })

  const shipmentItems: NavGroup['items'] = [
    { id: 'risk',            label: 'Compliance Risk',  Icon: RiskIcon },
    { id: 'label-validator', label: 'Label Checker',    Icon: LabelIcon, tier: 'pro' },
    ...(euEnabled ? [{ id: 'eu-compliance' as ViewType, label: 'EU Compliance', Icon: EUIcon }] : []),
  ]

  const navGroups: NavGroup[] = [
    { label: 'SHIPMENT RISK',     dot: colors.risk.high,       items: shipmentItems },
    { label: 'DOCUMENTATION',     dot: colors.status.pending,  items: [
      { id: 'checklist', label: 'My Checklist',       Icon: ChecklistIcon },
      { id: 'alerts',    label: 'Regulatory Updates', Icon: AlertsIcon },
    ]},
    { label: 'MARGINS & SAVINGS', dot: colors.status.success,  items: [
      { id: 'fta',    label: 'Trade Deals',    Icon: FTAIcon,    tier: 'pro' },
      { id: 'rodtep', label: 'RoDTEP Recovery', Icon: RoDTEPIcon, tier: 'pro' },
    ]},
    { label: 'FINANCE',           dot: colors.accent,          items: [
      { id: 'shipments', label: 'Shipments',  Icon: ShipmentsIcon, tier: 'pro' },
      { id: 'dashboard', label: 'Dashboard',  Icon: DashboardIcon },
    ]},
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
      {/* Logo */}
      <div style={{ padding: `0 ${spacing.xs}`, marginBottom: spacing.lg }}>
        <img
          src="/logo.png"
          alt="ComplianceOS"
          style={{ width: '100%', height: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {/* Nav groups */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navGroups.map(group => (
          <div key={group.label} style={{ marginBottom: spacing.xs }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: `${spacing.sm} ${spacing.xs}`, marginBottom: 2,
            }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: group.dot, flexShrink: 0 }} />
              <span style={{
                fontSize: '0.625rem', fontWeight: fontWeight.bold,
                color: colors.sidebarLabel, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              }}>
                {group.label}
              </span>
            </div>

            {group.items.map(item => {
              const active = isActive(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  style={navBtn(active)}
                  aria-current={active ? 'page' : undefined}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                >
                  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.65 }}>
                    <item.Icon />
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.tier === 'pro' && (
                    <span style={{
                      fontSize: '0.55rem', fontWeight: fontWeight.bold,
                      color: colors.cta,
                      backgroundColor: 'rgba(249,115,22,0.15)',
                      padding: '1px 5px', borderRadius: borderRadius.sm,
                      letterSpacing: '0.05em',
                    }}>PRO</span>
                  )}
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
              )
            })}
          </div>
        ))}

        {/* Settings */}
        <div style={{ marginTop: 'auto', paddingTop: spacing.sm }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: `${spacing.sm} ${spacing.xs}`, marginBottom: 2,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: colors.sidebarLabel, flexShrink: 0 }} />
            <span style={{ fontSize: '0.625rem', fontWeight: fontWeight.bold, color: colors.sidebarLabel, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
              ACCOUNT
            </span>
          </div>
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
