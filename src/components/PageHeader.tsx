// ============================================================================
// PageHeader Component — consistent title + subtitle + action across all pages
// ============================================================================

import type { ReactNode } from 'react'
import { colors, spacing, fontSize, fontWeight } from '@theme/index'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  badge?: ReactNode
}

export function PageHeader({ title, subtitle, action, badge }: PageHeaderProps) {
  return (
    <div
      style={{
        marginBottom: spacing.xl,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <h1
            style={{
              margin: 0,
              fontSize: fontSize['2xl'],
              fontWeight: fontWeight.bold,
              color: colors.text,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p
            style={{
              margin: `${spacing.xs} 0 0`,
              fontSize: fontSize.sm,
              color: colors.textMuted,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}
