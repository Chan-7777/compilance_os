-- ============================================================
-- Migration: Add buyer_name, sanctions_risk to shipments
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS buyer_name TEXT,
  ADD COLUMN IF NOT EXISTS sanctions_risk TEXT
    CHECK (sanctions_risk IN ('clear', 'flag', 'block'));

CREATE INDEX IF NOT EXISTS idx_shipments_sanctions ON public.shipments (sanctions_risk)
  WHERE sanctions_risk IN ('flag', 'block');
