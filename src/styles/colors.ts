// ============================================================================
// ComplianceOS Color System
// ============================================================================

export const COLORS = {
  // Background colors
  bg: '#0C0F14',
  surface: '#141820',
  surfaceLight: '#1C2230',
  surfaceHover: '#232A3A',

  // Border colors
  border: '#2A3142',
  borderLight: '#3A4562',

  // Text colors
  text: '#E8ECF4',
  textMuted: '#8892A8',
  textDim: '#5A6478',

  // Accent colors
  accent: '#FF6B35',
  accentLight: '#FF8C5A',
  accentDim: 'rgba(255,107,53,0.15)',

  // Semantic colors
  green: '#22C55E',
  greenDim: 'rgba(34,197,94,0.15)',
  yellow: '#EAB308',
  yellowDim: 'rgba(234,179,8,0.15)',
  red: '#EF4444',
  redDim: 'rgba(239,68,68,0.15)',
  blue: '#3B82F6',
  blueDim: 'rgba(59,130,246,0.15)',
  purple: '#A855F7',
  purpleDim: 'rgba(168,85,247,0.15)',
} as const

export type ColorKey = keyof typeof COLORS
