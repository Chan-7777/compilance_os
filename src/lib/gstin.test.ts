import { describe, it, expect } from 'vitest'
import { validateGstin, GST_STATE_CODES } from './gstin'

// A structurally valid Maharashtra GSTIN.
const MERIDIAN = '27AAECM4512R1Z2'

// The value actually shipped in the Meridian demo seed and shown in Settings.
// Its checksum is wrong — it ends 'P' where the algorithm requires '2'. Kept
// as a fixture because catching exactly this is the point of the module.
const SEED_DEMO_GSTIN = '27AAECM4512R1ZP'

describe('validateGstin', () => {
  it('accepts a well-formed GSTIN', () => {
    const r = validateGstin(MERIDIAN)
    expect(r.valid).toBe(true)
    expect(r.stateFromCode).toBe('Maharashtra')
  })

  it('is case and whitespace insensitive', () => {
    expect(validateGstin(`  ${MERIDIAN.toLowerCase()}  `).valid).toBe(true)
  })

  it('rejects the wrong length', () => {
    expect(validateGstin('27AAECM4512R1Z').error).toMatch(/15 characters/)
    expect(validateGstin('').error).toMatch(/empty/)
  })

  it('rejects a malformed structure', () => {
    expect(validateGstin('2AAECM45127R1ZP').valid).toBe(false)
  })

  it('rejects an impossible state code', () => {
    const r = validateGstin('99AAECM4512R1ZP')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/not a valid GST state code/)
  })

  it('catches a mistyped character via the checksum', () => {
    const wrong = MERIDIAN.slice(0, 14) + (MERIDIAN[14] === 'A' ? 'B' : 'A')
    const r = validateGstin(wrong)
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/checksum/)
  })

  it('catches the invalid GSTIN sitting in the Meridian demo seed', () => {
    const r = validateGstin(SEED_DEMO_GSTIN)
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/checksum/)
  })

  it('catches a GSTIN that disagrees with the declared state', () => {
    // 27 is Maharashtra; the profile says Gujarat.
    const r = validateGstin(MERIDIAN, 'Gujarat')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/Maharashtra/)
    expect(r.error).toMatch(/Gujarat/)
  })

  it('passes when the declared state agrees', () => {
    expect(validateGstin(MERIDIAN, 'Maharashtra').valid).toBe(true)
  })

  it('does not fail on a blank declared state', () => {
    expect(validateGstin(MERIDIAN, '').valid).toBe(true)
    expect(validateGstin(MERIDIAN, null).valid).toBe(true)
  })
})

describe('GST_STATE_CODES', () => {
  it('covers the states the product actually sells into', () => {
    expect(GST_STATE_CODES['27']).toBe('Maharashtra')
    expect(GST_STATE_CODES['24']).toBe('Gujarat')
    expect(GST_STATE_CODES['33']).toBe('Tamil Nadu')
    expect(GST_STATE_CODES['29']).toBe('Karnataka')
  })
})
