-- ============================================================
-- Migration: RoDTEP rates table (Appendix 4R, wef 10-Oct-2024)
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rodtep_rates (
  hs_code     TEXT PRIMARY KEY,   -- 8-digit ITC-HS code e.g. '84011000'
  rate        NUMERIC(6,4) NOT NULL, -- % of FOB value
  notified_at TEXT,               -- notification reference
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rodtep_hs6 ON public.rodtep_rates (LEFT(hs_code, 6));

-- RLS: authenticated users can read
ALTER TABLE public.rodtep_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on rodtep_rates"
  ON public.rodtep_rates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access on rodtep_rates"
  ON public.rodtep_rates FOR ALL TO service_role USING (true) WITH CHECK (true);
