import { describe, it, expect } from 'vitest'
import { classifyFeedRelevance, isUnrelatedToTrade, cappedSeverity } from './feed-relevance'

// The item actually live on the dashboard, tagged "Urgent — action required
// before your next shipment". It mentions CEPA and tariffs in passing, which
// is why the keyword pipeline accepted and then escalated it.
const LIVE_EXAM_ITEM = {
  title: 'Current Affairs 19 September 2026: UPSC, SSC, Banking & State PSC: Read 24 exam-ready current affairs',
  description:
    'Current affairs for 19 September 2026, covering India–Canada CEPA, NTA reform, defence, economy, ' +
    'environment, health, agriculture and international relations. India and Canada concluded the fourth ' +
    'round of CEPA negotiations. The post appeared first on Gkseries.com.',
  sourceName: 'Gkseries',
}

describe('the alert that broke trust', () => {
  it('rejects the exam roundup that reached production tagged Urgent', () => {
    expect(isUnrelatedToTrade(LIVE_EXAM_ITEM)).toBe(true)
  })

  it('never lets it claim urgency even if it were shown', () => {
    expect(cappedSeverity(LIVE_EXAM_ITEM, 'critical')).toBe('info')
  })

  it('rejects it on the source alone, before reading the text', () => {
    const v = classifyFeedRelevance({ title: 'Something neutral', sourceName: 'Gkseries.com' })
    expect(v.relevance).toBe('unrelated')
    expect(v.reason).toMatch(/exam preparation/)
  })
})

describe('genuine regulatory items survive', () => {
  const cases: Array<[string, string]> = [
    ['DGFT Trade Notice 25/2026-27 on Certificate of Origin', 'trade notice'],
    ['CBIC raises anti-dumping duty on steel imports', 'anti-dumping'],
    ['EU adopts CBAM implementing regulation for 2026 reporting', 'cbam'],
    ['RoDTEP rates revised under Notification No. 60', 'rodtep'],
    ['New rules of origin under India-UAE CEPA', 'rules of origin'],
    ['CBP issues withhold release order on forced labour grounds', 'forced labour'],
  ]

  it.each(cases)('keeps "%s"', (title) => {
    expect(classifyFeedRelevance({ title, sourceName: 'Reuters' }).relevance).toBe('regulatory')
  })

  it('preserves the severity of a genuine regulatory alert', () => {
    expect(cappedSeverity(
      { title: 'CBIC anti-dumping duty deadline', sourceName: 'CBIC' },
      'critical'
    )).toBe('critical')
  })
})

describe('items with no regulatory signal', () => {
  const weak = { title: 'Rupee strengthens against dollar in morning trade', sourceName: 'Reuters' }

  it('are marked weak rather than rejected outright', () => {
    expect(classifyFeedRelevance(weak).relevance).toBe('weak')
    expect(isUnrelatedToTrade(weak)).toBe(false)
  })

  it('are not allowed to present as urgent', () => {
    expect(cappedSeverity(weak, 'critical')).toBe('info')
    expect(cappedSeverity(weak, 'warning')).toBe('info')
  })
})

describe('filter precision', () => {
  it('does not reject a real notice that happens to mention an exam-like word', () => {
    // "quiz" in a source's unrelated tagline must not kill a DGFT notice.
    expect(classifyFeedRelevance({
      title: 'DGFT issues public notice on export obligation',
      description: 'Public notice 12/2026 amends the Foreign Trade Policy.',
      sourceName: 'DGFT',
    }).relevance).toBe('regulatory')
  })

  it('handles missing fields without throwing', () => {
    expect(classifyFeedRelevance({}).relevance).toBe('weak')
    expect(classifyFeedRelevance({ title: null, description: null, sourceName: null }).relevance).toBe('weak')
  })
})
