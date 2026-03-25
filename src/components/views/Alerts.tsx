// ============================================================================
// Alerts View - Regulatory alerts with filtering
// ============================================================================

import { useState, useEffect } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { colors, spacing, borderRadius } from '@theme/index'
import type { Alert, AlertSeverity } from '@/types'

const DISMISSED_KEY = 'cos_dismissed_alerts'
const PAGE_SIZE = 20

export interface AlertsProps {
  alerts: Alert[]
  activeFilter: 'all' | AlertSeverity
  onFilterChange: (filter: 'all' | AlertSeverity) => void
}

const filterOptions: Array<{ id: 'all' | AlertSeverity; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Urgent' },
  { id: 'warning', label: 'Review soon' },
  { id: 'info', label: 'FYI' },
]

function loadDismissed(): number[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    return raw ? (JSON.parse(raw) as number[]) : []
  } catch {
    return []
  }
}

function saveDismissed(ids: number[]): void {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids))
}

function getDeadlineCountdown(dateStr: string): { label: string; color: string } | null {
  try {
    const deadline = new Date(dateStr)
    if (isNaN(deadline.getTime())) return null
    const now = new Date()
    const diffMs = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)}d overdue`, color: colors.risk?.high ?? '#DC2626' }
    }
    const label = diffDays === 0 ? 'Due today' : diffDays === 1 ? '1 day left' : `${diffDays} days left`
    if (diffDays <= 7) return { label, color: colors.risk?.high ?? '#DC2626' }
    if (diffDays <= 30) return { label, color: '#D97706' }
    return { label, color: colors.textMuted ?? '#6B7280' }
  } catch {
    return null
  }
}

export function Alerts({ alerts, activeFilter, onFilterChange }: AlertsProps) {
  const isMobile = useMobile()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dismissedIds, setDismissedIds] = useState<number[]>(() => loadDismissed())
  const [showDismissed, setShowDismissed] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Sync dismissedIds to localStorage whenever they change
  useEffect(() => {
    saveDismissed(dismissedIds)
  }, [dismissedIds])

  const dismissAlert = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissedIds(prev => [...prev, id])
    if (expandedId === id) setExpandedId(null)
  }

  const markAllRead = () => {
    const allIds = alerts.map(a => a.id)
    setDismissedIds(allIds)
    setExpandedId(null)
  }

  // Count alerts by severity (all, including dismissed)
  const counts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  }

  // Filter by severity and search
  const filteredAlerts =
    activeFilter === 'all' ? alerts : alerts.filter(a => a.severity === activeFilter)
  const searchedAlerts = searchQuery
    ? filteredAlerts.filter(a =>
      a.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.countryName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : filteredAlerts
  const sortedAlerts = [...searchedAlerts].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  // Split into active vs dismissed
  const activeAlerts = sortedAlerts.filter(a => !dismissedIds.includes(a.id))
  const dismissedAlerts = sortedAlerts.filter(a => dismissedIds.includes(a.id))
  const dismissedCount = dismissedAlerts.length

  // Paginate active alerts
  const visibleAlerts = activeAlerts.slice(0, visibleCount)
  const totalActive = activeAlerts.length
  const showPagination = totalActive > PAGE_SIZE

  const containerStyle: React.CSSProperties = {
    padding: spacing.lg,
  }

  const headerStyle: React.CSSProperties = {
    marginBottom: spacing.xl,
  }

  const titleRowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'flex-start' : 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: 0,
    color: colors.text,
  }

  const countsStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  }

  const countItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
  }

  const filterBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: 'fit-content',
  }

  const alertListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  }

  const alertCardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
  }

  const alertIconStyle: React.CSSProperties = {
    fontSize: '1.5rem',
  }

  const alertContentStyle: React.CSSProperties = {
    flex: 1,
  }

  const alertHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  }

  const alertTypeStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: colors.textMuted,
    textTransform: 'capitalize',
  }

  const alertMessageStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: colors.text,
    marginBottom: spacing.xs,
  }

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: spacing['2xl'],
    color: colors.textMuted,
  }

  const getSeverityVariant = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'danger' as const
      case 'warning':
        return 'warning' as const
      default:
        return 'info' as const
    }
  }

  const getSeverityLabel = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'Urgent'
      case 'warning':
        return 'Review soon'
      default:
        return 'FYI'
    }
  }

  const getImpactText = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'This affects your next shipment — act now to avoid delays or fines at customs.'
      case 'warning':
        return 'Review within 30 days — this may affect future shipments.'
      default:
        return 'For your awareness — monitor for changes.'
    }
  }

  const formatAlertType = (type: string) => {
    return type.replace(/_/g, ' ')
  }

  const renderAlertCard = (alert: Alert, isDismissed = false) => {
    const isExpanded = expandedId === alert.id
    const countdown = alert.type === 'deadline' ? getDeadlineCountdown(alert.date) : null

    return (
      <div
        key={alert.id}
        style={{
          ...alertCardStyle,
          cursor: 'pointer',
          flexDirection: 'column',
          borderColor: isExpanded ? colors.primary : colors.border,
          opacity: isDismissed ? 0.55 : 1,
        }}
        data-testid="alert-card"
        onClick={() => setExpandedId(isExpanded ? null : alert.id)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            setExpandedId(isExpanded ? null : alert.id)
          }
        }}
        aria-expanded={isExpanded}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md, width: '100%' }}>
          <span style={alertIconStyle}>{alert.flag}</span>
          <div style={alertContentStyle}>
            <div style={alertHeaderStyle}>
              <span style={{ fontWeight: 600 }}>{alert.countryName}</span>
              <Badge
                variant={getSeverityVariant(alert.severity)}
                size="sm"
                data-testid={`severity-${alert.severity}`}
              >
                {getSeverityLabel(alert.severity)}
              </Badge>
            </div>
            {/* Plain-language impact text — always visible, shown first */}
            <div style={{
              fontSize: '0.8rem',
              color: alert.severity === 'critical' ? colors.risk.high : alert.severity === 'warning' ? '#D97706' : colors.textMuted,
              fontWeight: 500,
              marginBottom: spacing.xs,
              lineHeight: 1.4,
            }}>
              {getImpactText(alert.severity)}
            </div>
            <div style={alertMessageStyle}>{alert.message}</div>
          </div>
          {/* Dismiss button */}
          {!isDismissed && (
            <button
              onClick={e => dismissAlert(alert.id, e)}
              title="Dismiss alert"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: colors.textMuted,
                padding: `0 ${spacing.xs}`,
                flexShrink: 0,
                lineHeight: 1,
              }}
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          )}
          <span style={{ fontSize: '0.75rem', color: colors.textMuted, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
            ▼
          </span>
        </div>
        {isExpanded && (
          <div style={{
            width: '100%',
            marginTop: spacing.md,
            paddingTop: spacing.md,
            borderTop: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', gap: spacing.sm, fontSize: '0.75rem', color: colors.textMuted, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={alertTypeStyle}>Type: {formatAlertType(alert.type)}</span>
              <span>•</span>
              <span>Market: {alert.countryName}</span>
              <span>•</span>
              <span>Date: {alert.date}</span>
              {countdown && (
                <>
                  <span>•</span>
                  <span style={{
                    fontWeight: 600,
                    color: countdown.color,
                    backgroundColor: `${countdown.color}18`,
                    padding: '1px 6px',
                    borderRadius: borderRadius.sm,
                    fontSize: '0.7rem',
                  }}>
                    {countdown.label}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleRowStyle}>
          <h2 style={titleStyle}>Regulatory Updates</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            title="Dismiss all visible alerts"
          >
            Mark all read
          </Button>
        </div>
      </div>

      {/* Alert Counts */}
      <div style={countsStyle}>
        <div style={countItemStyle}>
          <Badge variant="danger" size="sm">
            Urgent
          </Badge>
          <span data-testid="count-critical">{counts.critical}</span>
        </div>
        <div style={countItemStyle}>
          <Badge variant="warning" size="sm">
            Review soon
          </Badge>
          <span data-testid="count-warning">{counts.warning}</span>
        </div>
        <div style={countItemStyle}>
          <Badge variant="info" size="sm">
            FYI
          </Badge>
          <span data-testid="count-info">{counts.info}</span>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div style={{ marginBottom: spacing.lg }}>
        <input
          type="text"
          placeholder="Search alerts..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: spacing.sm,
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.md,
            fontSize: '0.875rem',
            marginBottom: spacing.sm,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={filterBarStyle}>
          {filterOptions.map(option => (
            <Button
              key={option.id}
              variant={activeFilter === option.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onFilterChange(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      {alerts.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No regulatory alerts"
          description="We'll notify you when new regulations affecting your selected markets and products are announced. Make sure you've configured your target markets in Settings."
          actionLabel="Go to Settings"
          onAction={() => window.location.hash = '#settings'}
        />
      ) : sortedAlerts.length === 0 ? (
        <div style={emptyStyle}>
          <p>No {activeFilter} alerts</p>
        </div>
      ) : (
        <>
          {/* Showing X of Y count (only when paginated) */}
          {showPagination && (
            <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginBottom: spacing.sm }}>
              Showing {Math.min(visibleCount, totalActive)} of {totalActive} alerts
            </div>
          )}

          <div style={alertListStyle}>
            {visibleAlerts.map(alert => renderAlertCard(alert, false))}
          </div>

          {/* Load more */}
          {visibleCount < totalActive && (
            <div style={{ textAlign: 'center', marginTop: spacing.lg }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              >
                Load more
              </Button>
            </div>
          )}

          {/* Dismissed alerts section */}
          {dismissedCount > 0 && (
            <div style={{ marginTop: spacing.xl }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                  {dismissedCount} dismissed
                </span>
                <button
                  onClick={() => setShowDismissed(v => !v)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: colors.primary,
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  {showDismissed ? 'Hide dismissed' : 'Show dismissed'}
                </button>
                {showDismissed && (
                  <button
                    onClick={() => setDismissedIds([])}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: colors.textMuted,
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    Restore all
                  </button>
                )}
              </div>
              {showDismissed && (
                <div style={alertListStyle}>
                  {dismissedAlerts.map(alert => renderAlertCard(alert, true))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
