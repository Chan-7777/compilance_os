// Seeds sanctions_entries + sanctions_aliases from OFAC SDN.CSV + ALT.CSV
// Run: node scripts/seed_sanctions.mjs <SERVICE_ROLE_KEY>

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://gakmevnkyjldhzmfyyzq.supabase.co'
const SERVICE_KEY  = process.argv[2]

if (!SERVICE_KEY) {
  console.error('Usage: node scripts/seed_sanctions.mjs <SERVICE_ROLE_KEY>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── CSV parser that handles quoted fields ──────────────────────
function parseCSVLine(line) {
  const fields = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      fields.push(field.trim())
      field = ''
    } else {
      field += ch
    }
  }
  fields.push(field.trim())
  return fields
}

// Normalize name: uppercase, strip punctuation, collapse whitespace
function norm(s) {
  if (!s || s === '-0-') return ''
  return s.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function clean(s) {
  if (!s || s.trim() === '-0-' || s.trim() === '') return null
  return s.trim()
}

// ── Parse SDN.CSV ──────────────────────────────────────────────
// Columns: uid, name, type, program, title, call_sign, ves_type,
//          tonnage, grt, ves_flag, ves_owner, remarks
console.log('Parsing SDN.CSV...')
const sdnLines = readFileSync(join(__dirname, './data/sdn.csv'), 'utf8').split('\n')
const entries = []

for (const line of sdnLines) {
  if (!line.trim()) continue
  const f = parseCSVLine(line)
  if (f.length < 2) continue

  const uid  = f[0]?.trim()
  const name = clean(f[1])
  if (!uid || !name || isNaN(parseInt(uid))) continue

  const rawType = clean(f[2])
  const type = rawType === 'individual' ? 'individual'
             : rawType === 'vessel'     ? 'vessel'
             : rawType === 'aircraft'   ? 'aircraft'
             : 'entity'

  entries.push({
    uid,
    name,
    name_norm:   norm(name),
    entity_type: type,
    program:     clean(f[3]),
    remarks:     clean(f[11]),
  })
}

console.log(`Parsed ${entries.length} SDN entries`)

// ── Parse ALT.CSV ──────────────────────────────────────────────
// Columns: ent_num, alt_num, alt_type, alt_name, alt_remarks
console.log('Parsing ALT.CSV...')
const altLines = readFileSync(join(__dirname, './data/alt.csv'), 'utf8').split('\n')
const aliases = []

// Build a set of valid UIDs for FK safety
const validUIDs = new Set(entries.map(e => e.uid))

for (const line of altLines) {
  if (!line.trim()) continue
  const f = parseCSVLine(line)
  if (f.length < 4) continue

  const uid   = f[0]?.trim()
  const alias = clean(f[3])
  if (!uid || !alias || !validUIDs.has(uid)) continue

  aliases.push({
    uid,
    alias,
    alias_norm: norm(alias),
    alias_type: clean(f[2]),
  })
}

console.log(`Parsed ${aliases.length} aliases`)

// ── Seed ───────────────────────────────────────────────────────
console.log('\nClearing existing OFAC SDN data...')
await supabase.from('sanctions_aliases').delete().neq('id', 0)
await supabase.from('sanctions_entries').delete().eq('source', 'OFAC SDN')
console.log('Cleared.')

const BATCH = 500
let inserted = 0, failed = 0

console.log('Inserting entries...')
for (let i = 0; i < entries.length; i += BATCH) {
  const { error } = await supabase.from('sanctions_entries').insert(entries.slice(i, i + BATCH))
  if (error) { failed += BATCH; console.error(`\nEntries batch ${i} failed:`, error.message) }
  else { inserted += Math.min(BATCH, entries.length - i); process.stdout.write(`\rEntries: ${inserted}/${entries.length}`) }
}

console.log('\nInserting aliases...')
inserted = 0; failed = 0
for (let i = 0; i < aliases.length; i += BATCH) {
  const { error } = await supabase.from('sanctions_aliases').insert(aliases.slice(i, i + BATCH))
  if (error) { failed += BATCH; console.error(`\nAliases batch ${i} failed:`, error.message) }
  else { inserted += Math.min(BATCH, aliases.length - i); process.stdout.write(`\rAliases: ${inserted}/${aliases.length}`) }
}

console.log('\n\nDone! Verifying...')
const { count: ec } = await supabase.from('sanctions_entries').select('*', { count: 'exact', head: true })
const { count: ac } = await supabase.from('sanctions_aliases').select('*', { count: 'exact', head: true })
console.log(`  sanctions_entries: ${ec}`)
console.log(`  sanctions_aliases: ${ac}`)

// Spot-check a known sanctioned entity
const { data: test } = await supabase
  .from('sanctions_entries')
  .select('uid, name, program')
  .ilike('name_norm', '%BANCO NACIONAL%')
  .limit(3)
console.log('\nSpot-check "BANCO NACIONAL":', test)
