# What is live right now

Generated 22 Sept 2026, 2:21 pm by `node scripts/live-state.mjs`. Do not edit by hand - rerun it.

This repo has three independent release paths and none of them is `git push`.
The frontend ships when someone runs `vercel --prod` **from their working tree**,
so uncommitted files can be live and committed files can be absent. Edge functions
and migrations ship one at a time, by hand. Anything this file cannot verify is
marked UNKNOWN rather than assumed.

## Features

What each change actually is, and whether it reached production. A feature
counts as live only when every part of it is - UI shipped but migration
never run reads NOT LIVE, because to a user it does not work.

| Status | Feature | What it does |
|---|---|---|
| **PARTLY UNKNOWN** | Onboarding keeps the answers it collects | Company profile writes onboarded_at and trade_role, and the gate closes as well as opens, so the modal stops reappearing on every reload. |
| **LIVE** | Paywall off for demos | Gating is behind VITE_ENFORCE_PAYWALL, so every screen is reachable unless that env var is set to 'true'. |
| **UNCERTAIN** | Alerts are relevant and readable | Feed HTML and double-escaped entities are stripped, duplicates dropped, and only product-relevant items stay critical. |
| **LIVE** | Sidebar logo is not a 4 MB PNG | Inline shield SVG plus wordmark, replacing the white-boxed logo.png. |
| **LIVE** | Dashboard shows real unclaimed RoDTEP | Dashboard prefers the figure computed from actual shipping bills over the turnover-band estimate, and captions which one it used. |
| **PARTLY UNKNOWN** | Trade agreement status comes from the database | fta_agreements overlays the built-in table at runtime, and the screen shows how old the data is. |
| **PARTLY UNKNOWN** | CBAM emissions use EU default values | climatiq-emissions looks up the CBAM default for the HS code's CN prefix instead of failing, and the panel appears once rather than per market. |
| **NOT LIVE** | DGFT Certificate of Origin - Phase 1 | Maps a shipment onto the DGFT CoO payload, validates it before submission, and carries the reference maps. No live DGFT call yet. |
| **UNCERTAIN** | RISK: self-made Certificate of Origin PDF | downloadCOOPdf draws a document headed CERTIFICATE OF ORIGIN with a locally generated reference number. No agency issued it. This should be withdrawn or relabelled before any customer uses it. |
| **LIVE** | Demo seed for Meridian Tubes & Alloys | Re-runnable seed with 8 shipments, IGST claims, BRC/FIRC and licences, for demoing to a real exporter. |

**Onboarding keeps the answers it collects - PARTLY UNKNOWN**

- `migration 20260910000001_onboarding_completion.sql` - unknown: not recorded as applied
- `migration 20260915000001_companies_update_policy.sql` - unknown: not recorded as applied

**Alerts are relevant and readable - UNCERTAIN**

- `src/lib/api.ts` - uncertain: edited 6h ago, after the live build - the live copy is older

**Trade agreement status comes from the database - PARTLY UNKNOWN**

- `src/lib/api.ts` - uncertain: edited 6h ago, after the live build - the live copy is older
- `migration 20260916000001_fta_agreements_read.sql` - unknown: not recorded as applied

**CBAM emissions use EU default values - PARTLY UNKNOWN**

- `function climatiq-emissions` - unknown: no deploy ever recorded

**DGFT Certificate of Origin - Phase 1 - NOT LIVE**

- `src/lib/dgft-coo-mapper.ts` - not-live: new file, created after the live build
- `src/lib/coo-validator.ts` - not-live: new file, created after the live build
- `src/lib/dgft-reference-maps.ts` - not-live: new file, created after the live build
- `migration 20260922000001_coo_integration.sql` - unknown: not recorded as applied
- note: Blocked on three unanswered questions: credential tenancy, fixed egress IP for DGFT's whitelist, RSA key custody.

**RISK: self-made Certificate of Origin PDF - UNCERTAIN**

- `src/lib/api.ts` - uncertain: edited 6h ago, after the live build - the live copy is older
- note: Here so it stays visible. Present = the risk is still shipped.

## Frontend

| | |
|---|---|
| Live bundle built | 16 Sept 2026, 2:59 pm (5d ago) |
| Deployment | https://compilance-r8q2dojuv-chandans-projects-8e0b4ca0.vercel.app |
| Checked via | vercel cli |
| Source files changed since | **7** |

### Not live - 7 file(s) changed after the last deploy

Run `vercel --prod` to ship these.

- `src/lib/eu-documents.ts` - edited 1h ago
- `src/lib/coo-validator.ts` - edited 6h ago
- `src/lib/coo-validator.test.ts` - edited 6h ago
- `src/lib/dgft-coo-mapper.ts` - edited 6h ago
- `src/lib/dgft-reference-maps.ts` - edited 6h ago
- `src/types/index.ts` - edited 6h ago
- `src/lib/api.ts` - edited 6h ago

## Edge functions

Deploy status comes from the ledger in `.live-state.json`, stamped by
`node scripts/live-state.mjs --record function <name>` right after each
`supabase functions deploy`. A function never stamped shows as UNKNOWN.

| Function | Code last changed | Last recorded deploy | Status |
|---|---|---|---|
| `climatiq-emissions` | 6d ago | never recorded | UNKNOWN - never recorded |
| `compliance-ai` | 88d ago | never recorded | UNKNOWN - never recorded |
| `contract-review` | 80d ago | never recorded | UNKNOWN - never recorded |
| `customs-filing` | 11d ago | never recorded | UNKNOWN - never recorded |
| `document-ocr` | 16d ago | never recorded | UNKNOWN - never recorded |
| `document-review` | 84d ago | never recorded | UNKNOWN - never recorded |
| `fetch-regulatory-feeds` | 189d ago | never recorded | UNKNOWN - never recorded |
| `hs-checklist` | 88d ago | never recorded | UNKNOWN - never recorded |
| `hs-lookup` | 188d ago | never recorded | UNKNOWN - never recorded |
| `hs-mismatch-check` | 84d ago | never recorded | UNKNOWN - never recorded |
| `label-vision` | 182d ago | never recorded | UNKNOWN - never recorded |
| `razorpay-create-link` | 103d ago | never recorded | UNKNOWN - never recorded |
| `razorpay-webhook` | 103d ago | never recorded | UNKNOWN - never recorded |
| `recovery-digest` | 16d ago | never recorded | UNKNOWN - never recorded |
| `regulatory-alerts` | 189d ago | never recorded | UNKNOWN - never recorded |
| `sanctions-check` | 103d ago | never recorded | UNKNOWN - never recorded |
| `treds-financing` | 11d ago | never recorded | UNKNOWN - never recorded |
| `underwriting-signal` | 189d ago | never recorded | UNKNOWN - never recorded |
| `whatsapp-alert` | 11d ago | never recorded | UNKNOWN - never recorded |
| `whatsapp-vendor-outreach` | 206d ago | never recorded | UNKNOWN - never recorded |
| `zonos-classify` | 207d ago | never recorded | UNKNOWN - never recorded |
| `zonos-landed-cost` | 207d ago | never recorded | UNKNOWN - never recorded |

## Migrations

| File | In git | Recorded as applied |
|---|---|---|
| `20260630000001_rodtep_tracker.sql` | yes | UNKNOWN |
| `20260630000002_ca_dashboard.sql` | yes | UNKNOWN |
| `20260630000003_whatsapp_settings.sql` | yes | UNKNOWN |
| `20260703000001_export_trackers.sql` | yes | UNKNOWN |
| `20260906000001_rodtep_recovery_program.sql` | yes | UNKNOWN |
| `20260910000001_onboarding_completion.sql` | yes | UNKNOWN |
| `20260915000001_companies_update_policy.sql` | yes | UNKNOWN |
| `20260916000001_fta_agreements_read.sql` | yes | UNKNOWN |
| `20260922000001_coo_integration.sql` | UNTRACKED | UNKNOWN |

To check what the database really has, run this in the Supabase SQL editor:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

Loose `supabase/*.sql` files are not tracked here at all - they were pasted in by hand.

## Uncommitted work

Branch `recover-untracked-edge-functions` at `b1eb574` - feat: let the app read trade agreement status from the database (5d ago).

**52 source file(s) exist only on this machine.** If this disk dies, production cannot be rebuilt.

- `M scripts/seed_tariff_rates.mjs`
- `M src/App.test.tsx`
- `M src/App.tsx`
- `M src/components/Sidebar.test.tsx`
- `M src/components/Sidebar.tsx`
- `M src/components/TopBar.tsx`
- `M src/components/views/Alerts.tsx`
- `M src/components/views/CBAMReadiness.tsx`
- `M src/components/views/Dashboard.test.tsx`
- `M src/components/views/Dashboard.tsx`
- `M src/components/views/FTASchemes.tsx`
- `M src/components/views/RiskAnalysis.tsx`
- `M src/components/views/RoDTEPCalculator.tsx`
- `M src/components/views/Settings.tsx`
- `M src/components/views/Shipments.tsx`
- `M src/components/views/index.ts`
- `M src/data/fta.ts`
- `M src/lib/api.ts`
- `M src/lib/eu-documents.ts`
- `M src/lib/rodtep-report.ts`
- `M src/types/index.ts`
- `M supabase/config.toml`
- `D supabase/create_hs_codes_table.sql`
- `M supabase/functions/_shared/rate-limit.ts`
- `M supabase/functions/document-ocr/index.ts`
- `M supabase/migration_cbam_leads.sql`
- `?? scripts/check-tokens.cjs`
- `?? scripts/check-tokens.js`
- `?? scripts/data/`
- `?? scripts/generate_tariff_migration.mjs`
- `?? scripts/live-state.features.json`
- `?? scripts/live-state.mjs`
- `?? scripts/seed_rodtep.mjs`
- `?? scripts/seed_sanctions.mjs`
- `?? src/components/LandingPage.tsx`
- `?? src/components/views/BRCFIRCTracker.tsx`
- `?? src/components/views/CADashboard.tsx`
- `?? src/components/views/ContractReview.tsx`
- `?? src/components/views/DocumentReview.tsx`
- `?? src/components/views/IGSTTracker.tsx`
- ...and 12 more
