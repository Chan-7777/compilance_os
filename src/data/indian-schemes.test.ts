import { describe, it, expect } from 'vitest'
import { INDIAN_EXPORT_SCHEMES, getActiveSchemes, getSchemeByName } from './indian-schemes'

describe('INDIAN_EXPORT_SCHEMES', () => {
  const expectedSchemeNames = [
    'RoDTEP',
    'PLI Scheme',
    'MEIS/RoSCTL',
    'Advance Authorization',
    'EPCG Scheme',
    'SEZ/EOU Benefits',
    'ECGC Insurance',
    'Market Access Initiative',
  ]

  describe('Structure Integrity', () => {
    it('contains all 8 export schemes', () => {
      expect(INDIAN_EXPORT_SCHEMES).toHaveLength(8)
    })

    it('has all expected scheme names', () => {
      const names = INDIAN_EXPORT_SCHEMES.map(s => s.name)
      expectedSchemeNames.forEach(name => {
        expect(names).toContain(name)
      })
    })

    it('has no duplicate names', () => {
      const names = INDIAN_EXPORT_SCHEMES.map(s => s.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })
  })

  describe('Scheme Data Completeness', () => {
    INDIAN_EXPORT_SCHEMES.forEach(scheme => {
      describe(`${scheme.name}`, () => {
        it('has required fields', () => {
          expect(scheme).toHaveProperty('name')
          expect(scheme).toHaveProperty('desc')
          expect(scheme).toHaveProperty('status')
        })

        it('has valid field types', () => {
          expect(typeof scheme.name).toBe('string')
          expect(typeof scheme.desc).toBe('string')
          expect(typeof scheme.status).toBe('string')
        })

        it('has non-empty fields', () => {
          expect(scheme.name.length).toBeGreaterThan(0)
          expect(scheme.desc.length).toBeGreaterThan(0)
          expect(scheme.status.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('Key Scheme Details', () => {
    it('RoDTEP is active', () => {
      const rodtep = INDIAN_EXPORT_SCHEMES.find(s => s.name === 'RoDTEP')
      expect(rodtep).toBeDefined()
      expect(rodtep?.status).toBe('Active')
      expect(rodtep?.desc).toContain('Remission')
    })

    it('Advance Authorization is active', () => {
      const aa = INDIAN_EXPORT_SCHEMES.find(s => s.name === 'Advance Authorization')
      expect(aa).toBeDefined()
      expect(aa?.status).toBe('Active')
      expect(aa?.desc).toContain('Duty-free')
    })

    it('EPCG Scheme is active', () => {
      const epcg = INDIAN_EXPORT_SCHEMES.find(s => s.name === 'EPCG Scheme')
      expect(epcg).toBeDefined()
      expect(epcg?.status).toBe('Active')
    })

    it('PLI Scheme is sector-specific', () => {
      const pli = INDIAN_EXPORT_SCHEMES.find(s => s.name === 'PLI Scheme')
      expect(pli).toBeDefined()
      expect(pli?.status).toBe('Sector-specific')
    })

    it('ECGC Insurance is active', () => {
      const ecgc = INDIAN_EXPORT_SCHEMES.find(s => s.name === 'ECGC Insurance')
      expect(ecgc).toBeDefined()
      expect(ecgc?.status).toBe('Active')
    })
  })

  describe('Helper Functions', () => {
    describe('getActiveSchemes', () => {
      it('returns only schemes with Active status', () => {
        const active = getActiveSchemes()
        expect(active.length).toBeGreaterThan(0)
        active.forEach(scheme => {
          expect(scheme.status).toBe('Active')
        })
      })

      it('includes RoDTEP, Advance Authorization, EPCG', () => {
        const active = getActiveSchemes()
        const names = active.map(s => s.name)
        expect(names).toContain('RoDTEP')
        expect(names).toContain('Advance Authorization')
        expect(names).toContain('EPCG Scheme')
      })
    })

    describe('getSchemeByName', () => {
      it('returns correct scheme for valid name', () => {
        const rodtep = getSchemeByName('RoDTEP')
        expect(rodtep).toBeDefined()
        expect(rodtep?.name).toBe('RoDTEP')
      })

      it('returns undefined for invalid name', () => {
        const invalid = getSchemeByName('NonexistentScheme')
        expect(invalid).toBeUndefined()
      })

      it('is case-sensitive', () => {
        const invalid = getSchemeByName('rodtep')
        expect(invalid).toBeUndefined()
      })
    })
  })
})
