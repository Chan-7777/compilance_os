// ============================================================================
// Sidebar - Main navigation component
// ============================================================================

import { colors, spacing, borderRadius, transition } from '@theme/index'
import type { ViewType } from '@/types'

export type NavItem = {
  id: ViewType | 'settings'
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'risk', label: 'Risk Analysis', icon: '△' },
  { id: 'checklist', label: 'Checklists', icon: '☑' },
  { id: 'alerts', label: 'Alerts', icon: '⚡' },
  { id: 'fta', label: 'FTA & Schemes', icon: '🤝' },
  { id: 'shipments', label: 'Shipments', icon: '📦' },
  { id: 'label-validator', label: 'Label Validator', icon: '🏷️' },
]

export interface SidebarProps {
  currentView: ViewType | 'settings'
  onNavigate: (view: ViewType | 'settings') => void
  alertCount?: number
}

export function Sidebar({ currentView, onNavigate, alertCount = 0 }: SidebarProps) {
  const sidebarStyle: React.CSSProperties = {
    width: 240,
    height: '100vh',
    backgroundColor: colors.white,
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    padding: spacing.md,
  }

  const logoStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.orange,
    marginBottom: spacing.xl,
    padding: spacing.sm,
  }

  const navStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    flex: 1,
  }

  const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.md,
    border: 'none',
    background: isActive ? colors.surface : 'transparent',
    color: isActive ? colors.orange : colors.text,
    fontWeight: isActive ? 600 : 400,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: `all ${transition.fast}`,
    textAlign: 'left' as const,
    width: '100%',
  })

  const iconStyle: React.CSSProperties = {
    fontSize: '1rem',
    width: '1.5rem',
    textAlign: 'center',
  }

  const badgeStyle: React.CSSProperties = {
    marginLeft: 'auto',
    backgroundColor: colors.status.error,
    color: colors.white,
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: borderRadius.full,
    minWidth: '1.25rem',
    textAlign: 'center',
  }

  return (
    <nav role="navigation" style={sidebarStyle}>
      <div style={logoStyle}>ComplianceOS</div>

      <div style={navStyle}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as ViewType)}
            style={navItemStyle(currentView === item.id)}
            data-active={currentView === item.id}
          >
            <span style={iconStyle}>{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'alerts' && alertCount > 0 && (
              <span data-testid="alert-badge" style={badgeStyle}>
                {alertCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => onNavigate('settings')}
        style={navItemStyle(currentView === 'settings')}
        data-active={currentView === 'settings'}
        aria-label="Settings"
      >
        <span style={iconStyle}>⚙</span>
        <span>Settings</span>
      </button>
    </nav>
  )
}
