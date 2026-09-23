-- Add onboarding profile columns to companies table
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS designation       TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp          TEXT,
  ADD COLUMN IF NOT EXISTS turnover_range    TEXT,
  ADD COLUMN IF NOT EXISTS years_exporting   TEXT,
  ADD COLUMN IF NOT EXISTS known_regulations TEXT[],
  ADD COLUMN IF NOT EXISTS compliance_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS past_compliance_issues TEXT[],
  ADD COLUMN IF NOT EXISTS pain_points       TEXT[];
