// ============================================================================
// Card Component - Container for grouped content
// ============================================================================

import type { ReactNode } from 'react'
import { colors, shadow, borderRadius, spacing } from '@theme/index'

export type CardVariant = 'default' | 'outlined' | 'elevated'

export interface CardProps {
  children: ReactNode
  variant?: CardVariant
  className?: string
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    boxShadow: shadow.sm,
  },
  outlined: {
    backgroundColor: colors.white,
    border: `2px solid ${colors.border}`,
  },
  elevated: {
    backgroundColor: colors.white,
    border: 'none',
    boxShadow: shadow.lg,
  },
}

export function Card({ children, variant = 'default', className = '' }: CardProps) {
  const baseStyle: React.CSSProperties = {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...variantStyles[variant],
  }

  return (
    <div
      data-component="card"
      data-variant={variant}
      className={className}
      style={baseStyle}
    >
      {children}
    </div>
  )
}

// ─── Card Header ─────────────────────────────────────────────────────────────

export interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  const style: React.CSSProperties = {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.border}`,
  }

  return (
    <div data-component="card-header" className={className} style={style}>
      {children}
    </div>
  )
}

// ─── Card Title ──────────────────────────────────────────────────────────────

export interface CardTitleProps {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  className?: string
}

export function CardTitle({ children, as: Tag = 'h3', className = '' }: CardTitleProps) {
  const style: React.CSSProperties = {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    color: colors.text,
  }

  return (
    <Tag data-component="card-title" className={className} style={style}>
      {children}
    </Tag>
  )
}

// ─── Card Content ────────────────────────────────────────────────────────────

export interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  const style: React.CSSProperties = {
    padding: spacing.lg,
  }

  return (
    <div data-component="card-content" className={className} style={style}>
      {children}
    </div>
  )
}

// ─── Card Footer ─────────────────────────────────────────────────────────────

export interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  const style: React.CSSProperties = {
    padding: spacing.lg,
    borderTop: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
  }

  return (
    <div data-component="card-footer" className={className} style={style}>
      {children}
    </div>
  )
}
