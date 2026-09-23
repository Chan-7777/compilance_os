# What is live right now

Generated 23 Sept 2026, 11:33 am by `node scripts/live-state.mjs`. Do not edit by hand - rerun it.

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
| **LIVE** | Alerts are relevant and readable | Feed HTML and double-escaped entities are stripped, duplicates dropped, and only product-relevant items stay critical. |
| **LIVE** | Sidebar logo is not a 4 MB PNG | Inline shield SVG plus wordmark, replacing the white-boxed logo.png. |
| **LIVE** | Dashboard shows real unclaimed RoDTEP | Dashboard prefers the figure computed from actual shipping bills over the turnover-band estimate, and captions which one it used. |
| **LIVE** | Trade agreement status comes from the database | fta_agreements overlays the built-in table at runtime, and the screen shows how old the data is. |
| **PARTLY UNKNOWN** | CBAM emissions use EU default values | climatiq-emissions looks up the CBAM default for the HS code's CN prefix instead of failing, and the panel appears once rather than per market. |
| **LIVE** | DGFT Certificate of Origin - Phase 1 | Maps a shipment onto the DGFT CoO payload, validates it before submission, and carries the reference maps. No live DGFT call yet. |
| **LIVE** | Demo seed for Meridian Tubes & Alloys | Re-runnable seed with 8 shipments, IGST claims, BRC/FIRC and licences, for demoing to a real exporter. |

**Onboarding keeps the answers it collects - PARTLY UNKNOWN**

- `migration 20260910000001_onboarding_completion.sql` - unknown: not recorded as applied
- `migration 20260915000001_companies_update_policy.sql` - unknown: not recorded as applied

**CBAM emissions use EU default values - PARTLY UNKNOWN**

- `function climatiq-emissions` - unknown: no deploy ever recorded

## Frontend

| | |
|---|---|
| Live bundle built | 23 Sept 2026, 11:26 am (1h ago) |
| Deployment | https://compilance-fkn4qegpm-chandans-projects-8e0b4ca0.vercel.app |
| Checked via | vercel cli |
| Source files changed since | **0** |

No source file has changed since the last production deploy.

## Edge functions

Deploy status comes from the ledger in `.live-state.json`, stamped by
`node scripts/live-state.mjs --record function <name>` right after each
`supabase functions deploy`. A function never stamped shows as UNKNOWN.

| Function | Code last changed | Last recorded deploy | Status |
|---|---|---|---|
| `climatiq-emissions` | 6d ago | never recorded | UNKNOWN - never recorded |
| `compliance-ai` | 89d ago | never recorded | UNKNOWN - never recorded |
| `contract-review` | 81d ago | never recorded | UNKNOWN - never recorded |
| `customs-filing` | 12d ago | never recorded | UNKNOWN - never recorded |
| `document-ocr` | 17d ago | never recorded | UNKNOWN - never recorded |
| `document-review` | 85d ago | never recorded | UNKNOWN - never recorded |
| `fetch-regulatory-feeds` | 189d ago | never recorded | UNKNOWN - never recorded |
| `hs-checklist` | 89d ago | never recorded | UNKNOWN - never recorded |
| `hs-lookup` | 189d ago | never recorded | UNKNOWN - never recorded |
| `hs-mismatch-check` | 85d ago | never recorded | UNKNOWN - never recorded |
| `label-vision` | 183d ago | never recorded | UNKNOWN - never recorded |
| `razorpay-create-link` | 104d ago | never recorded | UNKNOWN - never recorded |
| `razorpay-webhook` | 104d ago | never recorded | UNKNOWN - never recorded |
| `recovery-digest` | 17d ago | never recorded | UNKNOWN - never recorded |
| `regulatory-alerts` | 190d ago | never recorded | UNKNOWN - never recorded |
| `sanctions-check` | 104d ago | never recorded | UNKNOWN - never recorded |
| `treds-financing` | 12d ago | never recorded | UNKNOWN - never recorded |
| `whatsapp-alert` | 12d ago | never recorded | UNKNOWN - never recorded |
| `whatsapp-vendor-outreach` | 207d ago | never recorded | UNKNOWN - never recorded |
| `zonos-classify` | 207d ago | never recorded | UNKNOWN - never recorded |
| `zonos-landed-cost` | 207d ago | never recorded | UNKNOWN - never recorded |

## Migrations

| File | In git | Recorded as applied |
|---|---|---|
| `20260101000000_baseline_prod_schema.sql` | yes | 23 Sept 2026, 8:55 am |
| `20260916000001_fta_agreements_read.sql` | yes | 23 Sept 2026, 8:55 am |
| `20260923000001_invoices.sql` | yes | 23 Sept 2026, 9:19 am |
| `20260923000002_invoice_documents.sql` | yes | 23 Sept 2026, 11:27 am |

To check what the database really has, run this in the Supabase SQL editor:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

Loose `supabase/*.sql` files are not tracked here at all - they were pasted in by hand.

## Uncommitted work

Branch `recover-untracked-edge-functions` at `e4824c7` - chore: record the invoice-documents release; fix migration record keys (1h ago).

No uncommitted source changes.
