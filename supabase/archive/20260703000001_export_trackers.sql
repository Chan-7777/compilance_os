-- Migration: Export Trackers — IGST, BRC/FIRC, AA, EPCG
-- These four tables form the core "money recovery" and "obligation compliance" flows
-- for Indian exporters who are paid subscribers.

-- ── 1. IGST Refund Claims ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.igst_claims (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id         UUID REFERENCES shipments(id) ON DELETE SET NULL,
  shipping_bill_no    TEXT NOT NULL,
  shipping_bill_date  DATE NOT NULL,
  port_code           TEXT,
  hs_code             TEXT,
  invoice_value       NUMERIC(18, 2) NOT NULL,
  igst_paid           NUMERIC(18, 2) NOT NULL,
  arn_no              TEXT,
  refund_status       TEXT NOT NULL DEFAULT 'filed'
    CHECK (refund_status IN ('filed', 'under_processing', 'sanctioned', 'credited', 'deficiency_memo')),
  refund_amount       NUMERIC(18, 2),
  credited_date       DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.igst_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_igst_claims"
  ON public.igst_claims FOR ALL
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_igst_claims_company ON igst_claims(company_id);
CREATE INDEX IF NOT EXISTS idx_igst_claims_status  ON igst_claims(company_id, refund_status);

-- ── 2. BRC / FIRC Records ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brc_firc_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id         UUID REFERENCES shipments(id) ON DELETE SET NULL,
  document_type       TEXT NOT NULL DEFAULT 'brc'
    CHECK (document_type IN ('brc', 'firc')),
  document_no         TEXT,
  invoice_no          TEXT,
  invoice_date        DATE,
  invoice_amount      NUMERIC(18, 2) NOT NULL,
  invoice_currency    TEXT NOT NULL DEFAULT 'USD',
  realized_amount     NUMERIC(18, 2),
  realized_currency   TEXT DEFAULT 'INR',
  realization_date    DATE,
  bank_name           TEXT,
  ad_code             TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'realized', 'overdue')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.brc_firc_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_brc_firc_records"
  ON public.brc_firc_records FOR ALL
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_brc_firc_company ON brc_firc_records(company_id);
CREATE INDEX IF NOT EXISTS idx_brc_firc_status  ON brc_firc_records(company_id, status);

-- ── 3. Advance Authorization (AA) Licenses ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aa_licenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  license_no          TEXT NOT NULL,
  issue_date          DATE NOT NULL,
  validity_date       DATE NOT NULL,
  hs_codes            TEXT[],
  import_obligation   NUMERIC(18, 2),
  export_obligation   NUMERIC(18, 2),
  import_fulfilled    NUMERIC(18, 2) NOT NULL DEFAULT 0,
  export_fulfilled    NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'fulfilled', 'expired', 'surrendered')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.aa_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_aa_licenses"
  ON public.aa_licenses FOR ALL
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_aa_licenses_company ON aa_licenses(company_id);

-- ── 4. EPCG Licenses ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.epcg_licenses (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  license_no                TEXT NOT NULL,
  issue_date                DATE NOT NULL,
  validity_date             DATE NOT NULL,
  duty_saved                NUMERIC(18, 2) NOT NULL,
  export_obligation         NUMERIC(18, 2) NOT NULL,
  export_fulfilled          NUMERIC(18, 2) NOT NULL DEFAULT 0,
  obligation_period_years   INTEGER NOT NULL DEFAULT 6,
  status                    TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'fulfilled', 'defaulted', 'extended')),
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.epcg_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_epcg_licenses"
  ON public.epcg_licenses FOR ALL
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_epcg_licenses_company ON epcg_licenses(company_id);
