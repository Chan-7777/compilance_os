// ============================================================================
// Risk Scoring Engine - Calculate compliance risk for product-country pairs
// ============================================================================

import type {
  CompanyProfile,
  CountryCode,
  RiskFactor,
  RiskLevel,
  RiskResult,
  RiskSeverity,
} from '@/types'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { FTA_DATABASE } from '@/data/fta'
import { COLORS } from '@/styles/colors'

/**
 * Calculate comprehensive risk score for a product-country-company combination
 */
export function calculateRiskScore(
  product: string,
  country: string,
  companyProfile: CompanyProfile
): RiskResult {
  const countryData = REGULATORY_DB[country as CountryCode]

  // Return default for unknown country
  if (!countryData) {
    return {
      score: 50,
      level: 'medium',
      factors: [],
      recommendations: [],
    }
  }

  let score = 0
  const factors: RiskFactor[] = []
  const recommendations: string[] = []

  // ─── CBAM RISK ────────────────────────────────────────────────────────
  if (countryData.cbam?.active) {
    const cbamSectors = countryData.cbam.coveredSectors || []
    const isCovered =
      cbamSectors.includes(product) || product === 'chemicals' || product === 'steel'

    if (isCovered) {
      score += 30
      factors.push({
        category: 'CBAM',
        severity: 'high',
        detail: `Product falls under ${country} CBAM scope. ${countryData.cbam.phase}`,
      })
      recommendations.push('Implement carbon emissions tracking at facility level')
      recommendations.push('Register with authorized CBAM declarant in destination country')
      recommendations.push('Obtain verified emissions data from accredited verifier')
    } else {
      score += 5
      factors.push({
        category: 'CBAM',
        severity: 'low',
        detail: 'Product not currently in CBAM scope but monitor expansion',
      })
    }
  }

  // ─── ESG COMPLIANCE RISK ──────────────────────────────────────────────
  if (countryData.esg?.scope3Required) {
    score += 15
    factors.push({
      category: 'ESG',
      severity: 'high',
      detail: 'Scope 3 emissions reporting required for supply chain',
    })
    recommendations.push('Map complete supply chain for Scope 3 emissions')
  }

  if (countryData.esg?.csrd || countryData.esg?.secClimate) {
    score += 10
    factors.push({
      category: 'ESG Disclosure',
      severity: 'medium',
      detail: 'Buyer may require ESG data for their own compliance reporting',
    })
    recommendations.push('Prepare ESG data package for buyer\'s compliance needs')
  }

  // ─── CERTIFICATION COMPLEXITY ─────────────────────────────────────────
  const certs =
    countryData.certifications?.[product] || countryData.certifications?.general || []

  if (certs.length > 5) {
    score += 15
    factors.push({
      category: 'Certifications',
      severity: 'high',
      detail: `${certs.length} certifications required — high compliance burden`,
    })
  } else if (certs.length > 2) {
    score += 8
    factors.push({
      category: 'Certifications',
      severity: 'medium',
      detail: `${certs.length} certifications required`,
    })
  } else {
    score += 3
    factors.push({
      category: 'Certifications',
      severity: 'low',
      detail: `${certs.length} certifications required`,
    })
  }

  // ─── SANCTIONS RISK ───────────────────────────────────────────────────
  if (countryData.sanctions && countryData.sanctions.length > 0) {
    score += 10
    factors.push({
      category: 'Sanctions',
      severity: 'medium',
      detail: 'Sanctions screening required for this destination',
    })
    recommendations.push('Screen all parties against sanctions lists before shipment')
  }

  // ─── PACKAGING & LABELING ─────────────────────────────────────────────
  if (countryData.packaging && countryData.packaging.length > 2) {
    score += 8
    factors.push({
      category: 'Packaging',
      severity: 'medium',
      detail: 'Complex packaging regulations in effect',
    })
  }

  // ─── FTA UTILIZATION ──────────────────────────────────────────────────
  const fta = FTA_DATABASE[country as CountryCode]
  if (fta) {
    if (fta.preferentialTariff) {
      score -= 5
      factors.push({
        category: 'Trade Agreement',
        severity: 'positive',
        detail: `${fta.name} is active. Preferential tariffs available with proper Certificate of Origin.`,
      })
      recommendations.push(
        'Ensure Certificate of Origin is correctly filed for preferential tariff'
      )
    } else if (fta.status === 'Under Negotiation') {
      score += 5
      factors.push({
        category: 'Trade Agreement',
        severity: 'info',
        detail: `${fta.name}: ${fta.status}. ${fta.notes}`,
      })
    }
  }

  // ─── COMPANY SIZE (MSME) MODIFIER ─────────────────────────────────────
  if (companyProfile?.size === 'micro' || companyProfile?.size === 'small') {
    score += 10
    factors.push({
      category: 'MSME Capacity',
      severity: 'medium',
      detail: 'Smaller firms face higher relative compliance burden',
    })
    recommendations.push(
      'Consider MSME export facilitation schemes and subsidized certification programs'
    )
  }

  // ─── SPECIAL REGULATIONS ──────────────────────────────────────────────

  // EU Deforestation Regulation (EUDR)
  if (country === 'EU' && (product === 'food' || product === 'textiles')) {
    score += 10
    factors.push({
      category: 'EUDR',
      severity: 'medium',
      detail: 'EU Deforestation Regulation may apply — due diligence on sourcing required',
    })
    recommendations.push('Map supply chain for deforestation-free sourcing compliance')
  }

  // US Forced Labor Prevention Act (UFLPA)
  if (country === 'US') {
    score += 5
    factors.push({
      category: 'UFLPA',
      severity: 'medium',
      detail: 'Uyghur Forced Labor Prevention Act — supply chain due diligence required',
    })
    recommendations.push('Document supply chain to demonstrate no forced labor involvement')
  }

  // ─── NORMALIZE SCORE ──────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score))
  const level = getRiskLevel(score)

  return { score, level, factors, recommendations }
}

/**
 * Determine risk level from numeric score
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

/**
 * Get color for risk level visualization
 */
export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'high':
      return COLORS.red
    case 'medium':
      return COLORS.yellow
    case 'low':
      return COLORS.green
    default:
      return COLORS.textMuted
  }
}

/**
 * Get background color (dimmed) for risk level
 */
export function getRiskBgColor(level: RiskLevel): string {
  switch (level) {
    case 'high':
      return COLORS.redDim
    case 'medium':
      return COLORS.yellowDim
    case 'low':
      return COLORS.greenDim
    default:
      return 'transparent'
  }
}

/**
 * Get color for risk factor severity
 */
export function getSeverityColor(severity: RiskSeverity): string {
  switch (severity) {
    case 'high':
      return COLORS.red
    case 'medium':
      return COLORS.yellow
    case 'low':
      return COLORS.textMuted
    case 'positive':
      return COLORS.green
    case 'info':
      return COLORS.blue
    default:
      return COLORS.textMuted
  }
}

/**
 * Calculate risk for multiple countries and return sorted results
 */
export function calculateMultiCountryRisk(
  product: string,
  countries: CountryCode[],
  companyProfile: CompanyProfile
): Array<{ country: CountryCode } & RiskResult> {
  return countries
    .map(country => ({
      country,
      ...calculateRiskScore(product, country, companyProfile),
    }))
    .sort((a, b) => b.score - a.score) // Highest risk first
}

/**
 * Get overall risk summary across multiple countries
 */
export function getOverallRisk(
  riskResults: RiskResult[]
): { score: number; level: RiskLevel } | null {
  if (riskResults.length === 0) return null

  const avg = riskResults.reduce((sum, r) => sum + r.score, 0) / riskResults.length
  const score = Math.round(avg)

  return {
    score,
    level: getRiskLevel(score),
  }
}
