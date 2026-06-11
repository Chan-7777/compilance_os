// ============================================================================
// EmptyState Component - Reusable empty state UI
// ============================================================================

import { colors, spacing } from '@theme/index'
import { Button } from './Button'

export interface EmptyStateProps {
    icon?: React.ReactNode
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
    secondaryLabel?: string
    onSecondaryAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction, secondaryLabel, onSecondaryAction }: EmptyStateProps) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['2xl'],
        textAlign: 'center',
        minHeight: '300px',
    }

    const iconStyle: React.CSSProperties = {
        fontSize: '3rem',
        marginBottom: spacing.lg,
        opacity: 0.6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    }

    const titleStyle: React.CSSProperties = {
        fontSize: '1.25rem',
        fontWeight: 600,
        color: colors.text,
        marginBottom: spacing.sm,
    }

    const descriptionStyle: React.CSSProperties = {
        fontSize: '0.875rem',
        color: colors.textMuted,
        maxWidth: '400px',
        marginBottom: spacing.lg,
        lineHeight: 1.6,
    }

    return (
        <div style={containerStyle}>
            {icon && <div style={iconStyle}>{icon}</div>}
            <h3 style={titleStyle}>{title}</h3>
            <p style={descriptionStyle}>{description}</p>
            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
                {actionLabel && onAction && (
                    <Button onClick={onAction} variant="primary">
                        {actionLabel}
                    </Button>
                )}
                {secondaryLabel && onSecondaryAction && (
                    <Button onClick={onSecondaryAction} variant="secondary">
                        {secondaryLabel}
                    </Button>
                )}
            </div>
        </div>
    )
}
