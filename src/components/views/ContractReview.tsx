// ============================================================================
// Export Contract Review — AI-powered Indian export contract analysis
// ============================================================================

import { useState, useRef } from 'react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { colors, spacing, borderRadius, shadow, fontFamily } from '@theme/index'
import { reviewExportContract } from '@/lib/api'
import type {
  ContractReviewResult, ContractRedFlag, ContractKeyTerm,
  ContractMissingProvision, ContractNegotiability, ContractProtectiveClause,
  ContractType, PartyPosition,
} from '@/lib/api'

const ff = fontFamily.sans
const ffMono = fontFamily.mono

export interface ContractReviewProps {
  selectedProduct?: string
  selectedCountries?: readonly string[]
}

const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string; desc: string }[] = [
  { value: 'sale_contract',     label: 'Export Sale Contract',       desc: 'Purchase order or export sales agreement' },
  { value: 'letter_of_credit',  label: 'Letter of Credit',           desc: 'Documentary credit (LC/DC)' },
  { value: 'freight_agreement', label: 'Freight / Forwarder',        desc: 'Shipping line or freight forwarder agreement' },
  { value: 'bank_guarantee',    label: 'Bank Guarantee',             desc: 'Performance, advance payment, or standby LC' },
  { value: 'insurance_policy',  label: 'Marine Insurance',           desc: 'Cargo or marine insurance policy' },
  { value: 'other',             label: 'Other',                      desc: 'Any other trade document' },
]

const VERDICT_CONFIG = {
  clear:  { label: 'CLEAR TO SIGN', color: colors.status.success, bg: colors.surfaces.successBg },
  review: { label: 'REVIEW NEEDED', color: colors.risk.medium,    bg: colors.surfaces.warningBg },
  risky:  { label: 'DO NOT SIGN',   color: colors.risk.high,      bg: colors.surfaces.dangerBg  },
}

const SEVERITY_COLOR = {
  critical: colors.risk.high,
  high:     colors.risk.medium,
  medium:   colors.risk.low,
  low:      colors.textMuted,
}

const SEVERITY_BG = {
  critical: colors.surfaces.dangerBg,
  high:     colors.surfaces.warningBg,
  medium:   colors.surfaces.successBg,
  low:      colors.surfaces.neutralBg,
}

const RATING_COLOR = {
  favourable:   colors.status.success,
  standard:     colors.textMuted,
  unfavourable: colors.risk.high,
}

const REALISTIC_COLOR = {
  high:   colors.status.success,
  medium: colors.risk.medium,
  low:    colors.risk.high,
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ContractReview({ selectedCountries }: ContractReviewProps) {
  const [mode, setMode] = useState<'text' | 'upload'>('text')
  const [contractText, setContractText] = useState('')
  const [uploadedFile, setUploadedFile] = useState<{ name: string; base64: string } | null>(null)
  const [contractType, setContractType] = useState<ContractType>('sale_contract')
  const [partyPosition, setPartyPosition] = useState<PartyPosition>('exporter')
  const [counterpartyCountry, setCounterpartyCountry] = useState(selectedCountries?.[0] ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ContractReviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'flags' | 'terms' | 'missing' | 'negotiate' | 'protect'>('flags')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileAdd = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const base64 = await fileToBase64(file)
    setUploadedFile({ name: file.name, base64 })
    setResult(null)
    setError(null)
  }

  const handleReview = async () => {
    const hasInput = mode === 'text' ? contractText.trim().length > 50 : !!uploadedFile
    if (!hasInput) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await reviewExportContract({
        contractText:       mode === 'text' ? contractText : undefined,
        base64:             mode === 'upload' ? uploadedFile?.base64 : undefined,
        fileName:           mode === 'upload' ? uploadedFile?.name : undefined,
        contractType,
        partyPosition,
        counterpartyCountry: counterpartyCountry || undefined,
      })
      setResult(res)
      setActiveTab('flags')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Review failed — please try again')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = mode === 'text' ? contractText.trim().length > 50 : !!uploadedFile

  const criticalCount = result?.red_flags.filter(f => f.severity === 'critical').length ?? 0
  const highCount     = result?.red_flags.filter(f => f.severity === 'high').length ?? 0
  const femaCount     = result?.rbi_fema_flags.length ?? 0

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: borderRadius.md, border: 'none',
    background: active ? colors.primary : 'transparent',
    color: active ? '#fff' : colors.textMuted,
    fontSize: '0.8125rem', fontWeight: active ? 600 : 400,
    cursor: 'pointer', fontFamily: ff, transition: '150ms',
  })

  const selectSt: React.CSSProperties = {
    padding: '8px 12px', border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md, background: colors.white,
    color: colors.text, fontSize: '0.875rem', fontFamily: ff,
    cursor: 'pointer', outline: 'none',
  }

  return (
    <div style={{ padding: spacing.lg, maxWidth: 820 }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, marginBottom: spacing.xs, color: colors.text }}>
          Export Contract Review
        </h2>
        <p style={{ color: colors.textMuted, fontSize: '0.875rem', margin: 0 }}>
          AI review tailored to Indian export law — LC terms, RBI/FEMA obligations, INCOTERMS, DGFT, and market standard benchmarks.
        </p>
      </div>

      {/* Config row */}
      <div style={{
        background: colors.surface, border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, boxShadow: shadow.sm,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing.md, marginBottom: spacing.md }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Contract Type
            </label>
            <select value={contractType} onChange={e => setContractType(e.target.value as ContractType)} style={{ ...selectSt, width: '100%' }}>
              {CONTRACT_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Your Position
            </label>
            <select value={partyPosition} onChange={e => setPartyPosition(e.target.value as PartyPosition)} style={{ ...selectSt, width: '100%' }}>
              <option value="exporter">Exporter (Seller)</option>
              <option value="buyer">Buyer (Importer)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Counterparty Country
            </label>
            <input
              type="text"
              placeholder="e.g. UAE, USA, Germany"
              value={counterpartyCountry}
              onChange={e => setCounterpartyCountry(e.target.value)}
              style={{ ...selectSt, width: '100%', boxSizing: 'border-box' as const }}
            />
          </div>
        </div>

        {/* Input mode tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: spacing.md, background: colors.background, borderRadius: borderRadius.md, padding: 4, width: 'fit-content' }}>
          {(['text', 'upload'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)} style={tabStyle(mode === m)}>
              {m === 'text' ? 'Paste Text' : 'Upload File'}
            </button>
          ))}
        </div>

        {mode === 'text' ? (
          <textarea
            value={contractText}
            onChange={e => { setContractText(e.target.value); setResult(null); setError(null) }}
            placeholder="Paste the contract text here — key clauses, payment terms, LC conditions, INCOTERMS, dispute resolution, etc."
            rows={10}
            style={{
              width: '100%', padding: spacing.md,
              border: `1px solid ${colors.border}`, borderRadius: borderRadius.md,
              background: colors.background, color: colors.text,
              fontSize: '0.875rem', fontFamily: ffMono, lineHeight: 1.6,
              resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const,
            }}
          />
        ) : (
          <div>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
              onChange={e => handleFileAdd(e.target.files)} />
            {uploadedFile ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: spacing.sm,
                padding: spacing.md, background: colors.accentSurface,
                border: `1px solid ${colors.accent}30`, borderRadius: borderRadius.md,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.text, flex: 1 }}>{uploadedFile.name}</span>
                <button type="button" onClick={() => { setUploadedFile(null); setResult(null) }} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: '2px 6px',
                }}>✕</button>
              </div>
            ) : (
              <div
                style={{
                  border: `2px dashed ${colors.border}`, borderRadius: borderRadius.lg,
                  padding: spacing.xl, textAlign: 'center' as const,
                  background: colors.background, cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = colors.accent }}
                onDragLeave={e => { e.currentTarget.style.borderColor = colors.border }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = colors.border; handleFileAdd(e.dataTransfer.files) }}
              >
                <div style={{ fontSize: '0.875rem', color: colors.textMuted }}>
                  Drop contract image or PDF here, or <span style={{ color: colors.accent, fontWeight: 600 }}>click to upload</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: spacing.md }}>
          <Button variant="primary" size="md" onClick={handleReview} loading={loading} disabled={!canSubmit || loading}>
            {loading ? 'Reviewing…' : 'Review Contract'}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: spacing.md, backgroundColor: colors.surfaces.dangerBg,
          border: `1px solid ${colors.risk.high}33`, borderLeft: `3px solid ${colors.risk.high}`,
          borderRadius: borderRadius.md, color: colors.surfaces.dangerText,
          fontSize: '0.875rem', marginBottom: spacing.lg,
        }}>{error}</div>
      )}

      {/* Result */}
      {result && (
        <div>
          {/* Verdict banner */}
          <div style={{
            padding: spacing.lg,
            backgroundColor: VERDICT_CONFIG[result.verdict].bg,
            borderRadius: borderRadius.lg,
            border: `1px solid ${VERDICT_CONFIG[result.verdict].color}33`,
            borderLeft: `4px solid ${VERDICT_CONFIG[result.verdict].color}`,
            marginBottom: spacing.lg, boxShadow: shadow.sm,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap' as const }}>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.08em', color: VERDICT_CONFIG[result.verdict].color,
              }}>{VERDICT_CONFIG[result.verdict].label}</span>
              <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' as const }}>
                {criticalCount > 0 && <Badge variant="danger-soft" size="sm">{criticalCount} critical</Badge>}
                {highCount > 0 && <Badge variant="warning-soft" size="sm">{highCount} high-risk</Badge>}
                {femaCount > 0 && <Badge variant="warning-soft" size="sm">{femaCount} RBI/FEMA</Badge>}
                {result.red_flags.length === 0 && <Badge variant="success-soft" size="sm">No red flags</Badge>}
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: colors.textMuted }}>
                Risk score: <strong style={{ fontFamily: ffMono }}>{result.risk_score}/100</strong>
              </div>
            </div>
            {result.contract_type_detected && (
              <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginBottom: spacing.xs }}>
                Detected: <strong style={{ color: colors.text }}>{result.contract_type_detected}</strong>
              </div>
            )}
            <p style={{ margin: 0, fontSize: '0.875rem', color: colors.text, lineHeight: 1.65 }}>
              {result.summary}
            </p>
          </div>

          {/* RBI/FEMA flags — always shown if any */}
          {result.rbi_fema_flags.length > 0 && (
            <div style={{
              padding: spacing.md,
              background: colors.surfaces.warningBg,
              border: `1px solid ${colors.risk.medium}33`,
              borderLeft: `3px solid ${colors.risk.medium}`,
              borderRadius: borderRadius.md,
              marginBottom: spacing.lg,
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.risk.medium, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: spacing.sm }}>
                RBI / FEMA Compliance Flags
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.rbi_fema_flags.map((flag, i) => (
                  <li key={i} style={{ fontSize: '0.8125rem', color: colors.text, lineHeight: 1.5 }}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* INCOTERMS note */}
          {result.incoterms_notes && (
            <div style={{
              padding: spacing.md,
              background: colors.surfaces.infoBg,
              border: `1px solid ${colors.accent}33`,
              borderLeft: `3px solid ${colors.accent}`,
              borderRadius: borderRadius.md,
              marginBottom: spacing.lg,
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.accent, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: spacing.xs }}>
                INCOTERMS Analysis
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.text, lineHeight: 1.6 }}>{result.incoterms_notes}</p>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: spacing.lg, background: colors.surface, borderRadius: borderRadius.md, padding: 4, border: `1px solid ${colors.border}`, width: 'fit-content' }}>
            {([
              { key: 'flags',     label: `Red Flags (${result.red_flags.length})` },
              { key: 'terms',     label: `Key Terms (${result.key_terms.length})` },
              { key: 'missing',   label: `Missing (${result.missing_provisions.length})` },
              { key: 'negotiate', label: `Negotiate (${result.negotiability.length})` },
              { key: 'protect',   label: `🛡 Protect Me (${result.protective_clauses?.length ?? 0})` },
            ] as const).map(tab => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={tabStyle(activeTab === tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Red Flags */}
          {activeTab === 'flags' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing.sm }}>
              {result.red_flags.length === 0 ? (
                <div style={{ padding: spacing.xl, textAlign: 'center' as const, color: colors.textMuted, fontSize: '0.875rem', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg }}>
                  No red flags identified.
                </div>
              ) : (
                result.red_flags.map((flag: ContractRedFlag, i: number) => (
                  <div key={i} style={{
                    padding: spacing.md,
                    background: SEVERITY_BG[flag.severity],
                    border: `1px solid ${SEVERITY_COLOR[flag.severity]}22`,
                    borderLeft: `3px solid ${SEVERITY_COLOR[flag.severity]}`,
                    borderRadius: borderRadius.md, boxShadow: shadow.sm,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                      <Badge variant={flag.severity === 'critical' ? 'danger-soft' : flag.severity === 'high' ? 'warning-soft' : 'success-soft'} size="sm">
                        {flag.severity.toUpperCase()}
                      </Badge>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.text }}>{flag.clause}</span>
                    </div>
                    {flag.current_text && (
                      <div style={{
                        fontFamily: ffMono, fontSize: '0.75rem', color: colors.textMuted,
                        background: 'rgba(0,0,0,0.04)', padding: '5px 9px',
                        borderRadius: borderRadius.sm, marginBottom: spacing.xs,
                        borderLeft: `2px solid ${colors.border}`,
                      }}>
                        {flag.current_text}
                      </div>
                    )}
                    <div style={{ fontSize: '0.875rem', color: colors.text }}>{flag.risk}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab: Key Terms */}
          {activeTab === 'terms' && (
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg, overflow: 'hidden', boxShadow: shadow.sm }}>
              {result.key_terms.length === 0 ? (
                <div style={{ padding: spacing.xl, textAlign: 'center' as const, color: colors.textMuted, fontSize: '0.875rem' }}>No key terms extracted.</div>
              ) : (
                result.key_terms.map((term: ContractKeyTerm, i: number) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
                    gap: spacing.md, padding: `${spacing.sm} ${spacing.md}`,
                    borderBottom: i < result.key_terms.length - 1 ? `1px solid ${colors.border}` : 'none',
                    alignItems: 'center',
                  }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.text }}>{term.term}</div>
                    <div style={{ fontSize: '0.8125rem', color: colors.text, fontFamily: ffMono }}>{term.value}</div>
                    <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{term.market_standard}</div>
                    <div style={{
                      fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em', color: RATING_COLOR[term.rating],
                      background: `${RATING_COLOR[term.rating]}15`,
                      padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' as const,
                    }}>
                      {term.rating}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab: Missing Provisions */}
          {activeTab === 'missing' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing.sm }}>
              {result.missing_provisions.length === 0 ? (
                <div style={{ padding: spacing.xl, textAlign: 'center' as const, color: colors.textMuted, fontSize: '0.875rem', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg }}>
                  No missing provisions identified.
                </div>
              ) : (
                result.missing_provisions.map((mp: ContractMissingProvision, i: number) => (
                  <div key={i} style={{
                    padding: spacing.md,
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderLeft: `3px solid ${mp.importance === 'critical' ? colors.risk.high : colors.risk.medium}`,
                    borderRadius: borderRadius.md, boxShadow: shadow.sm,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                      <Badge variant={mp.importance === 'critical' ? 'danger-soft' : 'warning-soft'} size="sm">
                        {mp.importance.toUpperCase()}
                      </Badge>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.text }}>{mp.provision}</span>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: '0.8125rem', color: colors.textMuted, lineHeight: 1.6 }}>{mp.why}</p>
                    {mp.suggested_language && (
                      <div style={{
                        fontFamily: ffMono, fontSize: '0.75rem', color: colors.text,
                        background: colors.accentSurface, border: `1px solid ${colors.accent}22`,
                        padding: '8px 12px', borderRadius: borderRadius.sm, lineHeight: 1.6,
                      }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: colors.accent, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Suggested Language</div>
                        {mp.suggested_language}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab: Negotiability */}
          {activeTab === 'negotiate' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing.sm }}>
              {result.negotiability.length === 0 ? (
                <div style={{ padding: spacing.xl, textAlign: 'center' as const, color: colors.textMuted, fontSize: '0.875rem', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg }}>
                  No negotiation suggestions.
                </div>
              ) : (
                result.negotiability.map((n: ContractNegotiability, i: number) => (
                  <div key={i} style={{
                    padding: spacing.md,
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md, boxShadow: shadow.sm,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.text }}>{n.clause}</span>
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const,
                        letterSpacing: '0.05em', color: REALISTIC_COLOR[n.realistic],
                        background: `${REALISTIC_COLOR[n.realistic]}15`,
                        padding: '2px 9px', borderRadius: 99,
                      }}>{n.realistic} chance</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 3 }}>Current</div>
                        <div style={{ fontSize: '0.8125rem', color: colors.text, lineHeight: 1.5 }}>{n.current}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.accent, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 3 }}>Ask For</div>
                        <div style={{ fontSize: '0.8125rem', color: colors.text, lineHeight: 1.5 }}>{n.suggested_change}</div>
                      </div>
                    </div>
                    {n.reason && (
                      <div style={{ marginTop: spacing.sm, fontSize: '0.75rem', color: colors.textMuted, lineHeight: 1.5 }}>{n.reason}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab: Protect Me */}
          {activeTab === 'protect' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing.md }}>
              <div style={{
                padding: spacing.md,
                background: colors.accentSurface,
                border: `1px solid ${colors.accent}30`,
                borderRadius: borderRadius.md,
                fontSize: '0.8125rem', color: colors.text, lineHeight: 1.6,
              }}>
                <strong style={{ color: colors.accent }}>Ready-to-paste protective clauses</strong> — drafted specifically for this contract type and counterparty. Copy any clause and add it to your contract before signing.
              </div>
              {!result.protective_clauses || result.protective_clauses.length === 0 ? (
                <div style={{ padding: spacing.xl, textAlign: 'center' as const, color: colors.textMuted, fontSize: '0.875rem', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg }}>
                  No protective clauses generated.
                </div>
              ) : (
                result.protective_clauses.map((clause: ContractProtectiveClause, i: number) => (
                  <div key={i} style={{
                    padding: spacing.md,
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderLeft: `3px solid ${colors.accent}`,
                    borderRadius: borderRadius.md, boxShadow: shadow.sm,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.xs }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: colors.text }}>{clause.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(clause.language).then(() => {
                            setCopiedIdx(i)
                            setTimeout(() => setCopiedIdx(null), 2000)
                          })
                        }}
                        style={{
                          flexShrink: 0, padding: '4px 12px',
                          background: copiedIdx === i ? colors.status.success : colors.background,
                          border: `1px solid ${copiedIdx === i ? colors.status.success : colors.border}`,
                          borderRadius: borderRadius.md, cursor: 'pointer',
                          fontSize: '0.75rem', fontWeight: 600,
                          color: copiedIdx === i ? '#fff' : colors.textMuted,
                          fontFamily: ff, transition: '150ms',
                        }}
                      >
                        {copiedIdx === i ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: colors.textMuted, lineHeight: 1.5 }}>{clause.purpose}</p>
                    <div style={{
                      fontFamily: ffMono, fontSize: '0.75rem', color: colors.text,
                      background: colors.background, border: `1px solid ${colors.border}`,
                      padding: '10px 14px', borderRadius: borderRadius.sm, lineHeight: 1.75,
                      whiteSpace: 'pre-wrap' as const,
                    }}>
                      {clause.language}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div style={{
          padding: spacing.xl, textAlign: 'center' as const,
          color: colors.textMuted, fontSize: '0.875rem',
          border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg,
          background: colors.surface,
        }}>
          <div style={{ marginBottom: spacing.sm, fontSize: '1.5rem' }}>📋</div>
          <strong style={{ color: colors.text, display: 'block', marginBottom: spacing.xs }}>
            Protect your export proceeds before you sign
          </strong>
          Paste contract text or upload an image. Claude checks against FEMA repatriation rules, LC soft clauses, INCOTERMS misuse, and 41 Indian-export-specific risk categories.
          <div style={{ marginTop: spacing.lg, display: 'flex', gap: spacing.md, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            {['Export realisation period', 'LC soft clauses', 'INCOTERMS 2020', 'DGFT obligations', 'Arbitration risk', 'Force majeure'].map(t => (
              <span key={t} style={{
                fontSize: '0.75rem', color: colors.textMuted,
                background: colors.background, border: `1px solid ${colors.border}`,
                padding: '3px 10px', borderRadius: 99,
              }}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
