import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateGSPStatement, generateREXDeclaration, generateEUDRDueDiligenceStatement,
  type GSPStatementData, type REXData, type EUDRData,
} from './eu-documents'

// The print window is opened with window.open('') and shares the app's
// origin, so every field these generators print must be HTML-escaped.

const PAYLOAD = `<img src=x onerror=alert(1)>"><script>alert(2)</script>'&`
// Written out by hand rather than computed with escapeHtml(), so the test
// does not grade the escaper with itself.
const ESCAPED =
  '&lt;img src=x onerror=alert(1)&gt;&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;&#39;&amp;'

/** Runs a generator with window.open stubbed and returns what it wrote. */
function capture(run: () => void): string {
  let written = ''
  const fakeWin = {
    document: { write: (s: string) => { written += s }, close: () => {} },
  }
  const spy = vi.spyOn(window, 'open').mockReturnValue(fakeWin as unknown as Window)
  try {
    run()
  } finally {
    spy.mockRestore()
  }
  expect(written).not.toBe('')
  return written
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

/**
 * Every field set to the payload tagged with its own name. Typed as a full
 * Record so adding a field to the interface without listing it here fails
 * the type check. Number fields get the payload too (through the cast): the
 * generators must not rely on the type being honoured at runtime.
 */
function hostile<K extends string>(keys: Record<K, true>): Record<K, string> {
  const out = {} as Record<K, string>
  for (const k of Object.keys(keys) as K[]) out[k] = `${PAYLOAD}[${k}]`
  return out
}

const GSP_FIELDS: Record<keyof GSPStatementData, true> = {
  exporterName: true, exporterAddress: true, exporterIEC: true, buyerName: true,
  buyerCountry: true, productDescription: true, hsCode: true, quantity: true,
  unit: true, invoiceNumber: true, invoiceDate: true, shipmentValue: true,
  currency: true, mfnRate: true, gspRate: true, originDeclaration: true,
}
const REX_FIELDS: Record<keyof REXData, true> = {
  rexNumber: true, exporterName: true, exporterAddress: true, exporterIEC: true,
  productDescription: true, hsCode: true, invoiceNumber: true, invoiceDate: true,
  shipmentValue: true, currency: true, originCriteria: true,
}
const EUDR_FIELDS: Record<keyof EUDRData, true> = {
  operatorName: true, operatorAddress: true, productDescription: true, hsCode: true,
  commodityType: true, countryOfProduction: true, geoCoordinates: true,
  invoiceNumber: true, quantity: true, declarationDate: true, traceabilitySystem: true,
}

const CASES: {
  name: string
  fields: Record<string, true>
  run: (d: Record<string, string>) => void
}[] = [
  {
    name: 'GSP Statement on Origin',
    fields: GSP_FIELDS,
    run: (d: Record<string, string>) => generateGSPStatement(d as unknown as GSPStatementData),
  },
  {
    name: 'REX Declaration',
    fields: REX_FIELDS,
    run: (d: Record<string, string>) => generateREXDeclaration(d as unknown as REXData),
  },
  {
    name: 'EUDR Due Diligence Statement',
    fields: EUDR_FIELDS,
    run: (d: Record<string, string>) => generateEUDRDueDiligenceStatement(d as unknown as EUDRData),
  },
]

const CLEAN_GSP: GSPStatementData = {
  exporterName: 'Meridian Tubes Pvt Ltd',
  exporterAddress: 'Plot 14, MIDC Bhosari\nPune 411026',
  exporterIEC: '0312345678',
  buyerName: 'Stahlhandel Rhein GmbH',
  buyerCountry: 'Germany',
  productDescription: 'Seamless stainless steel tubes, cold drawn',
  hsCode: '7304.41',
  quantity: '1200',
  unit: 'kg',
  invoiceNumber: 'EXP/2026/041',
  invoiceDate: '2026-09-01',
  shipmentValue: 125000,
  currency: 'EUR',
  mfnRate: 7.5,
  gspRate: 0,
  originDeclaration: 'The exporter of the products covered by this document declares that, except where otherwise clearly indicated, these products are of Indian preferential origin.',
}

const CLEAN_REX: REXData = {
  rexNumber: 'INREX0312345678DG015',
  exporterName: 'Meridian Tubes Pvt Ltd',
  exporterAddress: 'Plot 14, MIDC Bhosari, Pune 411026',
  exporterIEC: '0312345678',
  productDescription: 'Seamless stainless steel tubes, cold drawn',
  hsCode: '7304.41',
  invoiceNumber: 'EXP/2026/041',
  invoiceDate: '2026-09-01',
  shipmentValue: 125000,
  currency: 'EUR',
  originCriteria: 'Sufficiently Worked or Processed',
}

const CLEAN_EUDR: EUDRData = {
  operatorName: 'Malabar Coffee Exports',
  operatorAddress: '12 Market Road\nKochi 682001',
  productDescription: 'Green arabica coffee beans',
  hsCode: '0901.11',
  commodityType: 'Coffee',
  countryOfProduction: 'India',
  geoCoordinates: '11.4102, 76.6950',
  invoiceNumber: 'MCE/26/118',
  quantity: '19,200 kg',
  declarationDate: '2026-09-10',
  traceabilitySystem: 'Rainforest Alliance',
}

beforeEach(() => {
  // refNo() and today() read the clock; pin it so output is reproducible.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-24T06:30:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

describe.each(CASES)('$name escapes user input', ({ fields, run }) => {
  const data = hostile(fields)
  const keys = Object.keys(fields)

  it('never emits the payload as markup', () => {
    const html = capture(() => run(data))
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script')
    expect(html).not.toContain(PAYLOAD)
  })

  it.each(keys)('escapes & < > " \' in %s', key => {
    const html = capture(() => run(data))
    expect(html).toContain(`${ESCAPED}[${key}]`)
  })

  it('builds no script, img or event-handler elements from the input', () => {
    const doc = parse(capture(() => run(data)))
    expect(doc.querySelectorAll('script, img').length).toBe(0)
    // The only handlers are the two print/close buttons of PRINT_BUTTONS.
    const withHandlers = [...doc.querySelectorAll('*')].filter(el =>
      [...el.attributes].some(a => a.name.startsWith('on')))
    expect(withHandlers.map(el => el.textContent?.trim())).toEqual(['Print / Save as PDF', 'Close'])
  })

  it.each(keys)('shows %s literally, escaped once', key => {
    // Body only: <title> never parses tags, so it would pass unescaped.
    // Every field also prints in the body.
    const text = parse(capture(() => run(data))).body.textContent ?? ''
    expect(text).toContain(`${PAYLOAD}[${key}]`)
    expect(text).not.toContain('&amp;')
    expect(text).not.toContain('&lt;')
  })
})

describe('numbers and dates still render', () => {
  it('GSP', () => {
    const html = capture(() => generateGSPStatement(CLEAN_GSP))
    expect(html).toContain('EUR 1,25,000')
    expect(html).toContain('>7.5%<')
    expect(html).toContain('>0%<')
    expect(html).toContain('EUR 9,375')
    expect(html).toContain('Invoice Date: 2026-09-01')
  })

  it('REX', () => {
    const html = capture(() => generateREXDeclaration(CLEAN_REX))
    expect(html).toContain('>1,25,000<')
    expect(html).toContain('<strong>EUR 1,25,000</strong>')
    expect(html).toContain('dated <strong>2026-09-01</strong>')
  })

  it('EUDR', () => {
    const html = capture(() => generateEUDRDueDiligenceStatement(CLEAN_EUDR))
    expect(html).toContain('>2026-09-10<')
    expect(html).toContain('>19,200 kg<')
    expect(html).toContain('>11.4102, 76.6950<')
    expect(html).toContain('DD-090111-')
  })
})

describe('an ampersand in a name is escaped and still reads the same', () => {
  it('GSP exporter name', () => {
    const html = capture(() =>
      generateGSPStatement({ ...CLEAN_GSP, exporterName: 'Meridian Tubes & Alloys' }))
    expect(html).toContain('Meridian Tubes &amp; Alloys')
    expect(parse(html).body.textContent).toContain('Meridian Tubes & Alloys')
  })
})

// Captured from the generators BEFORE escaping was added: a clean input must
// produce byte-identical HTML, i.e. the fix changed nothing but escaping.
describe('clean input renders exactly as before', () => {
  const dir = './__snapshots__/eu-documents'

  it('GSP with a duty saving', async () => {
    await expect(capture(() => generateGSPStatement(CLEAN_GSP)))
      .toMatchFileSnapshot(`${dir}/gsp-savings.html`)
  })

  it('GSP with no duty differential', async () => {
    await expect(capture(() => generateGSPStatement({ ...CLEAN_GSP, mfnRate: 0 })))
      .toMatchFileSnapshot(`${dir}/gsp-no-savings.html`)
  })

  it('REX', async () => {
    await expect(capture(() => generateREXDeclaration(CLEAN_REX)))
      .toMatchFileSnapshot(`${dir}/rex.html`)
  })

  it('REX, wholly obtained', async () => {
    await expect(capture(() =>
      generateREXDeclaration({ ...CLEAN_REX, originCriteria: 'Wholly Obtained' })))
      .toMatchFileSnapshot(`${dir}/rex-wholly.html`)
  })

  it('EUDR with geolocation', async () => {
    await expect(capture(() => generateEUDRDueDiligenceStatement(CLEAN_EUDR)))
      .toMatchFileSnapshot(`${dir}/eudr-geo.html`)
  })

  it('EUDR without geolocation', async () => {
    await expect(capture(() =>
      generateEUDRDueDiligenceStatement({ ...CLEAN_EUDR, geoCoordinates: '' })))
      .toMatchFileSnapshot(`${dir}/eudr-no-geo.html`)
  })
})
