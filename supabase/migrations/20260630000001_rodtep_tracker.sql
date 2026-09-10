-- Migration: RoDTEP Claim Tracker
-- Adds hs_code, shipment_value, currency, and shipping_bill_number
-- to the shipments table so RoDTEP entitlements can be tracked
-- per shipment and aggregated into a claim report.

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS hs_code           TEXT,
  ADD COLUMN IF NOT EXISTS shipment_value    NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS value_currency    TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS shipping_bill_no  TEXT,
  ADD COLUMN IF NOT EXISTS rodtep_rate       NUMERIC(6, 4),
  ADD COLUMN IF NOT EXISTS rodtep_claimed    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rodtep_claim_date DATE;

CREATE INDEX IF NOT EXISTS idx_shipments_hs_code
  ON public.shipments (hs_code)
  WHERE hs_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_rodtep_unclaimed
  ON public.shipments (company_id, rodtep_claimed)
  WHERE rodtep_claimed = FALSE AND hs_code IS NOT NULL AND shipment_value IS NOT NULL;
