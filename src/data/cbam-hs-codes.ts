// ============================================================================
// CBAM HS Headings — EU Carbon Border Adjustment Mechanism
// Source: EU Regulation 2023/956 Annex I (as amended)
// Covers 6 sectors: Cement, Electricity, Fertilisers, Iron & Steel, Aluminium, Hydrogen
//
// Matching strategy: first 4 digits of HS code (heading level).
// Some headings are only partially covered at CN level (e.g. 2804 only 2804.10,
// 2834 only 2834.21) — flagging at heading level is intentionally conservative.
// ============================================================================

export interface CBAMEntry {
  heading: string  // 4-digit HS heading e.g. '7208'
  sector: CBAMSector
  note?: string
}

export type CBAMSector =
  | 'Cement'
  | 'Electricity'
  | 'Fertilisers'
  | 'Iron and steel'
  | 'Aluminium'
  | 'Hydrogen'

// Map from 4-digit heading → sector
const CBAM_HEADING_MAP: Record<string, CBAMSector> = {
  // ── Cement ────────────────────────────────────────────────────
  '2523': 'Cement',   // Cement clinkers, Portland, aluminous, hydraulic cements

  // ── Electricity ───────────────────────────────────────────────
  '2716': 'Electricity',

  // ── Fertilisers (Chapters 28 & 31) ───────────────────────────
  '2808': 'Fertilisers',   // Nitric acid; sulphonitric acids
  '2814': 'Fertilisers',   // Ammonia (anhydrous + aqueous)
  '2834': 'Fertilisers',   // Nitrates (2834.21 potassium nitrate; conservative full heading)
  '3102': 'Fertilisers',   // Mineral/chemical fertilisers, nitrogenous
  '3105': 'Fertilisers',   // Mixed mineral/chemical fertilisers

  // ── Hydrogen ─────────────────────────────────────────────────
  '2804': 'Hydrogen',      // Hydrogen and noble gases (2804.10 hydrogen; heading-level flag)

  // ── Iron and Steel (Chapter 72 + selected Chapter 73) ────────
  '7206': 'Iron and steel',  // Ingots of iron/non-alloy steel
  '7207': 'Iron and steel',  // Semi-finished products of iron/non-alloy steel
  '7208': 'Iron and steel',  // Flat-rolled ≥600mm, hot-rolled
  '7209': 'Iron and steel',  // Flat-rolled ≥600mm, cold-rolled
  '7210': 'Iron and steel',  // Flat-rolled ≥600mm, clad/plated/coated
  '7211': 'Iron and steel',  // Flat-rolled <600mm, hot/cold-rolled
  '7212': 'Iron and steel',  // Flat-rolled <600mm, clad/plated/coated
  '7213': 'Iron and steel',  // Bars and rods, hot-rolled, coils
  '7214': 'Iron and steel',  // Bars and rods (other)
  '7215': 'Iron and steel',  // Bars and rods (other alloy/non-alloy)
  '7216': 'Iron and steel',  // Angles, shapes and sections
  '7217': 'Iron and steel',  // Wire of iron/non-alloy steel
  '7218': 'Iron and steel',  // Stainless steel, ingots and semi-finished
  '7219': 'Iron and steel',  // Flat-rolled products of stainless steel ≥600mm
  '7220': 'Iron and steel',  // Flat-rolled products of stainless steel <600mm
  '7221': 'Iron and steel',  // Bars and rods of stainless steel, hot-rolled
  '7222': 'Iron and steel',  // Bars, rods, angles, shapes of stainless steel
  '7223': 'Iron and steel',  // Wire of stainless steel
  '7224': 'Iron and steel',  // Other alloy steel, ingots and semi-finished
  '7225': 'Iron and steel',  // Flat-rolled products of other alloy steel ≥600mm
  '7226': 'Iron and steel',  // Flat-rolled products of other alloy steel <600mm
  '7227': 'Iron and steel',  // Bars and rods of other alloy steel, hot-rolled
  '7228': 'Iron and steel',  // Bars, rods, hollow drill bars of other alloy steel
  '7229': 'Iron and steel',  // Wire of other alloy steel
  // Chapter 73 selected headings:
  '7301': 'Iron and steel',  // Sheet piling; angles, shapes, sections
  '7302': 'Iron and steel',  // Railway/tramway construction material
  '7303': 'Iron and steel',  // Tubes, pipes, hollow profiles of cast iron
  '7304': 'Iron and steel',  // Tubes, pipes, hollow profiles, seamless
  '7305': 'Iron and steel',  // Tubes and pipes (other, external diameter >406.4mm)
  '7306': 'Iron and steel',  // Tubes, pipes, hollow profiles (other)
  '7307': 'Iron and steel',  // Tube/pipe fittings of iron/steel
  '7308': 'Iron and steel',  // Structures and parts thereof
  '7309': 'Iron and steel',  // Reservoirs, tanks >300L
  '7310': 'Iron and steel',  // Tanks, casks, drums ≤300L
  '7311': 'Iron and steel',  // Containers for compressed/liquefied gas
  '7318': 'Iron and steel',  // Screws, bolts, nuts, washers
  '7326': 'Iron and steel',  // Other articles of iron/steel

  // ── Aluminium (Chapter 76) ────────────────────────────────────
  '7601': 'Aluminium',  // Unwrought aluminium
  '7603': 'Aluminium',  // Aluminium powders and flakes
  '7604': 'Aluminium',  // Aluminium bars, rods and profiles
  '7605': 'Aluminium',  // Aluminium wire
  '7606': 'Aluminium',  // Aluminium plates, sheets, strip >0.2mm
  '7607': 'Aluminium',  // Aluminium foil ≤0.2mm
  '7608': 'Aluminium',  // Aluminium tubes and pipes
  '7609': 'Aluminium',  // Aluminium tube/pipe fittings
  '7610': 'Aluminium',  // Aluminium structures and parts
  '7611': 'Aluminium',  // Aluminium reservoirs, tanks etc. >300L
  '7612': 'Aluminium',  // Aluminium casks, drums, cans etc. ≤300L
  '7613': 'Aluminium',  // Containers for compressed/liquefied gas
  '7614': 'Aluminium',  // Stranded wire, cables, of aluminium
  '7615': 'Aluminium',  // Table, kitchen, household articles of aluminium
  '7616': 'Aluminium',  // Other articles of aluminium
}

/**
 * Returns the CBAM sector name if the HS code falls within CBAM Annex I scope,
 * or null if not covered. Works with any HS format (with/without dots, 4-8 digits).
 */
export function getCBAMSector(hsCode: string): CBAMSector | null {
  const digits = hsCode.replace(/\D/g, '')
  if (digits.length < 4) return null
  const heading = digits.slice(0, 4)
  return CBAM_HEADING_MAP[heading] ?? null
}

/**
 * Returns true if the HS code is in CBAM Annex I scope AND destination is EU.
 */
export function isCBAMScope(hsCode: string, destinationCountry: string): boolean {
  if (destinationCountry !== 'EU') return false
  return getCBAMSector(hsCode) !== null
}

export const CBAM_SECTORS: CBAMSector[] = [
  'Cement', 'Electricity', 'Fertilisers', 'Iron and steel', 'Aluminium', 'Hydrogen',
]
