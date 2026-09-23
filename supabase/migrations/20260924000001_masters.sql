-- ============================================================
-- Masters: buyers, products, bank accounts, signatories
--
-- Per-company records an exporter reuses across invoices. A master only
-- PREFILLS a draft: picking one copies its values into the draft form, and
-- the invoice stores those values as its snapshot. So:
--   * there is NO foreign key from invoices (or lines) to any master. A link
--     with ON DELETE SET NULL would try to UPDATE issued invoices, which
--     invoices_guard() refuses, and a master once used could never be
--     deleted. Nothing references these tables; editing or deleting a row
--     here cannot reach an invoice.
--   * nothing existing is rewritten or backfilled. The masters start empty.
--
-- invoices gains signatory_name / signatory_designation, nullable with no
-- default: existing rows get NULL without being rewritten and no trigger
-- fires. invoices_guard() is NOT changed: it compares to_jsonb(NEW) - mutable
-- with to_jsonb(OLD) - mutable, so both columns are immutable after issue
-- automatically, like every other snapshot column.
--
-- Duplicates are refused per company, ignoring case and surrounding spaces.
-- At most one default bank account and one default signatory per company;
-- the app fills those into NEW drafts only.
-- ============================================================

CREATE TABLE public.buyers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name           text NOT NULL CHECK (length(btrim(name)) > 0),
  address        text,
  country        text NOT NULL CHECK (length(btrim(country)) > 0),
  tax_id         text,
  -- Defaults copied into a draft only when set.
  payment_terms  text,
  currency       text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  incoterm       text CHECK (incoterm IS NULL OR incoterm IN
                   ('EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.buyers IS
  'Buyer master. Prefills the buyer (or consignee) block of a draft invoice; invoices copy the values, they never reference this table.';

CREATE UNIQUE INDEX buyers_unique_name_country
  ON public.buyers (company_id, lower(btrim(name)), lower(btrim(country)));


CREATE TABLE public.products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description  text NOT NULL CHECK (length(btrim(description)) > 0),
  hs_code      text NOT NULL CHECK (hs_code ~ '^[0-9]{4,8}$'),
  uom          text NOT NULL CHECK (length(btrim(uom)) > 0),
  unit_price   numeric(14,4) CHECK (unit_price IS NULL OR unit_price >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.products IS
  'Product master. Prefills description, HS code, unit and (if set) unit price on a draft invoice line.';

CREATE UNIQUE INDEX products_unique_description_hs
  ON public.products (company_id, lower(btrim(description)), hs_code);


CREATE TABLE public.bank_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_name       text NOT NULL CHECK (length(btrim(bank_name)) > 0),
  branch          text,
  account_number  text NOT NULL CHECK (length(btrim(account_number)) > 0),
  ifsc            text CHECK (ifsc IS NULL OR ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  swift           text CHECK (swift IS NULL OR swift ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  ad_code         text,
  is_default      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bank_accounts IS
  'Exporter bank master. Prefills the six exporter_bank_* snapshot columns of a draft invoice.';

CREATE UNIQUE INDEX bank_accounts_unique_account
  ON public.bank_accounts (company_id, lower(btrim(bank_name)), regexp_replace(account_number, '\s', '', 'g'));
CREATE UNIQUE INDEX bank_accounts_one_default
  ON public.bank_accounts (company_id) WHERE is_default;


CREATE TABLE public.signatories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name         text NOT NULL CHECK (length(btrim(name)) > 0),
  designation  text,
  is_default   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.signatories IS
  'Authorised signatory master. Prefills invoices.signatory_name / signatory_designation on a draft.';

CREATE UNIQUE INDEX signatories_unique_name
  ON public.signatories (company_id, lower(btrim(name)));
CREATE UNIQUE INDEX signatories_one_default
  ON public.signatories (company_id) WHERE is_default;


CREATE TRIGGER set_buyers_updated_at        BEFORE UPDATE ON public.buyers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_products_updated_at      BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_signatories_updated_at   BEFORE UPDATE ON public.signatories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ------------------------------------------------------------
-- Row-level security: a company sees and edits only its own masters.
-- No CA read policy: masters only feed drafts, and CAs don't draft.
-- ------------------------------------------------------------

ALTER TABLE public.buyers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatories   ENABLE ROW LEVEL SECURITY;

CREATE POLICY buyers_select ON public.buyers FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY buyers_insert ON public.buyers FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY buyers_update ON public.buyers FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY buyers_delete ON public.buyers FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY products_select ON public.products FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY bank_accounts_select ON public.bank_accounts FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY bank_accounts_insert ON public.bank_accounts FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY bank_accounts_update ON public.bank_accounts FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY bank_accounts_delete ON public.bank_accounts FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY signatories_select ON public.signatories FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY signatories_insert ON public.signatories FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY signatories_update ON public.signatories FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY signatories_delete ON public.signatories FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id());

REVOKE ALL ON public.buyers        FROM anon;
REVOKE ALL ON public.products      FROM anon;
REVOKE ALL ON public.bank_accounts FROM anon;
REVOKE ALL ON public.signatories   FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyers        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signatories   TO authenticated;
GRANT ALL ON public.buyers        TO service_role;
GRANT ALL ON public.products      TO service_role;
GRANT ALL ON public.bank_accounts TO service_role;
GRANT ALL ON public.signatories   TO service_role;


-- ------------------------------------------------------------
-- Signatory snapshot on the invoice. Immutable after issue via the existing
-- invoices_guard() diff; no change to the guard.
-- ------------------------------------------------------------

ALTER TABLE public.invoices
  ADD COLUMN signatory_name         text,
  ADD COLUMN signatory_designation  text;

COMMENT ON COLUMN public.invoices.signatory_name IS
  'Authorised signatory printed on the document, copied at drafting (usually from a signatory master). NULL on invoices issued before masters existed; they print "Authorised Signatory" with no name, as before.';
