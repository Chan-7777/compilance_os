import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateRoDTEPReport } from './rodtep-report'

// The report is written into a window.open('') page, which shares the app's
// origin: the typed HS code and the stored company name must be escaped.

const PAYLOAD = `<img src=x onerror=alert(1)>"><script>alert(2)</script>'&`
// Written out by hand so the test does not grade the escaper with itself.
const ESCAPED =
  '&lt;img src=x onerror=alert(1)&gt;&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;&#39;&amp;'

function capture(run: () => void): string {
  let written = ''
  const fakeWin = { document: { write: (s: string) => { written += s }, close: () => {} } }
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

type Args = Parameters<typeof generateRoDTEPReport>
const CLEAN: Args = ['7304.41.10', 1250000, 1.2, 'Meridian Tubes Pvt Ltd', 'exact', '73044110']

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-24T06:30:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

// [argument index, name, prints as text?]
const PARAMS: [number, string, boolean][] = [
  [0, 'hsCode', true],
  [1, 'exportValue', true],
  [2, 'rate', true],
  [3, 'companyName', true],
  [5, 'matchedHs', true],
]

function run(i: number, name: string): string {
  const args = [...CLEAN] as unknown[]
  args[i] = `${PAYLOAD}[${name}]`
  return capture(() => generateRoDTEPReport(...(args as Args)))
}

describe.each(PARAMS)('RoDTEP report escapes argument %i (%s)', (i, name) => {
  it('emits no markup from it', () => {
    const html = run(i, name)
    expect(html).not.toMatch(/<img/i)
    expect(html).not.toMatch(/<script/i)
    const doc = parse(html)
    expect(doc.querySelectorAll('script, img').length).toBe(0)
    const withHandlers = [...doc.querySelectorAll('*')].filter(el =>
      [...el.attributes].some(a => a.name.startsWith('on')))
    expect(withHandlers.map(el => el.textContent?.trim())).toEqual(['Print / Save as PDF', 'Close'])
  })

  it('prints it escaped and shows it literally', () => {
    const html = run(i, name)
    expect(html).toContain(`${ESCAPED}[${name}]`)
    const text = parse(html).body.textContent ?? ''
    expect(text).toContain(`${PAYLOAD}[${name}]`)
    expect(text).not.toContain('&amp;')
  })
})

describe('RoDTEP report, normal values', () => {
  it('amounts, rate and HS render', () => {
    const html = capture(() => generateRoDTEPReport(...CLEAN))
    expect(html).toContain('₹12.50 L')
    expect(html).toContain('₹15,000')
    expect(html).toContain('>1.2%<')
    expect(html).toContain('>7304.41.10<')
    expect(html).toContain('>73044110<')
  })

  it('an ampersand in the company name is escaped and reads the same', () => {
    const args = [...CLEAN] as Args
    args[3] = 'Meridian Tubes & Alloys'
    const html = capture(() => generateRoDTEPReport(...args))
    expect(html).toContain('Meridian Tubes &amp; Alloys')
    expect(parse(html).body.textContent).toContain('Meridian Tubes & Alloys')
  })
})

// Captured from the generator BEFORE escaping. Clean input must be
// byte-identical after. Covers all three match types, the Notification 60
// flag on and off, and a missing schedule row.
describe('RoDTEP report, clean input renders exactly as before', () => {
  const dir = './__snapshots__/rodtep-report'

  it('exact match, chapter 73 (Notification 60 flag)', async () => {
    await expect(capture(() => generateRoDTEPReport(...CLEAN))).toMatchFileSnapshot(`${dir}/exact.html`)
  })

  it('prefix match, crore-scale value', async () => {
    await expect(capture(() =>
      generateRoDTEPReport('8481.80', 32500000, 0.9, 'Meridian Tubes Pvt Ltd', 'prefix', '848180')))
      .toMatchFileSnapshot(`${dir}/prefix.html`)
  })

  it('not in schedule, chapter 09 (no flag), no row, blank name', async () => {
    await expect(capture(() =>
      generateRoDTEPReport('0901.11', 48000, 0.5, '', 'default', null)))
      .toMatchFileSnapshot(`${dir}/default.html`)
  })
})
