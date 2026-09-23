-- ============================================================
-- Fields the printed invoice documents need that 20260923000001 lacked
--
-- The Commercial Invoice, Packing List and Proforma render from the invoice
-- row only -- never from the live company or a buyer -- so everything they
-- print has to be on the snapshot:
--   * exporter bank details (the buyer pays into this account; companies has
--     no bank columns yet, and a later edit to a bank master must not change
--     the account printed on an invoice already sent);
--   * payment terms, buyer tax id (EORI / VAT / other) and country of origin,
--     which the retired single-line EU invoice carried;
--   * per-line packing data: marks, number and kind of packages, net and
--     gross weight.
--
-- No change to invoices_guard() is needed. It compares
-- to_jsonb(NEW) - mutable against to_jsonb(OLD) - mutable, so every column
-- added here is part of the immutable snapshot of an issued invoice
-- automatically, and invoice_line_items_guard() already freezes every line
-- column once the parent leaves draft. Packing data is therefore final at
-- issue, like everything else on the document.
--
-- All columns are nullable (origin_country has a default): a proforma is
-- issued before goods are packed, so issue does not require packing data.
-- The packing list flags lines that are missing it instead.
-- ============================================================

ALTER TABLE public.invoices
  ADD COLUMN payment_terms           text,
  ADD COLUMN buyer_tax_id            text,
  ADD COLUMN origin_country          text DEFAULT 'India',
  ADD COLUMN exporter_bank_name      text,
  ADD COLUMN exporter_bank_branch    text,
  ADD COLUMN exporter_bank_account   text,
  ADD COLUMN exporter_bank_ifsc      text
    CHECK (exporter_bank_ifsc IS NULL OR exporter_bank_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  ADD COLUMN exporter_bank_swift     text
    CHECK (exporter_bank_swift IS NULL OR exporter_bank_swift ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  ADD COLUMN exporter_bank_ad_code   text;

COMMENT ON COLUMN public.invoices.buyer_tax_id IS
  'Buyer tax / customs id as the buyer gives it (EU EORI or VAT number, etc.).';
COMMENT ON COLUMN public.invoices.exporter_bank_ad_code IS
  'Authorised Dealer code of the bank the export proceeds are realised through.';

ALTER TABLE public.invoice_line_items
  ADD COLUMN marks            text,
  ADD COLUMN package_count    integer       CHECK (package_count IS NULL OR package_count > 0),
  ADD COLUMN package_kind     text,
  ADD COLUMN net_weight_kg    numeric(14,3) CHECK (net_weight_kg IS NULL OR net_weight_kg > 0),
  ADD COLUMN gross_weight_kg  numeric(14,3) CHECK (gross_weight_kg IS NULL OR gross_weight_kg > 0),
  ADD CONSTRAINT invoice_line_items_gross_not_below_net
    CHECK (net_weight_kg IS NULL OR gross_weight_kg IS NULL OR gross_weight_kg >= net_weight_kg);

COMMENT ON COLUMN public.invoice_line_items.marks IS
  'Shipping marks and numbers for the packages on this line, as stencilled.';
