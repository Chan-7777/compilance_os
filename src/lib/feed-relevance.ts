// ============================================================================
// Regulatory feed relevance
//
// The alerts pipeline pulls from RSS plus keyword news searches, and the only
// quality check at ingestion is that the title is not "[Removed]". Anything a
// keyword search returns is stored and then auto-classified into
// critical / warning / info by keyword match.
//
// That is how an exam-prep roundup — "Current Affairs 19 September 2026:
// UPSC, SSC, Banking & State PSC" — reached the dashboard tagged URGENT, with
// "action required before your next shipment" under it. The article mentions
// CEPA and tariffs in passing, so it matched the query and then matched
// classifySeverity.
//
// This matters more than it looks. The whole value of an alerts feature is
// that "Urgent" means urgent. One item like that teaches the exporter to
// ignore the red banner, and the next thing they ignore is real.
//
// These rules are applied on read, so they take effect for the ~99 rows
// already in the table without a backfill. The ingestion function should
// adopt the same rules next time it is deployed, so the junk stops being
// stored at all.
// ============================================================================

export type FeedRelevance =
  /** Genuine trade-regulatory content. */
  | 'regulatory'
  /** Not regulation at all — exam prep, general knowledge, unrelated news. */
  | 'unrelated'
  /** Plausibly relevant but carries no regulatory signal; must not claim urgency. */
  | 'weak'

/**
 * Phrases that only appear in competitive-exam and general-knowledge content.
 * Kept narrow on purpose: a false positive here hides a real regulation.
 */
const NON_REGULATORY_MARKERS = [
  'current affairs',
  'general knowledge',
  'upsc',
  'ssc cgl',
  'state psc',
  'banking & state',
  'banking and state',
  'exam-ready',
  'exam ready',
  'mock test',
  'previous year',
  'question paper',
  'answer key',
  'admit card',
  'syllabus',
  'recruitment 20',
  'quiz',
]

/** Publishers whose entire output is exam prep, never regulation. */
const NON_REGULATORY_SOURCES = [
  'gkseries',
  'jagranjosh',
  'jagran josh',
  'adda247',
  'testbook',
  'byjus',
  'byju',
  'unacademy',
  'studyiq',
  'study iq',
  'drishti',
  'vision ias',
  'careerpower',
  'oliveboard',
  'pendulumedu',
  'exampur',
]

/** Signals of genuine trade-regulatory content. */
const REGULATORY_SIGNALS = [
  'notification no', 'notification number', 'public notice', 'trade notice',
  'circular', 'gazette', 'implementing regulation', 'regulation (eu)',
  'dgft', 'cbic', 'icegate', 'customs', 'tariff', 'duty', 'hs code', 'itc-hs',
  'rodtep', 'drawback', 'cbam', 'carbon border', 'eudr', 'reach', 'cbam report',
  'anti-dumping', 'countervailing', 'safeguard duty', 'quota',
  'export policy', 'import policy', 'foreign trade policy',
  'free trade agreement', 'cepa', 'ceta', 'fta', 'rules of origin',
  'certificate of origin', 'sanitary', 'phytosanitary', 'forced labor',
  'forced labour', 'withhold release', 'sanction', 'embargo',
]

export interface FeedItemLike {
  title?: string | null
  description?: string | null
  sourceName?: string | null
}

export interface RelevanceVerdict {
  relevance: FeedRelevance
  /** Why — shown in logs, not to the user. */
  reason: string
}

function haystack(item: FeedItemLike): string {
  return `${item.title ?? ''} ${item.description ?? ''}`.toLowerCase()
}

export function classifyFeedRelevance(item: FeedItemLike): RelevanceVerdict {
  const text = haystack(item)
  const source = (item.sourceName ?? '').toLowerCase()

  const badSource = NON_REGULATORY_SOURCES.find(s => source.includes(s))
  if (badSource) {
    return { relevance: 'unrelated', reason: `source "${badSource}" publishes exam preparation, not regulation` }
  }

  const marker = NON_REGULATORY_MARKERS.find(m => text.includes(m))
  if (marker) {
    return { relevance: 'unrelated', reason: `matched non-regulatory marker "${marker}"` }
  }

  const signal = REGULATORY_SIGNALS.find(s => text.includes(s))
  if (signal) {
    return { relevance: 'regulatory', reason: `matched regulatory signal "${signal}"` }
  }

  return { relevance: 'weak', reason: 'no regulatory signal found' }
}

/** Items that should never reach the user. */
export function isUnrelatedToTrade(item: FeedItemLike): boolean {
  return classifyFeedRelevance(item).relevance === 'unrelated'
}

export type AlertSeverityLike = 'critical' | 'warning' | 'info'

/**
 * Cap severity by relevance. An item with no regulatory signal may still be
 * worth listing, but it must not present itself as urgent — that is the claim
 * that destroys trust in the feed.
 */
export function cappedSeverity(item: FeedItemLike, severity: AlertSeverityLike): AlertSeverityLike {
  const { relevance } = classifyFeedRelevance(item)
  if (relevance === 'regulatory') return severity
  return 'info'
}
