# ComplianceOS — session handoff

Read this before touching anything. Regenerate it at the end of a session
if the state below has moved.

## Context
Export-compliance app for Indian MSME exporters (React + TS + Supabase +
Vercel). Pivoting so the spine is (a) export DOCUMENTATION — proforma,
commercial invoice, packing list — and (b) RECOVERY of unclaimed benefits
— RoDTEP, IGST, BRC/FIRC, AA/EPCG. Reach it with MINIMAL changes,
extending what exists over building new.

## CRITICAL: release paths
Three independent release paths and `git push` is NOT one of them.
Frontend ships only when someone runs `vercel --prod` from their working
tree. Edge functions and migrations ship by hand. Committed != live.
Run `node scripts/live-state.mjs` and read LIVE_STATE.md before
concluding anything is deployed.
`tsc --noEmit` is NOT a sufficient gate — the build runs `tsc -b` with
noUnusedLocals and catches more. Always `npm run build` before declaring
done.

## State as of 23 Sept 2026 (after phase 2 item 6 — LIVE)
- Branch `recover-untracked-edge-functions`.
- 960 tests / 39 files pass (`npm test`). `npm run build` passes. 28 DB
  tests pass on a local stack (`npm run test:integration`, see item 6).
- Item 4a (branches) is LIVE. The owner ran `supabase db push`
  (20260924000002 now local AND remote), recorded it in .live-state.json,
  then `vercel --prod` (aliased to www.complianceos.co.in). Verified after:
  a read-only schema dump of production has the new index with the GSTIN
  key, the invoices_number_blank_gstin_guard trigger, and invoices_guard()
  unchanged; the live bundle index-Bw-r7y2k.js is byte-identical to the
  local build and contains the GSTIN check.
- Item 6 (masters) is LIVE. The owner ran `supabase db push`
  (20260924000001 now local AND remote), then `vercel --prod`
  (aliased to www.complianceos.co.in). Verified after: a read-only schema
  dump of production has the 4 tables with RLS, 4 policies each, no anon
  grant, the 6 unique indexes, invoices.signatory_name/_designation, and
  invoices_guard() unchanged; the live bundle index--qQHUc2Q.js is
  byte-identical to the local build and contains the Masters code.
  Migration stamped in .live-state.json. Keep migration-first for any
  rollback too: this frontend writes invoices.signatory_* on every draft
  save, so an older schema breaks invoice saving.
- Item 4 (shipping bill import matches instead of duplicating) is LIVE.
  Frontend only, no migration. Deployed with `vercel --prod` on the
  owner's approval (dpl_th2T413sStFDJTz7EJHpao5qrwSw), aliased to
  www.complianceos.co.in; live bundle index-B1pgEXgR.js matches the local
  build and contains the new import code.
- Item 3 (per-line gate check + RoDTEP) is LIVE. The owner ran
  `supabase db push` (20260923000003 now local AND remote) and then
  `vercel --prod` (aliased to www.complianceos.co.in). Verified after: a
  read-only schema dump of production has freight_amount/insurance_amount
  with their checks and the new invoices_guard(); the live bundle
  (index-CWHQZ43u.js) contains the per-line code. Migration stamped in
  .live-state.json.
- Migration 20260923000002_invoice_documents is LIVE (owner ran
  `supabase db push`; `migration list --linked` shows all four local AND
  remote). Frontend with the Invoices view deployed by the owner with
  `vercel --prod`, aliased to www.complianceos.co.in; the live bundle was
  checked and contains the Invoices code. Both invoice migrations are
  stamped in .live-state.json.
- `--record migration` takes the bare filename. Passing the
  supabase/migrations/ path used to file the record under a key the report
  never reads (both invoice migrations showed UNKNOWN); the script now
  strips the directory.
- Live bundle built 23 Sept 11:26 am; LIVE_STATE reports 0 source files
  changed since.
- 21 edge functions in the repo, 20 live. `recovery-digest` is NOT
  deployed.

## What just shipped (read `git log` — messages are detailed)
Correctness/honesty pass (~10 commits), do not redo:
- One dated FX module (src/lib/fx.ts)
- RoDTEP on FOB not CIF + nothing claimable past 2026-09-30 (src/lib/rodtep.ts)
- BRC realisation 9 -> 15/18 months per invoice (src/lib/brc.ts)
- Alerts feed relevance filter (src/lib/feed-relevance.ts)
- GSTIN validation incl. checksum (src/lib/gstin.ts)
- Fake "CERTIFICATE OF ORIGIN" PDF removed -> application worksheet
- Label Checker no longer applies fabricated answers when the vision
  service is unconfigured

Then, 23 Sept, six commits:
- 7e9d023 schema is rebuildable from a clean checkout
- d6d0d0c underwriting-signal removed (it was NEVER deployed — the
  key_prefix auth bypass never served traffic)
- d6072bc live-state stopped reporting an already-withdrawn risk
- da48e58 build refuses to produce a bundle with no database client
- 1dd8a70 Meridian demo seed GSTIN now passes its own validator
- b127ed4 live-state regenerated

## PHASE 2 ITEM 0 IS DONE — do not redo it
The fresh-clone + fresh-Supabase rebuild test was run and the failure was
fixed. What was wrong: no tracked migration created the base tables. The
app reads 16 tables, supabase/migrations created 7, and all 7 were ALTERs
against tables a new project lacks. `supabase db reset` died immediately
with `relation "public.shipments" does not exist`. Seven companies
columns (city, state, pin, state_code, port_of_loading, gstin, address)
existed ONLY in production, in no file at all.

Now: `supabase/migrations/20260101000000_baseline_prod_schema.sql` is a
dump of the live public schema, plus the `on_auth_user_created` trigger
on auth.users re-added by hand (a --schema public dump cannot see it;
without it a new signup gets no company, profile or settings row). The
event trigger behind rls_auto_enable() is deliberately NOT recreated —
cluster-level, every table enables RLS explicitly, Supabase installs it.

Verified on a clean clone against a fresh local project: both migrations
apply, giving 27 tables matching production, all 7 drifted columns,
`pin` as integer (not text), the auth trigger, 43 policies, 5 functions.

supabase/migrations now holds exactly 2 files. The 7 superseded
migrations and the 14 hand-pasted supabase/*.sql files moved to
supabase/archive/ — read its README before assuming anything about
schema history. Seeds stayed in supabase/.

Remote migration history was repaired and is in sync: baseline recorded
applied, the 4 superseded versions reverted. `supabase migration list
--linked` now shows only 20260916000001 as local-only, which is correct.

supabase/config.toml previously had only [functions.*] entries — no
project_id, [db] or [api] — so `supabase start` failed before reaching
migrations. Filled in, with a note on the Windows reserved port range
that makes the 54321-54324 defaults unusable on this machine. Docker
Desktop must be running for any local Supabase work.

## The build now refuses an env-less production build
vite.config.ts fails the build when VITE_SUPABASE_URL or
VITE_SUPABASE_ANON_KEY are missing. This is deliberate: without them
src/lib/supabase.ts resolves to a null stub, Rollup tree-shakes all
197 kB of @supabase/supabase-js out, and the build still exits 0 —
shipping an app that cannot reach the database with nothing to show for
it (759 kB vs 957 kB, same commit, same 673 modules). A clean checkout
has no .env, so that was the DEFAULT outcome of building one.

If you genuinely want a database-less bundle:
`VITE_ALLOW_NO_SUPABASE=true npm run build`.
Both vars are set on Vercel for Production/Preview/Development, so the
deploy path is unaffected.

## Design decisions ALREADY MADE — do not relitigate
1. DGFT Certificate-of-Origin API integration is FROZEN. Only revisit if
   a CA partner asks by name.
2. Invoice line items live on the INVOICE, not on `shipments`. 27 files
   read `Shipment.hsCode`; adding line items there makes shipment_value
   and hs_code ambiguous and would silently produce wrong RoDTEP figures.
3. DO NOT mint invoice numbers. IGST refunds match the shipping bill to
   GSTR-1 by invoice number, and above Rs 5cr turnover an invoice needs a
   valid IRN. Accept number + date + IRN as input. Ask "do you generate
   e-invoices?" in onboarding — turnover alone won't tell you.
4. Issued invoices must be SNAPSHOTTED and immutable. Copy exporter,
   buyer, consignee, line descriptions, HS, Incoterm and FX rate onto the
   invoice row at issue; block updates with a trigger. Corrections go via
   credit/debit note or cancel-and-reissue.
5. Never generate a Bill of Lading. The shipping line issues it.

## PHASE 2 ITEM 2 IS DONE and LIVE (23 Sept 2026)
Multi-line Commercial Invoice, Proforma and Packing List.
- `supabase/migrations/20260923000002_invoice_documents.sql`: exporter bank
  snapshot (name, branch, account, IFSC, SWIFT, AD code), payment_terms,
  buyer_tax_id (EORI/VAT), origin_country on invoices; marks, package
  count/kind, net/gross kg on lines (gross >= net). invoices_guard() was
  NOT changed: it diffs to_jsonb(NEW) - mutable, so new columns are
  immutable after issue automatically. Verified on a local stack: 40
  behaviour checks as signed-in users (immutability of the new columns,
  constraints, RLS across companies, anon, rendered HTML from fetched rows).
- `src/lib/invoice-documents.ts`: pure HTML builders from the snapshot
  only (a test asserts it imports nothing but eu-documents). Every field
  HTML-escaped. Unnumbered drafts print "Not yet numbered".
- `src/lib/invoices.ts`: data layer; `src/components/views/Invoices.tsx`:
  sidebar view (paid-gated like its neighbours) to draft, issue, cancel,
  print. generateEUCommercialInvoice and EUInvoiceData are deleted; the EU
  Compliance view points to Invoices.
- The Invoices view was clicked through in Chrome against a local stack:
  draft, save, FX refusal, packing-list and invoice previews, issue,
  cancel. That pass fixed seven UI bugs (see the follow-up commit). Native
  date inputs don't take typed input from chrome-devtools `fill`; set
  them with the native value setter + an input event.
Known gaps, deliberately not built:
- No GST export endorsement ("supply meant for export under LUT without
  payment of IGST" / "on payment of IGST") and no IGST amount columns.
  CGST Rule 46 requires one on an export invoice, and it decides the IGST
  refund route. Needs its own migration + decision.
  PARKED (23 Sept 2026): the owner is checking with someone before we
  decide. Do not build it until they come back with an answer.
- No amount-in-words line; no signatory name (item 6 masters).
- FIXED 24 Sept (committed, NOT live — see "GSP/REX/EUDR escaping"): the
  GSP / REX / EUDR generators interpolated user input unescaped.

## PHASE 2 ITEM 3 IS DONE and LIVE (23 Sept 2026)
Gate check and RoDTEP per invoice line. Decisions agreed with the owner:
- An invoice is linked to a shipment by a "Shipment" picker on each row
  of the Invoices view (`linkInvoiceToShipment`). Nothing set
  invoices.shipment_id before this. No migration was needed for the link.
- FOB per line: invoice-level `freight_amount` / `insurance_amount`
  (invoice currency) split across lines BY LINE VALUE, remainder on the
  last line. FOB/FCA/FAS = FOB; CFR/CPT less freight; CIF/CIP less both;
  EXW/DAP/DPU/DDP give NO figure (with a note), never a guess.
- Converted with the invoice's own fx_rate_inr, never src/lib/fx.ts.
  Entitlement rounded per line, then summed. 2026-09-30 cutoff unchanged.
- Only ISSUED COMMERCIAL invoices count. All of them on a shipment are
  combined. No such invoice = today's single-HS behaviour, untouched.
- Shipment.hsCode = highest-value line (compared in INR, tie -> lower
  line_no), set IN MEMORY on load; shipments.hs_code in the DB is not
  written. Shipment.lineHsCodes carries the distinct codes.
- Gate: one check per distinct HS, buyer screened ONCE, worst status wins,
  reasons from the worst-status checks only; FTA/CoO fields from the
  primary HS; per_hs on the result lists each code's status.
Code: src/lib/shipment-lines.ts (pure, tested), fetchShipmentLineFigures
in api.ts, wired into App (hsCode + dashboard total), RoDTEPCalculator
(entitlement, claim CSV one row per line; default-rate lines written as
not claimable), CADashboard. Freight/insurance are required at ISSUE by
invoices_guard() (trigger, not a CHECK, so older issued CIF invoices can
still be cancelled/relinked). Verified on a local stack: all 5
migrations apply clean; 10 trigger checks; the PostgREST embed query.

Released migration-first, then frontend (the frontend writes the new
columns on every draft save, so the other order breaks invoice saving).
Keep that order for any rollback too: never serve an older schema to this
frontend.

Clicked through in Chrome against a local stack (23 Sept): CIF issue
refused without insurance (friendly message), issued with it, linked to a
shipment, dashboard moved from the single-HS 21,000 to the per-line 7,348,
claim CSV one row per line (5,344 + 2,004), Shipments shows the primary
line HS, gate check ran per HS with the buyer screened once. That pass
found one bug, fixed in 0d8b904 and LIVE (owner ran `vercel --prod`; live
bundle index-CN3M0HlL.js matches the local build and has the fix): RoDTEP
Recovery judged per-line shipments by the shipment-level match type, so a
shipment whose single-HS lookup was 'default' showed 0 filing-ready and
DISABLED the claim-register download, even with every line an exact match.

Known gaps, deliberately not built:
- The gate result says "2 HS codes ... each checked" but does not list
  them or show per_hs; the data is there, the UI doesn't render it.
- Freight/insurance are not printed on the commercial invoice document.
- CBAM emissions estimate and FTA savings still use the whole
  shipment_value, per HS. shipment_value is not reconciled to invoices.
- CBAMReadiness reads shipments.hs_code directly (not per line).
- invoices.shipment_id FK doesn't check company. RLS means a foreign link
  changes no one's figures; closing it needs a composite FK migration.
- Shipment-level MatchBadge hidden for per-line rows; no per-line badge UI.

## PHASE 2 ITEM 4 IS DONE and LIVE (23 Sept 2026)
Shipping bill import updates the matching shipment instead of inserting a
duplicate. Rules agreed with the owner, in src/lib/sb-import.ts (pure,
tested); bulkImportShippingBills in api.ts only loads and applies:
- IEC on the row must equal companies.iec (trimmed, case-insensitive),
  else rejected. Row IEC but no company IEC -> rejected. No IEC column ->
  accepted, counted `iecUnchecked`.
- Match an ISSUED COMMERCIAL invoice on number (trimmed, case-insensitive)
  + date, and on exporter_gstin when the row has a GSTIN. Two matches with
  no GSTIN on the row -> rejected as ambiguous (branches). Number without a
  valid date -> no invoice match, counted `invoiceNotFound`.
- Invoice linked -> UPDATE that shipment. Unlinked -> update the shipment
  already carrying the SB and link it, or create one and link it.
- No invoice -> match shipping_bill_no -> update; else insert.
- Overwritten: shipping_bill_no, date, hs_code, shipment_value,
  value_currency, rodtep_rate, rodtep_match_type. country/buyer_name only
  when empty. NEVER: name, status, gate/risk/sanctions, any rodtep_claim_*.
- Rejected, never guessed: invoice's shipment has a different SB; SB already
  on another shipment (leftover duplicates of the old bug — merge by hand);
  SB on 2+ shipments; invoice linked to a shipment outside the company;
  second row for the same invoice with a different SB.
- CSV: optional iec / gstin / invoice_no / invoice_date columns. Header
  matching now prefers exact names and never reuses a column, so "Invoice
  Date" is not the SB date, "Invoice Value" not the FOB, "Importer Exporter
  Code" not the buyer.
Known limits: no transaction — a failed invoice link after a created
shipment is reported per row, the shipment stays. Shipments with an SB are
read in one query, so PostgREST's row cap (1000 by default) applies. One
row per SB: a multi-item SB file keeps only its first row per SB; invoice
lines already carry per-line HS.
Clicked through in Chrome against a local stack (23 Sept): 6-row CSV with
"Invoice Date" as the first column -> 3 new, 2 updated, 1 invoice linked,
wrong-IEC row rejected, 1 unchecked IEC, 1 invoice not found; the in-app
shipment kept its name, status and FILED claim; re-importing the same file
gave 0 new / 5 updated, 5 shipments for 5 SBs. No console errors. The
local stack needed ports 5532x (Windows reserves 54225-54324 here) and
[inbucket] enabled = false; those edits were reverted, not committed.
Nit: the banner's entitlement total includes bills already claimed.

## PHASE 2 ITEM 5 IS DONE and LIVE (23 Sept 2026)
Settings: State is a picker, Port of Loading is a searchable code field.
Frontend only, no migration. Deployed with `vercel --prod` on the owner's
approval (dpl_DmmKXmZGcEsKMF3hwjmNS61fBzoB), aliased to
www.complianceos.co.in; live bundle index-DvJOBd3E.js matches the local
build and contains the picker code.

The source is NOT the two PDFs the plan named. TN No.25 has no code
tables (field names only) and Notification 39's annexure is RoDTEP 4R
tariff changes. The tables are in docs/Certificate+of+Origin+Open+API+v1.0.pdf
section 7. scripts/extract_dgft_annexure.py (pdfplumber) generates
src/lib/dgft-annexure-data.ts from it; a test pins the PDF's sha256.
Rows: 38 states, 698 districts (692 distinct), 37 UOMs, 264 countries
(255 distinct), 1000 domestic ports (996 kept; OTHERS, DEEMED, INDAGENCY,
INCCQ left out of the picker).

What the PDF does NOT give, so the app does not either:
- No codes for states, districts or countries — names only. The old
  stub's GJ/MH, GJ-AHM and USA/UAE codes were not from any source; gone.
- No state for a district or a port. So there is NO state -> district ->
  port cascade and no district step: it could only be built by guessing.
  Changing the state never clears or filters the port.
- Port tables stop at exactly 1,000 rows; the international one visibly
  ends mid-Belgium. Treat the domestic list as an extract. Hence the port
  field still takes free text and only warns on an unlisted code.
Needs a better DGFT/ICEGATE source (full port master with state, district
master with state) before the cascade can be built.

Existing rows are never rewritten. A stored state matching a PDF name
ignoring case ("Maharashtra") shows as selected and is not written back
until the user picks; one not in the list shows as its own option with a
warning; an unlisted port ("JNPT") is kept as typed with a warning.
companies.district does not exist and was not added.

CoO validator/mapper (frozen, no UI imports them) moved to the new
lookups: port by code only, country by PDF name, district by name only.
Trade agreement and origin criterion tables were NOT checked against
the PDF (sections 7.2, 7.5) — verify before CoO is unfrozen.

Clicked through in Chrome on a local stack (5532x ports, inbucket off,
reverted): Maharashtra/JNPT loaded as MAHARASHTRA + unlisted-port warning
with no DB write; picked GUJARAT (port and state_code untouched), typed
inmun1 -> INMUN1 named Mundra SEZ; saved and reloaded; an unlisted state
showed as its own option and stayed in the DB. No new console errors.
Known gaps:
- GSTIN 26's name in gstin.ts ("Dadra and Nagar Haveli and Daman and
  Diu") is not a PDF state, so a company picking either PDF value sees a
  (non-blocking) GSTIN/state mismatch message.
- Settings' api_keys query returns 400 on the local stack (pre-existing).
- Main bundle +~100 kB raw from the port list; lazy-load it if it matters.

## PHASE 2 ITEM 6 IS DONE and LIVE (23 Sept 2026)
Buyer / product / bank account / signatory masters. Decisions agreed with
the owner:
- Masters only PREFILL a draft. Picking one copies values into the form;
  the invoice stores values. There is NO foreign key from invoices to any
  master (ON DELETE SET NULL would UPDATE issued invoices, which the guard
  refuses, so a used master could never be deleted).
- company_registrations (branches) stays SEPARATE, with 4a. Not built.
- Default bank + default signatory fill NEW drafts only; an existing draft is
  never refilled. At most one default of each per company (partial unique
  index); marking a new default clears the old one first.
- Amount in words IS in: pure, print-only, no column. International system
  (million) for foreign currencies, lakh/crore for INR; an unknown currency
  keeps its code and prints the minor part as nn/100.
Migration `20260924000001_masters.sql`: 4 tables, per-company RLS
(select/insert/update/delete on get_user_company_id(), WITH CHECK on
writes), anon revoked, no CA read policy. Required: buyer name + country;
product description + 4-8 digit HS + unit; bank name + account; signatory
name. IFSC/SWIFT/currency/Incoterm checks match invoices. Duplicates refused
per company ignoring case/spaces: buyers (name, country), products
(description, HS), banks (bank name, account without spaces), signatories
(name). invoices gains signatory_name / signatory_designation (nullable,
no default); invoices_guard() unchanged and freezes them after issue.
Nothing existing is rewritten: verified on a local stack by fingerprinting
an issued and a draft invoice before and after applying the migration
(same md5 of every existing column, same updated_at, lines unchanged,
signatory NULL). Older invoices print exactly the old signature block.
Code: src/lib/masters.ts (pure prefill + validation, tested; DB calls),
src/components/views/Masters.tsx (sidebar "Masters", paid-gated),
Invoices.tsx pickers (buyer, consignee, bank, signatory, product per line)
and a signatory section. Picking a buyer whose default currency differs
CLEARS the typed FX rate and says so — a USD rate must never sit on a EUR
invoice.
Tests: src/lib/masters.test.ts (npm test). src/lib/masters.integration.test.ts
needs a local stack and runs only under `npm run test:integration` (the
default vitest config now excludes *.integration.test.*):
  LOCAL_SUPABASE_URL=http://127.0.0.1:55321 LOCAL_SUPABASE_ANON_KEY=<supabase status> npm run test:integration
It signs up throwaway users and REFUSES any non-localhost URL. It checks
refusals by SQLSTATE (23xxx / 42501), so a missing table can't pass them.
Clicked through in Chrome on a local stack (5532x, inbucket off, reverted):
blank buyer refused in words; duplicate buyer (case/space) refused in
words; bad IFSC refused; default bank moved and back; new draft arrived
with default SBI + signatory; USD rate typed, EUR buyer picked -> rate
cleared with a note; product filled a line; saved, DB row held the copies;
issued; printed with "Euros Four Thousand Nine Hundred Only" and the
signatory; then every master edited and deleted in the UI -> issued row and
line md5 + updated_at unchanged, reprint identical. Only console error:
the expected 409 from the duplicate test.
Known gaps:
- Masters are not seeded from past invoices (deliberate: no backfill).
- A buyer's default payment terms / Incoterm are copied only when set; a
  previously picked buyer's terms then remain in the form.
- Product unit price has no currency; it is copied as typed.
- Line product picker column appears only when products exist; below
  1440px lines are cards with the picker at the top.

## PHASE 2 ITEM 4a IS DONE and LIVE (23 Sept 2026)
Two GSTINs (branches) of one company may reuse an invoice number. Decisions
agreed with the owner:
- invoices_number_unique_per_fy keeps its NAME and gains the GSTIN,
  normalised in the index (upper, every space removed, NULL/''/blank all
  one "no GSTIN" key): the app upper-cases, a direct API write need not.
- A no-GSTIN invoice clashes with EVERY branch (it could be any of them):
  trigger invoices_number_blank_gstin_guard, advisory lock on (company,
  kind, number, FY), 23505 with "invoices_number_blank_gstin" in the text.
  Without it, clearing a draft's GSTIN took a branch's number (shown on a
  local stack with the index alone, rolled back). It returns early when
  number/date/GSTIN/kind are unchanged, so cancel/relink never trip it.
- Save refuses an exporter GSTIN that fails validateGstin (format, state
  code, checksum), and one whose PAN (chars 3-12) differs from the
  company's GSTIN when that is on file and valid (exporterGstinProblem).
  Blank stays allowed.
- Invoices list shows the GSTIN under the number.
- company_registrations master: DEFERRED by the owner. If built: extra
  branches only (companies row stays the default, no is_default), prefill
  exporter_gstin/state_code/address/port_of_loading, no FK.
- Import: unchanged, verified (loads exporter_gstin, matches it ignoring
  case/spaces); an integration test runs it over real branch invoices.
Proof nothing is rewritten: on a local stack with 20 invoices (draft,
issued, cancelled), 4 lines and a linked shipment, md5 of every column of
every row identical before and after the migration. Loosening only: the
new key is the old key plus a column. Production invoices was one 8 kB
page (`supabase inspect db table-stats --linked`, 23 Sept), so the index
rebuild's write lock is milliseconds.
Tests: src/lib/invoices-branches.integration.test.ts (12), plus unit tests
in invoices.test.ts. The sb-import fixture GSTIN 24AAECM4512R1Z6 failed its
own checksum; now 24AAECM4512R1Z8.
Clicked through in Chrome on a local stack (5532x, inbucket off,
reverted): BR/001 issued under 27..., same BR/001 saved and issued under
24..., list tells them apart; blank GSTIN, " 27aaecm4512r1z2 ", a
checksum typo and another PAN each refused in words with nothing written;
cancelled the 27... one and its number stayed reserved. Console: only the
three expected 409s.
Gotcha: right after `supabase db reset`/restart, integration signups can
fail with "JWT issued at future" (container clock); wait ~20s and rerun.
Release: migration first (`supabase db push`, then
`node scripts/live-state.mjs --record migration 20260924000002_invoice_number_per_gstin.sql`),
then `vercel --prod`. Either order is safe (no new columns), keep the habit.

## GSP/REX/EUDR escaping — DONE, committed, NOT LIVE (24 Sept 2026)
Frontend only. Needs `vercel --prod` on the owner's say-so to ship.
The three generators in src/lib/eu-documents.ts wrote every field raw
into a window.open('') page, which shares the app's origin: a buyer name
like `<img src=x onerror=...>` ran script with the user's session. Now
every value from `data` goes through esc() (= escapeHtml) where it is
interpolated, numbers included, plus the derived EUDR ddRef (built from
hsCode). Only BASE_CSS, PRINT_BUTTONS, ref and generatedOn stay raw —
module constants / clock values, no parameters. Rule is at the top of the
file: escape at the interpolation site, never pre-escape `data`.
Tests: src/lib/eu-documents.test.ts (92). A payload in EVERY field of each
interface (a full Record, so a new field that isn't listed fails the type
check; number fields too, via a cast): no <img/<script in the output, all
five entities, no script/img elements after parsing, payload shown
literally and escaped once. Six golden files in
src/lib/__snapshots__/eu-documents/ were captured from the code BEFORE the
fix; clean input is byte-identical after it. Shown failing first: 83
failed / 9 passed on the old code, 92 passed on the new.
Clicked through in Chrome on a local stack (5532x, inbucket off,
reverted): each document with the payload in every form field AND in
companies.name / iec: no alert, no script/img elements, text shown
literally, layout unchanged; then each with normal values ("Meridian
Tubes & Alloys" reads correctly). No console errors.
Findings, not fixed:
- The EUDR form is unreachable for every catalogue product. It shows only
  when isEUDRInScope(selectedProduct) matches, and it matches the product
  LABEL; none of the 9 labels in src/data/products.ts contains an EUDR
  commodity. The click-through set user_settings.selected_product =
  'leather' on the local stack to reach it.
- The EUDR form has no input for HS code, invoice number or operator
  address; they print blank. The GSP form labels value "(INR)" but
  prints the currency (USD default).
- Other same-origin windows still write user input UNESCAPED (not touched,
  owner to decide):
  - Shipments.tsx handleDownloadLCTemplate: financeForm.buyerName /
    invoiceRef, companyProfile.name / iec / gstin / portOfLoading.
  - deal-pack.ts: FIXED 24 Sept, see "Deal pack escaping" below.
  - rodtep-report.ts: companyName, hsCode, matchedHs.
  - cbam-report.ts: rows escaped; only `quarter` goes raw into refNo
    (date-derived, low risk).

## Deal pack escaping — DONE, committed, NOT LIVE (24 Sept 2026)
Frontend only; ships with the EU-documents fix on the next `vercel --prod`.
generateBankReadyDealPack (Shipments -> expand a shipment -> Download Deal
Pack) wrote everything raw into a same-origin window, including shipment
name / product / country / hsCode, which also arrive from imported SB
files. Now every string goes through esc() (escapeHtml imported from
eu-documents) where it is interpolated: shipment fields, refNo (built from
the id), company name and size, gate reasons, risk factor category /
severity / detail (detail can carry the country), FTA name / status /
notes / effective date, country name and flag, recommendations. Raw:
theme colours, numbers computed in the function, `today`, choices between
literal strings. Rule is in a comment above the template.
Tests: src/lib/deal-pack.test.ts (30). Payload in each field one at a time
and in every string field of Shipment and CompanyProfile at once; hostile
shipmentValue. 24 failed / 6 passed on the old code, 30 pass now.
Goldens in src/lib/__snapshots__/deal-pack/ were captured from the OLD
code (BLOCKED / CONDITIONAL / APPROVED, FTA preferential and MFN, CBAM in
and out, optional HS/value rows) and are compared as parsed DOM, not bytes:
the static recommendation "buyer's" is now written buyer&#39;s, identical
once parsed. A separate test pins that apostrophe as the ONLY byte change.
Clicked through in Chrome on a local stack (5532x, inbucket off,
reverted): a shipment with hostile name / product / country / HS and a
hostile company name -> no alert, no script/img, all shown literally,
layout intact; a normal EU steel shipment rendered as before. No console
errors. The local DB keeps two test shipments on the throwaway
xss-eu-docs@example.test account.

## Next work (phase 2), in order
1. `invoices` + `invoice_line_items` migration. Now lands on a working
   chain — write it as a normal migration after 20260916000001.
   Also trim the CoO fields from the Shipment type in src/types/index.ts:
   there are 14, not 15, and KEEP invoiceNumber, invoiceDate and
   portOfLoading — item 1 needs them. The other 11 don't exist in the DB
   and the type is lying.
2. Multi-line Commercial Invoice + Packing List + Proforma. Extend the
   print harness in src/lib/eu-documents.ts (BASE_CSS, PRINT_BUTTONS are
   exported). generateCBAMDeclaration shows the multi-row pattern.
   Include bank details + exporter letterhead. Retire
   generateEUCommercialInvoice the day the new one ships.
3. DONE and LIVE — see the item 3 section above.
4. DONE and LIVE — see the item 4 section below.
4a. DONE and LIVE — see the item 4a section above. Original brief:
   Branches: let two GSTINs of one company reuse an invoice number.
   GST numbers invoices per GSTIN per FY, but invoices_number_unique_per_fy
   is (company, kind, number, FY), so a second state branch's "EXP/001" is
   refused at save. Needs a migration rebuilding that index with
   exporter_gstin (loosening only; existing rows can't violate it), and
   ideally a company_registrations master (GSTIN, state, address, port) as
   a branch picker — fold into item 6. The import already matches by GSTIN
   and needs no change when this lands.
5. DONE and LIVE — see the item 5 section above.
6. DONE and LIVE — see the item 6 section above.

## Production writes already applied — do not repeat
Both were run on 23 Sept with the owner's approval.

1. `supabase db push` applied 20260916000001_fta_agreements_read.
   Verified: policy `fta_agreements_read` now exists on
   public.fta_agreements, so Trade Deals reads the table instead of
   falling back to the built-in literal. `supabase migration list
   --linked` shows both migrations local AND remote — fully in sync.
2. The Meridian GSTIN was corrected in production with a targeted
   UPDATE, NOT by re-running the seed. Two reasons the seed was the
   wrong tool: its `v_email` is still the literal CHANGE_ME@example.com
   and it RAISEs if no account matches, so it cannot run as committed;
   and it DELETEs every shipment, claim and licence for the company
   before reinserting, which is far more than a one-column fix needs.
   Exactly one row had the bad value. Verified after: Meridian Tubes &
   Alloys now holds 27AAECM4512R1Z2, and it is the only company in the
   database with a GSTIN at all, so nothing else fails the new
   validator.

Both migrations are now stamped in .live-state.json via
`node scripts/live-state.mjs --record migration <file>`, so LIVE_STATE
no longer reports them as UNKNOWN. Do the same after any future
migration or function deploy or the ledger goes stale again.

## Note on the demo seed
supabase/seed_demo_meridian.sql still has `v_email :=
'CHANGE_ME@example.com'`. Anyone re-running it must set that to a real
signed-up account first. It is destructive-then-idempotent: it clears
that company's demo rows and rebuilds them.

## Also outstanding
- IGST and BRC records have a nullable shipment_id FK the UIs never
  populate, so every claim is retyped and orphaned.
- Hide GSP/REX where India's preferences are suspended.
- Escape the LC template and RoDTEP report (see "GSP/REX/EUDR
  escaping").
- recovery-digest exists in the repo but was never deployed.
- Edge function deploys must be stamped with
  `node scripts/live-state.mjs --record function <name>` or LIVE_STATE
  reports all 21 as UNKNOWN forever.

## Working style
- Ask before writing to the production DB or deploying.
- Jev skill: use ONLY for genuine structured decisions; loading it cost
  26% of a session's usage. The model router is permanently on.
- Keep sessions short — >150k context is where the cost is.
