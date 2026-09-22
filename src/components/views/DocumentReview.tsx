// ============================================================================
// Document Review — AI-powered pre-shipment document compliance check
// ============================================================================

import { useState, useRef } from 'react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { colors, spacing, borderRadius, shadow } from '@theme/index'
import { reviewDocuments } from '@/lib/api'
import type { DocumentReviewResult, DocumentReviewIssue } from '@/lib/api'
import type { CompanyProfile } from '@/types'

interface UploadedDoc {
  id: string
  name: string
  base64: string
  type: 'invoice' | 'packing_list' | 'shipping_bill' | 'other'
  size: number
}

export interface DocumentReviewProps {
  companyProfile: CompanyProfile
  selectedProduct: string
  selectedCountries: readonly string[]
}

const DOC_TYPE_LABELS: Record<UploadedDoc['type'], string> = {
  invoice: 'Commercial Invoice',
  packing_list: 'Packing List',
  shipping_bill: 'Shipping Bill Draft',
  other: 'Other Document',
}

const SEVERITY_COLORS = {
  critical: colors.risk.high,
  warning: colors.risk.medium,
  info: colors.accent,
}

const SEVERITY_BG = {
  critical: colors.surfaces.dangerBg,
  warning: colors.surfaces.warningBg,
  info: colors.surfaces.infoBg,
}

const VERDICT_CONFIG = {
  pass: { label: 'CLEAR TO SHIP', color: colors.status.success, bg: colors.surfaces.successBg },
  flag: { label: 'REVIEW NEEDED', color: colors.risk.medium, bg: colors.surfaces.warningBg },
  fail: { label: 'DO NOT SHIP', color: colors.risk.high, bg: colors.surfaces.dangerBg },
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentReview({ selectedProduct, selectedCountries }: DocumentReviewProps) {
  const [docs, setDocs] = useState<UploadedDoc[]>([])
  const [hsCode, setHsCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DocumentReviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileAdd = async (files: FileList | null) => {
    if (!files) return
    const newDocs: UploadedDoc[] = []
    for (const file of Array.from(files)) {
      if (docs.length + newDocs.length >= 5) break
      const base64 = await fileToBase64(file)
      const name = file.name.toLowerCase()
      let type: UploadedDoc['type'] = 'other'
      if (name.includes('invoice') || name.includes('inv')) type = 'invoice'
      else if (name.includes('packing') || name.includes('pack')) type = 'packing_list'
      else if (name.includes('shipping') || name.includes('bill') || name.includes('sb')) type = 'shipping_bill'
      newDocs.push({ id: crypto.randomUUID(), name: file.name, base64, type, size: file.size })
    }
    setDocs(prev => [...prev, ...newDocs])
    setResult(null)
    setError(null)
  }

  const handleTypeChange = (id: string, type: UploadedDoc['type']) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, type } : d))
  }

  const handleRemove = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id))
    setResult(null)
  }

  const handleReview = async () => {
    if (docs.length === 0) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await reviewDocuments(
        docs.map(d => ({ name: d.name, base64: d.base64, type: d.type })),
        {
          hsCode: hsCode || undefined,
          destinationCountry: selectedCountries[0] || undefined,
          product: selectedProduct || undefined,
        }
      )
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Review failed — please try again')
    } finally {
      setLoading(false)
    }
  }

  const criticalCount = result?.issues.filter(i => i.severity === 'critical').length ?? 0
  const warningCount = result?.issues.filter(i => i.severity === 'warning').length ?? 0

  return (
    <div style={{ padding: spacing.lg, maxWidth: 760 }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, marginBottom: spacing.xs, color: colors.text }}>
          Document Review
        </h2>
        <p style={{ color: colors.textMuted, fontSize: '0.875rem', margin: 0 }}>
          Upload your commercial invoice, packing list, and shipping bill draft — Claude reviews all three for mismatches and missing fields before customs.
        </p>
      </div>

      {/* Upload area */}
      <div
        style={{
          border: `2px dashed ${colors.border}`,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          textAlign: 'center' as const,
          backgroundColor: colors.surface,
          cursor: 'pointer',
          marginBottom: spacing.md,
          transition: 'border-color 0.15s ease',
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = colors.accent }}
        onDragLeave={e => { e.currentTarget.style.borderColor = colors.border }}
        onDrop={e => {
          e.preventDefault()
          e.currentTarget.style.borderColor = colors.border
          handleFileAdd(e.dataTransfer.files)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={e => handleFileAdd(e.target.files)}
        />
        <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>📄</div>
        <div style={{ fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
          Drop documents here or click to upload
        </div>
        <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
          Invoice, Packing List, Shipping Bill · PNG, JPG, PDF · Max 5 files
        </div>
      </div>

      {/* Uploaded doc list */}
      {docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing.sm, marginBottom: spacing.lg }}>
          {docs.map(doc => (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', gap: spacing.sm,
              padding: spacing.md,
              backgroundColor: colors.white,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              boxShadow: shadow.sm,
            }}>
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>
                {doc.type === 'invoice' ? '🧾' : doc.type === 'packing_list' ? '📦' : doc.type === 'shipping_bill' ? '🚢' : '📄'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{formatBytes(doc.size)}</div>
              </div>
              <select
                value={doc.type}
                onChange={e => handleTypeChange(doc.id, e.target.value as UploadedDoc['type'])}
                style={{
                  fontSize: '0.8rem', padding: '4px 8px',
                  border: `1px solid ${colors.border}`, borderRadius: borderRadius.sm,
                  backgroundColor: colors.surface, color: colors.text,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                {(Object.keys(DOC_TYPE_LABELS) as UploadedDoc['type'][]).map(t => (
                  <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <button
                onClick={() => handleRemove(doc.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, fontSize: '1rem', padding: '4px', flexShrink: 0 }}
                aria-label="Remove document"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* HS Code + run */}
      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-end', marginBottom: spacing.xl, flexWrap: 'wrap' as const }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>
            HS Code (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. 7208.51"
            value={hsCode}
            onChange={e => setHsCode(e.target.value)}
            style={{
              width: '100%', padding: `${spacing.sm} ${spacing.md}`,
              border: `1px solid ${colors.border}`, borderRadius: borderRadius.md,
              backgroundColor: colors.white, color: colors.text,
              fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box' as const,
            }}
          />
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleReview}
          loading={loading}
          disabled={docs.length === 0 || loading}
        >
          {loading ? 'Reviewing…' : `Review ${docs.length > 0 ? `${docs.length} document${docs.length > 1 ? 's' : ''}` : 'documents'}`}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: spacing.md, backgroundColor: colors.surfaces.dangerBg,
          border: `1px solid ${colors.risk.high}33`, borderLeft: `3px solid ${colors.risk.high}`,
          borderRadius: borderRadius.md, color: colors.surfaces.dangerText,
          fontSize: '0.875rem', marginBottom: spacing.lg,
        }}>
          {error}
        </div>
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
            marginBottom: spacing.lg,
            boxShadow: shadow.sm,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.8px', color: VERDICT_CONFIG[result.verdict].color,
              }}>
                {VERDICT_CONFIG[result.verdict].label}
              </span>
              <div style={{ display: 'flex', gap: spacing.xs }}>
                {criticalCount > 0 && (
                  <Badge variant="danger-soft" size="sm">{criticalCount} critical</Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="warning-soft" size="sm">{warningCount} warnings</Badge>
                )}
                {result.issues.length === 0 && (
                  <Badge variant="success-soft" size="sm">No issues found</Badge>
                )}
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: colors.textMuted }}>
                Risk score: <strong>{result.score}/100</strong>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: colors.text, lineHeight: 1.6 }}>
              {result.summary}
            </p>
          </div>

          {/* Issues list */}
          {result.issues.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing.sm }}>
              {result.issues.map((issue: DocumentReviewIssue, idx: number) => (
                <div key={idx} style={{
                  padding: spacing.md,
                  backgroundColor: SEVERITY_BG[issue.severity],
                  border: `1px solid ${SEVERITY_COLORS[issue.severity]}22`,
                  borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity]}`,
                  borderRadius: borderRadius.md,
                  boxShadow: shadow.sm,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                    <Badge
                      variant={issue.severity === 'critical' ? 'danger-soft' : issue.severity === 'warning' ? 'warning-soft' : 'info-soft'}
                      size="sm"
                    >
                      {issue.severity.toUpperCase()}
                    </Badge>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.text }}>
                      {issue.field}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: colors.text, marginBottom: spacing.xs }}>
                    {issue.finding}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted, display: 'flex', gap: spacing.xs, alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, fontWeight: 600 }}>Fix:</span>
                    <span>{issue.fix}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state hint */}
      {docs.length === 0 && !result && (
        <div style={{
          padding: spacing.xl, textAlign: 'center' as const,
          color: colors.textMuted, fontSize: '0.875rem',
          border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg,
          backgroundColor: colors.surface,
        }}>
          <div style={{ marginBottom: spacing.sm, fontSize: '1.5rem' }}>🛡️</div>
          <strong style={{ color: colors.text, display: 'block', marginBottom: spacing.xs }}>
            One rejected shipment costs ₹2–15 lakh
          </strong>
          Upload your documents above. Claude checks for the exact mismatches that cause customs queries — HS code vs product description, missing declarations, cross-document inconsistencies.
        </div>
      )}
    </div>
  )
}
