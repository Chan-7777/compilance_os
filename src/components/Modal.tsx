// ============================================================================
// Modal Component — accessible overlay with header + footer slots
// ============================================================================

import { useEffect, type ReactNode } from 'react'
import { colors, spacing, borderRadius, fontSize, fontWeight, shadow, transition, zIndex } from '@theme/index'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
  footer?: ReactNode
  closeOnOverlay?: boolean
}

const sizeMap = {
  sm: '400px',
  md: '560px',
  lg: '720px',
  full: '95vw',
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  closeOnOverlay = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: zIndex.modal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        padding: spacing.md,
        animation: `modal-bg-in ${transition.fast}`,
      }}
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        style={{
          backgroundColor: colors.white,
          borderRadius: borderRadius.xl,
          boxShadow: shadow.xl,
          width: '100%',
          maxWidth: sizeMap[size],
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          animation: `modal-in ${transition.normal}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <h2 style={{ margin: 0, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.text }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: colors.textMuted,
                fontSize: '1.25rem',
                borderRadius: borderRadius.md,
                transition: `background-color ${transition.fast}`,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.surface)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              ×
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: spacing.lg, overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: spacing.sm,
              flexShrink: 0,
              backgroundColor: colors.surface,
              borderRadius: `0 0 ${borderRadius.xl} ${borderRadius.xl}`,
            }}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modal-bg-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modal-in { from { opacity: 0; transform: scale(0.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>
  )
}
