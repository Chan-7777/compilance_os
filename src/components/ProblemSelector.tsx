// ============================================================================
// ProblemSelector — Phase 5 "What's your problem?" first-visit screen
// Shown once per user session after onboarding completes.
// 4 problem tiles that deep-link directly to the right tool.
// ============================================================================

import { colors, borderRadius, spacing } from '@theme/index'
import { useMobile } from '@/hooks/useMobile'
import type { ViewType } from '@/types'

interface Problem {
  id: ViewType
  icon: React.ReactNode
  headline: string
  subline: string
  accent: string
  bg: string
}

export function ProblemSelector({ onSelect, onSkip }: { onSelect: (view: ViewType) => void; onSkip: () => void }) {
  const isMobile = useMobile()

  const PROBLEMS: Problem[] = [
    {
      id: 'risk',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.status.error }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      headline: 'My shipment is stuck',
      subline: 'Check compliance risk, missing docs, and port holds for your product & market',
      accent: colors.status.error,
      bg: colors.surfaces.dangerBg,
    },
    {
      id: 'checklist',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.status.pending }}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 14h6" />
          <path d="M9 18h6" />
          <path d="M9 10h6" />
        </svg>
      ),
      headline: 'My buyer wants documents',
      subline: 'Get a complete document checklist and generate your full doc pack in one click',
      accent: colors.status.pending,
      bg: colors.surfaces.warningBg,
    },
    {
      id: 'fta',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.status.success }}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
      headline: "I'm losing margin",
      subline: 'Find duty savings via trade deals, calculate landed cost, and claim RoDTEP rebates',
      accent: colors.status.success,
      bg: colors.surfaces.successBg,
    },
    {
      id: 'shipments',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent }}>
          <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
      headline: 'I need finance',
      subline: 'Check TReDS eligibility, get ECGC export insurance, and download LC templates',
      accent: colors.accent,
      bg: colors.accentSurface,
    },
  ]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 26, 46, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      padding: spacing.lg,
    }}>
      <div style={{
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 600,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: spacing.sm, color: colors.accent }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: colors.text,
            margin: 0,
            marginBottom: spacing.xs,
          }}>
            What's your problem today?
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: colors.textMuted,
            margin: 0,
            lineHeight: 1.5,
          }}>
            Jump straight to the right tool — no digging around.
          </p>
        </div>

        {/* Problem tiles */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}>
          {PROBLEMS.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: spacing.sm,
                padding: spacing.lg,
                border: `2px solid transparent`,
                borderRadius: borderRadius.lg,
                backgroundColor: p.bg,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'all 150ms ease',
                outline: 'none',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.border = `2px solid ${p.accent}`
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${p.accent}22`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.border = '2px solid transparent'
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 32, width: 32, borderRadius: borderRadius.md, backgroundColor: colors.white, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {p.icon}
              </span>
              <div>
                <div style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: colors.text,
                  marginBottom: '4px',
                  lineHeight: 1.3,
                }}>
                  {p.headline}
                </div>
                <div style={{
                  fontSize: '0.78rem',
                  color: colors.textMuted,
                  lineHeight: 1.5,
                }}>
                  {p.subline}
                </div>
              </div>
              <div style={{
                marginTop: 'auto',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: p.accent,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                Go →
              </div>
            </button>
          ))}
        </div>

        {/* Skip link */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: `1px solid ${colors.border}`,
              color: colors.textMuted,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'none',
              padding: '10px 20px',
              borderRadius: borderRadius.md,
            }}
          >
            Skip — take me to the dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
