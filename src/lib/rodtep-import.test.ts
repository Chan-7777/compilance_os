import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { parseCSV, csvToShippingBills, buildRodtepClaimCSV } from './api'
import { shipmentLines, rodtepForLines, type LinkedInvoice } from './shipment-lines'

describe('parseCSV', () => {
  it('splits simple rows and drops blank lines', () => {
    expect(parseCSV('a,b\n1,2\n\n3,4\n')).toEqual([['a', 'b'], ['1', '2'], ['3', '4']])
  })
  it('handles quoted commas, escaped quotes and CRLF', () => {
    const rows = parseCSV('sb,desc\r\n1,"Steel, hot-rolled ""HR"" coils"\r\n')
    expect(rows).toEqual([['sb', 'desc'], ['1', 'Steel, hot-rolled "HR" coils']])
  })
})

describe('csvToShippingBills', () => {
  it('maps ICEGATE-style headers and Indian DD/MM/YYYY dates', () => {
    const rows = parseCSV(
      'SB No,SB Date,RITC,Description,FOB Value,Curr,Country of Destination,Consignee\n' +
      '1234567,15/03/2026,72081000,HR coils,"45,000",USD,EU,Muller GmbH\n'
    )
    const { bills, missing } = csvToShippingBills(rows)
    expect(missing).toEqual([])
    expect(bills).toHaveLength(1)
    expect(bills[0]).toMatchObject({
      shippingBillNo: '1234567', date: '2026-03-15', hsCode: '72081000',
      fobValue: 45000, currency: 'USD', country: 'EU', buyerName: 'Muller GmbH',
    })
  })
  it('accepts the ComplianceOS template headers', () => {
    const rows = parseCSV('shipping_bill_no,sb_date,hs_code,description,fob_value,currency,destination,buyer\n9,2026-04-02,61091000,Tees,12000,EUR,EU,X\n')
    const { bills, missing } = csvToShippingBills(rows)
    expect(missing).toEqual([])
    expect(bills[0].date).toBe('2026-04-02')
    expect(bills[0].currency).toBe('EUR')
  })
  it('reads IEC, GSTIN, invoice number and invoice date when present', () => {
    const rows = parseCSV(
      'SB No,SB Date,RITC,FOB Value,Curr,IEC,GSTIN,Invoice No,Invoice Date\n' +
      '1234567,15/03/2026,72081000,1000,USD,AAECM4512R,27AAECM4512R1Z2,EXP/001,10/03/2026\n'
    )
    const { bills, missing } = csvToShippingBills(rows)
    expect(missing).toEqual([])
    expect(bills[0]).toMatchObject({
      date: '2026-03-15', iec: 'AAECM4512R', gstin: '27AAECM4512R1Z2',
      invoiceNumber: 'EXP/001', invoiceDate: '2026-03-10',
    })
  })
  it('does not mistake invoice columns for the SB date, FOB or buyer', () => {
    const rows = parseCSV(
      'Invoice Date,Invoice Value,Importer Exporter Code,SB No,SB Date,RITC,FOB Value,Consignee,No of Pieces\n' +
      '10/03/2026,1250,AAECM4512R,1234567,15/03/2026,72081000,1000,Muller GmbH,40\n'
    )
    const { bills } = csvToShippingBills(rows)
    expect(bills[0]).toMatchObject({
      date: '2026-03-15', fobValue: 1000, buyerName: 'Muller GmbH',
      iec: 'AAECM4512R', invoiceDate: '2026-03-10',
    })
  })
  it('leaves the new fields undefined for a file without them', () => {
    const { bills } = csvToShippingBills(parseCSV('shipping_bill_no,sb_date,hs_code,fob_value\n9,2026-04-02,61091000,12000\n'))
    expect(bills[0].iec).toBeUndefined()
    expect(bills[0].gstin).toBeUndefined()
    expect(bills[0].invoiceNumber).toBeUndefined()
    expect(bills[0].invoiceDate).toBeUndefined()
  })
  it('reports which required columns are missing', () => {
    const { bills, missing } = csvToShippingBills(parseCSV('description,value\nfoo,1\n'))
    expect(bills).toEqual([])
    expect(missing).toEqual(expect.arrayContaining(['Shipping Bill No', 'Date', 'HS Code']))
  })
})

describe('buildRodtepClaimCSV', () => {
  it('writes one row per shipping bill with INR conversion, entitlement, deadline and match type', () => {
    const csv = buildRodtepClaimCSV(
      [{ shipping_bill_no: '1234567', date: '2026-03-15', hs_code: '72081000', name: 'HR coils',
         shipment_value: 1000, value_currency: 'USD', rodtep_rate: 1.2, rodtep_match_type: 'exact' }],
      { name: 'Acme Exports', iec: 'IEC123', gstin: 'GST123', portOfLoading: 'JNPT' }
    )
    const lines = csv.split('\n')
    const header = lines.find(l => l.startsWith('shipping_bill_no'))!
    expect(header).toBe('shipping_bill_no,sb_date,ritc_hs_code,description,fob_value,currency,fob_value_inr,value_basis,rodtep_rate_pct,entitlement_inr,claimable,match_type,claim_deadline,iec,gstin')
    // 1000 USD × 84 = 84,000 INR × 1.2% = 1,008. Incoterm not recorded, so the
    // value is assumed FOB and the row says so rather than implying certainty.
    const row = lines[lines.indexOf(header) + 1]
    expect(row).toBe('1234567,2026-03-15,72081000,HR coils,1000,USD,84000,assumed_fob,1.2,1008,yes,exact,2027-03-15,IEC123,GST123')
    expect(lines).toContain('# TOTAL_ENTITLEMENT_INR,1008')
  })

  it('claims on FOB, not on a CIF value that still carries freight and insurance', () => {
    const csv = buildRodtepClaimCSV(
      [{ shipping_bill_no: '9', date: '2026-03-15', hs_code: '72081000', name: 'HR coils',
         shipment_value: 1000, value_currency: 'INR', rodtep_rate: 1.2,
         value_basis: 'cif', freight_value: 80, insurance_value: 12 }],
      { name: 'Acme Exports' }
    )
    // FOB = 1000 − 80 − 12 = 908, not 1000. Entitlement 908 × 1.2% = 10.896 → 11.
    expect(csv).toContain(',908,INR,908,cif,1.2,11,yes,')
    expect(csv).toContain('# TOTAL_ENTITLEMENT_INR,11')
  })

  it('marks a row unclaimable once the notified window has closed', () => {
    const csv = buildRodtepClaimCSV(
      [{ shipping_bill_no: '7', date: '2026-10-05', hs_code: '72081000', name: 'HR coils',
         shipment_value: 1000, value_currency: 'INR', rodtep_rate: 1.2 }],
      { name: 'Acme Exports' }
    )
    expect(csv).toContain('no: RoDTEP is notified only to 2026-09-30')
    expect(csv).toContain('# TOTAL_ENTITLEMENT_INR,0')
  })
  it('escapes descriptions containing commas', () => {
    const csv = buildRodtepClaimCSV(
      [{ shipping_bill_no: '1', date: '2026-01-01', hs_code: '7208', name: 'Coils, hot-rolled',
         shipment_value: 100, value_currency: 'INR', rodtep_rate: 1 }],
      { name: 'A' }
    )
    expect(csv).toContain('"Coils, hot-rolled"')
  })
})

describe('buildRodtepClaimCSV with invoice lines', () => {
  // CIF 10,000 USD at the invoice's 83.5; freight 800 + insurance 200 split by value.
  const invoice: LinkedInvoice = {
    id: 'i1', invoiceNumber: 'EXP/014', kind: 'commercial', status: 'issued', incoterm: 'CIF',
    currency: 'USD', fxRateInr: 83.5, freightAmount: 800, insuranceAmount: 200,
    lines: [
      { lineNo: 1, hsCode: '73041910', amount: 6000 },
      { lineNo: 2, hsCode: '72081000', amount: 3000 },
    ],
  }
  // Line 3 of the earlier example dropped: total is 9,000; charges 1,000
  //   L1 FOB 6000 - 666.67 = 5,333.33 -> x83.5 = 445,333.06 x 1.2% = 5,344
  //   L2 FOB 3000 - 333.33 = 2,666.67 -> x83.5 = 222,666.95 x 0.9% = 2,004
  const shipment = {
    shipping_bill_no: '1234567', date: '2026-09-15', hs_code: '73041910', name: 'Tubes',
    shipment_value: 999999, value_currency: 'EUR', rodtep_rate: 5, rodtep_match_type: 'exact',
  }
  const rates: Record<string, number> = { '73041910': 1.2, '72081000': 0.9 }

  it('writes one row per invoice line, each at its own HS rate, and totals the lines', () => {
    const line_rodtep = rodtepForLines(shipmentLines([invoice])!, hs => ({ rate: rates[hs], matchType: 'exact' }), shipment.date)
    const csv = buildRodtepClaimCSV([{ ...shipment, line_rodtep }], { name: 'Acme' })
    const rows = csv.split('\n').filter(l => l.startsWith('1234567,'))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain(',73041910,')
    expect(rows[0]).toContain(',5333.33,USD,445333.06,cif,1.2,5344,yes,exact,')
    expect(rows[1]).toContain(',72081000,')
    expect(rows[1]).toContain(',2666.67,USD,222666.95,cif,0.9,2004,yes,exact,')
    expect(rows[0]).toContain('EXP/014 line 1')
    // Nothing from the shipment-level value, currency or rate leaks in.
    expect(csv).not.toContain('999999')
    expect(csv).toContain('# TOTAL_ENTITLEMENT_INR,7348')
  })

  it('writes a default-rate line as not claimable and leaves it out of the total', () => {
    const line_rodtep = rodtepForLines(shipmentLines([invoice])!,
      hs => ({ rate: rates[hs], matchType: hs === '72081000' ? 'default' : 'exact' }), shipment.date)
    const csv = buildRodtepClaimCSV([{ ...shipment, line_rodtep }], { name: 'Acme' })
    const rows = csv.split('\n').filter(l => l.startsWith('1234567,'))
    expect(rows[1]).toMatch(/,no: default rate/)
    expect(csv).toContain('# TOTAL_ENTITLEMENT_INR,5344')
  })
})
