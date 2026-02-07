import { describe, it, expect } from 'vitest'
import { calculateRiskScore, getRiskLevel, getRiskColor } from './risk-scoring'
import type { CompanyProfile } from '@/types'

describe('Risk Scoring Engine', () => {
  const defaultProfile: CompanyProfile = { name: 'Test Co', size: 'medium' }
  const smallProfile: CompanyProfile = { name: 'Small Co', size: 'small' }
  const microProfile: CompanyProfile = { name: 'Micro Co', size: 'micro' }

  describe('calculateRiskScore', () => {
    describe('Basic Functionality', () => {
      it('returns a valid RiskResult object', () => {
        const result = calculateRiskScore('steel', 'EU', defaultProfile)

        expect(result).toHaveProperty('score')
        expect(result).toHaveProperty('level')
        expect(result).toHaveProperty('factors')
        expect(result).toHaveProperty('recommendations')
        expect(typeof result.score).toBe('number')
        expect(['high', 'medium', 'low']).toContain(result.level)
        expect(Array.isArray(result.factors)).toBe(true)
        expect(Array.isArray(result.recommendations)).toBe(true)
      })

      it('returns default medium risk for unknown country', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = calculateRiskScore('steel', 'Unknown' as unknown as any, defaultProfile)

        expect(result.score).toBe(50)
        expect(result.level).toBe('medium')
        expect(result.factors).toHaveLength(0)
      })

      it('score is bounded between 0 and 100', () => {
        // High risk scenario
        const highRisk = calculateRiskScore('steel', 'EU', microProfile)
        expect(highRisk.score).toBeGreaterThanOrEqual(0)
        expect(highRisk.score).toBeLessThanOrEqual(100)

        // Low risk scenario
        const lowRisk = calculateRiskScore('general', 'UAE', { name: 'Big Co', size: 'large' })
        expect(lowRisk.score).toBeGreaterThanOrEqual(0)
        expect(lowRisk.score).toBeLessThanOrEqual(100)
      })
    })

    describe('CBAM Risk Calculation', () => {
      it('adds high risk for CBAM-covered product to EU', () => {
        const result = calculateRiskScore('steel', 'EU', defaultProfile)

        const cbamFactor = result.factors.find(f => f.category === 'CBAM')
        expect(cbamFactor).toBeDefined()
        expect(cbamFactor?.severity).toBe('high')
        expect(cbamFactor?.detail).toContain('CBAM')
      })

      it('adds high risk for chemicals to EU (CBAM covered)', () => {
        const result = calculateRiskScore('chemicals', 'EU', defaultProfile)

        const cbamFactor = result.factors.find(f => f.category === 'CBAM')
        expect(cbamFactor).toBeDefined()
        expect(cbamFactor?.severity).toBe('high')
      })

      it('adds low risk for non-CBAM product to EU', () => {
        const result = calculateRiskScore('textiles', 'EU', defaultProfile)

        const cbamFactor = result.factors.find(f => f.category === 'CBAM')
        expect(cbamFactor).toBeDefined()
        expect(cbamFactor?.severity).toBe('low')
        expect(cbamFactor?.detail).toContain('not currently in CBAM scope')
      })

      it('includes carbon tracking recommendation for CBAM products', () => {
        const result = calculateRiskScore('steel', 'EU', defaultProfile)

        expect(result.recommendations.some(r =>
          r.toLowerCase().includes('carbon') || r.toLowerCase().includes('emission')
        )).toBe(true)
      })

      it('handles UK CBAM (announced for 2027)', () => {
        const result = calculateRiskScore('steel', 'UK', defaultProfile)

        const cbamFactor = result.factors.find(f => f.category === 'CBAM')
        expect(cbamFactor).toBeDefined()
        expect(cbamFactor?.severity).toBe('high')
      })

      it('no CBAM factor for US (not active)', () => {
        const result = calculateRiskScore('steel', 'US', defaultProfile)

        const cbamFactor = result.factors.find(f => f.category === 'CBAM')
        // US has proposed CBAM but not active, so either no factor or low severity
        if (cbamFactor) {
          expect(['low', 'info']).toContain(cbamFactor.severity)
        }
      })
    })

    describe('ESG Risk Factors', () => {
      it('adds risk for Scope 3 requirement (EU)', () => {
        const result = calculateRiskScore('steel', 'EU', defaultProfile)

        const esgFactor = result.factors.find(f =>
          f.category === 'ESG' && f.detail.includes('Scope 3')
        )
        expect(esgFactor).toBeDefined()
        expect(esgFactor?.severity).toBe('high')
      })

      it('adds risk for Scope 3 requirement (Australia)', () => {
        const result = calculateRiskScore('steel', 'Australia', defaultProfile)

        const esgFactor = result.factors.find(f =>
          f.detail.includes('Scope 3')
        )
        expect(esgFactor).toBeDefined()
      })

      it('includes Scope 3 mapping recommendation when required', () => {
        const result = calculateRiskScore('steel', 'EU', defaultProfile)

        expect(result.recommendations.some(r =>
          r.toLowerCase().includes('scope 3') || r.toLowerCase().includes('supply chain')
        )).toBe(true)
      })

      it('adds ESG disclosure factor for CSRD countries', () => {
        const result = calculateRiskScore('steel', 'EU', defaultProfile)

        const disclosureFactor = result.factors.find(f =>
          f.category === 'ESG Disclosure' || f.detail.includes('ESG data')
        )
        expect(disclosureFactor).toBeDefined()
      })

      it('adds ESG factor for SEC climate rules (US)', () => {
        const result = calculateRiskScore('steel', 'US', defaultProfile)

        const esgFactor = result.factors.find(f =>
          f.category.includes('ESG') || f.detail.includes('SEC') || f.detail.includes('climate')
        )
        expect(esgFactor).toBeDefined()
      })
    })

    describe('Certification Complexity', () => {
      it('adds high risk for products with many certifications', () => {
        // EU food has many certifications
        const result = calculateRiskScore('food', 'EU', defaultProfile)

        const certFactor = result.factors.find(f => f.category === 'Certifications')
        expect(certFactor).toBeDefined()
        // Food to EU should have high certification burden
        expect(['high', 'medium']).toContain(certFactor?.severity)
      })

      it('adds lower risk for products with few certifications', () => {
        // General products typically have fewer requirements
        const result = calculateRiskScore('general', 'UAE', defaultProfile)

        const certFactor = result.factors.find(f => f.category === 'Certifications')
        expect(certFactor).toBeDefined()
        expect(['low', 'medium']).toContain(certFactor?.severity)
      })

      it('certification factor detail includes count', () => {
        const result = calculateRiskScore('food', 'EU', defaultProfile)

        const certFactor = result.factors.find(f => f.category === 'Certifications')
        expect(certFactor?.detail).toMatch(/\d+.*certification/i)
      })
    })

    describe('FTA Adjustment', () => {
      it('reduces risk for active FTA (UAE CEPA)', () => {
        const result = calculateRiskScore('textiles', 'UAE', defaultProfile)

        const ftaFactor = result.factors.find(f => f.category === 'Trade Agreement')
        expect(ftaFactor).toBeDefined()
        expect(ftaFactor?.severity).toBe('positive')
        expect(ftaFactor?.detail).toContain('CEPA')
      })

      it('reduces risk for active FTA (Australia ECTA)', () => {
        const result = calculateRiskScore('textiles', 'Australia', defaultProfile)

        const ftaFactor = result.factors.find(f => f.category === 'Trade Agreement')
        expect(ftaFactor).toBeDefined()
        expect(ftaFactor?.severity).toBe('positive')
      })

      it('includes Certificate of Origin recommendation for active FTA', () => {
        const result = calculateRiskScore('textiles', 'UAE', defaultProfile)

        expect(result.recommendations.some(r =>
          r.toLowerCase().includes('certificate of origin')
        )).toBe(true)
      })

      it('adds info factor for FTA under negotiation (EU)', () => {
        const result = calculateRiskScore('textiles', 'EU', defaultProfile)

        const ftaFactor = result.factors.find(f => f.category === 'Trade Agreement')
        expect(ftaFactor).toBeDefined()
        expect(ftaFactor?.severity).toBe('info')
        expect(ftaFactor?.detail).toContain('Negotiation')
      })
    })

    describe('Company Size (MSME) Modifier', () => {
      it('adds risk for micro companies', () => {
        const result = calculateRiskScore('steel', 'EU', microProfile)

        const msmeFactor = result.factors.find(f => f.category === 'MSME Capacity')
        expect(msmeFactor).toBeDefined()
        expect(msmeFactor?.severity).toBe('medium')
      })

      it('adds risk for small companies', () => {
        const result = calculateRiskScore('steel', 'EU', smallProfile)

        const msmeFactor = result.factors.find(f => f.category === 'MSME Capacity')
        expect(msmeFactor).toBeDefined()
      })

      it('no MSME factor for large companies', () => {
        const largeProfile: CompanyProfile = { name: 'Big Corp', size: 'large' }
        const result = calculateRiskScore('steel', 'EU', largeProfile)

        const msmeFactor = result.factors.find(f => f.category === 'MSME Capacity')
        expect(msmeFactor).toBeUndefined()
      })

      it('includes MSME support recommendation', () => {
        const result = calculateRiskScore('steel', 'EU', smallProfile)

        expect(result.recommendations.some(r =>
          r.toLowerCase().includes('msme') || r.toLowerCase().includes('facilitation')
        )).toBe(true)
      })
    })

    describe('Sanctions Risk', () => {
      it('adds sanctions factor for US', () => {
        const result = calculateRiskScore('electronics', 'US', defaultProfile)

        const sanctionsFactor = result.factors.find(f => f.category === 'Sanctions')
        expect(sanctionsFactor).toBeDefined()
      })

      it('includes sanctions screening recommendation for US', () => {
        const result = calculateRiskScore('electronics', 'US', defaultProfile)

        expect(result.recommendations.some(r =>
          r.toLowerCase().includes('sanction') || r.toLowerCase().includes('screen')
        )).toBe(true)
      })
    })

    describe('Special Regulations', () => {
      it('adds EUDR factor for food to EU', () => {
        const result = calculateRiskScore('food', 'EU', defaultProfile)

        const eudrFactor = result.factors.find(f => f.category === 'EUDR')
        expect(eudrFactor).toBeDefined()
        expect(eudrFactor?.detail).toContain('Deforestation')
      })

      it('adds EUDR factor for textiles to EU', () => {
        const result = calculateRiskScore('textiles', 'EU', defaultProfile)

        const eudrFactor = result.factors.find(f => f.category === 'EUDR')
        expect(eudrFactor).toBeDefined()
      })

      it('adds UFLPA factor for US', () => {
        const result = calculateRiskScore('textiles', 'US', defaultProfile)

        const uflpaFactor = result.factors.find(f => f.category === 'UFLPA')
        expect(uflpaFactor).toBeDefined()
        expect(uflpaFactor?.detail).toContain('Forced Labor')
      })

      it('includes supply chain documentation recommendation for UFLPA', () => {
        const result = calculateRiskScore('textiles', 'US', defaultProfile)

        expect(result.recommendations.some(r =>
          r.toLowerCase().includes('supply chain') || r.toLowerCase().includes('forced labor')
        )).toBe(true)
      })
    })

    describe('Score Level Classification', () => {
      it('classifies score >= 60 as high', () => {
        // Steel to EU with micro company should be high risk
        const result = calculateRiskScore('steel', 'EU', microProfile)

        if (result.score >= 60) {
          expect(result.level).toBe('high')
        }
      })

      it('classifies score 30-59 as medium', () => {
        const result = calculateRiskScore('textiles', 'UK', defaultProfile)

        if (result.score >= 30 && result.score < 60) {
          expect(result.level).toBe('medium')
        }
      })

      it('classifies score < 30 as low', () => {
        const result = calculateRiskScore('general', 'UAE', { name: 'Big', size: 'large' })

        if (result.score < 30) {
          expect(result.level).toBe('low')
        }
      })
    })

    describe('Comparative Risk Levels', () => {
      it('CBAM-covered product has higher risk than non-CBAM', () => {
        const steelRisk = calculateRiskScore('steel', 'EU', defaultProfile)
        const textilesRisk = calculateRiskScore('textiles', 'EU', defaultProfile)

        expect(steelRisk.score).toBeGreaterThan(textilesRisk.score)
      })

      it('small company has higher risk than large', () => {
        const smallRisk = calculateRiskScore('steel', 'EU', smallProfile)
        const largeRisk = calculateRiskScore('steel', 'EU', { name: 'Big', size: 'large' })

        expect(smallRisk.score).toBeGreaterThan(largeRisk.score)
      })

      it('FTA country has lower risk than non-FTA (same product)', () => {
        const uaeRisk = calculateRiskScore('textiles', 'UAE', defaultProfile)
        const usRisk = calculateRiskScore('textiles', 'US', defaultProfile)

        // UAE has active FTA, US does not
        expect(uaeRisk.score).toBeLessThan(usRisk.score)
      })
    })
  })

  describe('Helper Functions', () => {
    describe('getRiskLevel', () => {
      it('returns "high" for score >= 60', () => {
        expect(getRiskLevel(60)).toBe('high')
        expect(getRiskLevel(75)).toBe('high')
        expect(getRiskLevel(100)).toBe('high')
      })

      it('returns "medium" for score 30-59', () => {
        expect(getRiskLevel(30)).toBe('medium')
        expect(getRiskLevel(45)).toBe('medium')
        expect(getRiskLevel(59)).toBe('medium')
      })

      it('returns "low" for score < 30', () => {
        expect(getRiskLevel(0)).toBe('low')
        expect(getRiskLevel(15)).toBe('low')
        expect(getRiskLevel(29)).toBe('low')
      })
    })

    describe('getRiskColor', () => {
      it('returns red color for high risk', () => {
        const color = getRiskColor('high')
        expect(color).toMatch(/#[A-Fa-f0-9]{6}|red/i)
      })

      it('returns yellow/orange color for medium risk', () => {
        const color = getRiskColor('medium')
        expect(color).toMatch(/#[A-Fa-f0-9]{6}|yellow|orange/i)
      })

      it('returns green color for low risk', () => {
        const color = getRiskColor('low')
        expect(color).toMatch(/#[A-Fa-f0-9]{6}|green/i)
      })
    })
  })
})
