-- Migration: CA Multi-Client Dashboard

CREATE TABLE IF NOT EXISTS public.ca_relationships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_label  TEXT,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ca_company_id, client_company_id)
);

ALTER TABLE public.ca_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ca_can_manage_own_relationships"
  ON public.ca_relationships
  FOR ALL
  USING (
    ca_company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "ca_can_read_client_companies"
  ON public.companies
  FOR SELECT
  USING (
    id IN (
      SELECT client_company_id FROM ca_relationships
      WHERE ca_company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "ca_can_read_client_shipments"
  ON public.shipments
  FOR SELECT
  USING (
    company_id IN (
      SELECT client_company_id FROM ca_relationships
      WHERE ca_company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'exporter', 'professional', 'ca', 'enterprise'));

CREATE INDEX IF NOT EXISTS idx_ca_relationships_ca ON ca_relationships(ca_company_id);
CREATE INDEX IF NOT EXISTS idx_ca_relationships_client ON ca_relationships(client_company_id);
