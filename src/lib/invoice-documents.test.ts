import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildCommercialInvoiceHtml, buildPackingListHtml, buildProformaInvoiceHtml,
  amountInWords, invoiceDocumentFromRows, invoiceTotals, type InvoiceDocument, type InvoiceLine, type InvoiceSnapshot,
} from './invoice-documents'

function snapshot(over: Partial<InvoiceSnapshot> = {}): InvoiceSnapshot {
  return {
    id: 'inv-1', kind: 'commercial', status: 'issued',
    invoiceNumber: 'EXP/26-27/014', invoiceDate: '2026-09-20', irn: null,
    exporterName: 'Meridian Tubes & Alloys', exporterAddress: 'Plot 4, MIDC\nPune 411019',
    exporterGstin: '27AAECM4512R1Z2', exporterIec: 'AAECM4512R', exporterStateCode: '27',
    exporterBankName: 'State Bank of India', exporterBankBranch: 'Pune Main', exporterBankAccount: '00000012345678901',
    exporterBankIfsc: 'SBIN0001234', exporterBankSwift: 'SBININBB', exporterBankAdCode: '0510001',
    buyerName: 'Hafen GmbH', buyerAddress: 'Hafenstr. 1\nHamburg', buyerCountry: 'Germany', buyerTaxId: 'DE123456789',
    consigneeName: null, consigneeAddress: null, consigneeCountry: null,
    incoterm: 'FOB', incotermPlace: 'Nhava Sheva', portOfLoading: 'INNSA1', portOfDischarge: 'DEHAM',
    destinationCountry: 'Germany', originCountry: 'India', paymentTerms: '30% advance',
    currency: 'USD', fxRateInr: 83.45, fxRateDate: '2026-09-20', fxRateSource: 'manual',
    freightAmount: null, insuranceAmount: null, shipmentId: null,
    signatoryName: null, signatoryDesignation: null,
    issuedAt: '2026-09-20T10:00:00Z', cancelledAt: null, cancelReason: null,
    ...over,
  }
}

function line(lineNo: number, over: Partial<InvoiceLine> = {}): InvoiceLine {
  return {
    lineNo, description: `Seamless tube ${lineNo}`, hsCode: '73041910', quantity: 1000, uom: 'KGS',
    unitPrice: 2.5, amount: 2500, marks: `MTA/${lineNo}`, packageCount: 10, packageKind: 'bundles',
    netWeightKg: 1000, grossWeightKg: 1050, ...over,
  }
}

const doc = (inv: Partial<InvoiceSnapshot> = {}, lines: InvoiceLine[] = [line(1), line(2)]): InvoiceDocument =>
  ({ invoice: snapshot(inv), lines })

describe('renders from the snapshot only', () => {
  it('imports nothing but the print harness (no supabase, no profile, no api)', () => {
    const src = readFileSync(resolve(__dirname, 'invoice-documents.ts'), 'utf8')
    const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map(m => m[1])
    expect(imports).toEqual(['./eu-documents'])
  })
})

describe('invoice numbers are never minted', () => {
  it('prints the exporter-supplied number verbatim', () => {
    expect(buildCommercialInvoiceHtml(doc())).toContain('EXP/26-27/014')
  })

  it('prints an unnumbered draft as unnumbered, with no stand-in reference', () => {
    const html = buildCommercialInvoiceHtml(doc({ status: 'draft', invoiceNumber: null, issuedAt: null }))
    expect(html).toContain('Not yet numbered')
    expect(html).toContain('DRAFT')
    // The EU documents stamp refNo() values like INV-EU-LX3K2; none here.
    expect(html).not.toMatch(/[A-Z]{2,}-[A-Z0-9]{6,}/)
  })
})

describe('commercial invoice', () => {
  const html = buildCommercialInvoiceHtml(doc())

  it('carries letterhead, bank details and every line', () => {
    for (const s of ['Meridian Tubes &amp; Alloys', 'AAECM4512R', '27AAECM4512R1Z2', '00000012345678901',
      'SBIN0001234', 'SBININBB', '0510001', 'Seamless tube 1', 'Seamless tube 2', 'DE123456789']) {
      expect(html).toContain(s)
    }
  })

  it('totals the lines and states the INR equivalent at the invoice rate', () => {
    expect(html).toContain('5,000.00')
    expect(html).toContain('4,17,250.00') // 5000 * 83.45, lakh grouping for rupees
    expect(html).toContain('rate entered by exporter')
  })

  it('has no draft or cancelled banner once issued, and never prints undefined/null', () => {
    expect(html).not.toContain('status-banner draft')
    expect(html).not.toContain('status-banner cancelled')
    expect(html).not.toMatch(/undefined|>null</)
  })

  it('says consignee is the buyer when no consignee was given', () => {
    expect(html).toContain('Same as buyer')
  })

  it('keeps 4-decimal unit prices', () => {
    const h = buildCommercialInvoiceHtml(doc({}, [line(1, { unitPrice: 2.3456, amount: 2345.6 })]))
    expect(h).toContain('2.3456')
  })

  it('marks a cancelled invoice void with its reason', () => {
    const h = buildCommercialInvoiceHtml(doc({ status: 'cancelled', cancelledAt: '2026-09-22T00:00:00Z', cancelReason: 'Wrong consignee' }))
    expect(h).toContain('CANCELLED')
    expect(h).toContain('Wrong consignee')
  })

  it('refuses a proforma row and an invoice with no lines', () => {
    expect(() => buildCommercialInvoiceHtml(doc({ kind: 'proforma' }))).toThrow(/proforma/)
    expect(() => buildCommercialInvoiceHtml(doc({}, []))).toThrow(/line item/)
  })
})

describe('proforma invoice', () => {
  const html = buildProformaInvoiceHtml(doc({ kind: 'proforma', fxRateInr: null, fxRateDate: null, fxRateSource: null }))

  it('is titled and numbered as a proforma, with bank details for the advance', () => {
    expect(html).toContain('Proforma Invoice')
    expect(html).toContain('Proforma No.')
    expect(html).toContain('not a tax invoice')
    expect(html).toContain('00000012345678901')
  })

  it('omits the INR line when there is no rate, and the commercial declaration', () => {
    expect(html).not.toContain('INR equivalent')
    expect(html).not.toContain('actual price of the goods')
  })

  it('refuses a commercial row', () => {
    expect(() => buildProformaInvoiceHtml(doc())).toThrow(/commercial/)
  })
})

describe('packing list', () => {
  it('lists marks, packages and weights, with totals, and no prices or bank', () => {
    const html = buildPackingListHtml(doc({}, [line(1, { unitPrice: 7.77, amount: 7770 }), line(2, { packageCount: 5, netWeightKg: 500.25, grossWeightKg: 520 })]))
    expect(html).toContain('MTA/1')
    expect(html).toContain('10 bundles')
    expect(html).toContain('15 packages')
    expect(html).toContain('1,500.25')
    expect(html).toContain('1,570')
    expect(html).not.toContain('7.77')
    expect(html).not.toContain('00000012345678901')
  })

  it('prints a dash, not a partial sum, when any line lacks packing data', () => {
    const html = buildPackingListHtml(doc({}, [line(1, { grossWeightKg: null }), line(2)]))
    expect(html).toContain('Packing data incomplete')
    expect(html).toContain('line 1')
    expect(html).not.toContain('2,100') // 1050 + 1050 would be a partial-looking total
  })
})

describe('escaping', () => {
  it('escapes every user-typed field', () => {
    const evil = '<img src=x onerror=alert(1)>'
    const d = doc(
      { buyerName: evil, buyerAddress: evil, exporterName: evil, exporterBankAccount: evil, paymentTerms: evil, cancelReason: evil,
        signatoryName: evil, signatoryDesignation: evil },
      [line(1, { description: evil, marks: evil, packageKind: evil, uom: evil })],
    )
    for (const html of [buildCommercialInvoiceHtml(d), buildPackingListHtml(d)]) {
      expect(html).not.toContain('<img')
      expect(html).toContain('&lt;img')
    }
  })
})

describe('invoiceDocumentFromRows / invoiceTotals', () => {
  it('maps PostgREST rows, parses numeric strings and sorts lines', () => {
    const d = invoiceDocumentFromRows(
      { id: 'x', kind: 'commercial', status: 'draft', currency: 'EUR', fx_rate_inr: '91.2', invoice_number: '' },
      [
        { line_no: 2, description: 'b', hs_code: '1234', quantity: '1.5', uom: 'PCS', unit_price: '2', amount: '3', package_count: null },
        { line_no: 1, description: 'a', hs_code: '5678', quantity: 2, uom: 'PCS', unit_price: 1, amount: 2, package_count: 4 },
      ],
    )
    expect(d.invoice.fxRateInr).toBe(91.2)
    expect(d.invoice.invoiceNumber).toBeNull()
    expect(d.lines.map(l => l.lineNo)).toEqual([1, 2])
    expect(d.lines[1].quantity).toBe(1.5)
    expect(d.lines[1].packageCount).toBeNull()
  })

  it('sums money in cents, so 0.1 + 0.2 is 0.3', () => {
    const t = invoiceTotals(doc({}, [line(1, { amount: 0.1 }), line(2, { amount: 0.2 })]))
    expect(t.amount).toBe(0.3)
  })

  it('reports missing packing lines and null totals', () => {
    const t = invoiceTotals(doc({ fxRateInr: null }, [line(1, { packageCount: null }), line(2)]))
    expect(t.packages).toBeNull()
    expect(t.netWeightKg).toBe(2000)
    expect(t.linesMissingPacking).toEqual([1])
    expect(t.amountInr).toBeNull()
  })
})

describe('signatory (item 6)', () => {
  it('prints the snapshot signatory name and designation under the signature line', () => {
    const d = doc({ signatoryName: 'Anita Deshmukh', signatoryDesignation: 'Director' })
    for (const html of [buildCommercialInvoiceHtml(d), buildPackingListHtml(d), buildProformaInvoiceHtml(doc({ kind: 'proforma', signatoryName: 'Anita Deshmukh' }))]) {
      expect(html).toContain('Anita Deshmukh')
      expect(html).toContain('Authorised Signatory')
    }
    expect(buildCommercialInvoiceHtml(d)).toContain('Director')
  })

  it('prints exactly the old block when the invoice has no signatory (every invoice issued before item 6)', () => {
    const html = buildCommercialInvoiceHtml(doc())
    expect(html).toContain(`<div class="sig-line">Authorised Signatory</div>
    </div>
  </div>`)
    expect(html).not.toContain('sig-name')
  })

  it('maps the snapshot columns from the row', () => {
    const d = invoiceDocumentFromRows({ id: 'x', kind: 'commercial', status: 'issued', currency: 'USD',
      signatory_name: 'Anita Deshmukh', signatory_designation: '' }, [])
    expect(d.invoice.signatoryName).toBe('Anita Deshmukh')
    expect(d.invoice.signatoryDesignation).toBeNull()
  })
})

describe('amountInWords', () => {
  it('uses the international system for foreign currencies', () => {
    expect(amountInWords(5000, 'USD')).toBe('US Dollars Five Thousand Only')
    expect(amountInWords(1234567.89, 'USD'))
      .toBe('US Dollars One Million Two Hundred Thirty Four Thousand Five Hundred Sixty Seven and Cents Eighty Nine Only')
    expect(amountInWords(100000, 'EUR')).toBe('Euros One Hundred Thousand Only')
    expect(amountInWords(0.5, 'GBP')).toBe('Pounds Sterling Zero and Pence Fifty Only')
    expect(amountInWords(2000000000, 'USD')).toBe('US Dollars Two Billion Only')
  })

  it('uses lakh and crore for rupees', () => {
    expect(amountInWords(417250, 'INR')).toBe('Rupees Four Lakh Seventeen Thousand Two Hundred Fifty Only')
    expect(amountInWords(12345678.05, 'INR')).toBe('Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight and Paise Five Only')
    expect(amountInWords(1500000000, 'INR')).toBe('Rupees One Hundred Fifty Crore Only')
  })

  it('handles teens, round tens and the singular', () => {
    expect(amountInWords(1, 'USD')).toBe('US Dollars One Only')
    expect(amountInWords(19.1, 'USD')).toBe('US Dollars Nineteen and Cents Ten Only')
    expect(amountInWords(90, 'AED')).toBe('UAE Dirhams Ninety Only')
  })

  it('does not guess a name for a currency it does not know', () => {
    expect(amountInWords(12.34, 'XYZ')).toBe('XYZ Twelve and 34/100 Only')
  })

  it('rounds to the cent first, so float noise never prints', () => {
    expect(amountInWords(0.1 + 0.2, 'USD')).toBe('US Dollars Zero and Cents Thirty Only')
    expect(amountInWords(2.999, 'USD')).toBe('US Dollars Three Only')
  })

  it('is printed under the total on invoices, not on the packing list', () => {
    expect(buildCommercialInvoiceHtml(doc())).toContain('US Dollars Five Thousand Only')
    expect(buildProformaInvoiceHtml(doc({ kind: 'proforma' }))).toContain('US Dollars Five Thousand Only')
    expect(buildPackingListHtml(doc())).not.toContain('Five Thousand')
  })
})
