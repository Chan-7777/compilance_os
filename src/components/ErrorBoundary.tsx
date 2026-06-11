import { Component, type ErrorInfo, type ReactNode } from 'react'
import { colors, spacing, borderRadius } from '@theme/index'

interface Props {
  children: ReactNode
  label?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label ?? 'view'}]`, error, info.componentStack)
  }

  handleReset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{
        padding: spacing.xl,
        margin: spacing.lg,
        backgroundColor: colors.surfaces.dangerBg,
        border: `1px solid ${colors.status.error}44`,
        borderRadius: borderRadius.lg,
        maxWidth: 600,
      }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: colors.surfaces.dangerText, marginBottom: spacing.sm }}>
          Something went wrong in {this.props.label ?? 'this view'}
        </div>
        <pre style={{
          fontSize: '0.75rem',
          color: colors.surfaces.dangerText,
          backgroundColor: `${colors.status.error}10`,
          padding: spacing.sm,
          borderRadius: borderRadius.sm,
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          marginBottom: spacing.md,
        }}>
          {error.message}
        </pre>
        <button
          onClick={this.handleReset}
          style={{
            padding: '8px 16px',
            backgroundColor: colors.primary,
            color: colors.white,
            border: 'none',
            borderRadius: borderRadius.md,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}
