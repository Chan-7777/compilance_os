// Converts WTO ADB CSV → hs_tariff_rates seed SQL
// Run: node scripts/generate_tariff_migration.mjs

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const csvPath = join(__dirname, './data/adb_mfn_applied_duty_18_03_2026_12_15_07.csv')
const outPath = join(__dirname, '../supabase/seed_hs_tariff_rates.sql')

const COUNTRY_MAP = {
  'Australia':              'Australia',
  'European Union':         'EU',
  'Japan':                  'Japan',
  'United Arab Emirates':   'UAE',
  'United Kingdom':         'UK',
  'United States of America': 'US',
}

// India has active FTAs with UAE, Japan, Australia — apply approximate preferential discount
// These will be refined when we get the actual FTA schedule files
const FTA_DISCOUNT = {
  'UAE':       0.90,  // India-UAE CEPA: ~10% average tariff reduction
  'Japan':     0.85,  // India-Japan CEPA: ~15% average tariff reduction
  'Australia': 0.80,  // India-Australia ECTA: ~20% average tariff reduction
}

// Format 6-digit numeric code → XXXX.XX
function formatHS(code) {
  const c = code.trim().padStart(6, '0')
  return `${c.slice(0, 4)}.${c.slice(4, 6)}`
}

function escape(s) {
  return s.replace(/'/g, "''")
}

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
  if (!countryCode) continue
  if (isNaN(value)) continue
  if (!productCode || productCode.length < 6) continue

  const hsCode = formatHS(productCode)
  const mfnRate = value
  const discount = FTA_DISCOUNT[countryCode] ?? 1.0
  const prefRate = parseFloat((mfnRate * discount).toFixed(2))

  rows.push({ hsCode, countryCode, mfnRate, prefRate })
}

console.log(`Processing ${rows.length} rows...`)

// Write SQL in batches of 500
const BATCH = 500
const sqlParts = []

sqlParts.push(`-- ============================================================`)
sqlParts.push(`-- hs_tariff_rates seed — WTO ADB MFN Applied Rates 2023`)
sqlParts.push(`-- Source: WTO Tariff & Trade Data (ttd.wto.org) ADB HS22 2023`)
sqlParts.push(`-- Generated: ${new Date().toISOString()}`)
sqlParts.push(`-- Rows: ${rows.length}`)
sqlParts.push(`-- ============================================================`)
sqlParts.push(``)
sqlParts.push(`-- Clear existing WTO-sourced rates before re-seeding`)
sqlParts.push(`DELETE FROM hs_tariff_rates WHERE source = 'WTO ADB 2023';`)
sqlParts.push(``)

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const values = batch.map(r =>
    `('${escape(r.hsCode)}','${r.countryCode}','MFN',${r.mfnRate},${r.prefRate},'WTO ADB 2023')`
  ).join(',\n  ')

  sqlParts.push(`INSERT INTO hs_tariff_rates (hs_code, country_code, agreement, mfn_rate, preferential_rate, source)`)
  sqlParts.push(`VALUES`)
  sqlParts.push(`  ${values}`)
  sqlParts.push(`ON CONFLICT (hs_code, country_code, agreement) DO UPDATE SET`)
  sqlParts.push(`  mfn_rate = EXCLUDED.mfn_rate,`)
  sqlParts.push(`  preferential_rate = EXCLUDED.preferential_rate,`)
  sqlParts.push(`  source = EXCLUDED.source,`)
  sqlParts.push(`  scraped_at = NOW();`)
  sqlParts.push(``)
}

sqlParts.push(`-- Summary`)
sqlParts.push(`SELECT country_code, COUNT(*) as hs_codes, ROUND(AVG(mfn_rate),2) as avg_mfn_rate`)
sqlParts.push(`FROM hs_tariff_rates WHERE source = 'WTO ADB 2023'`)
sqlParts.push(`GROUP BY country_code ORDER BY country_code;`)

writeFileSync(outPath, sqlParts.join('\n'), 'utf8')
console.log(`Done. SQL written to: ${outPath}`)
console.log(`Rows processed: ${rows.length}`)
