import { describe, it, expect } from 'vitest'
import {
  planShippingBillImport, type ImportContext, type ImportInvoice, type ImportShipment, type ShippingBillRow,
} from './sb-import'

const IEC = 'AAECM4512R'
const GST_MH = '27AAECM4512R1Z2'
const GST_GJ = '24AAECM4512R1Z6'

function row(over: Partial<ShippingBillRow> = {}): ShippingBillRow {
  return {
    shippingBillNo: '1234567', date: '2026-03-15', hsCode: '72081000',
    fobValue: 1000, currency: 'USD', description: 'HR coils', country: 'DE', buyerName: 'Muller GmbH',
    ...over,
  }
}

function invoice(over: Partial<ImportInvoice> = {}): ImportInvoice {
  return {
    id: 'inv-1', shipment_id: null, kind: 'commercial', status: 'issued',
    invoice_number: 'EXP/001', invoice_date: '2026-03-10', exporter_gstin: GST_MH,
    ...over,
  }
}

function shipment(over: Partial<ImportShipment> = {}): ImportShipment {
  return { id: 'shp-1', shipping_bill_no: null, country: 'DE', buyer_name: 'Muller GmbH', ...over }
}

function ctx(over: Partial<ImportContext> = {}): ImportContext {
  return {
    companyId: 'co-1', companyIec: IEC, invoices: [], shipments: [],
    rateFor: () => ({ rate: 1.2, matchType: 'exact' }),
    ...over,
  }
}

const onInvoice = { invoiceNumber: 'EXP/001', invoiceDate: '2026-03-10' }

describe('planShippingBillImport — nothing on file', () => {
  it('inserts a new shipment with the rate cached and the claim unclaimed', () => {
    const plan = planShippingBillImport([row()], ctx())
    expect(plan.rejected).toEqual([])
    expect(plan.actions).toHaveLength(1)
    const a = plan.actions[0]
    expect(a.kind).toBe('insert')
    if (a.kind !== 'insert') return
    expect(a.linkInvoiceId).toBeNull()
    expect(a.values).toMatchObject({
      company_id: 'co-1', name: 'HR coils', country: 'DE', date: '2026-03-15', hs_code: '72081000',
      shipment_value: 1000, value_currency: 'USD', shipping_bill_no: '1234567', buyer_name: 'Muller GmbH',
      rodtep_rate: 1.2, rodtep_match_type: 'exact', rodtep_claimed: false, rodtep_claim_status: 'unclaimed',
      status: 'delivered',
    })
    // 1000 USD x 84 = 84,000 INR x 1.2% = 1,008
    expect(a.entitlementInr).toBe(1008)
    expect(a.matchType).toBe('exact')
  })

  it('keeps the existing validation messages', () => {
    const plan = planShippingBillImport([
      row({ shippingBillNo: '  ' }),
      row({ shippingBillNo: '2', hsCode: '72' }),
      row({ shippingBillNo: '3', fobValue: 0 }),
      row({ shippingBillNo: '4', date: '15/03/2026' }),
    ], ctx())
    expect(plan.actions).toEqual([])
    expect(plan.rejected).toEqual([
      { row: 2, reason: 'Missing shipping bill number' },
      { row: 3, reason: 'Invalid HS code "72"' },
      { row: 4, reason: 'FOB value must be > 0' },
      { row: 5, reason: 'Date "15/03/2026" is not YYYY-MM-DD' },
    ])
  })

  it('skips a shipping bill repeated within the same file', () => {
    const plan = planShippingBillImport([row(), row()], ctx())
    expect(plan.actions).toHaveLength(1)
    expect(plan.skippedDuplicates).toBe(1)
  })
})

describe('planShippingBillImport — matched through the invoice', () => {
  it('UPDATES the shipment linked to the invoice instead of inserting a duplicate', () => {
    const plan = planShippingBillImport(
      [row({ invoiceNumber: '  exp/001 ', invoiceDate: '2026-03-10' })],
      ctx({ invoices: [invoice({ shipment_id: 'shp-1' })], shipments: [shipment()] }),
    )
    expect(plan.rejected).toEqual([])
    expect(plan.actions).toHaveLength(1)
    const a = plan.actions[0]
    expect(a.kind).toBe('update')
    if (a.kind !== 'update') return
    expect(a.shipmentId).toBe('shp-1')
    expect(a.linkInvoiceId).toBeNull()
    expect(a.patch).toMatchObject({
      shipping_bill_no: '1234567', date: '2026-03-15', hs_code: '72081000',
      shipment_value: 1000, value_currency: 'USD', rodtep_rate: 1.2, rodtep_match_type: 'exact',
    })
  })

  it('never touches claim state, status or the shipment name, and fills country/buyer only when empty', () => {
    const plan = planShippingBillImport(
      [row({ ...onInvoice, country: 'FR', buyerName: 'Someone Else' })],
      ctx({
        invoices: [invoice({ shipment_id: 'shp-1' })],
        shipments: [shipment({ country: '', buyer_name: 'Muller GmbH' })],
      }),
    )
    const a = plan.actions[0]
    if (a.kind !== 'update') throw new Error('expected update')
    for (const k of ['rodtep_claim_status', 'rodtep_claimed', 'rodtep_claim_date', 'rodtep_claim_note',
      'status', 'gate_status', 'risk_score', 'sanctions_risk', 'name', 'company_id']) {
      expect(a.patch).not.toHaveProperty(k)
    }
    expect(a.patch.country).toBe('FR')
    expect(a.patch).not.toHaveProperty('buyer_name')
  })

  it('creates the shipment and links the invoice when the invoice has none', () => {
    const plan = planShippingBillImport([row(onInvoice)], ctx({ invoices: [invoice()] }))
    expect(plan.actions).toHaveLength(1)
    const a = plan.actions[0]
    expect(a.kind).toBe('insert')
    expect(a.linkInvoiceId).toBe('inv-1')
  })

  it('links an unlinked invoice to the shipment already carrying this shipping bill', () => {
    const plan = planShippingBillImport(
      [row(onInvoice)],
      ctx({ invoices: [invoice()], shipments: [shipment({ id: 'shp-9', shipping_bill_no: '1234567' })] }),
    )
    const a = plan.actions[0]
    expect(a.kind).toBe('update')
    if (a.kind !== 'update') return
    expect(a.shipmentId).toBe('shp-9')
    expect(a.linkInvoiceId).toBe('inv-1')
  })

  it('ignores draft, cancelled and proforma invoices', () => {
    for (const bad of [{ status: 'draft' }, { status: 'cancelled' }, { kind: 'proforma' }]) {
      const plan = planShippingBillImport(
        [row(onInvoice)],
        ctx({ invoices: [invoice({ ...bad, shipment_id: 'shp-1' })], shipments: [shipment()] }),
      )
      expect(plan.actions[0].kind).toBe('insert')
      expect(plan.actions[0].linkInvoiceId).toBeNull()
      expect(plan.invoiceNotFound).toBe(1)
    }
  })

  it('requires the invoice date to match, not just the number', () => {
    const plan = planShippingBillImport(
      [row({ invoiceNumber: 'EXP/001', invoiceDate: '2026-03-11' })],
      ctx({ invoices: [invoice({ shipment_id: 'shp-1' })], shipments: [shipment()] }),
    )
    expect(plan.actions[0].kind).toBe('insert')
    expect(plan.invoiceNotFound).toBe(1)
  })

  it('falls back to the shipping bill number when the row names an invoice but no date', () => {
    const plan = planShippingBillImport(
      [row({ invoiceNumber: 'EXP/001' })],
      ctx({ invoices: [invoice({ shipment_id: 'shp-1' })], shipments: [shipment()] }),
    )
    expect(plan.actions[0].kind).toBe('insert')
    expect(plan.invoiceNotFound).toBe(1)
  })

  it('rejects when the invoice is linked to a shipment that is not this company\'s', () => {
    const plan = planShippingBillImport(
      [row(onInvoice)],
      ctx({ invoices: [invoice({ shipment_id: 'foreign' })], shipments: [] }),
    )
    expect(plan.actions).toEqual([])
    expect(plan.rejected[0].row).toBe(2)
  })
})

describe('planShippingBillImport — conflicts are rejected, never guessed', () => {
  it('rejects when the invoice\'s shipment already has a different shipping bill', () => {
    const plan = planShippingBillImport(
      [row(onInvoice)],
      ctx({ invoices: [invoice({ shipment_id: 'shp-1' })], shipments: [shipment({ shipping_bill_no: '7777777' })] }),
    )
    expect(plan.actions).toEqual([])
    expect(plan.rejected[0].reason).toMatch(/7777777/)
  })

  it('rejects when another shipment already holds this shipping bill (an earlier duplicate)', () => {
    const plan = planShippingBillImport(
      [row(onInvoice)],
      ctx({
        invoices: [invoice({ shipment_id: 'shp-1' })],
        shipments: [shipment(), shipment({ id: 'shp-dup', shipping_bill_no: '1234567' })],
      }),
    )
    expect(plan.actions).toEqual([])
    expect(plan.rejected[0].reason).toMatch(/1234567/)
  })

  it('rejects a second row for the same invoice with a different shipping bill', () => {
    const plan = planShippingBillImport(
      [row(onInvoice), row({ ...onInvoice, shippingBillNo: '7654321' })],
      ctx({ invoices: [invoice()] }),
    )
    expect(plan.actions).toHaveLength(1)
    expect(plan.rejected.map(r => r.row)).toEqual([3])
  })

  it('rejects when the shipping bill is on two shipments already', () => {
    const plan = planShippingBillImport(
      [row()],
      ctx({ shipments: [
        shipment({ id: 'a', shipping_bill_no: '1234567' }),
        shipment({ id: 'b', shipping_bill_no: ' 1234567' }),
      ] }),
    )
    expect(plan.actions).toEqual([])
    expect(plan.rejected).toHaveLength(1)
  })
})

describe('planShippingBillImport — shipping bill number fallback', () => {
  it('re-importing the same file updates, never duplicates', () => {
    const plan = planShippingBillImport(
      [row({ fobValue: 1100 })],
      ctx({ shipments: [shipment({ id: 'shp-5', shipping_bill_no: '1234567' })] }),
    )
    const a = plan.actions[0]
    expect(a.kind).toBe('update')
    if (a.kind !== 'update') return
    expect(a.shipmentId).toBe('shp-5')
    expect(a.patch.shipment_value).toBe(1100)
  })
})

describe('planShippingBillImport — IEC', () => {
  it('rejects a row whose IEC is not this company\'s', () => {
    const plan = planShippingBillImport([row({ iec: 'ZZZZZ9999Z' })], ctx())
    expect(plan.actions).toEqual([])
    expect(plan.rejected[0].reason).toMatch(/ZZZZZ9999Z/)
  })

  it('compares IEC trimmed and case-insensitively', () => {
    const plan = planShippingBillImport([row({ iec: ' aaecm4512r ' })], ctx())
    expect(plan.rejected).toEqual([])
    expect(plan.iecUnchecked).toBe(0)
  })

  it('rejects a row carrying an IEC when the company has none on file', () => {
    const plan = planShippingBillImport([row({ iec: IEC })], ctx({ companyIec: null }))
    expect(plan.actions).toEqual([])
    expect(plan.rejected[0].reason).toMatch(/IEC/)
  })

  it('accepts a row with no IEC and counts it as unchecked', () => {
    const plan = planShippingBillImport([row()], ctx({ companyIec: null }))
    expect(plan.actions).toHaveLength(1)
    expect(plan.iecUnchecked).toBe(1)
  })
})

describe('planShippingBillImport — branches under different GSTINs', () => {
  const twoBranches = () => ctx({
    invoices: [
      invoice({ id: 'inv-mh', shipment_id: 'shp-mh', exporter_gstin: GST_MH }),
      invoice({ id: 'inv-gj', shipment_id: 'shp-gj', exporter_gstin: GST_GJ }),
    ],
    shipments: [shipment({ id: 'shp-mh' }), shipment({ id: 'shp-gj' })],
  })

  it('picks the invoice of the branch whose GSTIN is on the row', () => {
    const plan = planShippingBillImport([row({ ...onInvoice, gstin: ' 24aaecm4512r1z6' })], twoBranches())
    const a = plan.actions[0]
    expect(a.kind).toBe('update')
    if (a.kind !== 'update') return
    expect(a.shipmentId).toBe('shp-gj')
  })

  it('rejects as ambiguous when the row has no GSTIN and two branches used the number', () => {
    const plan = planShippingBillImport([row(onInvoice)], twoBranches())
    expect(plan.actions).toEqual([])
    expect(plan.rejected[0].reason).toMatch(/GSTIN/)
  })

  it('does not match an invoice under another GSTIN', () => {
    const plan = planShippingBillImport(
      [row({ ...onInvoice, gstin: GST_GJ })],
      ctx({ invoices: [invoice({ shipment_id: 'shp-1', exporter_gstin: GST_MH })], shipments: [shipment()] }),
    )
    expect(plan.actions[0].kind).toBe('insert')
    expect(plan.invoiceNotFound).toBe(1)
  })
})
