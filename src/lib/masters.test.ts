import { describe, it, expect } from 'vitest'
import {
  applyBank, applyBuyer, applyConsignee, applyDefaults, applyProduct, applySignatory,
  bankAccountFromRow, bankAccountToRow, buyerFromRow, buyerToRow, friendlyMasterError,
  productFromRow, productToRow, signatoryFromRow, signatoryToRow,
  type BankAccount, type Buyer, type Product, type Signatory,
} from './masters'
import { invoiceHeaderToRow, invoiceLinesToRows, type InvoiceHeaderInput, type InvoiceLineInput } from './invoices'

const header = (over: Partial<InvoiceHeaderInput> = {}): InvoiceHeaderInput => ({
  kind: 'commercial', invoiceNumber: 'EXP/014', invoiceDate: '2026-09-20', irn: '',
  exporterName: 'Meridian', exporterAddress: 'Pune', exporterGstin: '27AAECM4512R1Z2', exporterIec: 'AAECM4512R', exporterStateCode: '27',
  exporterBankName: '', exporterBankBranch: '', exporterBankAccount: '', exporterBankIfsc: '',
  exporterBankSwift: '', exporterBankAdCode: '',
  buyerName: '', buyerAddress: '', buyerCountry: '', buyerTaxId: '',
  consigneeName: '', consigneeAddress: '', consigneeCountry: '',
  incoterm: 'FOB', incotermPlace: 'Nhava Sheva', portOfLoading: 'INNSA1', portOfDischarge: '', destinationCountry: '',
  originCountry: 'India', paymentTerms: '', currency: 'USD', fxRateInr: '83.45', fxRateDate: '2026-09-20',
  freightAmount: '', insuranceAmount: '', signatoryName: '', signatoryDesignation: '', ...over,
})

const blankLine = (over: Partial<InvoiceLineInput> = {}): InvoiceLineInput => ({
  description: '', hsCode: '', quantity: '1,000', uom: '', unitPrice: '',
  marks: 'MTA/1', packageCount: '10', packageKind: 'bundles', netWeightKg: '1000', grossWeightKg: '1050', ...over,
})

const buyer = (over: Partial<Buyer> = {}): Buyer => ({
  id: 'b-1', name: 'Hafen GmbH', address: 'Hafenstr. 1\nHamburg', country: 'Germany', taxId: 'DE123456789',
  paymentTerms: '30% advance, 70% against BL', currency: 'EUR', incoterm: 'CIF', ...over,
})

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p-1', description: 'Seamless tube 33.4 x 3.38', hsCode: '73041910', uom: 'KGS', unitPrice: 2.5, ...over,
})

const bank = (over: Partial<BankAccount> = {}): BankAccount => ({
  id: 'k-1', bankName: 'State Bank of India', branch: 'Pune Main', accountNumber: '00000012345678901',
  ifsc: 'SBIN0001234', swift: 'SBININBB', adCode: '0510001', isDefault: true, ...over,
})

const signatory = (over: Partial<Signatory> = {}): Signatory => ({
  id: 's-1', name: 'Anita Deshmukh', designation: 'Director', isDefault: true, ...over,
})

// ── Prefill: masters copy VALUES into a draft form ───────────────────────────

describe('applyBuyer', () => {
  it('copies the buyer into the buyer block and its set defaults into trade terms', () => {
    const h = applyBuyer(header(), buyer())
    expect(h).toMatchObject({
      buyerName: 'Hafen GmbH', buyerAddress: 'Hafenstr. 1\nHamburg', buyerCountry: 'Germany', buyerTaxId: 'DE123456789',
      paymentTerms: '30% advance, 70% against BL', currency: 'EUR', incoterm: 'CIF',
    })
  })

  it('replaces the whole buyer block, so no field of a previous buyer survives', () => {
    const h = applyBuyer(header({ buyerAddress: 'Old buyer road', buyerTaxId: 'GB999' }), buyer({ address: null, taxId: null }))
    expect(h.buyerAddress).toBe('')
    expect(h.buyerTaxId).toBe('')
  })

  it('leaves trade terms alone where the buyer has no default', () => {
    const h = applyBuyer(header({ paymentTerms: 'LC at sight', currency: 'USD', incoterm: 'FOB' }),
      buyer({ paymentTerms: null, currency: null, incoterm: null }))
    expect(h).toMatchObject({ paymentTerms: 'LC at sight', currency: 'USD', incoterm: 'FOB' })
  })

  it('clears a typed exchange rate when the buyer changes the currency, never leaves a USD rate on EUR', () => {
    const h = applyBuyer(header({ currency: 'USD', fxRateInr: '83.45', fxRateDate: '2026-09-20' }), buyer({ currency: 'EUR' }))
    expect(h).toMatchObject({ currency: 'EUR', fxRateInr: '', fxRateDate: '' })
  })

  it('keeps the exchange rate when the currency is unchanged', () => {
    const h = applyBuyer(header({ currency: 'EUR', fxRateInr: '90.1' }), buyer({ currency: 'EUR' }))
    expect(h.fxRateInr).toBe('90.1')
  })

  it('touches nothing outside the buyer block and trade-term defaults', () => {
    const before = header({ consigneeName: 'Warehouse BV', fxRateInr: '90.1' })
    const h = applyBuyer(before, buyer({ currency: 'USD' }))
    for (const k of ['kind', 'invoiceNumber', 'invoiceDate', 'exporterName', 'exporterBankName', 'consigneeName',
      'incotermPlace', 'portOfLoading', 'fxRateInr', 'fxRateDate', 'signatoryName'] as const) {
      expect(h[k]).toBe(before[k])
    }
  })

  it('returns a new header and mutates neither the draft nor the master', () => {
    const before = header()
    const b = buyer()
    const frozenB = JSON.stringify(b)
    const frozenH = JSON.stringify(before)
    const h = applyBuyer(before, b)
    expect(h).not.toBe(before)
    expect(JSON.stringify(b)).toBe(frozenB)
    expect(JSON.stringify(before)).toBe(frozenH)
  })
})

describe('applyConsignee', () => {
  it('copies a buyer into the consignee block only', () => {
    const before = header({ buyerName: 'Hafen GmbH', buyerCountry: 'Germany' })
    const h = applyConsignee(before, buyer({ name: 'Rotterdam Warehouse BV', address: 'Kade 4', country: 'Netherlands' }))
    expect(h).toMatchObject({ consigneeName: 'Rotterdam Warehouse BV', consigneeAddress: 'Kade 4', consigneeCountry: 'Netherlands' })
    expect(h.buyerName).toBe('Hafen GmbH')
    expect(h.paymentTerms).toBe(before.paymentTerms)
    expect(h.currency).toBe(before.currency)
  })
})

describe('applyBank', () => {
  it('copies all six bank fields and nothing else', () => {
    const before = header()
    const h = applyBank(before, bank())
    expect(h).toMatchObject({
      exporterBankName: 'State Bank of India', exporterBankBranch: 'Pune Main', exporterBankAccount: '00000012345678901',
      exporterBankIfsc: 'SBIN0001234', exporterBankSwift: 'SBININBB', exporterBankAdCode: '0510001',
    })
    expect({ ...h, exporterBankName: '', exporterBankBranch: '', exporterBankAccount: '', exporterBankIfsc: '',
      exporterBankSwift: '', exporterBankAdCode: '' }).toEqual(before)
  })

  it('clears a previous bank\'s optional fields the new one lacks', () => {
    const h = applyBank(header({ exporterBankSwift: 'HDFCINBB', exporterBankAdCode: '999' }), bank({ swift: null, adCode: null, branch: null }))
    expect(h).toMatchObject({ exporterBankSwift: '', exporterBankAdCode: '', exporterBankBranch: '' })
  })
})

describe('applySignatory', () => {
  it('copies name and designation', () => {
    expect(applySignatory(header(), signatory())).toMatchObject({ signatoryName: 'Anita Deshmukh', signatoryDesignation: 'Director' })
    expect(applySignatory(header({ signatoryDesignation: 'Partner' }), signatory({ designation: null })).signatoryDesignation).toBe('')
  })
})

describe('applyProduct', () => {
  it('fills description, HS, unit and price; keeps quantity and packing as typed', () => {
    const l = applyProduct(blankLine(), product())
    expect(l).toEqual(blankLine({ description: 'Seamless tube 33.4 x 3.38', hsCode: '73041910', uom: 'KGS', unitPrice: '2.5' }))
  })

  it('keeps a typed price when the product has none', () => {
    expect(applyProduct(blankLine({ unitPrice: '3.1' }), product({ unitPrice: null })).unitPrice).toBe('3.1')
  })

  it('writes a line the invoice line validator accepts', () => {
    const { errors, rows } = invoiceLinesToRows([applyProduct(blankLine(), product())])
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({ description: 'Seamless tube 33.4 x 3.38', hs_code: '73041910', uom: 'KGS', unit_price: 2.5 })
  })
})

describe('applyDefaults (new drafts only)', () => {
  it('fills the default bank and default signatory', () => {
    const h = applyDefaults(header(), [bank({ id: 'k-0', bankName: 'HDFC', isDefault: false }), bank()], [signatory({ isDefault: false, name: 'X' }), signatory()])
    expect(h.exporterBankName).toBe('State Bank of India')
    expect(h.signatoryName).toBe('Anita Deshmukh')
  })

  it('fills nothing when no master is marked default', () => {
    const before = header()
    expect(applyDefaults(before, [bank({ isDefault: false })], [signatory({ isDefault: false })])).toEqual(before)
  })
})

describe('a prefilled draft maps to invoice columns carrying the copied values', () => {
  it('writes buyer, bank and signatory into the snapshot columns', () => {
    const h = applySignatory(applyBank(applyBuyer(header(), buyer()), bank()), signatory())
    expect(invoiceHeaderToRow(h)).toMatchObject({
      buyer_name: 'Hafen GmbH', buyer_country: 'Germany', buyer_tax_id: 'DE123456789',
      payment_terms: '30% advance, 70% against BL', currency: 'EUR', incoterm: 'CIF',
      exporter_bank_name: 'State Bank of India', exporter_bank_account: '00000012345678901',
      exporter_bank_ifsc: 'SBIN0001234', exporter_bank_swift: 'SBININBB', exporter_bank_ad_code: '0510001',
      signatory_name: 'Anita Deshmukh', signatory_designation: 'Director',
    })
  })

  it('writes NULL signatory columns when none is chosen', () => {
    expect(invoiceHeaderToRow(header())).toMatchObject({ signatory_name: null, signatory_designation: null })
  })
})

// ── Required fields and formats, before a round trip ─────────────────────────

describe('buyerToRow', () => {
  const input = { name: ' Hafen GmbH ', address: '', country: ' Germany ', taxId: '', paymentTerms: '', currency: 'eur', incoterm: 'cif' }

  it('trims, blanks become NULL, codes upper-cased', () => {
    const { row, errors } = buyerToRow(input)
    expect(errors).toEqual([])
    expect(row).toEqual({ name: 'Hafen GmbH', address: null, country: 'Germany', tax_id: null, payment_terms: null, currency: 'EUR', incoterm: 'CIF' })
  })

  it('requires name and country', () => {
    const { errors } = buyerToRow({ ...input, name: '  ', country: '' })
    expect(errors).toEqual(['Buyer name is required', 'Country is required'])
  })

  it('rejects a bad currency or Incoterm', () => {
    const { errors } = buyerToRow({ ...input, currency: 'EURO', incoterm: 'FOT' })
    expect(errors).toEqual(['Currency must be a 3-letter code like USD', 'Incoterm must be one of the Incoterms 2020 rules'])
  })
})

describe('productToRow', () => {
  const input = { description: 'Seamless tube', hsCode: '7304.19.10', uom: 'KGS', unitPrice: '1,250.5' }

  it('normalises HS like invoice lines do and parses the price', () => {
    expect(productToRow(input)).toEqual({
      errors: [], row: { description: 'Seamless tube', hs_code: '73041910', uom: 'KGS', unit_price: 1250.5 },
    })
    expect(productToRow({ ...input, unitPrice: '' }).row.unit_price).toBeNull()
  })

  it('requires description, a 4-8 digit HS and a unit; price is 0 or more', () => {
    expect(productToRow({ description: '', hsCode: '73', uom: ' ', unitPrice: '-1' }).errors).toEqual([
      'Description is required', 'HS code must be 4 to 8 digits', 'Unit is required', 'Unit price must be 0 or more',
    ])
  })
})

describe('bankAccountToRow', () => {
  const input = { bankName: 'State Bank of India', branch: '', accountNumber: ' 0000 0012 3456 78901 ', ifsc: 'sbin0001234', swift: 'sbininbbxxx', adCode: '', isDefault: true }

  it('strips spaces from the account number and upper-cases codes', () => {
    expect(bankAccountToRow(input)).toEqual({
      errors: [],
      row: { bank_name: 'State Bank of India', branch: null, account_number: '00000012345678901', ifsc: 'SBIN0001234', swift: 'SBININBBXXX', ad_code: null, is_default: true },
    })
  })

  it('requires bank and account; checks IFSC and SWIFT with the invoice rules', () => {
    expect(bankAccountToRow({ ...input, bankName: '', accountNumber: '  ', ifsc: 'SBIN1234', swift: 'SBI' }).errors).toEqual([
      'Bank name is required', 'Account number is required',
      'IFSC must be 11 characters, like SBIN0001234', 'SWIFT / BIC must be 8 or 11 characters, like SBININBB',
    ])
  })
})

describe('signatoryToRow', () => {
  it('requires a name; designation optional', () => {
    expect(signatoryToRow({ name: ' Anita Deshmukh ', designation: '', isDefault: false }))
      .toEqual({ errors: [], row: { name: 'Anita Deshmukh', designation: null, is_default: false } })
    expect(signatoryToRow({ name: '', designation: 'Director', isDefault: false }).errors).toEqual(['Signatory name is required'])
  })
})

describe('rows from the database', () => {
  it('maps PostgREST rows, numeric strings included', () => {
    expect(buyerFromRow({ id: 'b', name: 'H', address: null, country: 'DE', tax_id: null, payment_terms: null, currency: null, incoterm: null }))
      .toEqual({ id: 'b', name: 'H', address: null, country: 'DE', taxId: null, paymentTerms: null, currency: null, incoterm: null })
    expect(productFromRow({ id: 'p', description: 'd', hs_code: '7304', uom: 'KGS', unit_price: '2.5000' }).unitPrice).toBe(2.5)
    expect(productFromRow({ id: 'p', description: 'd', hs_code: '7304', uom: 'KGS', unit_price: null }).unitPrice).toBeNull()
    expect(bankAccountFromRow({ id: 'k', bank_name: 'SBI', branch: null, account_number: '1', ifsc: null, swift: null, ad_code: null, is_default: true }).isDefault).toBe(true)
    expect(signatoryFromRow({ id: 's', name: 'A', designation: null, is_default: false })).toEqual({ id: 's', name: 'A', designation: null, isDefault: false })
  })
})

describe('friendlyMasterError', () => {
  it('names the duplicate in words', () => {
    expect(friendlyMasterError('duplicate key value violates unique constraint "buyers_unique_name_country"'))
      .toBe('A buyer with this name and country already exists.')
    expect(friendlyMasterError('duplicate key value violates unique constraint "products_unique_description_hs"'))
      .toBe('A product with this description and HS code already exists.')
    expect(friendlyMasterError('duplicate key value violates unique constraint "bank_accounts_unique_account"'))
      .toBe('This bank account is already saved.')
    expect(friendlyMasterError('duplicate key value violates unique constraint "signatories_unique_name"'))
      .toBe('A signatory with this name already exists.')
  })

  it('explains a second default', () => {
    expect(friendlyMasterError('duplicate key value violates unique constraint "bank_accounts_one_default"'))
      .toBe('Only one bank account can be the default.')
    expect(friendlyMasterError('duplicate key value violates unique constraint "signatories_one_default"'))
      .toBe('Only one signatory can be the default.')
  })

  it('passes anything else through', () => {
    expect(friendlyMasterError('network down')).toBe('network down')
  })
})
