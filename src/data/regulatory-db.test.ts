import { describe, it, expect } from 'vitest'
import { REGULATORY_DB, COUNTRY_CODES } from './regulatory-db'
import type { CountryCode, CountryRegulation } from '@/types'

describe('REGULATORY_DB', () => {
  const expectedCountries: CountryCode[] = ['EU', 'US', 'UK', 'UAE', 'Japan', 'Australia']

  describe('Structure Integrity', () => {
    it('contains all 6 expected countries', () => {
      expect(Object.keys(REGULATORY_DB)).toHaveLength(6)
      expectedCountries.forEach(country => {
        expect(REGULATORY_DB).toHaveProperty(country)
      })
    })

    it('COUNTRY_CODES array matches REGULATORY_DB keys', () => {
      expect(COUNTRY_CODES).toEqual(expectedCountries)
      expect(COUNTRY_CODES).toHaveLength(Object.keys(REGULATORY_DB).length)
    })
  })

  describe('Country Data Completeness', () => {
    expectedCountries.forEach(countryCode => {
      describe(`${countryCode}`, () => {
        let country: CountryRegulation

        beforeAll(() => {
          country = REGULATORY_DB[countryCode]
        })

        it('has required base fields', () => {
          expect(country).toHaveProperty('name')
          expect(country).toHaveProperty('flag')
          expect(typeof country.name).toBe('string')
          expect(typeof country.flag).toBe('string')
          expect(country.name.length).toBeGreaterThan(0)
          expect(country.flag.length).toBeGreaterThan(0)
        })

        it('has CBAM configuration', () => {
          expect(country).toHaveProperty('cbam')
          expect(country.cbam).toHaveProperty('active')
          expect(typeof country.cbam.active).toBe('boolean')
          expect(country.cbam).toHaveProperty('phase')
          expect(typeof country.cbam.phase).toBe('string')
        })

        it('has ESG configuration', () => {
          expect(country).toHaveProperty('esg')
          expect(country.esg).toHaveProperty('reportingStandards')
          expect(Array.isArray(country.esg.reportingStandards)).toBe(true)
          expect(country.esg).toHaveProperty('scope3Required')
          expect(typeof country.esg.scope3Required).toBe('boolean')
        })

        it('has certifications object with at least general category', () => {
          expect(country).toHaveProperty('certifications')
          expect(typeof country.certifications).toBe('object')
          expect(country.certifications).toHaveProperty('general')
          expect(Array.isArray(country.certifications.general)).toBe(true)
          expect(country.certifications.general.length).toBeGreaterThan(0)
        })

        it('has packaging array', () => {
          expect(country).toHaveProperty('packaging')
          expect(Array.isArray(country.packaging)).toBe(true)
        })

        it('has labeling array', () => {
          expect(country).toHaveProperty('labeling')
          expect(Array.isArray(country.labeling)).toBe(true)
        })

        it('has customs array', () => {
          expect(country).toHaveProperty('customs')
          expect(Array.isArray(country.customs)).toBe(true)
        })

        it('has sanctions array', () => {
          expect(country).toHaveProperty('sanctions')
          expect(Array.isArray(country.sanctions)).toBe(true)
        })
      })
    })
  })

  describe('CBAM-Specific Validation', () => {
    it('EU has active CBAM with covered sectors', () => {
      const eu = REGULATORY_DB.EU
      expect(eu.cbam.active).toBe(true)
      expect(eu.cbam.coveredSectors).toBeDefined()
      expect(eu.cbam.coveredSectors!.length).toBeGreaterThan(0)
      expect(eu.cbam.coveredSectors).toContain('steel')
      expect(eu.cbam.coveredSectors).toContain('cement')
      expect(eu.cbam.coveredSectors).toContain('aluminium')
    })

    it('UK has CBAM announced for 2027', () => {
      const uk = REGULATORY_DB.UK
      expect(uk.cbam.active).toBe(true)
      expect(uk.cbam.phase).toContain('2027')
    })

    it('EU CBAM has key dates', () => {
      const eu = REGULATORY_DB.EU
      expect(eu.cbam.keyDates).toBeDefined()
      expect(eu.cbam.keyDates!.length).toBeGreaterThan(0)
      eu.cbam.keyDates!.forEach(kd => {
        expect(kd).toHaveProperty('date')
        expect(kd).toHaveProperty('event')
        // Date should be valid ISO format
        expect(new Date(kd.date).toString()).not.toBe('Invalid Date')
      })
    })
  })

  describe('ESG-Specific Validation', () => {
    it('EU has CSRD requirement', () => {
      expect(REGULATORY_DB.EU.esg.csrd).toBe(true)
    })

    it('EU requires Scope 3 emissions', () => {
      expect(REGULATORY_DB.EU.esg.scope3Required).toBe(true)
    })

    it('Australia requires Scope 3 emissions', () => {
      expect(REGULATORY_DB.Australia.esg.scope3Required).toBe(true)
    })

    it('US has SEC climate rules', () => {
      expect(REGULATORY_DB.US.esg.secClimate).toBe(true)
    })

    it('UK has TCFD requirement', () => {
      expect(REGULATORY_DB.UK.esg.tcfd).toBe(true)
    })
  })

  describe('Certification Categories', () => {
    const productCategories = ['food', 'textiles', 'chemicals', 'electronics', 'steel']

    it('EU has certifications for major product categories', () => {
      const euCerts = REGULATORY_DB.EU.certifications
      productCategories.forEach(category => {
        expect(euCerts).toHaveProperty(category)
        expect(Array.isArray(euCerts[category])).toBe(true)
        expect(euCerts[category].length).toBeGreaterThan(0)
      })
    })

    it('US has certifications for major product categories', () => {
      const usCerts = REGULATORY_DB.US.certifications
      productCategories.forEach(category => {
        expect(usCerts).toHaveProperty(category)
        expect(Array.isArray(usCerts[category])).toBe(true)
      })
    })
  })

  describe('Recent Changes', () => {
    it('EU has recent regulatory changes', () => {
      const eu = REGULATORY_DB.EU
      expect(eu.recentChanges).toBeDefined()
      expect(eu.recentChanges!.length).toBeGreaterThan(0)
      eu.recentChanges!.forEach(change => {
        expect(change).toHaveProperty('date')
        expect(change).toHaveProperty('change')
        expect(typeof change.date).toBe('string')
        expect(typeof change.change).toBe('string')
      })
    })
  })
})
