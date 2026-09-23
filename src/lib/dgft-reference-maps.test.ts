import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DGFT_ANNEXURE_SOURCE,
  DGFT_STATES,
  DGFT_DISTRICTS,
  DGFT_COUNTRIES,
  DGFT_UOM_CODES,
  DGFT_PORTS,
  DGFT_PORT_ROWS_EXCLUDED,
  lookupState,
  lookupDistrict,
  lookupCountry,
  lookupUom,
  lookupPort,
} from './dgft-reference-maps'

// Counts are the rows of each table in docs/Certificate+of+Origin+Open+API+v1.0.pdf
// section 7, read on 23 Sept 2026. If DGFT reissues the PDF, rerun
// scripts/extract_dgft_annexure.py and update these by hand after reading it.

const upper = (xs: readonly string[]) => xs.map(x => x.toUpperCase())
const dupes = (xs: readonly string[]) => xs.filter((x, i) => xs.indexOf(x) !== i)

describe('DGFT annexure provenance', () => {
  it('was generated from the PDF committed in docs/', () => {
    const pdf = readFileSync(resolve(process.cwd(), DGFT_ANNEXURE_SOURCE.file))
    expect(createHash('sha256').update(pdf).digest('hex')).toBe(DGFT_ANNEXURE_SOURCE.sha256)
  })

  it('records the raw row count of every table it took', () => {
    expect(DGFT_ANNEXURE_SOURCE.rowCounts).toEqual({
      state: 38, district: 698, uom: 37, country: 264, domesticPort: 1000,
    })
  })
})

describe('states (7.3)', () => {
  it('has all 38 PDF rows, no duplicates', () => {
    expect(DGFT_STATES).toHaveLength(38)
    expect(dupes(upper(DGFT_STATES))).toEqual([])
  })

  it('matches a stored name case-insensitively and returns the PDF spelling', () => {
    expect(lookupState('Maharashtra')).toBe('MAHARASHTRA')
    expect(lookupState('  tamil nadu ')).toBe('TAMIL NADU')
    expect(lookupState('Exclusive Economic Zone (EEZ)')).toBe('Exclusive Economic Zone (EEZ)')
  })

  it('does not accept names the PDF does not have', () => {
    expect(lookupState('Gujrat')).toBeUndefined()
    expect(lookupState('Dadra and Nagar Haveli and Daman and Diu')).toBeUndefined()
    expect(lookupState('GJ')).toBeUndefined()
  })
})

describe('districts (7.4)', () => {
  it('has the 692 distinct names among the 698 PDF rows', () => {
    expect(DGFT_DISTRICTS).toHaveLength(692)
    expect(dupes(upper(DGFT_DISTRICTS))).toEqual([])
  })

  it('uses the PDF spelling, not the old stub', () => {
    expect(lookupDistrict('Tiruppur')).toBe('TIRUPPUR')
    expect(lookupDistrict('Bengaluru Urban')).toBe('BENGALURU URBAN')
    expect(lookupDistrict('Tirupur')).toBeUndefined()
    expect(lookupDistrict('Bengaluru')).toBeUndefined()
  })
})

describe('UOM (7.9)', () => {
  const codes = Object.keys(DGFT_UOM_CODES)

  it('has all 37 PDF rows, unique 3-letter codes', () => {
    expect(codes).toHaveLength(37)
    for (const code of codes) expect(code).toMatch(/^[A-Z]{3}$/)
  })

  it('pairs each code with the PDF value that names it', () => {
    for (const [code, entry] of Object.entries(DGFT_UOM_CODES)) {
      expect(entry.code).toBe(code)
      expect(entry.name.endsWith(`(${code})`)).toBe(true)
    }
    expect(lookupUom('kgs')?.name).toBe('KILOGRAMS (KGS)')
  })

  it('drops the stub code the PDF does not have', () => {
    expect(lookupUom('BOX')).toBeUndefined()
  })
})

describe('countries (7.10)', () => {
  it('has the 255 distinct names among the 264 PDF rows', () => {
    expect(DGFT_COUNTRIES).toHaveLength(255)
    expect(dupes(upper(DGFT_COUNTRIES))).toEqual([])
  })

  it('matches by name; the PDF gives no ISO codes', () => {
    expect(lookupCountry('united arab emirates')).toBe('United Arab Emirates')
    expect(lookupCountry('United States of America')).toBe('United States Of America')
    expect(lookupCountry('AE')).toBeUndefined()
    expect(lookupCountry('USA')).toBeUndefined()
  })
})

describe('domestic ports (7.11)', () => {
  const codes = DGFT_PORTS.map(p => p.code)

  it('keeps 996 of the 1000 PDF rows and names the 4 it left out', () => {
    expect(DGFT_PORTS).toHaveLength(996)
    expect(DGFT_PORT_ROWS_EXCLUDED.map(r => r.code).sort()).toEqual(['DEEMED', 'INCCQ', 'INDAGENCY', 'OTHERS'])
    expect(DGFT_PORTS.length + DGFT_PORT_ROWS_EXCLUDED.length).toBe(DGFT_ANNEXURE_SOURCE.rowCounts.domesticPort)
  })

  it('has no duplicate codes and every code is IN + 4 characters', () => {
    expect(dupes(codes)).toEqual([])
    for (const code of codes) expect(code).toMatch(/^IN[A-Z0-9]{4}$/)
  })

  it('still recognises every code the old stub had, so saved profiles stay valid', () => {
    for (const code of ['INNSA1', 'INMUN1', 'INMAA1', 'INCCU1', 'INCOK1', 'INPAV1', 'INIXY1', 'INDEL4', 'INBOM4']) {
      expect(lookupPort(code), code).toBeDefined()
    }
    expect(lookupPort('innsa1')?.name).toBe('JNCH, NHAVA SHEVA, TAL:URAN, DIST-RAIGAD-400707')
  })

  it('looks up by code only - nicknames and unknown codes are not ports', () => {
    expect(lookupPort('JNPT')).toBeUndefined()
    expect(lookupPort('Mundra')).toBeUndefined()
    expect(lookupPort('OTHERS')).toBeUndefined()
    expect(lookupPort('INZZZ9')).toBeUndefined()
  })
})
