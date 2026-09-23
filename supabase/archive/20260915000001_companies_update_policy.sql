-- ============================================================
-- Let users update their own company
--
-- companies had SELECT policies only. With row-level security on, an UPDATE
-- from the browser matched no rows and returned no error. Onboarding answers,
-- Settings profile edits and WhatsApp notification settings were all silently
-- dropped, which is why every company stayed "My Company" with null fields.
--
-- Users may update only their own company, and only the columns the app
-- writes. plan is deliberately left out so nobody can upgrade themselves
-- through the REST API.
-- ============================================================

DROP POLICY IF EXISTS companies_own_update ON public.companies;

CREATE POLICY companies_own_update ON public.companies
  FOR UPDATE TO authenticated
  USING (id = get_user_company_id())
  WITH CHECK (id = get_user_company_id());

REVOKE UPDATE ON public.companies FROM authenticated;

GRANT UPDATE (
  onboarded_at, trade_role,
  name, size, iec, gstin,
  address, city, state, pin, state_code, port_of_loading,
  designation, whatsapp, turnover_range, years_exporting,
  known_regulations, compliance_confidence, past_compliance_issues, pain_points,
  whatsapp_number, whatsapp_alerts
) ON public.companies TO authenticated;
