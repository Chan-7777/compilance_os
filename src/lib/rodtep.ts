// ============================================================================
// RoDTEP entitlement — basis and notification rules
//
// Two things were wrong in the figures this product shows:
//
// 1. BASIS. RoDTEP is paid as a percentage of FOB value. Entitlement was being
//    computed from `shipment_value`, which for a CIF or CFR sale includes
//    freight and insurance. Those are not part of FOB, so the claim was
//    overstated for every non-FOB invoice — and the exporter may file on it.
//
// 2. NOTIFICATION WINDOW. The scheme's rates are notified only to a fixed date.
//    Past it, there is no notified rate to claim against, and showing a
//    confident rupee figure invites a filing that cannot succeed.
//
// This module holds both rules so they are computed in one place and tested.
// It deliberately does not fetch rates — that stays in api.ts.
// ============================================================================

/**
 * Last date for which RoDTEP rates are notified. Update when the scheme is
 * extended; do not silently extend it, because the whole point is to stop
 * showing claimable figures for periods with no notified rate.
 */
export const RODTEP_NOTIFIED_UNTIL = '2026-09-30'

function isoDay(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date)
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
}

/**
 * Whether RoDTEP is notified for an export cleared on `letExportDate`.
 * Keyed to Let Export Order date — that is what determines the applicable
 * rate, not the invoice date and not today.
 */
export function isRodtepNotified(letExportDate: string | Date): boolean {
  return isoDay(letExportDate) <= RODTEP_NOTIFIED_UNTIL
}

export type ValueBasis = 'fob' | 'cif' | 'cfr' | 'unknown'

export interface ValueInput {
  /** Invoice or shipment value as recorded, in a single currency. */
  value: number
  basis: ValueBasis
  /** Freight component, same currency. Required to reduce CIF/CFR to FOB. */
  freight?: number
  /** Insurance component, same currency. Required to reduce CIF to FOB. */
  insurance?: number
}

export interface FobResult {
  /** FOB value, or null when it cannot be established. */
  fob: number | null
  /** True when the caller supplied something other than a real FOB figure. */
  assumed: boolean
  /** Why the value is assumed or unavailable — surface this to the user. */
  note?: string
}

/**
 * Reduce a recorded value to FOB.
 *
 * `unknown` is treated as FOB so existing records keep producing a figure —
 * but `assumed` is set, and callers must show that rather than presenting the
 * number as exact. Once invoices carry an Incoterm and freight/insurance
 * lines, basis stops being `unknown` and this becomes exact.
 */
export function deriveFobValue(input: ValueInput): FobResult {
  const { value, basis, freight, insurance } = input

  if (!Number.isFinite(value) || value < 0) {
    return { fob: null, assumed: false, note: 'Value is missing or not a number' }
  }

  if (basis === 'fob') return { fob: value, assumed: false }

  if (basis === 'cfr') {
    if (!Number.isFinite(freight as number)) {
      return { fob: null, assumed: false, note: 'CFR value needs a freight amount before FOB can be derived' }
    }
    return { fob: Math.max(0, value - (freight as number)), assumed: false }
  }

  if (basis === 'cif') {
    if (!Number.isFinite(freight as number) || !Number.isFinite(insurance as number)) {
      return { fob: null, assumed: false, note: 'CIF value needs freight and insurance amounts before FOB can be derived' }
    }
    return { fob: Math.max(0, value - (freight as number) - (insurance as number)), assumed: false }
  }

  return {
    fob: value,
    assumed: true,
    note: 'Incoterm not recorded — treated as FOB. If this sale was CIF or CFR the entitlement is overstated.',
  }
}

export interface EntitlementInput {
  fobInr: number | null
  ratePct: number
  letExportDate: string | Date
}

export interface EntitlementResult {
  /** Rupee entitlement, or null when it cannot be claimed or computed. */
  amountInr: number | null
  claimable: boolean
  note?: string
}

/** Entitlement = FOB (INR) × rate %, only within the notified window. */
export function rodtepEntitlement({ fobInr, ratePct, letExportDate }: EntitlementInput): EntitlementResult {
  if (fobInr === null || !Number.isFinite(fobInr)) {
    return { amountInr: null, claimable: false, note: 'FOB value could not be established' }
  }
  if (!Number.isFinite(ratePct) || ratePct <= 0) {
    return { amountInr: null, claimable: false, note: 'No RoDTEP rate for this HS code' }
  }
  if (!isRodtepNotified(letExportDate)) {
    return {
      amountInr: null,
      claimable: false,
      note: `RoDTEP is notified only to ${RODTEP_NOTIFIED_UNTIL}. There is no notified rate for this export date.`,
    }
  }
  return { amountInr: Math.round(fobInr * (ratePct / 100)), claimable: true }
}
