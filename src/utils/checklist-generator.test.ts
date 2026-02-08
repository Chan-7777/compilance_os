import { describe, it, expect } from 'vitest'
import {
  generateChecklist,
  getChecklistByCategory,
  getChecklistProgress,
  filterChecklistByPhase,
  filterChecklistByPriority,
} from './checklist-generator'

describe('Checklist Generator', () => {
  describe('generateChecklist', () => {
    describe('Basic Functionality', () => {
      it('returns an array of checklist items', () => {
        const checklist = generateChecklist('steel', 'EU')

        expect(Array.isArray(checklist)).toBe(true)
        expect(checklist.length).toBeGreaterThan(0)
      })

      it('each item has required properties', () => {
        const checklist = generateChecklist('food', 'US')

        checklist.forEach(item => {
          expect(item).toHaveProperty('id')
          expect(item).toHaveProperty('category')
          expect(item).toHaveProperty('item')
          expect(item).toHaveProperty('priority')
          expect(item).toHaveProperty('phase')
          expect(typeof item.id).toBe('number')
          expect(typeof item.category).toBe('string')
          expect(typeof item.item).toBe('string')
        })
      })

      it('items have unique IDs', () => {
        const checklist = generateChecklist('steel', 'EU')
        const ids = checklist.map(c => c.id)
        const uniqueIds = new Set(ids)

        expect(uniqueIds.size).toBe(ids.length)
      })

      it('returns empty array for unknown country', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checklist = generateChecklist('steel', 'Unknown' as any)

        expect(checklist).toHaveLength(0)
      })

      it('priority is valid enum value', () => {
        const checklist = generateChecklist('food', 'EU')
        const validPriorities = ['critical', 'high', 'medium', 'low']

        checklist.forEach(item => {
          expect(validPriorities).toContain(item.priority)
        })
      })

      it('phase is valid enum value', () => {
        const checklist = generateChecklist('textiles', 'UK')
        const validPhases = [
          'one-time',
          'pre-production',
          'pre-shipment',
          'per-shipment',
          'annual',
          'quarterly',
        ]

        checklist.forEach(item => {
          expect(validPhases).toContain(item.phase)
        })
      })
    })

    describe('Base Documentation (Always Included)', () => {
      it('includes Commercial Invoice', () => {
        const checklist = generateChecklist('steel', 'EU')

        expect(checklist.some(c => c.item.includes('Commercial Invoice'))).toBe(true)
      })

      it('includes Packing List', () => {
        const checklist = generateChecklist('textiles', 'US')

        expect(checklist.some(c => c.item.includes('Packing List'))).toBe(true)
      })

      it('includes Bill of Lading / Airway Bill', () => {
        const checklist = generateChecklist('food', 'UAE')

        expect(checklist.some(c => c.item.includes('Bill of Lading') || c.item.includes('Airway Bill'))).toBe(true)
      })

      it('includes Shipping Bill (Indian Customs)', () => {
        const checklist = generateChecklist('electronics', 'Japan')

        expect(checklist.some(c => c.item.includes('Shipping Bill'))).toBe(true)
      })

      it('base documentation marked as critical priority', () => {
        const checklist = generateChecklist('steel', 'EU')
        const invoice = checklist.find(c => c.item.includes('Commercial Invoice'))

        expect(invoice?.priority).toBe('critical')
      })

      it('base documentation is pre-shipment phase', () => {
        const checklist = generateChecklist('steel', 'EU')
        const invoice = checklist.find(c => c.item.includes('Commercial Invoice'))

        expect(invoice?.phase).toBe('pre-shipment')
      })
    })

    describe('Certificate of Origin', () => {
      it('includes preferential CoO for active FTA (UAE CEPA)', () => {
        const checklist = generateChecklist('textiles', 'UAE')
        const coo = checklist.find(c =>
          c.item.includes('Certificate of Origin') && c.item.includes('preferential')
        )

        expect(coo).toBeDefined()
        expect(coo?.item).toContain('CEPA')
        expect(coo?.priority).toBe('critical')
      })

      it('includes preferential CoO for Australia ECTA', () => {
        const checklist = generateChecklist('food', 'Australia')
        const coo = checklist.find(c =>
          c.item.includes('Certificate of Origin') && c.item.includes('preferential')
        )

        expect(coo).toBeDefined()
        expect(coo?.item).toContain('ECTA')
      })

      it('includes Rules of Origin compliance for FTA countries', () => {
        const checklist = generateChecklist('steel', 'Japan')

        expect(checklist.some(c => c.item.includes('Rules of Origin'))).toBe(true)
      })

      it('includes non-preferential CoO for non-FTA countries (US)', () => {
        const checklist = generateChecklist('textiles', 'US')
        const coo = checklist.find(c =>
          c.item.includes('Certificate of Origin') && c.item.includes('Non-preferential')
        )

        expect(coo).toBeDefined()
      })

      it('includes non-preferential CoO for negotiating FTA (EU)', () => {
        const checklist = generateChecklist('textiles', 'EU')
        const coo = checklist.find(c =>
          c.item.includes('Certificate of Origin') && c.item.includes('Non-preferential')
        )

        expect(coo).toBeDefined()
      })
    })

    describe('Product-Specific Certifications', () => {
      it('includes food certifications for food to EU', () => {
        const checklist = generateChecklist('food', 'EU')

        expect(checklist.some(c => c.item.includes('FSSAI'))).toBe(true)
        expect(checklist.some(c => c.item.includes('Phytosanitary'))).toBe(true)
        expect(checklist.some(c => c.item.includes('HACCP'))).toBe(true)
      })

      it('includes textile certifications for textiles to EU', () => {
        const checklist = generateChecklist('textiles', 'EU')

        expect(checklist.some(c => c.item.includes('REACH'))).toBe(true)
        expect(checklist.some(c => c.item.includes('OEKO-TEX'))).toBe(true)
      })

      it('includes steel certifications for steel to EU', () => {
        const checklist = generateChecklist('steel', 'EU')

        expect(checklist.some(c => c.item.includes('EN Standards'))).toBe(true)
        expect(checklist.some(c => c.item.includes('Mill Test'))).toBe(true)
      })

      it('includes chemical certifications for chemicals to US', () => {
        const checklist = generateChecklist('chemicals', 'US')

        expect(checklist.some(c => c.item.includes('TSCA'))).toBe(true)
      })

      it('includes electronics certifications for electronics to US', () => {
        const checklist = generateChecklist('electronics', 'US')

        expect(checklist.some(c => c.item.includes('FCC'))).toBe(true)
      })

      it('falls back to general certifications for unknown product', () => {
        const checklist = generateChecklist('general', 'EU')

        expect(checklist.some(c => c.item.includes('CE Marking'))).toBe(true)
      })

      it('certifications are marked as critical priority', () => {
        const checklist = generateChecklist('food', 'EU')
        const haccp = checklist.find(c => c.item.includes('HACCP'))

        expect(haccp?.priority).toBe('critical')
      })

      it('certifications are pre-production phase', () => {
        const checklist = generateChecklist('food', 'EU')
        const haccp = checklist.find(c => c.item.includes('HACCP'))

        expect(haccp?.phase).toBe('pre-production')
      })
    })

    describe('CBAM Items', () => {
      it('includes CBAM items for steel to EU', () => {
        const checklist = generateChecklist('steel', 'EU')

        expect(checklist.some(c => c.item.includes('Embedded emissions'))).toBe(true)
        expect(checklist.some(c => c.item.includes('Carbon content declaration'))).toBe(true)
      })

      it('includes CBAM verification for steel to EU', () => {
        const checklist = generateChecklist('steel', 'EU')

        expect(checklist.some(c => c.item.includes('Verification') && c.item.includes('verifier'))).toBe(true)
      })

      it('includes CBAM items for chemicals to EU', () => {
        const checklist = generateChecklist('chemicals', 'EU')

        expect(checklist.some(c => c.item.includes('Embedded emissions'))).toBe(true)
      })

      it('includes CBAM items for steel to UK', () => {
        const checklist = generateChecklist('steel', 'UK')

        expect(checklist.some(c => c.item.includes('emissions') || c.item.includes('carbon'))).toBe(true)
      })

      it('no CBAM items for textiles (not covered)', () => {
        const checklist = generateChecklist('textiles', 'EU')
        const cbamItems = checklist.filter(c => c.category === 'CBAM')

        expect(cbamItems).toHaveLength(0)
      })

      it('no CBAM items for US (not active)', () => {
        const checklist = generateChecklist('steel', 'US')
        const cbamItems = checklist.filter(c => c.category === 'CBAM')

        expect(cbamItems).toHaveLength(0)
      })

      it('CBAM emissions item is critical priority', () => {
        const checklist = generateChecklist('steel', 'EU')
        const emissions = checklist.find(c => c.item.includes('Embedded emissions'))

        expect(emissions?.priority).toBe('critical')
      })
    })

    describe('ESG Items', () => {
      it('includes Scope 3 data for EU (scope3Required)', () => {
        const checklist = generateChecklist('steel', 'EU')

        expect(checklist.some(c => c.item.includes('Scope') && c.item.includes('emissions'))).toBe(true)
      })

      it('includes Scope 3 data for Australia', () => {
        const checklist = generateChecklist('steel', 'Australia')

        expect(checklist.some(c => c.item.includes('Scope') && c.item.includes('emissions'))).toBe(true)
      })

      it('includes ESRS data for EU (CSRD)', () => {
        const checklist = generateChecklist('steel', 'EU')

        expect(checklist.some(c => c.item.includes('ESRS') || c.item.includes('sustainability'))).toBe(true)
      })

      it('ESG items are high priority', () => {
        const checklist = generateChecklist('steel', 'EU')
        const scope3 = checklist.find(c => c.item.includes('Scope') && c.item.includes('emissions'))

        expect(scope3?.priority).toBe('high')
      })

      it('ESG items are annual phase', () => {
        const checklist = generateChecklist('steel', 'EU')
        const scope3 = checklist.find(c => c.item.includes('Scope') && c.item.includes('emissions'))

        expect(scope3?.phase).toBe('annual')
      })
    })

    describe('Packaging Items', () => {
      it('includes packaging regulations for EU', () => {
        const checklist = generateChecklist('food', 'EU')

        expect(checklist.some(c =>
          c.category === 'Packaging' ||
          c.item.includes('Packaging') ||
          c.item.includes('EPR')
        )).toBe(true)
      })

      it('packaging items are medium priority', () => {
        const checklist = generateChecklist('food', 'EU')
        const packaging = checklist.find(c => c.category === 'Packaging')

        if (packaging) {
          expect(packaging.priority).toBe('medium')
        }
      })
    })

    describe('Labeling Items', () => {
      it('includes labeling requirements for EU', () => {
        const checklist = generateChecklist('food', 'EU')

        expect(checklist.some(c =>
          c.category === 'Labeling' ||
          c.item.includes('labeling') ||
          c.item.includes('Multilingual')
        )).toBe(true)
      })

      it('includes Arabic labeling for UAE', () => {
        const checklist = generateChecklist('food', 'UAE')

        expect(checklist.some(c => c.item.includes('Arabic'))).toBe(true)
      })

      it('includes Japanese labeling for Japan', () => {
        const checklist = generateChecklist('food', 'Japan')

        expect(checklist.some(c => c.item.includes('Japanese'))).toBe(true)
      })
    })

    describe('Customs Items', () => {
      it('includes customs documentation', () => {
        const checklist = generateChecklist('steel', 'EU')

        expect(checklist.some(c => c.category === 'Customs')).toBe(true)
      })

      it('includes ISF filing for US', () => {
        const checklist = generateChecklist('electronics', 'US')

        expect(checklist.some(c => c.item.includes('ISF'))).toBe(true)
      })
    })

    describe('Sanctions Items', () => {
      it('includes OFAC compliance for US', () => {
        const checklist = generateChecklist('electronics', 'US')

        expect(checklist.some(c => c.item.includes('OFAC'))).toBe(true)
      })

      it('sanctions items are critical priority', () => {
        const checklist = generateChecklist('electronics', 'US')
        const ofac = checklist.find(c => c.item.includes('OFAC'))

        expect(ofac?.priority).toBe('critical')
      })
    })

    describe('Indian Compliance Items (Always Included)', () => {
      it('includes IEC requirement', () => {
        const checklist = generateChecklist('steel', 'EU')

        expect(checklist.some(c => c.item.includes('IEC'))).toBe(true)
      })

      it('includes AD Code registration', () => {
        const checklist = generateChecklist('textiles', 'US')

        expect(checklist.some(c => c.item.includes('AD Code'))).toBe(true)
      })

      it('includes GST & LUT requirement', () => {
        const checklist = generateChecklist('food', 'UAE')

        expect(checklist.some(c => c.item.includes('GST') && c.item.includes('LUT'))).toBe(true)
      })

      it('includes FEMA compliance', () => {
        const checklist = generateChecklist('chemicals', 'Japan')

        expect(checklist.some(c => c.item.includes('FEMA'))).toBe(true)
      })

      it('includes RBI reporting (EDPMS)', () => {
        const checklist = generateChecklist('electronics', 'Australia')

        expect(checklist.some(c => c.item.includes('RBI') || c.item.includes('EDPMS'))).toBe(true)
      })

      it('IEC is one-time phase', () => {
        const checklist = generateChecklist('steel', 'EU')
        const iec = checklist.find(c => c.item.includes('IEC'))

        expect(iec?.phase).toBe('one-time')
      })

      it('FEMA is per-shipment phase', () => {
        const checklist = generateChecklist('steel', 'EU')
        const fema = checklist.find(c => c.item.includes('FEMA'))

        expect(fema?.phase).toBe('per-shipment')
      })
    })
  })

  describe('Helper Functions', () => {
    describe('getChecklistByCategory', () => {
      it('groups items by category', () => {
        const checklist = generateChecklist('food', 'EU')
        const byCategory = getChecklistByCategory(checklist)

        expect(typeof byCategory).toBe('object')
        expect(byCategory).toHaveProperty('Documentation')
        expect(Array.isArray(byCategory['Documentation'])).toBe(true)
      })

      it('all items are accounted for', () => {
        const checklist = generateChecklist('steel', 'EU')
        const byCategory = getChecklistByCategory(checklist)

        const totalItems = Object.values(byCategory).flat().length
        expect(totalItems).toBe(checklist.length)
      })
    })

    describe('getChecklistProgress', () => {
      it('calculates progress correctly', () => {
        const checklist = generateChecklist('steel', 'EU')
        const checkedItems = { '1': true, '2': true }

        const progress = getChecklistProgress(checklist, checkedItems)

        expect(progress.total).toBe(checklist.length)
        expect(progress.completed).toBe(2)
        expect(progress.percentage).toBeCloseTo((2 / checklist.length) * 100, 1)
      })

      it('returns 0 progress for empty checked items', () => {
        const checklist = generateChecklist('food', 'US')
        const progress = getChecklistProgress(checklist, {})

        expect(progress.completed).toBe(0)
        expect(progress.percentage).toBe(0)
      })

      it('handles fully completed checklist', () => {
        const checklist = generateChecklist('general', 'UAE')
        const checkedItems: Record<string, boolean> = {}
        checklist.forEach(c => {
          checkedItems[String(c.id)] = true
        })

        const progress = getChecklistProgress(checklist, checkedItems)

        expect(progress.completed).toBe(checklist.length)
        expect(progress.percentage).toBe(100)
      })
    })

    describe('filterChecklistByPhase', () => {
      it('filters items by phase', () => {
        const checklist = generateChecklist('steel', 'EU')
        const preShipment = filterChecklistByPhase(checklist, 'pre-shipment')

        expect(preShipment.length).toBeGreaterThan(0)
        preShipment.forEach(item => {
          expect(item.phase).toBe('pre-shipment')
        })
      })

      it('returns empty for non-existent phase items', () => {
        const checklist = generateChecklist('general', 'UAE')
        // This might have items or not depending on data
        const result = filterChecklistByPhase(checklist, 'quarterly')

        result.forEach(item => {
          expect(item.phase).toBe('quarterly')
        })
      })
    })

    describe('filterChecklistByPriority', () => {
      it('filters items by priority', () => {
        const checklist = generateChecklist('food', 'EU')
        const critical = filterChecklistByPriority(checklist, 'critical')

        expect(critical.length).toBeGreaterThan(0)
        critical.forEach(item => {
          expect(item.priority).toBe('critical')
        })
      })

      it('high priority items exist', () => {
        const checklist = generateChecklist('steel', 'EU')
        const high = filterChecklistByPriority(checklist, 'high')

        expect(high.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Different Product-Country Combinations', () => {
    const products = ['food', 'textiles', 'chemicals', 'electronics', 'steel', 'pharma', 'general']
    const countries = ['EU', 'US', 'UK', 'UAE', 'Japan', 'Australia']

    products.forEach(product => {
      countries.forEach(country => {
        it(`generates valid checklist for ${product} to ${country}`, () => {
          const checklist = generateChecklist(product, country)

          expect(Array.isArray(checklist)).toBe(true)
          expect(checklist.length).toBeGreaterThan(0)

          // All items have required fields
          checklist.forEach(item => {
            expect(item.id).toBeDefined()
            expect(item.category).toBeDefined()
            expect(item.item).toBeDefined()
            expect(item.priority).toBeDefined()
            expect(item.phase).toBeDefined()
          })

          // Should always have basic documentation
          expect(checklist.some(c => c.category === 'Documentation')).toBe(true)

          // Should always have Indian compliance
          expect(checklist.some(c => c.category === 'Indian Compliance')).toBe(true)
        })
      })
    })
  })
})
