import { useState } from 'react'
import { createPortal } from 'react-dom'
import { colors, fontFamily, borderRadius, shadow, spacing } from '@theme/index'

const ff = fontFamily.sans
const ffMono = fontFamily.mono

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

interface LandingPageProps {
  onSignIn: (email: string, password: string) => Promise<{ error: any }>
  onSignUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>
}

// ── Auth Modal ────────────────────────────────────────────────────────────────

function AuthModal({ mode, onClose, onSwitchMode, onSignIn, onSignUp }: {
  mode: 'signin' | 'signup'
  onClose: () => void
  onSwitchMode: (m: 'signin' | 'signup') => void
  onSignIn: LandingPageProps['onSignIn']
  onSignUp: LandingPageProps['onSignUp']
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const isSignUp = mode === 'signup'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isSignUp) {
        const { error: err } = await onSignUp(email, password, fullName)
        if (err) setError(err.message)
        else setSuccess(true)
      } else {
        const { error: err } = await onSignIn(email, password)
        if (err) setError(err.message)
      }
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '11px 14px', marginBottom: spacing.sm,
    border: `1.5px solid ${colors.border}`, borderRadius: borderRadius.md,
    fontSize: '0.9375rem', fontFamily: ff, color: colors.text,
    background: colors.background, outline: 'none', boxSizing: 'border-box',
  }

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 9999,
        background: 'rgba(8,15,30,0.72)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: spacing.lg,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 420, background: colors.surface,
        borderRadius: borderRadius.xl, border: `1px solid ${colors.border}`,
        padding: '2.25rem', boxShadow: shadow.xl,
        position: 'relative',
      }}>
        <button type="button" onClick={onClose} style={{
          position: 'absolute', top: 14, right: 16, background: 'none',
          border: 'none', cursor: 'pointer', color: colors.textMuted,
          fontSize: 20, padding: '2px 8px', fontFamily: ff, lineHeight: 1,
        }}>✕</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <div style={{
            width: 28, height: 28, borderRadius: borderRadius.md,
            background: `linear-gradient(135deg, ${colors.accent} 0%, #14B8A6 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: colors.text, fontFamily: ff }}>
            ComplianceOS
          </span>
        </div>

        {success ? (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.text, marginBottom: 8, fontFamily: ff }}>
              Check your email
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 20, fontFamily: ff }}>
              We sent a confirmation link to <strong style={{ color: colors.text }}>{email}</strong>.
              Click it to activate your account.
            </p>
            <button type="button" onClick={() => { setSuccess(false); onSwitchMode('signin') }}
              style={{ color: colors.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, fontFamily: ff }}>
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.text, marginBottom: 4, fontFamily: ff }}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '0.8125rem', marginBottom: 20, fontFamily: ff }}>
              {isSignUp ? 'Free to start. No credit card required.' : 'Sign in to your ComplianceOS account.'}
            </p>
            {error && (
              <div style={{
                background: colors.surfaces.dangerBg, color: colors.surfaces.dangerText,
                borderRadius: borderRadius.md, padding: '9px 13px',
                fontSize: '0.8125rem', marginBottom: 14, fontFamily: ff,
              }}>{error}</div>
            )}
            <form onSubmit={handleSubmit}>
              {isSignUp && (
                <input style={inputSt} type="text" placeholder="Full Name"
                  value={fullName} onChange={e => setFullName(e.target.value)} />
              )}
              <input style={inputSt} type="email" placeholder="Work email"
                value={email} onChange={e => setEmail(e.target.value)} required />
              <input style={inputSt} type="password" placeholder="Password (min 6 characters)"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '12px', marginTop: 4,
                background: loading ? colors.accentHover : colors.accent,
                color: '#fff', border: 'none', borderRadius: borderRadius.md,
                fontSize: '0.9375rem', fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer', fontFamily: ff,
              }}>
                {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 18, fontSize: '0.8125rem', color: colors.textMuted, fontFamily: ff }}>
              {isSignUp ? 'Already have an account?' : 'New to ComplianceOS?'}{' '}
              <button type="button"
                onClick={() => { setError(null); onSwitchMode(isSignUp ? 'signin' : 'signup') }}
                style={{ color: colors.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem', fontFamily: ff }}>
                {isSignUp ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── App Preview Mockup ────────────────────────────────────────────────────────

function AppPreview() {
  return (
    <div style={{
      width: '100%', maxWidth: 460,
      borderRadius: borderRadius.lg,
      border: `1px solid ${colors.border}`,
      boxShadow: shadow.xl,
      overflow: 'hidden',
      display: 'flex',
      fontFamily: ff,
      userSelect: 'none',
    }}>
      {/* Sidebar */}
      <div style={{
        width: 110, flexShrink: 0,
        background: colors.sidebar,
        borderRight: `1px solid ${colors.sidebarBorder}`,
        padding: '12px 8px',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 5px', marginBottom: 14 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
            background: `linear-gradient(135deg, ${colors.accent}, #14B8A6)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.575rem', letterSpacing: '-0.01em' }}>ComplianceOS</span>
        </div>
        {[
          { label: 'Dashboard', active: false },
          { label: 'IGST Refunds', active: true },
          { label: 'RoDTEP', active: false },
          { label: 'BRC / FIRC', active: false },
          { label: 'Alerts', active: false, badge: '3' },
          { label: 'AA & EPCG', active: false },
          { label: 'Shipments', active: false },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 7px', borderRadius: 4,
            background: item.active ? colors.sidebarActive : 'transparent',
            color: item.active ? '#fff' : colors.sidebarText,
            fontWeight: item.active ? 600 : 400,
            fontSize: '0.6rem',
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span style={{ background: colors.risk.high, color: '#fff', borderRadius: 99, fontSize: '0.475rem', padding: '0 3px', fontWeight: 700, marginLeft: 3 }}>{item.badge}</span>
            )}
          </div>
        ))}
      </div>

      {/* Content panel */}
      <div style={{ flex: 1, background: colors.background, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: 10, borderBottom: `1px solid ${colors.border}`,
        }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: colors.text }}>IGST Refund Tracker</span>
          <span style={{
            fontSize: '0.5rem', background: colors.surfaces.warningBg,
            color: colors.surfaces.warningText, padding: '2px 6px',
            borderRadius: borderRadius.sm, fontWeight: 700,
          }}>3 pending</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Total Stuck', val: '₹8.2L', col: colors.risk.medium, bg: colors.surfaces.warningBg },
            { label: 'Oldest SB', val: 'Day 118', col: colors.risk.high, bg: colors.surfaces.dangerBg },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: borderRadius.sm,
              border: `1px solid ${s.col}20`, padding: '8px 10px',
            }}>
              <div style={{ fontSize: '0.475rem', color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: s.col, fontFamily: ffMono, lineHeight: 1 }}>{s.val}</div>
            </div>
          ))}
        </div>

        {[
          { sb: 'SB202500123', issue: 'EGM not filed', sev: colors.risk.high },
          { sb: 'SB202500089', issue: 'GSTN mismatch — ₹1 diff', sev: colors.risk.medium },
          { sb: 'SB202500041', issue: 'Processing', sev: colors.status.success },
        ].map(row => (
          <div key={row.sb} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 8px',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderLeft: `3px solid ${row.sev}`,
            borderRadius: borderRadius.sm,
          }}>
            <span style={{ fontFamily: ffMono, fontSize: '0.475rem', color: colors.textMuted, flexShrink: 0 }}>{row.sb}</span>
            <span style={{ fontSize: '0.55rem', color: colors.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{row.issue}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Landing Page ──────────────────────────────────────────────────────────────

export function LandingPage({ onSignIn, onSignUp }: LandingPageProps) {
  const [modal, setModal] = useState<'signin' | 'signup' | null>(null)
  const open = (m: 'signin' | 'signup') => setModal(m)

  const btnAccent: React.CSSProperties = {
    padding: '9px 20px', background: colors.accent, color: '#fff',
    border: 'none', borderRadius: borderRadius.md, fontSize: '0.875rem',
    fontWeight: 600, cursor: 'pointer', fontFamily: ff,
    display: 'inline-flex', alignItems: 'center', gap: 7,
  }

  const btnOutline: React.CSSProperties = {
    padding: '9px 20px', background: 'transparent', color: colors.text,
    border: `1.5px solid ${colors.border}`, borderRadius: borderRadius.md,
    fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', fontFamily: ff,
  }

  return (
    <div style={{ fontFamily: ff, background: colors.background, minHeight: '100vh' }}>
      {modal !== null && (
        <AuthModal mode={modal} onClose={() => setModal(null)}
          onSwitchMode={setModal} onSignIn={onSignIn} onSignUp={onSignUp} />
      )}

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        padding: '0 5vw', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: borderRadius.md,
            background: `linear-gradient(135deg, ${colors.accent} 0%, #14B8A6 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: colors.text, letterSpacing: '-0.02em' }}>
            ComplianceOS
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => scrollTo('lp-pricing')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.8125rem', color: colors.textMuted, fontFamily: ff, fontWeight: 500,
          }}>Pricing</button>
          <button type="button" onClick={() => open('signin')} style={{ ...btnOutline, padding: '6px 14px', fontSize: '0.8125rem' }}>
            Sign In
          </button>
          <button type="button" onClick={() => open('signup')} style={{ ...btnAccent, padding: '6px 14px', fontSize: '0.8125rem' }}>
            Start Free
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: colors.background,
        borderBottom: `1px solid ${colors.border}`,
        padding: 'clamp(48px, 8vh, 80px) 5vw',
        display: 'flex', alignItems: 'center', gap: '5vw', flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 340px', maxWidth: 500 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: colors.accentSurface, border: `1px solid ${colors.accent}30`,
            color: colors.accent, padding: '3px 10px', borderRadius: 999,
            fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase' as const, marginBottom: 20,
          }}>
            India Export Compliance
          </div>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800,
            color: colors.text, lineHeight: 1.15, letterSpacing: '-0.025em',
            marginBottom: 14,
          }}>
            Your refund is stuck.<br />
            <span style={{ color: colors.accent }}>We tell you exactly why.</span>
          </h1>
          <p style={{
            fontSize: '0.9375rem', color: colors.textMuted, lineHeight: 1.7,
            maxWidth: 440, marginBottom: 24,
          }}>
            IGST refunds, RoDTEP claims, BRC tracking — one platform covering the entire export compliance lifecycle. Built for Indian exporters and their CAs.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" onClick={() => open('signup')} style={btnAccent}>
              Start Free
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
            <button type="button" onClick={() => scrollTo('lp-pricing')} style={btnOutline}>
              View pricing
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: colors.textSubtle, marginTop: 12 }}>
            Free for your first shipment. No credit card required.
          </p>
        </div>
        <div style={{ flex: '1 1 300px', display: 'flex', justifyContent: 'center' }}>
          <AppPreview />
        </div>
      </section>

      {/* ── PAIN POINTS ──────────────────────────────────────────────────── */}
      <section style={{ background: colors.surface, padding: '52px 5vw', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{
            fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase' as const, color: colors.textMuted, marginBottom: 6,
          }}>Why exporters get stuck</div>
          <h2 style={{
            fontSize: 'clamp(1.25rem, 2.5vw, 1.625rem)', fontWeight: 700,
            color: colors.text, letterSpacing: '-0.02em', marginBottom: 28,
          }}>The errors that nobody tells you about</h2>

          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {[
              {
                code: 'SB002', severity: colors.risk.high, bg: colors.surfaces.dangerBg,
                pain: 'ICEGATE shows Transmitted. GST portal shows nothing.',
                fix: 'The shipping line never filed the EGM. We flag it and tell you who to chase.',
              },
              {
                code: 'RODTEPY', severity: colors.risk.medium, bg: colors.surfaces.warningBg,
                pain: "You exported for months without claiming RoDTEP.",
                fix: "Must be declared on the SB before EGM. Miss it and that money doesn't come back.",
              },
              {
                code: 'SB001', severity: colors.risk.medium, bg: colors.surfaces.warningBg,
                pain: '₹1 rounding difference is blocking your ₹8 lakh refund.',
                fix: 'ICEGATE reconciles field-by-field. We catch the mismatch before you file.',
              },
            ].map(item => (
              <div key={item.code} style={{
                display: 'flex', gap: 16,
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderLeft: `3px solid ${item.severity}`,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                boxShadow: shadow.sm,
              }}>
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  <code style={{
                    fontFamily: ffMono, fontSize: '0.6875rem', fontWeight: 700,
                    background: item.bg, color: item.severity,
                    padding: '2px 7px', borderRadius: borderRadius.sm,
                  }}>{item.code}</code>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: colors.text, marginBottom: 4, lineHeight: 1.4 }}>{item.pain}</p>
                  <p style={{ fontSize: '0.8125rem', color: colors.textMuted, lineHeight: 1.6, margin: 0 }}>{item.fix}</p>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => open('signup')} style={{ ...btnAccent, marginTop: 24 }}>
            Start diagnosing — it's free
          </button>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section style={{ background: colors.background, padding: '52px 5vw', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: colors.textMuted, marginBottom: 6 }}>Platform</div>
          <h2 style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.625rem)', fontWeight: 700, color: colors.text, letterSpacing: '-0.02em', marginBottom: 24 }}>Everything in one place</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2px 16px' }}>
            {[
              'IGST Refund Tracker',
              'RoDTEP Calculator (Notif. 60)',
              'BRC / FIRC Bank Realization',
              'AA & EPCG License Tracker',
              'HS Code Validator (AI)',
              'Document Review (AI)',
              'FTA & Tariff Savings',
              'Compliance Checklist',
              'Regulatory Alerts',
              'CA Multi-client Dashboard',
            ].map(f => (
              <div key={f} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: borderRadius.md,
                fontSize: '0.875rem', color: colors.text,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="lp-pricing" style={{ background: colors.surface, padding: '56px 5vw', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' as const }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: colors.textMuted, marginBottom: 6 }}>Pricing</div>
          <h2 style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.625rem)', fontWeight: 700, color: colors.text, letterSpacing: '-0.02em', marginBottom: 8 }}>Pay when it pays for itself</h2>
          <p style={{ fontSize: '0.9375rem', color: colors.textMuted, marginBottom: 36 }}>
            The free plan shows you the problem. The paid plan recovers the money.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              {
                plan: 'Free', price: '₹0', period: 'forever',
                desc: 'See your risk score, alerts, and dashboard.',
                features: ['Export Risk Score', 'Regulatory Alerts', 'CBAM Exposure Check', 'Dashboard Overview'],
                cta: 'Start Free', recommended: false,
              },
              {
                plan: 'Exporter', price: '₹999', period: '/month',
                desc: 'Track, recover, and stay ahead.',
                features: [
                  'Everything in Free',
                  'IGST Refund Tracker',
                  'BRC / FIRC Tracker',
                  'RoDTEP Calculator',
                  'AA & EPCG License Tracker',
                  'HS Code Validator (AI)',
                  'Document Review (AI)',
                  'FTA Tariff Savings',
                  'WhatsApp Alerts',
                ],
                cta: 'Start 14-Day Trial', recommended: true,
              },
              {
                plan: 'CA / Professional', price: '₹2,499', period: '/month',
                desc: 'For CAs managing multiple exporter clients.',
                features: [
                  'Everything in Exporter',
                  'Multi-client CA Dashboard',
                  'Client invite & onboarding',
                  'Cross-client compliance view',
                  'Priority support',
                ],
                cta: 'Contact Us', recommended: false,
              },
            ].map(tier => (
              <div key={tier.plan} style={{
                background: colors.surface,
                borderRadius: borderRadius.lg,
                border: `1.5px solid ${tier.recommended ? colors.accent : colors.border}`,
                padding: '24px 20px', position: 'relative',
                boxShadow: tier.recommended ? shadow.md : shadow.sm,
                textAlign: 'left' as const,
              }}>
                {tier.recommended && (
                  <div style={{
                    position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                    background: colors.accent, color: '#fff',
                    fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const, padding: '3px 12px', borderRadius: 999,
                    whiteSpace: 'nowrap' as const, fontFamily: ff,
                  }}>Most Popular</div>
                )}
                <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: colors.textMuted, marginBottom: 6 }}>
                  {tier.plan}
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: colors.text, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {tier.price}
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.textMuted, marginLeft: 4 }}>{tier.period}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: colors.textMuted, margin: '8px 0 14px', lineHeight: 1.5 }}>
                  {tier.desc}
                </p>
                <div style={{ borderTop: `1px solid ${colors.border}`, marginBottom: 14 }} />
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tier.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: '0.8125rem', color: colors.text }}>
                      <svg style={{ flexShrink: 0, marginTop: 1 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => open('signup')} style={{
                  width: '100%', padding: '9px', borderRadius: borderRadius.md,
                  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: ff,
                  background: tier.recommended ? colors.accent : 'transparent',
                  color: tier.recommended ? '#fff' : colors.text,
                  border: tier.recommended ? 'none' : `1.5px solid ${colors.border}`,
                }}>
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section style={{
        background: colors.primary, padding: '52px 5vw',
        textAlign: 'center' as const,
      }}>
        <h2 style={{
          fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: '#fff',
          letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 10,
        }}>
          Stop chasing. Start knowing.
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.5)', maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.6 }}>
          Free for your first shipment. No card, no commitment.
        </p>
        <button type="button" onClick={() => open('signup')} style={{ ...btnAccent, padding: '11px 26px', fontSize: '0.9375rem' }}>
          Create Free Account
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </button>
        <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.2)', marginTop: 14 }}>
          DGFT · ICEGATE · GST Portal · AES-256 · Hosted in India
        </p>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{
        background: colors.sidebar, padding: '18px 5vw',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10, borderTop: `1px solid ${colors.sidebarBorder}`,
      }}>
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontFamily: ff }}>
          © 2026 ComplianceOS · Not legal or trade advice
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {['AES-256', 'Data in India', 'DPDP Act'].map(t => (
            <span key={t} style={{
              fontSize: '0.5625rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
              border: '1px solid rgba(255,255,255,0.12)', padding: '2px 7px',
              borderRadius: 3, letterSpacing: '0.05em', textTransform: 'uppercase' as const, fontFamily: ff,
            }}>{t}</span>
          ))}
        </div>
      </footer>

    </div>
  )
}
