import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { parseCSV, csvToShippingBills, buildRodtepClaimCSV } from './api'

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
