// ============================================================================
// Currency conversion — single source of truth
//
// Every rupee figure the product shows (RoDTEP entitlement, CBAM levy, CA
// dashboard totals) derives from these rates. They were previously copy-pasted
// as a frozen literal into five separate files, so a correction in one place
// silently left four others wrong.
//
// IMPORTANT: for an export shipment the legally correct rate is the CBIC
// notified export rate in force on the shipping bill date — not today's market
// rate, and not a constant. CBIC notifies fortnightly. Until those rates are
// loaded, `source: 'fallback'` marks a figure as an estimate; callers that show
// money to a user should surface that rather than implying precision.
// ============================================================================

export type FxSource = 'cbic' | 'fallback'

export interface DatedRateTable {
  /** ISO date this table applies from, inclusive. */
  effectiveFrom: string
  source: FxSource
  /** Units of INR per 1 unit of the keyed currency. */
  rates: Record<string, number>
}

/**
 * Ordered newest-last. Adding a CBIC fortnight means appending a table with
 * `source: 'cbic'` — no call site changes.
 */
const RATE_TABLES: DatedRateTable[] = [
  {
    effectiveFrom: '1970-01-01',
    source: 'fallback',
    rates: { INR: 1, USD: 84, EUR: 91, GBP: 107, AED: 23 },
  },
]

const DEFAULT_CURRENCY = 'USD'

function normaliseCurrency(currency: string | null | undefined): string {
  const code = (currency ?? DEFAULT_CURRENCY).trim().toUpperCase()
  return code.length > 0 ? code : DEFAULT_CURRENCY
}

/** The rate table in force on `onDate` (defaults to today). */
export function rateTableFor(onDate?: string | Date): DatedRateTable {
  const when = onDate ? new Date(onDate) : new Date()
  const stamp = Number.isNaN(when.getTime())
    ? new Date().toISOString().slice(0, 10)
    : when.toISOString().slice(0, 10)

  let applicable = RATE_TABLES[0]
  for (const table of RATE_TABLES) {
    if (table.effectiveFrom <= stamp) applicable = table
  }
  return applicable
}

export interface FxRate {
  currency: string
  /** INR per 1 unit of `currency`. */
  rate: number
  source: FxSource
  effectiveFrom: string
  /** True when the currency was not in the table and USD was substituted. */
  fellBackToDefault: boolean
}

export function fxRateToINR(currency: string | null | undefined, onDate?: string | Date): FxRate {
  const table = rateTableFor(onDate)
  const code = normaliseCurrency(currency)
  const direct = table.rates[code]
  const rate = direct ?? table.rates[DEFAULT_CURRENCY]

  return {
    currency: code,
    rate,
    source: table.source,
    effectiveFrom: table.effectiveFrom,
    fellBackToDefault: direct === undefined,
  }
}

/**
 * Convert `value` from `currency` into INR using the rate in force on `onDate`.
 * Returns an unrounded number — round at the point of display, not here.
 */
export function convertToINR(
  value: number,
  currency: string | null | undefined,
  onDate?: string | Date
): number {
  if (!Number.isFinite(value)) return 0
  return value * fxRateToINR(currency, onDate).rate
}

/** True while no CBIC-notified table covers `onDate`, i.e. figures are estimates. */
export function fxIsEstimate(onDate?: string | Date): boolean {
  return rateTableFor(onDate).source !== 'cbic'
}

/** Currencies the tables actually carry — for populating pickers. */
export function supportedCurrencies(onDate?: string | Date): string[] {
  return Object.keys(rateTableFor(onDate).rates)
}
