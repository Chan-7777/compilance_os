// ============================================================================
// Checklist View - Compliance checklist with progress tracking
// ============================================================================

import { useState } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/Tabs'
import { EmptyState } from '@/components/EmptyState'
import { Toast } from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import { colors, spacing, borderRadius } from '@/theme/index'
import { REGULATORY_DB } from '@/data/regulatory-db'
import type { ChecklistItem, CountryCode } from '@/types'

export interface ChecklistProps {
  selectedProduct: string
  selectedCountries: CountryCode[]
  checklist: ChecklistItem[]
  checkedItems: Record<string, boolean>
  onToggleItem: (id: string | number) => void
}

export function Checklist({
  selectedProduct,
  selectedCountries,
  checklist,
  checkedItems,
  onToggleItem,
}: ChecklistProps) {
  const [activeTab, setActiveTab] = useState(0)
  const { toasts, removeToast, success } = useToast()

  const handleToggle = (itemId: string | number) => {
    const isCurrentlyChecked = checkedItems[String(itemId)]
    onToggleItem(itemId)

    if (!isCurrentlyChecked) {
      const item = checklist.find(i => i.id === itemId)
      success(`✓ ${item?.item || 'Item'} completed!`)
    }
  }

  // Group items by category
  const categories = [...new Set(checklist.map(item => item.category))]

  // Calculate progress
  const completedCount = checklist.filter(item => checkedItems[String(item.id)]).length
  const progress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0

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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
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
    backgroundColor: progress === 100 ? colors.risk.low : colors.orange,
    transition: 'width 0.3s ease',
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
  })

  const checkboxStyle: React.CSSProperties = {
    width: 18,
    height: 18,
    accentColor: colors.orange,
    cursor: 'pointer',
  }

  const itemTextStyle = (checked: boolean): React.CSSProperties => ({
    flex: 1,
    textDecoration: checked ? 'line-through' : 'none',
    color: checked ? colors.textMuted : colors.text,
  })

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: spacing['2xl'],
    color: colors.textMuted,
  }

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
          icon="✓"
          title="No checklist items yet"
          description="Your compliance checklist will appear here based on your selected markets and products. Start by configuring your target markets in Settings."
          actionLabel="Go to Settings"
          onAction={() => window.location.hash = '#settings'}
        />
      </div>
    )
  }

  const handleMarkCategory = (category: string, checked: boolean) => {
    const categoryItems = checklist.filter(item => item.category === category)
    categoryItems.forEach(item => {
      const isCurrentlyChecked = !!checkedItems[String(item.id)]
      if (isCurrentlyChecked !== checked) {
        onToggleItem(item.id)
      }
    })
    success(checked ? `Marked all ${category} items complete` : `Reset all ${category} items`)
  }

  const handleExportChecklist = () => {
    const lines = categories.map(category => {
      const categoryItems = checklist.filter(item => item.category === category)
      const itemLines = categoryItems.map(item => {
        const checked = checkedItems[String(item.id)] ? '✓' : '☐'
        return `  ${checked} [${item.priority}] ${item.item} (${item.phase})`
      })
      return `${category}:\n${itemLines.join('\n')}`
    })
    const text = `Compliance Checklist - ${selectedProduct}\nProgress: ${completedCount}/${checklist.length} (${progress}%)\n\n${lines.join('\n\n')}`
    navigator.clipboard.writeText(text).then(() => {
      success('Checklist copied to clipboard!')
    })
  }

  const renderChecklist = () => (
    <>
      {categories.map(category => {
        const categoryItems = checklist.filter(item => item.category === category)
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
                return (
                  <label
                    key={item.id}
                    style={itemStyle(isChecked)}
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
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )

  return (
    <div style={containerStyle}>
      <div style={{ ...headerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={titleStyle}>Compliance Checklist</h2>
        <Button variant="secondary" size="sm" onClick={handleExportChecklist}>
          Copy to Clipboard
        </Button>
      </div>

      {/* Progress Bar */}
      <div style={progressContainerStyle}>
        <div style={progressLabelStyle}>
          <span>
            {completedCount} of {checklist.length} items completed
          </span>
          <span style={{ fontWeight: 600, color: progress === 100 ? colors.risk.low : colors.text }}>
            {progress}% {progress === 100 && '✓ Complete'}
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
