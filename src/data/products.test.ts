import { describe, it, expect } from 'vitest'
import { PRODUCT_CATEGORIES, getProductById, getProductByHsPrefix } from './products'

describe('PRODUCT_CATEGORIES', () => {
  const expectedProductIds = [
    'food',
    'textiles',
    'chemicals',
    'electronics',
    'steel',
    'pharma',
    'automotive',
    'machinery',
    'general',
  ]

  describe('Structure Integrity', () => {
    it('contains all 9 product categories', () => {
      expect(PRODUCT_CATEGORIES).toHaveLength(9)
    })

    it('has all expected product IDs', () => {
      const ids = PRODUCT_CATEGORIES.map(p => p.id)
      expectedProductIds.forEach(id => {
        expect(ids).toContain(id)
      })
    })

    it('has no duplicate IDs', () => {
      const ids = PRODUCT_CATEGORIES.map(p => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('Product Data Completeness', () => {
    PRODUCT_CATEGORIES.forEach(product => {
      describe(`${product.id}`, () => {
        it('has required fields', () => {
          expect(product).toHaveProperty('id')
          expect(product).toHaveProperty('label')
          expect(product).toHaveProperty('icon')
          expect(product).toHaveProperty('hsPrefix')
        })

        it('has valid field types', () => {
          expect(typeof product.id).toBe('string')
          expect(typeof product.label).toBe('string')
          expect(typeof product.icon).toBe('string')
          expect(Array.isArray(product.hsPrefix)).toBe(true)
        })

        it('has non-empty id and label', () => {
          expect(product.id.length).toBeGreaterThan(0)
          expect(product.label.length).toBeGreaterThan(0)
        })

        it('has an emoji icon', () => {
          // Emoji icons should have length > 0
          expect(product.icon.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('HS Prefix Mapping', () => {
    it('food has HS prefix range 01-24', () => {
      const food = PRODUCT_CATEGORIES.find(p => p.id === 'food')
      expect(food?.hsPrefix).toContain('01-24')
    })

    it('textiles has HS prefix range 50-63', () => {
      const textiles = PRODUCT_CATEGORIES.find(p => p.id === 'textiles')
      expect(textiles?.hsPrefix).toContain('50-63')
    })

    it('steel has HS prefix range 72-73', () => {
      const steel = PRODUCT_CATEGORIES.find(p => p.id === 'steel')
      expect(steel?.hsPrefix).toContain('72-73')
    })

    it('general has empty HS prefix array', () => {
      const general = PRODUCT_CATEGORIES.find(p => p.id === 'general')
      expect(general?.hsPrefix).toHaveLength(0)
    })
  })

  describe('Helper Functions', () => {
    describe('getProductById', () => {
      it('returns correct product for valid ID', () => {
        const steel = getProductById('steel')
        expect(steel).toBeDefined()
        expect(steel?.id).toBe('steel')
        expect(steel?.label).toBe('Steel & Iron Products')
      })

      it('returns undefined for invalid ID', () => {
        const invalid = getProductById('nonexistent')
        expect(invalid).toBeUndefined()
      })

      it('returns food product correctly', () => {
        const food = getProductById('food')
        expect(food?.label).toBe('Food & Agriculture')
        expect(food?.icon).toBe('🌾')
      })
    })

    describe('getProductByHsPrefix', () => {
      it('returns steel for HS code 72', () => {
        const product = getProductByHsPrefix('72')
        expect(product?.id).toBe('steel')
      })

      it('returns food for HS code 01', () => {
        const product = getProductByHsPrefix('01')
        expect(product?.id).toBe('food')
      })

      it('returns textiles for HS code 61', () => {
        const product = getProductByHsPrefix('61')
        expect(product?.id).toBe('textiles')
      })

      it('returns undefined for unknown HS code', () => {
        const product = getProductByHsPrefix('99')
        expect(product).toBeUndefined()
      })
    })
  })
})
