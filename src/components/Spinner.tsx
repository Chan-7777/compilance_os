// ============================================================================
// Spinner Component - Loading indicator
// ============================================================================

import { colors } from '@theme/index'

export interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    color?: string
}

export function Spinner({ size = 'md', color = colors.accent }: SpinnerProps) {
    const sizeMap = {
        sm: 16,
        md: 24,
        lg: 32,
    }

    const spinnerSize = sizeMap[size]

    const spinnerStyle: React.CSSProperties = {
        width: spinnerSize,
        height: spinnerSize,
        border: `3px solid ${color}33`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    }

    return (
        <>
            <style>
                {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
            </style>
            <div style={spinnerStyle} role="status" aria-label="Loading" />
        </>
    )
}
