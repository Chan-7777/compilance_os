import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { generateBankReadyDealPack } from './deal-pack'
import { generateChecklist } from '@/utils/checklist-generator'
import type { Shipment, CompanyProfile } from '@/types'

// The deal pack is written into a window.open('') page, which shares the
// app's origin. Shipment fields arrive from the UI AND from shipping-bill CSV
// imports (a third party's file), so every one of them must be escaped.

const PAYLOAD = `<img src=x onerror=alert(1)>"><script>alert(2)</script>'&`
// Written out by hand so the test does not grade the escaper with itself.
const ESCAPED =
  '&lt;img src=x onerror=alert(1)&gt;&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;&#39;&amp;'

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

const CLEAN_SHIPMENT: Shipment = {
  id: '5f2c9a1e-7b3d-4c11-9e0a-2d4f6b8c1a37',
  name: 'Hamburg tubes October',
  product: 'steel',
  country: 'EU',
  date: '2026-10-15',
  status: 'pending',
  hsCode: '7304.41',
  shipmentValue: 1250000,
}

const CLEAN_COMPANY: CompanyProfile = { name: 'Meridian Tubes Pvt Ltd', size: 'small' }

/** Every checklist item for this product/country marked done. */
function allChecked(s: Shipment): Record<string, boolean> {
  return Object.fromEntries(generateChecklist(s.product, s.country).map(c => [String(c.id), true]))
}

beforeEach(() => {
  // refNo and the date read the clock; pin it so output is reproducible.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-24T06:30:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

// Each case puts the payload in ONE field. `country` stays a real code
// unless it is the field under test, so the FTA / risk sections still render.
const FIELD_CASES: {
  field: string
  shipment?: Partial<Record<keyof Shipment, unknown>>
  company?: Partial<Record<keyof CompanyProfile, unknown>>
  /** What the field should read as once rendered. */
  shown: string
}[] = [
  { field: 'shipment.name', shipment: { name: `${PAYLOAD}[name]` }, shown: `${PAYLOAD}[name]` },
  { field: 'shipment.product', shipment: { product: `${PAYLOAD}[product]` }, shown: `${PAYLOAD}[product]` },
  { field: 'shipment.country', shipment: { country: `${PAYLOAD}[country]` }, shown: `${PAYLOAD}[country]` },
  { field: 'shipment.date', shipment: { date: `${PAYLOAD}[date]` }, shown: `${PAYLOAD}[date]` },
  { field: 'shipment.hsCode', shipment: { hsCode: `${PAYLOAD}[hsCode]` }, shown: `${PAYLOAD}[hsCode]` },
  // refNo keeps the first 8 characters of the id, upper-cased.
  { field: 'shipment.id', shipment: { id: PAYLOAD }, shown: `COS-${PAYLOAD.toUpperCase().slice(0, 8)}-` },
  { field: 'companyProfile.name', company: { name: `${PAYLOAD}[company]` }, shown: `${PAYLOAD}[company]` },
  { field: 'companyProfile.size', company: { size: `${PAYLOAD}[size]` }, shown: `${PAYLOAD}[size]` },
]

function runCase(c: (typeof FIELD_CASES)[number]): string {
  const shipment = { ...CLEAN_SHIPMENT, ...c.shipment } as Shipment
  const company = { ...CLEAN_COMPANY, ...c.company } as CompanyProfile
  return capture(() => generateBankReadyDealPack(shipment, company, {}))
}

function assertNoInjectedMarkup(html: string) {
  expect(html).not.toMatch(/<img/i)
  expect(html).not.toMatch(/<script/i)
  const doc = parse(html)
  expect(doc.querySelectorAll('script, img').length).toBe(0)
  // The only handlers are the pack's own Print and Close buttons.
  const withHandlers = [...doc.querySelectorAll('*')].filter(el =>
    [...el.attributes].some(a => a.name.startsWith('on')))
  expect(withHandlers.map(el => el.textContent?.trim())).toEqual(['Print / Save as PDF', 'Close'])
}

describe.each(FIELD_CASES)('deal pack escapes $field', c => {
  it('emits no markup from it', () => {
    assertNoInjectedMarkup(runCase(c))
  })

  it('shows it literally, escaped once', () => {
    const text = parse(runCase(c)).body.textContent ?? ''
    expect(text).toContain(c.shown)
    expect(text).not.toContain('&amp;')
    expect(text).not.toContain('&lt;')
  })
})

describe('deal pack escapes & < > " \' in', () => {
  it.each(['name', 'product', 'country', 'date', 'hsCode'] as const)('shipment.%s', key => {
    const html = runCase({ field: key, shipment: { [key]: `${PAYLOAD}[${key}]` }, shown: '' })
    expect(html).toContain(`${ESCAPED}[${key}]`)
  })

  it('companyProfile.name', () => {
    const html = runCase({ field: 'name', company: { name: `${PAYLOAD}[company]` }, shown: '' })
    expect(html).toContain(`${ESCAPED}[company]`)
  })
})

describe('deal pack with every field hostile at once', () => {
  it('emits no markup, whichever fields it reads', () => {
    // Every string field of both objects, including ones the pack does not
    // print today, so a field added to the template later is covered too.
    const shipment = Object.fromEntries(
      Object.keys({ ...CLEAN_SHIPMENT, buyerName: '', exporterName: '', buyer: '',
        transportMode: '', portOfLoading: '', invoiceNumber: '', invoiceDate: '' })
        .map(k => [k, `${PAYLOAD}[${k}]`])) as unknown as Shipment
    const company = Object.fromEntries(
      ['name', 'size', 'tradeRole', 'iec', 'gstin', 'address', 'city', 'state', 'pin',
        'stateCode', 'portOfLoading', 'designation', 'whatsapp', 'turnoverRange', 'yearsExporting']
        .map(k => [k, `${PAYLOAD}[${k}]`])) as unknown as CompanyProfile
    assertNoInjectedMarkup(capture(() => generateBankReadyDealPack(shipment, company, {})))
  })

  it('a hostile shipmentValue is not written raw', () => {
    const shipment = { ...CLEAN_SHIPMENT, shipmentValue: PAYLOAD } as unknown as Shipment
    assertNoInjectedMarkup(capture(() => generateBankReadyDealPack(shipment, CLEAN_COMPANY, {})))
  })
})

describe('numbers still render', () => {
  it('value, HS code, score and completion', () => {
    const html = capture(() =>
      generateBankReadyDealPack(CLEAN_SHIPMENT, CLEAN_COMPANY, allChecked(CLEAN_SHIPMENT)))
    expect(html).toContain('₹12,50,000')
    expect(html).toContain('>7304.41<')
    expect(html).toContain('>100%<')
    expect(html).toMatch(/<span class="score-num">\d+<\/span>/)
    expect(html).toContain('>2026-10-15<')
  })

  it('an ampersand in the exporter name is escaped and reads the same', () => {
    const html = capture(() => generateBankReadyDealPack(
      CLEAN_SHIPMENT, { ...CLEAN_COMPANY, name: 'Meridian Tubes & Alloys' }, {}))
    expect(html).toContain('Meridian Tubes &amp; Alloys')
    expect(parse(html).body.textContent).toContain('Meridian Tubes & Alloys')
  })
})

// The golden files were captured from the generator BEFORE escaping was
// added and are never regenerated from it. Comparison is on the parsed DOM,
// not bytes: static text such as "buyer's" is now written as buyer&#39;s,
// which parses to the same document. Any other change fails.
// The three cases cover the BLOCKED / CONDITIONAL / APPROVED gates, FTA with
// and without a preferential tariff, CBAM in and out of scope, and the
// optional HS code / value rows.
describe('clean input renders exactly as before', () => {
  const golden = (name: string) =>
    readFileSync(resolve('src/lib/__snapshots__/deal-pack', name), 'utf8')
  const dom = (html: string) => parse(html).documentElement.outerHTML

  it('EU steel, nothing checked', () => {
    const html = capture(() => generateBankReadyDealPack(CLEAN_SHIPMENT, CLEAN_COMPANY, {}))
    expect(dom(html)).toBe(dom(golden('eu-steel-unchecked.html')))
  })

  it('UAE textiles, everything checked', () => {
    const s: Shipment = { ...CLEAN_SHIPMENT, product: 'textiles', country: 'UAE' }
    const html = capture(() => generateBankReadyDealPack(s, { ...CLEAN_COMPANY, size: 'medium' }, allChecked(s)))
    expect(dom(html)).toBe(dom(golden('uae-textiles-checked.html')))
  })

  it('US machinery, no HS code or value, one critical item pending', () => {
    const s: Shipment = { ...CLEAN_SHIPMENT, product: 'machinery', country: 'US', hsCode: undefined, shipmentValue: undefined }
    const items = generateChecklist(s.product, s.country)
    const pending = items.find(c => c.priority === 'critical')!
    const checked = Object.fromEntries(items.filter(c => c !== pending).map(c => [String(c.id), true]))
    const html = capture(() => generateBankReadyDealPack(s, { ...CLEAN_COMPANY, name: '' }, checked))
    expect(html).toContain('gate-status">CONDITIONAL')
    expect(dom(html)).toBe(dom(golden('us-machinery-conditional.html')))
  })

  it('the only byte-level change is the apostrophe entity', () => {
    const html = capture(() => generateBankReadyDealPack(CLEAN_SHIPMENT, CLEAN_COMPANY, {}))
    const old = golden('eu-steel-unchecked.html').replace(/\r\n/g, '\n')
    expect(html.replace(/&#39;/g, "'")).toBe(old)
  })
})
