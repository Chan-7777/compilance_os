import { useState } from 'react'
import { colors, spacing, borderRadius } from '@/theme/index'

interface AuthProps {
  onSignIn: (email: string, password: string) => Promise<{ error: any }>
  onSignUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>
}

export function Auth({ onSignIn, onSignUp }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (isSignUp) {
      const { error: err } = await onSignUp(email, password, fullName)
      if (err) {
        setError(err.message)
      } else {
        setSignUpSuccess(true)
      }
    } else {
      const { error: err } = await onSignIn(email, password)
      if (err) {
        setError(err.message)
      }
    }
    setLoading(false)
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: colors.background,
    padding: spacing.lg,
  }

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    padding: spacing['2xl'],
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: colors.text,
  }

  const subtitleStyle: React.CSSProperties = {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: '0.875rem',
    marginBottom: spacing.xl,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: spacing.md,
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    backgroundColor: colors.primary || colors.orange,
    color: '#fff',
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: loading ? 'wait' : 'pointer',
    opacity: loading ? 0.7 : 1,
  }

  const linkStyle: React.CSSProperties = {
    color: colors.primary || colors.orange,
    cursor: 'pointer',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    fontSize: '0.875rem',
  }

  if (signUpSuccess) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={titleStyle}>Check your email</h2>
          <p style={subtitleStyle}>
            We sent a confirmation link to <strong>{email}</strong>.
            Click the link to activate your account.
          </p>
          <button
            style={linkStyle}
            onClick={() => {
              setIsSignUp(false)
              setSignUpSuccess(false)
            }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="ComplianceOS" style={{ height: 96, width: 'auto' }} />
        </div>
        <p style={subtitleStyle}>
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </p>

        {error && (
          <div
            style={{
              padding: spacing.sm,
              marginBottom: spacing.md,
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              borderRadius: borderRadius.md,
              fontSize: '0.8125rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
            required
            minLength={6}
          />
          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading
              ? 'Please wait...'
              : isSignUp
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: spacing.lg, fontSize: '0.875rem' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            style={linkStyle}
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        {/* Trust & Credibility Signals */}
        <div
          style={{
            marginTop: spacing.xl,
            paddingTop: spacing.lg,
            borderTop: `1px solid ${colors.border}`,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: spacing.md,
              marginBottom: spacing.md,
              flexWrap: 'wrap',
            }}
          >
            {[
              { icon: '🔒', label: 'ISO 27001' },
              { icon: '🛡️', label: 'SOC 2 Type II' },
              { icon: '🇮🇳', label: 'DPDP Act' },
              { icon: '🔐', label: 'AES-256' },
            ].map(badge => (
              <div
                key={badge.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                  color: colors.textMuted,
                  backgroundColor: colors.background,
                  padding: '4px 8px',
                  borderRadius: borderRadius.sm,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <span>{badge.icon}</span>
                <span style={{ fontWeight: 600 }}>{badge.label}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: colors.textMuted, lineHeight: 1.6 }}>
            🇮🇳 Data hosted in India · Enterprise-grade encryption at rest & in transit
          </div>
          <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: '4px' }}>
            Regulatory data sourced from WCO, DGFT & EU Commission
          </div>
        </div>
      </div>
    </div>
  )
}
