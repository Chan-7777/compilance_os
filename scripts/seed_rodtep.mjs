// Seeds rodtep_rates table from the extracted Appendix 4R JSON
// (Rates already adjusted per Notification 60/2025-26: ch25+ halved)
// Run: node scripts/seed_rodtep.mjs <SERVICE_ROLE_KEY>

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://gakmevnkyjldhzmfyyzq.supabase.co'
const SERVICE_KEY  = process.argv[2]

if (!SERVICE_KEY) {
  console.error('Usage: node scripts/seed_rodtep.mjs <SERVICE_ROLE_KEY>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

console.log('Reading rodtep_rates_extracted.json...')
const raw = JSON.parse(readFileSync(join(__dirname, './data/rodtep_rates_extracted.json'), 'utf8'))

const rows = Object.entries(raw).map(([hs_code, rate]) => ({
  hs_code,
  rate,
  notified_at: 'Notification No. 32 dated 30.09.2024 (Appendix 4R, wef 10.10.2024); rates ch25+ halved per Notification No. 60 dated 23.02.2026',
}))

console.log(`Prepared ${rows.length} rows`)

// Clear and re-seed
console.log('Clearing existing rodtep_rates...')
const { error: delErr } = await supabase.from('rodtep_rates').delete().neq('hs_code', '')
if (delErr) console.warn('Clear warning:', delErr.message)

const BATCH = 500
let inserted = 0

console.log('Inserting...')
for (let i = 0; i < rows.length; i += BATCH) {
  const { error } = await supabase.from('rodtep_rates').insert(rows.slice(i, i + BATCH))
  if (error) {
    console.error(`Batch ${i} failed:`, error.message)
  } else {
    inserted += Math.min(BATCH, rows.length - i)
    process.stdout.write(`\r${inserted}/${rows.length}`)
  }
}

console.log('\n\nDone! Verifying...')
const { count } = await supabase.from('rodtep_rates').select('*', { count: 'exact', head: true })
console.log(`  rodtep_rates: ${count} rows`)

// Spot-check chapter 84 (machinery)
const { data: ch84 } = await supabase
  .from('rodtep_rates')
  .select('hs_code, rate')
  .like('hs_code', '84%')
  .limit(5)
console.log('Sample ch84:', ch84)
