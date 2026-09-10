-- ============================================================
-- Onboarding completion tracking
--
-- Before this, App.tsx decided whether to show onboarding by testing
-- `auth.user && !auth.profile`. That is a failure signal, not a completion
-- signal: it only fired when the profile could not be read, and in exactly
-- that state persistProfile/persistSettings returned early, so every answer
-- the user gave was discarded. Once profiles load correctly the condition is
-- never true and onboarding stops appearing at all.
--
-- user_settings cannot stand in for it either: selected_product is
-- NOT NULL DEFAULT 'steel' and the signup trigger inserts a row, so every
-- company looks pre-configured from the moment it is created.
--
-- onboarded_at is an explicit flag. NULL means the form has not been
-- completed, whatever else the row contains.
-- ============================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trade_role   TEXT
    CHECK (trade_role IN ('exporter', 'importer', 'both'));

COMMENT ON COLUMN public.companies.onboarded_at IS
  'Set when the onboarding form is completed. NULL means show onboarding.';

COMMENT ON COLUMN public.companies.trade_role IS
  'Answer to onboarding step 1: exporter, importer or both.';
