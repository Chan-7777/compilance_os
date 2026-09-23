-- ============================================================
-- Invoices and their line items
--
-- Line items live on the INVOICE, not on shipments. 27 files read
-- Shipment.hsCode as the single HS code of a shipment; putting several lines
-- there would make shipment_value and hs_code ambiguous and silently produce
-- wrong RoDTEP figures. shipment_id is a loose link: an invoice can exist
-- before its shipment (proforma), and a shipping bill import can attach one
-- later, so it stays editable even after issue.
--
-- Invoice numbers are INPUT, never minted here. IGST refunds match the
-- shipping bill to GSTR-1 by invoice number, and above Rs 5cr turnover the
-- number belongs to an e-invoice with an IRN from the IRP. So the exporter's
-- own number, date and (if any) IRN are stored as given.
--
-- Issued invoices are SNAPSHOTS. Exporter, buyer, consignee, Incoterm, FX rate
-- and every line are copied onto these rows at issue, so later edits to the
-- company profile or a buyer can never rewrite a document already sent to a
-- customer or matched against a shipping bill. Once issued:
--   * the only permitted change is status issued -> cancelled (with reason),
--     plus relinking shipment_id;
--   * line items can't be inserted, changed or deleted;
--   * signed-in users can't delete the invoice.
-- Corrections go via cancel-and-reissue or a credit/debit note.
-- ============================================================

CREATE TABLE public.invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  shipment_id       uuid REFERENCES public.shipments(id) ON DELETE SET NULL,

  kind              text NOT NULL DEFAULT 'commercial'
                      CHECK (kind IN ('proforma', 'commercial')),
  status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'issued', 'cancelled')),

  -- Supplied by the exporter (their ERP / billing series), never generated.
  invoice_number    text CHECK (invoice_number IS NULL OR length(btrim(invoice_number)) BETWEEN 1 AND 16),
  invoice_date      date,
  irn               text CHECK (irn IS NULL OR irn ~ '^[0-9a-f]{64}$'),

  -- Exporter snapshot
  exporter_name     text,
  exporter_address  text,
  exporter_gstin    text,
  exporter_iec      text,
  exporter_state_code text,

  -- Buyer snapshot
  buyer_name        text,
  buyer_address     text,
  buyer_country     text,

  -- Consignee snapshot. NULL name means "same as buyer".
  consignee_name    text,
  consignee_address text,
  consignee_country text,

  -- Trade terms
  incoterm          text CHECK (incoterm IS NULL OR incoterm IN
                      ('EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP')),
  incoterm_place    text,
  port_of_loading   text,
  port_of_discharge text,
  destination_country text,

  -- Invoice currency and the INR rate it was issued at.
  currency          text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  fx_rate_inr       numeric(12,6) CHECK (fx_rate_inr IS NULL OR fx_rate_inr > 0),
  fx_rate_date      date,
  fx_rate_source    text CHECK (fx_rate_source IS NULL OR fx_rate_source IN ('cbic', 'manual', 'fallback')),

  issued_at         timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Lets line items carry company_id with a guarantee it matches the parent.
  UNIQUE (id, company_id),

  -- Nothing leaves draft without the fields a document must carry.
  CONSTRAINT invoices_issue_requires_snapshot CHECK (
    status = 'draft' OR (
          invoice_number IS NOT NULL
      AND invoice_date   IS NOT NULL
      AND exporter_name  IS NOT NULL
      AND exporter_iec   IS NOT NULL
      AND buyer_name     IS NOT NULL
      AND buyer_country  IS NOT NULL
      AND incoterm       IS NOT NULL
      AND issued_at      IS NOT NULL
    )
  ),
  -- A commercial invoice's rupee value feeds RoDTEP and IGST. It must not
  -- rest on the placeholder table in src/lib/fx.ts.
  CONSTRAINT invoices_commercial_issue_requires_real_fx CHECK (
    status = 'draft' OR kind = 'proforma' OR (
          fx_rate_inr    IS NOT NULL
      AND fx_rate_date   IS NOT NULL
      AND fx_rate_source IN ('cbic', 'manual')
    )
  ),
  CONSTRAINT invoices_cancel_requires_reason CHECK (
    status <> 'cancelled' OR (cancelled_at IS NOT NULL AND length(btrim(coalesce(cancel_reason, ''))) > 0)
  )
);

COMMENT ON TABLE public.invoices IS
  'Proforma and commercial invoices. Numbers are exporter-supplied, never minted. Issued rows are immutable snapshots; see invoices_guard().';
COMMENT ON COLUMN public.invoices.fx_rate_inr IS
  'INR per 1 unit of currency, same convention as src/lib/fx.ts.';

-- GST: a serial number is unique within a financial year (April-March).
-- Cancelled numbers stay reserved: a cancelled e-invoice number can't be reused.
CREATE UNIQUE INDEX invoices_number_unique_per_fy
  ON public.invoices (
    company_id,
    kind,
    upper(btrim(invoice_number)),
    (extract(year FROM invoice_date - interval '3 months'))
  )
  WHERE invoice_number IS NOT NULL AND invoice_date IS NOT NULL;

CREATE INDEX idx_invoices_company  ON public.invoices (company_id, invoice_date DESC);
CREATE INDEX idx_invoices_shipment ON public.invoices (shipment_id) WHERE shipment_id IS NOT NULL;


CREATE TABLE public.invoice_line_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    uuid NOT NULL,
  company_id    uuid NOT NULL,
  line_no       integer NOT NULL CHECK (line_no > 0),

  description   text NOT NULL CHECK (length(btrim(description)) > 0),
  hs_code       text NOT NULL CHECK (hs_code ~ '^[0-9]{4,8}$'),
  quantity      numeric(14,3) NOT NULL CHECK (quantity > 0),
  uom           text NOT NULL,
  unit_price    numeric(14,4) NOT NULL CHECK (unit_price >= 0),
  amount        numeric(16,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  FOREIGN KEY (invoice_id, company_id)
    REFERENCES public.invoices (id, company_id) ON DELETE CASCADE,
  UNIQUE (invoice_id, line_no)
);

COMMENT ON TABLE public.invoice_line_items IS
  'One row per invoice line. Gate check and RoDTEP iterate the distinct hs_code values here. amount is in the invoice currency.';

CREATE INDEX idx_invoice_lines_company_hs ON public.invoice_line_items (company_id, hs_code);


-- ------------------------------------------------------------
-- Immutability
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.invoices_guard() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  -- Columns that may change on an issued invoice when it is cancelled.
  -- shipment_id is a link, not document content, so it may be (re)attached
  -- when a shipping bill is matched or the shipment is deleted.
  mutable text[] := ARRAY['status', 'cancelled_at', 'cancel_reason', 'shipment_id', 'updated_at'];
BEGIN
  -- Lines are added to a draft, so an invoice can only be born a draft.
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'Invoices are created as drafts, then issued'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'draft' THEN
    IF NEW.status = 'cancelled' THEN
      RAISE EXCEPTION 'A draft invoice is deleted, not cancelled'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status = 'issued' THEN
      IF NOT EXISTS (SELECT 1 FROM public.invoice_line_items WHERE invoice_id = NEW.id) THEN
        RAISE EXCEPTION 'Cannot issue invoice % with no line items', NEW.id
          USING ERRCODE = 'check_violation';
      END IF;
      NEW.issued_at := coalesce(NEW.issued_at, now());
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'issued' AND NEW.status IN ('issued', 'cancelled')
     AND (to_jsonb(NEW) - mutable) = (to_jsonb(OLD) - mutable) THEN
    IF NEW.status = 'cancelled' THEN
      NEW.cancelled_at := coalesce(NEW.cancelled_at, now());
    ELSIF NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
       OR NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason THEN
      RAISE EXCEPTION 'Issued invoice % is immutable', OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'cancelled'
     AND NEW.status = 'cancelled'
     AND (to_jsonb(NEW) - ARRAY['shipment_id', 'updated_at']) = (to_jsonb(OLD) - ARRAY['shipment_id', 'updated_at']) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invoice % is % and cannot be edited. Cancel and reissue, or raise a credit/debit note.', OLD.id, OLD.status
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER invoices_guard
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.invoices_guard();

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


CREATE OR REPLACE FUNCTION public.invoice_line_items_guard() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  parent_status text;
BEGIN
  SELECT status INTO parent_status
    FROM public.invoices
   WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.invoice_id ELSE NEW.invoice_id END;

  -- NULL: the parent is being deleted in this statement (cascade). Allow.
  IF parent_status IS NOT NULL AND parent_status <> 'draft' THEN
    RAISE EXCEPTION 'Lines of a % invoice cannot be changed', parent_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- A line can't be moved from a draft onto an issued invoice either.
  IF TG_OP = 'UPDATE' AND NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
    RAISE EXCEPTION 'A line item cannot be moved to another invoice'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER invoice_line_items_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION public.invoice_line_items_guard();

CREATE TRIGGER set_invoice_line_items_updated_at
  BEFORE UPDATE ON public.invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ------------------------------------------------------------
-- Row-level security: same company scoping as shipments, plus a CA's
-- read-only view of its clients.
-- ------------------------------------------------------------

ALTER TABLE public.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_select ON public.invoices FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY invoices_insert ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY invoices_update ON public.invoices FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY invoices_delete_draft ON public.invoices FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND status = 'draft');

CREATE POLICY invoices_ca_read ON public.invoices FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT client_company_id FROM public.ca_relationships
     WHERE ca_company_id = public.get_user_company_id()
  ));

CREATE POLICY invoice_lines_select ON public.invoice_line_items FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY invoice_lines_insert ON public.invoice_line_items FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY invoice_lines_update ON public.invoice_line_items FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY invoice_lines_delete ON public.invoice_line_items FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY invoice_lines_ca_read ON public.invoice_line_items FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT client_company_id FROM public.ca_relationships
     WHERE ca_company_id = public.get_user_company_id()
  ));

-- Signed-out visitors have no business here, whatever the schema defaults grant.
REVOKE ALL ON public.invoices           FROM anon;
REVOKE ALL ON public.invoice_line_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_line_items TO authenticated;
GRANT ALL ON public.invoices           TO service_role;
GRANT ALL ON public.invoice_line_items TO service_role;
