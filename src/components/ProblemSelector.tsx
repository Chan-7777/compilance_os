// ============================================================================
// ProblemSelector — Phase 5 "What's your problem?" first-visit screen
// Shown once per user session after onboarding completes.
// 4 problem tiles that deep-link directly to the right tool.
// ============================================================================

import { colors, borderRadius, spacing } from '@theme/index'
import type { ViewType } from '@/types'

interface Problem {
  id: ViewType
  emoji: string
  headline: string
  subline: string
  accent: string
  bg: string
}

const PROBLEMS: Problem[] = [
  {
    id: 'risk',
    emoji: '🚨',
    headline: 'My shipment is stuck',
    subline: 'Check compliance risk, missing docs, and port holds for your product & market',
    accent: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    id: 'checklist',
    emoji: '📋',
    headline: 'My buyer wants documents',
    subline: 'Get a complete document checklist and generate your full doc pack in one click',
    accent: '#D97706',
    bg: '#FFFBEB',
  },
  {
    id: 'fta',
    emoji: '📉',
    headline: "I'm losing margin",
    subline: 'Find duty savings via trade deals, calculate landed cost, and claim RoDTEP rebates',
    accent: '#16A34A',
    bg: '#F0FDF4',
  },
  {
    id: 'shipments',
    emoji: '💰',
    headline: 'I need finance',
    subline: 'Check TReDS eligibility, get ECGC export insurance, and download LC templates',
    accent: '#2563EB',
    bg: '#EFF6FF',
  },
]

interface ProblemSelectorProps {
  onSelect: (view: ViewType) => void
  onSkip: () => void
}

export function ProblemSelector({ onSelect, onSkip }: ProblemSelectorProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
          <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>👋</div>
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
          gridTemplateColumns: '1fr 1fr',
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
              <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{p.emoji}</span>
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
              border: 'none',
              color: colors.textMuted,
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Skip — take me to the dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
