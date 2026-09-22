-- ============================================================
-- DGFT Preferential Certificate of Origin (CoO) integration
-- Trade Notice 25/2026-27 — Phase 1: schema extensions + application ledger.
--
-- All new shipments columns are nullable / additive: existing shipment
-- reads, writes and the current unofficial PDF export keep working
-- unchanged. The real DGFT submission flow (auth, encryption, dispatch)
-- is not wired up in this migration — this only prepares the data model
-- and gives Phase 2 a place to track submissions.
-- ============================================================

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS district                 TEXT,
  ADD COLUMN IF NOT EXISTS port_of_loading           TEXT,
  ADD COLUMN IF NOT EXISTS port_of_discharge         TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number            TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date              DATE,
  ADD COLUMN IF NOT EXISTS uom                       TEXT,
  ADD COLUMN IF NOT EXISTS quantity                  NUMERIC,
  ADD COLUMN IF NOT EXISTS package_marks_numbers     TEXT,
  ADD COLUMN IF NOT EXISTS importer_address          TEXT,
  ADD COLUMN IF NOT EXISTS importer_email            TEXT,
  ADD COLUMN IF NOT EXISTS producer_details          TEXT,
  ADD COLUMN IF NOT EXISTS origin_criterion          TEXT,
  ADD COLUMN IF NOT EXISTS is_retrospective          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reason_retrospective      TEXT,
  ADD COLUMN IF NOT EXISTS is_exhibition              BOOLEAN NOT NULL DEFAULT FALSE;

-- Note: `shipments.quantity` did not previously exist as a dedicated column;
-- existing code reads quantity off the in-app Shipment object, not this
-- table, so adding it here is additive and does not collide with any prior
-- column of a different type.

CREATE TABLE IF NOT EXISTS public.coo_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id       UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_id        TEXT NOT NULL UNIQUE,
  certificate_no    TEXT,
  status            TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'IN_PROCESS', 'APPROVED', 'CERTIFICATE_ISSUED', 'REJECTED')),
  dgft_response     JSONB,
  certified_pdf_url TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- request_id is the idempotency key: a resend after a timeout must reuse the
-- same request_id rather than mint a new one, so the UNIQUE constraint above
-- is what actually stops duplicate certificate creation at DGFT.

CREATE INDEX IF NOT EXISTS idx_coo_applications_shipment ON public.coo_applications (shipment_id);
CREATE INDEX IF NOT EXISTS idx_coo_applications_company  ON public.coo_applications (company_id, status);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coo_applications_updated_at ON public.coo_applications;
CREATE TRIGGER trg_coo_applications_updated_at
  BEFORE UPDATE ON public.coo_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.coo_applications ENABLE ROW LEVEL SECURITY;

-- Reuses the existing get_user_company_id() helper (schema.sql) so this table
-- follows the same company-scoping pattern as shipments / checklist_progress.
DROP POLICY IF EXISTS coo_applications_select ON public.coo_applications;
CREATE POLICY coo_applications_select ON public.coo_applications
  FOR SELECT USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS coo_applications_insert ON public.coo_applications;
CREATE POLICY coo_applications_insert ON public.coo_applications
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

DROP POLICY IF EXISTS coo_applications_update ON public.coo_applications;
CREATE POLICY coo_applications_update ON public.coo_applications
  FOR UPDATE USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

COMMENT ON TABLE public.coo_applications IS
  'Ledger of DGFT Preferential Certificate of Origin submissions (Trade Notice 25/2026-27). request_id is the idempotency key used to dedupe retries after a timeout.';
