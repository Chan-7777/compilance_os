-- ============================================================================
-- Phase 4 Migration: Pre-Shipment Compliance Gate + API Key Enhancements
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- 1. Add columns to shipments for gate tracking
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS hs_code TEXT,
  ADD COLUMN IF NOT EXISTS shipment_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS gate_status TEXT DEFAULT 'pending'
    CHECK (gate_status IN ('pending', 'approved', 'blocked'));

-- 2. Compliance gate results table
CREATE TABLE IF NOT EXISTS compliance_gates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  hs_validation JSONB NOT NULL DEFAULT '{}',
  fta_eligibility JSONB NOT NULL DEFAULT '{}',
  coo_requirement JSONB NOT NULL DEFAULT '{}',
  rules_of_origin JSONB NOT NULL DEFAULT '{}',
  checklist_progress JSONB NOT NULL DEFAULT '{}',
  gate_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (gate_status IN ('pending', 'approved', 'blocked')),
  blocking_reasons TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shipment_id)
);

-- 3. RLS for compliance_gates
ALTER TABLE compliance_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_gates_select" ON compliance_gates
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "company_gates_insert" ON compliance_gates
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "company_gates_update" ON compliance_gates
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "company_gates_delete" ON compliance_gates
  FOR DELETE USING (company_id = get_user_company_id());

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_gates_shipment ON compliance_gates(shipment_id);
CREATE INDEX IF NOT EXISTS idx_compliance_gates_company ON compliance_gates(company_id);
CREATE INDEX IF NOT EXISTS idx_shipments_gate_status ON shipments(gate_status);

-- 5. Updated_at trigger for compliance_gates
CREATE TRIGGER set_compliance_gates_updated_at
  BEFORE UPDATE ON compliance_gates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
