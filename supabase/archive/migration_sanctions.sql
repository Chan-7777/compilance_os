-- ============================================================
-- Migration: OFAC SDN Sanctions screening tables
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sanctions_entries (
  uid         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  name_norm   TEXT NOT NULL,   -- uppercase, stripped of punctuation (for search)
  entity_type TEXT,            -- 'individual', 'vessel', 'aircraft', 'entity'
  program     TEXT,            -- OFAC sanctions program e.g. IRAN, RUSSIA, CUBA
  remarks     TEXT,            -- DOB, nationality, passport etc.
  source      TEXT NOT NULL DEFAULT 'OFAC SDN',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sanctions_aliases (
  id          SERIAL PRIMARY KEY,
  uid         TEXT NOT NULL REFERENCES public.sanctions_entries(uid) ON DELETE CASCADE,
  alias       TEXT NOT NULL,
  alias_norm  TEXT NOT NULL,
  alias_type  TEXT            -- 'aka', 'fka', 'nka'
);

-- Full-text search indexes (fast for name lookups)
CREATE INDEX IF NOT EXISTS idx_sanctions_entries_fts
  ON public.sanctions_entries
  USING gin(to_tsvector('simple', name_norm));

CREATE INDEX IF NOT EXISTS idx_sanctions_aliases_fts
  ON public.sanctions_aliases
  USING gin(to_tsvector('simple', alias_norm));

-- Exact-match index
CREATE INDEX IF NOT EXISTS idx_sanctions_entries_name ON public.sanctions_entries (name_norm);
CREATE INDEX IF NOT EXISTS idx_sanctions_aliases_norm ON public.sanctions_aliases (alias_norm);

-- RLS
ALTER TABLE public.sanctions_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanctions_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on sanctions_entries"
  ON public.sanctions_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on sanctions_aliases"
  ON public.sanctions_aliases FOR SELECT TO authenticated USING (true);

-- Service role can insert/delete for seeding
CREATE POLICY "Service role full access on sanctions_entries"
  ON public.sanctions_entries FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on sanctions_aliases"
  ON public.sanctions_aliases FOR ALL TO service_role USING (true) WITH CHECK (true);
