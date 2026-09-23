-- WhatsApp notification settings per company
-- Run in Supabase SQL Editor

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE;

-- Track which alerts have already been dispatched to avoid duplicates
CREATE TABLE IF NOT EXISTS whatsapp_alert_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  alert_key   TEXT NOT NULL,                -- e.g. "regulation_change:EU:2026-06-29"
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phone_to    TEXT NOT NULL,
  UNIQUE (company_id, alert_key)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_log_company ON whatsapp_alert_log(company_id);

ALTER TABLE whatsapp_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert log"
  ON whatsapp_alert_log
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );
