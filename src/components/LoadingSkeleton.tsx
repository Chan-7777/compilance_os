// ============================================================================
// LoadingSkeleton Component - Skeleton screen for loading states
// ============================================================================

import { colors, spacing, borderRadius } from '@theme/index'

export interface LoadingSkeletonProps {
    variant?: 'text' | 'card' | 'circle' | 'rectangular'
    width?: string | number
    height?: string | number
    count?: number
}

export function LoadingSkeleton({
    variant = 'text',
    width = '100%',
    height,
    count = 1
}: LoadingSkeletonProps) {
    const getHeight = () => {
        if (height) return height
        switch (variant) {
            case 'text':
                return 16
            case 'circle':
                return 48
            case 'card':
                return 120
            case 'rectangular':
                return 200
            default:
                return 16
        }
    }

    const skeletonStyle: React.CSSProperties = {
        width,
        height: getHeight(),
        backgroundColor: colors.surface,
        borderRadius: variant === 'circle' ? '50%' : borderRadius.md,
        animation: 'pulse 1.5s ease-in-out infinite',
        marginBottom: variant === 'text' ? spacing.xs : spacing.sm,
    }

    const items = Array.from({ length: count }, (_, i) => (
        <div key={i} style={skeletonStyle} aria-label="Loading content" />
    ))

    return (
        <>
            <style>
                {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
            </style>
            <div>{items}</div>
        </>
    )
}
