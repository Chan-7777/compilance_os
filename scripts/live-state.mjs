#!/usr/bin/env node
/**
 * live-state - answer one question honestly: what is actually live right now?
 *
 * This repo deploys in three separate ways, and none of them is "git push":
 *   - the frontend goes out when someone runs `vercel --prod` from their disk
 *   - each edge function goes out when someone runs `supabase functions deploy`
 *   - each migration runs when someone pastes SQL into the Supabase editor
 *
 * So git tells you almost nothing about production. This script asks the real
 * systems where it can, reads a hand-stamped ledger where it cannot, and marks
 * everything else UNKNOWN rather than guessing. Writes LIVE_STATE.md.
 *
 *   node scripts/live-state.mjs
 *   node scripts/live-state.mjs --record function climatiq-emissions
 *   node scripts/live-state.mjs --record migration 20260916000001_fta_agreements_read.sql
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LEDGER = path.join(ROOT, '.live-state.json')
const OUTPUT = path.join(ROOT, 'LIVE_STATE.md')

const UNKNOWN = 'UNKNOWN'

function sh(cmd, { timeout = 90000 } = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

function readLedger() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LEDGER, 'utf8'))
    return { functions: {}, migrations: {}, ...parsed }
  } catch {
    return { functions: {}, migrations: {} }
  }
}

function writeLedger(ledger) {
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n', 'utf8')
}

function ago(iso) {
  if (!iso) return UNKNOWN
  const days = (Date.now() - new Date(iso).getTime()) / 86400000
  if (!Number.isFinite(days)) return UNKNOWN
  if (days < 1) return Math.max(1, Math.round(days * 24)) + 'h ago'
  return Math.floor(days) + 'd ago'
}

function fmt(iso) {
  if (!iso) return UNKNOWN
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

// ---------------------------------------------------------------------------
// --record: stamp the ledger straight after a manual deploy
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2)
if (argv[0] === '--record') {
  const kind = argv[1]
  const name = argv[2]
  if (!['function', 'migration'].includes(kind) || !name) {
    console.error('usage: node scripts/live-state.mjs --record <function|migration> <name>')
    process.exit(1)
  }
  const ledger = readLedger()
  const bucket = kind === 'function' ? 'functions' : 'migrations'
  ledger[bucket][name] = {
    deployedAt: new Date().toISOString(),
    commit: sh('git rev-parse --short HEAD') ?? UNKNOWN,
    dirty: (sh('git status --porcelain') ?? '').length > 0,
  }
  writeLedger(ledger)
  console.log('recorded ' + kind + ' ' + name + ' as deployed just now')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Gather
// ---------------------------------------------------------------------------

const ledger = readLedger()

const git = {
  branch: sh('git rev-parse --abbrev-ref HEAD') ?? UNKNOWN,
  head: sh('git rev-parse --short HEAD') ?? UNKNOWN,
  headAt: sh('git log -1 --format=%cI'),
  headSubject: sh('git log -1 --format=%s') ?? UNKNOWN,
  porcelain: (sh('git status --porcelain') ?? '').split('\n').filter(Boolean),
}

// The frontend. Vercel is authoritative: it knows when the live bundle was
// built. Piped rather than to a terminal, `vercel ls` puts its table on stderr
// and only the URLs on stdout, newest first, and `vercel inspect` puts
// everything on stderr - hence the 2>&1 and the target check.
const deploy = { url: null, createdAt: null, source: 'not checked' }
const list = sh('vercel ls --yes')
if (list) {
  const urls = list.split('\n').map(l => l.trim()).filter(l => /^https:\/\/\S+vercel\.app$/.test(l))
  for (const url of urls.slice(0, 8)) {
    const inspected = sh('vercel inspect ' + url + ' 2>&1')
    if (!inspected || !/target\s+production/.test(inspected)) continue
    const created = (inspected.match(/created\s+(.+?)\s*$/m) || [])[1]
    const parsed = created ? new Date(created.replace(/\s*\[.*\]$/, '')) : null
    deploy.url = url
    deploy.createdAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null
    deploy.source = 'vercel cli'
    break
  }
  if (!deploy.url) deploy.source = 'vercel cli returned no production deployment'
} else {
  deploy.source = 'vercel cli unavailable or not signed in'
}

// Which source files changed after the live bundle was built. mtime is the
// honest signal here, because the deploy came from the working tree, not git.
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', '.vercel'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|css|html)$/.test(entry.name)) out.push(full)
  }
  return out
}

let staleFrontend = []
if (deploy.createdAt) {
  const cutoff = new Date(deploy.createdAt).getTime()
  const roots = ['src', 'api', 'index.html'].map(p => path.join(ROOT, p)).filter(p => fs.existsSync(p))
  const files = roots.flatMap(p => (fs.statSync(p).isDirectory() ? walk(p) : [p]))
  staleFrontend = files
    .map(f => ({ file: path.relative(ROOT, f).replace(/\\/g, '/'), mtime: fs.statSync(f).mtimeMs }))
    .filter(f => f.mtime > cutoff)
    .sort((a, b) => b.mtime - a.mtime)
}

// Edge functions. There is no Supabase access token in this repo and no CLI on
// PATH, so deployment status can only come from the ledger.
const fnDir = path.join(ROOT, 'supabase', 'functions')
const functions = fs
  .readdirSync(fnDir, { withFileTypes: true })
  .filter(e => e.isDirectory() && e.name !== '_shared')
  .map(e => {
    const entry = path.join(fnDir, e.name, 'index.ts')
    const mtime = fs.existsSync(entry) ? fs.statSync(entry).mtimeMs : 0
    const rec = ledger.functions[e.name]
    const deployedAt = rec ? rec.deployedAt : null
    return {
      name: e.name,
      changedAt: mtime ? new Date(mtime).toISOString() : null,
      deployedAt,
      stale: deployedAt ? mtime > new Date(deployedAt).getTime() : null,
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name))

// Features. A file list says "App.tsx changed"; this says whether the
// onboarding fix is actually in production. Each declared marker must be
// present in the file, so a reverted change reads as missing rather than live.
function loadFeatures() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'live-state.features.json'), 'utf8')).features || []
  } catch {
    return []
  }
}

const deployCutoff = deploy.createdAt ? new Date(deploy.createdAt).getTime() : null

const features = loadFeatures().map(f => {
  const parts = []
  for (const decl of f.files || []) {
    const full = path.join(ROOT, decl.path)
    if (!fs.existsSync(full)) {
      parts.push({ label: decl.path, state: 'missing', detail: 'file not found' })
      continue
    }
    const present = fs.readFileSync(full, 'utf8').includes(decl.marker)
    const mtime = fs.statSync(full).mtimeMs
    if (!present) {
      parts.push({ label: decl.path, state: 'missing', detail: 'marker "' + decl.marker + '" not in file' })
    } else if (deployCutoff === null) {
      parts.push({ label: decl.path, state: 'unknown', detail: 'no deploy time to compare against' })
    } else if (mtime > deployCutoff) {
      // A file git has never seen, newer than the build, cannot be in it. A
      // tracked file that was merely edited might be: the live bundle holds an
      // older copy, and only part of it changed. Do not claim to know which.
      const brandNew = git.porcelain.some(l => l.trim().startsWith('??') && l.includes(decl.path))
      parts.push(
        brandNew
          ? { label: decl.path, state: 'not-live', detail: 'new file, created after the live build' }
          : { label: decl.path, state: 'uncertain', detail: 'edited ' + ago(new Date(mtime).toISOString()) + ', after the live build - the live copy is older' }
      )
    } else {
      parts.push({ label: decl.path, state: 'live', detail: '' })
    }
  }
  for (const fn of f.functions || []) {
    const rec = ledger.functions[fn]
    parts.push({
      label: 'function ' + fn,
      state: rec ? 'live' : 'unknown',
      detail: rec ? 'deployed ' + ago(rec.deployedAt) : 'no deploy ever recorded',
    })
  }
  for (const mig of f.migrations || []) {
    const rec = ledger.migrations[mig]
    parts.push({
      label: 'migration ' + mig,
      state: rec ? 'live' : 'unknown',
      detail: rec ? 'applied ' + fmt(rec.deployedAt) : 'not recorded as applied',
    })
  }

  // Worst part wins: a feature whose UI shipped but whose migration never ran
  // is not live, and saying so is the whole point of this file.
  const has = s => parts.some(p => p.state === s)
  const status = has('missing')
    ? 'MISSING'
    : has('not-live')
      ? 'NOT LIVE'
      : has('unknown')
        ? 'PARTLY UNKNOWN'
        : has('uncertain')
          ? 'UNCERTAIN'
          : 'LIVE'
  return { ...f, parts, status }
})

const migDir = path.join(ROOT, 'supabase', 'migrations')
const migrations = fs
  .readdirSync(migDir)
  .filter(f => f.endsWith('.sql'))
  .sort()
  .map(f => ({
    file: f,
    tracked: !git.porcelain.some(l => l.includes('supabase/migrations/' + f) && l.trim().startsWith('??')),
    appliedAt: ledger.migrations[f] ? ledger.migrations[f].deployedAt : null,
  }))

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const srcChanges = git.porcelain.filter(l => /\s(src|api|supabase|scripts)\//.test(l))
const flag = v => (v === null ? 'UNKNOWN - never recorded' : v ? 'STALE - local code is newer' : 'live')

const L = []
L.push('# What is live right now')
L.push('')
L.push('Generated ' + fmt(new Date().toISOString()) + ' by `node scripts/live-state.mjs`. Do not edit by hand - rerun it.')
L.push('')
L.push('This repo has three independent release paths and none of them is `git push`.')
L.push('The frontend ships when someone runs `vercel --prod` **from their working tree**,')
L.push('so uncommitted files can be live and committed files can be absent. Edge functions')
L.push('and migrations ship one at a time, by hand. Anything this file cannot verify is')
L.push('marked ' + UNKNOWN + ' rather than assumed.')
L.push('')

L.push('## Features')
L.push('')
L.push('What each change actually is, and whether it reached production. A feature')
L.push('counts as live only when every part of it is - UI shipped but migration')
L.push('never run reads NOT LIVE, because to a user it does not work.')
L.push('')
L.push('| Status | Feature | What it does |')
L.push('|---|---|---|')
for (const f of features) {
  L.push('| **' + f.status + '** | ' + f.name + ' | ' + f.what + ' |')
}
L.push('')
for (const f of features.filter(f => f.status !== 'LIVE')) {
  L.push('**' + f.name + ' - ' + f.status + '**')
  L.push('')
  for (const p of f.parts.filter(p => p.state !== 'live')) {
    L.push('- `' + p.label + '` - ' + p.state + (p.detail ? ': ' + p.detail : ''))
  }
  if (f.note) L.push('- note: ' + f.note)
  L.push('')
}

L.push('## Frontend')
L.push('')
L.push('| | |')
L.push('|---|---|')
L.push('| Live bundle built | ' + fmt(deploy.createdAt) + ' (' + ago(deploy.createdAt) + ') |')
L.push('| Deployment | ' + (deploy.url || UNKNOWN) + ' |')
L.push('| Checked via | ' + deploy.source + ' |')
L.push('| Source files changed since | **' + staleFrontend.length + '** |')
L.push('')
if (staleFrontend.length) {
  L.push('### Not live - ' + staleFrontend.length + ' file(s) changed after the last deploy')
  L.push('')
  L.push('Run `vercel --prod` to ship these.')
  L.push('')
  for (const f of staleFrontend.slice(0, 40)) L.push('- `' + f.file + '` - edited ' + ago(new Date(f.mtime).toISOString()))
  if (staleFrontend.length > 40) L.push('- ...and ' + (staleFrontend.length - 40) + ' more')
  L.push('')
} else if (deploy.createdAt) {
  L.push('No source file has changed since the last production deploy.')
  L.push('')
}

L.push('## Edge functions')
L.push('')
L.push('Deploy status comes from the ledger in `.live-state.json`, stamped by')
L.push('`node scripts/live-state.mjs --record function <name>` right after each')
L.push('`supabase functions deploy`. A function never stamped shows as ' + UNKNOWN + '.')
L.push('')
L.push('| Function | Code last changed | Last recorded deploy | Status |')
L.push('|---|---|---|---|')
for (const f of functions) {
  L.push('| `' + f.name + '` | ' + ago(f.changedAt) + ' | ' + (f.deployedAt ? ago(f.deployedAt) : 'never recorded') + ' | ' + flag(f.stale) + ' |')
}
L.push('')

L.push('## Migrations')
L.push('')
L.push('| File | In git | Recorded as applied |')
L.push('|---|---|---|')
for (const m of migrations) {
  L.push('| `' + m.file + '` | ' + (m.tracked ? 'yes' : 'UNTRACKED') + ' | ' + (m.appliedAt ? fmt(m.appliedAt) : UNKNOWN) + ' |')
}
L.push('')
L.push('To check what the database really has, run this in the Supabase SQL editor:')
L.push('')
L.push('```sql')
L.push('select version, name from supabase_migrations.schema_migrations order by version;')
L.push('```')
L.push('')
L.push('Loose `supabase/*.sql` files are not tracked here at all - they were pasted in by hand.')
L.push('')

L.push('## Uncommitted work')
L.push('')
L.push('Branch `' + git.branch + '` at `' + git.head + '` - ' + git.headSubject + ' (' + ago(git.headAt) + ').')
L.push('')
if (srcChanges.length) {
  L.push('**' + srcChanges.length + ' source file(s) exist only on this machine.** If this disk dies, production cannot be rebuilt.')
  L.push('')
  for (const l of srcChanges.slice(0, 40)) L.push('- `' + l.trim() + '`')
  if (srcChanges.length > 40) L.push('- ...and ' + (srcChanges.length - 40) + ' more')
} else {
  L.push('No uncommitted source changes.')
}
L.push('')

fs.writeFileSync(OUTPUT, L.join('\n'), 'utf8')

console.log('LIVE_STATE.md written')
for (const f of features) console.log('  ' + f.status.padEnd(15) + f.name)
console.log('  frontend built   ' + fmt(deploy.createdAt) + ' (' + ago(deploy.createdAt) + ')')
console.log('  changed since    ' + staleFrontend.length + ' file(s)')
console.log('  functions        ' + functions.filter(f => f.stale === null).length + ' unknown, ' + functions.filter(f => f.stale).length + ' stale')
console.log('  uncommitted      ' + srcChanges.length + ' source file(s)')
