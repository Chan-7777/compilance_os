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

// ----------------------------------------------------------------------------
// Runtime source of truth
//
// The table above is the built-in fallback. fta_agreements in the database is
// authoritative when it can be read, so a trade deal can be corrected without
// shipping a new build. Consumers read FTA_DATABASE at call time, so patching
// it in place updates every caller without changing their signatures.
// ----------------------------------------------------------------------------

export interface FTAAgreementRow {
  country_code: string
  name?: string | null
  status?: string | null
  effective_date?: string | null
  round?: string | null
  preferential_tariff?: boolean | null
  notes?: string | null
  updated_at?: string | null
}

export interface FTASourceMeta {
  source: 'database' | 'built-in'
  /** Newest updated_at across the rows actually applied. */
  updatedAt: string | null
}

/** Confirmations older than this are shown as stale. */
export const FTA_STALE_AFTER_DAYS = 90

let ftaMeta: FTASourceMeta = { source: 'built-in', updatedAt: null }

export function getFTAMeta(): FTASourceMeta {
  return ftaMeta
}

/** Whole days since the data was last confirmed, or null when unknown. */
export function ftaAgeDays(meta: FTASourceMeta = ftaMeta): number | null {
  if (!meta.updatedAt) return null
  const ms = Date.now() - new Date(meta.updatedAt).getTime()
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : null
}

/** Overlay database rows onto the built-in table. Returns how many applied. */
export function applyFTARows(rows: FTAAgreementRow[]): number {
  let applied = 0
  let newest: string | null = null

  for (const row of rows) {
    const code = row.country_code as CountryCode
    const current = FTA_DATABASE[code]
    if (!current) continue

    FTA_DATABASE[code] = {
      name: row.name ?? current.name,
      status: (row.status as FTAStatus['status']) ?? current.status,
      effectiveDate: row.effective_date ?? current.effectiveDate,
      round: row.round ?? current.round,
      preferentialTariff: row.preferential_tariff ?? current.preferentialTariff,
      notes: row.notes ?? current.notes,
    }
    applied++
    if (row.updated_at && (!newest || row.updated_at > newest)) newest = row.updated_at
  }

  if (applied > 0) ftaMeta = { source: 'database', updatedAt: newest }
  return applied
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
