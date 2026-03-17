// ============================================================
// fetch-regulatory-feeds
// Runs every 6 hours via pg_cron.
// Pulls from verified RSS feeds + NewsAPI, deduplicates by
// external_id AND content fingerprint (country_code + title
// similarity within a 48h window) to prevent cross-source
// duplicates (e.g. Reuters + Bloomberg covering the same story).
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

// Parse RSS 2.0 / Atom XML using regex — no DOMParser needed in Deno edge runtime
function extractTag(xml: string, tag: string): string {
  // Handle both <tag>value</tag> and CDATA <tag><![CDATA[value]]></tag>
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i')
  const m = xml.match(re)
  return (m?.[1] ?? m?.[2] ?? '').trim()
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i')
  return xml.match(re)?.[1]?.trim() ?? ''
}

function splitItems(xml: string): string[] {
  // Split on <item> or <entry> blocks
  const rssMatches = [...xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)].map(m => m[1])
  if (rssMatches.length > 0) return rssMatches
  return [...xml.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/gi)].map(m => m[1])
}

function parseXMLFeed(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  return splitItems(xml).slice(0, 20).map(block => {
    // RSS <link> is text content; Atom <link> uses href attribute
    const linkText = extractTag(block, 'link')
    const linkHref = extractAttr(block, 'link', 'href')
    return {
      title:       extractTag(block, 'title'),
      link:        linkHref || linkText,
      description: extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content'),
      pubDate:     extractTag(block, 'pubDate') || extractTag(block, 'pubdate') ||
                   extractTag(block, 'updated') || extractTag(block, 'published') ||
                   new Date().toISOString(),
    }
  }).filter(item => item.title || item.description)
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
  const newsDataKey = Deno.env.get('NEWS_DATA_KEY')
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

        // Content-based deduplication — prevents the same regulation from two
        // sources (e.g. Reuters + Bloomberg both reporting the same CBAM update)
        // from creating duplicate rows when their URLs differ.
        const { data: existing } = await supabase
          .from('regulatory_changes')
          .select('id')
          .eq('country_code', feed.country_code)
          .ilike('title', `%${item.title?.slice(0, 40).trim()}%`)
          .gte('scraped_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
          .maybeSingle()
        if (existing) continue

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

          // Content-based deduplication — same story from different news sources
          // within 48h window should not create duplicate rows.
          const newsCountryCode = query.country_code === 'IN_DGFT' ? 'EU' : query.country_code
          const { data: existingNews } = await supabase
            .from('regulatory_changes')
            .select('id')
            .eq('country_code', newsCountryCode)
            .ilike('title', `%${article.title?.slice(0, 40).trim()}%`)
            .gte('scraped_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
            .maybeSingle()
          if (existingNews) continue

          const { error } = await supabase
            .from('regulatory_changes')
            .upsert({
              country_code:       newsCountryCode, // DGFT news affects all markets — tag EU as primary
              country_name:       query.country_name,
              flag:               query.flag,
              source_name:        article.source?.name ?? 'NewsAPI',
              title:              article.title,
              change_description: (article.description ?? article.title).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').slice(0, 500),
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

  // ── 3. Fetch from Newsdata.io (wider global coverage) ────────────────────

  if (newsDataKey) {
    const ndQueries = [
      { q: 'customs tariff import export regulation', country_code: 'EU', country_name: 'European Union', flag: '🇪🇺' },
      { q: 'UAE trade customs import duty', country_code: 'UAE', country_name: 'United Arab Emirates', flag: '🇦🇪' },
      { q: 'DGFT India export policy RoDTEP', country_code: 'IN', country_name: 'India', flag: '🇮🇳' },
      { q: 'US CBP trade customs compliance tariff', country_code: 'US', country_name: 'United States', flag: '🇺🇸' },
    ]
    for (const query of ndQueries) {
      try {
        const url = `https://newsdata.io/api/1/latest?apikey=${newsDataKey}&q=${encodeURIComponent(query.q)}&language=en&size=10`
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
        if (!res.ok) { errors.push(`Newsdata.io (${query.country_code}): HTTP ${res.status}`); continue }

        const json = await res.json()
        if (json.status !== 'success') { errors.push(`Newsdata.io: ${json.message ?? 'error'}`); continue }

        for (const article of (json.results ?? [])) {
          const text = `${article.title ?? ''} ${article.description ?? ''}`
          const external_id = article.link ?? article.article_id
          if (!article.title || !external_id) continue

          // Content-based deduplication — prevents cross-source duplicates
          // within a 48h window for the same country + title.
          const { data: existingNd } = await supabase
            .from('regulatory_changes')
            .select('id')
            .eq('country_code', query.country_code)
            .ilike('title', `%${article.title?.slice(0, 40).trim()}%`)
            .gte('scraped_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
            .maybeSingle()
          if (existingNd) continue

          const { error } = await supabase
            .from('regulatory_changes')
            .upsert({
              country_code:       query.country_code,
              country_name:       query.country_name,
              flag:               query.flag,
              source_name:        article.source_name ?? 'Newsdata.io',
              title:              article.title,
              change_description: (article.description ?? article.title).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').slice(0, 500),
              source_url:         article.link ?? '',
              external_id,
              alert_type:         classifyType(text),
              severity:           classifySeverity(text),
              product_tags:       tagProducts(text),
              date:               parseDateSafe(article.pubDate ?? new Date().toISOString()),
            }, { onConflict: 'external_id', ignoreDuplicates: true })

          if (!error) inserted.push(external_id)
          else if (!error.message.includes('duplicate')) errors.push(`Newsdata.io: ${error.message}`)
        }
      } catch (e: any) {
        errors.push(`Newsdata.io (${query.country_code}): ${e.message}`)
      }
    }
  }

  // ── 4. Prune old items (keep 90 days) ────────────────────────────────────

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
