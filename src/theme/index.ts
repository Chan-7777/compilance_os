// ============================================================================
// Design Tokens - ComplianceOS Theme (v3 - LegalInspect Dark Sidebar Style)
// ============================================================================

export const colors = {
  // Core palette
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  cta: '#F97316',
  ctaHover: '#EA6C0A',

  // App surface
  background: '#F3F4F6',
  surface: '#F9FAFB',
  surfaceHover: '#F3F4F6',
  white: '#FFFFFF',

  // Content text
  text: '#111827',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',

  // Sidebar (dark)
  sidebar: '#111827',
  sidebarHover: '#1F2937',
  sidebarActive: '#FFFFFF',
  sidebarActiveText: '#111827',
  sidebarText: '#9CA3AF',
  sidebarLabel: '#4B5563',
  sidebarBorder: '#1F2937',

  // Borders
  border: '#E5E7EB',
  borderFocus: '#2563EB',

  // Risk Level
  risk: {
    high: '#DC2626',
    medium: '#D97706',
    low: '#16A34A',
  },

  // Alert Severity
  severity: {
    critical: '#DC2626',
    warning: '#D97706',
    info: '#2563EB',
  },

  // Status
  status: {
    success: '#16A34A',
    error: '#DC2626',
    pending: '#D97706',
  },

  // Outcome pills (table)
  outcome: {
    win: { bg: '#DCFCE7', text: '#15803D' },
    settled: { bg: '#FEF9C3', text: '#854D0E' },
    loss: { bg: '#FEE2E2', text: '#DC2626' },
  },

  // Legacy aliases
  orange: '#F97316',
  cream: '#F3F4F6',
  tan: '#F9FAFB',
  charcoal: '#111827',
} as const

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
} as const

export const borderRadius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const

export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
} as const

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const lineHeight = {
  tight: '1.2',
  base: '1.5',
  relaxed: '1.7',
} as const

export const letterSpacing = {
  tight: '-0.02em',
  normal: '0',
  wide: '0.02em',
  wider: '0.05em',
} as const

export const shadow = {
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.07)',
} as const

export const transition = {
  fast: '150ms ease-in-out',
  normal: '200ms ease-in-out',
  slow: '300ms ease-in-out',
} as const

export const theme = {
  colors, spacing, borderRadius, fontSize, fontWeight,
  lineHeight, letterSpacing, shadow, transition,
} as const

export type Theme = typeof theme
export type Colors = typeof colors
export type RiskLevel = 'high' | 'medium' | 'low'
export type Severity = 'critical' | 'warning' | 'info'
