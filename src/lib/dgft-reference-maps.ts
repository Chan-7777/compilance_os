// ============================================================================
// DGFT Reference Maps — Trade Notice 25/2026-27
//
// Static, typed lookup tables for the Annexure codes the DGFT Preferential
// Certificate of Origin API requires (state/district, port, country, UOM,
// trade agreement, issuing office). These are the codes the pre-flight
// validator checks user input against before anything is sent to DGFT.
//
// This is a starter set covering the states/ports/agreements most relevant
// to current ComplianceOS shipments, not the full DGFT annexure. Extend the
// maps below as more corridors come online — do not hardcode fallbacks
// elsewhere in the codebase.
// ============================================================================

export interface DgftCodeEntry {
  code: string
  name: string
}

// ─── States & Districts (Annexure — State/District codes) ──────────────────

export const DGFT_STATE_CODES: Record<string, DgftCodeEntry> = {
  'GUJARAT': { code: 'GJ', name: 'Gujarat' },
  'MAHARASHTRA': { code: 'MH', name: 'Maharashtra' },
  'TAMIL NADU': { code: 'TN', name: 'Tamil Nadu' },
  'KARNATAKA': { code: 'KA', name: 'Karnataka' },
  'DELHI': { code: 'DL', name: 'Delhi' },
  'HARYANA': { code: 'HR', name: 'Haryana' },
  'PUNJAB': { code: 'PB', name: 'Punjab' },
  'WEST BENGAL': { code: 'WB', name: 'West Bengal' },
  'UTTAR PRADESH': { code: 'UP', name: 'Uttar Pradesh' },
  'RAJASTHAN': { code: 'RJ', name: 'Rajasthan' },
  'TELANGANA': { code: 'TS', name: 'Telangana' },
  'ANDHRA PRADESH': { code: 'AP', name: 'Andhra Pradesh' },
}

// District codes are state-scoped in the DGFT annexure; keyed here as
// "STATE_CODE:DISTRICT_NAME" (upper-cased) → DGFT district code.
export const DGFT_DISTRICT_CODES: Record<string, DgftCodeEntry> = {
  'GJ:AHMEDABAD': { code: 'GJ-AHM', name: 'Ahmedabad' },
  'GJ:SURAT': { code: 'GJ-SUR', name: 'Surat' },
  'GJ:KACHCHH': { code: 'GJ-KUT', name: 'Kachchh' },
  'MH:MUMBAI': { code: 'MH-MUM', name: 'Mumbai' },
  'MH:PUNE': { code: 'MH-PUN', name: 'Pune' },
  'TN:CHENNAI': { code: 'TN-CHE', name: 'Chennai' },
  'TN:TIRUPUR': { code: 'TN-TIR', name: 'Tirupur' },
  'KA:BENGALURU': { code: 'KA-BLR', name: 'Bengaluru' },
  'DL:NEW DELHI': { code: 'DL-NDL', name: 'New Delhi' },
}

// ─── Ports (Annexure — Port of Loading / Discharge codes, ICEGATE-aligned) ──

export const DGFT_PORT_CODES: Record<string, DgftCodeEntry> = {
  'JNPT': { code: 'INNSA1', name: 'Jawaharlal Nehru Port, Mumbai' },
  'MUNDRA': { code: 'INMUN1', name: 'Mundra Port, Gujarat' },
  'CHENNAI': { code: 'INMAA1', name: 'Chennai Port' },
  'KOLKATA': { code: 'INCCU1', name: 'Kolkata Port' },
  'COCHIN': { code: 'INCOK1', name: 'Cochin Port' },
  'PIPAVAV': { code: 'INPAV1', name: 'Pipavav Port, Gujarat' },
  'KANDLA': { code: 'INIXY1', name: 'Kandla Port, Gujarat' },
  'DELHI AIR CARGO': { code: 'INDEL4', name: 'Delhi Air Cargo Complex' },
  'MUMBAI AIR CARGO': { code: 'INBOM4', name: 'Mumbai Air Cargo Complex' },
}

// ─── Countries (ISO 3166-1 alpha-2 ↔ DGFT country code) ─────────────────────

export const DGFT_COUNTRY_CODES: Record<string, DgftCodeEntry> = {
  'US': { code: 'USA', name: 'United States of America' },
  'GB': { code: 'GBR', name: 'United Kingdom' },
  'AE': { code: 'UAE', name: 'United Arab Emirates' },
  'DE': { code: 'DEU', name: 'Germany' },
  'FR': { code: 'FRA', name: 'France' },
  'NL': { code: 'NLD', name: 'Netherlands' },
  'IT': { code: 'ITA', name: 'Italy' },
  'ES': { code: 'ESP', name: 'Spain' },
  'JP': { code: 'JPN', name: 'Japan' },
  'AU': { code: 'AUS', name: 'Australia' },
  'SG': { code: 'SGP', name: 'Singapore' },
  'CN': { code: 'CHN', name: 'China' },
  'ZA': { code: 'ZAF', name: 'South Africa' },
  'BR': { code: 'BRA', name: 'Brazil' },
}

// ─── Units of Measure (standardized UOM codes) ──────────────────────────────

export const DGFT_UOM_CODES: Record<string, DgftCodeEntry> = {
  'KGS': { code: 'KGS', name: 'Kilograms' },
  'MTS': { code: 'MTS', name: 'Metric Tons' },
  'NOS': { code: 'NOS', name: 'Numbers' },
  'PCS': { code: 'PCS', name: 'Pieces' },
  'MTR': { code: 'MTR', name: 'Meters' },
  'SQM': { code: 'SQM', name: 'Square Meters' },
  'LTR': { code: 'LTR', name: 'Liters' },
  'DOZ': { code: 'DOZ', name: 'Dozens' },
  'SET': { code: 'SET', name: 'Sets' },
  'BOX': { code: 'BOX', name: 'Boxes' },
}

// ─── Trade Agreements (Agreement ID ↔ Regional / Issuing office code) ───────

export interface TradeAgreementEntry extends DgftCodeEntry {
  issuingOffice: string
  requiresExhibitionFlag: boolean
  requiresRollUpAbsorption: boolean
}

export const DGFT_TRADE_AGREEMENTS: Record<string, TradeAgreementEntry> = {
  'INDIA_ASEAN': {
    code: 'AIFTA', name: 'India-ASEAN Free Trade Agreement',
    issuingOffice: 'FIEO', requiresExhibitionFlag: true, requiresRollUpAbsorption: true,
  },
  'INDIA_UAE_CEPA': {
    code: 'UAECEPA', name: 'India-UAE Comprehensive Economic Partnership Agreement',
    issuingOffice: 'EIC', requiresExhibitionFlag: false, requiresRollUpAbsorption: true,
  },
  'INDIA_SAFTA': {
    code: 'SAFTA', name: 'South Asian Free Trade Area',
    issuingOffice: 'FIEO', requiresExhibitionFlag: true, requiresRollUpAbsorption: false,
  },
  'INDIA_KOREA_CEPA': {
    code: 'IKCEPA', name: 'India-Korea Comprehensive Economic Partnership Agreement',
    issuingOffice: 'FIEO', requiresExhibitionFlag: false, requiresRollUpAbsorption: true,
  },
  'INDIA_JAPAN_CEPA': {
    code: 'IJCEPA', name: 'India-Japan Comprehensive Economic Partnership Agreement',
    issuingOffice: 'FIEO', requiresExhibitionFlag: false, requiresRollUpAbsorption: true,
  },
  'INDIA_AUSTRALIA_ECTA': {
    code: 'AUSECTA', name: 'India-Australia Economic Cooperation and Trade Agreement',
    issuingOffice: 'EIC', requiresExhibitionFlag: false, requiresRollUpAbsorption: false,
  },
}

// ─── Origin criteria (rules-of-origin category codes) ───────────────────────

export const DGFT_ORIGIN_CRITERIA: Record<string, DgftCodeEntry> = {
  'WO': { code: 'WO', name: 'Wholly Obtained' },
  'PE': { code: 'PE', name: 'Produced Exclusively' },
  'CTH': { code: 'CTH', name: 'Change in Tariff Heading' },
  'CTSH': { code: 'CTSH', name: 'Change in Tariff Sub-Heading' },
  'RVC': { code: 'RVC', name: 'Regional Value Content' },
}

export function lookupState(name: string): DgftCodeEntry | undefined {
  return DGFT_STATE_CODES[name.trim().toUpperCase()]
}

export function lookupDistrict(stateCode: string, district: string): DgftCodeEntry | undefined {
  return DGFT_DISTRICT_CODES[`${stateCode.trim().toUpperCase()}:${district.trim().toUpperCase()}`]
}

export function lookupPort(name: string): DgftCodeEntry | undefined {
  return DGFT_PORT_CODES[name.trim().toUpperCase()]
}

export function lookupCountry(isoAlpha2: string): DgftCodeEntry | undefined {
  return DGFT_COUNTRY_CODES[isoAlpha2.trim().toUpperCase()]
}

export function lookupUom(code: string): DgftCodeEntry | undefined {
  return DGFT_UOM_CODES[code.trim().toUpperCase()]
}

export function lookupTradeAgreement(id: string): TradeAgreementEntry | undefined {
  return DGFT_TRADE_AGREEMENTS[id.trim().toUpperCase()]
}

export function lookupOriginCriterion(code: string): DgftCodeEntry | undefined {
  return DGFT_ORIGIN_CRITERIA[code.trim().toUpperCase()]
}
