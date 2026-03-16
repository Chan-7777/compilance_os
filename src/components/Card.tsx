// ============================================================================
// Card Component - v3 Clean SaaS card
// ============================================================================

import type { ReactNode } from 'react'
import { colors, borderRadius, spacing } from '@theme/index'

export type CardVariant = 'default' | 'outlined' | 'elevated'

export interface CardProps {
  children: ReactNode
  variant?: CardVariant
  className?: string
  style?: React.CSSProperties
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06)',
  },
  outlined: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
  },
  elevated: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    boxShadow: '0 4px 12px 0 rgb(0 0 0 / 0.08)',
  },
}

export function Card({ children, variant = 'default', className = '', style }: CardProps) {
  return (
    <div data-component="card" data-variant={variant} className={className}
      style={{ borderRadius: borderRadius.lg, overflow: 'hidden', ...variantStyles[variant], ...style }}>
      {children}
    </div>
  )
}

export interface CardHeaderProps {
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function CardHeader({ children, className = '', action }: CardHeaderProps) {
  return (
    <div data-component="card-header" className={className}
      style={{ padding: `14px ${spacing.lg}`, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: colors.text }}>{children}</div>
      {action && <div style={{ color: colors.textMuted }}>{action}</div>}
    </div>
  )
}

export interface CardTitleProps {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  className?: string
}

export function CardTitle({ children, as: Tag = 'h3', className = '' }: CardTitleProps) {
  return (
    <Tag data-component="card-title" className={className}
      style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: colors.text }}>
      {children}
    </Tag>
  )
}

export interface CardContentProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function CardContent({ children, className = '', style }: CardContentProps) {
  return (
    <div data-component="card-content" className={className} style={{ padding: spacing.lg, ...style }}>
      {children}
    </div>
  )
}

export interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div data-component="card-footer" className={className}
      style={{ padding: `12px ${spacing.lg}`, borderTop: `1px solid ${colors.border}`, backgroundColor: colors.surface }}>
      {children}
    </div>
  )
}
