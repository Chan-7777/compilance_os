// ============================================================================
// Badge Component
// ============================================================================

import type { ReactNode } from 'react'
import { colors, borderRadius, fontWeight } from '@theme/index'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'success-soft'
  | 'warning-soft'
  | 'danger-soft'
  | 'info-soft'
  | 'amber-soft'
  | 'risk-high'
  | 'risk-medium'
  | 'risk-low'

export type BadgeSize = 'sm' | 'md' | 'lg'

export interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: colors.surfaces.neutralBg,
    color: colors.surfaces.neutralText,
    border: `1px solid ${colors.border}`,
  },
  primary: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  success: {
    backgroundColor: colors.status.success,
    color: colors.white,
  },
  warning: {
    backgroundColor: colors.status.pending,
    color: colors.text,
  },
  danger: {
    backgroundColor: colors.status.error,
    color: colors.white,
  },
  info: {
    backgroundColor: colors.severity.info,
    color: colors.white,
  },
  // Soft (tinted bg + dark text) — use these inside cards/tables
  'success-soft': {
    backgroundColor: colors.surfaces.successBg,
    color: colors.surfaces.successText,
  },
  'warning-soft': {
    backgroundColor: colors.surfaces.warningBg,
    color: colors.surfaces.warningText,
  },
  'danger-soft': {
    backgroundColor: colors.surfaces.dangerBg,
    color: colors.surfaces.dangerText,
  },
  'info-soft': {
    backgroundColor: colors.surfaces.infoBg,
    color: colors.surfaces.infoText,
  },
  'amber-soft': {
    backgroundColor: colors.surfaces.amberBg,
    color: colors.surfaces.amberText,
  },
  'risk-high': {
    backgroundColor: colors.risk.high,
    color: colors.white,
  },
  'risk-medium': {
    backgroundColor: colors.surfaces.warningBg,
    color: colors.surfaces.warningText,
  },
  'risk-low': {
    backgroundColor: colors.surfaces.successBg,
    color: colors.surfaces.successText,
  },
}

const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
  sm: {
    fontSize: '0.75rem',
    padding: '0.2rem 0.5rem',
    minHeight: '24px',
  },
  md: {
    fontSize: '0.8125rem',
    padding: '0.25rem 0.625rem',
    minHeight: '28px',
  },
  lg: {
    fontSize: '0.875rem',
    padding: '0.375rem 0.875rem',
    minHeight: '32px',
  },
}

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    fontWeight: fontWeight.medium,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    ...variantStyles[variant],
    ...sizeStyles[size],
  }

  return (
    <span role="status" data-variant={variant} data-size={size} className={className} style={baseStyle}>
      {children}
    </span>
  )
}
