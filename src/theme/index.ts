// ============================================================================
// Design Tokens — ComplianceOS v5 (navy + teal, Space Grotesk, logo-aligned)
// Brief: authoritative · precise · calm
// Primary = deep navy (#1A2440, logo wordmark)
// Accent  = teal (#0D9488, logo icon gradient midpoint)
// ============================================================================

export const fontFamily = {
  sans: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
} as const

export const colors = {
  // Brand
  primary: '#1A2440',
  primaryHover: '#141D33',
  accent: '#0D9488',
  accentHover: '#0B8077',
  accentSurface: '#F0FDFA',   // teal tint bg for highlights

  // CTA (upgrade/payment only — saffron orange)
  cta: '#F97316',
  ctaHover: '#EA6C0A',

  // App surfaces
  background: '#FAFAF8',      // warm white — document-paper feel
  surface: '#FFFFFF',
  surfaceHover: '#F5F5F3',
  white: '#FFFFFF',

  // Text
  text: '#1E293B',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',

  // Sidebar (deep navy)
  sidebar: '#0F1A2E',
  sidebarHover: '#1A2440',
  sidebarActive: '#0D9488',      // teal active item bg
  sidebarActiveText: '#FFFFFF',
  sidebarText: '#94A3B8',
  sidebarLabel: '#475569',
  sidebarBorder: '#1A2440',

  // Borders
  border: '#E2E8F0',
  borderFocus: '#0D9488',        // teal focus ring

  // Risk
  risk: {
    high: '#DC2626',
    medium: '#D97706',
    low: '#16A34A',
  },

  // Alert severity
  severity: {
    critical: '#DC2626',
    warning: '#D97706',
    info: '#0D9488',             // teal info (was blue)
  },

  // Status (solid)
  status: {
    success: '#16A34A',
    error: '#DC2626',
    pending: '#D97706',
  },

  // Soft surfaces — bg + paired text
  surfaces: {
    successBg: '#DCFCE7',
    successText: '#15803D',
    warningBg: '#FEF3C7',
    warningText: '#92400E',
    dangerBg: '#FEE2E2',
    dangerText: '#991B1B',
    infoBg: '#F0FDFA',           // teal-tinted (was blue-tinted)
    infoText: '#0F766E',
    amberBg: '#FFF7ED',
    amberText: '#92400E',
    neutralBg: '#F1F5F9',
    neutralText: '#475569',
  },

  // Outcome pills
  outcome: {
    win: { bg: '#DCFCE7', text: '#15803D' },
    settled: { bg: '#FEF9C3', text: '#854D0E' },
    loss: { bg: '#FEE2E2', text: '#DC2626' },
  },
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
  md: '0.375rem',   // tighter — precise feel
  lg: '0.625rem',
  xl: '0.875rem',
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
  '4xl': '2.25rem',
} as const

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const

export const lineHeight = {
  tight: '1.2',
  snug: '1.375',
  base: '1.5',
  relaxed: '1.7',
} as const

export const letterSpacing = {
  tight: '-0.02em',
  normal: '0',
  wide: '0.02em',
  wider: '0.05em',
  widest: '0.1em',
} as const

export const shadow = {
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.09), 0 8px 10px -6px rgb(0 0 0 / 0.09)',
} as const

export const transition = {
  fast: '150ms ease-in-out',
  normal: '200ms ease-in-out',
  slow: '300ms ease-in-out',
} as const

export const zIndex = {
  dropdown: 100,
  sticky: 200,
  overlay: 500,
  modal: 600,
  toast: 900,
} as const

export const theme = {
  colors, fontFamily, spacing, borderRadius, fontSize, fontWeight,
  lineHeight, letterSpacing, shadow, transition, zIndex,
} as const

export type Theme = typeof theme
export type Colors = typeof colors
export type RiskLevel = 'high' | 'medium' | 'low'
export type Severity = 'critical' | 'warning' | 'info'
