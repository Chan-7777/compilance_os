// ============================================================================
// Sidebar - v3 Dark sidebar with grouped sections (LegalInspect style)
// ============================================================================

import { colors, spacing, borderRadius, transition } from '@theme/index'
import type { ViewType } from '@/types'

// SVG icon components
const DashboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const RiskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const ChecklistIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
)
const AlertsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
)
const FTAIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
)
const ShipmentsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
)
const LabelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)
const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const EUIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 12h8M12 8v8"/>
    <path d="M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7" strokeWidth="1.2" strokeDasharray="2 2"/>
  </svg>
)

type NavGroup = {
  label: string
  items: Array<{ id: ViewType; label: string; Icon: () => React.ReactElement; tier?: 'pro' }>
}

const navGroups: NavGroup[] = [
  {
    label: 'CLASSIFY & COMPLY',
    items: [
      { id: 'checklist',       label: 'My Checklist',       Icon: ChecklistIcon },
      { id: 'label-validator', label: 'Label Checker',       Icon: LabelIcon,    tier: 'pro' },
    ],
  },
  {
    label: 'KNOW YOUR RISK',
    items: [
      { id: 'risk',   label: 'Compliance Risk',     Icon: RiskIcon    },
      { id: 'alerts', label: 'Regulatory Updates',  Icon: AlertsIcon  },
    ],
  },
  {
    label: 'TRADE & SAVINGS',
    items: [
      { id: 'fta', label: 'Trade Deals & Savings', Icon: FTAIcon, tier: 'pro' },
    ],
  },
  {
    label: 'SHIPMENT & FINANCE',
    items: [
      { id: 'shipments',  label: 'Shipments',  Icon: ShipmentsIcon, tier: 'pro' },
      { id: 'dashboard',  label: 'Dashboard',  Icon: DashboardIcon },
    ],
  },
]

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

export function Sidebar({ currentView, onNavigate, alertCount = 0, isMobile = false, isOpen = false, onClose, onLogout, euEnabled = false }: SidebarProps) {
  const isActive = (id: string) => currentView === id

  const handleNavigate = (view: ViewType | 'settings') => {
    onNavigate(view)
    if (isMobile && onClose) onClose()
  }

  const navBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 12px', borderRadius: borderRadius.md, border: 'none',
    background: active ? colors.sidebarActive : 'transparent',
    color: active ? colors.sidebarActiveText : colors.sidebarText,
    fontWeight: active ? 600 : 400, fontSize: '0.8rem', cursor: 'pointer',
    transition: `all ${transition.fast}`, textAlign: 'left' as const,
    width: '100%', fontFamily: 'inherit',
  })

  const groupLabel: React.CSSProperties = {
    fontSize: '0.65rem', fontWeight: 600, color: colors.sidebarLabel,
    letterSpacing: '0.08em', padding: '0 12px', marginBottom: '4px', marginTop: spacing.md,
    display: 'block',
  }

  return (
    <nav role="navigation" aria-label="Main navigation" style={{
      width: 210, height: '100vh', position: 'fixed', top: 0,
      left: isMobile ? (isOpen ? 0 : -210) : 0,
      backgroundColor: colors.sidebar,
      display: 'flex', flexDirection: 'column',
      padding: `${spacing.md} 8px`,
      overflowY: 'auto',
      zIndex: isMobile ? 200 : 10,
      transition: isMobile ? 'left 250ms ease-in-out' : undefined,
    }}>
      {/* Logo */}
      <div style={{ padding: '2px 4px', marginBottom: spacing.md }}>
        <img
          src="/logo.png"
          alt="ComplianceOS"
          style={{
            width: '100%', height: 'auto', display: 'block',
            filter: 'grayscale(1) invert(1) brightness(2)',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* Nav Groups */}
      <div style={{ flex: 1 }}>
        {navGroups.map(group => (
          <div key={group.label}>
            <span style={groupLabel}>{group.label}</span>
            {group.items.map(item => {
              const active = isActive(item.id)
              return (
                <button key={item.id} onClick={() => handleNavigate(item.id)} style={navBtn(active)}
                  aria-current={active ? 'page' : undefined}>
                  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.7 }}>
                    <item.Icon />
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.tier === 'pro' && (
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#F97316', backgroundColor: 'rgba(249,115,22,0.15)', padding: '1px 4px', borderRadius: '3px', letterSpacing: '0.5px' }}>PRO</span>
                  )}
                  {item.id === 'alerts' && alertCount > 0 && (
                    <span data-testid="alert-badge" style={{ backgroundColor: '#DC2626', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '9999px', minWidth: '1rem', textAlign: 'center' as const }}>{alertCount}</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}

        {/* EU Compliance — injected into Know Your Risk when EU is selected */}
        {euEnabled && (
          <div>
            <span style={groupLabel}>EU MARKET</span>
            <button onClick={() => handleNavigate('eu-compliance')} style={navBtn(isActive('eu-compliance'))} aria-current={isActive('eu-compliance') ? 'page' : undefined}>
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: isActive('eu-compliance') ? 1 : 0.7 }}><EUIcon /></span>
              <span style={{ flex: 1 }}>EU Compliance</span>
              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.15)', padding: '1px 4px', borderRadius: '3px', letterSpacing: '0.5px' }}>NEW</span>
            </button>
          </div>
        )}

        {/* Settings */}
        <div style={{ marginTop: spacing.md }}>
          <span style={groupLabel}>ACCOUNT</span>
          <button onClick={() => handleNavigate('settings')} style={navBtn(isActive('settings'))} aria-current={isActive('settings') ? 'page' : undefined}>
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: isActive('settings') ? 1 : 0.7 }}><SettingsIcon /></span>
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Logout */}
      <div style={{ borderTop: `1px solid ${colors.sidebarBorder}`, paddingTop: spacing.sm, marginTop: spacing.sm }}>
        <button onClick={onLogout} style={{ ...navBtn(false), opacity: 0.6 }}>
          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><LogoutIcon /></span>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}
