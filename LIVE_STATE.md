# What is live right now

Generated 22 Sept 2026, 6:06 pm by `node scripts/live-state.mjs`. Do not edit by hand - rerun it.

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
| **PARTLY UNKNOWN** | DGFT Certificate of Origin - Phase 1 | Maps a shipment onto the DGFT CoO payload, validates it before submission, and carries the reference maps. No live DGFT call yet. |
| **UNCERTAIN** | RISK: self-made Certificate of Origin PDF | downloadCOOPdf draws a document headed CERTIFICATE OF ORIGIN with a locally generated reference number. No agency issued it. This should be withdrawn or relabelled before any customer uses it. |
| **LIVE** | Demo seed for Meridian Tubes & Alloys | Re-runnable seed with 8 shipments, IGST claims, BRC/FIRC and licences, for demoing to a real exporter. |

**Onboarding keeps the answers it collects - PARTLY UNKNOWN**

- `migration 20260910000001_onboarding_completion.sql` - unknown: not recorded as applied
- `migration 20260915000001_companies_update_policy.sql` - unknown: not recorded as applied

**Alerts are relevant and readable - UNCERTAIN**

- `src/lib/api.ts` - uncertain: edited 9h ago, after the live build - the live copy is older

**Trade agreement status comes from the database - PARTLY UNKNOWN**

- `src/lib/api.ts` - uncertain: edited 9h ago, after the live build - the live copy is older
- `migration 20260916000001_fta_agreements_read.sql` - unknown: not recorded as applied

**CBAM emissions use EU default values - PARTLY UNKNOWN**

- `function climatiq-emissions` - unknown: no deploy ever recorded

**DGFT Certificate of Origin - Phase 1 - PARTLY UNKNOWN**

- `src/lib/dgft-coo-mapper.ts` - uncertain: edited 9h ago, after the live build - the live copy is older
- `src/lib/coo-validator.ts` - uncertain: edited 9h ago, after the live build - the live copy is older
- `src/lib/dgft-reference-maps.ts` - uncertain: edited 9h ago, after the live build - the live copy is older
- `migration 20260922000001_coo_integration.sql` - unknown: not recorded as applied
- note: Blocked on three unanswered questions: credential tenancy, fixed egress IP for DGFT's whitelist, RSA key custody.

**RISK: self-made Certificate of Origin PDF - UNCERTAIN**

- `src/lib/api.ts` - uncertain: edited 9h ago, after the live build - the live copy is older
- note: Here so it stays visible. Present = the risk is still shipped.

## Frontend

| | |
|---|---|
| Live bundle built | 16 Sept 2026, 2:59 pm (6d ago) |
| Deployment | https://compilance-r8q2dojuv-chandans-projects-8e0b4ca0.vercel.app |
| Checked via | vercel cli |
| Source files changed since | **7** |

### Not live - 7 file(s) changed after the last deploy

Run `vercel --prod` to ship these.

- `src/lib/eu-documents.ts` - edited 4h ago
- `src/lib/coo-validator.ts` - edited 9h ago
- `src/lib/coo-validator.test.ts` - edited 9h ago
- `src/lib/dgft-coo-mapper.ts` - edited 9h ago
- `src/lib/dgft-reference-maps.ts` - edited 9h ago
- `src/types/index.ts` - edited 9h ago
- `src/lib/api.ts` - edited 9h ago

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
| `razorpay-create-link` | 104d ago | never recorded | UNKNOWN - never recorded |
| `razorpay-webhook` | 104d ago | never recorded | UNKNOWN - never recorded |
| `recovery-digest` | 16d ago | never recorded | UNKNOWN - never recorded |
| `regulatory-alerts` | 189d ago | never recorded | UNKNOWN - never recorded |
| `sanctions-check` | 104d ago | never recorded | UNKNOWN - never recorded |
| `treds-financing` | 11d ago | never recorded | UNKNOWN - never recorded |
| `underwriting-signal` | 189d ago | never recorded | UNKNOWN - never recorded |
| `whatsapp-alert` | 11d ago | never recorded | UNKNOWN - never recorded |
| `whatsapp-vendor-outreach` | 207d ago | never recorded | UNKNOWN - never recorded |
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
| `20260922000001_coo_integration.sql` | yes | UNKNOWN |

To check what the database really has, run this in the Supabase SQL editor:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

Loose `supabase/*.sql` files are not tracked here at all - they were pasted in by hand.

## Uncommitted work

Branch `recover-untracked-edge-functions` at `849c844` - docs: add audit pack, partnership material and regulatory references (3h ago).

No uncommitted source changes.
