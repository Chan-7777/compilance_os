// ============================================================================
// Button Component - Interactive button with variants
// ============================================================================

import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { colors, borderRadius, spacing, transition } from '@theme/index'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
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
    backgroundColor: colors.orange,
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
    color: colors.orange,
    border: `2px solid ${colors.orange}`,
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
    fontSize: '0.875rem',
    padding: `${spacing.xs} ${spacing.sm}`,
    minHeight: '32px',
  },
  md: {
    fontSize: '1rem',
    padding: `${spacing.sm} ${spacing.md}`,
    minHeight: '40px',
  },
  lg: {
    fontSize: '1.125rem',
    padding: `${spacing.sm} ${spacing.lg}`,
    minHeight: '48px',
  },
}

function Spinner() {
  const spinnerStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '1em',
    height: '1em',
    border: '2px solid currentColor',
    borderRightColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.75s linear infinite',
  }

  return <span data-testid="button-spinner" style={spinnerStyle} aria-hidden="true" />
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
  className = '',
  type = 'button',
  onClick,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    fontWeight: 500,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: `all ${transition.fast}`,
    width: fullWidth ? '100%' : 'auto',
    ...variantStyles[variant],
    ...sizeStyles[size],
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return
    onClick?.(e)
  }

  return (
    <button
      type={type}
      data-variant={variant}
      data-size={size}
      data-loading={loading}
      data-full-width={fullWidth || undefined}
      disabled={isDisabled}
      className={className}
      style={baseStyle}
      onClick={handleClick}
      {...props}
    >
      {loading && <Spinner />}
      {!loading && leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  )
}

// Add keyframes for spinner animation via style tag
if (typeof document !== 'undefined') {
  const styleId = 'compliance-os-button-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)
  }
}
