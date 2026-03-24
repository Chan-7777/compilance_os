// Seed script: regulatory_changes
// Usage: node scripts/seed_regulatory_alerts.mjs <SERVICE_ROLE_KEY>
// Inserts curated real alerts into the regulatory_changes table.
// Safe to re-run — uses upsert on external_id.

import { createClient } from '@supabase/supabase-js'

const SERVICE_ROLE_KEY = process.argv[2]
if (!SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/seed_regulatory_alerts.mjs <SERVICE_ROLE_KEY>')
  process.exit(1)
}

const SUPABASE_URL = 'https://gakmevnkyjldhzmfyyzq.supabase.co'
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Real regulatory alerts — curated March 2026
const ALERTS = [
  // ── EU ──────────────────────────────────────────────────────────────────────
  {
    external_id: 'eu-cbam-q1-2026',
    country_code: 'EU', country_name: 'European Union', flag: '🇪🇺',
    alert_type: 'deadline', severity: 'critical',
    title: 'CBAM Q1 2026 quarterly report due 31 Jan 2026',
    change_description: 'Importers must submit quarterly embedded emissions declaration for steel, aluminium, cement, fertilisers, electricity, and hydrogen. Penalty: 3× carbon price per unreported tCO₂e.',
    source_url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    source_name: 'EU Taxation & Customs', date: '2026-01-31',
    product_tags: ['steel', 'chemicals', 'machinery'],
  },
  {
    external_id: 'eu-cbam-definitive-2026',
    country_code: 'EU', country_name: 'European Union', flag: '🇪🇺',
    alert_type: 'regulation_change', severity: 'critical',
    title: 'CBAM definitive phase from 1 January 2026 — certificates required',
    change_description: 'CBAM enters definitive phase. Importers must purchase CBAM certificates proportional to the embedded carbon price. Transitional reporting-only phase ended Dec 2025.',
    source_url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    source_name: 'EU Regulation 2023/956', date: '2026-01-01',
    product_tags: ['steel', 'chemicals', 'machinery'],
  },
  {
    external_id: 'eu-deforestation-2026',
    country_code: 'EU', country_name: 'European Union', flag: '🇪🇺',
    alert_type: 'deadline', severity: 'warning',
    title: 'EU Deforestation Regulation (EUDR) enforcement from 30 Dec 2025',
    change_description: 'EUDR applies to soy, cattle, palm oil, wood, cocoa, coffee, rubber and derived products. Exporters must provide geolocation data proving goods not from deforested land post-Dec 2020.',
    source_url: 'https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en',
    source_name: 'EU Environment', date: '2025-12-30',
    product_tags: ['agricultural', 'textiles'],
  },
  {
    external_id: 'eu-cs3d-2026',
    country_code: 'EU', country_name: 'European Union', flag: '🇪🇺',
    alert_type: 'regulation_change', severity: 'info',
    title: 'EU Corporate Sustainability Due Diligence Directive (CS3D) transposition deadline',
    change_description: 'EU member states must transpose CS3D by July 2026. Large companies (>5000 employees) must map supply chain human rights and environmental risks. Affects Indian exporters to EU.',
    source_url: 'https://commission.europa.eu/business-economy-euro/doing-business-eu/sustainability-due-diligence-responsible-business/corporate-sustainability-due-diligence_en',
    source_name: 'EU Commission', date: '2026-07-26',
    product_tags: ['textiles', 'chemicals', 'steel'],
  },
  // ── US ──────────────────────────────────────────────────────────────────────
  {
    external_id: 'us-uflpa-2026-q1',
    country_code: 'US', country_name: 'United States', flag: '🇺🇸',
    alert_type: 'regulation_change', severity: 'critical',
    title: 'UFLPA Entity List expanded — additional Xinjiang suppliers added',
    change_description: 'CBP expanded UFLPA Entity List. Goods containing inputs from listed entities are rebuttably presumed forced-labor and barred entry. Affects textiles, automotive, electronics supply chains.',
    source_url: 'https://www.cbp.gov/trade/forced-labor/UFLPA',
    source_name: 'US CBP Forced Labor', date: '2026-02-15',
    product_tags: ['textiles', 'electronics'],
  },
  {
    external_id: 'us-tariff-india-2025',
    country_code: 'US', country_name: 'United States', flag: '🇺🇸',
    alert_type: 'regulation_change', severity: 'warning',
    title: 'US Section 232 steel/aluminium tariffs — India exemption expired',
    change_description: 'India\'s TRQ exemption from Section 232 25% steel tariffs has not been renewed. Steel and aluminium exports to US face the full 25%/10% tariff unless exported within quota.',
    source_url: 'https://www.trade.gov/section-232-investigations',
    source_name: 'US Dept of Commerce', date: '2025-12-01',
    product_tags: ['steel'],
  },
  {
    external_id: 'us-india-trade-deal-2026',
    country_code: 'US', country_name: 'United States', flag: '🇺🇸',
    alert_type: 'fta_update', severity: 'info',
    title: 'India-US mini trade deal framework under active negotiation',
    change_description: 'India and US resumed bilateral trade negotiations under Trump administration. Potential GSP restoration and reduced tariffs on pharma, textiles. No signed deal yet — watch for announcements.',
    source_url: 'https://ustr.gov/countries-regions/south-central-asia/india',
    source_name: 'USTR', date: '2026-02-01',
    product_tags: ['textiles', 'chemicals'],
  },
  // ── UK ──────────────────────────────────────────────────────────────────────
  {
    external_id: 'uk-india-fta-2026',
    country_code: 'UK', country_name: 'United Kingdom', flag: '🇬🇧',
    alert_type: 'fta_update', severity: 'critical',
    title: 'India-UK Free Trade Agreement — final round of negotiations underway',
    change_description: 'India-UK FTA final round in progress. Expect preferential tariffs on textiles (12%→0%), pharmaceuticals, and engineering goods. Agreement expected Q3 2026 pending political clearance.',
    source_url: 'https://www.gov.uk/government/collections/uk-india-free-trade-agreement',
    source_name: 'UK HMRC', date: '2026-03-01',
    product_tags: ['textiles', 'chemicals'],
  },
  {
    external_id: 'uk-cbam-2027',
    country_code: 'UK', country_name: 'United Kingdom', flag: '🇬🇧',
    alert_type: 'regulation_change', severity: 'warning',
    title: 'UK CBAM launches 1 January 2027 — prepare now',
    change_description: 'UK Carbon Border Adjustment Mechanism covers aluminium, cement, ceramics, fertilisers, glass, hydrogen, iron and steel. Importers must report embedded emissions from Jan 2027.',
    source_url: 'https://www.gov.uk/guidance/uk-carbon-border-adjustment-mechanism',
    source_name: 'UK HMRC', date: '2027-01-01',
    product_tags: ['steel', 'chemicals'],
  },
  // ── UAE ─────────────────────────────────────────────────────────────────────
  {
    external_id: 'uae-cepa-review-2026',
    country_code: 'UAE', country_name: 'United Arab Emirates', flag: '🇦🇪',
    alert_type: 'fta_update', severity: 'info',
    title: 'India-UAE CEPA first bilateral review completed — zero duty extended',
    change_description: 'First year review of India-UAE CEPA confirms zero duty on 99% of Indian goods. Rules of Origin compliance verified. Certificate of Origin from FIEO/APEDA mandatory.',
    source_url: 'https://dpiit.gov.in/trade-india/fta-details',
    source_name: 'DPIIT India', date: '2026-01-15',
    product_tags: ['textiles', 'machinery', 'chemicals'],
  },
  {
    external_id: 'uae-vat-excise-2026',
    country_code: 'UAE', country_name: 'United Arab Emirates', flag: '🇦🇪',
    alert_type: 'regulation_change', severity: 'info',
    title: 'UAE extends 5% VAT to all B2B imports — no threshold changes',
    change_description: 'UAE confirms 5% VAT on all commercial imports including from India-CEPA partner. VAT refundable for registered UAE businesses. Indian exporters must quote VAT-exclusive invoices.',
    source_url: 'https://tax.gov.ae/en/taxes/vat',
    source_name: 'UAE FTA', date: '2026-01-01',
    product_tags: ['textiles', 'machinery', 'chemicals', 'steel'],
  },
  // ── Japan ────────────────────────────────────────────────────────────────────
  {
    external_id: 'japan-cepa-roo-2026',
    country_code: 'Japan', country_name: 'Japan', flag: '🇯🇵',
    alert_type: 'fta_update', severity: 'warning',
    title: 'India-Japan CEPA: Rules of Origin verification intensified at customs',
    change_description: 'Japan customs increased post-clearance audits on India-Japan CEPA claims. Exporters must retain detailed value-addition evidence for 5 years. Failure to verify ROO results in MFN duty recovery + penalties.',
    source_url: 'https://www.customs.go.jp/zeikan/seido/kokkyo_taisaku/pdf/IndiaJapan_EPA_e.pdf',
    source_name: 'Japan Customs', date: '2026-01-01',
    product_tags: ['machinery', 'electronics'],
  },
  // ── India (domestic export policy) ──────────────────────────────────────────
  {
    external_id: 'in-rodtep-notification-60',
    country_code: 'IN', country_name: 'India', flag: '🇮🇳',
    alert_type: 'regulation_change', severity: 'critical',
    title: 'DGFT Notification 60/2025-26 — RoDTEP rates cut 50% for Ch 25+ from 1 Apr 2026',
    change_description: 'DGFT has halved RoDTEP rates for Chapters 25 onwards effective 1 April 2026 per Notification No. 60/2025-26 dated 23 Feb 2026. Chapters 01-24 remain at full rates per Corrigendum dated 24 Feb 2026.',
    source_url: 'https://dgft.gov.in/CP/',
    source_name: 'DGFT', date: '2026-04-01',
    product_tags: ['steel', 'chemicals', 'machinery', 'textiles'],
  },
  {
    external_id: 'in-export-lcl-2026',
    country_code: 'IN', country_name: 'India', flag: '🇮🇳',
    alert_type: 'regulation_change', severity: 'info',
    title: 'CBIC circular — LUT validity auto-renewed for GST exporters FY 2026-27',
    change_description: 'CBIC confirmed auto-renewal of Letter of Undertaking (LUT) for zero-rated export supplies. Exporters need not file fresh Form GST RFD-11 for FY 2026-27 if prior year LUT was accepted.',
    source_url: 'https://cbic.gov.in/htdocs-cbec/gst/index',
    source_name: 'CBIC India', date: '2026-04-01',
    product_tags: ['textiles', 'chemicals', 'machinery', 'steel', 'agricultural'],
  },
  // ── Australia ────────────────────────────────────────────────────────────────
  {
    external_id: 'aus-ecta-phase2-2026',
    country_code: 'Australia', country_name: 'Australia', flag: '🇦🇺',
    alert_type: 'fta_update', severity: 'info',
    title: 'India-Australia ECTA Phase 2 — tariff reductions effective 29 Dec 2025',
    change_description: 'Third scheduled tariff cut under ECTA takes effect. Additional 800 tariff lines move to 0% for Indian goods. CECA comprehensive negotiations ongoing — full FTA expected 2026.',
    source_url: 'https://www.dfat.gov.au/trade/agreements/in-force/iacpta',
    source_name: 'DFAT Australia', date: '2025-12-29',
    product_tags: ['textiles', 'chemicals', 'agricultural', 'machinery'],
  },
]

async function main() {
  console.log(`Seeding ${ALERTS.length} regulatory alerts...`)

  const rows = ALERTS.map(a => ({
    ...a,
    scraped_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('regulatory_changes')
    .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: false })

  if (error) {
    console.error('Insert error:', error.message)
    process.exit(1)
  }

  // Verify
  const { count } = await supabase
    .from('regulatory_changes')
    .select('*', { count: 'exact', head: true })

  console.log(`Done! Total rows in regulatory_changes: ${count}`)

  // Show critical ones
  const { data: critical } = await supabase
    .from('regulatory_changes')
    .select('country_code, title, date')
    .eq('severity', 'critical')
    .order('date', { ascending: true })

  console.log('\nCritical alerts:')
  critical?.forEach(r => console.log(`  [${r.country_code}] ${r.date}  ${r.title}`))
}

main()
