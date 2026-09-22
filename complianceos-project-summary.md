# ComplianceOS — Comprehensive Project Summary
**Generated:** May 2026
**Purpose:** Internal technical reference and client briefing document
**Audience:** Technical and business stakeholders

> **Honest framing:** This document distinguishes clearly between what is fully built and working, what is scaffolded but incomplete, and what is designed/planned. It is intended to give an accurate picture of where the product stands today.

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Complete Feature List](#2-complete-feature-list)
3. [Target Markets & Regulations Covered](#3-target-markets--regulations-covered)
4. [Product Categories Supported](#4-product-categories-supported)
5. [Tech Stack](#5-tech-stack)
6. [Data Sources](#6-data-sources)
7. [Risk Scoring Engine](#7-risk-scoring-engine)
8. [API Capabilities](#8-api-capabilities)
9. [UI Screens / User Experience](#9-ui-screens--user-experience)
10. [Competitive Differentiators](#10-competitive-differentiators)
11. [Known Limitations & TODOs](#11-known-limitations--todos)

---

## 1. Product Overview

**ComplianceOS** is an export compliance and risk management platform purpose-built for **Indian exporters and MSMEs** navigating complex international trade regulations.

The platform functions as a **"compliance co-pilot"** — it transforms dense regulatory requirements across 6+ destination markets into actionable risk scores, per-shipment compliance checklists, and deadline-tracking alerts. It simultaneously handles Indian export-side obligations (IEC, GST/LUT, FEMA, RBI reporting, DGFT schemes) and destination-country requirements (certifications, labeling, customs documentation, carbon reporting).

### Core Value Proposition

1. **Risk Clarity** — A 0–100 risk score for any product × destination × company size combination, with a full breakdown of contributing factors (CBAM exposure, ESG requirements, sanctions, certification burden, FTA eligibility).

2. **Actionable Checklists** — Dynamically generated, per-shipment compliance checklists that adapt to product-country combinations across 10 compliance categories. Not generic — the checklist for food going to the EU is different from steel going to UAE.

3. **Regulatory Alerts** — Proactive tracking of CBAM deadlines, FTA negotiations, policy changes, and new requirements with severity classification and days-remaining calculations.

4. **FTA Savings Calculator** — Calculates actual duty savings available under active trade agreements (India-UAE CEPA, India-Japan CEPA, India-Australia ECTA) for specific HS codes and shipment values.

5. **Label Compliance Validator** — Upload a product label image; AI vision (OpenAI) checks it against destination-country labeling rules. Also supports manual rule-by-rule validation.

6. **Pre-Shipment Compliance Gate** — Before a shipment is released, the system runs an automated gate check: HS code validation, FTA eligibility, Certificate of Origin requirement determination, Rules of Origin check, and checklist completion check.

7. **CBAM Report Generation** — Generates a quarterly CBAM report PDF summarizing EU-bound shipments for the EU Carbon Border Adjustment Mechanism transitional reporting obligation.

8. **Developer API** — Third-party freight forwarders and customs agents can integrate via API keys to access risk scoring, checklists, and HS code lookup programmatically.

### Who It's For

- **Primary**: Indian SME and MSME exporters in CBAM-exposed sectors (steel, chemicals, aluminium) or high-regulatory sectors (food, textiles, pharma, electronics)
- **Secondary**: Freight forwarders, customs house agents, and compliance consultants who manage exports on behalf of clients
- **Future**: Large enterprise exporters needing multi-user collaboration and audit trails

---

## 2. Complete Feature List

### Core Features (Fully Implemented)

---

#### 2.1 Risk Scoring Dashboard
- **What it does:** Calculates a 0–100 compliance risk score for the selected product-country-company combination. Displays per-country breakdowns with a circular gauge, color-coded severity (red/yellow/green), and a factor-by-factor explanation.
- **User problem solved:** Exporters don't know which markets are risky and why. This gives an instant, explainable risk picture.
- **Tier:** Free (limited markets) → PRO (all 6 markets)
- **Status:** **Fully built.** Frontend logic uses the risk scoring engine with real regulatory data. Per-country risk breakdown displayed in a 2-column grid, sorted highest-risk-first.

---

#### 2.2 Compliance Checklist Generator
- **What it does:** Generates a dynamic compliance checklist for any product × destination market combination. Items are categorized into 10 groups: Documentation, Trade Agreement, Certification, CBAM, ESG, Packaging, Labeling, Customs, Sanctions, and Indian Compliance. Each item has priority (critical/high/medium/low) and phase (per-shipment, annual, one-time, etc.).
- **User problem solved:** Exporters miss required documents and certifications, causing shipment delays and customs rejections.
- **Tier:** Free (basic) → PRO (full detail with CBAM/ESG items)
- **Status:** **Fully built.** Both frontend TypeScript and Python backend implementations exist with identical logic. Indian compliance items (IEC, AD Code, GST/LUT, FEMA, ECGC) are always present regardless of destination. Checklist phases: one-time, pre-production, pre-shipment, per-shipment, annual, quarterly. Priorities: critical, high, medium, low.

---

#### 2.3 Regulatory Alerts
- **What it does:** Surfaces regulatory changes, upcoming deadlines, FTA negotiation updates, and CBAM key dates as alerts. Alerts are classified critical/warning/info and sorted by severity. Shows days remaining until deadlines. Filterable by severity.
- **User problem solved:** Regulations change constantly. Exporters miss CBAM reporting deadlines, FTA rule changes, and new certification requirements.
- **Tier:** Free (limited) → PRO (real-time, all markets)
- **Status:** **Core logic fully built.** The frontend alert generator processes regulatory data from the static database. A dedicated `fetch-regulatory-feeds` edge function scrapes live RSS/Atom feeds from EU Customs, US CBP, and UK HMRC and writes to the `regulatory_changes` table. The frontend falls back to 5 real seed alerts (CBAM levy active, Notification 60, EUDR, UFLPA, India-UAE CEPA) when the table is empty. pg_cron scheduling must be manually enabled in the Supabase dashboard to run the scraper every 6 hours.

---

#### 2.4 FTA Schemes & Savings Calculator
- **What it does:** Shows FTA status for all 6 markets (Active/Under Negotiation/No FTA). For active FTAs (UAE CEPA, Japan CEPA, Australia ECTA), calculates exact duty savings for a given HS code and shipment value. Displays MFN rate vs. preferential rate, potential savings in INR, and applicable Rules of Origin.
- **User problem solved:** Most Indian SMEs don't claim FTA benefits they're entitled to, overpaying customs duty.
- **Tier:** PRO only (savings calculation)
- **Status:** **Fully built** for the 10 HS codes seeded from trade.gov.in. Backend calculator works with the database. Frontend displays FTA status and Indian export schemes (RoDTEP, PLI, EPCG, Advance Authorization, etc.). HS code coverage is limited — see limitations.

---

#### 2.5 Shipment Tracker
- **What it does:** CRUD shipment management with integrated compliance workflow. Create shipments with name, product, destination, date, HS code, and shipment value. Each shipment gets its own risk score. Statuses: pending → preparing → in_progress → in_transit → delivered. The shipment detail panel integrates: (1) Pre-shipment gate check, (2) Certificate of Origin PDF download, (3) Zonos HS code classification from product description, (4) Zonos landed cost calculator, (5) Document OCR for invoice upload, (6) Customs filing (ICEGATE, mocked), (7) TReDS trade financing (mocked).
- **User problem solved:** Exporters manage compliance per-shipment across spreadsheets. This gives a single tracking view with all compliance actions in one place.
- **Tier:** Free (3 shipments) → Growth (unlimited)
- **Status:** **Fully built.** Backend has full CRUD API at `/api/v1/shipments`. Supabase persists data with Row Level Security (company isolation). The Shipments view is the most feature-rich screen in the application, integrating 7 different API calls.

---

#### 2.6 Label Validator
- **What it does:** Two modes: (1) **Manual checklist** — rule-by-rule questionnaire for the selected product × country combination (e.g., "Is the Arabic translation present?"). Grouped by category with pass/fail tracking and a compliance score. (2) **AI Vision scan** — upload a label image (PNG/JPG) and have OpenAI Vision analyze it against the applicable rules.
- **User problem solved:** Labels are one of the most common reasons for customs rejection. Exporters have no easy way to pre-validate labels against destination requirements.
- **Tier:** Manual mode → Free. AI scan → PRO.
- **Status:** **Manual checklist: Fully built** with a complete label rules database and validation engine. **AI Vision mode: Built but conditional** — uses OpenAI Vision API if `OPENAI_API_KEY` is configured. Falls back to simulated results (with mock pass/fail) if no API key is present. The mock results demonstrate the UI flow but are not real analysis.

---

#### 2.7 CBAM Readiness (Supply Chain Data Collection)
- **What it does:** Collects Scope 3 emissions data from upstream vendors for CBAM reporting. Sends a WhatsApp template message to vendor phone numbers requesting their emissions data. Displays the current CBAM phase, what's required, and the 2026 financial adjustment deadline.
- **User problem solved:** CBAM requires exporters to know the embedded carbon content of their goods, which means getting data from their suppliers — a major operational challenge.
- **Tier:** PRO
- **Status:** **UI fully built.** The WhatsApp integration (`whatsapp-vendor-outreach` edge function) is **MOCKED** — it simulates sending a message and returns a success response, but no actual WhatsApp API calls are made. The UI now honestly labels this as a preview: button reads "📱 Preview Request", toast says "Request preview generated — WhatsApp Business API integration required to send live messages", and the template is shown in a yellow notice box. Real implementation requires Meta Business Platform credentials and a registered WhatsApp template. See limitations.

---

#### 2.8 Pre-Shipment Compliance Gate
- **What it does:** Automated gate check before a shipment is released. Runs 5 checks simultaneously: (1) HS code validation, (2) FTA eligibility + potential savings, (3) Certificate of Origin requirement and issuing authority, (4) Rules of Origin applicability, (5) Checklist completion percentage and critical pending items. Returns gate status: `approved` or `blocked` with specific blocking reasons.
- **User problem solved:** Shipments get sent without critical compliance steps completed, leading to delays, fines, and rejections.
- **Tier:** PRO
- **Status:** **Fully built** in backend (`/api/v1/shipments/{id}/gate-check`). Persists results in `compliance_gates` table. Updates shipment `gate_status`. Blocking logic: invalid HS code or any critical checklist items pending = blocked.

---

#### 2.9 Certificate of Origin PDF Generator
- **What it does:** Generates a PDF Certificate of Origin for a shipment, pre-filled with product, HS code, destination, FTA agreement name, Rules of Origin criteria, and exporter details.
- **User problem solved:** CoO generation is time-consuming and error-prone when done manually.
- **Tier:** PRO
- **Status:** **Fully built** in backend (`/api/v1/shipments/{id}/coo-pdf`). Uses ReportLab for PDF generation. Returns as streaming download. **Important caveat:** This generates a formatted document — it does not submit to or integrate with any CoO-issuing authority (EEPC, APEDA, TEXPROCIL, etc.). The exporter must present this to the relevant authority.

---

#### 2.10 CBAM Quarterly Report PDF
- **What it does:** Generates a quarterly CBAM report PDF summarizing all EU-bound shipments with CBAM-relevant HS codes. Includes company details, shipment table, compliance notes, and a disclaimer. Covers sectors: Iron & Steel (HS 72-73), Aluminium (HS 76), Cement (HS 2523), Fertilisers (HS 31), Electricity (HS 2716), Hydrogen (HS 2804).
- **User problem solved:** CBAM transitional phase requires quarterly reporting — exporters need documentation to support their EU importer's CBAM declarations.
- **Tier:** Growth/Enterprise
- **Status:** **Fully built** in backend (`/api/v1/cbam/report-pdf`). Fetches real shipment data from the database, filters by EU destination and CBAM-covered HS codes, generates PDF with ReportLab. **Important caveat:** Report must be submitted by the EU importer via the EU CBAM Transitional Registry — this tool generates the supporting documentation, not the official filing.

---

#### 2.11 API Key Management
- **What it does:** Companies can generate named API keys (e.g., "Production Key", "Forwarder Integration") with configurable permissions and rate limits. Keys are stored as bcrypt hashes. Usage tracked. Keys can be revoked.
- **User problem solved:** Freight forwarders and customs agents need programmatic access without sharing user credentials.
- **Tier:** Growth (1000 req/day) → Enterprise (10,000 req/day)
- **Status:** **Fully built.** Full CRUD at `/api/v1/api-keys`. Rate limiter implemented (in-memory, 24-hour rolling window — see limitations).

---

#### 2.12 Audit Log
- **What it does:** Every mutating action (shipment create/update, checklist toggle, settings change, gate check run) is logged with user ID, company ID, action type, entity, and timestamp. Retained per plan tier.
- **User problem solved:** Enterprise clients need audit trails for compliance review and internal accountability.
- **Tier:** Growth (30-day retention) → Enterprise (unlimited)
- **Status:** **Fully built.** AuditLogMiddleware in FastAPI intercepts POST/PATCH/DELETE. RLS-protected `audit_log` table in Supabase.

---

#### 2.13 Settings / Configuration
- **What it does:** Allows users to update company profile (name, size, IEC), change selected product category, and manage target export markets. Settings persist to Supabase `user_settings` table.
- **Status:** **Fully built.**

---

---

#### 2.13b RoDTEP Recovery Calculator
- **What it does:** Calculates claimable RoDTEP rebates for a given HS code and shipment value using Notification 60 (Feb 2026) revised rates covering Chapter 25+. Generates a PDF summary report.
- **User problem solved:** Most exporters leave RoDTEP refunds unclaimed because calculating the correct rate per HS code is opaque. This surfaces the exact rate and INR value.
- **Tier:** PRO
- **Status:** **Fully built.** Frontend calculator + PDF generation. Notification 60 rates seeded from `docs/rodtep_rates_extracted.json`.

---

#### 2.13c CBAM Public Exposure Checker
- **What it does:** No-login required. Any visitor can enter a product category and see whether their goods fall under EU CBAM scope, applicable HS chapters, levy status, and what documentation is required.
- **User problem solved:** Awareness and lead generation — exporters don't know if CBAM affects them without first signing up.
- **Tier:** Free / Public (no auth required)
- **Status:** **Fully built.** Publicly accessible route, no Supabase auth required.

---

#### 2.13d Sanctions Screening
- **What it does:** Screens counterparty names and countries against the OFAC SDN (Specially Designated Nationals) list. Returns match status and any matching entries.
- **User problem solved:** US-bound and UK-bound exporters must screen buyers against sanctions lists or face serious penalties.
- **Tier:** PRO
- **Status:** **Fully built.** `sanctions-check` edge function. SDN list seeded from `docs/sdn.csv` via `scripts/seed_sanctions.mjs`. Alt names from `docs/alt.csv`.

---

#### 2.13e Underwriting Signal API
- **What it does:** API-key-authenticated endpoint returning a structured compliance signal: overall score (0–100), gate status, FTA eligibility, CBAM scope, sanctions screening result. Designed for freight forwarders, trade finance platforms, and InsurTech to embed ComplianceOS risk data.
- **Tier:** Enterprise API
- **Status:** **Fully built** (`supabase/functions/underwriting-signal/index.ts`). Zero partner documentation written. No go-to-market path yet.

---

### Built and Wired to UI (Requires API Keys or Contains Mocked Responses)

#### 2.14 Emissions Calculator (Climatiq Integration)
- **What it does:** Calculate product-specific carbon footprint (kg CO2e per tonne) using the Climatiq API, mapped to product categories via activity IDs (e.g., `steel-type_steel_product_hot_rolled_coil`). Data source: BEIS, year: 2023.
- **Status:** **Built and wired to UI.** The "Estimate Emissions" button is present in the Risk Analysis view for each CBAM-active country. The edge function calls the real Climatiq API (`api.climatiq.io/estimate`) when `CLIMATIQ_API_KEY` is configured in Supabase secrets. If the API call fails, a mock fallback is used (co2e: 2154.5 kg / 2.15 tCO2e, activity: `steel-type_steel_product_hot_rolled_coil (simulated fallback)`).

#### 2.15 Zonos HS Classification
- **What it does:** Auto-classify a product by natural language description into its HS code using Zonos GraphQL API (`classificationsCalculate` mutation). Country of origin hardcoded to `IN`.
- **Status:** **Built and wired to Shipments UI.** The "New Shipment" form calls `zonos-classify` to suggest an HS code from the product description. Requires `ZONOS_API_KEY`. Falls back to `'9999.99'` if no confident match.

#### 2.16 Zonos Landed Cost
- **What it does:** Calculate total landed cost (duties, taxes, fees) for a shipment to a destination using Zonos GraphQL API (`landedCostCalculate` mutation).
- **Status:** **Built and wired to Shipments UI.** The shipment detail panel has a "Calculate Landed Cost" button that calls `zonos-landed-cost`. Returns `total_duties`, `total_taxes`, `total_fees`, and `grand_total`. Requires `ZONOS_API_KEY`.

#### 2.17 TReDS Trade Financing
- **What it does:** Submit invoices to TReDS platforms (RXIL/Invoicemart) for receivables financing — allowing exporters to get paid before the buyer pays. Returns a Factoring Unit (FU) ID for tracking.
- **Status:** **Built and wired to Shipments UI, but MOCKED.** The UI is now honestly labelled: heading reads "💸 Prepare TReDS Financing Request", button reads "📋 Generate TReDS Request", badge shows "📋 Request Ready", and the reference ID is shown as "Ref: xxx · Submit via RXIL / Invoicemart". Toast message: "TReDS request prepared — submit this reference via your bank's RXIL or Invoicemart portal." No actual RXIL or Invoicemart API call is made. Real implementation requires `RXIL_API_KEY` or `INVOICEMART_API_KEY`. Simulated delay: 1500ms.

#### 2.18 Document OCR
- **What it does:** Extract structured data (product, HS code, value, country, weight) from uploaded invoice PDFs or images for automated shipment data entry.
- **Status:** **Built and wired to Shipments UI, but MOCKED.** The "Upload Invoice" drop zone in the new shipment form calls `document-ocr`. The edge function always returns hardcoded extracted data: `product='machinery', hsCode='841480', value=12500, country='EU', weight=450`. No real AWS Textract or Parseur API call is made. Real implementation requires `AWS_TEXTRACT_KEY` or `PARSEUR_API_KEY`. Simulated delay: 2500ms.

#### 2.19 Customs Filing
- **What it does:** Generate and submit a shipping bill to ICEGATE (Indian customs) for customs clearance.
- **Status:** **Built and wired to Shipments UI, but MOCKED.** The "File with Customs (ICEGATE)" button calls `customs-filing`. The edge function generates a test-mode ICEGATE shipping bill payload (`MessageType: 'F_IND_RES'`, `Indicator: 'T'` for test). Returns a reference number in the format `SB-{year}-{6-digit-random}`. Fetches the company's IEC code from `company_profiles` table. No actual submission to ICEGATE. Simulated delay: 1500ms.

### Planned / Designed but Not Implemented

#### 2.20 Billing / Monetization (Razorpay)
- **What it does (planned):** Subscription management with Razorpay. Plan tiers: Free, Growth (₹9,999/mo), Enterprise (₹50,000/mo). Feature gating based on plan.
- **Status:** **Schema designed** (`companies.plan` column exists). Router file not created. Not implemented.

#### 2.21 Email Notifications
- **What it does (planned):** Critical alert emails, weekly digest, CBAM deadline reminders at 90/60/30 days.
- **Status:** **Planned** (mentioned in PLAN.md). Not implemented.

#### 2.22 CSV/Excel Export
- **What it does (planned):** Export checklists and shipment data to CSV or Excel.
- **Status:** **Planned** (mentioned in PLAN.md). Not implemented.

#### 2.23 Pricing Page
- **What it does (planned):** Public-facing pricing comparison with Razorpay checkout.
- **Status:** **Planned** (`src/components/views/Pricing.tsx` referenced but not created).

---

## 3. Target Markets & Regulations Covered

### Destination Markets (6)

| Market | FTA Status | CBAM Status | Key Regulations |
|--------|-----------|-------------|-----------------|
| 🇪🇺 European Union | Under Negotiation (Round 7+) | **Active** (transitional) | CBAM, EUDR, REACH, CSRD, CSDDD, CE Marking, Single-Use Plastics, EPR |
| 🇺🇸 United States | No FTA (GSP partial) | Proposed (not enacted) | UFLPA, FDA FSMA, SEC Climate Disclosure, TSCA, OFAC, Entity List, ISF 10+2 |
| 🇬🇧 United Kingdom | Under Negotiation (Round 14+) | **Active** (effective Jan 2027) | UK CBAM, UK REACH, UKCA Mark, TCFD, OFSI |
| 🇦🇪 UAE | **Active — India-UAE CEPA** (May 2022) | None | ECAS, Halal certification, Arabic labeling, ESMA |
| 🇯🇵 Japan | **Active — India-Japan CEPA + RCEP** (Aug 2011) | GX League (voluntary) | JIS, PSE Mark, JAS, CSCL, Food Sanitation Act, Radioactivity Certificate |
| 🇦🇺 Australia | **Active — India-Australia ECTA** (Dec 2022) | Consultation phase | RCM Mark, DAFF permits, AICIS, Scope 3 mandatory reporting |

### Regulations Tracked and Covered

#### EU Regulations
- **CBAM** (Carbon Border Adjustment Mechanism) — Fully covered. Tracks transitional phase, quarterly reporting obligations, covered sectors, penalty rates (€50–100/tonne), key dates (2026 financial adjustments, 2034 full implementation)
- **EUDR** (EU Deforestation Regulation) — Enforcement risk tracked. Applies to food and textiles exports
- **REACH** — Chemicals/textiles certification requirements
- **CSRD** (Corporate Sustainability Reporting Directive) — ESG disclosure risk factor
- **CSDDD** (Corporate Sustainability Due Diligence Directive) — Supply chain due diligence
- **RoHS**, **WEEE**, **EU Energy Label** — Electronics requirements
- **EU Packaging & Packaging Waste Directive**, **EPR**, **Single-Use Plastics Directive** — Packaging
- **EU Organic**, **HACCP**, **BRC Global Standard** — Food safety
- **Digital Product Passport** — Tracked (batteries, future expansion)

#### US Regulations
- **UFLPA** (Uyghur Forced Labor Prevention Act) — Supply chain risk factor for all US exports
- **FDA FSMA** (Food Safety Modernization Act) — Food certification requirements
- **TSCA** (Toxic Substances Control Act) — Chemicals
- **OFAC** compliance + Entity List screening — Sanctions risk factor
- **Section 301 tariffs** — Tracked as competitive landscape alert
- **SEC Climate Disclosure Rule** / **California SB 253/261** — ESG risk factor
- **EAR** (Export Administration Regulations) — Dual-use goods

#### UK Regulations
- **UK CBAM** — Effective January 2027, sectors: steel, iron, aluminium, cement, fertilizers, ceramics, glass, hydrogen
- **UK REACH** — Chemicals/textiles
- **UKCA Mark** — Replacement for CE marking
- **TCFD** (Task Force on Climate-related Financial Disclosures) — ESG reporting
- **UK Sustainability Disclosure Standards** — ESG

#### Indian Export Regulations (Always Applied)
- **IEC** (Import Export Code) — Mandatory
- **AD Code** registration with bank
- **GST/LUT** (Letter of Undertaking) — Zero-rated exports
- **FEMA** compliance — Foreign Exchange Management Act
- **RBI** reporting requirements
- **ECGC** — Export Credit Guarantee Corporation

#### Indian Export Schemes (Reference Data)
| Scheme | Description | Status |
|--------|-------------|--------|
| RoDTEP | Remission of Duties and Taxes on Exported Products | Active |
| PLI Scheme | Production Linked Incentive | Sector-specific |
| MEIS/RoSCTL | Merchandise Exports / Rebate of State and Central Taxes | Check current rates |
| Advance Authorization | Duty-free import of inputs for export production | Active |
| EPCG | Export Promotion Capital Goods at zero/reduced duty | Active |
| SEZ/EOU | Special Economic Zone / Export Oriented Unit | Active |
| ECGC Insurance | Export Credit Guarantee | Active |
| Market Access Initiative | Financial assistance for export promotion | Active |

#### FTA-Specific Trade Agreements
- **India-UAE CEPA** (Comprehensive Economic Partnership Agreement) — Active since May 2022, covers 90%+ tariff lines, Certificate of Origin required
- **India-Japan CEPA + RCEP** — Active since Aug 2011 + RCEP Phase 3 reductions in Nov 2024
- **India-Australia ECTA** (Early Harvest Trade Agreement) — Active since Dec 2022, 85% tariff lines, CECA under negotiation
- **India-EU FTA** — Under negotiation (Round 7+)
- **India-UK FTA** — Under negotiation (Round 14+, expected 2025)

---

## 4. Product Categories Supported

| Category ID | Label | HS Code Chapters | CBAM Covered (EU) |
|-------------|-------|------------------|-------------------|
| `steel` | Steel & Iron Products | 72–73 | Yes |
| `chemicals` | Chemicals & Fertilizers | 28–38 | Yes |
| `textiles` | Textiles & Apparel | 50–63 | No |
| `electronics` | Electronics & Electricals | 84–85 | No |
| `food` | Food & Agriculture | 01–24 | No |
| `pharma` | Pharmaceuticals | 30 | No |
| `automotive` | Automotive & Parts | 87 | No |
| `machinery` | Machinery & Equipment | 84 | No |
| `general` | Other / General | — | No |

**Total: 9 product categories**

### HS Code Coverage in FTA Database

10 specific HS codes are seeded from trade.gov.in (UAE CEPA data):

| HS Code | Product | MFN Rate | CEPA Rate | RoO |
|---------|---------|----------|-----------|-----|
| 7208 | Flat-rolled steel products | 5% | 3% | CTH + 40% VA |
| 6109 | T-shirts, vests | 5% | 0% | CTH + 40% VA |
| 6203 | Men's suits, jackets | 5% | 0% | CTH + 40% VA |
| 2922 | Amino-compounds (chemicals) | 5% | 1% | CTSH + 40% VA |
| 8471 | Computers | 0% | 0% | CTH + 40% VA |
| 8517 | Smartphones, telecom equipment | 0% | 0% | CTH + 40% VA |
| 7113 | Jewellery | 5% | 0% | CTH + 40% VA |
| 0306 | Crustaceans (Shrimp/Prawns) | 0% | 0% | Wholly Obtained |
| 1006 | Rice | 0% | 0% | Wholly Obtained |
| 0902 | Tea | 0% | 0% | CTSH + 40% VA |

> **Note:** The scraper infrastructure is designed to expand this to 200+ HS codes across UAE, Japan, and Australia. The expansion has not yet been executed.

---

## 5. Tech Stack

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 19.2.0 |
| Language | TypeScript | 5.9.3 |
| Build Tool | Vite | 7.x |
| Styling | Inline CSS with design tokens (no CSS framework) | — |
| State Management | React `useState` + `useMemo` | — |
| Database Client | Supabase JS | 2.95.3 |
| Testing | Vitest + React Testing Library + jsdom | 3.x |
| Test Count | **586 tests, all passing** | — |
| Deployment Target | Vercel (planned) | — |

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Python FastAPI | 0.115.0 |
| Server | Uvicorn (async ASGI) | 0.34.0 |
| Database Client | Supabase Python | ≥2.28.0 |
| Data Validation | Pydantic v2 | ≥2.10.0 |
| PDF Generation | ReportLab | 4.2.5 |
| Web Scraping | BeautifulSoup4 + Playwright | 4.12.3 / 1.49.0 |
| HTTP Client | httpx (async) | 0.28.0 |
| Scheduling | APScheduler | 3.11.0 |
| Auth/Crypto | python-jose + bcrypt | 3.3.0 / 4.2.0 |
| Testing | pytest + pytest-asyncio | 8.3.4 |
| Deployment Target | Railway | — |

### Database & Infrastructure
| Component | Technology | Notes |
|-----------|-----------|-------|
| Database | PostgreSQL via Supabase | 17 tables, full schema defined |
| Auth | Supabase Auth | Email/password + Google OAuth planned |
| Row Level Security | PostgreSQL RLS | Per-company data isolation |
| Realtime | Supabase Realtime | Planned for live alert push |
| Storage | Supabase Storage | For PDFs and documents |
| Edge Functions | Deno TypeScript (Supabase) | 9 functions deployed |

### Supabase Edge Functions (12)
| Function | Integration | Status | Env Var Required |
|----------|------------|--------|-----------------|
| `climatiq-emissions` | Climatiq API (`api.climatiq.io/estimate`) | **REAL** — calls live API | `CLIMATIQ_API_KEY` ✅ configured |
| `zonos-classify` | Zonos GraphQL API (`classificationsCalculate`) | **REAL** — calls live API | `ZONOS_API_KEY` ✅ configured |
| `zonos-landed-cost` | Zonos GraphQL API (`landedCostCalculate`) | **REAL** — calls live API | `ZONOS_API_KEY` ✅ configured |
| `label-vision` | OpenAI Vision API (GPT-4o) | **REAL** with mock fallback | `OPENAI_API_KEY` ✅ configured |
| `fetch-regulatory-feeds` | EU Customs / US CBP / UK HMRC RSS | **REAL** — live RSS scraper; writes to `regulatory_changes` table | `NEWS_API_KEY`, `NEWS_DATA_KEY` ✅ configured |
| `sanctions-check` | OFAC SDN list | **REAL** — screens company/individual against sanctions list | None (SDN data seeded) |
| `underwriting-signal` | Internal scoring + DB | **REAL** — API-key-authenticated; returns compliance score, FTA eligibility, CBAM scope, sanctions status | API key auth |
| `regulatory-alerts` | Internal logic + `regulatory_changes` table | **Partial** — reads live DB rows when available, 5 hardcoded seed alerts as fallback | None |
| `whatsapp-vendor-outreach` | Meta WhatsApp Business API | **MOCKED** — 800ms simulated delay; UI shows "Preview Request" | `META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID` (not configured) |
| `treds-financing` | TReDS (RXIL / Invoicemart) | **MOCKED** — 1500ms simulated delay, returns `FU-{random}`; UI labelled as "Prepare Request" | `RXIL_API_KEY` or `INVOICEMART_API_KEY` (not configured) |
| `customs-filing` | ICEGATE | **MOCKED** — test-mode payload (`Indicator: 'T'`), 1500ms delay | ICEGATE credentials (not configured) |
| `document-ocr` | AWS Textract / Parseur | **MOCKED** — hardcoded return (`hsCode: '841480'`), 2500ms delay | `AWS_TEXTRACT_KEY` or `PARSEUR_API_KEY` (not configured) |

### Design System
- **Primary color:** `#FA8112` (orange)
- **Background:** `#FAF3E1` (cream)
- **Surface:** `#F5E7C6` (tan)
- **Text:** `#222222` (charcoal)
- Custom design tokens in `src/theme/index.ts` and `src/styles/colors.ts`

---

## 6. Data Sources

### Currently Active (Seeded / Static)
| Source | Data Type | Method | Status |
|--------|-----------|--------|--------|
| **Built-in regulatory database** | 6 country profiles with CBAM/ESG/certification/packaging/labeling/customs/sanctions data | Hardcoded TypeScript (migrated to Supabase) | **Active — manually curated** |
| **trade.gov.in / Trade Connect** | FTA tariff rates (MFN + preferential) for 10 HS codes under India-UAE CEPA | Python scraper (`scrape_trade_connect.py`) | **10 HS codes seeded** |
| **Built-in FTA database** | FTA status for 6 countries (name, status, effective date, preferential tariff, notes) | Hardcoded TypeScript | **Active** |
| **Built-in Indian schemes** | 8 Indian export schemes (RoDTEP, PLI, EPCG, etc.) | Hardcoded TypeScript | **Active** |

### Scrapers Built (Not Yet Scheduled / Running)
| Source | Data Type | Scraper File | Status |
|--------|-----------|--------------|--------|
| **DGFT India** | Trade notices, public notices, notifications, policy circulars from dgft.gov.in | `backend/app/scrapers/dgft_scraper.py` | **Built, not scheduled** |
| **EU Commission CBAM** | CBAM updates, EUR-Lex RSS feed, CBAM registry changes | `backend/app/scrapers/eu_cbam.py` | **Built, not scheduled** |
| **UK gov.uk** | UK CBAM updates, UKCA marking announcements | Referenced in `scheduler.py` | **Planned** |
| **trade.gov.in (expanded)** | 200+ HS codes across UAE, Japan, Australia | `backend/app/scrapers/trade_connect.py` | **Built, not expanded yet** |

### Planned Data Sources (Designed, Not Built)
| Source | Data Type | Notes |
|--------|-----------|-------|
| **ITC-HS / CBIC** | Full ITC-HS code database (6000+ codes) | Bulk import from CBIC or UN COMTRADE |
| **EU CBAM Transitional Registry** | Real-time CBAM certificate and rate data | API integration not implemented |
| **LexisNexis / NewsCatcher** | Live regulatory news | Referenced in edge function comments |
| **ICEGATE** | Shipping bill data for TReDS integration | Mentioned in TReDS edge function |

---

## 7. Risk Scoring Engine

The risk scoring algorithm is implemented in both TypeScript (`src/utils/risk-scoring.ts`) and Python (`backend/app/services/risk_engine.py`) with identical weights and logic. The Python version reads from Supabase; the TypeScript version reads from static data files.

### Input Parameters
- `product`: One of 9 category IDs (steel, food, textiles, etc.)
- `country`: One of 6 country codes (EU, US, UK, UAE, Japan, Australia)
- `companyProfile.size`: micro | small | medium | large

### Output
```typescript
{
  score: number,          // 0-100 (clamped)
  level: 'high' | 'medium' | 'low',
  factors: RiskFactor[],  // Each with category, severity, detail
  recommendations: string[]
}
```

### Scoring Weights

| Factor | Condition | Score Impact |
|--------|-----------|-------------|
| **CBAM — Covered product** | Country has active CBAM + product is in covered sectors | **+30** |
| **CBAM — Not covered** | Country has active CBAM + product not in scope | +5 |
| **ESG — Scope 3 Required** | `esg.scope3Required = true` (EU, Australia) | **+15** |
| **ESG — CSRD or SEC Climate** | `esg.csrd = true` or `esg.secClimate = true` (EU, US) | +10 |
| **Certifications — High burden** | More than 5 certs required for product+country | +15 |
| **Certifications — Medium burden** | 3–5 certs required | +8 |
| **Certifications — Low burden** | 1–2 certs required | +3 |
| **Sanctions screening** | Destination has sanctions requirements (US, UK) | +10 |
| **Complex packaging** | More than 2 packaging regulations | +8 |
| **FTA Active (positive)** | Country has active preferential tariff | **−5** |
| **FTA Under Negotiation** | FTA in progress (EU, UK) | +5 |
| **MSME Capacity** | Company size is micro or small | +10 |
| **EUDR** | EU destination + food or textiles product | +10 |
| **UFLPA** | US destination (any product) | +5 |

### Risk Level Classification
- **High risk:** Score ≥ 60
- **Medium risk:** Score 30–59
- **Low risk:** Score < 30

### Example Scores
- Steel → EU (small company): CBAM (+30) + Scope3 (+15) + CSRD (+10) + Certs 3 (+8) + Packaging (+8) + FTA Negotiating (+5) + MSME (+10) = **86 → HIGH**
- Textiles → UAE (medium company): Certs 2 (+3) + EUDR (no) + FTA Active (−5) = **−2 → clamped to 0 → LOW**
- Food → US (small company): ESG SEC (+10) + Certs 6 (+15) + Sanctions (+10) + Packaging (+8) + UFLPA (+5) + MSME (+10) = **58 → MEDIUM**

### Multi-Country Risk
`calculateMultiCountryRisk()` runs the engine for all selected countries and returns results sorted highest-risk-first. `getOverallRisk()` averages scores across countries for a portfolio-level view.

---

## 8. API Capabilities

### Authentication Methods

**1. Bearer Token (Supabase JWT)** — For authenticated app users
```
Authorization: Bearer <supabase_jwt>
```

**2. API Key (X-API-Key)** — For third-party integrators
```
X-API-Key: cos_live_xxxxxxxxxxxx
```
API keys are stored as bcrypt hashes. Keys have configurable `rate_limit` (requests/day) and `permissions` fields.

### API Endpoints

All endpoints return a standard FastAPI response with auto-generated OpenAPI documentation at `/docs` and `/redoc`.

#### Public API (API Key Auth) — `/api/v1/public/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/public/risk-score` | Calculate risk score |
| POST | `/api/v1/public/checklist` | Generate compliance checklist |
| GET | `/api/v1/public/hs-lookup/{hs_code}` | HS code tariff lookup |

#### Risk (`/api/v1/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/risk-score` | Calculate risk score (JWT auth) |

#### Checklist

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/checklist` | Generate checklist (JWT auth) |

#### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/alerts` | Get alerts for product+countries |

#### FTA

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/fta-savings` | Calculate FTA duty savings |
| GET | `/api/v1/hs-lookup` | HS code information |

#### Shipments (CRUD)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/shipments` | List company shipments |
| POST | `/api/v1/shipments` | Create shipment |
| GET | `/api/v1/shipments/{id}` | Get shipment details |
| PATCH | `/api/v1/shipments/{id}` | Update shipment |
| DELETE | `/api/v1/shipments/{id}` | Delete shipment |

#### Compliance Gate

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/shipments/{id}/gate-check` | Run pre-shipment gate check |
| GET | `/api/v1/shipments/{id}/gate-check` | Get cached gate check result |
| GET | `/api/v1/shipments/{id}/coo-pdf` | Download Certificate of Origin PDF |
| POST | `/api/v1/hs-validate` | Validate an HS code |

#### CBAM

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/cbam/report-pdf?quarter=2025-Q1` | Generate CBAM quarterly report PDF |

#### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/api-keys` | List company's API keys |
| POST | `/api/v1/api-keys` | Create new API key |
| DELETE | `/api/v1/api-keys/{id}` | Revoke API key |

#### Admin (`/internal/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/internal/scrape` | Trigger data scraping (cron-triggered) |

### Rate Limiting
- **Free tier:** Not applicable (no API key access)
- **Growth tier:** 1,000 requests/day per company
- **Enterprise tier:** 10,000 requests/day per company
- **Implementation note:** Rate limiter is in-memory (resets on server restart). Not Redis-backed — not suitable for multi-instance deployments in current form.

---

## 9. UI Screens / User Experience

### Screen 1: Login Page
- **Status:** Fully built (screenshot: `docs/screenshots/01_login.png`)
- Email/password login form
- "Don't have an account? Sign up" link
- ComplianceOS branding with orange/cream theme

### Screen 2: Sign Up Page
- **Status:** Fully built (screenshot: `docs/screenshots/02_signup.png`)
- Name, email, password registration
- Automatically creates company record and default settings on first signup (via Supabase trigger)

### Screen 3: Dashboard
- **Status:** Fully built (screenshot: `docs/screenshots/03_dashboard.png`)
- Overview cards: Overall Risk Score (with gauge), Active Alerts count, Selected Markets
- Quick Actions: Generate Report, View Checklists, Download CBAM Report
- Recent Alerts section (last 3 critical/warning alerts)
- Sidebar navigation: Dashboard, Risk Analysis, Checklists, Alerts, FTA & Schemes, Shipments, Label Validator, Settings

### Screen 4: Risk Analysis
- **Status:** Fully built (screenshot: `docs/screenshots/04_risk_analysis.png`)
- Per-country risk breakdown: each market has a circular gauge, risk level badge, and score
- Factor-by-factor explanation (e.g., "CBAM: HIGH — Product falls under EU CBAM scope")
- Color-coded severity: red (high), yellow (medium), green (low/positive)
- Recommendations section (actionable steps per factor)
- Countries sorted highest-risk-first

### Screen 5: Compliance Checklist
- **Status:** Fully built (screenshot: `docs/screenshots/05_checklist.png`)
- Tab per selected country
- Progress bar (X of Y items completed)
- Items grouped by category: Documentation, Trade Agreement, Certification, CBAM, ESG, Packaging, Labeling, Customs, Sanctions, Indian Compliance
- Each item has priority badge (critical/high/medium/low) and phase badge
- Checkbox state persists across navigation and sessions

### Screen 6: Regulatory Alerts
- **Status:** Fully built (screenshot: `docs/screenshots/06_alerts.png`)
- Severity filter buttons: All | Critical | Warning | Info (with count badges)
- Alert cards with country flag, date, and message
- Color-coded left border: red (critical), yellow (warning), blue (info)
- Days remaining calculated dynamically for deadline alerts

### Screen 7: FTA Schemes
- **Status:** Fully built (screenshot: `docs/screenshots/07_fta_schemes.png`)
- FTA status cards for all 6 markets: Active / Under Negotiation / No FTA
- Active FTAs show effective date and HS code savings table
- Indian Export Schemes section: 8 schemes with descriptions and status
- Savings calculator: enter HS code and shipment value to calculate potential duty savings

### Screen 8: Shipments
- **Status:** Fully built (screenshot: `docs/screenshots/08_shipments.png`)
- List of shipments with product, destination, date, status badge, and risk score
- Status workflow: Pending → Preparing → In Progress → In Transit → Delivered
- "New Shipment" form: name, product, destination, date, HS code, shipment value, notes
- Click shipment → detail view with gate check status and checklist progress

### Screen 9: Label Validator
- **Status:** Fully built — Manual mode. AI mode built, requires API key (screenshot: `docs/screenshots/09_label_validator.png`)
- Product × Country selector tabs
- Rule checklist grouped by category (Mandatory Text, Language, Safety, Environmental, etc.)
- Each rule has a toggle (compliant/non-compliant) and expandable detail/guidance
- Overall compliance score (X% compliant) with pass/fail breakdown
- AI Vision section: drag-and-drop label image upload; "Scan Label" button triggers OpenAI Vision analysis
- Scan results overlay each rule with pass/fail from vision analysis

### Screen 10: CBAM Readiness (Scope 3)
- **Status:** UI built; WhatsApp integration mocked
- Displays CBAM phase information, key dates, what's required
- "Vendor Outreach" form: enter vendor name and WhatsApp number
- "Send Data Request" button — currently sends simulated WhatsApp message
- Shows confirmation of "sent" message (even though no real API call occurs)

### Screen 11: Settings
- **Status:** Fully built (screenshot: `docs/screenshots/10_settings.png`)
- Company profile section: name, size (micro/small/medium/large), IEC code
- Product selection: 9 categories as clickable cards
- Market selection: 6 destination markets as checkboxes
- API Keys section: list, generate, and revoke API keys

---

## 10. Competitive Differentiators

### 1. India-First Data Model
Unlike generic compliance platforms (e.g., Avalara, Descartes CustomsCity), ComplianceOS is built specifically for **Indian exporters**. Every checklist automatically includes Indian-side requirements (IEC, GST/LUT, FEMA, ECGC). The FTA database covers India's specific trade agreements. The risk scoring understands MSME-specific compliance burden.

### 2. CBAM as Core Feature, Not an Add-On
CBAM is baked into the risk engine, checklist generator, alert system, and has dedicated features (CBAM Readiness, quarterly report PDF). No other India-focused compliance tool has CBAM coverage at this depth.

### 3. Dual Implementation (Frontend + Backend)
The risk scoring, checklist generation, and alert logic are implemented in both TypeScript (for instant frontend response) and Python (for the API layer). The algorithms are identical — verified by the test suite.

### 4. API-First Architecture
Built for integration, not just internal use. Freight forwarders and customs agents can access risk scores, checklists, and HS lookups via API key. This is the B2B distribution strategy.

### 5. AI-Powered Label Validation
The label validator with OpenAI Vision integration is a genuinely differentiated feature. Manual rule-checking exists in generic tools; AI-based image analysis against destination-specific rules does not.

### 6. Pre-Shipment Compliance Gate
The automated gate check that blocks a shipment until all critical compliance items are resolved is a workflow-level differentiator — moving compliance from advisory to operational.

### 7. Test-Driven Quality
586 unit and integration tests covering all core business logic across 22 test files. This is unusual for an early-stage compliance tool and provides a reliable foundation for the regulatory data.

### 8. FTA Duty Savings Calculator with Real Tariff Data
Actual scraped tariff rates from trade.gov.in (not estimated) with specific Rules of Origin. Most tools show FTA status; few show actual duty savings calculations.

---

## 11. Known Limitations & TODOs

This section provides an honest assessment of what is incomplete, mocked, or has known gaps.

### Critical Gaps (Blocking for Production Use)

**1. WhatsApp Integration is Mocked**
The `whatsapp-vendor-outreach` Supabase edge function simulates sending a message. No actual WhatsApp API call is made. The function comments document what the real implementation requires (Meta Business Platform credentials, approved WhatsApp template named `cbam_scope_3_data_request`). Any demo showing "vendor outreach" is simulated.

**2. TReDS Financing is Mocked**
The `treds-financing` edge function returns a fake Factoring Unit ID. No actual RXIL or Invoicemart API call is made. The returned `fu_id` is randomly generated. Comments document the real implementation path.

**3. Regulatory Alert Feed Needs pg_cron**
A `fetch-regulatory-feeds` edge function scrapes live RSS/Atom feeds from EU Customs, US CBP, and UK HMRC. However, it runs on demand only — pg_cron must be manually enabled in the Supabase dashboard and a scheduled job created (`SELECT cron.schedule(...)`). Until pg_cron is configured, the `regulatory_changes` table stays empty and the UI shows 5 hardcoded seed alerts (CBAM levy active, Notification 60, EUDR, UFLPA, India-UAE CEPA).

**4. FTA Tariff Coverage is Limited to 10 HS Codes**
The database only contains tariff rates for 10 specific HS codes under India-UAE CEPA. The scraper to expand this to 200+ HS codes across UAE, Japan, and Australia is built but has not been run at scale.

**5. CBAM Report Does Not Connect to EU Registry**
The CBAM quarterly report PDF is informational. It does not submit to or integrate with the official EU CBAM Transitional Registry (TAXUD). The report supports the EU importer's filing process but the filing itself must be done separately.

**6. Label Vision Falls Back to Mock Without API Key**
If `OPENAI_API_KEY` is not configured in Supabase secrets, the label vision scan returns simulated pass/fail results (designed to fail rules #2 and #3 to demonstrate the UI). The mock is realistic-looking but not a real AI analysis.

**7. No Billing / Monetization Implemented**
The `companies.plan` column exists (free/growth/enterprise) and the tier structure is designed (₹9,999/month Growth, ₹50,000/month Enterprise), but no Razorpay integration exists. The frontend has no pricing page. The sidebar shows PRO badges on RoDTEP, FTA, Shipments, and Label Checker nav items, but these are purely cosmetic — no billing enforcement or upgrade flow is wired.

### Infrastructure Limitations

**8. In-Memory Rate Limiter**
The API key rate limiter stores state in a Python dictionary. This resets every time the server restarts and does not work correctly across multiple server instances. For production, this needs Redis or a database-backed counter.

**9. Data Pipeline Not Running**
DGFT and EU CBAM scrapers are implemented but not scheduled. APScheduler is wired but depends on Railway environment. No GitHub Actions workflow exists for the scrapers.

**10. Company Name Hardcoded in WhatsApp Function**
The WhatsApp edge function has `companyName: 'ComplianceOS Exporter'` hardcoded in some paths. This would need to be replaced with real company data in production.

**11b. Security Certifications Removed from Marketing Docs**
Earlier versions of `docs/ComplianceOS_Client_Walkthrough.html` and `docs/partnership-brief-benedict.html` displayed badges claiming "SOC 2 Type II Certified", "ISO 27001 Compliant", and "DPDP Act Ready". These were false. They have been removed and replaced with accurate statements: AES-256 encryption, Postgres Row-Level Security, Supabase Auth (JWT), and India-first data handling.

### Data Quality Notes

**11. Regulatory Data is Manually Curated**
The 6 country profiles in `regulatory-db.ts` represent the state of regulations as of approximately January 2025. They are not automatically updated. The last documented changes include: EUDR postponement (July 2024), CBAM simplification for small importers (October 2024), and RCEP Phase 3 Japan reductions (November 2024).

**12. Checklist Items Are Rule-Based, Not Jurisdiction-Verified**
The compliance checklist generates items based on a rules engine. While the items are accurate based on the curated data, they have not been reviewed or certified by customs attorneys or licensed customs house agents.

**13. ITC-HS Full Database Not Imported**
The `hs_codes` table exists in the schema but has not been populated with the full ITC-HS database. HS code validation (`/api/v1/hs-validate`) will return "not found" for most codes until this import is completed.

### Planned Features Not Yet Built

**14. Email Notifications** — No SMTP or email service integration (Resend.com was mentioned in design)
**15. CSV/Excel Export** — No download functionality for checklists or shipment data
**16. Tally ERP Integration** — Mentioned in design; not implemented
**17. Multi-User / Team Access** — Schema supports `role` (owner/admin/viewer) but no UI for inviting team members
**18. Google OAuth** — Supabase Auth is wired but only email/password flow has been tested
**19. Supabase Realtime for Alerts** — Planned for live push notifications; not yet wired in frontend
**20. Pricing / Upgrade Flow** — No frontend pricing page or checkout flow

### Code Quality Notes

**21. No E2E Tests** — Only unit and integration tests exist (586 passing across 22 files). No Playwright/Cypress E2E suite. No backend Python test files exist at all.
**22. No Error Boundary in Frontend** — React error boundaries not implemented; unhandled errors could crash the app.
**23. `document-ocr` and `customs-filing` are MOCKED** — Both edge functions exist and are wired to the Shipments UI, but return simulated responses. `document-ocr` always returns hardcoded invoice data (`hsCode: '841480'`). `customs-filing` generates a test-mode ICEGATE payload with `Indicator: 'T'` (Test mode) — no real submission occurs.

---

## Appendix A: File/Directory Structure

```
complanceOS/
├── src/                               # Frontend React application (~14,000+ LOC)
│   ├── App.tsx                        # Main app, state management, auth flow
│   ├── components/
│   │   ├── Badge.tsx, Button.tsx, Card.tsx, Tabs.tsx
│   │   ├── RiskGauge.tsx              # SVG circular risk indicator
│   │   ├── RiskScoreLegend.tsx        # Score legend component
│   │   ├── LoadingSkeleton.tsx        # Loading states
│   │   ├── Toast.tsx                  # Toast notification system
│   │   ├── Spinner.tsx                # Loading spinner
│   │   └── views/
│   │       ├── Dashboard.tsx          # Main dashboard view
│   │       ├── RiskAnalysis.tsx       # Per-country risk breakdown
│   │       ├── Checklist.tsx          # Compliance checklist
│   │       ├── Alerts.tsx             # Regulatory alerts
│   │       ├── FTASchemes.tsx         # FTA status + savings calculator
│   │       ├── Shipments.tsx          # Shipment CRUD
│   │       ├── LabelValidator.tsx     # AI label compliance checker
│   │       ├── CBAMReadiness.tsx      # CBAM Scope 3 vendor outreach
│   │       └── Settings.tsx           # Configuration
│   ├── data/
│   │   ├── regulatory-db.ts           # 6-country regulatory profiles
│   │   ├── fta.ts                     # FTA status database
│   │   ├── fta_compliance_details.ts  # 10 HS code tariff rates
│   │   ├── products.ts                # 9 product categories
│   │   ├── indian-schemes.ts          # 8 export schemes
│   │   └── label-rules.ts             # Label compliance rules by product/country
│   ├── utils/
│   │   ├── risk-scoring.ts            # Risk scoring engine
│   │   ├── checklist-generator.ts     # Checklist generation engine
│   │   ├── alert-generator.ts         # Alert generation engine
│   │   └── label-validator.ts         # Label validation logic
│   ├── hooks/
│   │   ├── useAuth.ts                 # Supabase auth hook
│   │   └── useToast.ts                # Toast notification hook
│   ├── lib/
│   │   ├── supabase.ts                # Supabase client init
│   │   └── api.ts                     # API call functions (FastAPI + Edge Functions)
│   └── types/index.ts                 # All TypeScript interfaces
├── backend/                           # Python FastAPI backend
│   ├── app/
│   │   ├── main.py                    # FastAPI app, CORS, middleware
│   │   ├── config.py                  # Settings from environment
│   │   ├── dependencies.py            # Auth dependency injection
│   │   ├── models/                    # Pydantic request/response models
│   │   ├── routers/                   # API route handlers (11 routers)
│   │   ├── services/                  # Business logic
│   │   │   ├── risk_engine.py         # Risk scoring (Python)
│   │   │   ├── checklist_engine.py    # Checklist generation (Python)
│   │   │   ├── alert_engine.py        # Alert generation (Python)
│   │   │   ├── fta_calculator.py      # FTA savings calculation
│   │   │   ├── compliance_gate.py     # Pre-shipment gate check
│   │   │   ├── cbam_report.py         # CBAM PDF generator
│   │   │   └── coo_generator.py       # Certificate of Origin PDF
│   │   ├── middleware/
│   │   │   ├── audit_logger.py        # Request audit logging
│   │   │   └── rate_limiter.py        # In-memory rate limiter
│   │   └── scrapers/
│   │       ├── trade_connect.py       # trade.gov.in FTA rate scraper
│   │       ├── dgft_scraper.py        # DGFT notifications scraper
│   │       ├── eu_cbam.py             # EU CBAM updates scraper
│   │       └── scheduler.py           # APScheduler coordination
│   └── scripts/seed_db.py             # One-time DB seeding script
├── supabase/
│   ├── schema.sql                     # Full PostgreSQL schema (15 tables + RLS + triggers)
│   ├── migration_phase2.sql           # Phase 2: adds scraper_runs table, India country row
│   ├── migration_phase4.sql           # Phase 4: adds hs_code/gate_status to shipments, compliance_gates table
│   ├── migration_sanctions.sql        # Sanctions table DDL
│   ├── seed_hs_tariff_rates.sql       # HS tariff rates seed data
│   └── functions/
│       ├── climatiq-emissions/        # Carbon calculation (Climatiq) — REAL
│       ├── zonos-classify/            # HS code classification (Zonos) — REAL
│       ├── zonos-landed-cost/         # Landed cost (Zonos) — REAL
│       ├── label-vision/              # AI label analysis (OpenAI) — REAL
│       ├── fetch-regulatory-feeds/    # Live RSS scraper (EU/US/UK) — needs pg_cron
│       ├── sanctions-check/           # OFAC SDN screening — REAL
│       ├── underwriting-signal/       # Compliance API for partners — REAL
│       ├── regulatory-alerts/         # Alert generation (DB + fallback seeds)
│       ├── whatsapp-vendor-outreach/  # WhatsApp (MOCKED, UI shows "Preview")
│       ├── treds-financing/           # TReDS (MOCKED, UI shows "Prepare Request")
│       ├── customs-filing/            # ICEGATE (MOCKED, test-mode)
│       └── document-ocr/             # Invoice OCR (MOCKED, hardcoded data)
├── scripts/
│   ├── seed_rodtep.mjs                # Seeds RoDTEP rates from rodtep_rates_extracted.json
│   ├── seed_sanctions.mjs             # Seeds OFAC SDN + alt names into Supabase
│   └── generate_tariff_migration.mjs  # Generates SQL migration for HS tariff rates
└── docs/
    ├── screenshots/                   # App screenshots (PNG + base64)
    ├── rodtep_rates_extracted.json    # Notification 60 (Feb 2026) RoDTEP rates
    ├── accessibility-audit.md         # WCAG AA color contrast audit (accurate)
    └── ComplianceOS_Client_Walkthrough.html
```

---

## Appendix B: Database Schema Summary (17 Tables)

| Table | Source | Purpose | RLS |
|-------|--------|---------|-----|
| `companies` | schema.sql | Company profiles (size, IEC, plan tier) | No (managed via user_profiles) |
| `user_profiles` | schema.sql | User → company linkage, roles | Via auth.uid() |
| `countries` | schema.sql | Country regulatory profiles (CBAM, ESG, packaging, etc.) | No (public reference) |
| `certifications` | schema.sql | Product × country certification requirements | No (public reference) |
| `fta_agreements` | schema.sql | FTA status per country | No (public reference) |
| `hs_tariff_rates` | schema.sql | Scraped tariff rates (MFN + preferential) | No (public reference) |
| `hs_codes` | schema.sql | ITC-HS code reference (not yet populated) | No |
| `product_categories` | schema.sql | 9 product category definitions | No |
| `export_schemes` | schema.sql | Indian export scheme details | No |
| `regulatory_changes` | schema.sql | Scraped regulatory updates | No |
| `shipments` | schema.sql | Company shipment tracking | **Yes** (company isolation) |
| `checklist_progress` | schema.sql | Per-shipment checklist state | **Yes** (company isolation) |
| `user_settings` | schema.sql | Product/country preferences (defaults: steel, EU+UAE) | **Yes** (company isolation) |
| `audit_log` | schema.sql | Action audit trail | **Yes** (company isolation) |
| `api_keys` | schema.sql | API key management | **Yes** (company isolation) |
| `scraper_runs` | migration_phase2.sql | Scraper job execution history (running/success/failed/partial) | No |
| `compliance_gates` | migration_phase4.sql | Pre-shipment gate check results (JSONB per check type) | No (queried by company_id) |

---

*Last updated May 2026. Reflects codebase state after: RoDTEP Recovery Calculator (Phase 2), CBAM Public Exposure Checker (Phase 3), EU exporter onboarding routing (Phase 4), Sanctions Screening, Underwriting Signal API, live regulatory feed infrastructure, and UI honesty fixes (TReDS/WhatsApp labelled as preview, false ISO/SOC 2 badges removed from marketing docs). 12 Supabase edge functions deployed. All 6 API keys confirmed in Supabase dashboard secrets. Only ICEGATE credentials genuinely absent.*
