-- Migration: WhatsApp notification settings per company

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS whatsapp_alert_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  alert_key   TEXT NOT NULL,
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
