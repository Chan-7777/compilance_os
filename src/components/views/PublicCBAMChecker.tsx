import { useState } from 'react'
import { getCBAMSector, isCBAMScope } from '@/data/cbam-hs-codes'
import { colors, spacing, borderRadius } from '@theme/index'

const CBAM_TIMELINE = [
  { date: 'Oct 2023 – Dec 2025', label: 'Transitional phase', detail: 'Report embedded emissions — no levy yet' },
  { date: 'Jan 2026',            label: 'CBAM levy begins',   detail: 'Pay for carbon certificates on covered imports' },
  { date: 'Jan 2034',            label: 'Full phase-in',      detail: 'Free EU ETS allowances fully phased out' },
]

interface HSResult {
  code: string
  sector: string | null
  inScope: boolean
}

export function PublicCBAMChecker() {
  const [inputs, setInputs] = useState(['', '', ''])
  const [results, setResults] = useState<HSResult[] | null>(null)

  function handleCheck() {
    const checked = inputs
      .map(c => c.trim())
      .filter(c => c.replace(/\D/g, '').length >= 4)
      .map(code => ({
        code,
        sector: getCBAMSector(code),
        inScope: isCBAMScope(code, 'EU'),
      }))
    if (checked.length > 0) setResults(checked)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', backgroundColor: '#fff',
    border: `1px solid ${colors.border}`, borderRadius: borderRadius.md,
    color: colors.text, fontSize: '0.875rem',
    fontFamily: "'JetBrains Mono', monospace", outline: 'none', boxSizing: 'border-box',
  }

  const anyInScope = results?.some(r => r.inScope)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1a1a1a', padding: `${spacing.lg} ${spacing.xl}`, display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: '#888' }}>ComplianceOS</div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: `${spacing.xl} ${spacing.lg}` }}>
        {/* Hero */}
        <div style={{ marginBottom: spacing.xl }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#2563EB', marginBottom: spacing.xs }}>
            Free CBAM Exposure Check
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: colors.text, margin: 0, marginBottom: spacing.sm, lineHeight: 1.2 }}>
            Is your EU export subject to CBAM?
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
            The EU Carbon Border Adjustment Mechanism (CBAM) started levying carbon costs in Jan 2026.
            Enter up to 3 HS codes to check exposure instantly — no login required.
          </p>
        </div>

        {/* Input card */}
        <div style={{
          backgroundColor: '#fff', borderRadius: borderRadius.lg,
          border: `1px solid ${colors.border}`, padding: spacing.lg, marginBottom: spacing.lg,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: colors.textMuted, marginBottom: spacing.md }}>
            Enter HS Codes (4–8 digits)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.md }}>
            {inputs.map((val, i) => (
              <input
                key={i}
                type="text"
                placeholder={`HS Code ${i + 1} — e.g. 72081000`}
                value={val}
                onChange={e => {
                  const next = [...inputs]
                  next[i] = e.target.value
                  setInputs(next)
                  setResults(null)
                }}
                maxLength={10}
                style={inputStyle}
              />
            ))}
          </div>
          <button
            onClick={handleCheck}
            style={{
              padding: '10px 24px', backgroundColor: '#2563EB', color: '#fff',
              border: 'none', borderRadius: borderRadius.md, fontSize: '0.875rem',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Check CBAM Exposure
          </button>
        </div>

        {/* Results */}
        {results && (
          <div style={{ marginBottom: spacing.xl }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: colors.textMuted, marginBottom: spacing.md }}>
              Results
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.lg }}>
              {results.map(r => (
                <div key={r.code} style={{
                  padding: spacing.md, borderRadius: borderRadius.md,
                  border: `1px solid ${r.inScope ? '#FCA5A5' : '#BBF7D0'}`,
                  backgroundColor: r.inScope ? '#FFF5F5' : '#F0FDF4',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md,
                }}>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.95rem', color: colors.text }}>
                      {r.code}
                    </div>
                    {r.inScope && r.sector && (
                      <div style={{ fontSize: '0.75rem', color: '#C53030', marginTop: 2 }}>
                        Sector: {r.sector}
                      </div>
                    )}
                    {!r.inScope && (
                      <div style={{ fontSize: '0.75rem', color: '#16A34A', marginTop: 2 }}>
                        Not in CBAM Annex I scope
                      </div>
                    )}
                  </div>
                  <div style={{
                    padding: '4px 12px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                    backgroundColor: r.inScope ? '#DC2626' : '#16A34A', color: '#fff',
                    flexShrink: 0,
                  }}>
                    {r.inScope ? 'COVERED' : 'NOT COVERED'}
                  </div>
                </div>
              ))}
            </div>

            {anyInScope && (
              <div style={{
                padding: spacing.md, backgroundColor: '#FFF7ED', borderRadius: borderRadius.md,
                border: '1px solid #FED7AA', fontSize: '0.8rem', color: '#92400E', marginBottom: spacing.lg,
              }}>
                <strong>Reporting obligation active:</strong> You must report embedded emissions for CBAM-covered goods exported to the EU. CBAM levy applies from Jan 2026 — unclaimed exemptions and under-reporting carry financial penalties.
              </div>
            )}

            {/* Timeline */}
            <div style={{
              backgroundColor: '#fff', borderRadius: borderRadius.lg, border: `1px solid ${colors.border}`,
              padding: spacing.lg, marginBottom: spacing.lg,
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: colors.textMuted, marginBottom: spacing.md }}>
                CBAM 2026 Timeline
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {CBAM_TIMELINE.map(t => (
                  <div key={t.date} style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: '#2563EB', fontWeight: 700, minWidth: 140, flexShrink: 0 }}>
                      {t.date}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.text }}>{t.label}</div>
                      <div style={{ fontSize: '0.72rem', color: colors.textMuted }}>{t.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{
              backgroundColor: '#EFF6FF', borderRadius: borderRadius.lg,
              border: '2px solid #BFDBFE', padding: spacing.lg, textAlign: 'center',
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1E40AF', marginBottom: spacing.xs }}>
                Get your full RoDTEP entitlement estimate
              </div>
              <div style={{ fontSize: '0.8rem', color: '#3B82F6', marginBottom: spacing.md }}>
                Indian exporters leave ₹ crores in RoDTEP rebates unclaimed every year. Sign up free to see yours.
              </div>
              <a
                href="/"
                style={{
                  display: 'inline-block', padding: '10px 28px', backgroundColor: '#2563EB', color: '#fff',
                  borderRadius: borderRadius.md, fontSize: '0.875rem', fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Sign up free — see my RoDTEP estimate →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
