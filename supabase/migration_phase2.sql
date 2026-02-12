-- Phase 2 Migration: Scraper infrastructure

-- Scraper run tracking table
CREATE TABLE IF NOT EXISTS scraper_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scraper_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scraper_runs_name ON scraper_runs(scraper_name);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_started ON scraper_runs(started_at DESC);

-- Add India as a country (for DGFT domestic regulation alerts)
INSERT INTO countries (code, name, flag, cbam_config, esg_config)
VALUES ('IN', 'India (Domestic Regulations)', '🇮🇳', '{}', '{}')
ON CONFLICT (code) DO NOTHING;
