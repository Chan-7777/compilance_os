-- ============================================================================
-- ComplianceOS Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. COMPANIES & USERS
-- ==========================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'My Company',
  size TEXT NOT NULL DEFAULT 'small'
    CHECK (size IN ('micro', 'small', 'medium', 'large')),
  iec TEXT,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'growth', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'admin', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 2. REFERENCE DATA (public, no RLS)
-- ==========================================

CREATE TABLE countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag TEXT NOT NULL,
  cbam_config JSONB NOT NULL DEFAULT '{}',
  esg_config JSONB NOT NULL DEFAULT '{}',
  packaging TEXT[] NOT NULL DEFAULT '{}',
  labeling TEXT[] NOT NULL DEFAULT '{}',
  customs TEXT[] NOT NULL DEFAULT '{}',
  sanctions TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  product_category TEXT NOT NULL,
  cert_list TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, product_category)
);

CREATE TABLE product_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  hs_prefix TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE fta_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Active', 'Under Negotiation', 'No FTA')),
  effective_date DATE,
  round TEXT,
  preferential_tariff BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code)
);

CREATE TABLE hs_tariff_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hs_code TEXT NOT NULL,
  hs_description TEXT,
  country_code TEXT NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  agreement TEXT,
  mfn_rate NUMERIC(6,2) NOT NULL,
  preferential_rate NUMERIC(6,2) NOT NULL,
  rule_of_origin TEXT,
  product_category TEXT,
  source TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hs_code, country_code, agreement)
);

CREATE TABLE hs_codes (
  code TEXT PRIMARY KEY,
  chapter TEXT NOT NULL,
  description TEXT NOT NULL,
  product_category TEXT,
  export_policy TEXT DEFAULT 'Free',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE export_schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  source_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE regulatory_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  date TEXT NOT NULL,
  change_description TEXT NOT NULL,
  source_url TEXT,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('critical', 'warning', 'info')),
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. USER DATA (RLS protected)
-- ==========================================

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product TEXT NOT NULL,
  country TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'preparing', 'in_progress', 'in_transit', 'delivered')),
  risk_score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE checklist_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  product TEXT NOT NULL,
  checked_items JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, shipment_id, country_code)
);

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  selected_product TEXT NOT NULL DEFAULT 'steel',
  selected_countries TEXT[] NOT NULL DEFAULT '{EU,UAE}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id)
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 4. API KEYS (for third-party access)
-- ==========================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{read}',
  rate_limit INTEGER NOT NULL DEFAULT 1000,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- ==========================================
-- 5. ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid()
$$;

-- Shipments: users see only their company's data
CREATE POLICY "company_shipments_select" ON shipments
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "company_shipments_insert" ON shipments
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "company_shipments_update" ON shipments
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "company_shipments_delete" ON shipments
  FOR DELETE USING (company_id = get_user_company_id());

-- Checklist progress: same pattern
CREATE POLICY "company_checklist_select" ON checklist_progress
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "company_checklist_insert" ON checklist_progress
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "company_checklist_update" ON checklist_progress
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "company_checklist_delete" ON checklist_progress
  FOR DELETE USING (company_id = get_user_company_id());

-- User settings
CREATE POLICY "company_settings_select" ON user_settings
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "company_settings_insert" ON user_settings
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "company_settings_update" ON user_settings
  FOR UPDATE USING (company_id = get_user_company_id());

-- Audit log: read-only for the company
CREATE POLICY "company_audit_select" ON audit_log
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "company_audit_insert" ON audit_log
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- API keys
CREATE POLICY "company_apikeys_all" ON api_keys
  FOR ALL USING (company_id = get_user_company_id());

-- ==========================================
-- 6. INDEXES
-- ==========================================

CREATE INDEX idx_shipments_company ON shipments(company_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_checklist_company ON checklist_progress(company_id);
CREATE INDEX idx_checklist_shipment ON checklist_progress(shipment_id);
CREATE INDEX idx_hs_tariff_country ON hs_tariff_rates(country_code);
CREATE INDEX idx_hs_tariff_code ON hs_tariff_rates(hs_code);
CREATE INDEX idx_regulatory_changes_country ON regulatory_changes(country_code);
CREATE INDEX idx_audit_log_company ON audit_log(company_id);
CREATE INDEX idx_certifications_country ON certifications(country_code);

-- ==========================================
-- 7. AUTO-CREATE COMPANY ON USER SIGNUP
-- ==========================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a company for the new user
  INSERT INTO companies (name) VALUES ('My Company')
  RETURNING id INTO new_company_id;

  -- Create user profile linked to the company
  INSERT INTO user_profiles (id, company_id, email, full_name)
  VALUES (
    NEW.id,
    new_company_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- Create default settings
  INSERT INTO user_settings (company_id)
  VALUES (new_company_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==========================================
-- 8. UPDATED_AT TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_shipments_updated_at
  BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_checklist_updated_at
  BEFORE UPDATE ON checklist_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_settings_updated_at
  BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
