// ============================================================================
// Badge Component - Status and label indicators
// ============================================================================

import type { ReactNode } from 'react'
import { colors } from '@theme/index'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
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
    backgroundColor: colors.surface,
    color: colors.text,
    border: `1px solid ${colors.border}`,
  },
  primary: {
    backgroundColor: colors.orange,
    color: colors.white,
  },
  success: {
    backgroundColor: colors.status.success,
    color: colors.white,
  },
  warning: {
    backgroundColor: colors.status.pending,
    color: colors.charcoal,
  },
  danger: {
    backgroundColor: colors.status.error,
    color: colors.white,
  },
  info: {
    backgroundColor: colors.severity.info,
    color: colors.white,
  },
  'risk-high': {
    backgroundColor: colors.risk.high,
    color: colors.white,
  },
  'risk-medium': {
    backgroundColor: colors.risk.medium,
    color: colors.charcoal,
  },
  'risk-low': {
    backgroundColor: colors.risk.low,
    color: colors.white,
  },
}

const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
  sm: {
    fontSize: '0.75rem',
    padding: '0.125rem 0.5rem',
  },
  md: {
    fontSize: '0.875rem',
    padding: '0.25rem 0.75rem',
  },
  lg: {
    fontSize: '1rem',
    padding: '0.375rem 1rem',
  },
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '9999px',
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    ...variantStyles[variant],
    ...sizeStyles[size],
  }

  return (
    <span
      role="status"
      data-variant={variant}
      data-size={size}
      className={className}
      style={baseStyle}
    >
      {children}
    </span>
  )
}
