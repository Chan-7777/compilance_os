import { describe, it, expect } from 'vitest'
import {
  friendlyInvoiceError, invoiceHeaderToRow, invoiceLinesToRows,
  type InvoiceHeaderInput, type InvoiceLineInput,
} from './invoices'

const header = (over: Partial<InvoiceHeaderInput> = {}): InvoiceHeaderInput => ({
  kind: 'commercial', invoiceNumber: '', invoiceDate: '', irn: '',
  exporterName: '', exporterAddress: '', exporterGstin: '', exporterIec: '', exporterStateCode: '',
  exporterBankName: '', exporterBankBranch: '', exporterBankAccount: '', exporterBankIfsc: '',
  exporterBankSwift: '', exporterBankAdCode: '',
  buyerName: '', buyerAddress: '', buyerCountry: '', buyerTaxId: '',
  consigneeName: '', consigneeAddress: '', consigneeCountry: '',
  incoterm: '', incotermPlace: '', portOfLoading: '', portOfDischarge: '', destinationCountry: '',
  originCountry: '', paymentTerms: '', currency: '', fxRateInr: '', fxRateDate: '',
  freightAmount: '', insuranceAmount: '', signatoryName: '', signatoryDesignation: '', ...over,
})

const line = (over: Partial<InvoiceLineInput> = {}): InvoiceLineInput => ({
  description: 'Tube', hsCode: '7304.19.10', quantity: '1,000', uom: 'KGS', unitPrice: '2.5',
  marks: '', packageCount: '', packageKind: '', netWeightKg: '', grossWeightKg: '', ...over,
})

describe('invoiceHeaderToRow', () => {
  it('never invents a number, date or IRN: blanks become NULL', () => {
    const row = invoiceHeaderToRow(header())
    expect(row.invoice_number).toBeNull()
    expect(row.invoice_date).toBeNull()
    expect(row.irn).toBeNull()
    expect(row.exporter_name).toBeNull()
  })

  it('keeps the typed number as typed (trimmed) and normalises codes', () => {
    const row = invoiceHeaderToRow(header({
      invoiceNumber: ' exp/26-27/014 ', exporterBankIfsc: 'sbin0001234', exporterBankSwift: 'sbininbb',
      incoterm: 'fob', currency: 'eur', irn: 'A'.repeat(64),
    }))
    expect(row.invoice_number).toBe('exp/26-27/014')
    expect(row.exporter_bank_ifsc).toBe('SBIN0001234')
    expect(row.exporter_bank_swift).toBe('SBININBB')
    expect(row.incoterm).toBe('FOB')
    expect(row.currency).toBe('EUR')
    expect(row.irn).toBe('a'.repeat(64))
  })

  it('marks a typed rate manual, and writes no rate fields without one', () => {
    expect(invoiceHeaderToRow(header({ fxRateInr: '83.45', fxRateDate: '2026-09-20' })))
      .toMatchObject({ fx_rate_inr: 83.45, fx_rate_date: '2026-09-20', fx_rate_source: 'manual' })
    expect(invoiceHeaderToRow(header({ fxRateDate: '2026-09-20' })))
      .toMatchObject({ fx_rate_inr: null, fx_rate_date: null, fx_rate_source: null })
  })

  it('never writes the fallback FX source', () => {
    expect(invoiceHeaderToRow(header({ fxRateInr: '84' })).fx_rate_source).not.toBe('fallback')
  })

  it('flags a non-numeric rate as NaN for the caller to reject', () => {
    expect(Number.isNaN(invoiceHeaderToRow(header({ fxRateInr: 'eighty' })).fx_rate_inr)).toBe(true)
  })

  it('maps freight and insurance as invoice-currency amounts, blanks to NULL', () => {
    expect(invoiceHeaderToRow(header({ freightAmount: '1,200.50', insuranceAmount: '85' })))
      .toMatchObject({ freight_amount: 1200.5, insurance_amount: 85 })
    expect(invoiceHeaderToRow(header()))
      .toMatchObject({ freight_amount: null, insurance_amount: null })
    expect(Number.isNaN(invoiceHeaderToRow(header({ freightAmount: 'lots' })).freight_amount)).toBe(true)
  })
})

describe('invoiceLinesToRows', () => {
  it('numbers lines from 1, strips HS punctuation and thousands separators', () => {
    const { rows, errors } = invoiceLinesToRows([line(), line({ description: 'Pipe' })])
    expect(errors).toEqual([])
    expect(rows.map(r => r.line_no)).toEqual([1, 2])
    expect(rows[0]).toMatchObject({ hs_code: '73041910', quantity: 1000, unit_price: 2.5, package_count: null })
    expect(rows[0]).not.toHaveProperty('amount') // generated column
  })

  it('reports each problem against the line number the user sees', () => {
    const { errors } = invoiceLinesToRows([
      line(),
      line({ description: ' ', hsCode: '73', quantity: '0', unitPrice: '-1', packageCount: '2.5', netWeightKg: '100', grossWeightKg: '90' }),
    ])
    expect(errors).toEqual([
      'Line 2: description is required',
      'Line 2: HS code must be 4 to 8 digits',
      'Line 2: quantity must be greater than 0',
      'Line 2: unit price must be 0 or more',
      'Line 2: packages must be a whole number above 0',
      "Line 2: gross weight can't be less than net weight",
    ])
  })

  it('requires at least one line', () => {
    expect(invoiceLinesToRows([]).errors).toEqual(['Add at least one line'])
  })
})

describe('friendlyInvoiceError', () => {
  it.each([
    ['new row for relation "invoices" violates check constraint "invoices_issue_requires_snapshot"', /To issue, fill in/],
    ['... "invoices_commercial_issue_requires_real_fx"', /exchange rate/],
    ['duplicate key value violates unique constraint "invoices_number_unique_per_fy"', /already used/],
    ['Cannot issue invoice 1 with no line items', /Add at least one line/],
    ['Invoice 1 is issued and cannot be edited. Cancel and reissue', /Cancel it and issue a new one/],
  ])('%s', (raw, expected) => {
    expect(friendlyInvoiceError(raw)).toMatch(expected)
  })

  it('passes unknown messages through', () => {
    expect(friendlyInvoiceError('network down')).toBe('network down')
  })
})
