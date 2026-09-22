import { describe, it, expect } from 'vitest'
import {
  realisationPeriodMonths,
  realisationDeadline,
  daysToRealisationDeadline,
  isRealisationOverdue,
  BRC_PERIOD_MONTHS_LEGACY,
  BRC_PERIOD_MONTHS_STANDARD,
  BRC_PERIOD_MONTHS_INR,
} from './brc'

describe('realisationPeriodMonths', () => {
  it('uses the legacy 9-month period for invoices before the rule change', () => {
    expect(realisationPeriodMonths('2026-09-30', 'USD')).toEqual({
      months: BRC_PERIOD_MONTHS_LEGACY, rupeeTerms: false, legacy: true,
    })
  })

  it('uses 15 months for a foreign-currency invoice from the rule change', () => {
    expect(realisationPeriodMonths('2026-10-01', 'USD')).toEqual({
      months: BRC_PERIOD_MONTHS_STANDARD, rupeeTerms: false, legacy: false,
    })
  })

  it('uses 18 months when the export is invoiced in rupees', () => {
    expect(realisationPeriodMonths('2026-10-01', 'INR')).toEqual({
      months: BRC_PERIOD_MONTHS_INR, rupeeTerms: true, legacy: false,
    })
  })

  it('uses 18 months when settlement is in rupees even if invoiced otherwise', () => {
    expect(realisationPeriodMonths('2026-11-01', 'USD', 'INR').months).toBe(BRC_PERIOD_MONTHS_INR)
  })

  it('is case and whitespace insensitive on currency', () => {
    expect(realisationPeriodMonths('2026-10-01', ' inr ').months).toBe(BRC_PERIOD_MONTHS_INR)
  })
})

describe('realisationDeadline', () => {
  it('adds 9 months for a pre-change invoice', () => {
    expect(realisationDeadline('2026-01-15', 'USD')).toBe('2026-10-15')
  })

  it('adds 15 months for a post-change foreign-currency invoice', () => {
    expect(realisationDeadline('2026-10-01', 'USD')).toBe('2028-01-01')
  })

  it('adds 18 months for a post-change rupee invoice', () => {
    expect(realisationDeadline('2026-10-01', 'INR')).toBe('2028-04-01')
  })

  it('clamps to the last day of a shorter month', () => {
    // 31 May + 9 months would be 31 February; must land on 29 Feb 2028 (leap).
    expect(realisationDeadline('2027-05-31', 'USD')).toBe('2028-08-31')
    expect(realisationDeadline('2026-05-31', 'USD')).toBe('2027-02-28')
  })

  it('returns null for a missing or unusable invoice date', () => {
    expect(realisationDeadline(null, 'USD')).toBeNull()
    expect(realisationDeadline('not-a-date', 'USD')).toBeNull()
  })
})

describe('daysToRealisationDeadline', () => {
  it('counts whole days remaining', () => {
    expect(daysToRealisationDeadline('2026-01-15', 'USD', '2026-10-10')).toBe(5)
  })

  it('goes negative once past the deadline', () => {
    expect(daysToRealisationDeadline('2026-01-15', 'USD', '2026-10-20')).toBe(-5)
  })
})

describe('isRealisationOverdue', () => {
  it('is never overdue once proceeds are realised', () => {
    expect(isRealisationOverdue('2020-01-01', 'USD', true, '2026-09-22')).toBe(false)
  })

  it('flags a pre-change invoice past 9 months', () => {
    expect(isRealisationOverdue('2025-11-29', 'USD', false, '2026-09-22')).toBe(true)
  })

  it('does not flag a post-change invoice that would have been overdue under the old rule', () => {
    // 12 months elapsed: breached under 9 months, compliant under 15.
    expect(isRealisationOverdue('2026-10-01', 'USD', false, '2027-10-01')).toBe(false)
  })

  it('gives rupee-invoiced exports the longer 18-month run', () => {
    // 16 months elapsed: overdue on standard terms, still compliant in rupees.
    expect(isRealisationOverdue('2026-10-01', 'USD', false, '2028-02-01')).toBe(true)
    expect(isRealisationOverdue('2026-10-01', 'INR', false, '2028-02-01')).toBe(false)
  })

  it('is not overdue on the deadline day itself', () => {
    expect(isRealisationOverdue('2026-01-15', 'USD', false, '2026-10-15')).toBe(false)
  })
})
