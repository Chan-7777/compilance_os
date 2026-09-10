-- Migration: RoDTEP Recovery Program
-- 1. Audit trail: which schedule tier produced each cached rate
-- 2. Claim lifecycle beyond a boolean (unclaimed → filed → credited | rejected)
-- 3. Monthly recovery digest log (dedup for the recovery-digest cron)

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS rodtep_match_type   TEXT
    CHECK (rodtep_match_type IN ('exact', 'prefix', 'default')),
  ADD COLUMN IF NOT EXISTS rodtep_claim_status TEXT NOT NULL DEFAULT 'unclaimed'
    CHECK (rodtep_claim_status IN ('unclaimed', 'filed', 'credited', 'rejected')),
  ADD COLUMN IF NOT EXISTS rodtep_claim_note   TEXT;

-- Keep legacy boolean consistent for rows claimed before this migration
UPDATE public.shipments
   SET rodtep_claim_status = 'filed'
 WHERE rodtep_claimed = TRUE AND rodtep_claim_status = 'unclaimed';

CREATE INDEX IF NOT EXISTS idx_shipments_rodtep_claim_status
  ON public.shipments (company_id, rodtep_claim_status)
  WHERE hs_code IS NOT NULL AND shipment_value IS NOT NULL;

-- Opt-in flag for the monthly recovery digest (separate from regulatory alerts)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS recovery_digest BOOLEAN NOT NULL DEFAULT TRUE;

-- ── Monthly recovery digest schedule ────────────────────────────────────────
-- Run once in the SQL editor after deploying the recovery-digest function.
-- Requires pg_cron + pg_net enabled and the service-role key in Vault:
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
--
-- select cron.schedule(
--   'recovery-digest-monthly',
--   '0 4 1 * *',   -- 04:00 UTC on the 1st = 09:30 IST
--   $$
--   select net.http_post(
--     url := '<SUPABASE_URL>/functions/v1/recovery-digest',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
