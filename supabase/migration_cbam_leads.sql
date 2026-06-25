-- ============================================================
-- Migration: CBAM lead capture from public checker
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cbam_leads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT NOT NULL,
  company     TEXT,
  hs_codes    TEXT[],        -- codes the user checked
  any_in_scope BOOLEAN,      -- whether any HS code hit CBAM Annex I
  sectors     TEXT[],        -- CBAM sectors found (steel, cement, etc.)
  source      TEXT DEFAULT 'cbam-checker',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cbam_leads_email ON public.cbam_leads (email);
CREATE INDEX IF NOT EXISTS idx_cbam_leads_created ON public.cbam_leads (created_at DESC);

-- RLS: anon can INSERT (lead capture), only service_role can SELECT
ALTER TABLE public.cbam_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can submit CBAM leads"
  ON public.cbam_leads FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Service role full access on cbam_leads"
  ON public.cbam_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users (admins) can read leads
CREATE POLICY "Authenticated can read cbam_leads"
  ON public.cbam_leads FOR SELECT TO authenticated USING (true);
