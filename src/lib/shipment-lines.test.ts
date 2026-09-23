import { describe, it, expect } from 'vitest'
import {
  countingInvoices, shipmentLines, apportionInvoiceFob, distinctHsCodes, primaryHsCode,
  rodtepForLines, worstGateStatus, mergeGateResults, filingReadyInr,
  type LinkedInvoice,
} from './shipment-lines'
import type { GateCheckResult } from '@/types'

const inv = (over: Partial<LinkedInvoice> = {}): LinkedInvoice => ({
  id: 'inv-1', kind: 'commercial', status: 'issued', incoterm: 'FOB', currency: 'USD',
  fxRateInr: 83.5, freightAmount: null, insuranceAmount: null,
  lines: [{ lineNo: 1, hsCode: '73041910', amount: 1000 }],
  ...over,
})

// One CIF invoice, three lines, two HS codes. Hand-worked:
//   total 10,000; freight 800 + insurance 200 = 1,000 -> FOB 9,000
//   split by value: L1 6000/10000 -> 5,400   L2 3000/10000 -> 2,700   L3 -> 900
//   INR at the invoice's own 83.5: 450,900 / 225,450 / 75,150
const cif = inv({
  incoterm: 'CIF', freightAmount: 800, insuranceAmount: 200,
  lines: [
    { lineNo: 1, hsCode: '73041910', amount: 6000 },
    { lineNo: 2, hsCode: '72081000', amount: 3000 },
    { lineNo: 3, hsCode: '73041910', amount: 1000 },
  ],
})

const RATES: Record<string, number> = { '73041910': 1.2, '72081000': 0.9 }
const rateFor = (hs: string) => (RATES[hs] === undefined ? undefined : { rate: RATES[hs], matchType: 'exact' })

describe('countingInvoices / shipmentLines: which invoices count', () => {
  it('counts only issued commercial invoices', () => {
    const all = [
      inv({ id: 'a' }),
      inv({ id: 'b', status: 'draft' }),
      inv({ id: 'c', status: 'cancelled' }),
      inv({ id: 'd', kind: 'proforma' }),
    ]
    expect(countingInvoices(all).map(i => i.id)).toEqual(['a'])
  })

  it('returns null (keep the single-HS path) when no invoice counts', () => {
    expect(shipmentLines([])).toBeNull()
    expect(shipmentLines([inv({ status: 'draft' }), inv({ kind: 'proforma' }), inv({ status: 'cancelled' })])).toBeNull()
  })

  it('combines the lines of every issued commercial invoice on the shipment', () => {
    const lines = shipmentLines([inv({ id: 'a' }), inv({ id: 'b', lines: [{ lineNo: 1, hsCode: '72081000', amount: 50 }] })])
    expect(lines?.map(l => `${l.invoiceId}:${l.lineNo}`)).toEqual(['a:1', 'b:1'])
  })
})

describe('apportionInvoiceFob: FOB per line', () => {
  it('splits CIF freight + insurance across lines by line value', () => {
    expect(apportionInvoiceFob(cif).map(l => l.fob)).toEqual([5400, 2700, 900])
  })

  it('converts with the invoice fx_rate_inr, never the fx.ts fallback table', () => {
    // fx.ts has USD at 84. 5,400 x 84 = 453,600 would mean the fallback leaked in.
    expect(apportionInvoiceFob(cif).map(l => l.fobInr)).toEqual([450900, 225450, 75150])
    const eur = apportionInvoiceFob(inv({ currency: 'EUR', fxRateInr: 90.25 }))
    expect(eur[0].fobInr).toBe(90250)
  })

  it('puts the rounding remainder on the last line so lines sum to invoice FOB exactly', () => {
    // CFR 300 less freight 10 = 290 over three equal lines: 96.67 + 96.67 + 96.66
    const lines = apportionInvoiceFob(inv({
      incoterm: 'CFR', freightAmount: 10,
      lines: [1, 2, 3].map(n => ({ lineNo: n, hsCode: '73041910', amount: 100 })),
    }))
    expect(lines.map(l => l.fob)).toEqual([96.67, 96.67, 96.66])
    expect(lines.reduce((s, l) => s + (l.fob ?? 0), 0)).toBeCloseTo(290, 10)
  })

  it('takes FOB, FCA and FAS values as FOB', () => {
    for (const incoterm of ['FOB', 'FCA', 'FAS']) {
      expect(apportionInvoiceFob(inv({ incoterm }))[0].fob).toBe(1000)
    }
  })

  it('treats CPT like CFR and CIP like CIF', () => {
    expect(apportionInvoiceFob(inv({ incoterm: 'CPT', freightAmount: 100 }))[0].fob).toBe(900)
    expect(apportionInvoiceFob(inv({ incoterm: 'CIP', freightAmount: 100, insuranceAmount: 20 }))[0].fob).toBe(880)
  })

  it('refuses to derive FOB for CIF without insurance, or CFR without freight', () => {
    const a = apportionInvoiceFob(inv({ incoterm: 'CIF', freightAmount: 100 }))
    expect(a[0].fob).toBeNull()
    expect(a[0].fobInr).toBeNull()
    expect(a[0].note).toMatch(/freight and insurance/i)
    expect(apportionInvoiceFob(inv({ incoterm: 'CFR' }))[0].fob).toBeNull()
  })

  it('gives no FOB for EXW and the D-terms rather than guessing', () => {
    for (const incoterm of ['EXW', 'DAP', 'DPU', 'DDP']) {
      const [l] = apportionInvoiceFob(inv({ incoterm }))
      expect(l.fob).toBeNull()
      expect(l.note).toMatch(new RegExp(incoterm))
    }
  })

  it('gives no INR figure when the invoice has no fx rate', () => {
    const [l] = apportionInvoiceFob(inv({ fxRateInr: null }))
    expect(l.fob).toBe(1000)
    expect(l.fobInr).toBeNull()
    expect(l.note).toMatch(/exchange rate/i)
  })

  it('never produces a negative FOB when charges exceed the invoice value', () => {
    const lines = apportionInvoiceFob(inv({ incoterm: 'CIF', freightAmount: 900, insuranceAmount: 500 }))
    expect(lines[0].fob).toBe(0)
  })
})

describe('distinctHsCodes / primaryHsCode', () => {
  it('lists each HS code once, in line order', () => {
    expect(distinctHsCodes(shipmentLines([cif])!)).toEqual(['73041910', '72081000'])
  })

  it('primary HS is the highest-value single line', () => {
    expect(primaryHsCode(shipmentLines([cif])!)).toBe('73041910')
  })

  it('compares line values in INR across invoices of different currencies', () => {
    // 1,000 USD x 83.5 = 83,500  <  950 EUR x 91.2 = 86,640
    const lines = shipmentLines([
      inv({ id: 'usd', lines: [{ lineNo: 1, hsCode: '73041910', amount: 1000 }] }),
      inv({ id: 'eur', currency: 'EUR', fxRateInr: 91.2, lines: [{ lineNo: 1, hsCode: '72081000', amount: 950 }] }),
    ])!
    expect(primaryHsCode(lines)).toBe('72081000')
  })

  it('breaks a tie on the lower line number', () => {
    const lines = shipmentLines([inv({ lines: [
      { lineNo: 1, hsCode: '11111111', amount: 500 },
      { lineNo: 2, hsCode: '22222222', amount: 500 },
    ] })])!
    expect(primaryHsCode(lines)).toBe('11111111')
  })

  it('ranks by value, not by FOB, and still works for a D-term invoice', () => {
    const lines = shipmentLines([inv({ incoterm: 'DAP', lines: [
      { lineNo: 1, hsCode: '11111111', amount: 100 },
      { lineNo: 2, hsCode: '22222222', amount: 700 },
    ] })])!
    expect(primaryHsCode(lines)).toBe('22222222')
  })
})

describe('rodtepForLines: rate per line, entitlement summed per line', () => {
  it('uses each line\'s own HS rate and sums per-line rounded entitlements', () => {
    // 450,900 x 1.2% = 5,410.8 -> 5,411
    // 225,450 x 0.9% = 2,029.05 -> 2,029
    //  75,150 x 1.2% =   901.8 ->   902      total 8,342
    const r = rodtepForLines(shipmentLines([cif])!, rateFor, '2026-09-15')
    expect(r.lines.map(l => l.amountInr)).toEqual([5411, 2029, 902])
    expect(r.lines.map(l => l.ratePct)).toEqual([1.2, 0.9, 1.2])
    expect(r.amountInr).toBe(8342)
    expect(r.claimable).toBe(true)
    expect(r.complete).toBe(true)
  })

  it('is not the single-HS figure: the old path would have used one rate on the gross value', () => {
    // 10,000 USD x 84 (fallback) x 1.2% = 10,080 — overstated by freight, insurance,
    // FX and the lower 0.9% line. The per-line figure must differ.
    expect(rodtepForLines(shipmentLines([cif])!, rateFor, '2026-09-15').amountInr).not.toBe(10080)
  })

  it('claims nothing for an export after the 2026-09-30 cutoff', () => {
    const r = rodtepForLines(shipmentLines([cif])!, rateFor, '2026-10-01')
    expect(r.amountInr).toBeNull()
    expect(r.claimable).toBe(false)
    expect(r.lines.every(l => /2026-09-30/.test(l.note ?? ''))).toBe(true)
  })

  it('still counts the 2026-09-30 export itself', () => {
    expect(rodtepForLines(shipmentLines([cif])!, rateFor, '2026-09-30').amountInr).toBe(8342)
  })

  it('sums what it can and marks the total incomplete when some lines have no FOB', () => {
    const lines = shipmentLines([
      inv({ id: 'fob', lines: [{ lineNo: 1, hsCode: '73041910', amount: 1000 }] }), // 83,500 x 1.2% = 1,002
      inv({ id: 'dap', incoterm: 'DAP', lines: [{ lineNo: 1, hsCode: '72081000', amount: 5000 }] }),
    ])!
    const r = rodtepForLines(lines, rateFor, '2026-09-15')
    expect(r.amountInr).toBe(1002)
    expect(r.claimable).toBe(true)
    expect(r.complete).toBe(false)
    expect(r.lines[1].amountInr).toBeNull()
  })

  it('a line with no rate contributes nothing and says why', () => {
    const r = rodtepForLines(shipmentLines([inv({ lines: [{ lineNo: 1, hsCode: '99999999', amount: 1000 }] })])!, rateFor, '2026-09-15')
    expect(r.amountInr).toBeNull()
    expect(r.lines[0].note).toMatch(/no rodtep rate/i)
  })

  it('carries the rate match type per line so a default-rate line is visible', () => {
    const r = rodtepForLines(shipmentLines([cif])!, hs => ({ rate: 0.5, matchType: hs === '72081000' ? 'default' : 'exact' }), '2026-09-15')
    expect(r.lines.map(l => l.matchType)).toEqual(['exact', 'default', 'exact'])
  })
})

describe('filingReadyInr: what may go in the claim file', () => {
  it('counts claimable lines on a scheduled (exact or prefix) rate', () => {
    // Shipment-level match type is irrelevant: each line carries its own.
    const r = rodtepForLines(shipmentLines([cif])!, rateFor, '2026-09-15')
    expect(filingReadyInr(r)).toBe(8342)
    expect(r.lines.some(l => l.matchType === 'default')).toBe(false)
  })

  it('leaves out default-rate lines and unclaimable lines', () => {
    const r = rodtepForLines(shipmentLines([cif])!,
      hs => ({ rate: RATES[hs], matchType: hs === '72081000' ? 'default' : 'prefix' }), '2026-09-15')
    expect(filingReadyInr(r)).toBe(5411 + 902)
    expect(filingReadyInr(rodtepForLines(shipmentLines([cif])!, rateFor, '2026-10-01'))).toBe(0)
  })
})

describe('worstGateStatus', () => {
  it('blocked beats pending beats approved', () => {
    expect(worstGateStatus(['approved', 'approved'])).toBe('approved')
    expect(worstGateStatus(['approved', 'pending'])).toBe('pending')
    expect(worstGateStatus(['pending', 'blocked', 'approved'])).toBe('blocked')
  })

  it('never approves on no evidence', () => {
    expect(worstGateStatus([])).toBe('pending')
  })
})

describe('mergeGateResults', () => {
  const result = (hs: string, gate_status: GateCheckResult['gate_status'], reasons: string[], cbam = false): GateCheckResult => ({
    shipment_id: 's1', gate_status, blocking_reasons: reasons,
    hs_validation: { valid: true, hs_code: hs, description: `HS code ${hs} provided by exporter`, suggestions: [] },
    fta_eligibility: { eligible: false, agreement: `FTA for ${hs}`, mfn_rate: 5, preferential_rate: 5, potential_savings: 0 },
    coo_requirement: { required: false, agreement_name: '', issuing_authority: 'FIEO', document_type: 'x' },
    rules_of_origin: { applicable: false, rule_text: 'x' },
    checklist_progress: { completion_percentage: 100, completed_items: 10, total_items: 10, critical_pending: 0 },
    cbam_scope: { applies: cbam, sector: cbam ? 'Iron and steel' : null },
    checked_at: '2026-09-23T00:00:00Z',
  })

  it('takes the worst status and only the reasons behind it, without duplicates', () => {
    const m = mergeGateResults([
      result('84819090', 'pending', ['Moderate risk']),
      result('72081000', 'blocked', ['Sanctions hit', 'Checklist low']),
      result('73041910', 'blocked', ['Sanctions hit']),
    ])
    expect(m.gate_status).toBe('blocked')
    expect(m.blocking_reasons).toEqual(['Sanctions hit', 'Checklist low'])
  })

  it('reports every HS code and each one\'s own status', () => {
    const m = mergeGateResults([result('84819090', 'approved', []), result('72081000', 'pending', ['CBAM scope: HS 72081000'], true)])
    expect(m.gate_status).toBe('pending')
    expect(m.hs_validation.hs_code).toBe('84819090, 72081000')
    expect(m.per_hs).toEqual([
      { hs_code: '84819090', gate_status: 'approved', reasons: [] },
      { hs_code: '72081000', gate_status: 'pending', reasons: ['CBAM scope: HS 72081000'] },
    ])
  })

  it('flags CBAM if any line is in scope, and keeps the primary HS for trade terms', () => {
    const m = mergeGateResults([result('84819090', 'approved', []), result('72081000', 'pending', ['c'], true)])
    expect(m.cbam_scope?.applies).toBe(true)
    expect(m.cbam_scope?.sector).toBe('Iron and steel')
    expect(m.fta_eligibility.agreement).toBe('FTA for 84819090')
  })

  it('is invalid if any HS code is invalid', () => {
    const bad = result('', 'blocked', ['x'])
    bad.hs_validation.valid = false
    expect(mergeGateResults([result('84819090', 'approved', []), bad]).hs_validation.valid).toBe(false)
  })
})
