// ============================================================================
// FTA Database - Free Trade Agreement status for India's export destinations
// ============================================================================

import type { CountryCode, FTAStatus, FTADatabase } from '@/types'

export const FTA_DATABASE: FTADatabase = {
  EU: {
    name: 'India-EU FTA',
    status: 'Under Negotiation',
    round: 'Round 7+',
    preferentialTariff: false,
    notes:
      'Negotiations ongoing; interim MFN rates apply. Key sticking points: dairy, auto, data localization',
  },
  US: {
    name: 'India-US Trade Relations',
    status: 'No FTA',
    preferentialTariff: false,
    notes: 'GSP restored partially. Mini trade deals under discussion. Section 301 watch',
  },
  UK: {
    name: 'India-UK FTA',
    status: 'Under Negotiation',
    round: 'Round 14+',
    preferentialTariff: false,
    notes: 'Expected conclusion 2025. Mobility, IP, agriculture are key issues',
  },
  UAE: {
    name: 'India-UAE CEPA',
    status: 'Active',
    effectiveDate: '2022-05-01',
    preferentialTariff: true,
    notes:
      'Covers 90%+ tariff lines. Certificate of Origin required for preferential rates',
  },
  Japan: {
    name: 'India-Japan CEPA + RCEP',
    status: 'Active',
    effectiveDate: '2011-08-01',
    preferentialTariff: true,
    notes: 'Bilateral CEPA + RCEP benefits. Rules of Origin compliance critical',
  },
  Australia: {
    name: 'India-Australia ECTA',
    status: 'Active',
    effectiveDate: '2022-12-29',
    preferentialTariff: true,
    notes:
      'Interim agreement; CECA (comprehensive) under negotiation. 85% tariff lines covered',
  },
}

/**
 * Get list of countries with active preferential tariff agreements
 */
export function getActiveFTAs(): CountryCode[] {
  return (Object.keys(FTA_DATABASE) as CountryCode[]).filter(
    country => FTA_DATABASE[country].preferentialTariff
  )
}

/**
 * Get FTA status for a specific country
 */
export function getFTAByCountry(countryCode: CountryCode): FTAStatus | undefined {
  return FTA_DATABASE[countryCode]
}

/**
 * Check if a country has preferential tariff available
 */
export function hasPreferentialTariff(countryCode: CountryCode): boolean {
  return FTA_DATABASE[countryCode]?.preferentialTariff ?? false
}

/**
 * Get countries with FTAs under negotiation
 */
export function getFTAsUnderNegotiation(): CountryCode[] {
  return (Object.keys(FTA_DATABASE) as CountryCode[]).filter(
    country => FTA_DATABASE[country].status === 'Under Negotiation'
  )
}

/**
 * Get FTA summary for display
 */
export function getFTASummary(countryCode: CountryCode): string {
  const fta = FTA_DATABASE[countryCode]
  if (!fta) return 'Unknown'

  if (fta.preferentialTariff) {
    return `${fta.name} (Active since ${fta.effectiveDate})`
  } else if (fta.status === 'Under Negotiation') {
    return `${fta.name} (${fta.round || 'Ongoing'})`
  }
  return fta.status
}
