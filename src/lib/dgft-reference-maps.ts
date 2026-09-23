// ============================================================================
// DGFT Reference Maps
//
// States, districts, UOMs, countries and domestic ports come from
// docs/Certificate+of+Origin+Open+API+v1.0.pdf, section 7 (Annexure), via
// src/lib/dgft-annexure-data.ts, which scripts/extract_dgft_annexure.py
// generates. Do not add entries by hand: a wrong port code ends up on a
// shipping bill. If a value is missing, get a newer DGFT source and rerun.
//
// What the PDF does not give, and so this module does not either:
//  - codes for states, districts or countries (the API takes the name)
//  - which state a district or a port is in, so nothing here can narrow
//    ports by state or districts by state
// The domestic port table stops at exactly 1,000 rows, as does the
// international table, which visibly ends mid-alphabet. Treat the port list
// as an extract: a code missing from it is not proof the code is wrong.
// ============================================================================

import {
  STATE_NAMES,
  DISTRICT_NAMES,
  UOM_ROWS,
  COUNTRY_NAMES,
  DOMESTIC_PORT_ROWS,
} from '@/lib/dgft-annexure-data'

export { DGFT_ANNEXURE_SOURCE } from '@/lib/dgft-annexure-data'

export interface DgftCodeEntry {
  code: string
  name: string
}

const key = (s: string) => s.trim().toUpperCase()

function byName(names: readonly string[]): Map<string, string> {
  return new Map(names.map(n => [key(n), n]))
}

// ─── States, districts, countries (names only) ─────────────────────────────

export const DGFT_STATES = STATE_NAMES
export const DGFT_DISTRICTS = DISTRICT_NAMES
export const DGFT_COUNTRIES = COUNTRY_NAMES

const STATES = byName(STATE_NAMES)
const DISTRICTS = byName(DISTRICT_NAMES)
const COUNTRIES = byName(COUNTRY_NAMES)

// ─── Units of measure ───────────────────────────────────────────────────────

export const DGFT_UOM_CODES: Record<string, DgftCodeEntry> =
  Object.fromEntries(UOM_ROWS.map(r => [r.code, { code: r.code, name: r.name }]))

// ─── Domestic ports ─────────────────────────────────────────────────────────

// Rows of the port table whose code is not IN + 4 characters (OTHERS, DEEMED
// and two malformed codes). Kept out of the picker; a user can still type one.
const PORT_CODE = /^IN[A-Z0-9]{4}$/

export const DGFT_PORTS: readonly DgftCodeEntry[] =
  DOMESTIC_PORT_ROWS.filter(r => PORT_CODE.test(r.code)).map(r => ({ code: r.code, name: r.name }))

export const DGFT_PORT_ROWS_EXCLUDED: readonly DgftCodeEntry[] =
  DOMESTIC_PORT_ROWS.filter(r => !PORT_CODE.test(r.code)).map(r => ({ code: r.code, name: r.name }))

const PORTS = new Map(DGFT_PORTS.map(p => [p.code, p]))

/** The PDF spelling of a state name, matched ignoring case and edge spaces. */
export function lookupState(name: string): string | undefined {
  return STATES.get(key(name))
}

/** The PDF spelling of a district name. The PDF cannot say which state it is in. */
export function lookupDistrict(name: string): string | undefined {
  return DISTRICTS.get(key(name))
}

/** A domestic port by its ICEGATE code (e.g. INNSA1), not by place name. */
export function lookupPort(code: string): DgftCodeEntry | undefined {
  return PORTS.get(key(code))
}

/** The PDF spelling of a country name. The PDF has no ISO codes. */
export function lookupCountry(name: string): string | undefined {
  return COUNTRIES.get(key(name))
}

export function lookupUom(code: string): DgftCodeEntry | undefined {
  return DGFT_UOM_CODES[key(code)]
}

// NOT from the annexure: the trade agreement and origin criterion tables
// below predate it and have not been checked against the PDF (7.2, 7.5).
// CoO integration is frozen; verify them before it is unfrozen.

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
export function lookupTradeAgreement(id: string): TradeAgreementEntry | undefined {
  return DGFT_TRADE_AGREEMENTS[id.trim().toUpperCase()]
}

export function lookupOriginCriterion(code: string): DgftCodeEntry | undefined {
  return DGFT_ORIGIN_CRITERIA[code.trim().toUpperCase()]
}
