// ============================================================================
// Checklist View - Compliance checklist with progress tracking
// ============================================================================

import { useState, useRef, useEffect } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/Tabs'
import { EmptyState } from '@/components/EmptyState'
import { Toast } from '@/components/Toast'
import { Spinner } from '@/components/Spinner'
import { useToast } from '@/hooks/useToast'
import { useComplianceAI } from '@/hooks/useComplianceAI'
import { colors, spacing, borderRadius, shadow } from '@/theme/index'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { searchHSProducts } from '@/data/hs-product-db'
import { fetchHSLookup, generateChecklistPDF } from '@/lib/api'
import type { HSLookupResult } from '@/lib/api'
import type { ChecklistItem, CountryCode } from '@/types'

export interface ChecklistProps {
  selectedProduct: string
  selectedCountries: CountryCode[]
  selectedHsCode?: string | null
  checklist: ChecklistItem[]
  checkedItems: Record<string, boolean>
  onToggleItem: (id: string | number) => void
  onUpdateHsProduct?: (hsCode: string | undefined, hsName: string | undefined) => void
}

export function Checklist({
  selectedProduct,
  selectedCountries,
  selectedHsCode,
  checklist,
  checkedItems,
  onToggleItem,
  onUpdateHsProduct,
}: ChecklistProps) {
  const isMobile = useMobile()
  const [activeTab, setActiveTab] = useState(0)
  const [showAllPhases, setShowAllPhases] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const { toasts, removeToast, success } = useToast()
  const { states: aiStates, explainItem } = useComplianceAI()

  // Inline product switcher
  const [searchOpen, setSearchOpen] = useState(false)
  const [hsQuery, setHsQuery] = useState('')
  const [hsResults, setHsResults] = useState<HSLookupResult[]>([])
  const [hsLoading, setHsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [searchOpen])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handleHsQuery = (q: string) => {
    setHsQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setHsResults([]); setHsLoading(false); return }

    const local = searchHSProducts(q).map(p => ({
      hsCode: p.hsCode, name: p.name, confidence: 'high' as const, reason: '', source: 'local' as const,
    }))
    setHsResults(local)
    setHsLoading(true)
    debounceRef.current = setTimeout(async () => {
      const api = await fetchHSLookup(q)
      const existing = new Set(local.map(r => r.hsCode))
      setHsResults([...api, ...local.filter(r => !existing.has(r.hsCode))].slice(0, 8))
      setHsLoading(false)
    }, 600)
  }

  const handlePickProduct = (r: HSLookupResult) => {
    onUpdateHsProduct?.(r.hsCode, r.name)
    setSearchOpen(false)
    setHsQuery('')
    setHsResults([])
    success(`Checklist updated for ${r.name}`)
  }

  const handleToggle = (itemId: string | number) => {
    const isCurrentlyChecked = checkedItems[String(itemId)]
    onToggleItem(itemId)

    if (!isCurrentlyChecked) {
      const item = checklist.find(i => i.id === itemId)
      success(`${item?.item || 'Item'} completed!`)
    }
  }

  // Group items by category
  const categories = [...new Set(checklist.map(item => item.category))]

  // Calculate progress
  const completedCount = checklist.filter(item => checkedItems[String(item.id)]).length
  const progress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0

  // Phase filtering
  const immediateItems = checklist.filter(item => item.phase?.toLowerCase() === 'immediate')
  const displayedChecklist = showAllPhases ? checklist : immediateItems

  const containerStyle: React.CSSProperties = {
    padding: spacing.lg,
  }

  const headerStyle: React.CSSProperties = {
    marginBottom: spacing.xl,
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: 0,
    marginBottom: spacing.xs,
    color: colors.text,
  }

  const progressContainerStyle: React.CSSProperties = {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
    boxShadow: shadow.sm,
  }

  const progressLabelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    fontSize: '0.875rem',
  }

  const progressBarContainerStyle: React.CSSProperties = {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  }

  const progressBarStyle: React.CSSProperties = {
    height: '100%',
    width: `${progress}%`,
    backgroundColor: progress === 100 ? colors.risk.low : colors.accent,
    transition: 'width 0.4s ease',
  }

  const categoryStyle: React.CSSProperties = {
    marginBottom: spacing.lg,
  }

  const categoryTitleStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: spacing.sm,
    color: colors.text,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  }

  const itemListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  }

  const itemStyle = (checked: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: checked ? `${colors.risk.low}11` : colors.white,
    border: `1px solid ${checked ? colors.risk.low : colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: shadow.sm,
  })

  const checkboxStyle: React.CSSProperties = {
    width: 18,
    height: 18,
    accentColor: colors.primary,
    cursor: 'pointer',
  }

  const itemTextStyle = (checked: boolean): React.CSSProperties => ({
    flex: 1,
    textDecoration: checked ? 'line-through' : 'none',
    color: checked ? colors.textMuted : colors.text,
  })

  const getPriorityVariant = (priority: ChecklistItem['priority']) => {
    switch (priority) {
      case 'critical':
        return 'danger' as const
      case 'high':
        return 'risk-high' as const
      case 'medium':
        return 'warning' as const
      default:
        return 'default' as const
    }
  }

  if (checklist.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Compliance Checklist</h2>
        </div>
        <EmptyState
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.risk.low }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
          title="No checklist items yet"
          description="Your compliance checklist will appear here based on your selected markets and products. Start by configuring your target markets in Settings."
          actionLabel="Go to Settings"
          onAction={() => window.location.hash = '#settings'}
        />
      </div>
    )
  }

  const handleMarkCategory = (category: string, checked: boolean) => {
    const categoryItems = displayedChecklist.filter(item => item.category === category)
    categoryItems.forEach(item => {
      const isCurrentlyChecked = !!checkedItems[String(item.id)]
      if (isCurrentlyChecked !== checked) {
        onToggleItem(item.id)
      }
    })
    success(checked ? `Marked all ${category} items complete` : `Reset all ${category} items`)
  }

  const handleGenerateDocPack = async () => {
    setPdfLoading(true)
    try {
      await generateChecklistPDF(selectedProduct, selectedCountries, checklist, checkedItems)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleExportChecklist = () => {
    const lines = categories.map(category => {
      const categoryItems = checklist.filter(item => item.category === category)
      const itemLines = categoryItems.map(item => {
        const checked = checkedItems[String(item.id)] ? '[x]' : '[ ]'
        return `  ${checked} [${item.priority}] ${item.item} (${item.phase})`
      })
      return `${category}:\n${itemLines.join('\n')}`
    })
    const text = `Compliance Checklist - ${selectedProduct}\nProgress: ${completedCount}/${checklist.length} (${progress}%)\n\n${lines.join('\n\n')}`
    navigator.clipboard.writeText(text).then(() => {
      success('Checklist copied to clipboard!')
    })
  }

  const renderChecklist = () => {
    const displayCategories = [...new Set(displayedChecklist.map(item => item.category))]
    return (
      <>
        {/* Phase filter banner */}
        {!showAllPhases && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${spacing.sm} ${spacing.md}`,
            backgroundColor: colors.accentSurface,
            borderRadius: borderRadius.md,
            border: `1px solid ${colors.accent}33`,
            marginBottom: spacing.md,
            fontSize: '0.875rem',
          }}>
            <span style={{ color: colors.text }}>
              Showing <strong>{immediateItems.length}</strong> immediate actions.
            </span>
            <button
              onClick={() => setShowAllPhases(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: colors.primary, fontWeight: 600, fontSize: '0.875rem',
                fontFamily: 'inherit', padding: 0,
              }}
            >
              Show all {checklist.length} tasks →
            </button>
          </div>
        )}
        {showAllPhases && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${spacing.sm} ${spacing.md}`,
            backgroundColor: colors.surface,
            borderRadius: borderRadius.md,
            border: `1px solid ${colors.border}`,
            marginBottom: spacing.md,
            fontSize: '0.875rem',
          }}>
            <span style={{ color: colors.text }}>
              Showing all <strong>{checklist.length}</strong> tasks across all phases.
            </span>
            <button
              onClick={() => setShowAllPhases(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: colors.primary, fontWeight: 600, fontSize: '0.875rem',
                fontFamily: 'inherit', padding: 0,
              }}
            >
              Show immediate only →
            </button>
          </div>
        )}

        {displayCategories.map(category => {
          const categoryItems = displayedChecklist.filter(item => item.category === category)
          const categoryComplete = categoryItems.filter(item => checkedItems[String(item.id)]).length
          const allComplete = categoryComplete === categoryItems.length

          return (
            <div key={category} style={categoryStyle}>
              <div style={{ ...categoryTitleStyle, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <span>{category}</span>
                  <Badge variant={allComplete ? 'success' : 'default'} size="sm">
                    {categoryComplete}/{categoryItems.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMarkCategory(category, !allComplete)}
                >
                  {allComplete ? 'Reset All' : 'Mark All'}
                </Button>
              </div>
              <div style={itemListStyle}>
                {categoryItems.map(item => {
                  const isChecked = !!checkedItems[String(item.id)]
                  const aiState = aiStates[String(item.id)]
                  return (
                    <div
                      key={item.id}
                      style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease', borderRadius: borderRadius.md }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = shadow.md }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <label
                        style={{
                          ...itemStyle(isChecked),
                          borderRadius: aiState
                            ? `${borderRadius.md} ${borderRadius.md} 0 0`
                            : borderRadius.md,
                          ...(item.priority === 'critical' && { borderLeft: `3px solid ${colors.risk.high}` }),
                          ...(item.priority === 'high' && { borderLeft: `3px solid ${colors.risk.medium}` }),
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggle(item.id)}
                          style={checkboxStyle}
                          aria-label={item.item}
                        />
                        <span style={itemTextStyle(isChecked)}>{item.item}</span>
                        <Badge variant={getPriorityVariant(item.priority)} size="sm">
                          {item.priority}
                        </Badge>
                        <Badge variant="default" size="sm">
                          {item.phase}
                        </Badge>
                        <button
                          onClick={e => {
                            e.preventDefault()
                            explainItem(item.id, item.item, {
                              hsCode: selectedHsCode,
                              product: selectedProduct,
                              countries: selectedCountries,
                            })
                          }}
                          style={{
                            background: 'none',
                            border: `1px solid ${aiState ? colors.accent : colors.accent + '44'}`,
                            borderRadius: '50%',
                            width: 20, height: 20,
                            cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '0.65rem', fontWeight: 700,
                            color: aiState ? colors.white : colors.accent,
                            backgroundColor: aiState ? colors.accent : 'transparent',
                            transition: 'all 0.15s',
                          }}
                          title="Explain this requirement"
                        >
                          ?
                        </button>
                      </label>
                      {aiState && (
                        <div style={{
                          padding: `${spacing.sm} ${spacing.md}`,
                          backgroundColor: colors.accentSurface,
                          borderRadius: `0 0 ${borderRadius.md} ${borderRadius.md}`,
                          border: `1px solid ${colors.accent}22`,
                          borderTop: 'none',
                          fontSize: '0.8rem',
                          color: colors.text,
                          lineHeight: 1.6,
                        }}>
                          {aiState.loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.textMuted }}>
                              <Spinner size="sm" />
                              <span>Asking Claude…</span>
                            </div>
                          ) : aiState.error ? (
                            <span style={{ color: colors.surfaces.dangerText }}>{aiState.error}</span>
                          ) : (
                            <span style={{ whiteSpace: 'pre-wrap' as const }}>{aiState.answer}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={{ ...headerStyle, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
        <div>
          <h2 style={titleStyle}>Compliance Checklist</h2>
          {/* Product context pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' as const }}>
            {/* Clickable product pill — opens inline search */}
            <button
              onClick={() => setSearchOpen(o => !o)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                backgroundColor: colors.accentSurface,
                border: `1px solid ${searchOpen ? colors.accent : colors.accent + '44'}`,
                borderRadius: borderRadius.full, padding: '4px 12px',
                fontSize: '0.8rem', color: colors.primary, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
                <polygon points="12 22.08 12 12 3 6.92 3 17.08 12 22.08" />
                <polygon points="12 22.08 21 17.08 21 6.92 12 12 12 22.08" />
                <polygon points="12 12 21 6.92 12 1.84 3 6.92 12 12" />
              </svg>
              <span>{selectedProduct}</span>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.6, transform: searchOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {selectedCountries.map(c => (
              <span key={c} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                backgroundColor: colors.surface, border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.full, padding: '3px 10px',
                fontSize: '0.8rem', color: colors.textMuted,
              }}>
                {REGULATORY_DB[c]?.flag} {c}
              </span>
            ))}
          </div>

          {/* Inline product search dropdown */}
          {searchOpen && onUpdateHsProduct && (
            <div style={{ marginTop: spacing.sm, position: 'relative', maxWidth: 420 }}>
              <input
                ref={inputRef}
                type="text"
                value={hsQuery}
                onChange={e => handleHsQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setHsQuery(''); setHsResults([]) } }}
                onBlur={() => setTimeout(() => setSearchOpen(false), 300)}
                placeholder="Search product or HS code…"
                style={{
                  width: '100%', padding: `${spacing.sm} ${spacing.md}`,
                  border: `1px solid ${colors.primary}`, borderRadius: borderRadius.lg,
                  fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' as const,
                  outline: 'none',
                }}
              />
              {(hsResults.length > 0 || hsLoading || (hsQuery.trim().length >= 2 && !hsLoading)) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  border: `1px solid ${colors.border}`, borderRadius: borderRadius.md,
                  backgroundColor: colors.white, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  maxHeight: 220, overflowY: 'auto' as const,
                }}>
                  {hsLoading && (
                    <div style={{ padding: '4px 12px', fontSize: '0.7rem', color: colors.textMuted, backgroundColor: colors.surface }}>
                      Searching…
                    </div>
                  )}
                  {!hsLoading && hsResults.length === 0 && (
                    <div style={{ padding: `${spacing.sm} ${spacing.md}`, fontSize: '0.8rem', color: colors.textMuted }}>
                      No results — try a different name or HS code
                    </div>
                  )}
                  {hsResults.map(r => (
                    <button
                      key={r.hsCode}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handlePickProduct(r)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: spacing.sm, width: '100%',
                        padding: `${spacing.sm} ${spacing.md}`, border: 'none',
                        borderBottom: `1px solid ${colors.border}`, background: 'none',
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const,
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: colors.primary, backgroundColor: colors.accentSurface, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' as const }}>
                        {r.hsCode}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: colors.text, flex: 1 }}>{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: spacing.sm, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateDocPack}
            disabled={pdfLoading || checklist.length === 0}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {pdfLoading ? (
                <>
                  <Spinner size="sm" color={colors.white} />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  <span>Generate Doc Pack</span>
                </>
              )}
            </span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportChecklist}>
            Copy to Clipboard
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={progressContainerStyle}>
        <div style={progressLabelStyle}>
          <span>
            {completedCount} of {checklist.length} items completed
          </span>
          <span style={{ fontWeight: 600, color: progress === 100 ? colors.risk.low : colors.text }}>
            {progress}% {progress === 100 && 'Complete'}
          </span>
        </div>
        <div style={progressBarContainerStyle} role="progressbar" aria-valuenow={progress}>
          <div style={progressBarStyle} />
        </div>
      </div>

      {/* Country Tabs (if multiple countries) */}
      {selectedCountries.length > 1 ? (
        <Tabs index={activeTab} onChange={setActiveTab}>
          <TabList>
            {selectedCountries.map(country => (
              <Tab key={country}>
                {REGULATORY_DB[country]?.flag} {country}
              </Tab>
            ))}
          </TabList>
          <TabPanels>
            {selectedCountries.map(country => (
              <TabPanel key={country}>{renderChecklist()}</TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      ) : (
        renderChecklist()
      )}

      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}
