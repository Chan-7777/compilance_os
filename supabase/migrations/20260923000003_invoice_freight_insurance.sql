-- ============================================================
-- Freight and insurance on the invoice
--
-- RoDTEP is paid on FOB. A CFR/CPT invoice value includes freight, and a
-- CIF/CIP value includes freight and insurance. Without these amounts the
-- invoice cannot be reduced to FOB, so per-line RoDTEP (src/lib/shipment-lines.ts)
-- would either overstate the claim or have no figure at all.
--
-- Both amounts are in the invoice currency, recorded once per invoice, and
-- split across lines by line value when the shipment is priced.
--
-- invoices_guard() diffs to_jsonb(NEW) minus its mutable list, so both new
-- columns are immutable after issue with no further change. The only change
-- to the guard is a check at the draft -> issued transition: a commercial
-- invoice on CFR/CPT needs freight, on CIF/CIP freight and insurance.
--
-- That check lives in the trigger, NOT in a CHECK constraint. A CHECK is
-- re-evaluated on every UPDATE of the row, so any invoice already issued
-- on CIF before this migration could then never be cancelled or relinked to
-- a shipment. The trigger only fires on the issue transition. Such older
-- invoices simply produce no RoDTEP figure (shown as such), never a guess.
-- ============================================================

ALTER TABLE public.invoices
  ADD COLUMN freight_amount   numeric(16,2) CHECK (freight_amount IS NULL OR freight_amount >= 0),
  ADD COLUMN insurance_amount numeric(16,2) CHECK (insurance_amount IS NULL OR insurance_amount >= 0);

COMMENT ON COLUMN public.invoices.freight_amount IS
  'Freight included in a CFR/CPT/CIF/CIP invoice value, invoice currency. Deducted, split by line value, to reach FOB for RoDTEP.';
COMMENT ON COLUMN public.invoices.insurance_amount IS
  'Insurance included in a CIF/CIP invoice value, invoice currency. Deducted, split by line value, to reach FOB for RoDTEP.';


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
      -- A commercial invoice's value feeds RoDTEP on FOB. Its freight and
      -- insurance must be known to get there.
      IF NEW.kind = 'commercial' THEN
        IF NEW.incoterm IN ('CFR', 'CPT', 'CIF', 'CIP') AND NEW.freight_amount IS NULL THEN
          RAISE EXCEPTION 'A % invoice needs a freight amount before it is issued', NEW.incoterm
            USING ERRCODE = 'check_violation';
        END IF;
        IF NEW.incoterm IN ('CIF', 'CIP') AND NEW.insurance_amount IS NULL THEN
          RAISE EXCEPTION 'A % invoice needs an insurance amount before it is issued', NEW.incoterm
            USING ERRCODE = 'check_violation';
        END IF;
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
