import { describe, it, expect } from 'vitest'
import { buildLCTemplateHtml, type LCTemplateForm } from './lc-template'
import type { CompanyProfile } from '@/types'

// The LC template is written into a window.open('') page, which shares the
// app's origin: every typed or stored value must be escaped.

const PAYLOAD = `<img src=x onerror=alert(1)>"><script>alert(2)</script>'&`
// Written out by hand so the test does not grade the escaper with itself.
const ESCAPED =
  '&lt;img src=x onerror=alert(1)&gt;&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;&#39;&amp;'

type Company = Pick<CompanyProfile, 'name' | 'iec' | 'gstin' | 'portOfLoading'>

const CLEAN_FORM: LCTemplateForm = { invoiceValue: '1250000', buyerName: 'Stahlhandel Rhein GmbH', invoiceRef: 'PO-4471' }
const CLEAN_COMPANY: Company = { name: 'Meridian Tubes Pvt Ltd', iec: '0312345678', gstin: '27AAECM4512R1Z2', portOfLoading: 'INNSA1' }

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

// Full Records: a field added to either type without a case here fails the
// type check.
const FORM_FIELDS: Record<keyof LCTemplateForm, true> = { invoiceValue: true, buyerName: true, invoiceRef: true }
const COMPANY_FIELDS: Record<keyof Company, true> = { name: true, iec: true, gstin: true, portOfLoading: true }

const CASES = [
  ...Object.keys(FORM_FIELDS).map(k => ({ field: `form.${k}`, form: { [k]: `${PAYLOAD}[${k}]` }, company: {} })),
  ...Object.keys(COMPANY_FIELDS).map(k => ({ field: `company.${k}`, form: {}, company: { [k]: `${PAYLOAD}[${k}]` } })),
]

function build(c: (typeof CASES)[number]): string {
  return buildLCTemplateHtml({ ...CLEAN_FORM, ...c.form }, { ...CLEAN_COMPANY, ...c.company })
}

describe.each(CASES)('LC template escapes $field', c => {
  it('emits no markup from it', () => {
    const html = build(c)
    expect(html).not.toMatch(/<img/i)
    expect(html).not.toMatch(/<script/i)
    expect(parse(html).querySelectorAll('script, img, [onerror]').length).toBe(0)
  })
})

// invoiceValue goes through parseFloat, so it never prints as text; the
// other six must print escaped and read literally.
describe.each(CASES.filter(c => c.field !== 'form.invoiceValue'))('LC template prints $field', c => {
  const tag = c.field.split('.')[1]

  it('with & < > " \' escaped', () => {
    expect(build(c)).toContain(`${ESCAPED}[${tag}]`)
  })

  it('literally, escaped once', () => {
    const text = parse(build(c)).body.textContent ?? ''
    expect(text).toContain(`${PAYLOAD}[${tag}]`)
    expect(text).not.toContain('&amp;')
  })
})

describe('LC template, normal values', () => {
  it('amount renders in Indian grouping', () => {
    expect(buildLCTemplateHtml(CLEAN_FORM, CLEAN_COMPANY)).toContain('>₹12,50,000<')
  })

  it('an ampersand in the exporter name is escaped and reads the same', () => {
    const html = buildLCTemplateHtml(CLEAN_FORM, { ...CLEAN_COMPANY, name: 'Meridian Tubes & Alloys' })
    expect(html).toContain('Meridian Tubes &amp; Alloys')
    expect(parse(html).body.textContent).toContain('Meridian Tubes & Alloys')
  })
})

// Captured from the builder BEFORE escaping (a verbatim move of the inline
// template in Shipments.tsx). Clean input must be byte-identical after.
describe('LC template, clean input renders exactly as before', () => {
  const dir = './__snapshots__/lc-template'

  it('all fields filled', async () => {
    await expect(buildLCTemplateHtml(CLEAN_FORM, CLEAN_COMPANY)).toMatchFileSnapshot(`${dir}/filled.html`)
  })

  it('all fields blank', async () => {
    await expect(buildLCTemplateHtml({ invoiceValue: '', buyerName: '', invoiceRef: '' }, { name: '' }))
      .toMatchFileSnapshot(`${dir}/blank.html`)
  })
})
