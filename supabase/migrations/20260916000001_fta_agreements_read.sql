-- ============================================================
-- Let the app read trade agreement status
--
-- fta_agreements holds six rows whose columns mirror the hardcoded FTA table
-- in the app, but it has row-level security on with no policy, so every read
-- returned nothing and the app fell back to the built-in literal. That literal
-- can only be corrected by shipping a new build, which is why the India-UK
-- entry still reads "expected conclusion 2025".
--
-- Reference data, same as rodtep_rates and hs_tariff_rates: readable by any
-- signed-in user, writable only by the service role.
-- ============================================================

ALTER TABLE public.fta_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fta_agreements_read ON public.fta_agreements;

CREATE POLICY fta_agreements_read ON public.fta_agreements
  FOR SELECT TO authenticated
  USING (true);

COMMENT ON TABLE public.fta_agreements IS
  'Trade agreement status per destination. Authoritative over the built-in table in src/data/fta.ts. updated_at is shown to users as the confirmation date.';
