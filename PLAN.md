# ComplianceOS: From Prototype to Production

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                              │
│  React 19 + Vite + Supabase JS Client                           │
│  - Auth UI (login/signup)                                        │
│  - All 7 existing views (refactored to call APIs)                │
│  - Supabase Realtime subscriptions for live alerts               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────────┐
│                RAILWAY (Backend API)                              │
│  Python FastAPI                                                  │
│  - /api/v1/risk-score        (public + authenticated)            │
│  - /api/v1/checklist         (public + authenticated)            │
│  - /api/v1/alerts            (authenticated)                     │
│  - /api/v1/fta-savings       (public + authenticated)            │
│  - /api/v1/hs-lookup         (public)                            │
│  - /api/v1/shipments         (authenticated CRUD)                │
│  - /api/v1/webhooks          (for forwarder integrations)        │
│  - /internal/scrape          (cron-triggered data pipeline)      │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Supabase Client (Python)
┌──────────────────────▼──────────────────────────────────────────┐
│                   SUPABASE (Managed)                              │
│  - PostgreSQL database (regulatory data, users, shipments)       │
│  - Auth (email/password, Google OAuth)                           │
│  - Row Level Security (tenant isolation)                         │
│  - Realtime (push alerts to frontend)                            │
│  - Storage (CBAM report PDFs, export docs)                       │
│  - Edge Functions (lightweight webhooks if needed)               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Cron (GitHub Actions / Railway Cron)
┌──────────────────────▼──────────────────────────────────────────┐
│              DATA PIPELINE (Scrapers)                             │
│  - trade.gov.in scraper (EXISTING - extend)                      │
│  - DGFT notification scraper (NEW)                               │
│  - EU Commission CBAM feed (NEW)                                 │
│  - ITC HS Code database bulk import (NEW)                        │
│  - Runs daily/weekly via cron                                    │
│  - Writes directly to Supabase Postgres                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation — Supabase + Auth + Persistence
**Goal:** Data persists. Users can sign up. Existing UI keeps working.

### 1.1 Supabase Project Setup

**Create Supabase project** at supabase.com, then create these tables:

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- USERS & COMPANIES
-- ==========================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'My Company',
  size TEXT NOT NULL DEFAULT 'small' CHECK (size IN ('micro','small','medium','large')),
  iec TEXT,                          -- Import Export Code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  email TEXT NOT NULL,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner','admin','viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- REGULATORY DATA (replaces static TS files)
-- ==========================================

CREATE TABLE countries (
  code TEXT PRIMARY KEY,             -- 'EU', 'US', 'UK', 'UAE', 'Japan', 'Australia'
  name TEXT NOT NULL,
  flag TEXT NOT NULL,
  cbam_config JSONB DEFAULT '{}',    -- entire CBAM object from regulatory-db.ts
  esg_config JSONB DEFAULT '{}',     -- entire ESG object
  packaging TEXT[] DEFAULT '{}',
  labeling TEXT[] DEFAULT '{}',
  customs TEXT[] DEFAULT '{}',
  sanctions TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT REFERENCES countries(code),
  product_category TEXT NOT NULL,    -- 'steel', 'food', 'textiles', etc.
  certifications TEXT[] NOT NULL,    -- ['CE Marking', 'EU Declaration of Conformity']
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_code, product_category)
);

CREATE TABLE regulatory_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT REFERENCES countries(code),
  date TEXT NOT NULL,
  change_description TEXT NOT NULL,
  source_url TEXT,                   -- link to original notification
  severity TEXT DEFAULT 'info',
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- FTA DATA (replaces fta.ts + fta_compliance_details.ts)
-- ==========================================

CREATE TABLE fta_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT REFERENCES countries(code),
  name TEXT NOT NULL,                -- 'India-UAE CEPA'
  status TEXT NOT NULL,              -- 'Active', 'Under Negotiation', 'No FTA'
  effective_date DATE,
  round TEXT,
  preferential_tariff BOOLEAN DEFAULT FALSE,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_code)
);

CREATE TABLE hs_tariff_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hs_code TEXT NOT NULL,             -- '7208', '6109', etc.
  hs_description TEXT,               -- full product description
  country_code TEXT REFERENCES countries(code),
  agreement TEXT,                    -- 'India-UAE CEPA'
  mfn_rate NUMERIC(6,2) NOT NULL,
  preferential_rate NUMERIC(6,2) NOT NULL,
  rule_of_origin TEXT,
  product_category TEXT,             -- mapped category: 'steel', 'textiles'
  source TEXT,                       -- 'trade.gov.in', 'findrulesoforigin.org'
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hs_code, country_code, agreement)
);

-- ==========================================
-- PRODUCT CATEGORIES
-- ==========================================

CREATE TABLE product_categories (
  id TEXT PRIMARY KEY,               -- 'steel', 'food', etc.
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  hs_prefix TEXT[] NOT NULL          -- ['72-73'], ['01-24']
);

-- ==========================================
-- INDIAN EXPORT SCHEMES
-- ==========================================

CREATE TABLE export_schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  source_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- USER DATA (per-company, RLS protected)
-- ==========================================

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product TEXT NOT NULL,
  country TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','preparing','in_progress','in_transit','delivered')),
  risk_score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE checklist_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  product TEXT NOT NULL,
  checked_items JSONB DEFAULT '{}',  -- { "1": true, "5": true, ... }
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, shipment_id, country_code)
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,              -- 'shipment.created', 'checklist.toggled', 'settings.updated'
  entity_type TEXT,                  -- 'shipment', 'checklist', 'settings'
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- API KEYS (for third-party forwarders)
-- ==========================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,            -- bcrypt hash of the API key
  name TEXT NOT NULL,                -- 'Production Key', 'Forwarder Integration'
  permissions TEXT[] DEFAULT '{read}',
  rate_limit INTEGER DEFAULT 1000,   -- requests per day
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own company's data
CREATE POLICY "Users see own company shipments" ON shipments
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users see own company checklists" ON checklist_progress
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users see own company audit log" ON audit_log
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users see own company API keys" ON api_keys
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Regulatory data is readable by everyone (public reference data)
-- No RLS needed on countries, certifications, fta_agreements, hs_tariff_rates, etc.
```

### 1.2 Seed Database with Existing Static Data

Create `backend/scripts/seed_db.py` that:
- Reads current `src/data/regulatory-db.ts` values and INSERTs into `countries` + `certifications`
- Reads `src/data/fta.ts` → inserts into `fta_agreements`
- Reads `src/data/products.ts` → inserts into `product_categories`
- Reads `src/data/indian-schemes.ts` → inserts into `export_schemes`
- Reads `src/data/fta_compliance_details.ts` → inserts into `hs_tariff_rates`
- This is a one-time migration script

### 1.3 Frontend: Add Supabase Auth

**Install in frontend:**
```bash
npm install @supabase/supabase-js
```

**Create files:**
- `src/lib/supabase.ts` — Supabase client init with env vars
- `src/components/Auth.tsx` — Login/signup form using Supabase Auth UI
- `src/hooks/useAuth.ts` — Custom hook wrapping `supabase.auth.onAuthStateChange`
- `src/components/ProtectedRoute.tsx` — Wrapper that redirects to login if unauthenticated

**Modify `src/App.tsx`:**
- Wrap app in auth check: if not logged in → show `<Auth />`, else → show current app
- Replace `DEFAULT_PROFILE` with profile fetched from `user_profiles` + `companies` tables
- Replace hardcoded shipments `useState` with Supabase query: `supabase.from('shipments').select('*')`
- Replace `checkedItems` useState with Supabase query to `checklist_progress`
- Add `useEffect` to save checklist toggles to Supabase on change

### 1.4 FastAPI Project Scaffolding

**Create `backend/` directory structure:**
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, middleware
│   ├── config.py            # Settings (Supabase URL, keys from env)
│   ├── dependencies.py      # Supabase client, auth dependency
│   ├── models/
│   │   ├── __init__.py
│   │   ├── risk.py          # Pydantic models for risk scoring
│   │   ├── checklist.py     # Pydantic models for checklists
│   │   ├── shipment.py      # Pydantic models for shipments
│   │   └── fta.py           # Pydantic models for FTA data
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── risk.py          # /api/v1/risk-score
│   │   ├── checklist.py     # /api/v1/checklist
│   │   ├── alerts.py        # /api/v1/alerts
│   │   ├── fta.py           # /api/v1/fta-savings, /api/v1/hs-lookup
│   │   ├── shipments.py     # /api/v1/shipments CRUD
│   │   └── public.py        # Public API endpoints (API key auth)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── risk_engine.py   # Port of risk-scoring.ts logic
│   │   ├── checklist_engine.py  # Port of checklist-generator.ts logic
│   │   ├── alert_engine.py  # Port of alert-generator.ts logic
│   │   └── fta_calculator.py    # Port of FTA savings logic
│   └── scrapers/
│       ├── __init__.py
│       ├── trade_connect.py # Evolved from scripts/scrape_trade_connect.py
│       ├── dgft_scraper.py  # NEW: DGFT notifications
│       ├── eu_cbam.py       # NEW: EU CBAM registry
│       ├── hs_code_importer.py  # NEW: Bulk ITC-HS import
│       └── scheduler.py     # APScheduler or cron coordination
├── tests/
│   ├── test_risk_engine.py
│   ├── test_checklist_engine.py
│   └── test_api.py
├── requirements.txt
├── Dockerfile
├── railway.toml             # Railway deployment config
└── .env.example
```

**Port business logic from TypeScript to Python:**
- `risk-scoring.ts` → `services/risk_engine.py` (same algorithm, reads from Supabase instead of static imports)
- `checklist-generator.ts` → `services/checklist_engine.py`
- `alert-generator.ts` → `services/alert_engine.py`
- Keep the EXACT SAME scoring weights and logic — just change the data source

**requirements.txt:**
```
fastapi==0.115.0
uvicorn[standard]==0.34.0
supabase==2.11.0
pydantic==2.10.0
python-dotenv==1.0.1
httpx==0.28.0
apscheduler==3.11.0
playwright==1.49.0
beautifulsoup4==4.12.3
python-jose[cryptography]==3.3.0
bcrypt==4.2.0
```

---

## Phase 2: Live Data Pipeline (Technical Moat)
**Goal:** Regulatory data updates automatically. HS code coverage goes from 10 to 1000+.

### 2.1 Extend trade.gov.in Scraper

**Evolve `scripts/scrape_trade_connect.py` → `backend/app/scrapers/trade_connect.py`**

Current state: Scrapes 10 HS codes for UAE only.
Target: Scrape top 200 HS codes for UAE, Japan, Australia (all active FTA countries).

Changes:
- Add country codes: `ae` (UAE), `jp` (Japan), `au` (Australia)
- Expand HS code list to top 200 Indian export products (use DGFT export statistics)
- Write results directly to `hs_tariff_rates` table in Supabase instead of local JSON
- Add `--country` flag to scrape specific countries
- Add deduplication: `ON CONFLICT (hs_code, country_code, agreement) DO UPDATE`
- Schedule: Run weekly via GitHub Actions cron

**Top export HS codes to add (India's major exports):**
```python
PRIORITY_HS_CODES = [
    # Petroleum & Chemicals (India's #1 export)
    "2710", "2711", "2902", "2917", "2922", "2933", "2934", "3004", "3808",
    # Gems & Jewelry
    "7102", "7113", "7117",
    # Textiles & Garments
    "5205", "5209", "5407", "5903", "6109", "6110", "6203", "6204", "6302",
    # Steel & Iron
    "7208", "7209", "7210", "7213", "7214", "7219", "7304", "7306",
    # Engineering goods
    "7307", "7318", "7326", "8414", "8421", "8431", "8471", "8473",
    # Electronics
    "8517", "8523", "8529", "8534", "8541", "8542",
    # Automotive
    "8703", "8708", "8711",
    # Food
    "0306", "0713", "0902", "0904", "1006", "1513", "2106",
    # Pharma
    "3003", "3004", "3006",
    # ... expand to 200+
]
```

### 2.2 DGFT Notification Scraper (NEW)

**File: `backend/app/scrapers/dgft_scraper.py`**

**Source:** https://www.dgft.gov.in — The DGFT publishes:
- Trade Notices: https://www.dgft.gov.in/CP/?opt=trade-notice
- Public Notices: https://www.dgft.gov.in/CP/?opt=public-notice
- Notifications: https://www.dgft.gov.in/CP/?opt=notification
- Policy circulars: https://www.dgft.gov.in/CP/?opt=policy-circular

**Implementation:**
```python
# Scrapes DGFT trade notices, public notices, and notifications
# Uses BeautifulSoup (no JS rendering needed - DGFT serves HTML tables)
# Stores in regulatory_changes table with source_url
# Runs daily

import httpx
from bs4 import BeautifulSoup

DGFT_URLS = {
    "trade_notice": "https://www.dgft.gov.in/CP/?opt=trade-notice",
    "public_notice": "https://www.dgft.gov.in/CP/?opt=public-notice",
    "notification": "https://www.dgft.gov.in/CP/?opt=notification",
}

async def scrape_dgft_notifications():
    for notice_type, url in DGFT_URLS.items():
        response = await httpx.AsyncClient().get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        # Parse the table rows for date, subject, PDF link
        # Insert into regulatory_changes table
        # Flag export-relevant ones using keyword matching
```

**Keywords to flag as relevant:**
`CBAM`, `FTA`, `CEPA`, `Certificate of Origin`, `RoDTEP`, `PLI`, `tariff`, `HS code`,
`packaging`, `labeling`, `quality control`, `pre-shipment inspection`

### 2.3 EU Commission CBAM Feed (NEW)

**File: `backend/app/scrapers/eu_cbam.py`**

**Sources:**
- EU CBAM Transitional Registry: https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en
- EU Official Journal (EUR-Lex): https://eur-lex.europa.eu/collection/eu-law/inter-instit-proc.html
  - RSS Feed: `https://eur-lex.europa.eu/collection/eu-law/inter-instit-proc/rss.xml`
- CBAM specific news: https://taxation-customs.ec.europa.eu/news_en (filter by CBAM tag)

**Implementation:**
```python
# Parses EU Commission CBAM updates page
# Checks for new FAQ updates, regulation amendments, deadline changes
# Uses httpx + BeautifulSoup
# Also monitors EUR-Lex RSS for new CBAM-related legislation

import feedparser  # for RSS

async def scrape_eu_cbam_updates():
    # 1. Scrape CBAM main page for new announcements
    # 2. Parse EUR-Lex RSS feed, filter for "CBAM" or "carbon border"
    # 3. Check for new implementing/delegated acts
    # 4. Insert into regulatory_changes with country_code='EU'
```

**Also scrape:**
- UK CBAM updates: https://www.gov.uk/government/collections/carbon-border-adjustment-mechanism
- EU REACH updates: https://echa.europa.eu/regulations/reach/legislation

### 2.4 ITC-HS Code Bulk Import (NEW)

**File: `backend/app/scrapers/hs_code_importer.py`**

**Source:** India's ITC-HS Classification
- CBIC (Central Board of Indirect Taxes): https://www.cbic.gov.in/htdocs-cbec/customs/cst-act/formatted-htmls/cst-sch1-idx
- ITC-HS Export Policy: https://dgft.gov.in/sites/default/files/ITC_HS_2022.pdf (PDF, 1700+ pages)
- Alternative: UN COMTRADE HS code database (CSV download)
  - https://comtradeplus.un.org/

**Implementation:**
- Download ITC-HS codes as CSV/PDF
- Parse into (hs_code, description, product_category) tuples
- Auto-categorize using HS chapter ranges (already defined in products.ts):
  - Chapters 01-24 → food
  - Chapters 28-38 → chemicals
  - Chapters 50-63 → textiles
  - Chapters 72-73 → steel
  - Chapter 84-85 → electronics/machinery
  - Chapter 87 → automotive
  - Chapter 30 → pharma
- Insert into `product_hs_codes` reference table (new table):

```sql
CREATE TABLE hs_codes (
  code TEXT PRIMARY KEY,          -- '720810', '610910'
  chapter TEXT NOT NULL,          -- '72', '61'
  description TEXT NOT NULL,
  product_category TEXT,          -- auto-mapped: 'steel', 'textiles'
  export_policy TEXT,             -- 'Free', 'Restricted', 'Prohibited'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.5 Scheduler Setup

**File: `backend/app/scrapers/scheduler.py`**

Using APScheduler within FastAPI:
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

# trade.gov.in FTA rates — weekly (heavy scraping, be respectful)
scheduler.add_job(scrape_trade_connect, 'cron', day_of_week='sun', hour=2)

# DGFT notifications — daily at 6 AM IST
scheduler.add_job(scrape_dgft_notifications, 'cron', hour=0, minute=30)  # UTC

# EU CBAM updates — daily
scheduler.add_job(scrape_eu_cbam_updates, 'cron', hour=1)

# UK gov updates — weekly
scheduler.add_job(scrape_uk_updates, 'cron', day_of_week='mon', hour=3)
```

**Alternative: GitHub Actions cron** (if Railway doesn't support long-running scrapers):
```yaml
# .github/workflows/scrape.yml
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
jobs:
  scrape-dgft:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r backend/requirements.txt
      - run: python -m backend.app.scrapers.dgft_scraper
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

### 2.6 Frontend: Switch from Static Imports to API Calls

**Modify these files to fetch from Supabase/API instead of static imports:**

| Current File | What Changes |
|---|---|
| `App.tsx` | Risk results, checklists, alerts fetched via API calls instead of `useMemo` with static data |
| `FTASchemes.tsx` | `FTA_TARIFF_RATES` replaced with Supabase query to `hs_tariff_rates` |
| `Settings.tsx` | `PRODUCT_CATEGORIES` read from Supabase `product_categories` table |
| `Alerts.tsx` | Alerts fetched from API; subscribe to Supabase Realtime for live push |

**Create `src/lib/api.ts`:**
```typescript
const API_BASE = import.meta.env.VITE_API_URL

export async function fetchRiskScore(product: string, country: string, companySize: string) {
  const res = await fetch(`${API_BASE}/api/v1/risk-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ product, country, company_size: companySize })
  })
  return res.json()
}

// Similar for checklist, alerts, fta-savings, shipments CRUD
```

---

## Phase 3: Public API (Moat Deepening)
**Goal:** Third-party freight forwarders can integrate via API.

### 3.1 API Design

All public endpoints require API key in header: `X-API-Key: cos_live_xxxx`

```
POST /api/v1/risk-score
  Body: { "product": "steel", "country": "EU", "company_size": "small" }
  Response: { "score": 72, "level": "high", "factors": [...], "recommendations": [...] }

POST /api/v1/checklist
  Body: { "product": "steel", "country": "EU" }
  Response: { "items": [...], "total": 28, "critical_count": 8 }

GET  /api/v1/alerts?countries=EU,UAE&product=steel
  Response: { "alerts": [...], "counts": { "critical": 2, "warning": 5, "info": 3 } }

POST /api/v1/fta-savings
  Body: { "hs_code": "7208", "country": "UAE", "shipment_value": 1000000 }
  Response: { "mfn_rate": 5, "preferential_rate": 3, "savings": 20000, "agreement": "India-UAE CEPA" }

GET  /api/v1/hs-lookup?code=7208
  Response: { "hs_code": "7208", "description": "Flat-rolled steel...", "category": "steel", ... }

POST /api/v1/webhooks/register
  Body: { "url": "https://forwarder.com/webhook", "events": ["alert.critical", "regulation.change"] }
```

### 3.2 API Key Management

- Companies can generate API keys from Settings page
- Keys stored as bcrypt hash in `api_keys` table
- Rate limiting: 1000 requests/day (free), 10000 (paid)
- Usage tracking in `api_usage` table

### 3.3 Auto-generated Documentation

FastAPI auto-generates OpenAPI/Swagger docs at `/docs` and `/redoc`.
No extra work needed — just ensure all Pydantic models have descriptions.

---

## Phase 4: Enhanced Features
**Goal:** CBAM report PDF, audit logging, enhanced checklists.

### 4.1 CBAM Report Generation

**File: `backend/app/services/cbam_report.py`**

Using `reportlab` or `weasyprint` to generate PDF reports:
- Company details
- Product & HS code
- Embedded emissions data (user-provided inputs)
- Carbon content declaration
- Quarterly summary
- Disclaimer: "Generated by ComplianceOS. Official filing must be done via EU CBAM Transitional Registry."

Store generated PDFs in Supabase Storage.

### 4.2 Audit Logging

Add middleware in FastAPI that logs every mutating request to `audit_log` table:
```python
@app.middleware("http")
async def audit_middleware(request, call_next):
    response = await call_next(request)
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        await log_audit(request, response)
    return response
```

### 4.3 Legal Disclaimers

Add to every API response:
```json
{
  "data": { ... },
  "disclaimer": "ComplianceOS provides informational guidance only. This does not constitute legal or regulatory advice. Verify all requirements with licensed customs brokers and regulatory authorities."
}
```

Add disclaimer banner to frontend footer/header.

---

## Phase 5: Monetization
**Goal:** Start charging money.

### 5.1 Razorpay Integration

**Backend:** `backend/app/routers/billing.py`
- Create subscription plans in Razorpay dashboard
- Webhook handler for payment events
- Feature gating based on `companies.plan` column

**Add to schema:**
```sql
ALTER TABLE companies ADD COLUMN plan TEXT DEFAULT 'free' CHECK (plan IN ('free','growth','enterprise'));
ALTER TABLE companies ADD COLUMN razorpay_customer_id TEXT;
ALTER TABLE companies ADD COLUMN plan_expires_at TIMESTAMPTZ;
```

**Tiers:**
| Feature | Free | Growth (₹9,999/mo) | Enterprise (₹50,000/mo) |
|---|---|---|---|
| Risk scores/month | 5 | Unlimited | Unlimited |
| HS codes | Top 50 | All | All |
| API access | No | 1000/day | 10000/day |
| Shipments | 3 | Unlimited | Unlimited |
| CBAM reports | No | Yes | Yes |
| Audit logs | No | 30 days | Unlimited |
| Users | 1 | 5 | Unlimited |

### 5.2 Frontend Pricing Page

Create `src/components/views/Pricing.tsx` with tier cards and Razorpay checkout button.

---

## Phase 6: Integrations
**Goal:** Connect with the rest of the exporter's workflow.

### 6.1 CSV/Excel Export

Add to Checklist view and Shipments view:
- "Download as CSV" button
- "Download as Excel" button
- Uses `xlsx` npm package on frontend or generates server-side

### 6.2 Email Notifications

Using Supabase Edge Functions or Resend.com:
- Critical alert → email immediately
- Weekly digest → summary of alerts and checklist progress
- CBAM deadline reminders → 90, 60, 30 days before

### 6.3 Tally ERP Integration (Basic)

- CSV import format compatible with Tally's export invoice format
- Parse Tally export data to auto-populate shipment details

---

## Implementation Order (What to Build First)

```
Week 1-2:  Phase 1.1 + 1.2  → Supabase schema + seed data
Week 2-3:  Phase 1.3         → Auth in frontend (login/signup works)
Week 3-4:  Phase 1.4         → FastAPI scaffolding + port business logic
Week 4-6:  Phase 2.1 + 2.4   → Extend trade.gov.in scraper to 200 HS codes + bulk import
Week 6-7:  Phase 2.2 + 2.3   → DGFT + EU CBAM scrapers
Week 7-8:  Phase 2.5 + 2.6   → Scheduler + frontend API integration
Week 8-9:  Phase 3           → Public API + API key management
Week 9-10: Phase 4           → CBAM report PDF + audit logs + disclaimers
Week 10-11: Phase 5          → Razorpay + tier gating
Week 11-12: Phase 6          → CSV export + email notifications
```

---

## Files That Change in Each Phase

### Phase 1 — New files:
- `backend/` (entire directory — ~20 files)
- `src/lib/supabase.ts`
- `src/hooks/useAuth.ts`
- `src/components/Auth.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/lib/api.ts`

### Phase 1 — Modified files:
- `src/App.tsx` — wrap in auth, replace useState with Supabase queries
- `package.json` — add `@supabase/supabase-js`
- `.env` (new) — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

### Phase 2 — New files:
- `backend/app/scrapers/dgft_scraper.py`
- `backend/app/scrapers/eu_cbam.py`
- `backend/app/scrapers/hs_code_importer.py`
- `backend/app/scrapers/scheduler.py`
- `.github/workflows/scrape.yml`

### Phase 2 — Modified files:
- `scripts/scrape_trade_connect.py` → moved to `backend/app/scrapers/trade_connect.py` and expanded
- `src/components/views/FTASchemes.tsx` — fetch from API
- `src/components/views/Alerts.tsx` — subscribe to Supabase Realtime
- `src/App.tsx` — risk/checklist/alerts come from API

### Phase 3 — New files:
- `backend/app/routers/public.py`
- `backend/app/middleware/api_key_auth.py`
- `backend/app/middleware/rate_limiter.py`

### Phase 4-6 — New files:
- `backend/app/services/cbam_report.py`
- `backend/app/routers/billing.py`
- `src/components/views/Pricing.tsx`

### Files that STAY UNCHANGED:
- `src/components/Badge.tsx`, `Button.tsx`, `Card.tsx`, `Tabs.tsx`, `RiskGauge.tsx`, `Spinner.tsx`, `LoadingSkeleton.tsx`, `Toast.tsx`, `EmptyState.tsx` — all UI components stay as-is
- `src/styles/colors.ts`, `src/theme/index.ts` — styling stays
- `src/types/index.ts` — may add new types but existing ones stay
- All `*.test.ts/tsx` files — update imports but keep test logic
