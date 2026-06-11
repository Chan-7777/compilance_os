// ============================================================================
// Upgrade — plan selection + Razorpay payment link
// Shown when a free-plan user tries to access a gated feature.
// ============================================================================

import { useState } from 'react'
import { colors, spacing, borderRadius } from '@theme/index'
import { useToast } from '@/hooks/useToast'
import type { ViewType } from '@/types'

export interface UpgradeProps {
  onNavigate: (view: ViewType) => void
  currentPlan?: string
  blockedFeature?: string
}

const PLANS = [
  {
    id: 'growth' as const,
    name: 'Growth',
    price: '₹2,999',
    period: '/month',
    amountPaise: 299900,
    features: [
      'Unlimited shipment tracking',
      'Pre-shipment compliance gate check',
      'OFAC sanctions screening',
      'FTA tariff savings calculator',
      'Checklist with 40+ compliance items',
      'Label Validator (AI vision)',
      'EU CBAM readiness tools',
      'RoDTEP duty drawback calculator',
      'PDF deal packs for lenders',
    ],
    highlight: true,
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: '₹9,999',
    period: '/month',
    amountPaise: 999900,
    features: [
      'Everything in Growth',
      'API access for lender integrations',
      'Multi-user company accounts',
      'Priority support',
      'Custom product checklists',
      'White-label deal packs',
    ],
    highlight: false,
  },
]

export function Upgrade({ onNavigate, currentPlan = 'free', blockedFeature }: UpgradeProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const { error: toastError } = useToast()

  const handleUpgrade = async (planId: 'growth' | 'enterprise', amountPaise: number) => {
    setLoading(planId)
    try {
      const { supabase } = await import('@/lib/supabase')
      const callbackUrl = `${window.location.origin}/?payment=success&plan=${planId}`
      const { data, error } = await supabase.functions.invoke('razorpay-create-link', {
        body: { plan: planId, amount_paise: amountPaise, callback_url: callbackUrl },
      })
      if (error || !data?.payment_link_url) {
        throw new Error(error?.message ?? 'Could not create payment link')
      }
      window.location.href = data.payment_link_url
    } catch (err: any) {
      toastError(`Payment setup failed: ${err.message}`)
      setLoading(null)
    }
  }

  return (
    <div style={{ padding: spacing.xl, maxWidth: 860, margin: '0 auto' }}>
      {blockedFeature && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: colors.surfaces.amberBg,
          border: `1px solid ${colors.status.pending}44`,
          borderRadius: borderRadius.md,
          fontSize: '0.875rem',
          color: colors.surfaces.amberText,
          marginBottom: spacing.xl,
        }}>
          <strong>{blockedFeature}</strong> requires a paid plan.
        </div>
      )}

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: `0 0 ${spacing.xs}`, color: colors.text }}>
        Upgrade to unlock full access
      </h2>
      <p style={{ color: colors.textMuted, margin: `0 0 ${spacing.xl}`, fontSize: '0.95rem' }}>
        Current plan: <strong style={{ textTransform: 'capitalize' }}>{currentPlan}</strong>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.lg }}>
        {PLANS.map(plan => (
          <div
            key={plan.id}
            style={{
              padding: spacing.xl,
              backgroundColor: plan.highlight ? colors.primary : colors.white,
              color: plan.highlight ? colors.white : colors.text,
              border: `2px solid ${plan.highlight ? colors.cta : colors.border}`,
              borderRadius: borderRadius.xl,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 4 }}>
                {plan.price}
                <span style={{ fontSize: '0.9rem', fontWeight: 400, opacity: 0.75 }}>{plan.period}</span>
              </div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {plan.features.map(f => (
                <li key={f} style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: 8, opacity: 0.9 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 4, flexShrink: 0, color: colors.cta }}><polyline points="20 6 9 17 4 12" /></svg>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(plan.id, plan.amountPaise)}
              disabled={loading !== null}
              style={{
                padding: '12px 20px',
                backgroundColor: colors.cta,
                color: colors.white,
                border: 'none',
                borderRadius: borderRadius.md,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                fontWeight: 700,
                opacity: loading && loading !== plan.id ? 0.5 : 1,
                transition: 'opacity 0.15s, background-color 0.15s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.ctaHover }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.cta }}
            >
              {loading === plan.id ? 'Opening payment…' : `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <p style={{ marginTop: spacing.xl, fontSize: '0.75rem', color: colors.textMuted, textAlign: 'center' }}>
        Secure payment via Razorpay · Cancel anytime · GST invoice provided
      </p>

      <div style={{ marginTop: spacing.lg, textAlign: 'center' }}>
        <button
          onClick={() => onNavigate('dashboard')}
          style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
        >
          Go back to dashboard
        </button>
      </div>
    </div>
  )
}
