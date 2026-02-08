import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateAlerts,
  filterAlertsBySeverity,
  filterAlertsByCountry,
  filterAlertsByType,
  getAlertCounts,
  sortAlertsBySeverity,
} from './alert-generator'
import type { CountryCode } from '@/types'

describe('Alert Generator', () => {
  // Mock date for consistent testing
  const mockDate = new Date('2025-06-01')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateAlerts', () => {
    describe('Basic Functionality', () => {
      it('returns an array of alerts', () => {
        const alerts = generateAlerts('steel', ['EU', 'US'])

        expect(Array.isArray(alerts)).toBe(true)
      })

      it('each alert has required properties', () => {
        const alerts = generateAlerts('food', ['EU', 'UK', 'UAE'])

        alerts.forEach(alert => {
          expect(alert).toHaveProperty('id')
          expect(alert).toHaveProperty('type')
          expect(alert).toHaveProperty('severity')
          expect(alert).toHaveProperty('country')
          expect(alert).toHaveProperty('countryName')
          expect(alert).toHaveProperty('flag')
          expect(alert).toHaveProperty('date')
          expect(alert).toHaveProperty('message')
        })
      })

      it('alerts have unique IDs', () => {
        const alerts = generateAlerts('steel', ['EU', 'US', 'UK', 'UAE', 'Japan', 'Australia'])
        const ids = alerts.map(a => a.id)
        const uniqueIds = new Set(ids)

        expect(uniqueIds.size).toBe(ids.length)
      })

      it('returns empty array for empty countries', () => {
        const alerts = generateAlerts('steel', [])

        expect(alerts).toHaveLength(0)
      })

      it('skips unknown countries', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const alerts = generateAlerts('steel', ['Unknown' as any, 'EU'])

        // Should only have EU alerts
        alerts.forEach(alert => {
          expect(alert.country).not.toBe('Unknown')
        })
      })

      it('type is valid enum value', () => {
        const alerts = generateAlerts('steel', ['EU', 'US'])
        const validTypes = ['regulation_change', 'deadline', 'fta_update']

        alerts.forEach(alert => {
          expect(validTypes).toContain(alert.type)
        })
      })

      it('severity is valid enum value', () => {
        const alerts = generateAlerts('food', ['EU', 'UK'])
        const validSeverities = ['critical', 'warning', 'info']

        alerts.forEach(alert => {
          expect(validSeverities).toContain(alert.severity)
        })
      })
    })

    describe('Regulation Change Alerts', () => {
      it('generates alerts from recentChanges', () => {
        const alerts = generateAlerts('steel', ['EU'])
        const regChanges = alerts.filter(a => a.type === 'regulation_change')

        expect(regChanges.length).toBeGreaterThan(0)
      })

      it('regulation change alerts have warning severity', () => {
        const alerts = generateAlerts('steel', ['EU'])
        const regChanges = alerts.filter(a => a.type === 'regulation_change')

        regChanges.forEach(alert => {
          expect(alert.severity).toBe('warning')
        })
      })

      it('includes country flag in alert', () => {
        const alerts = generateAlerts('steel', ['EU'])

        alerts.forEach(alert => {
          expect(alert.flag).toBeDefined()
          expect(alert.flag.length).toBeGreaterThan(0)
        })
      })

      it('includes country name in alert', () => {
        const alerts = generateAlerts('steel', ['EU'])
        const euAlerts = alerts.filter(a => a.country === 'EU')

        euAlerts.forEach(alert => {
          expect(alert.countryName).toBe('European Union')
        })
      })
    })

    describe('CBAM Deadline Alerts', () => {
      it('generates deadline alerts for EU CBAM', () => {
        const alerts = generateAlerts('steel', ['EU'])
        const deadlines = alerts.filter(a => a.type === 'deadline')

        expect(deadlines.length).toBeGreaterThan(0)
      })

      it('deadline alerts include days remaining', () => {
        const alerts = generateAlerts('steel', ['EU'])
        const deadlines = alerts.filter(a => a.type === 'deadline')

        deadlines.forEach(alert => {
          expect(alert.message).toMatch(/\d+\s*days?\s*(remaining|away|until|left)/i)
        })
      })

      it('near-term deadlines (<90 days) are critical', () => {
        // Set date close to a deadline
        vi.setSystemTime(new Date('2025-10-15')) // Close to 2025-12-31 deadline

        const alerts = generateAlerts('steel', ['EU'])
        const nearDeadlines = alerts.filter(
          a => a.type === 'deadline' && a.message.includes('2025-12-31')
        )

        if (nearDeadlines.length > 0) {
          nearDeadlines.forEach(alert => {
            expect(alert.severity).toBe('critical')
          })
        }
      })

      it('far-term deadlines (>90 days) are warning', () => {
        // Set date far from deadlines
        vi.setSystemTime(new Date('2024-06-01'))

        const alerts = generateAlerts('steel', ['EU'])
        const farDeadlines = alerts.filter(a => a.type === 'deadline')

        farDeadlines.forEach(alert => {
          // If more than 90 days away, should be warning
          const daysMatch = alert.message.match(/(\d+)\s*days?/)
          if (daysMatch) {
            const days = parseInt(daysMatch[1], 10)
            if (days > 90) {
              expect(alert.severity).toBe('warning')
            }
          }
        })
      })

      it('past deadlines are not included', () => {
        vi.setSystemTime(new Date('2024-01-01'))

        const alerts = generateAlerts('steel', ['EU'])
        const deadlines = alerts.filter(a => a.type === 'deadline')

        deadlines.forEach(alert => {
          // All deadlines should be in the future
          expect(alert.message).not.toMatch(/passed|expired|overdue/i)
        })
      })

      it('generates UK CBAM deadline alerts', () => {
        vi.setSystemTime(new Date('2026-06-01'))

        const alerts = generateAlerts('steel', ['UK'])
        const deadlines = alerts.filter(a => a.type === 'deadline')

        // UK CBAM starts 2027-01-01, message contains event text
        expect(deadlines.length).toBeGreaterThan(0)
        expect(deadlines.some(a => a.message.includes('UK CBAM'))).toBe(true)
      })
    })

    describe('FTA Status Alerts', () => {
      it('generates FTA alerts for countries under negotiation', () => {
        const alerts = generateAlerts('textiles', ['EU', 'UK'])
        const ftaAlerts = alerts.filter(a => a.type === 'fta_update')

        expect(ftaAlerts.length).toBeGreaterThan(0)
      })

      it('FTA negotiation alerts are info severity', () => {
        const alerts = generateAlerts('textiles', ['EU'])
        const ftaAlerts = alerts.filter(a => a.type === 'fta_update')

        ftaAlerts.forEach(alert => {
          expect(alert.severity).toBe('info')
        })
      })

      it('FTA alert includes agreement name', () => {
        const alerts = generateAlerts('textiles', ['EU'])
        const ftaAlerts = alerts.filter(a => a.type === 'fta_update')

        if (ftaAlerts.length > 0) {
          expect(ftaAlerts[0].message).toContain('India-EU FTA')
        }
      })

      it('no FTA alerts for active agreements', () => {
        const alerts = generateAlerts('textiles', ['UAE'])
        const ftaAlerts = alerts.filter(a => a.type === 'fta_update')

        // UAE has active CEPA, so no "under negotiation" alert
        expect(ftaAlerts).toHaveLength(0)
      })
    })

    describe('Alert Sorting', () => {
      it('alerts are sorted by severity (critical first)', () => {
        const alerts = generateAlerts('steel', ['EU', 'US', 'UK'])

        for (let i = 0; i < alerts.length - 1; i++) {
          const severityOrder = { critical: 0, warning: 1, info: 2 }
          const currentOrder = severityOrder[alerts[i].severity]
          const nextOrder = severityOrder[alerts[i + 1].severity]

          expect(currentOrder).toBeLessThanOrEqual(nextOrder)
        }
      })
    })

    describe('Multiple Countries', () => {
      it('generates alerts for all selected countries', () => {
        const countries: CountryCode[] = ['EU', 'US', 'UK']
        const alerts = generateAlerts('steel', countries)

        const alertCountries = new Set(alerts.map(a => a.country))

        // Should have alerts from at least some of the countries
        expect(alertCountries.size).toBeGreaterThan(0)
      })

      it('combines alerts from all countries', () => {
        const euAlerts = generateAlerts('steel', ['EU'])
        const usAlerts = generateAlerts('steel', ['US'])
        const combinedAlerts = generateAlerts('steel', ['EU', 'US'])

        // Combined should have alerts from both
        expect(combinedAlerts.length).toBeGreaterThanOrEqual(
          Math.min(euAlerts.length, usAlerts.length)
        )
      })
    })
  })

  describe('Helper Functions', () => {
    describe('filterAlertsBySeverity', () => {
      it('filters alerts by severity', () => {
        const alerts = generateAlerts('steel', ['EU', 'US', 'UK'])
        const critical = filterAlertsBySeverity(alerts, 'critical')

        critical.forEach(alert => {
          expect(alert.severity).toBe('critical')
        })
      })

      it('returns all alerts for "all" filter', () => {
        const alerts = generateAlerts('steel', ['EU', 'US'])
        const all = filterAlertsBySeverity(alerts, 'all')

        expect(all.length).toBe(alerts.length)
      })
    })

    describe('filterAlertsByCountry', () => {
      it('filters alerts by country', () => {
        const alerts = generateAlerts('steel', ['EU', 'US', 'UK'])
        const euOnly = filterAlertsByCountry(alerts, 'EU')

        euOnly.forEach(alert => {
          expect(alert.country).toBe('EU')
        })
      })
    })

    describe('filterAlertsByType', () => {
      it('filters alerts by type', () => {
        const alerts = generateAlerts('steel', ['EU', 'US'])
        const deadlines = filterAlertsByType(alerts, 'deadline')

        deadlines.forEach(alert => {
          expect(alert.type).toBe('deadline')
        })
      })
    })

    describe('getAlertCounts', () => {
      it('counts alerts by severity', () => {
        const alerts = generateAlerts('steel', ['EU', 'US', 'UK'])
        const counts = getAlertCounts(alerts)

        expect(counts).toHaveProperty('critical')
        expect(counts).toHaveProperty('warning')
        expect(counts).toHaveProperty('info')
        expect(counts).toHaveProperty('total')

        expect(counts.total).toBe(alerts.length)
        expect(counts.critical + counts.warning + counts.info).toBe(counts.total)
      })
    })

    describe('sortAlertsBySeverity', () => {
      it('sorts alerts with critical first', () => {
        const alerts = generateAlerts('steel', ['EU', 'US', 'UK'])
        const sorted = sortAlertsBySeverity(alerts)

        for (let i = 0; i < sorted.length - 1; i++) {
          const severityOrder = { critical: 0, warning: 1, info: 2 }
          expect(severityOrder[sorted[i].severity]).toBeLessThanOrEqual(
            severityOrder[sorted[i + 1].severity]
          )
        }
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles product with no special alerts', () => {
      const alerts = generateAlerts('general', ['UAE'])

      // Should still have some alerts (regulation changes, etc.)
      expect(Array.isArray(alerts)).toBe(true)
    })

    it('handles all countries at once', () => {
      const allCountries: CountryCode[] = ['EU', 'US', 'UK', 'UAE', 'Japan', 'Australia']
      const alerts = generateAlerts('steel', allCountries)

      expect(alerts.length).toBeGreaterThan(0)
    })
  })
})
