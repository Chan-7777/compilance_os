// ============================================================================
// Shipment figures from invoice lines
//
// A shipment with an issued commercial invoice is priced and gate-checked per
// invoice line, not on the single shipments.hs_code / shipment_value pair:
//   * gate check runs for every DISTINCT line HS code; the worst status wins;
//   * RoDTEP takes each line's own HS rate on that line's FOB, rounded per
//     line, then summed;
//   * Shipment.hsCode becomes the HS code of the highest-value line.
// A shipment with no issued commercial invoice keeps the single-HS path;
// shipmentLines() returns null to say so.
//
// Money rules:
//   * Line amounts are in the invoice currency and are converted with THAT
//     invoice's fx_rate_inr — the rate it was issued at — never the fallback
//     table in fx.ts.
//   * Freight and insurance are recorded once per invoice. For CFR/CPT and
//     CIF/CIP they are split across lines in proportion to line value to get
//     each line's FOB. The rounding remainder goes on the last line, so the
//     line FOBs sum to the invoice FOB exactly.
//   * EXW and the D-terms (DAP, DPU, DDP) produce no FOB: EXW is below FOB and
//     the D-terms carry costs past the port we don't record. No figure beats
//     a wrong one on a claim.
// Pure: no Supabase, no fx.ts. The loaders in api.ts feed it.
// ============================================================================

import { deriveFobValue, rodtepEntitlement, type ValueBasis } from './rodtep'
import type { GateCheckResult, GateStatus } from '@/types'

export interface LinkedInvoiceLine {
  lineNo: number
  /** Digits only, as stored on invoice_line_items. */
  hsCode: string
  /** Invoice currency. */
  amount: number
}

export interface LinkedInvoice {
  id: string
  invoiceNumber?: string | null
  kind: 'proforma' | 'commercial'
  status: 'draft' | 'issued' | 'cancelled'
  incoterm: string | null
  currency: string
  /** INR per 1 unit of currency, as issued. */
  fxRateInr: number | null
  freightAmount: number | null
  insuranceAmount: number | null
  lines: LinkedInvoiceLine[]
}

export interface ShipmentLine {
  invoiceId: string
  invoiceNumber: string | null
  lineNo: number
  hsCode: string
  currency: string
  /** Incoterm basis the FOB was derived from, lower-case; null when none could be. */
  basis: ValueBasis | null
  amount: number
  /** Line value in INR at the invoice's rate; ranks lines for the primary HS. */
  valueInr: number | null
  /** Line FOB in the invoice currency, 2 dp. */
  fob: number | null
  /** Line FOB in INR, 2 dp. */
  fobInr: number | null
  note?: string
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Only issued commercial invoices describe what actually shipped. */
export function countingInvoices(invoices: LinkedInvoice[]): LinkedInvoice[] {
  return invoices.filter(i => i.kind === 'commercial' && i.status === 'issued')
}

const BASIS_BY_INCOTERM: Record<string, ValueBasis> = {
  FOB: 'fob', FCA: 'fob', FAS: 'fob',
  CFR: 'cfr', CPT: 'cfr',
  CIF: 'cif', CIP: 'cif',
}

/** Per-line FOB for one invoice, freight and insurance split by line value. */
export function apportionInvoiceFob(invoice: LinkedInvoice): ShipmentLine[] {
  const lines = [...invoice.lines].sort((a, b) => a.lineNo - b.lineNo)
  const total = lines.reduce((s, l) => s + l.amount, 0)
  const incoterm = (invoice.incoterm ?? '').toUpperCase()
  const basis = BASIS_BY_INCOTERM[incoterm] ?? null
  const fx = invoice.fxRateInr !== null && Number.isFinite(invoice.fxRateInr) && invoice.fxRateInr > 0
    ? invoice.fxRateInr : null

  let fobTotal: number | null = null
  let note: string | undefined
  if (basis === null) {
    note = incoterm
      ? `${incoterm} value is not FOB and the costs to reduce it are not recorded — no RoDTEP figure.`
      : 'Invoice has no Incoterm — no RoDTEP figure.'
  } else {
    const r = deriveFobValue({
      value: total, basis,
      freight: invoice.freightAmount ?? undefined,
      insurance: invoice.insuranceAmount ?? undefined,
    })
    fobTotal = r.fob === null ? null : round2(r.fob)
    note = r.note
  }
  if (fx === null) {
    note = [note, 'Invoice has no exchange rate — no rupee figure.'].filter(Boolean).join(' ')
  }

  let allocated = 0
  return lines.map((l, i) => {
    let fob: number | null = null
    if (fobTotal !== null) {
      fob = i === lines.length - 1
        ? round2(fobTotal - allocated)
        : round2(total > 0 ? fobTotal * (l.amount / total) : 0)
      allocated += fob
    }
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber ?? null,
      lineNo: l.lineNo,
      hsCode: l.hsCode,
      currency: invoice.currency,
      basis,
      amount: l.amount,
      valueInr: fx === null ? null : round2(l.amount * fx),
      fob,
      fobInr: fob === null || fx === null ? null : round2(fob * fx),
      ...(note ? { note } : {}),
    }
  })
}

/** Lines of every issued commercial invoice, or null when none counts. */
export function shipmentLines(invoices: LinkedInvoice[]): ShipmentLine[] | null {
  const counting = countingInvoices(invoices)
  if (counting.length === 0) return null
  return counting.flatMap(apportionInvoiceFob)
}

export function distinctHsCodes(lines: ShipmentLine[]): string[] {
  return [...new Set(lines.map(l => l.hsCode))]
}

/**
 * HS code of the highest-value line, compared in INR so lines on invoices in
 * different currencies rank correctly. Ties keep the earlier line.
 */
export function primaryHsCode(lines: ShipmentLine[]): string | null {
  let best: ShipmentLine | null = null
  for (const l of lines) {
    if (best === null || (l.valueInr ?? -1) > (best.valueInr ?? -1)) best = l
  }
  return best?.hsCode ?? null
}

export interface LineRate {
  rate: number
  matchType?: string
}

export interface LineEntitlement {
  line: ShipmentLine
  ratePct: number
  matchType?: string
  amountInr: number | null
  claimable: boolean
  note?: string
}

export interface LinesRodtep {
  /** Sum of claimable line entitlements; null when no line is claimable. */
  amountInr: number | null
  claimable: boolean
  /** False when some line has no entitlement — the total is a floor. */
  complete: boolean
  lines: LineEntitlement[]
}

/** RoDTEP per line at that line's HS rate, rounded per line, then summed. */
export function rodtepForLines(
  lines: ShipmentLine[],
  rateFor: (hsCode: string) => LineRate | undefined,
  letExportDate: string | Date,
): LinesRodtep {
  const out = lines.map((line): LineEntitlement => {
    const r = rateFor(line.hsCode)
    const ratePct = r?.rate ?? 0
    const e = rodtepEntitlement({ fobInr: line.fobInr, ratePct, letExportDate })
    const note = e.claimable ? undefined : (line.fobInr === null && line.note ? line.note : e.note)
    return {
      line, ratePct, matchType: r?.matchType,
      amountInr: e.amountInr, claimable: e.claimable,
      ...(note ? { note } : {}),
    }
  })
  const claimable = out.filter(l => l.claimable)
  return {
    amountInr: claimable.length === 0 ? null : claimable.reduce((s, l) => s + (l.amountInr ?? 0), 0),
    claimable: claimable.length > 0,
    complete: claimable.length === out.length,
    lines: out,
  }
}

/**
 * The part of a per-line entitlement that may go in a claim file: claimable
 * lines whose rate came from the schedule. A default rate is not filed, the
 * same rule the shipment-level claim file applies to a whole shipment.
 */
export function filingReadyInr(r: LinesRodtep): number {
  return r.lines.reduce((sum, l) => sum + (l.claimable && l.matchType !== 'default' ? (l.amountInr ?? 0) : 0), 0)
}

const SEVERITY: Record<GateStatus, number> = { approved: 0, pending: 1, blocked: 2 }

/** blocked > pending > approved. Nothing checked is not an approval. */
export function worstGateStatus(statuses: GateStatus[]): GateStatus {
  if (statuses.length === 0) return 'pending'
  return statuses.reduce((w, s) => (SEVERITY[s] > SEVERITY[w] ? s : w))
}

/**
 * Combine one gate result per HS code. results[0] must be the primary HS: its
 * trade-terms fields (FTA, CoO, rules of origin) stand for the shipment.
 */
export function mergeGateResults(results: GateCheckResult[]): GateCheckResult {
  const [primary] = results
  const gate_status = worstGateStatus(results.map(r => r.gate_status))
  const reasons = [...new Set(
    results.filter(r => r.gate_status === gate_status).flatMap(r => r.blocking_reasons),
  )]
  const codes = results.map(r => r.hs_validation.hs_code)
  const allValid = results.every(r => r.hs_validation.valid)
  const cbam = results.find(r => r.cbam_scope?.applies)?.cbam_scope ?? primary.cbam_scope
  return {
    ...primary,
    gate_status,
    blocking_reasons: reasons,
    hs_validation: {
      ...primary.hs_validation,
      valid: allValid,
      hs_code: codes.join(', '),
      description: allValid
        ? `${codes.length} HS codes from the invoice lines, each checked`
        : 'An invoice line has no valid HS code — required for customs clearance',
    },
    cbam_scope: cbam,
    per_hs: results.map(r => ({
      hs_code: r.hs_validation.hs_code,
      gate_status: r.gate_status,
      reasons: r.blocking_reasons,
    })),
  }
}
