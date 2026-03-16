// ============================================================
// fetch-regulatory-feeds
// Runs every 6 hours via pg_cron.
// Pulls from verified RSS feeds + NewsAPI, deduplicates by
// external_id, and inserts into regulatory_changes table.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Feed definitions ─────────────────────────────────────────────────────────

const RSS_FEEDS = [
  {
    url: 'https://taxation-customs.ec.europa.eu/node/2/rss_en',
    country_code: 'EU',
    country_name: 'European Union',
    flag: '🇪🇺',
    source_name: 'EU Taxation & Customs',
    default_type: 'regulation_change' as const,
  },
  {
    url: 'https://www.cbp.gov/rss/trade',
    country_code: 'US',
    country_name: 'United States',
    flag: '🇺🇸',
    source_name: 'US CBP Trade',
    default_type: 'regulation_change' as const,
  },
  {
    url: 'https://www.cbp.gov/rss/trade-adcvd',
    country_code: 'US',
    country_name: 'United States',
    flag: '🇺🇸',
    source_name: 'US CBP Anti-Dumping',
    default_type: 'regulation_change' as const,
  },
  {
    url: 'https://www.cbp.gov/rss/trade/forced-labor',
    country_code: 'US',
    country_name: 'United States',
    flag: '🇺🇸',
    source_name: 'US CBP Forced Labor',
    default_type: 'regulation_change' as const,
  },
  {
    url: 'https://www.gov.uk/search/news-and-communications.atom?keywords=import+export+tariff&order=updated-newest&filter_organisations=hm-revenue-customs',
    country_code: 'UK',
    country_name: 'United Kingdom',
    flag: '🇬🇧',
    source_name: 'UK HMRC',
    default_type: 'regulation_change' as const,
  },
]

// NewsAPI queries — covers DGFT (India) + general trade news
const NEWS_QUERIES = [
  { q: 'DGFT "foreign trade policy" OR RoDTEP OR "export policy" India', country_code: 'IN_DGFT', country_name: 'India DGFT', flag: '🇮🇳' },
  { q: 'CBAM "carbon border" EU India steel aluminium', country_code: 'EU', country_name: 'European Union', flag: '🇪🇺' },
  { q: 'UAE customs tariff India import export CEPA', country_code: 'UAE', country_name: 'United Arab Emirates', flag: '🇦🇪' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function classifySeverity(text: string): 'critical' | 'warning' | 'info' {
  const t = text.toLowerCase()
  if (t.includes('deadline') || t.includes('ban') || t.includes('prohibited') ||
      t.includes('forced labor') || t.includes('withhold release') || t.includes('penalty') ||
      t.includes('violation') || t.includes('eapa') || t.includes('seizure')) {
    return 'critical'
  }
  if (t.includes('amendment') || t.includes('update') || t.includes('change') ||
      t.includes('new rule') || t.includes('tariff') || t.includes('duty') ||
      t.includes('cbam') || t.includes('regulation') || t.includes('compliance')) {
    return 'warning'
  }
  return 'info'
}

function classifyType(text: string): 'deadline' | 'regulation_change' | 'fta_update' | 'info' {
  const t = text.toLowerCase()
  if (t.includes('deadline') || t.includes('due') || t.includes('expires') || t.includes('cutoff')) {
    return 'deadline'
  }
  if (t.includes('fta') || t.includes('trade agreement') || t.includes('cepa') ||
      t.includes('free trade') || t.includes('preferential')) {
    return 'fta_update'
  }
  if (t.includes('regulation') || t.includes('rule') || t.includes('amendment') ||
      t.includes('policy') || t.includes('tariff') || t.includes('duty') || t.includes('ban')) {
    return 'regulation_change'
  }
  return 'info'
}

function tagProducts(text: string): string[] {
  const t = text.toLowerCase()
  const tags: string[] = []
  if (t.includes('steel') || t.includes('iron') || t.includes('metal')) tags.push('steel')
  if (t.includes('textile') || t.includes('garment') || t.includes('apparel') || t.includes('cotton') || t.includes('fabric')) tags.push('textiles')
  if (t.includes('food') || t.includes('agricultural') || t.includes('grain') || t.includes('spice')) tags.push('food')
  if (t.includes('chemical') || t.includes('pharmaceutical') || t.includes('drug')) tags.push('chemicals')
  if (t.includes('machinery') || t.includes('equipment') || t.includes('component')) tags.push('machinery')
  if (t.includes('aluminium') || t.includes('aluminum')) tags.push('steel') // CBAM group
  if (t.includes('cement') || t.includes('fertilizer')) tags.push('chemicals')
  return tags
}

// Parse RSS 2.0 / Atom XML — works with Deno's built-in DOMParser
function parseXMLFeed(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = []

  // RSS 2.0
  const rssItems = doc.querySelectorAll('item')
  rssItems.forEach(item => {
    items.push({
      title: item.querySelector('title')?.textContent?.trim() ?? '',
      link: item.querySelector('link')?.textContent?.trim() ?? '',
      description: item.querySelector('description')?.textContent?.trim() ?? '',
      pubDate: item.querySelector('pubDate')?.textContent?.trim() ??
               item.querySelector('pubdate')?.textContent?.trim() ?? new Date().toISOString(),
    })
  })

  // Atom (gov.uk uses Atom)
  if (items.length === 0) {
    const entries = doc.querySelectorAll('entry')
    entries.forEach(entry => {
      items.push({
        title: entry.querySelector('title')?.textContent?.trim() ?? '',
        link: entry.querySelector('link')?.getAttribute('href') ?? '',
        description: entry.querySelector('summary')?.textContent?.trim() ??
                     entry.querySelector('content')?.textContent?.trim() ?? '',
        pubDate: entry.querySelector('updated')?.textContent?.trim() ??
                 entry.querySelector('published')?.textContent?.trim() ?? new Date().toISOString(),
      })
    })
  }

  return items
}

function parseDateSafe(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',  // service role — no RLS, safe for cron
  )

  const newsApiKey = Deno.env.get('NEWS_API_KEY')
  const inserted: string[] = []
  const errors: string[] = []

  // ── 1. Fetch RSS / Atom feeds ───────────────────────────────────────────

  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'ComplianceOS/1.0 (regulatory monitoring)' },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) { errors.push(`${feed.source_name}: HTTP ${res.status}`); continue }

      const xml = await res.text()
      const items = parseXMLFeed(xml)

      for (const item of items.slice(0, 20)) { // cap at 20 per feed per run
        if (!item.title && !item.description) continue
        const text = `${item.title} ${item.description}`
        const external_id = item.link || `${feed.source_name}::${item.title}`

        const { error } = await supabase
          .from('regulatory_changes')
          .upsert({
            country_code:   feed.country_code,
            country_name:   feed.country_name,
            flag:           feed.flag,
            source_name:    feed.source_name,
            title:          item.title,
            change_description: item.description
              ? item.description.replace(/<[^>]+>/g, '').slice(0, 500)  // strip HTML
              : item.title,
            source_url:     item.link,
            external_id,
            alert_type:     classifyType(text),
            severity:       classifySeverity(text),
            product_tags:   tagProducts(text),
            date:           parseDateSafe(item.pubDate),
          }, {
            onConflict: 'external_id',
            ignoreDuplicates: true,
          })

        if (!error) inserted.push(external_id)
        else if (!error.message.includes('duplicate')) errors.push(`${feed.source_name}: ${error.message}`)
      }
    } catch (e: any) {
      errors.push(`${feed.source_name}: ${e.message}`)
    }
  }

  // ── 2. Fetch from NewsAPI (covers DGFT + UAE + general trade) ────────────

  if (newsApiKey) {
    for (const query of NEWS_QUERIES) {
      try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query.q)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${newsApiKey}`
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
        if (!res.ok) { errors.push(`NewsAPI (${query.country_code}): HTTP ${res.status}`); continue }

        const json = await res.json()
        if (json.status !== 'ok') { errors.push(`NewsAPI: ${json.message}`); continue }

        for (const article of (json.articles ?? [])) {
          const text = `${article.title ?? ''} ${article.description ?? ''}`
          const external_id = article.url

          // Skip low-quality articles
          if (!article.title || article.title === '[Removed]') continue

          const { error } = await supabase
            .from('regulatory_changes')
            .upsert({
              country_code:       query.country_code === 'IN_DGFT' ? 'EU' : query.country_code, // DGFT news affects all markets — tag EU as primary
              country_name:       query.country_name,
              flag:               query.flag,
              source_name:        article.source?.name ?? 'NewsAPI',
              title:              article.title,
              change_description: (article.description ?? article.title).slice(0, 500),
              source_url:         article.url,
              external_id,
              alert_type:         classifyType(text),
              severity:           classifySeverity(text),
              product_tags:       tagProducts(text),
              date:               parseDateSafe(article.publishedAt),
            }, {
              onConflict: 'external_id',
              ignoreDuplicates: true,
            })

          if (!error) inserted.push(external_id)
          else if (!error.message.includes('duplicate')) errors.push(`NewsAPI: ${error.message}`)
        }
      } catch (e: any) {
        errors.push(`NewsAPI (${query.country_code}): ${e.message}`)
      }
    }
  } else {
    errors.push('NEWS_API_KEY not set — NewsAPI queries skipped')
  }

  // ── 3. Prune old items (keep 90 days) ────────────────────────────────────

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  await supabase
    .from('regulatory_changes')
    .delete()
    .lt('scraped_at', cutoff.toISOString())

  return new Response(
    JSON.stringify({ inserted: inserted.length, errors }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
  )
})
