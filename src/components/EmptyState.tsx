// ============================================================================
// EmptyState Component - Reusable empty state UI
// ============================================================================

import { colors, spacing, borderRadius } from '@theme/index'
import { Button } from './Button'

export interface EmptyStateProps {
    icon?: string
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
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
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="primary">
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}
