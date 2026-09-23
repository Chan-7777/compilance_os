-- ============================================================
-- Migration: Extend regulatory_changes for live RSS/NewsAPI feed
-- Run in Supabase SQL Editor
-- ============================================================

-- Add columns needed by the feed fetcher
ALTER TABLE regulatory_changes
  ADD COLUMN IF NOT EXISTS title          TEXT,
  ADD COLUMN IF NOT EXISTS alert_type     TEXT NOT NULL DEFAULT 'regulation_change'
    CHECK (alert_type IN ('deadline', 'regulation_change', 'fta_update', 'info')),
  ADD COLUMN IF NOT EXISTS source_name    TEXT,
  ADD COLUMN IF NOT EXISTS external_id    TEXT,
  ADD COLUMN IF NOT EXISTS product_tags   TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS country_name   TEXT,
  ADD COLUMN IF NOT EXISTS flag           TEXT;

-- Unique constraint on external_id to deduplicate feed items
CREATE UNIQUE INDEX IF NOT EXISTS idx_regulatory_changes_external_id
  ON regulatory_changes (external_id)
  WHERE external_id IS NOT NULL;

-- Backfill country_name + flag from existing rows (best effort)
UPDATE regulatory_changes SET country_name = 'European Union', flag = '🇪🇺' WHERE country_code = 'EU'  AND country_name IS NULL;
UPDATE regulatory_changes SET country_name = 'United States',  flag = '🇺🇸' WHERE country_code = 'US'  AND country_name IS NULL;
UPDATE regulatory_changes SET country_name = 'United Kingdom', flag = '🇬🇧' WHERE country_code = 'UK'  AND country_name IS NULL;
UPDATE regulatory_changes SET country_name = 'UAE',            flag = '🇦🇪' WHERE country_code = 'UAE' AND country_name IS NULL;
UPDATE regulatory_changes SET country_name = 'Japan',          flag = '🇯🇵' WHERE country_code = 'Japan'     AND country_name IS NULL;
UPDATE regulatory_changes SET country_name = 'Australia',      flag = '🇦🇺' WHERE country_code = 'Australia' AND country_name IS NULL;

-- Index for fast country + date queries
CREATE INDEX IF NOT EXISTS idx_regulatory_changes_date
  ON regulatory_changes (scraped_at DESC);
