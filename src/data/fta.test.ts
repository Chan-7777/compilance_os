import { describe, it, expect } from 'vitest'
import { FTA_DATABASE, getActiveFTAs, getFTAByCountry } from './fta'
import type { CountryCode } from '@/types'

describe('FTA_DATABASE', () => {
  const expectedCountries: CountryCode[] = ['EU', 'US', 'UK', 'UAE', 'Japan', 'Australia']

  describe('Structure Integrity', () => {
    it('contains entries for all 6 countries', () => {
      expect(Object.keys(FTA_DATABASE)).toHaveLength(6)
      expectedCountries.forEach(country => {
        expect(FTA_DATABASE).toHaveProperty(country)
      })
    })
  })

  describe('FTA Data Completeness', () => {
    expectedCountries.forEach(countryCode => {
      describe(`${countryCode}`, () => {
        it('has required fields', () => {
          const fta = FTA_DATABASE[countryCode]
          expect(fta).toHaveProperty('name')
          expect(fta).toHaveProperty('status')
          expect(fta).toHaveProperty('preferentialTariff')
          expect(fta).toHaveProperty('notes')
        })

        it('has valid field types', () => {
          const fta = FTA_DATABASE[countryCode]
          expect(typeof fta.name).toBe('string')
          expect(['Active', 'Under Negotiation', 'No FTA']).toContain(fta.status)
          expect(typeof fta.preferentialTariff).toBe('boolean')
          expect(typeof fta.notes).toBe('string')
        })

        it('has non-empty name and notes', () => {
          const fta = FTA_DATABASE[countryCode]
          expect(fta.name.length).toBeGreaterThan(0)
          expect(fta.notes.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('Active FTA Validation', () => {
    it('UAE CEPA is active with preferential tariff', () => {
      const uae = FTA_DATABASE.UAE
      expect(uae.status).toBe('Active')
      expect(uae.preferentialTariff).toBe(true)
      expect(uae.effectiveDate).toBeDefined()
      expect(uae.name).toContain('CEPA')
    })

    it('Australia ECTA is active with preferential tariff', () => {
      const aus = FTA_DATABASE.Australia
      expect(aus.status).toBe('Active')
      expect(aus.preferentialTariff).toBe(true)
      expect(aus.effectiveDate).toBeDefined()
      expect(aus.name).toContain('ECTA')
    })

    it('Japan CEPA is active with preferential tariff', () => {
      const japan = FTA_DATABASE.Japan
      expect(japan.status).toBe('Active')
      expect(japan.preferentialTariff).toBe(true)
      expect(japan.effectiveDate).toBeDefined()
    })
  })

  describe('FTA Under Negotiation', () => {
    it('EU FTA is under negotiation', () => {
      const eu = FTA_DATABASE.EU
      expect(eu.status).toBe('Under Negotiation')
      expect(eu.preferentialTariff).toBe(false)
    })

    it('UK FTA is under negotiation', () => {
      const uk = FTA_DATABASE.UK
      expect(uk.status).toBe('Under Negotiation')
      expect(uk.preferentialTariff).toBe(false)
    })
  })

  describe('No FTA Status', () => {
    it('US has no FTA', () => {
      const us = FTA_DATABASE.US
      expect(us.status).toBe('No FTA')
      expect(us.preferentialTariff).toBe(false)
    })
  })

  describe('Helper Functions', () => {
    describe('getActiveFTAs', () => {
      it('returns only countries with active preferential tariffs', () => {
        const active = getActiveFTAs()
        expect(active.length).toBe(3)
        expect(active).toContain('UAE')
        expect(active).toContain('Japan')
        expect(active).toContain('Australia')
      })

      it('does not include countries under negotiation', () => {
        const active = getActiveFTAs()
        expect(active).not.toContain('EU')
        expect(active).not.toContain('UK')
      })

      it('does not include countries with no FTA', () => {
        const active = getActiveFTAs()
        expect(active).not.toContain('US')
      })
    })

    describe('getFTAByCountry', () => {
      it('returns correct FTA for valid country', () => {
        const uae = getFTAByCountry('UAE')
        expect(uae).toBeDefined()
        expect(uae?.name).toContain('CEPA')
      })

      it('returns undefined for invalid country', () => {
        const invalid = getFTAByCountry('InvalidCountry' as CountryCode)
        expect(invalid).toBeUndefined()
      })
    })
  })
})
