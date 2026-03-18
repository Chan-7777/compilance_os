// ============================================================================
// TopBar - Fixed top header with page title, search and user avatar
// ============================================================================

import { useState } from 'react'
import { colors, spacing, borderRadius } from '@theme/index'

export interface TopBarProps {
  title: string
  userName?: string
  isMobile?: boolean
  onMenuToggle?: () => void
}

const TITLES: Record<string, string> = {
  dashboard: 'Compliance Dashboard',
  risk: 'Compliance Risk Analysis',
  checklist: 'My Compliance Checklist',
  alerts: 'Regulatory Updates',
  fta: 'Trade Deals & Savings',
  shipments: 'Shipments',
  'label-validator': 'Label Checker',
  settings: 'Settings',
}

export function TopBar({ title, userName = 'User', isMobile = false, onMenuToggle }: TopBarProps) {
  const [search, setSearch] = useState('')

  const pageTitle = TITLES[title] || title

  return (
    <div style={{
      position: 'fixed', top: 0,
      left: isMobile ? 0 : 232,
      right: 0, height: 56,
      backgroundColor: colors.white,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex', alignItems: 'center',
      padding: `0 ${isMobile ? spacing.md : spacing.xl}`,
      gap: spacing.md,
      zIndex: 100,
    }}>
      {/* Hamburger on mobile */}
      {isMobile && (
        <button
          onClick={onMenuToggle}
          aria-label="Open menu"
          style={{
            width: 32, height: 32, borderRadius: borderRadius.md,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${colors.border}`, backgroundColor: colors.white,
            color: colors.textMuted, cursor: 'pointer', flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      )}

      {/* Page Title */}
      <h1 style={{ fontSize: isMobile ? '0.9rem' : '1.05rem', fontWeight: 700, color: colors.text, margin: 0, flex: '0 0 auto', letterSpacing: '-0.01em' }}>
        {pageTitle}
      </h1>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Search — hidden on small mobile */}
      {!isMobile && (
        <div style={{ position: 'relative', width: 220 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.textSubtle, display: 'flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg,
              backgroundColor: colors.surface, color: colors.text,
              fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      {/* Action icons — hide add/filter on mobile */}
      {!isMobile && (
        <IconBtn title="Add new">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </IconBtn>
      )}

      {!isMobile && (
        <IconBtn title="Filters">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
        </IconBtn>
      )}

      <IconBtn title="Notifications">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
      </IconBtn>

      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        backgroundColor: colors.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
      }}
        title={userName}
      >
        {userName.charAt(0).toUpperCase()}
      </div>
    </div>
  )
}

function IconBtn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <button
      title={title}
      aria-label={title}
      style={{
        width: 32, height: 32, borderRadius: borderRadius.md,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${colors.border}`, backgroundColor: colors.white,
        color: colors.textMuted, cursor: 'pointer', flexShrink: 0,
        transition: 'all 150ms ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.surface }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.white }}
    >
      {children}
    </button>
  )
}
