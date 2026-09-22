-- ============================================================
-- Migration: CA Multi-Client Dashboard
-- ============================================================

-- Track which CA companies manage which exporter companies
CREATE TABLE IF NOT EXISTS public.ca_relationships (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ca_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_label  TEXT,            -- optional nickname the CA gives this client
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ca_company_id, client_company_id)
);

-- CA can see their own relationships
ALTER TABLE public.ca_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ca_can_manage_own_relationships"
  ON public.ca_relationships
  FOR ALL
  USING (
    ca_company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- CA users can read basic info of their linked client companies
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

-- CA users can read shipments of their linked clients
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

-- Add plan column to companies if not already present
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'exporter', 'professional', 'ca', 'enterprise'));

-- Index for fast CA lookups
CREATE INDEX IF NOT EXISTS idx_ca_relationships_ca ON ca_relationships(ca_company_id);
CREATE INDEX IF NOT EXISTS idx_ca_relationships_client ON ca_relationships(client_company_id);
