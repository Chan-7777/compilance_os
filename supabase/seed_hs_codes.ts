#!/usr/bin/env -S deno run --allow-net --allow-env
// Seed hs_codes table from the public HS 2022 dataset
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... deno run --allow-net --allow-env supabase/seed_hs_codes.ts

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://gakmevnkyjldhzmfyyzq.supabase.co'
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

if (!SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var')
  Deno.exit(1)
}

const DATASET_URL = 'https://raw.githubusercontent.com/datasets/harmonized-system/main/data/harmonized-system.csv'

// Format raw 6-digit code "090421" → "0904.21"
function formatHSCode(raw: string): string {
  const s = raw.padStart(6, '0')
  return `${s.slice(0, 4)}.${s.slice(4)}`
}

// Minimal CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

console.log('Fetching HS codes dataset...')
const res = await fetch(DATASET_URL)
const text = await res.text()
const lines = text.split('\n')

// Parse only 6-digit codes (col[1] has exactly 6 numeric chars)
const records: { code: string; description: string; chapter: string }[] = []
for (const line of lines.slice(1)) {
  if (!line.trim()) continue
  const cols = parseCSVLine(line)
  const raw = cols[0]?.trim()   // section
  const code = cols[1]?.trim()  // hscode
  const desc = cols[2]?.trim()  // description
  if (!code || !desc || code.length !== 6 || !/^\d{6}$/.test(code)) continue
  records.push({
    code: formatHSCode(code),
    description: desc,
    chapter: code.slice(0, 2),
  })
}

console.log(`Parsed ${records.length} 6-digit HS codes. Upserting to Supabase...`)

// Batch upsert in chunks of 500
const BATCH = 500
let inserted = 0
for (let i = 0; i < records.length; i += BATCH) {
  const batch = records.slice(i, i + BATCH)
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/hs_codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(batch),
  })
  if (!resp.ok) {
    const err = await resp.text()
    console.error(`Batch ${i}–${i + BATCH} failed:`, err)
  } else {
    inserted += batch.length
    console.log(`  Inserted ${inserted}/${records.length}`)
  }
}

console.log('Done!')
