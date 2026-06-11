// ============================================================================
// Button Component
// ============================================================================

import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { colors, borderRadius, spacing, fontSize, fontWeight, transition } from '@theme/index'

export type ButtonVariant = 'primary' | 'cta' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
  },
  cta: {
    backgroundColor: colors.cta,
    color: colors.white,
    border: 'none',
  },
  secondary: {
    backgroundColor: colors.surface,
    color: colors.text,
    border: `1px solid ${colors.border}`,
  },
  outline: {
    backgroundColor: 'transparent',
    color: colors.primary,
    border: `1.5px solid ${colors.primary}`,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: colors.text,
    border: 'none',
  },
  danger: {
    backgroundColor: colors.status.error,
    color: colors.white,
    border: 'none',
  },
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    fontSize: fontSize.sm,
    padding: `${spacing.xs} ${spacing.sm}`,
    minHeight: '36px',
  },
  md: {
    fontSize: fontSize.base,
    padding: `${spacing.sm} ${spacing.md}`,
    minHeight: '44px',
  },
  lg: {
    fontSize: fontSize.lg,
    padding: `${spacing.sm} ${spacing.lg}`,
    minHeight: '52px',
  },
}

function ButtonSpinner() {
  return (
    <span
      data-testid="button-spinner"
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: '1em',
        height: '1em',
        border: '2px solid currentColor',
        borderRightColor: 'transparent',
        borderRadius: '50%',
        animation: 'btn-spin 0.75s linear infinite',
      }}
    />
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  type = 'button',
  onClick,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    fontFamily: 'inherit',
    fontWeight: fontWeight.medium,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: `opacity ${transition.fast}, background-color ${transition.fast}`,
    width: fullWidth ? '100%' : 'auto',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  }

  return (
    <button
      type={type}
      data-variant={variant}
      data-size={size}
      data-loading={loading}
      data-full-width={fullWidth ? 'true' : undefined}
      disabled={isDisabled}
      style={baseStyle}
      onClick={isDisabled ? undefined : onClick}
      {...props}
    >
      {loading && <ButtonSpinner />}
      {!loading && leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  )
}

// Keyframes injected once at runtime
if (typeof document !== 'undefined') {
  const styleId = 'cos-button-styles'
  if (!document.getElementById(styleId)) {
    const s = document.createElement('style')
    s.id = styleId
    s.textContent = `@keyframes btn-spin { to { transform: rotate(360deg); } }`
    document.head.appendChild(s)
  }
}
