// ============================================================================
// GSTIN validation
//
// GSTIN is typed free-hand in Settings and then printed onto the RoDTEP claim
// register, the LC template and the CoO worksheet. A transposed digit is the
// same class of defect as the HS/invoice mismatch that already got a claim
// rejected — silent at entry, expensive at filing.
//
// Structure: 15 characters.
//   [0-1]   state code, 01-38 (and 97 for other territory)
//   [2-11]  PAN of the entity
//   [12]    entity number for that PAN within the state
//   [13]    'Z' by default
//   [14]    checksum
// ============================================================================

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/
const CHECKSUM_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Two-digit GST state codes mapped to the state name used in Settings. */
export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi',
  '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '25': 'Daman and Diu', '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra', '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh',
  '38': 'Ladakh', '97': 'Other Territory',
}

/**
 * GSTIN checksum: weight alternates 1,2 across the first 14 characters, and
 * each product is folded (quotient + remainder) before summing.
 */
function expectedChecksum(first14: string): string | null {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const value = CHECKSUM_ALPHABET.indexOf(first14[i])
    if (value === -1) return null
    const product = value * (i % 2 === 0 ? 1 : 2)
    sum += Math.floor(product / 36) + (product % 36)
  }
  const remainder = sum % 36
  return CHECKSUM_ALPHABET[(36 - remainder) % 36]
}

export interface GstinCheck {
  valid: boolean
  /** State name implied by the first two digits, when they are a real code. */
  stateFromCode?: string
  error?: string
}

export function validateGstin(raw: string | null | undefined, declaredState?: string | null): GstinCheck {
  const gstin = (raw ?? '').trim().toUpperCase()
  if (gstin.length === 0) return { valid: false, error: 'GSTIN is empty' }
  if (gstin.length !== 15) return { valid: false, error: `GSTIN must be 15 characters, got ${gstin.length}` }
  if (!GSTIN_PATTERN.test(gstin)) {
    return { valid: false, error: 'GSTIN format is wrong — expected 2 digits, 5 letters, 4 digits, 1 letter, 1 character, Z, 1 character' }
  }

  const stateCode = gstin.slice(0, 2)
  const stateFromCode = GST_STATE_CODES[stateCode]
  if (!stateFromCode) {
    return { valid: false, error: `"${stateCode}" is not a valid GST state code` }
  }

  const expected = expectedChecksum(gstin.slice(0, 14))
  if (expected !== gstin[14]) {
    return { valid: false, stateFromCode, error: 'GSTIN checksum does not match — check for a mistyped character' }
  }

  if (declaredState && declaredState.trim().length > 0) {
    const declared = declaredState.trim().toLowerCase()
    if (stateFromCode.toLowerCase() !== declared) {
      return {
        valid: false,
        stateFromCode,
        error: `GSTIN begins ${stateCode}, which is ${stateFromCode}, but the state is set to "${declaredState}"`,
      }
    }
  }

  return { valid: true, stateFromCode }
}
