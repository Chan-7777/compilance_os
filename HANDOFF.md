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

## State as of 23 Sept 2026 (after phase 2 item 2)
- Branch `recover-untracked-edge-functions`, working tree clean.
- 704 tests / 31 files pass. `npm run build` passes. Both verified.
- **Migration 20260923000002_invoice_documents is COMMITTED BUT NOT IN
  PRODUCTION.** Tested on a local stack only. It must be pushed
  (`supabase db push`, owner's approval) BEFORE the next `vercel --prod`:
  the new Invoices view writes its columns, so a frontend deployed first
  fails every invoice save. Then stamp it with
  `node scripts/live-state.mjs --record migration <file>`.
- Frontend IS deployed: live bundle 23 Sept 7:41 am. One source file has
  changed since (src/lib/gstin.test.ts — a test, so deployed behaviour is
  unchanged). The previously-pending `vercel --prod` is done.
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

## PHASE 2 ITEM 2 IS DONE (code) — not deployed
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
- The Invoices view was type-checked and built, NOT clicked through in a
  browser.
Known gaps, deliberately not built:
- No GST export endorsement ("supply meant for export under LUT without
  payment of IGST" / "on payment of IGST") and no IGST amount columns.
  CGST Rule 46 requires one on an export invoice, and it decides the IGST
  refund route. Needs its own migration + decision.
- No amount-in-words line; no signatory name (item 6 masters).
- The GSP / REX / EUDR generators in eu-documents.ts still interpolate
  user input UNESCAPED into a same-origin window. escapeHtml() now exists
  there; apply it.

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
3. Make gate check and RoDTEP iterate DISTINCT line HS codes (worst gate
   status wins; RoDTEP summed per line). Set Shipment.hsCode to the
   highest-value line. WRITE TESTS FIRST — this is the money path.
4. `bulkImportShippingBills` (src/lib/api.ts:154) must match on
   IEC + invoice number + date and UPDATE the SB fields; insert only when
   nothing matches. As written it creates a DUPLICATE shipment for every
   SB whose invoice was generated in-app.
5. Settings pickers: state -> district -> port. src/lib/dgft-reference-maps.ts
   is a STUB — verified counts: 12 of 36 states, 9 districts covering
   only 5 states, 9 ports, 14 countries, 10 UOMs. Complete it from the
   annexure PDFs in docs/ (TN No.25 dated 07.09.2026.pdf, Annexure to
   Notification No. 39.pdf). Note docs/pdf_photos/ is gitignored.
6. Buyer / product / signatory / bank masters.

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
- recovery-digest exists in the repo but was never deployed.
- Edge function deploys must be stamped with
  `node scripts/live-state.mjs --record function <name>` or LIVE_STATE
  reports all 21 as UNKNOWN forever.

## Working style
- Ask before writing to the production DB or deploying.
- Jev skill: use ONLY for genuine structured decisions; loading it cost
  26% of a session's usage. The model router is permanently on.
- Keep sessions short — >150k context is where the cost is.
