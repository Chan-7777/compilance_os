import { useState } from 'react'
import { colors, spacing, borderRadius } from '@theme/index'
import { fetchRodtepRate } from '@/lib/api'
import { generateRoDTEPReport } from '@/lib/rodtep-report'
import type { CompanyProfile } from '@/types'

export interface RoDTEPCalculatorProps {
  companyProfile: CompanyProfile
}

function formatINR(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(2)} L`
  return `₹${v.toLocaleString('en-IN')}`
}

const PRESETS = [
  { label: '₹5L',  value: 500_000   },
  { label: '₹10L', value: 1_000_000 },
  { label: '₹50L', value: 5_000_000 },
  { label: '₹1Cr', value: 10_000_000 },
]

export function RoDTEPCalculator({ companyProfile }: RoDTEPCalculatorProps) {
  const [hsCode, setHsCode] = useState('')
  const [exportValue, setExportValue] = useState(1_000_000)
  const [result, setResult] = useState<{ rate: number; entitlement: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chapter = parseInt(hsCode.replace(/\D/g, '').slice(0, 2), 10)
  const notif60 = !isNaN(chapter) && chapter >= 25

  async function handleCalculate() {
    const digits = hsCode.replace(/\D/g, '')
    if (digits.length < 4) { setError('Enter at least a 4-digit HS code'); return }
    if (exportValue <= 0) { setError('Enter a valid export value'); return }
    setError(null)
    setLoading(true)
    try {
      const rate = await fetchRodtepRate(hsCode)
      setResult({ rate, entitlement: Math.round(exportValue * (rate / 100)) })
    } catch {
      setError('Could not fetch RoDTEP rate. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    backgroundColor: colors.white, border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md, color: colors.text,
    fontSize: '0.875rem', fontFamily: "'JetBrains Mono', monospace",
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.625rem', fontWeight: 600, color: colors.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: 1,
    display: 'block', marginBottom: spacing.xs,
  }

  return (
    <div style={{ padding: spacing.lg, maxWidth: 640 }}>
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, marginBottom: spacing.xs, color: colors.text }}>
          RoDTEP Recovery Calculator
        </h2>
        <p style={{ color: colors.textMuted, fontSize: '0.875rem', margin: 0 }}>
          Enter your HS code and FOB export value to estimate unclaimed RoDTEP entitlement.
        </p>
      </div>

      {/* Inputs */}
      <div style={{
        backgroundColor: colors.surface, borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border}`, padding: spacing.lg,
        marginBottom: spacing.lg,
      }}>
        <div style={{ marginBottom: spacing.md }}>
          <label style={labelStyle}>HS Code (4–8 digits)</label>
          <input
            type="text"
            placeholder="e.g. 72081000"
            value={hsCode}
            onChange={e => { setHsCode(e.target.value); setResult(null); setError(null) }}
            maxLength={10}
            style={inputStyle}
          />
          {notif60 && (
            <div style={{ fontSize: '0.7rem', color: colors.status.pending, marginTop: 4 }}>
              Chapter {chapter} — Notification 60/2025-26 revised rates apply
            </div>
          )}
        </div>

        <div style={{ marginBottom: spacing.md }}>
          <label style={labelStyle}>Export Value — FOB (₹)</label>
          <input
            type="number"
            value={exportValue}
            onChange={e => { setExportValue(Number(e.target.value) || 0); setResult(null) }}
            style={{ ...inputStyle, maxWidth: 240 }}
          />
          <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' as const }}>
            {PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => { setExportValue(p.value); setResult(null) }}
                style={{
                  padding: '4px 10px', borderRadius: borderRadius.sm, fontSize: '0.625rem', fontWeight: 600,
                  border: `1px solid ${exportValue === p.value ? colors.accent : colors.border}`,
                  backgroundColor: exportValue === p.value ? colors.accentSurface : 'transparent',
                  color: exportValue === p.value ? colors.surfaces.infoText : colors.textMuted,
                  cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ fontSize: '0.8rem', color: colors.status.error, marginBottom: spacing.sm }}>{error}</div>
        )}

        <button
          onClick={handleCalculate}
          disabled={loading}
          style={{
            padding: '10px 24px', backgroundColor: colors.accent, color: colors.white,
            border: 'none', borderRadius: borderRadius.md, fontSize: '0.875rem',
            fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
          }}
        >
          {loading ? 'Fetching rate…' : 'Calculate Entitlement'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{
          backgroundColor: colors.surfaces.successBg, borderRadius: borderRadius.lg,
          border: `2px solid ${colors.status.success}66`, padding: spacing.lg,
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.surfaces.successText, marginBottom: spacing.md }}>
            Estimated Entitlement
          </div>
          <div style={{ display: 'flex', gap: spacing.xl, flexWrap: 'wrap' as const, marginBottom: spacing.lg }}>
            <div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: colors.surfaces.successText, lineHeight: 1.1 }}>
                {formatINR(result.entitlement)}
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.surfaces.successText, marginTop: 2 }}>
                Unclaimed RoDTEP on {formatINR(exportValue)} export value
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: colors.text, lineHeight: 1.1 }}>
                {result.rate}%
              </div>
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: 2 }}>
                RoDTEP rate · Appendix 4R
              </div>
            </div>
          </div>

          {notif60 && (
            <div style={{
              padding: '8px 12px', backgroundColor: colors.surfaces.amberBg, borderRadius: borderRadius.md,
              border: `1px solid ${colors.status.pending}44`, fontSize: '0.75rem', color: colors.surfaces.amberText, marginBottom: spacing.md,
            }}>
              Notification 60/2025-26: rates for HS ch{chapter}+ were revised in Feb 2026. Rate shown is post-revision.
            </div>
          )}

          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button
              onClick={() => generateRoDTEPReport(hsCode, exportValue, result.rate, companyProfile.name || 'Exporter')}
              style={{
                padding: '8px 18px', backgroundColor: colors.accent, color: colors.white,
                border: 'none', borderRadius: borderRadius.md, fontSize: '0.8rem',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Download Report
            </button>
            <button
              onClick={() => { setHsCode(''); setExportValue(1_000_000); setResult(null) }}
              style={{
                padding: '8px 18px', backgroundColor: 'transparent', color: colors.textMuted,
                border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, fontSize: '0.8rem',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
