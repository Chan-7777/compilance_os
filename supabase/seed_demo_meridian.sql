-- ============================================================
-- ComplianceOS demo seed: Meridian Tubes & Alloys Pvt Ltd
--
-- A fictional Pune seamless-pipe exporter shipping to the EU, UK and US.
-- Every company, buyer, licence and document number here is invented.
--
-- HOW TO USE
--   1. Sign up in the app with an email you control.
--   2. Put that email in v_email below.
--   3. Run this whole file in the Supabase SQL editor.
--   It is safe to re-run: it clears this company's demo rows first.
--   It writes nothing if the email is not found or any column is missing.
--
-- STORY THE DATA TELLS
--   RoDTEP     three shipments with unclaimed entitlement, one filed,
--              one credited, one rejected for an HS mismatch
--   Gate       one UK shipment blocked on a sanctions name match
--   IGST       one refund stuck on a deficiency memo
--   BRC/FIRC   one invoice past the 9-month FEMA realisation window
--   AA licence export obligation 66% met with 45 days of validity left
--   EPCG       Block 1 obligation 44% met, due in about 18 months
--
-- All dates are relative to CURRENT_DATE, so the story stays current
-- whenever this is run.
-- ============================================================

DO $$
DECLARE
  v_email   TEXT := 'CHANGE_ME@example.com';  -- the email you signed up with
  v_company UUID;
  v_missing TEXT;
  s1 UUID; s3 UUID; s4 UUID; s5 UUID; s6 UUID;
BEGIN
  SELECT company_id INTO v_company
  FROM public.user_profiles
  WHERE lower(email) = lower(v_email);

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'No account found for %. Sign up with that email first, then set v_email.', v_email;
  END IF;

  -- Pre-flight: refuse to write anything if a column this seed needs is absent.
  SELECT string_agg(req.tbl || '.' || req.col, ', ')
    INTO v_missing
  FROM (VALUES
    ('companies','name'),('companies','size'),('companies','iec'),('companies','gstin'),
    ('companies','address'),('companies','city'),('companies','state'),('companies','pin'),
    ('companies','state_code'),('companies','port_of_loading'),('companies','designation'),
    ('companies','whatsapp'),('companies','turnover_range'),('companies','years_exporting'),
    ('companies','known_regulations'),('companies','compliance_confidence'),
    ('companies','past_compliance_issues'),('companies','pain_points'),
    ('companies','trade_role'),('companies','onboarded_at'),
    ('companies','whatsapp_number'),('companies','whatsapp_alerts'),
    ('user_settings','selected_product'),('user_settings','selected_countries'),
    ('shipments','name'),('shipments','product'),('shipments','country'),('shipments','date'),
    ('shipments','status'),('shipments','risk_score'),('shipments','notes'),
    ('shipments','buyer_name'),('shipments','sanctions_risk'),('shipments','hs_code'),
    ('shipments','shipment_value'),('shipments','value_currency'),
    ('shipments','shipping_bill_no'),('shipments','rodtep_rate'),
    ('shipments','rodtep_claimed'),('shipments','rodtep_claim_date'),
    ('shipments','gate_status'),('shipments','rodtep_match_type'),
    ('shipments','rodtep_claim_status'),('shipments','rodtep_claim_note'),
    ('igst_claims','shipment_id'),('igst_claims','shipping_bill_no'),
    ('igst_claims','shipping_bill_date'),('igst_claims','port_code'),('igst_claims','hs_code'),
    ('igst_claims','invoice_value'),('igst_claims','igst_paid'),('igst_claims','refund_status'),
    ('igst_claims','refund_amount'),('igst_claims','credited_date'),('igst_claims','notes'),
    ('brc_firc_records','shipment_id'),('brc_firc_records','document_type'),
    ('brc_firc_records','document_no'),('brc_firc_records','invoice_no'),
    ('brc_firc_records','invoice_date'),('brc_firc_records','invoice_amount'),
    ('brc_firc_records','invoice_currency'),('brc_firc_records','realized_amount'),
    ('brc_firc_records','realized_currency'),('brc_firc_records','realization_date'),
    ('brc_firc_records','bank_name'),('brc_firc_records','ad_code'),
    ('brc_firc_records','status'),('brc_firc_records','notes'),
    ('aa_licenses','license_no'),('aa_licenses','issue_date'),('aa_licenses','validity_date'),
    ('aa_licenses','hs_codes'),('aa_licenses','import_obligation'),
    ('aa_licenses','export_obligation'),('aa_licenses','import_fulfilled'),
    ('aa_licenses','export_fulfilled'),('aa_licenses','status'),('aa_licenses','notes'),
    ('epcg_licenses','license_no'),('epcg_licenses','issue_date'),
    ('epcg_licenses','validity_date'),('epcg_licenses','duty_saved'),
    ('epcg_licenses','export_obligation'),('epcg_licenses','export_fulfilled'),
    ('epcg_licenses','obligation_period_years'),('epcg_licenses','status'),
    ('epcg_licenses','notes'),
    ('checklist_progress','shipment_id'),('checklist_progress','country_code'),
    ('checklist_progress','product'),('checklist_progress','checked_items')
  ) AS req(tbl, col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = req.tbl
      AND c.column_name = req.col
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Seed aborted, nothing written. Missing columns: %', v_missing;
  END IF;

  -- ── Clear previous demo rows for this company ───────────────────────────
  DELETE FROM public.igst_claims        WHERE company_id = v_company;
  DELETE FROM public.brc_firc_records   WHERE company_id = v_company;
  DELETE FROM public.aa_licenses        WHERE company_id = v_company;
  DELETE FROM public.epcg_licenses      WHERE company_id = v_company;
  DELETE FROM public.checklist_progress WHERE company_id = v_company;
  DELETE FROM public.shipments          WHERE company_id = v_company;

  -- ── Company profile (marks onboarding complete) ─────────────────────────
  UPDATE public.companies SET
    name                   = 'Meridian Tubes & Alloys Pvt Ltd',
    size                   = 'medium',
    iec                    = '0913045672',
    gstin                  = '27AAECM4512R1Z2',
    address                = 'Plot 14, MIDC Bhosari',
    city                   = 'Pune',
    state                  = 'Maharashtra',
    pin                    = '411026',
    state_code             = 'MH',
    port_of_loading        = 'INNSA1',
    designation            = 'Export Manager',
    whatsapp               = '+91 98220 41573',
    whatsapp_number        = '+91 98220 41573',
    whatsapp_alerts        = FALSE,
    turnover_range         = '₹25–100 Crore',
    years_exporting        = '3–10 years',
    known_regulations      = ARRAY['CBAM (Carbon Tax)', 'Rules of Origin (FTA)'],
    compliance_confidence  = 2,
    past_compliance_issues = ARRAY['Shipment detained', 'Bank rejected financing'],
    pain_points            = ARRAY['Fear of shipment seizure',
                                   'Not knowing which FTA tariff I qualify for',
                                   'Capital locked for too long'],
    trade_role             = 'both',
    onboarded_at           = NOW()
  WHERE id = v_company;

  UPDATE public.user_settings SET
    selected_product   = 'steel',
    selected_countries = ARRAY['EU', 'UK', 'US']
  WHERE company_id = v_company;

  -- ── Shipments ───────────────────────────────────────────────────────────
  -- HS 73043111 carries a 0.45% RoDTEP rate in the seeded rate table.

  INSERT INTO public.shipments (company_id, name, product, country, date, status, risk_score,
    buyer_name, sanctions_risk, hs_code, shipment_value, value_currency, shipping_bill_no,
    rodtep_rate, rodtep_match_type, rodtep_claim_status, rodtep_claimed, gate_status, notes)
  VALUES (v_company, 'MTA/EU/2607 · Seamless pipes to Hamburg', 'steel', 'EU',
    CURRENT_DATE - 62, 'delivered', 34, 'Nordhafen Rohrtechnik GmbH', 'clear',
    '73043111', 48500, 'USD', '7718245', 0.45, 'exact', 'unclaimed', FALSE, 'approved',
    'Delivered. RoDTEP not yet claimed.')
  RETURNING id INTO s1;

  INSERT INTO public.shipments (company_id, name, product, country, date, status, risk_score,
    buyer_name, sanctions_risk, hs_code, shipment_value, value_currency, shipping_bill_no,
    rodtep_rate, rodtep_match_type, rodtep_claim_status, rodtep_claimed, gate_status, notes)
  VALUES (v_company, 'MTA/EU/2611 · Boiler tubes to Lyon', 'steel', 'EU',
    CURRENT_DATE - 48, 'delivered', 29, 'Rhodanie Industrie SAS', 'clear',
    '73043111', 61200, 'EUR', '7720931', 0.45, 'exact', 'unclaimed', FALSE, 'approved',
    'Delivered. RoDTEP not yet claimed.');

  INSERT INTO public.shipments (company_id, name, product, country, date, status, risk_score,
    buyer_name, sanctions_risk, hs_code, shipment_value, value_currency, shipping_bill_no,
    rodtep_rate, rodtep_match_type, rodtep_claim_status, rodtep_claimed, rodtep_claim_date,
    gate_status, notes)
  VALUES (v_company, 'MTA/UK/2604 · Process piping to Teesside', 'steel', 'UK',
    CURRENT_DATE - 95, 'delivered', 31, 'Albion Process Piping Ltd', 'clear',
    '73043111', 39800, 'GBP', '7709114', 0.45, 'exact', 'filed', TRUE, CURRENT_DATE - 30,
    'approved', 'RoDTEP claim filed on ICEGATE, awaiting scrip.')
  RETURNING id INTO s3;

  INSERT INTO public.shipments (company_id, name, product, country, date, status, risk_score,
    buyer_name, sanctions_risk, hs_code, shipment_value, value_currency, shipping_bill_no,
    rodtep_rate, rodtep_match_type, rodtep_claim_status, rodtep_claimed, rodtep_claim_date,
    rodtep_claim_note, gate_status, notes)
  VALUES (v_company, 'MTA/US/2602 · Line pipe to Houston', 'steel', 'US',
    CURRENT_DATE - 140, 'delivered', 47, 'Great Lakes Fluid Systems Inc', 'clear',
    '73043111', 72400, 'USD', '7701587', 0.45, 'exact', 'credited', TRUE, CURRENT_DATE - 75,
    'Scrip credited to ICEGATE electronic ledger.', 'approved',
    'Section 232 duty paid by buyer.')
  RETURNING id INTO s4;

  INSERT INTO public.shipments (company_id, name, product, country, date, status, risk_score,
    buyer_name, sanctions_risk, hs_code, shipment_value, value_currency, shipping_bill_no,
    rodtep_rate, rodtep_match_type, rodtep_claim_status, rodtep_claimed, rodtep_claim_date,
    rodtep_claim_note, gate_status, notes)
  VALUES (v_company, 'MTA/EU/2603 · Heat-exchanger tubes to Gdańsk', 'steel', 'EU',
    CURRENT_DATE - 120, 'delivered', 52, 'Vistula Energy Components Sp. z o.o.', 'clear',
    '73043111', 33900, 'EUR', '7703366', 0.45, 'exact', 'rejected', FALSE, CURRENT_DATE - 60,
    'Rejected: HS code on the shipping bill did not match the invoice description.',
    'approved', 'Buyer disputing HS classification. Payment partly withheld.')
  RETURNING id INTO s5;

  INSERT INTO public.shipments (company_id, name, product, country, date, status, risk_score,
    buyer_name, sanctions_risk, hs_code, shipment_value, value_currency, shipping_bill_no,
    rodtep_rate, rodtep_match_type, rodtep_claim_status, rodtep_claimed, gate_status, notes)
  VALUES (v_company, 'MTA/EU/2620 · Seamless pipes to Hamburg (repeat order)', 'steel', 'EU',
    CURRENT_DATE - 6, 'in_transit', 36, 'Nordhafen Rohrtechnik GmbH', 'clear',
    '73043111', 58900, 'EUR', '7726402', 0.45, 'exact', 'unclaimed', FALSE, 'approved',
    'Sailed from Nhava Sheva. ETA Hamburg in 18 days.')
  RETURNING id INTO s6;

  -- Pre-shipment rows: no shipping bill yet, so no RoDTEP rate is recorded.
  INSERT INTO public.shipments (company_id, name, product, country, date, status, risk_score,
    buyer_name, sanctions_risk, hs_code, shipment_value, value_currency, gate_status, notes)
  VALUES (v_company, 'MTA/EU/2624 · Hydraulic cylinder tubes to Rotterdam', 'steel', 'EU',
    CURRENT_DATE + 9, 'preparing', 58, 'Rhodanie Industrie SAS', 'clear',
    '73043111', 52000, 'USD', 'pending',
    'Mill emissions report for CBAM still outstanding.');

  INSERT INTO public.shipments (company_id, name, product, country, date, status, risk_score,
    buyer_name, sanctions_risk, hs_code, shipment_value, value_currency, gate_status, notes)
  VALUES (v_company, 'MTA/UK/2625 · Offshore riser pipe to Aberdeen', 'steel', 'UK',
    CURRENT_DATE + 21, 'pending', 81, 'Kestrel Offshore Services Ltd', 'flag',
    '73043111', 27600, 'GBP', 'blocked',
    'Buyer name partially matched a sanctions list entry. Hold until cleared.');

  -- ── IGST refunds (INR) ──────────────────────────────────────────────────
  INSERT INTO public.igst_claims (company_id, shipment_id, shipping_bill_no, shipping_bill_date,
    port_code, hs_code, invoice_value, igst_paid, refund_status, refund_amount, credited_date, notes)
  VALUES
    (v_company, s4, '7701587', CURRENT_DATE - 140, 'INNSA1', '73043111',
      6081600, 1094688, 'credited', 1094688, CURRENT_DATE - 88, NULL),
    (v_company, s3, '7709114', CURRENT_DATE - 95, 'INNSA1', '73043111',
      4258600, 766548, 'sanctioned', 766548, NULL, 'Sanctioned, awaiting PFMS credit.'),
    (v_company, s5, '7703366', CURRENT_DATE - 120, 'INNSA1', '73043111',
      3084900, 555282, 'deficiency_memo', NULL, NULL,
      'SB005: invoice number on the shipping bill does not match GSTR-1 Table 6A.'),
    (v_company, s6, '7726402', CURRENT_DATE - 6, 'INNSA1', '73043111',
      5359900, 964782, 'filed', NULL, NULL, NULL);

  -- ── BRC / FIRC realisation ──────────────────────────────────────────────
  INSERT INTO public.brc_firc_records (company_id, shipment_id, document_type, document_no,
    invoice_no, invoice_date, invoice_amount, invoice_currency, realized_amount,
    realized_currency, realization_date, bank_name, ad_code, status, notes)
  VALUES
    (v_company, s4, 'brc', 'BRC/2026/004418', 'MTA/EXP/26-27/014', CURRENT_DATE - 140,
      72400, 'USD', 6081600, 'INR', CURRENT_DATE - 85, 'HDFC Bank', '0510005', 'realized', NULL),
    (v_company, s3, 'firc', 'FIRC/2026/118802', 'MTA/EXP/26-27/019', CURRENT_DATE - 95,
      39800, 'GBP', 4258600, 'INR', CURRENT_DATE - 50, 'ICICI Bank', '6390005', 'realized', NULL),
    (v_company, s5, 'brc', NULL, 'MTA/EXP/26-27/017', CURRENT_DATE - 120,
      33900, 'EUR', 1542450, 'INR', CURRENT_DATE - 40, 'HDFC Bank', '0510005', 'partial',
      'Buyer withheld 50% pending the HS classification dispute.'),
    (v_company, s1, 'brc', NULL, 'MTA/EXP/26-27/023', CURRENT_DATE - 62,
      48500, 'USD', NULL, 'INR', NULL, 'HDFC Bank', '0510005', 'pending', NULL),
    (v_company, NULL, 'brc', NULL, 'MTA/EXP/25-26/088', CURRENT_DATE - 290,
      44100, 'USD', NULL, 'INR', NULL, 'HDFC Bank', '0510005', 'overdue',
      'Past the 9-month FEMA realisation window. Apply to the AD bank for an extension.');

  -- ── Advance Authorisation licences ──────────────────────────────────────
  INSERT INTO public.aa_licenses (company_id, license_no, issue_date, validity_date, hs_codes,
    import_obligation, export_obligation, import_fulfilled, export_fulfilled, status, notes)
  VALUES
    (v_company, 'AA/0310/2025/00471', CURRENT_DATE - 300, CURRENT_DATE + 45,
      ARRAY['72071990', '73043111'], 18500000, 24000000, 17200000, 15900000, 'active',
      'Export obligation 66% met with 45 days of validity left.'),
    (v_company, 'AA/0310/2024/00219', CURRENT_DATE - 620, CURRENT_DATE - 255,
      ARRAY['72071990', '73043111'], 12000000, 15600000, 12000000, 15600000, 'fulfilled',
      'EODC issued.');

  -- ── EPCG licence ────────────────────────────────────────────────────────
  -- Obligation is 6x duty saved over 6 years; Block 1 is 50% within 4 years.
  INSERT INTO public.epcg_licenses (company_id, license_no, issue_date, validity_date,
    duty_saved, export_obligation, export_fulfilled, obligation_period_years, status, notes)
  VALUES (v_company, 'EPCG/0310/2023/00093', CURRENT_DATE - 900, CURRENT_DATE + 1290,
    3600000, 21600000, 9450000, 6, 'active',
    'Pilger mill import. Block 1 (50% within 4 years) falls due in about 18 months; 44% met so far.');

  -- ── Checklist progress (EU steel checklist, a few items done) ───────────
  INSERT INTO public.checklist_progress (company_id, shipment_id, country_code, product, checked_items)
  VALUES (v_company, NULL, 'EU', 'steel', '{"1": true, "2": true, "4": true, "7": true}'::jsonb);

  RAISE NOTICE 'Seeded demo data for company % (%).', v_company, v_email;
END $$;
