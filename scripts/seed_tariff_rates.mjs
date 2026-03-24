// Seeds hs_tariff_rates from WTO CSV using Supabase service role key
// Run: node scripts/seed_tariff_rates.mjs <SERVICE_ROLE_KEY>

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://gakmevnkyjldhzmfyyzq.supabase.co'
const SERVICE_KEY  = process.argv[2]

if (!SERVICE_KEY) {
  console.error('Usage: node scripts/seed_tariff_rates.mjs <SERVICE_ROLE_KEY>')
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// country name in CSV → country_code stored in DB
const COUNTRY_MAP = {
  'Australia':                'Australia',
  'European Union':           'EU',
  'Japan':                    'Japan',
  'United Arab Emirates':     'UAE',
  'United Kingdom':           'UK',
  'United States of America': 'US',
  'India':                    'IN',
}

// Preferential rate multiplier per active FTA (prefRate = mfnRate × multiplier)
// Sources:
//   UAE: India-UAE CEPA (May 2022) — 0% on ~99% of tariff lines from India
//   Japan: India-Japan CEPA (Aug 2011) — 0% for most industrial, avg ~10% of MFN remaining
//   Australia: India-Australia ECTA (Dec 2022) — 0% on ~85% of lines, rest phased to 0%
//   IN: India's own import duty — no FTA discount (India is the origin)
const FTA_DISCOUNT = {
  'UAE':       0.02,   // ≈ 0% under CEPA (small residual for excluded sensitive goods)
  'Japan':     0.10,   // ≈ 90% reduction on industrial; agricultural mostly unchanged
  'Australia': 0.03,   // ≈ 0% under ECTA for industrial goods immediately
}

function formatHS(code) {
  const c = code.trim().padStart(6, '0')
  return `${c.slice(0, 4)}.${c.slice(4, 6)}`
}

function parseCSV(csvPath) {
  const lines = readFileSync(csvPath, 'utf8').split('\n')
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const parts = line.split(',')
    if (parts.length < 9) continue

    const reporterName = parts[2].trim()
    const productCode  = parts[5].trim()
    const value        = parseFloat(parts[8])

    const countryCode = COUNTRY_MAP[reporterName]
    if (!countryCode || isNaN(value) || !productCode || productCode.length < 6) continue

    const hsCode   = formatHS(productCode)
    const mfnRate  = value
    const discount = FTA_DISCOUNT[countryCode] ?? 1.0
    const prefRate = parseFloat((mfnRate * discount).toFixed(2))

    rows.push({
      hs_code:           hsCode,
      country_code:      countryCode,
      agreement:         'MFN',
      mfn_rate:          mfnRate,
      preferential_rate: prefRate,
      source:            'WTO ADB 2023',
    })
  }
  return rows
}

// Process both CSVs
const csv6  = join(__dirname, '../docs/adb_mfn_applied_duty_18_03_2026_12_15_07.csv')
const csvIN = join(__dirname, '../docs/adb_mfn_applied_duty_18_03_2026_12_28_45.csv')
const rows = [...parseCSV(csv6), ...parseCSV(csvIN)]

// Deduplicate — CSV has some duplicate HS codes per country, keep last value
const deduped = new Map()
for (const r of rows) {
  const key = `${r.hs_code}|${r.country_code}`
  deduped.set(key, r)
}
const uniqueRows = [...deduped.values()]
console.log(`Total rows: ${rows.length} → after dedup: ${uniqueRows.length}`)

// Ensure India exists in countries table (FK requirement)
const { error: countryErr } = await supabase
  .from('countries')
  .upsert({ code: 'IN', name: 'India', flag: '🇮🇳', cbam_config: {}, esg_config: {} }, { onConflict: 'code' })
if (countryErr) console.warn('Country upsert warning:', countryErr.message)
else console.log('India country record ready.')

// Delete existing WTO rows first
const { error: delErr } = await supabase
  .from('hs_tariff_rates')
  .delete()
  .eq('source', 'WTO ADB 2023')

if (delErr) console.warn('Delete warning:', delErr.message)
else console.log('Cleared existing WTO ADB 2023 rows.')

// Insert in batches of 500 (smaller to avoid internal dupe collisions)
const BATCH = 500
let inserted = 0
let failed = 0

for (let i = 0; i < uniqueRows.length; i += BATCH) {
  const batch = uniqueRows.slice(i, i + BATCH)
  const { error } = await supabase
    .from('hs_tariff_rates')
    .insert(batch)

  if (error) {
    failed += batch.length
    console.error(`\nBatch ${i}-${i + BATCH} failed:`, error.message)
  } else {
    inserted += batch.length
    process.stdout.write(`\rInserted: ${inserted}/${uniqueRows.length} (${failed} failed)`)
  }
}

console.log('\n\nDone! Verifying...')

// Count per country using head:false to get exact count
const countries = ['Australia', 'EU', 'Japan', 'UAE', 'UK', 'US', 'IN']
console.log('\nRows per country:')
for (const cc of countries) {
  const { count } = await supabase
    .from('hs_tariff_rates')
    .select('*', { count: 'exact', head: true })
    .eq('country_code', cc)
    .eq('source', 'WTO ADB 2023')
  console.log(`  ${cc.padEnd(12)} ${count ?? 0} HS codes`)
}
