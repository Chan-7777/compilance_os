import { describe, it, expect } from 'vitest'
import {
  deriveFobValue,
  rodtepEntitlement,
  isRodtepNotified,
  RODTEP_NOTIFIED_UNTIL,
} from './rodtep'

describe('deriveFobValue', () => {
  it('passes an FOB value through exactly', () => {
    expect(deriveFobValue({ value: 100000, basis: 'fob' })).toEqual({ fob: 100000, assumed: false })
  })

  it('subtracts freight and insurance from a CIF value', () => {
    // This is the over-claim bug: 100000 CIF is NOT 100000 of claimable FOB.
    expect(deriveFobValue({ value: 100000, basis: 'cif', freight: 8000, insurance: 1200 }))
      .toEqual({ fob: 90800, assumed: false })
  })

  it('subtracts freight only from a CFR value', () => {
    expect(deriveFobValue({ value: 100000, basis: 'cfr', freight: 8000 }))
      .toEqual({ fob: 92000, assumed: false })
  })

  it('refuses to guess when a CIF value has no freight or insurance', () => {
    const r = deriveFobValue({ value: 100000, basis: 'cif' })
    expect(r.fob).toBeNull()
    expect(r.note).toMatch(/freight and insurance/i)
  })

  it('refuses to guess when a CFR value has no freight', () => {
    expect(deriveFobValue({ value: 100000, basis: 'cfr' }).fob).toBeNull()
  })

  it('treats an unrecorded Incoterm as FOB but flags the assumption', () => {
    const r = deriveFobValue({ value: 100000, basis: 'unknown' })
    expect(r.fob).toBe(100000)
    expect(r.assumed).toBe(true)
    expect(r.note).toMatch(/overstated/i)
  })

  it('never returns a negative FOB when charges exceed the value', () => {
    expect(deriveFobValue({ value: 1000, basis: 'cif', freight: 900, insurance: 500 }).fob).toBe(0)
  })

  it('rejects a missing or non-numeric value', () => {
    expect(deriveFobValue({ value: NaN, basis: 'fob' }).fob).toBeNull()
    expect(deriveFobValue({ value: -5, basis: 'fob' }).fob).toBeNull()
  })
})

describe('isRodtepNotified', () => {
  it('is notified on the last notified day', () => {
    expect(isRodtepNotified(RODTEP_NOTIFIED_UNTIL)).toBe(true)
  })

  it('is not notified the day after', () => {
    expect(isRodtepNotified('2026-10-01')).toBe(false)
  })

  it('is notified for earlier exports', () => {
    expect(isRodtepNotified('2026-05-18')).toBe(true)
  })
})

describe('rodtepEntitlement', () => {
  it('computes FOB x rate and rounds to whole rupees', () => {
    // 84,000 INR FOB at 1.2% = 1,008
    expect(rodtepEntitlement({ fobInr: 84000, ratePct: 1.2, letExportDate: '2026-03-15' }))
      .toEqual({ amountInr: 1008, claimable: true })
  })

  it('refuses to produce a figure after the notified window closes', () => {
    const r = rodtepEntitlement({ fobInr: 84000, ratePct: 1.2, letExportDate: '2026-10-05' })
    expect(r.claimable).toBe(false)
    expect(r.amountInr).toBeNull()
    expect(r.note).toContain(RODTEP_NOTIFIED_UNTIL)
  })

  it('returns nothing claimable when FOB could not be established', () => {
    expect(rodtepEntitlement({ fobInr: null, ratePct: 1.2, letExportDate: '2026-03-15' }).claimable).toBe(false)
  })

  it('returns nothing claimable when there is no rate', () => {
    expect(rodtepEntitlement({ fobInr: 84000, ratePct: 0, letExportDate: '2026-03-15' }).claimable).toBe(false)
  })

  it('does not claim on a CIF value that was never reduced to FOB', () => {
    // End-to-end guard on the actual bug: the CIF figure must not reach entitlement.
    const cif = deriveFobValue({ value: 100000, basis: 'cif', freight: 8000, insurance: 1200 })
    const claimed = rodtepEntitlement({ fobInr: cif.fob, ratePct: 1.2, letExportDate: '2026-03-15' })
    const naive = rodtepEntitlement({ fobInr: 100000, ratePct: 1.2, letExportDate: '2026-03-15' })
    expect(claimed.amountInr).toBe(1090)
    expect(naive.amountInr).toBe(1200)
    expect(claimed.amountInr!).toBeLessThan(naive.amountInr!)
  })
})
