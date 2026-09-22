// ============================================================================
// Export proceeds realisation period (BRC / FIRC)
//
// The tracker hardcoded 270 days and labelled it ">9 mo". That becomes wrong
// on 2026-10-01, when the realisation period changes to 15 months — or 18
// months where the export is invoiced or settled in rupees.
//
// Getting this wrong is not cosmetic: the screen tells an exporter whether
// they are in breach. Flagging a compliant shipment as overdue sends them to
// their AD bank for nothing; missing a real breach is worse.
// ============================================================================

/** Date the longer realisation periods take effect. */
export const BRC_RULE_CHANGE_DATE = '2026-10-01'

/** Period for exports invoiced before the rule change. */
export const BRC_PERIOD_MONTHS_LEGACY = 9
/** Standard period from the rule change. */
export const BRC_PERIOD_MONTHS_STANDARD = 15
/** Period where the export is invoiced or settled in rupees. */
export const BRC_PERIOD_MONTHS_INR = 18

function isoDay(date: string | Date): string | null {
  const d = date instanceof Date ? date : new Date(date)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/** Add whole months, clamping to the last valid day (31 Jan + 1mo = 28/29 Feb). */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime())
  const targetMonth = result.getUTCMonth() + months
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(targetMonth)
  const lastDayOfTargetMonth = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDayOfTargetMonth))
  return result
}

function isRupee(currency: string | null | undefined): boolean {
  return (currency ?? '').trim().toUpperCase() === 'INR'
}

export interface RealisationTerms {
  months: number
  /** True when the longer rupee period applies. */
  rupeeTerms: boolean
  /** True when the pre-change period was used. */
  legacy: boolean
}

/**
 * Months allowed to realise proceeds for an export invoiced on `invoiceDate`.
 *
 * NOTE ON THE TRANSITION: this keys the period to the invoice date, so an
 * invoice raised before the change keeps the old period. Whether the longer
 * period also extends invoices already outstanding on the change date should
 * be confirmed with the AD bank before relying on it — the conservative
 * reading is implemented here.
 */
export function realisationPeriodMonths(
  invoiceDate: string | Date,
  invoiceCurrency: string | null | undefined,
  settlementCurrency?: string | null
): RealisationTerms {
  const stamp = isoDay(invoiceDate)
  const rupeeTerms = isRupee(invoiceCurrency) || isRupee(settlementCurrency)

  if (stamp !== null && stamp < BRC_RULE_CHANGE_DATE) {
    return { months: BRC_PERIOD_MONTHS_LEGACY, rupeeTerms, legacy: true }
  }
  return {
    months: rupeeTerms ? BRC_PERIOD_MONTHS_INR : BRC_PERIOD_MONTHS_STANDARD,
    rupeeTerms,
    legacy: false,
  }
}

/** Date by which proceeds must be realised, or null when the invoice date is unusable. */
export function realisationDeadline(
  invoiceDate: string | Date | null,
  invoiceCurrency: string | null | undefined,
  settlementCurrency?: string | null
): string | null {
  if (!invoiceDate) return null
  const stamp = isoDay(invoiceDate)
  if (stamp === null) return null
  const { months } = realisationPeriodMonths(stamp, invoiceCurrency, settlementCurrency)
  return isoDay(addMonths(new Date(`${stamp}T00:00:00Z`), months))
}

/** Whole days remaining until the deadline; negative once past it. */
export function daysToRealisationDeadline(
  invoiceDate: string | Date | null,
  invoiceCurrency: string | null | undefined,
  asOf: string | Date = new Date(),
  settlementCurrency?: string | null
): number | null {
  const deadline = realisationDeadline(invoiceDate, invoiceCurrency, settlementCurrency)
  const today = isoDay(asOf)
  if (deadline === null || today === null) return null
  const ms = new Date(`${deadline}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()
  return Math.round(ms / 86_400_000)
}

/** Overdue when the deadline has passed and proceeds are not fully realised. */
export function isRealisationOverdue(
  invoiceDate: string | Date | null,
  invoiceCurrency: string | null | undefined,
  alreadyRealised: boolean,
  asOf: string | Date = new Date(),
  settlementCurrency?: string | null
): boolean {
  if (alreadyRealised) return false
  const remaining = daysToRealisationDeadline(invoiceDate, invoiceCurrency, asOf, settlementCurrency)
  return remaining !== null && remaining < 0
}
