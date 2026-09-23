-- ============================================================
-- Branches: invoice numbers are unique per GSTIN per financial year
--
-- GST numbers invoices per registration (GSTIN), per financial year. A
-- company with branches in two states holds two GSTINs, and each may issue
-- its own "EXP/001". invoices_number_unique_per_fy was (company, kind,
-- number, FY), so the second branch's number was refused at save.
--
-- The index gains the GSTIN, normalised here rather than trusted from the app
-- (the app upper-cases it, a direct API write need not): upper-cased, every
-- space removed, NULL / '' / blanks all the same "no GSTIN" key. So two
-- invoices without a GSTIN still collide.
--
-- That alone would open a dodge: clearing the GSTIN on a draft would let it
-- take a number a branch already used ('' <> '27...'). An invoice with no
-- GSTIN could belong to any branch, so it must collide with every one of
-- them. A unique index can't say that; invoices_number_blank_gstin_guard()
-- does, under an advisory lock on the (company, kind, number, FY) key so two
-- sessions can't both pass the check.
--
-- This only LOOSENS the index: the new key is the old key plus a column, so
-- any pair colliding on it already collided on the old one, which existing
-- rows satisfy. The guard's clash also needs the same old key, and it only
-- runs on writes. No row is updated. invoices_guard() is unchanged, and it
-- already freezes number, date and GSTIN once an invoice is issued.
--
-- The index keeps its name, so friendlyInvoiceError() in the frontend keeps
-- recognising it whichever of migration and frontend ships first.
--
-- Locks: CREATE INDEX holds SHARE on invoices (reads continue, writes wait);
-- DROP INDEX / rename / CREATE TRIGGER take stronger locks, all held to
-- commit. Production invoices is a single 8 kB page, so this is
-- milliseconds.
-- ============================================================

CREATE UNIQUE INDEX invoices_number_unique_per_fy_new
  ON public.invoices (
    company_id,
    kind,
    upper(btrim(invoice_number)),
    (extract(year FROM invoice_date - interval '3 months')),
    upper(regexp_replace(coalesce(exporter_gstin, ''), '\s', '', 'g'))
  )
  WHERE invoice_number IS NOT NULL AND invoice_date IS NOT NULL;

DROP INDEX public.invoices_number_unique_per_fy;
ALTER INDEX public.invoices_number_unique_per_fy_new RENAME TO invoices_number_unique_per_fy;

COMMENT ON INDEX public.invoices_number_unique_per_fy IS
  'GST: a number is unique per GSTIN per financial year (April-March). Cancelled numbers stay reserved. No-GSTIN invoices also clash with every branch: see invoices_number_blank_gstin_guard().';


CREATE OR REPLACE FUNCTION public.invoices_number_blank_gstin_guard() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  num   text;
  fy    numeric;
  blank boolean;
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cancelling, relinking or editing other fields never re-checks the number.
  IF TG_OP = 'UPDATE'
     AND NEW.company_id = OLD.company_id
     AND NEW.kind = OLD.kind
     AND NEW.invoice_number IS NOT DISTINCT FROM OLD.invoice_number
     AND NEW.invoice_date   IS NOT DISTINCT FROM OLD.invoice_date
     AND NEW.exporter_gstin IS NOT DISTINCT FROM OLD.exporter_gstin THEN
    RETURN NEW;
  END IF;

  -- Same normalisation as invoices_number_unique_per_fy.
  num   := upper(btrim(NEW.invoice_number));
  fy    := extract(year FROM NEW.invoice_date - interval '3 months');
  blank := regexp_replace(coalesce(NEW.exporter_gstin, ''), '\s', '', 'g') = '';

  PERFORM pg_advisory_xact_lock(
    hashtextextended('invoice_number:' || NEW.company_id || ':' || NEW.kind || ':' || num || ':' || fy, 0));

  -- Runs as the writer, under RLS. Only a member of the company can write its
  -- invoices, and a member sees all of them, so nothing relevant is hidden.
  IF EXISTS (
    SELECT 1
      FROM public.invoices i
     WHERE i.company_id = NEW.company_id
       AND i.kind = NEW.kind
       AND i.id <> NEW.id
       AND i.invoice_number IS NOT NULL
       AND i.invoice_date IS NOT NULL
       AND upper(btrim(i.invoice_number)) = num
       AND extract(year FROM i.invoice_date - interval '3 months') = fy
       AND (blank OR regexp_replace(coalesce(i.exporter_gstin, ''), '\s', '', 'g') = '')
  ) THEN
    RAISE EXCEPTION 'Invoice number % is already used in this financial year, and an invoice without a GSTIN cannot share its number with any branch (invoices_number_blank_gstin)',
      btrim(NEW.invoice_number)
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_number_blank_gstin_guard
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.invoices_number_blank_gstin_guard();
