import { describe, it, expect } from 'vitest'
import { convertToINR, fxRateToINR, rateTableFor, fxIsEstimate, supportedCurrencies } from './fx'

describe('convertToINR', () => {
  it('applies the rate for each supported currency', () => {
    expect(convertToINR(1000, 'USD')).toBe(84_000)
    expect(convertToINR(1000, 'EUR')).toBe(91_000)
    expect(convertToINR(1000, 'GBP')).toBe(107_000)
    expect(convertToINR(1000, 'AED')).toBe(23_000)
    expect(convertToINR(1000, 'INR')).toBe(1_000)
  })

  it('is case and whitespace insensitive', () => {
    expect(convertToINR(100, ' usd ')).toBe(convertToINR(100, 'USD'))
  })

  it('falls back to USD for an unknown or missing currency', () => {
    expect(convertToINR(1000, 'JPY')).toBe(84_000)
    expect(convertToINR(1000, null)).toBe(84_000)
    expect(convertToINR(1000, undefined)).toBe(84_000)
    expect(convertToINR(1000, '')).toBe(84_000)
  })

  it('returns 0 rather than NaN for a non-finite value', () => {
    expect(convertToINR(NaN, 'USD')).toBe(0)
    expect(convertToINR(Infinity, 'USD')).toBe(0)
  })

  it('does not round — callers round at display', () => {
    expect(convertToINR(0.5, 'USD')).toBe(42)
    expect(convertToINR(1.005, 'INR')).toBe(1.005)
  })
})

describe('fxRateToINR', () => {
  it('flags when the currency was not in the table', () => {
    expect(fxRateToINR('USD').fellBackToDefault).toBe(false)
    expect(fxRateToINR('JPY').fellBackToDefault).toBe(true)
  })

  it('reports the source so callers can label estimates', () => {
    expect(fxRateToINR('USD').source).toBe('fallback')
  })
})

describe('rateTableFor', () => {
  it('selects the table in force on the given date', () => {
    expect(rateTableFor('2026-09-22').effectiveFrom).toBe('1970-01-01')
  })

  it('tolerates an unparseable date by falling back to today', () => {
    expect(rateTableFor('not-a-date').rates.USD).toBe(84)
  })

  it('accepts a Date as well as an ISO string', () => {
    expect(rateTableFor(new Date('2026-09-22')).rates.USD).toBe(84)
  })
})

describe('estimate flagging', () => {
  it('reports figures as estimates while no CBIC table is loaded', () => {
    // Guards the honesty requirement: until CBIC notified rates are loaded,
    // every rupee figure derived from these rates is an estimate and the UI
    // must be able to say so.
    expect(fxIsEstimate()).toBe(true)
  })

  it('exposes the currencies actually carried', () => {
    expect(supportedCurrencies().sort()).toEqual(['AED', 'EUR', 'GBP', 'INR', 'USD'])
  })
})
