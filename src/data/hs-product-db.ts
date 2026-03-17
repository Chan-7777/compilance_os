// ============================================================================
// HS Product Database — maps specific products to HS codes and extra compliance items
// These items SUPPLEMENT the base category checklist in checklist-generator.ts
// ============================================================================

import type { ChecklistPhase, ChecklistPriority } from '@/types'

export interface HSChecklistItem {
  category: string
  item: string
  priority: ChecklistPriority
  phase: ChecklistPhase
  details?: string
}

export interface HSProduct {
  hsCode: string       // e.g. "0904.21"
  name: string         // official / trade name shown to user
  aliases: string[]    // search terms — lowercase
  category: string     // matches ProductCode in types/index.ts
  // country-specific items that go BEYOND the base category checklist
  additionalItems: Partial<Record<string, HSChecklistItem[]>>
}

// ─── FOOD & AGRICULTURE ───────────────────────────────────────────────────────

const SPICES_FOOD: HSProduct[] = [
  {
    hsCode: '0904.21',
    name: 'Dried Chillies (Whole)',
    aliases: ['guntur mirchi', 'dry red chilli', 'whole chilli', 'byadagi chilli', 'kashmiri chilli', 'sannam chilli', 'teja chilli', 'dried chilli', 'whole red pepper'],
    category: 'food',
    additionalItems: {
      EU: [
        { category: 'Testing', item: 'Aflatoxin B1 + B2 test report (EU limit: 5 µg/kg)', priority: 'critical', phase: 'pre-shipment', details: 'EU Reg 1881/2006 — mandatory batch-level testing for capsicums' },
        { category: 'Testing', item: 'Ochratoxin A (OTA) test report (EU limit: 15 µg/kg)', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Testing', item: 'Sudan dye screening certificate (I–IV)', priority: 'critical', phase: 'pre-shipment', details: 'EU routinely detects Sudan dyes in Indian chillies — test every batch' },
        { category: 'Testing', item: 'Pesticide residue MRL compliance (EC 396/2005)', priority: 'high', phase: 'pre-shipment' },
      ],
      US: [
        { category: 'Testing', item: 'FDA Compliance — Salmonella & E. coli screening', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Testing', item: 'Aflatoxin test (FDA action level: 20 ppb)', priority: 'high', phase: 'pre-shipment' },
        { category: 'Certification', item: 'ASTA cleanliness specifications met (whole spice)', priority: 'medium', phase: 'pre-production' },
      ],
      UAE: [
        { category: 'Testing', item: 'Aflatoxin test (ESMA limit: 10 µg/kg)', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Certification', item: 'ECAS food conformity certificate', priority: 'high', phase: 'pre-production' },
        { category: 'Labeling', item: 'Arabic language labeling on retail pack', priority: 'critical', phase: 'pre-production' },
      ],
      Japan: [
        { category: 'Testing', item: 'Japan Positive List pesticide screening (all active ingredients)', priority: 'critical', phase: 'pre-shipment', details: 'Japan enforces the Positive List for all pesticides — items not listed default to 0.01 ppm' },
        { category: 'Testing', item: 'Aflatoxin test (Japan standard: 10 µg/kg)', priority: 'high', phase: 'pre-shipment' },
      ],
      UK: [
        { category: 'Testing', item: 'Aflatoxin B1 + OTA test (UK mirrors EU limits)', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Testing', item: 'Sudan dye test certificate', priority: 'critical', phase: 'pre-shipment' },
      ],
      Australia: [
        { category: 'Certification', item: 'AQIS import permit / biosecurity clearance', priority: 'critical', phase: 'immediate' },
        { category: 'Testing', item: 'Aflatoxin + pesticide screening (FSANZ limits)', priority: 'high', phase: 'pre-shipment' },
      ],
    },
  },

  {
    hsCode: '0904.22',
    name: 'Chilli Powder / Crushed Chilli Flakes',
    aliases: ['chilli powder', 'red chilli powder', 'chilli flakes', 'crushed chilli', 'paprika', 'ground chilli', 'lal mirch powder'],
    category: 'food',
    additionalItems: {
      EU: [
        { category: 'Testing', item: 'Aflatoxin B1 + B2 test report (EU limit: 5 µg/kg)', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Testing', item: 'Ochratoxin A test report (EU limit: 15 µg/kg)', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Testing', item: 'Sudan dye screening (I–IV)', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Certification', item: 'Processing facility GMP / BRC certificate', priority: 'high', phase: 'pre-production', details: 'Required for ground/crushed products in addition to raw spice certs' },
        { category: 'Labeling', item: 'Irradiation declaration on label (if treated)', priority: 'high', phase: 'pre-production', details: 'EU requires "Treated with ionising radiation" or radura symbol if irradiated' },
      ],
      US: [
        { category: 'Testing', item: 'Salmonella, E. coli, Staph aureus microbiological test', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Certification', item: 'Processing/grinding facility FSMA compliance', priority: 'high', phase: 'pre-production' },
        { category: 'Testing', item: 'ASTA color value test report (ASTA units)', priority: 'medium', phase: 'pre-shipment', details: 'US buyers often specify minimum ASTA color value for ground chilli' },
      ],
      UAE: [
        { category: 'Testing', item: 'Aflatoxin + microbiological test report', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Labeling', item: 'Arabic language labeling with ingredient list', priority: 'critical', phase: 'pre-production' },
      ],
      Japan: [
        { category: 'Testing', item: 'Japan Positive List pesticide residue screening', priority: 'critical', phase: 'pre-shipment' },
      ],
      UK: [
        { category: 'Testing', item: 'Aflatoxin + Sudan dye test certificate', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Labeling', item: 'Irradiation declaration if irradiation used', priority: 'high', phase: 'pre-production' },
      ],
    },
  },

  {
    hsCode: '0910.30',
    name: 'Turmeric (Whole / Powder)',
    aliases: ['turmeric', 'haldi', 'curcuma', 'turmeric powder', 'turmeric root', 'dried turmeric'],
    category: 'food',
    additionalItems: {
      EU: [
        { category: 'Testing', item: 'Lead and heavy metals screening (EU limit: 0.1 mg/kg)', priority: 'critical', phase: 'pre-shipment', details: 'Lead adulteration in turmeric is heavily monitored by EU authorities' },
        { category: 'Testing', item: 'Curcumin content test report', priority: 'medium', phase: 'pre-shipment' },
        { category: 'Testing', item: 'Aflatoxin + pesticide MRL compliance', priority: 'high', phase: 'pre-shipment' },
      ],
      US: [
        { category: 'Testing', item: 'FDA lead level compliance (action level: 2 ppm)', priority: 'critical', phase: 'pre-shipment', details: 'FDA has issued alerts on high-lead turmeric from South Asia' },
        { category: 'Testing', item: 'Salmonella screening', priority: 'critical', phase: 'pre-shipment' },
      ],
      UAE: [
        { category: 'Testing', item: 'Heavy metals + adulteration test (ESMA standards)', priority: 'high', phase: 'pre-shipment' },
      ],
    },
  },

  {
    hsCode: '0904.11',
    name: 'Black Pepper / White Pepper (Whole)',
    aliases: ['black pepper', 'white pepper', 'kali mirch', 'whole peppercorn', 'pepper berries', 'malabar pepper', 'tellicherry pepper'],
    category: 'food',
    additionalItems: {
      EU: [
        { category: 'Testing', item: 'Aflatoxin B1 test (EU limit: 5 µg/kg)', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Testing', item: 'Salmonella absence (mandatory)', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Testing', item: 'Piperine content certificate (if claimed)', priority: 'medium', phase: 'pre-shipment' },
      ],
      US: [
        { category: 'Testing', item: 'Salmonella / E. coli microbiological test', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Testing', item: 'ASTA cleanliness grade certification', priority: 'medium', phase: 'pre-shipment' },
      ],
    },
  },

  {
    hsCode: '0910.11',
    name: 'Ginger (Dried / Fresh)',
    aliases: ['ginger', 'adrak', 'sonth', 'dry ginger', 'fresh ginger', 'ginger root'],
    category: 'food',
    additionalItems: {
      EU: [
        { category: 'Testing', item: 'Aflatoxin + pesticide MRL test (EC 396/2005)', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Certification', item: 'Phytosanitary certificate (fresh ginger)', priority: 'critical', phase: 'pre-shipment' },
      ],
      US: [
        { category: 'Certification', item: 'FDA Prior Notice of Shipment (required for all food)', priority: 'critical', phase: 'pre-shipment' },
      ],
      Japan: [
        { category: 'Testing', item: 'Japan Positive List pesticide screening', priority: 'critical', phase: 'pre-shipment' },
      ],
    },
  },

  {
    hsCode: '1006.30',
    name: 'Basmati Rice (Semi-Milled / Milled)',
    aliases: ['basmati rice', 'long grain rice', 'basmati', 'premium rice', 'aromatic rice', 'dehraduni basmati', '1121 basmati'],
    category: 'food',
    additionalItems: {
      EU: [
        { category: 'Certification', item: 'APEDA "Basmati" GI authenticity certificate', priority: 'critical', phase: 'pre-production', details: 'Only GI-notified varieties qualify as Basmati in EU; requires APEDA certification' },
        { category: 'Testing', item: 'Pesticide MRL compliance test (EU stricter limits for rice)', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Testing', item: 'Arsenic content test (EU limit: 0.1 mg/kg polished rice)', priority: 'high', phase: 'pre-shipment' },
        { category: 'Labeling', item: '"Produce of India" GI label + APEDA logo', priority: 'high', phase: 'pre-production' },
      ],
      US: [
        { category: 'Certification', item: 'FDA Prior Notice of Shipment', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Testing', item: 'Arsenic screening (FDA guidance: 100 ppb inorganic As)', priority: 'high', phase: 'pre-shipment' },
      ],
      UAE: [
        { category: 'Testing', item: 'ESMA grade certificate + moisture content report', priority: 'high', phase: 'pre-shipment' },
        { category: 'Labeling', item: 'Arabic + English labeling with net weight, best-before', priority: 'critical', phase: 'pre-production' },
      ],
    },
  },
]

// ─── TEXTILES ─────────────────────────────────────────────────────────────────

const TEXTILES: HSProduct[] = [
  {
    hsCode: '6109.10',
    name: 'Cotton T-Shirts / Knitted Tops',
    aliases: ['cotton t-shirt', 'tshirt', 'knitted garment', 'polo shirt', 'cotton top', 'jersey top', 'round neck tee'],
    category: 'textiles',
    additionalItems: {
      EU: [
        { category: 'Testing', item: 'REACH Annex XVII — Azo dye test (restricted amines)', priority: 'critical', phase: 'pre-production', details: 'EU bans certain aromatic amines from Azo dyes that exceed 30 mg/kg' },
        { category: 'Testing', item: 'Formaldehyde content test (EU limit: 20 ppm for skin contact)', priority: 'high', phase: 'pre-production' },
        { category: 'Testing', item: 'pH test (acceptable range 4.0–7.5 for skin contact)', priority: 'medium', phase: 'pre-production' },
        { category: 'Certification', item: 'OEKO-TEX Standard 100 or GOTS (preferred by EU buyers)', priority: 'medium', phase: 'one-time' },
      ],
      US: [
        { category: 'Certification', item: 'CPSIA compliance (if for children ≤12 yrs)', priority: 'critical', phase: 'pre-production', details: 'Children's garments require lead + phthalate testing and GCC certificate' },
        { category: 'Testing', item: 'Flammability test (16 CFR 1610 — Class 1 required)', priority: 'critical', phase: 'pre-production' },
        { category: 'Labeling', item: 'Care label in English (fiber content, washing instructions)', priority: 'critical', phase: 'pre-production', details: 'US Textile Fiber Products Identification Act and Care Labeling Rule' },
        { category: 'Labeling', item: 'Country of origin label: "Made in India"', priority: 'critical', phase: 'pre-production' },
      ],
      UK: [
        { category: 'Testing', item: 'UK REACH — Azo dye + formaldehyde test', priority: 'high', phase: 'pre-production' },
        { category: 'Testing', item: 'Flammability test (BS EN ISO 15025)', priority: 'high', phase: 'pre-production' },
      ],
      UAE: [
        { category: 'Testing', item: 'Azo dye + formaldehyde test (ESMA technical regulation)', priority: 'high', phase: 'pre-production' },
        { category: 'Certification', item: 'Emirates Conformity Assessment (ECAS) for apparel if applicable', priority: 'medium', phase: 'one-time' },
      ],
    },
  },

  {
    hsCode: '5208.11',
    name: 'Woven Cotton Fabric (Plain Weave)',
    aliases: ['cotton fabric', 'woven cotton', 'grey fabric', 'greige fabric', 'cotton cloth', 'poplin', 'shirting fabric', 'cotton sheeting'],
    category: 'textiles',
    additionalItems: {
      EU: [
        { category: 'Testing', item: 'REACH restricted substances — Azo dyes, heavy metals (nickel, chrome)', priority: 'critical', phase: 'pre-production' },
        { category: 'Testing', item: 'Formaldehyde content test', priority: 'high', phase: 'pre-production' },
        { category: 'Labeling', item: 'Fiber composition label (exact % cotton)', priority: 'high', phase: 'pre-production' },
      ],
      US: [
        { category: 'Certification', item: 'Textile Fiber Products Identification Act — fiber content label', priority: 'critical', phase: 'pre-production' },
        { category: 'Labeling', item: 'RN number or company name on label', priority: 'high', phase: 'pre-production' },
      ],
    },
  },

  {
    hsCode: '6302.21',
    name: 'Printed Bed Linen (Cotton)',
    aliases: ['bed linen', 'bedsheets', 'pillow covers', 'duvet cover', 'cotton bedding', 'home textiles', 'bed sheets'],
    category: 'textiles',
    additionalItems: {
      EU: [
        { category: 'Testing', item: 'REACH — Azo dye, formaldehyde, pH test', priority: 'critical', phase: 'pre-production' },
        { category: 'Testing', item: 'Colour fastness to washing test (ISO 105-C06)', priority: 'high', phase: 'pre-production' },
        { category: 'Certification', item: 'EU Ecolabel or OEKO-TEX 100 (expected by major EU retailers)', priority: 'medium', phase: 'one-time' },
      ],
      US: [
        { category: 'Testing', item: 'Flammability test (16 CFR 1632 / 1633 for mattress sets)', priority: 'high', phase: 'pre-production' },
        { category: 'Labeling', item: 'Thread count and fiber content label', priority: 'critical', phase: 'pre-production' },
      ],
    },
  },
]

// ─── STEEL & IRON ─────────────────────────────────────────────────────────────

const STEEL: HSProduct[] = [
  {
    hsCode: '7208.10',
    name: 'Flat-Rolled Steel — Hot-Rolled Coils',
    aliases: ['hot rolled coil', 'hrc', 'flat rolled steel', 'steel coil', 'hot rolled strip', 'steel sheets', 'carbon steel coil'],
    category: 'steel',
    additionalItems: {
      EU: [
        { category: 'CBAM', item: 'Carbon content per tonne (direct + indirect embedded)', priority: 'critical', phase: 'pre-shipment', details: 'HS 7208 is explicitly covered under EU CBAM — financial adjustment from Jan 2026' },
        { category: 'CBAM', item: 'Steel mill verified GHG emissions report (tCO2e/tonne)', priority: 'critical', phase: 'per-shipment' },
        { category: 'Certification', item: 'EN 10025 material standard compliance certificate', priority: 'high', phase: 'pre-production' },
        { category: 'Certification', item: 'Mill Test Certificate 3.1 (chemical + mechanical properties)', priority: 'critical', phase: 'per-shipment' },
      ],
      US: [
        { category: 'Certification', item: 'Section 232 tariff exclusion (if applicable)', priority: 'high', phase: 'immediate', details: 'US 25% Section 232 steel tariff applies — check if exclusion applies to your grade' },
        { category: 'Certification', item: 'ASTM A36 / A572 material compliance certificate', priority: 'high', phase: 'per-shipment' },
        { category: 'Certification', item: 'Anti-dumping + countervailing duty check (AD/CVD)', priority: 'critical', phase: 'immediate', details: 'India-origin steel may have AD/CVD orders — verify before shipping' },
      ],
      UK: [
        { category: 'CBAM', item: 'UK CBAM compliance (effective Jan 2027 — prepare now)', priority: 'medium', phase: 'immediate' },
        { category: 'Certification', item: 'BS EN 10025 compliance certificate', priority: 'high', phase: 'per-shipment' },
      ],
    },
  },

  {
    hsCode: '7219.11',
    name: 'Stainless Steel — Flat-Rolled, Hot-Rolled Coils',
    aliases: ['stainless steel coil', 'ss coil', 'stainless steel sheet', 'ss 304', 'ss 316', 'stainless flat rolled', 'austenitic stainless'],
    category: 'steel',
    additionalItems: {
      EU: [
        { category: 'Certification', item: 'EN 10088 stainless steel standard compliance certificate', priority: 'critical', phase: 'per-shipment' },
        { category: 'Testing', item: 'Nickel + chromium content test (REACH — skin contact items)', priority: 'high', phase: 'pre-production', details: 'If SS used in consumer items, nickel release restrictions under REACH Annex XVII apply' },
        { category: 'CBAM', item: 'Embedded emissions per tonne (stainless covered under CBAM steel)', priority: 'critical', phase: 'per-shipment' },
      ],
      US: [
        { category: 'Certification', item: 'ASTM A240 or A666 material certificate', priority: 'high', phase: 'per-shipment' },
        { category: 'Certification', item: 'AD/CVD order check for stainless from India', priority: 'critical', phase: 'immediate' },
      ],
    },
  },

  {
    hsCode: '7304.31',
    name: 'Seamless Steel Pipes & Tubes',
    aliases: ['seamless pipe', 'steel pipe', 'steel tube', 'seamless tube', 'api pipe', 'boiler tube', 'structural pipe'],
    category: 'steel',
    additionalItems: {
      EU: [
        { category: 'Certification', item: 'EN 10216 / EN 10217 pressure pipe standard certificate', priority: 'critical', phase: 'per-shipment' },
        { category: 'Testing', item: 'Hydrostatic / ultrasonic non-destructive test (NDT) report', priority: 'critical', phase: 'per-shipment' },
        { category: 'CBAM', item: 'Embedded emissions per tonne of pipe', priority: 'high', phase: 'per-shipment' },
      ],
      US: [
        { category: 'Certification', item: 'API 5L / ASTM A106 material certification', priority: 'critical', phase: 'per-shipment' },
        { category: 'Certification', item: 'AD/CVD scope check for steel pipes from India', priority: 'critical', phase: 'immediate' },
      ],
    },
  },
]

// ─── CHEMICALS & FERTILIZERS ──────────────────────────────────────────────────

const CHEMICALS: HSProduct[] = [
  {
    hsCode: '3102.10',
    name: 'Urea (Fertilizer Grade)',
    aliases: ['urea', 'urea fertilizer', 'agricultural urea', 'prilled urea', 'granular urea', 'nitrogen fertilizer'],
    category: 'chemicals',
    additionalItems: {
      EU: [
        { category: 'Certification', item: 'EU Fertilising Products Regulation (EU 2019/1009) compliance', priority: 'critical', phase: 'immediate', details: 'New EU regulation for fertiliser CE marking — biuret content limits for urea' },
        { category: 'Testing', item: 'Nitrogen content + biuret content test report', priority: 'critical', phase: 'per-shipment' },
        { category: 'Certification', item: 'REACH Registration (N≥1000 tonnes/year in EU)', priority: 'high', phase: 'one-time' },
      ],
      US: [
        { category: 'Certification', item: 'EPA TSCA inventory status check', priority: 'high', phase: 'immediate' },
        { category: 'Certification', item: 'AAPFCO (state fertilizer registration if retail)', priority: 'high', phase: 'one-time' },
      ],
    },
  },

  {
    hsCode: '3204.11',
    name: 'Reactive Dyes',
    aliases: ['reactive dye', 'textile dye', 'fabric dye', 'fibre reactive dye', 'cotton dye', 'printing dye', 'procion dye'],
    category: 'chemicals',
    additionalItems: {
      EU: [
        { category: 'Certification', item: 'REACH Registration (mandatory for >1 tonne/year to EU)', priority: 'critical', phase: 'immediate', details: 'Reactive dyes are chemical substances — must be registered under REACH by importer or via ONLY Representative' },
        { category: 'Certification', item: 'CLP Classification, Labelling & Packaging compliance', priority: 'critical', phase: 'pre-production' },
        { category: 'Documentation', item: 'Safety Data Sheet (SDS) in destination language', priority: 'critical', phase: 'pre-shipment' },
        { category: 'Testing', item: 'Restricted carcinogenic amines test (Annex XVII)', priority: 'high', phase: 'pre-production' },
      ],
      US: [
        { category: 'Certification', item: 'TSCA Section 5 pre-manufacture notice (new chemical)', priority: 'critical', phase: 'immediate' },
        { category: 'Documentation', item: 'SDS in English (OSHA Hazard Communication Standard)', priority: 'critical', phase: 'pre-shipment' },
      ],
    },
  },
]

// ─── PHARMACEUTICALS ──────────────────────────────────────────────────────────

const PHARMA: HSProduct[] = [
  {
    hsCode: '3004.20',
    name: 'Medicaments Containing Antibiotics',
    aliases: ['antibiotic', 'amoxicillin', 'azithromycin', 'ciprofloxacin', 'antibiotic tablet', 'antibiotic capsule', 'generic antibiotic'],
    category: 'pharma',
    additionalItems: {
      EU: [
        { category: 'Certification', item: 'EU GMP Certificate (Annex 16 QP release)', priority: 'critical', phase: 'one-time', details: 'Indian pharma facility must hold EU GMP certificate from relevant EU competent authority' },
        { category: 'Certification', item: 'Marketing Authorisation (MA) in destination EU country', priority: 'critical', phase: 'one-time' },
        { category: 'Certification', item: 'Certificate of Pharmaceutical Product (CPP) from CDSCO', priority: 'critical', phase: 'per-shipment' },
        { category: 'Certification', item: 'Written Confirmation (WC) for Active Pharmaceutical Ingredients', priority: 'high', phase: 'per-shipment' },
      ],
      US: [
        { category: 'Certification', item: 'FDA Drug Establishment Registration + Drug Listing', priority: 'critical', phase: 'one-time' },
        { category: 'Certification', item: 'ANDA (Abbreviated New Drug Application) approval', priority: 'critical', phase: 'one-time' },
        { category: 'Certification', item: 'USFDA facility inspection — no 483 observations', priority: 'critical', phase: 'one-time' },
        { category: 'Documentation', item: 'Lot release certificate + CoA from QC lab', priority: 'critical', phase: 'per-shipment' },
      ],
      UK: [
        { category: 'Certification', item: 'MHRA Marketing Authorisation (post-Brexit, separate from EU MA)', priority: 'critical', phase: 'one-time' },
        { category: 'Certification', item: 'UK GMP certificate', priority: 'critical', phase: 'one-time' },
      ],
    },
  },

  {
    hsCode: '2941.10',
    name: 'Penicillins / Bulk Drug (API)',
    aliases: ['api', 'active pharmaceutical ingredient', 'bulk drug', 'penicillin', 'amoxicillin api', 'bulk active', 'raw pharmaceutical'],
    category: 'pharma',
    additionalItems: {
      EU: [
        { category: 'Certification', item: 'Written Confirmation (WC) for API to EU — mandatory from non-EU country', priority: 'critical', phase: 'one-time', details: 'EU Directive 2011/62/EU — any Indian API exporter needs WC from Indian regulator' },
        { category: 'Certification', item: 'EU GMP for API (ICH Q7 standard)', priority: 'critical', phase: 'one-time' },
        { category: 'Documentation', item: 'Drug Master File (DMF) or CEP (Certificate of Suitability)', priority: 'high', phase: 'one-time' },
      ],
      US: [
        { category: 'Certification', item: 'FDA Drug Master File (Type II DMF for API)', priority: 'critical', phase: 'one-time' },
        { category: 'Certification', item: 'cGMP compliance (21 CFR Part 211)', priority: 'critical', phase: 'one-time' },
      ],
    },
  },
]

// ─── ELECTRONICS ──────────────────────────────────────────────────────────────

const ELECTRONICS: HSProduct[] = [
  {
    hsCode: '8542.31',
    name: 'Electronic Integrated Circuits (ICs)',
    aliases: ['integrated circuit', 'ic chip', 'semiconductor', 'microchip', 'processor chip', 'memory ic', 'smd ic'],
    category: 'electronics',
    additionalItems: {
      EU: [
        { category: 'Certification', item: 'RoHS 2 Directive compliance (lead, mercury, cadmium etc.)', priority: 'critical', phase: 'pre-production' },
        { category: 'Documentation', item: 'EU Declaration of Conformity (DoC)', priority: 'critical', phase: 'per-shipment' },
        { category: 'Certification', item: 'CE marking (if incorporated into CE-marked finished product)', priority: 'high', phase: 'pre-production' },
        { category: 'Testing', item: 'REACH SVHC screening (substances of very high concern)', priority: 'high', phase: 'pre-production' },
      ],
      US: [
        { category: 'Certification', item: 'FCC Part 15 or Part 18 certification (if causing RF emissions)', priority: 'high', phase: 'one-time' },
        { category: 'Certification', item: 'TSCA chemical compliance check', priority: 'medium', phase: 'immediate' },
        { category: 'Certification', item: 'Export Control — EAR99 or ECCN classification check', priority: 'critical', phase: 'immediate', details: 'Dual-use semiconductors may require export license under BIS EAR' },
      ],
    },
  },

  {
    hsCode: '8517.71',
    name: 'PCBs / Printed Circuit Board Assemblies',
    aliases: ['pcb', 'printed circuit board', 'pcba', 'circuit board', 'bare pcb', 'assembled pcb', 'electronics board'],
    category: 'electronics',
    additionalItems: {
      EU: [
        { category: 'Certification', item: 'RoHS 2 Directive compliance certificate', priority: 'critical', phase: 'pre-production' },
        { category: 'Testing', item: 'IPC-A-600 / IPC-A-610 quality acceptance test', priority: 'high', phase: 'per-shipment' },
        { category: 'Certification', item: 'WEEE Producer registration (if selling finished EEE)', priority: 'medium', phase: 'one-time' },
      ],
      US: [
        { category: 'Certification', item: 'Export Control classification (ECCN) — PCBs for military/dual-use', priority: 'critical', phase: 'immediate' },
        { category: 'Testing', item: 'IPC Class 2 or Class 3 test report per customer spec', priority: 'high', phase: 'per-shipment' },
      ],
    },
  },
]

// ─── COMBINED DATABASE ────────────────────────────────────────────────────────

export const HS_PRODUCT_DB: HSProduct[] = [
  ...SPICES_FOOD,
  ...TEXTILES,
  ...STEEL,
  ...CHEMICALS,
  ...PHARMA,
  ...ELECTRONICS,
]

/**
 * Search the HS product database by product name, alias, or HS code.
 * Returns up to `limit` matches, ordered by relevance.
 */
export function searchHSProducts(query: string, categoryFilter?: string, limit = 8): HSProduct[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const results: Array<{ product: HSProduct; score: number }> = []

  for (const product of HS_PRODUCT_DB) {
    if (categoryFilter && product.category !== categoryFilter) continue

    let score = 0

    // Exact HS code match
    if (product.hsCode === q || product.hsCode.replace('.', '') === q.replace('.', '')) {
      score = 100
    }
    // HS code prefix match
    else if (product.hsCode.startsWith(q)) {
      score = 90
    }
    // Name starts with query
    else if (product.name.toLowerCase().startsWith(q)) {
      score = 80
    }
    // Alias exact match
    else if (product.aliases.some(a => a === q)) {
      score = 75
    }
    // Alias starts with query
    else if (product.aliases.some(a => a.startsWith(q))) {
      score = 65
    }
    // Name contains query
    else if (product.name.toLowerCase().includes(q)) {
      score = 55
    }
    // Alias contains query
    else if (product.aliases.some(a => a.includes(q))) {
      score = 45
    }
    // Word-level match in name
    else if (q.split(' ').some(word => word.length > 2 && product.name.toLowerCase().includes(word))) {
      score = 35
    }
    // Word-level match in aliases
    else if (q.split(' ').some(word => word.length > 2 && product.aliases.some(a => a.includes(word)))) {
      score = 25
    }

    if (score > 0) results.push({ product, score })
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.product)
}

/**
 * Get a single HS product by exact HS code.
 */
export function getHSProduct(hsCode: string): HSProduct | undefined {
  return HS_PRODUCT_DB.find(p => p.hsCode === hsCode)
}
