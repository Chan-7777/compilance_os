// ============================================================================
// Input Component — label + error + hint, 44px touch target
// ============================================================================

import type { InputHTMLAttributes, ReactNode } from 'react'
import { colors, spacing, borderRadius, fontSize, fontWeight, transition } from '@theme/index'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
  leftAddon?: ReactNode
  rightAddon?: ReactNode
}

export function Input({
  label,
  error,
  hint,
  fullWidth = true,
  leftAddon,
  rightAddon,
  id,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
  const hasError = Boolean(error)

  const wrapStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    width: fullWidth ? '100%' : 'auto',
  }

  const fieldWrapStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    border: `1px solid ${hasError ? colors.status.error : colors.border}`,
    borderRadius: borderRadius.md,
    backgroundColor: props.disabled ? colors.surface : colors.white,
    overflow: 'hidden',
    transition: `border-color ${transition.fast}`,
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: `0 ${spacing.md}`,
    minHeight: '44px',
    border: 'none',
    outline: 'none',
    fontSize: fontSize.base,
    fontFamily: 'inherit',
    color: colors.text,
    backgroundColor: 'transparent',
    width: '100%',
    ...style,
  }

  const addonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: `0 ${spacing.sm}`,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    flexShrink: 0,
  }

  return (
    <div style={wrapStyle}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            color: hasError ? colors.status.error : colors.text,
          }}
        >
          {label}
        </label>
      )}
      <div
        style={fieldWrapStyle}
        data-error={hasError || undefined}
        onFocus={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = hasError
            ? colors.status.error
            : colors.borderFocus
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 3px ${hasError ? colors.surfaces.dangerBg : colors.accentSurface}`
        }}
        onBlur={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = hasError
            ? colors.status.error
            : colors.border
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
        }}
      >
        {leftAddon && <span style={addonStyle}>{leftAddon}</span>}
        <input id={inputId} style={inputStyle} {...props} />
        {rightAddon && <span style={addonStyle}>{rightAddon}</span>}
      </div>
      {hasError && (
        <p style={{ margin: 0, fontSize: fontSize.xs, color: colors.status.error }} role="alert">
          {error}
        </p>
      )}
      {!hasError && hint && (
        <p style={{ margin: 0, fontSize: fontSize.xs, color: colors.textMuted }}>
          {hint}
        </p>
      )}
    </div>
  )
}

// Textarea variant
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
}

export function Textarea({ label, error, hint, fullWidth = true, id, style, ...props }: TextareaProps) {
  const inputId = id ?? (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
  const hasError = Boolean(error)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: hasError ? colors.status.error : colors.text }}
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        style={{
          padding: `${spacing.sm} ${spacing.md}`,
          border: `1px solid ${hasError ? colors.status.error : colors.border}`,
          borderRadius: borderRadius.md,
          fontSize: fontSize.base,
          fontFamily: 'inherit',
          color: colors.text,
          backgroundColor: colors.white,
          outline: 'none',
          width: '100%',
          resize: 'vertical',
          minHeight: '100px',
          transition: `border-color ${transition.fast}`,
          ...style,
        }}
        onFocus={e => {
          e.target.style.borderColor = hasError ? colors.status.error : colors.borderFocus
          e.target.style.boxShadow = `0 0 0 3px ${hasError ? colors.surfaces.dangerBg : colors.accentSurface}`
        }}
        onBlur={e => {
          e.target.style.borderColor = hasError ? colors.status.error : colors.border
          e.target.style.boxShadow = 'none'
        }}
        {...props}
      />
      {hasError && <p style={{ margin: 0, fontSize: fontSize.xs, color: colors.status.error }} role="alert">{error}</p>}
      {!hasError && hint && <p style={{ margin: 0, fontSize: fontSize.xs, color: colors.textMuted }}>{hint}</p>}
    </div>
  )
}
