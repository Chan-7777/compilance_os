// ============================================================================
// Toast Component - Success/error notifications
// ============================================================================

import { useState, useEffect } from 'react'
import { colors, spacing, borderRadius } from '@theme/index'

export interface ToastProps {
    message: string
    type?: 'success' | 'error' | 'info' | 'warning'
    duration?: number
    onClose?: () => void
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false)
            onClose?.()
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    if (!visible) return null

    const getBackgroundColor = () => {
        switch (type) {
            case 'success':
                return colors.risk.low
            case 'error':
                return colors.risk.high
            case 'warning':
                return colors.cta
            case 'info':
            default:
                return colors.primary
        }
    }

    const toastStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: spacing.lg,
        right: spacing.lg,
        backgroundColor: getBackgroundColor(),
        color: colors.white,
        padding: `${spacing.sm} ${spacing.md}`,
        borderRadius: borderRadius.md,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        zIndex: 9999,
        animation: 'slideIn 0.3s ease-out',
        minWidth: '300px',
        maxWidth: '500px',
    }

    const iconMap = {
        success: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        ),
        error: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        ),
        warning: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
        info: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
        ),
    }

    return (
        <>
            <style>
                {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
            </style>
            <div style={toastStyle} role="alert">
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{iconMap[type]}</span>
                <span style={{ flex: 1, fontSize: '0.875rem' }}>{message}</span>
                <button
                    onClick={() => {
                        setVisible(false)
                        onClose?.()
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: colors.white,
                        cursor: 'pointer',
                        padding: spacing.xs,
                        fontSize: '1rem',
                        opacity: 0.8,
                    }}
                    aria-label="Close notification"
                >
                    ×
                </button>
            </div>
        </>
    )
}
