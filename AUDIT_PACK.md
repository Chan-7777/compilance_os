# ComplianceOS — Due Diligence Pack for CA & Legal Review

**Prepared for:** the Chartered Accountant and lawyer reviewing ComplianceOS before it charges customers.
**Prepared by:** AI code review of the actual repository, as of 2026-09-21, on branch `recover-untracked-edge-functions`.
**How to read this:** every claim below cites a real file and, where relevant, a function name. Anything the reviewer must independently confirm against a DGFT/CBIC/RBI source or a statute is marked **NEEDS PROFESSIONAL VERIFICATION**. Nothing in this document should be read as a statement that the product is legally compliant — that determination is the reviewers' job.

---

## Section 1 — What the product claims to do

### Landing page (`src/components/LandingPage.tsx`)
- Hero headline: *"Your refund is stuck. We tell you exactly why."* (line 358-359)
- Sub-headline: *"IGST refunds, RoDTEP claims, BRC tracking — one platform covering the entire export compliance lifecycle. Built for Indian exporters and their CAs."* (line 365)
- Pain-point cards claim specific diagnostic behavior, e.g. *"The shipping line never filed the EGM. We flag it and tell you who to chase."* and *"ICEGATE reconciles field-by-field. We catch the mismatch before you file."* (lines 401-413) — **NEEDS PROFESSIONAL VERIFICATION** whether the shown UI mock (`AppPreview`, lines 166-272) reflects a real automated ICEGATE/EGM reconciliation or is illustrative copy; the actual reconciliation logic (if any) is outside the files reviewed here and should be located and demonstrated before this claim is retained.
- Pricing table quotes three tiers: **Free ₹0**, **Exporter ₹999/month** ("Start 14-Day Trial"), **CA / Professional ₹2,499/month** (lines 489-522).
- Trust badges in the final CTA and footer: *"DGFT · ICEGATE · GST Portal · AES-256 · Hosted in India"* (line 594) and footer badges *"AES-256"*, *"Data in India"*, *"DPDP Act"* (lines 604-614). These are **factual infrastructure claims** — see Section 3 for what the code actually shows about encryption/region, which is less than these badges assert.
- Footer disclaimer: *"© 2026 ComplianceOS · Not legal or trade advice"* (line 605). This is the only disclaimer on the marketing page; it does not appear anywhere above the fold or near the pricing/CTA buttons.

### In-app upgrade screen (`src/components/views/Upgrade.tsx`)
- **This screen shows different pricing from the landing page**: **Growth ₹2,999/month**, **Enterprise ₹9,999/month** (lines 17-53), vs. ₹999 / ₹2,499 on the landing page. This is a direct inconsistency in customer-facing pricing between two live surfaces of the same app — flagged as a finding, not resolved here.
- Feature list under "Growth" includes *"RoDTEP duty drawback calculator"* and *"OFAC sanctions screening"* as paid features (lines 26-33).
- Footer copy: *"Secure payment via Razorpay · Cancel anytime · GST invoice provided"* (line 160) — **no refund/cancellation logic exists in the code** (see Section 6); "Cancel anytime" and "GST invoice provided" are unverified promises with no supporting implementation found.

### RoDTEP Calculator (`src/components/views/RoDTEPCalculator.tsx`)
- Headline figure: *"Unclaimed RoDTEP across your export history"* rendered as a large rupee figure (`totalUnclaimed`, lines 285-293).
- Per-shipment audit-trail badges (`MATCH_META`, lines 65-69):
  - **Exact match** — *"8-digit HS code found in Appendix 4R. Filing-ready."*
  - **Estimated** — *"No 8-digit row — rate taken from the same 6-digit sub-heading. Confirm the exact RITC with your CHA before filing."*
  - **Not in schedule** — *"HS code not found in Appendix 4R. 0.5% placeholder shown — do NOT file on this figure."*
- Single-shipment calculator shows: entitlement, rate, and an explicit formula string, e.g. *"₹X × Y% = ₹Z"* plus *"Notification 60/2025-26 (Feb 2026) revised chapter {N}+ rates; the rate shown is post-revision"* for any HS chapter ≥ 25 (lines 486-490, logic at line 114-115). **This chapter≥25 banner is a code bug relevant to Section 2/5**: chapters 25, 26, 27, 61, 62, 63, 72 and others have **zero rows** in the actual rate table (see Section 2), so this banner will display for HS codes the system cannot rate at all.
- Downloadable PDF-style report (`src/lib/rodtep-report.ts`) repeats the same match-type language and adds a *"How to Claim"* section describing the LEO → ICEGATE scrip-ledger process (lines 108-116) and a footer disclaimer: *"Indicative estimate only. Verify rates with CBIC/DGFT before filing claims."* (line 119).

### No guarantee/accuracy-percentage language found
A repo-wide search for "guarantee", "100% accurate", "we find" and similar language found no explicit accuracy guarantee text in the reviewed `.ts`/`.tsx` source. The strongest claim is the unqualified headline number ("Unclaimed RoDTEP…") and the marketing phrase "We tell you exactly why" — these are promotional claims about certainty that the underlying calculation (Section 2) does not fully support for all HS codes.

---

## Section 2 — How every rupee figure is calculated

### The formula
Every RoDTEP rupee figure in the product is:

```
entitlement = Math.round(export_value_in_INR × (rate / 100))
```

This exact line appears in three independent places, which is itself worth noting (three copies of the same formula, not one shared function):
- `src/components/views/RoDTEPCalculator.tsx:125` — single-shipment calculator
- `src/components/views/RoDTEPCalculator.tsx:154` — claim-tracker per-shipment entitlement
- `src/lib/api.ts:189` — bulk CSV import
- `src/lib/rodtep-report.ts:15` — the downloadable report (recomputes the same formula independently rather than reusing a shared value)

### Where the rate comes from
- Table: `rodtep_rates` (`supabase/migration_rodtep.sql`), columns `hs_code` (8-digit), `rate` (numeric %), `notified_at`, `updated_at`.
- Seed source: `scripts/seed_rodtep.mjs` loads `scripts/data/rodtep_rates_extracted.json`, a static JSON file of **10,501** HS-code → rate pairs, and bulk-inserts it. The `notified_at` field written for every row is the literal string: *"Notification No. 32 dated 30.09.2024 (Appendix 4R, wef 10.10.2024); rates ch25+ halved per Notification No. 60 dated 23.02.2026"* (`scripts/seed_rodtep.mjs:28`).
- **This is a hand-extracted static snapshot, not a live feed.** There is no code that re-fetches or re-syncs from DGFT. The table's accuracy is only as good as this one-time extraction and manual edit (the "halved" adjustment is not computed in code — it must already be baked into the JSON values). **NEEDS PROFESSIONAL VERIFICATION**: someone must confirm the JSON file's rates actually match the published Appendix 4R and Notification No. 60/2025-26 (23 Feb 2026), chapter by chapter. This document cannot verify that against DGFT's real notification text.
- **Coverage gap found in the data (verified by inspection):** the JSON file has **zero rows** for HS chapters `01, 02, 24, 25, 26, 27, 31, 47, 61, 62, 63, 72, 77, 99`. Concretely: **chapter 72 (iron & steel)** and **chapter 61 (knit apparel)** — the two example products used in the app's own CSV import template (`RoDTEPCalculator.tsx:60-62`, "Hot-rolled steel coils" HS 72081000 and "Cotton T-shirts" HS 61091000) — have **no rate row at all** and will silently fall through to the 0.5% "not in schedule" default (see below), while the UI simultaneously shows the "Notification 60/2025-26 revised rates apply" banner for any chapter ≥ 25, including these missing ones (`RoDTEPCalculator.tsx:114-115`). This is a materially misleading combination for a paying customer's own product examples.
- No "last updated" surfaced to the user anywhere in the UI — `updated_at`/`notified_at` are stored in the DB but never displayed on the calculator or report screens reviewed.

### How HS-code matching works
`fetchRodtepRateDetailed()` (`src/lib/api.ts:41-65`):
1. Strip non-digits from the input HS code; if fewer than 4 digits, return the 0.5% default immediately.
2. Pad the code to 8 digits (`padEnd(8, '0')` — i.e., a 6-digit input like `840110` becomes `84011000`, not a real code, it's zero-padded) and look for an **exact** match in `rodtep_rates`.
3. If none, look for **any** row whose `hs_code` starts with the first 6 digits (`LIKE 'prefix%' LIMIT 1`) — this is the **prefix/estimated** match. Note: it takes the *first* row Postgres returns for that prefix, with no `ORDER BY`, so which specific 8-digit rate is picked among several sharing a 6-digit heading is not deterministic and is not necessarily the closest one.
4. If nothing matches, return `RODTEP_DEFAULT_RATE = 0.5` (`api.ts:39`) with `matchType: 'default'`.

The **0.5% default is not a real published RoDTEP rate for the queried product** — it is a placeholder chosen by the developers, applied identically to (a) genuinely RoDTEP-ineligible products and (b) products that are eligible but simply missing from this snapshot (like chapters 61/72 above). The UI does distinguish this case with the red "Not in schedule — do NOT file on this figure" badge, which is the main safeguard in place today.

### How "unclaimed" is derived
In `RoDTEPCalculator.tsx` (lines 226-236) and `api.ts` `backfillRodtepRates`/`bulkImportShippingBills`:
- A shipment counts toward "unclaimed" only if it has a `shipping_bill_no` (comment at `RoDTEPCalculator.tsx:141-143` and `api.ts:83-85` explicitly says a shipment without a shipping bill "has not been cleared for export and cannot appear as claimable entitlement" — a deliberate, documented design choice).
- "Unclaimed" = shipments where `rodtep_claim_status` is `unclaimed` or `rejected` (line 226). Status is user-entered via buttons (Filed/Credited/Rejected) — **the app does not verify against ICEGATE whether a claim was actually filed or credited; it only records what the user clicks** (`updateRodtepClaimStatus`, `api.ts:109-125`).
- Currency conversion to INR uses a **hardcoded, static FX table**: `{ INR: 1, USD: 84, EUR: 91, GBP: 107, AED: 23 }` (`RoDTEPCalculator.tsx:40-41`, duplicated as `FX_TO_INR` in `api.ts:151`). These rates are not fetched live and will drift from the real market/customs exchange rate over time, directly skewing every non-INR entitlement figure. **NEEDS PROFESSIONAL VERIFICATION**: customs valuation for RoDTEP purposes should use the exchange rate notified by CBIC for the relevant period, not a static assumption — this is a candidate for material misstatement on any foreign-currency shipment.
- Rounding: `Math.round()` to the nearest rupee on every calculation — immaterial by itself, but compounds with the FX and rate issues above.

### Flags for the CA to check every number against
1. Stale/incomplete rate table (14 missing HS chapters, one-time manual extraction, no re-sync).
2. FOB value is taken as entered by the user/CSV with no cross-check against the actual shipping bill FOB as filed with Customs — there is no ingestion from ICEGATE itself.
3. Static, non-live FX conversion for non-INR shipments.
4. The "prefix/estimated" match can silently pick an arbitrary 8-digit rate under a shared 6-digit heading.
5. No display anywhere of when the underlying rate schedule was last verified/updated.
6. Claim status (filed/credited/rejected) is self-reported by the user, not verified against ICEGATE.

---

## Section 3 — Data handling and privacy

### What is ingested
- Shipment records: HS code, FOB value + currency, shipping bill number, buyer name, destination country, dates (`shipments` table, columns added in `supabase/migration_rodtep_tracker.sql` and the base schema `supabase/schema.sql`).
- Bulk CSV uploads of shipping bills (`bulkImportShippingBills`, `src/lib/api.ts:153-222`) — customer-entered/exported data from ICEGATE, their CHA, or Tally, per the in-app help text.
- Document images/PDFs for OCR extraction: `document-ocr` edge function accepts a base64-encoded file (`fileBase64`) and filename directly in the request body (`supabase/functions/document-ocr/index.ts:36`).
- Company profile, user accounts, API keys (`api_keys` table, RLS policy `company_apikeys_all`, `supabase/schema.sql:247`).

### Where it is stored
- Supabase Postgres (`src/lib/supabase.ts`), URL taken from `VITE_SUPABASE_URL` env var — actual project region/plan is **NEEDS PROFESSIONAL VERIFICATION** by checking the live Supabase project dashboard; it is not present in the reviewed source. The seed script (`scripts/seed_tariff_rates.mjs:11`) hardcodes a project URL `https://gakmevnkyjldhzmfyyzq.supabase.co` — the reviewer should confirm with the founder which Supabase region/data-residency setting this project uses, since the landing page explicitly claims **"Hosted in India"** and **"AES-256"** (`LandingPage.tsx:594-614`). Supabase's standard at-rest encryption is AES-256 by default on its infrastructure, but region ("Hosted in India") is a project configuration choice that must be confirmed independently — the code does not prove where the database physically resides.
- Row Level Security is enabled and scopes rows by `company_id` for `shipments`, `checklist_progress`, `user_settings`, `audit_log`, and `api_keys` (policies listed in `supabase/schema.sql:213-247`), and separately for `rodtep_rates` (public read for any authenticated user, service-role write only — `supabase/migration_rodtep.sql:16-22`, which is appropriate since that table has no customer data).
- No use of Supabase Storage (file buckets) was found in `src/lib/api.ts` for uploaded documents; the OCR flow (`document-ocr`) appears to pass the file directly to Anthropic's API in the same request rather than persisting it to a bucket first — **NEEDS PROFESSIONAL VERIFICATION**: confirm whether the raw uploaded document (e.g., a commercial invoice image) is retained anywhere (logs, Anthropic's own retention policy, browser-side) after the extraction call returns.

### Who can access it / what leaves the system
Data is sent to the following third parties, evidenced by direct API calls in the edge functions:

| Function | Third party | Data sent |
|---|---|---|
| `document-ocr` (`supabase/functions/document-ocr/index.ts:56`) | Anthropic API (`claude-opus-4-8`) | Full document image (invoice/BL/packing list) as base64 |
| `compliance-ai`, `contract-review`, `document-review`, `hs-checklist`, `hs-mismatch-check` | Anthropic API | Shipment/contract/document text and fields |
| `label-vision` (`supabase/functions/label-vision/index.ts:85`) | OpenAI API | Product label image |
| `hs-lookup` (`supabase/functions/hs-lookup/index.ts:124`) | OpenAI API | Product description text |
| `climatiq-emissions` (`supabase/functions/climatiq-emissions/index.ts:10,56,147`) | Climatiq API | HS code / product & shipment data for emissions estimate |
| `zonos-classify`, `zonos-landed-cost` | Zonos API (`api.zonos.com/graphql`) | Product/shipment classification data |
| `whatsapp-alert`, `whatsapp-vendor-outreach` | Meta Graph API (`graph.facebook.com`) | Phone numbers and alert/message content |
| `razorpay-create-link`, `razorpay-webhook` | Razorpay | Customer email, name, company ID, plan, payment amount |
| `sanctions-check` | **No external call found** — screens against a local `sdn.csv` data file bundled with the function; buyer/entity names do not appear to leave the system for this feature specifically. |

Each of these is a data flow the lawyer should evaluate for DPDP Act "significant data fiduciary" and cross-border transfer implications (Anthropic, OpenAI, Climatiq, Zonos, and Meta/WhatsApp are all non-Indian processors as far as this code shows). **NEEDS PROFESSIONAL VERIFICATION**: whether Data Processing Agreements exist with any of these vendors — none were found in the repository.

### Retention
No code implementing data retention limits, deletion schedules, or a "right to erasure" workflow was found anywhere in `src/` or `supabase/functions/`. Data persists in Supabase indefinitely by default until manually deleted. There is no cookie/consent banner or privacy-preferences UI found in `src/components/`.

### Legal documents
No Privacy Policy or Terms of Service page, route, or markdown file was found anywhere in the reviewed source tree (`src/`, `docs/` contains marketing/architecture HTML files, not legal documents; `public/` was not found to contain one either). This is a gap — see Section 6.

---

## Section 4 — What the product does NOT do

Stated plainly, based on the code reviewed:

- **It does not file anything on ICEGATE or DGFT.** No code in this repo makes an authenticated call to ICEGATE, DGFT, or any government filing system. All "filing-ready" language (e.g., the "Exact match" badge, `RoDTEPCalculator.tsx:66`) describes the *quality of the calculated rate*, not an actual submission.
- **It does not submit RoDTEP claims.** The "Filed"/"Credited"/"Rejected" buttons (`RoDTEPCalculator.tsx:370-372`) only update a status column in the app's own database (`updateRodtepClaimStatus`, `api.ts:109-125`); they do not talk to any government system. The user must file the shipping bill declaration themselves (or via their CHA) outside this app, exactly as the report's "How to Claim" section describes (`rodtep-report.ts:108-116`).
- **It does not give tax or legal advice.** The only disclaimers found are the landing-page footer ("Not legal or trade advice," `LandingPage.tsx:605`) and the report footer ("Indicative estimate only. Verify rates with CBIC/DGFT before filing claims," `rodtep-report.ts:119`). These disclaimers do **not** appear on the RoDTEP Calculator screen itself, on the Upgrade/pricing screen, or on the landing page hero/pricing sections where the strongest numeric claims are made.
- **It produces an estimate for a human (CA/CHA) to review, not a filing-ready government submission**, despite the "Filing-ready" label used for exact matches — that label refers only to the rate lookup confidence, not to any other field on the shipping bill.
- **Gaps a user might reasonably assume are covered but are not, per the code:**
  - No cross-check against SEZ, Advance Authorization, EPCG, deemed-export, or other RoDTEP-exclusion categories was found anywhere in the RoDTEP calculation path. The License Tracker feature (`src/components/views/LicenseTracker.tsx`) tracks AA/EPCG licenses as a **separate, unlinked feature** — it is not consulted by `fetchRodtepRateDetailed` or the entitlement calculators to suppress or flag ineligible shipments.
  - No handling of Bhutan/Nepal or other land-export/non-DGFT-scheme nuances was found.
  - No verification that the HS code entered actually matches the goods described (a separate `hs-mismatch-check` AI function exists but is not shown to be wired into the RoDTEP flow itself in the files reviewed).
  - No live reconciliation with ICEGATE status, despite landing-page copy implying real-time reconciliation ("ICEGATE reconciles field-by-field. We catch the mismatch before you file," `LandingPage.tsx:412`) — **NEEDS PROFESSIONAL VERIFICATION** to locate the actual reconciliation logic, if any exists beyond this UI mock.

---

## Section 5 — Liability surface

For each scenario, what the code does today and what it does not do:

1. **Over-claim on an ineligible HS code (product not actually RoDTEP-eligible).**
   - Mitigation present: red "Not in schedule — do NOT file on this figure" badge and matching report language when no rate row exists (`MATCH_META.default`, `RoDTEPCalculator.tsx:68`; `MATCH_COPY.default`, `rodtep-report.ts:4`).
   - Gap: this same badge/logic is triggered identically whether the product is genuinely ineligible *or* simply missing from the incomplete rate table (chapters 61, 72, 25-27, etc. — Section 2). A user cannot tell these two cases apart from the UI.

2. **Claiming on a HS code missing from the table (data gap, not ineligibility).**
   - Mitigation: same red badge as above happens to also catch this case (fails safe, in the sense that it blocks filing) — but the accompanying "Notification 60/2025-26 revised rates apply" banner (triggered for any chapter ≥ 25) actively contradicts the "not in schedule" warning for the same HS code, since chapters 25/26/27/61/62/63/72/77 have no rate at all. This is a UI/logic inconsistency that could confuse a user about whether the code is covered.

3. **Rejected claim (ICEGATE rejects what the customer files).**
   - Mitigation: the app lets a user record a rejection with a free-text note (`handleStatus`, `RoDTEPCalculator.tsx:188-199`) and surfaces a "rejected — needs escalation" badge (line 300-304).
   - Gap: this is purely a manual log; the app has no way to learn from or flag *why* future similar claims might be rejected (no feedback loop into the rate/matching logic).

4. **Stale rate (DGFT revises Appendix 4R after the last manual extraction).**
   - Mitigation: none found — no scheduled job, cron, or re-sync mechanism exists in the reviewed code (`scripts/seed_rodtep.mjs` is a manual, developer-run script, not automated).
   - Gap: the UI never shows the customer *when* the rate table was last verified, so a customer has no way to know the data might be outdated.

5. **Missed exclusion — SEZ / Advance Authorization / EPCG / deemed exports.**
   - Mitigation: none found in the RoDTEP calculation path (Section 4).
   - Gap: a shipment made under AA/EPCG or from an SEZ unit, which is excluded from RoDTEP under the scheme rules (**NEEDS PROFESSIONAL VERIFICATION** of the exact current exclusion list), would still be counted as "unclaimed entitlement" by this tool with no warning.

6. **Bhutan/Nepal or other land-export nuances.**
   - Mitigation: none found.
   - Gap: the currency table and country field (`FX_TO_INR`, destination defaults to `'EU'` in `bulkImportShippingBills`, `api.ts:197`) suggest the tool was built around containerized/air export to the listed currencies and does not appear to model land-customs-station or non-standard export routes.

7. **FX/valuation drift (foreign-currency shipments).**
   - Mitigation: none — static table (Section 2).
   - Gap: material for any exporter invoicing in USD/EUR/GBP/AED, which is most exporters.

8. **Self-reported claim status treated as fact.**
   - Mitigation: none — status is whatever the user clicks, with no verification against ICEGATE.
   - Gap: dashboards/summaries built on "credited" totals (`RoDTEPCalculator.tsx:232`) could overstate recovered amounts if a user marks something "credited" prematurely or in error.

This section, taken as a whole, is the core of what the CA and lawyer need to opine on before the product is sold as something customers pay for and act on financially.

---

## Section 6 — Payment and terms

- **Payment provider:** Razorpay Payment Links. `razorpay-create-link` (`supabase/functions/razorpay-create-link/index.ts`) creates a link server-side using `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` secrets, authenticated by the logged-in Supabase user, and passes `company_id`, `plan`, and `user_id` as Razorpay "notes" metadata (lines 82-86).
- **Webhook:** `razorpay-webhook` (`supabase/functions/razorpay-webhook/index.ts`) verifies the Razorpay HMAC-SHA256 signature (lines 20-36) before trusting the payload — this is a correct, standard signature-verification pattern. On a `payment_link.paid` event it updates the customer's `companies.plan` column directly (lines 89-92). Any other event type is acknowledged and ignored (lines 67-71).
- **What the customer is charged for:** a recurring "plan" (`growth` or `enterprise` per `Upgrade.tsx`, or `Exporter`/`CA-Professional` per the landing page — **the two price lists disagree, see Section 1**). There is **no subscription/recurring-billing object created** — each "Payment Link" appears to be a one-time payment that flips the plan flag; **NEEDS PROFESSIONAL VERIFICATION**: how (or whether) monthly renewal billing actually recurs is not evidenced anywhere in this code. If Razorpay Payment Links (not Subscriptions) are used as shown, this looks like a single charge, not an auto-renewing subscription — worth confirming against actual Razorpay dashboard configuration.
- **Refunds/guarantees:** No refund logic, cancellation flow, or guarantee mechanism was found in any file reviewed. The UI text "Cancel anytime" (`Upgrade.tsx:160`) is not backed by any cancellation code path found in this repository — there is no downgrade/cancel button or Razorpay subscription-cancellation call.
- **GST invoicing:** "GST invoice provided" (`Upgrade.tsx:160`) — no invoice-generation code was found in the reviewed source; this may be a manual/Razorpay-native feature outside this repo, but it is not evidenced here. **NEEDS PROFESSIONAL VERIFICATION.**
- **Missing legal documents:** No Terms of Service, Privacy Policy, or Refund Policy page/document exists anywhere in the repository (confirmed by search across `src/`, `docs/`, `public/`). This is a hard gap that should be closed before the product charges customers — see Section 7.

---

## Section 7 — Open questions for the professionals

1. Can ComplianceOS legally publish an unqualified rupee figure ("Unclaimed RoDTEP: ₹X") on the dashboard without a disclaimer directly beside it, given the calculation depends on an incomplete, manually-extracted rate table (documented gap: 14 HS chapters entirely missing, including chapters used in the app's own example data)?
2. What specific disclaimer language must accompany every computed RoDTEP figure (dashboard, calculator, downloadable report) to be defensible — and should it be on-screen at the point of the number, not only in a page footer?
3. Is "We tell you exactly why [your refund is stuck]" (landing page hero) a defensible marketing claim given the underlying diagnostic logic could not be located/verified as fully automated end-to-end reconciliation with ICEGATE?
4. Does the company need a Data Processing Agreement with Anthropic, OpenAI, Climatiq, Zonos, and Meta (WhatsApp) before sending customer shipment/document data to them, under the DPDP Act? Which of these transfers require specific consent language at signup?
5. Given no Privacy Policy or Terms of Service currently exist in the product, what must be published before the first paid transaction, and does the current sign-up flow (`AuthModal`, `LandingPage.tsx:19-162`) need a consent checkbox referencing them?
6. Is charging ₹2,999/month (Upgrade screen) while the public landing page advertises ₹999/month for what appears to be the same feature set a consumer-protection or advertising issue, independent of which price is "correct"?
7. Is a Razorpay one-time Payment Link (as implemented) an adequate/compliant way to represent a recurring subscription with a "Cancel anytime" promise, or does this need Razorpay Subscriptions plus an actual in-app cancellation flow before that language can be used?
8. What retention period is legally required (or advisable) for customer shipping-bill data, HS codes, and FOB values, and should the product implement an explicit deletion/export mechanism (none exists today)?
9. Does self-reported claim status ("Filed"/"Credited"/"Rejected," entered by the user with no ICEGATE verification) create any risk if the company later reports aggregate "money recovered" figures to investors, partners, or in marketing, based on this unverified data?
10. What is the specific, current list of RoDTEP exclusions (SEZ, Advance Authorization, EPCG, deemed exports, and any others) that the product should be checking for and currently does not, and what liability exposure exists in the interim while this gap is unaddressed?
11. Should the 0.5% "not in schedule" placeholder rate be removed from the UI entirely (showing "no rate available" instead of a number) to avoid it being mistaken for a real entitlement, given it is not tied to any published rate?

---

*This document was generated by reading the ComplianceOS source code on 2026-09-21. It does not constitute legal, tax, or financial advice, and no statement above should be treated as a conclusion that any feature is compliant, accurate, or legally sound — that determination belongs to the reviewing CA and lawyer.*
