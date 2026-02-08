// ============================================================================
// Alert Generator - Generate regulatory alerts for export markets
// ============================================================================

import type { Alert, AlertSeverity, AlertType, CountryCode } from '@/types'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { FTA_DATABASE } from '@/data/fta'

/**
 * Generate alerts for selected countries based on regulatory changes,
 * deadlines, and FTA status
 */
export function generateAlerts(_product: string, countries: CountryCode[]): Alert[] {
  const alerts: Alert[] = []
  let id = 1

  countries.forEach(country => {
    const data = REGULATORY_DB[country]
    if (!data) return

    // ─── REGULATION CHANGE ALERTS ─────────────────────────────────────────
    const recentChanges = data.recentChanges || []
    recentChanges.forEach(change => {
      alerts.push({
        id: id++,
        type: 'regulation_change',
        severity: 'warning',
        country,
        countryName: data.name,
        flag: data.flag,
        date: change.date,
        message: change.change,
      })
    })

    // ─── CBAM DEADLINE ALERTS ─────────────────────────────────────────────
    if (data.cbam?.keyDates) {
      const now = new Date()

      data.cbam.keyDates.forEach(kd => {
        const deadline = new Date(kd.date)
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Only include future deadlines within the next year
        if (daysUntil > 0 && daysUntil < 365) {
          const severity: AlertSeverity = daysUntil < 90 ? 'critical' : 'warning'

          alerts.push({
            id: id++,
            type: 'deadline',
            severity,
            country,
            countryName: data.name,
            flag: data.flag,
            date: kd.date,
            message: `${kd.event} — ${daysUntil} days remaining`,
          })
        }
      })
    }

    // ─── FTA STATUS ALERTS ────────────────────────────────────────────────
    const fta = FTA_DATABASE[country]
    if (fta && fta.status === 'Under Negotiation') {
      alerts.push({
        id: id++,
        type: 'fta_update',
        severity: 'info',
        country,
        countryName: data.name,
        flag: data.flag,
        date: new Date().toISOString().split('T')[0],
        message: `${fta.name}: ${fta.notes}`,
      })
    }
  })

  // Sort by severity (critical first, then warning, then info)
  return sortAlertsBySeverity(alerts)
}

/**
 * Sort alerts by severity (critical > warning > info)
 */
export function sortAlertsBySeverity(alerts: Alert[]): Alert[] {
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }

  return [...alerts].sort((a, b) => {
    return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3)
  })
}

/**
 * Filter alerts by severity level
 */
export function filterAlertsBySeverity(
  alerts: Alert[],
  severity: AlertSeverity | 'all'
): Alert[] {
  if (severity === 'all') return alerts
  return alerts.filter(a => a.severity === severity)
}

/**
 * Filter alerts by country
 */
export function filterAlertsByCountry(alerts: Alert[], country: CountryCode): Alert[] {
  return alerts.filter(a => a.country === country)
}

/**
 * Filter alerts by type
 */
export function filterAlertsByType(alerts: Alert[], type: AlertType): Alert[] {
  return alerts.filter(a => a.type === type)
}

/**
 * Get count of alerts by severity
 */
export function getAlertCounts(alerts: Alert[]): {
  critical: number
  warning: number
  info: number
  total: number
} {
  return {
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
    total: alerts.length,
  }
}

/**
 * Get the highest severity level in the alerts
 */
export function getHighestSeverity(alerts: Alert[]): AlertSeverity | null {
  if (alerts.length === 0) return null
  if (alerts.some(a => a.severity === 'critical')) return 'critical'
  if (alerts.some(a => a.severity === 'warning')) return 'warning'
  return 'info'
}

/**
 * Get alerts that are within a certain number of days
 */
export function getUpcomingDeadlines(alerts: Alert[], withinDays: number): Alert[] {
  return alerts.filter(a => {
    if (a.type !== 'deadline') return false
    const match = a.message.match(/(\d+)\s*days?/)
    if (!match) return false
    const days = parseInt(match[1], 10)
    return days <= withinDays
  })
}

/**
 * Group alerts by country
 */
export function groupAlertsByCountry(alerts: Alert[]): Record<CountryCode, Alert[]> {
  return alerts.reduce(
    (acc, alert) => {
      const country = alert.country as CountryCode
      if (!acc[country]) {
        acc[country] = []
      }
      acc[country].push(alert)
      return acc
    },
    {} as Record<CountryCode, Alert[]>
  )
}

/**
 * Group alerts by type
 */
export function groupAlertsByType(alerts: Alert[]): Record<AlertType, Alert[]> {
  return alerts.reduce(
    (acc, alert) => {
      if (!acc[alert.type]) {
        acc[alert.type] = []
      }
      acc[alert.type].push(alert)
      return acc
    },
    {} as Record<AlertType, Alert[]>
  )
}
