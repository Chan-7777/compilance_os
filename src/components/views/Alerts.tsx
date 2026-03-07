// ============================================================================
// Alerts View - Regulatory alerts with filtering
// ============================================================================

import { useState } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { colors, spacing, borderRadius } from '@theme/index'
import type { Alert, AlertSeverity } from '@/types'

export interface AlertsProps {
  alerts: Alert[]
  activeFilter: 'all' | AlertSeverity
  onFilterChange: (filter: 'all' | AlertSeverity) => void
}

const filterOptions: Array<{ id: 'all' | AlertSeverity; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'warning', label: 'Warning' },
  { id: 'info', label: 'Info' },
]

export function Alerts({ alerts, activeFilter, onFilterChange }: AlertsProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Count alerts by severity
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

  const alertMetaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: '0.75rem',
    color: colors.textMuted,
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

  const formatAlertType = (type: string) => {
    return type.replace(/_/g, ' ')
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Regulatory Alerts</h2>
      </div>

      {/* Alert Counts */}
      <div style={countsStyle}>
        <div style={countItemStyle}>
          <Badge variant="danger" size="sm">
            Critical
          </Badge>
          <span data-testid="count-critical">{counts.critical}</span>
        </div>
        <div style={countItemStyle}>
          <Badge variant="warning" size="sm">
            Warning
          </Badge>
          <span data-testid="count-warning">{counts.warning}</span>
        </div>
        <div style={countItemStyle}>
          <Badge variant="info" size="sm">
            Info
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
        <div style={alertListStyle}>
          {sortedAlerts.map(alert => {
            const isExpanded = expandedId === alert.id
            return (
              <div
                key={alert.id}
                style={{
                  ...alertCardStyle,
                  cursor: 'pointer',
                  flexDirection: 'column',
                  borderColor: isExpanded ? colors.primary : colors.border,
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
                        {alert.severity}
                      </Badge>
                    </div>
                    <div style={alertMessageStyle}>{alert.message}</div>
                    <div style={alertMetaStyle}>
                      <span style={alertTypeStyle}>{formatAlertType(alert.type)}</span>
                      <span>•</span>
                      <span>{alert.date}</span>
                    </div>
                  </div>
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
                    <div style={{ fontSize: '0.875rem', marginBottom: spacing.sm }}>
                      <strong>Impact Assessment:</strong>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: colors.text, marginBottom: spacing.sm }}>
                      {alert.severity === 'critical'
                        ? 'This requires immediate attention. Non-compliance may result in shipment delays, fines, or rejection at customs.'
                        : alert.severity === 'warning'
                          ? 'Action recommended within 30 days. This may affect future shipments to this destination.'
                          : 'For informational purposes. Monitor for updates that may change compliance requirements.'
                      }
                    </div>
                    <div style={{ display: 'flex', gap: spacing.sm, fontSize: '0.75rem', color: colors.textMuted }}>
                      <span>Type: {formatAlertType(alert.type)}</span>
                      <span>•</span>
                      <span>Market: {alert.countryName}</span>
                      <span>•</span>
                      <span>Date: {alert.date}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
