// ============================================================================
// Design Tokens - ComplianceOS Theme
// ============================================================================

export const colors = {
  // Primary Palette
  cream: '#FAF3E1',
  tan: '#F5E7C6',
  orange: '#FA8112',
  charcoal: '#222222',

  // Semantic Colors
  primary: '#FA8112',
  background: '#FAF3E1',
  surface: '#F5E7C6',
  text: '#222222',
  textMuted: '#666666',

  // Risk Level Colors
  risk: {
    high: '#DC2626',
    medium: '#F59E0B',
    low: '#16A34A',
  },

  // Alert Severity Colors
  severity: {
    critical: '#DC2626',
    warning: '#F59E0B',
    info: '#3B82F6',
  },

  // Status Colors
  status: {
    success: '#16A34A',
    error: '#DC2626',
    pending: '#F59E0B',
  },

  // UI Colors
  border: '#E5D9C3',
  borderFocus: '#FA8112',
  white: '#FFFFFF',
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
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
} as const

export const transition = {
  fast: '150ms ease-in-out',
  normal: '200ms ease-in-out',
  slow: '300ms ease-in-out',
} as const

// Theme object for components
export const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  shadow,
  transition,
} as const

export type Theme = typeof theme
export type Colors = typeof colors
export type RiskLevel = 'high' | 'medium' | 'low'
export type Severity = 'critical' | 'warning' | 'info'
