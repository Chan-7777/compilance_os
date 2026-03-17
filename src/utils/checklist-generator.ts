// ============================================================================
// Checklist Generator - Generate compliance checklists for shipments
// ============================================================================

import type { ChecklistItem, ChecklistPhase, ChecklistPriority, CountryCode } from '@/types'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { FTA_DATABASE } from '@/data/fta'
import { getHSProduct } from '@/data/hs-product-db'

/**
 * Generate a comprehensive compliance checklist for a product-country combination.
 * When hsCode is provided, HS-specific items are appended after the base category checklist.
 */
export function generateChecklist(product: string, country: string, hsCode?: string): ChecklistItem[] {
  const countryData = REGULATORY_DB[country as CountryCode]
  if (!countryData) return []

  const checklist: ChecklistItem[] = []
  let id = 1

  // ─── PRE-SHIPMENT DOCUMENTATION ───────────────────────────────────────
  checklist.push({
    id: id++,
    category: 'Documentation',
    item: 'Commercial Invoice with all required fields',
    priority: 'critical',
    phase: 'pre-shipment',
  })
  checklist.push({
    id: id++,
    category: 'Documentation',
    item: 'Packing List',
    priority: 'critical',
    phase: 'pre-shipment',
  })
  checklist.push({
    id: id++,
    category: 'Documentation',
    item: 'Bill of Lading / Airway Bill',
    priority: 'critical',
    phase: 'pre-shipment',
  })
  checklist.push({
    id: id++,
    category: 'Documentation',
    item: 'Shipping Bill (Indian Customs)',
    priority: 'critical',
    phase: 'pre-shipment',
  })
  checklist.push({
    id: id++,
    category: 'Documentation',
    item: 'Letter of Credit / Payment Terms Documentation',
    priority: 'high',
    phase: 'pre-shipment',
  })
  checklist.push({
    id: id++,
    category: 'Documentation',
    item: 'Insurance Certificate',
    priority: 'high',
    phase: 'pre-shipment',
  })

  // ─── CERTIFICATE OF ORIGIN ────────────────────────────────────────────
  const fta = FTA_DATABASE[country as CountryCode]
  if (fta?.preferentialTariff) {
    checklist.push({
      id: id++,
      category: 'Trade Agreement',
      item: `Certificate of Origin (for ${fta.name} preferential tariff)`,
      priority: 'critical',
      phase: 'pre-shipment',
    })
    checklist.push({
      id: id++,
      category: 'Trade Agreement',
      item: 'Rules of Origin compliance documentation',
      priority: 'high',
      phase: 'pre-shipment',
    })
  } else {
    checklist.push({
      id: id++,
      category: 'Documentation',
      item: 'Non-preferential Certificate of Origin',
      priority: 'high',
      phase: 'pre-shipment',
    })
  }

  // ─── PRODUCT-SPECIFIC CERTIFICATIONS ──────────────────────────────────
  const certs =
    countryData.certifications?.[product] || countryData.certifications?.general || []
  certs.forEach(cert => {
    checklist.push({
      id: id++,
      category: 'Certification',
      item: cert,
      priority: 'critical',
      phase: 'pre-production',
    })
  })

  // ─── CBAM REQUIREMENTS ────────────────────────────────────────────────
  if (countryData.cbam?.active) {
    const sectors = countryData.cbam.coveredSectors || []
    const isCovered =
      sectors.includes(product) || product === 'chemicals' || product === 'steel'

    if (isCovered) {
      checklist.push({
        id: id++,
        category: 'CBAM',
        item: 'Embedded emissions calculation (direct + indirect)',
        priority: 'critical',
        phase: 'pre-shipment',
      })
      checklist.push({
        id: id++,
        category: 'CBAM',
        item: 'Carbon content declaration to importer',
        priority: 'critical',
        phase: 'pre-shipment',
      })
      checklist.push({
        id: id++,
        category: 'CBAM',
        item: 'Verification by accredited verifier',
        priority: 'high',
        phase: 'quarterly',
      })
      checklist.push({
        id: id++,
        category: 'CBAM',
        item: 'CBAM registry registration (via importer)',
        priority: 'high',
        phase: 'one-time',
      })
    }
  }

  // ─── ESG REQUIREMENTS ─────────────────────────────────────────────────
  if (countryData.esg?.scope3Required) {
    checklist.push({
      id: id++,
      category: 'ESG',
      item: 'Scope 1, 2, 3 emissions data prepared',
      priority: 'high',
      phase: 'annual',
    })
  }
  if (countryData.esg?.csrd) {
    checklist.push({
      id: id++,
      category: 'ESG',
      item: 'ESRS-aligned sustainability data for buyer',
      priority: 'medium',
      phase: 'annual',
    })
  }

  // ─── PACKAGING REQUIREMENTS ───────────────────────────────────────────
  const packaging = countryData.packaging || []
  packaging.forEach(pkg => {
    checklist.push({
      id: id++,
      category: 'Packaging',
      item: pkg,
      priority: 'medium',
      phase: 'pre-production',
    })
  })

  // ─── LABELING REQUIREMENTS ────────────────────────────────────────────
  const labeling = countryData.labeling || []
  labeling.forEach(lbl => {
    checklist.push({
      id: id++,
      category: 'Labeling',
      item: lbl,
      priority: 'high',
      phase: 'pre-production',
    })
  })

  // ─── CUSTOMS REQUIREMENTS ─────────────────────────────────────────────
  const customs = countryData.customs || []
  customs.forEach(cust => {
    checklist.push({
      id: id++,
      category: 'Customs',
      item: cust,
      priority: 'high',
      phase: 'pre-shipment',
    })
  })

  // ─── SANCTIONS SCREENING ──────────────────────────────────────────────
  const sanctions = countryData.sanctions || []
  sanctions.forEach(s => {
    checklist.push({
      id: id++,
      category: 'Sanctions',
      item: s,
      priority: 'critical',
      phase: 'pre-shipment',
    })
  })

  // ─── INDIAN EXPORT COMPLIANCE (ALWAYS REQUIRED) ───────────────────────
  checklist.push({
    id: id++,
    category: 'Indian Compliance',
    item: 'IEC (Import Export Code) valid and active',
    priority: 'critical',
    phase: 'one-time',
  })
  checklist.push({
    id: id++,
    category: 'Indian Compliance',
    item: 'AD Code registered with bank',
    priority: 'critical',
    phase: 'one-time',
  })
  checklist.push({
    id: id++,
    category: 'Indian Compliance',
    item: 'GST & LUT for export without IGST payment',
    priority: 'critical',
    phase: 'annual',
  })
  checklist.push({
    id: id++,
    category: 'Indian Compliance',
    item: 'FEMA compliance for foreign exchange receipt',
    priority: 'high',
    phase: 'per-shipment',
  })
  checklist.push({
    id: id++,
    category: 'Indian Compliance',
    item: 'RBI reporting (EDPMS)',
    priority: 'high',
    phase: 'per-shipment',
  })
  checklist.push({
    id: id++,
    category: 'Indian Compliance',
    item: 'E-way bill (if applicable)',
    priority: 'medium',
    phase: 'per-shipment',
  })
  checklist.push({
    id: id++,
    category: 'Indian Compliance',
    item: 'Quality pre-shipment inspection (if mandated)',
    priority: 'high',
    phase: 'pre-shipment',
  })

  // ─── HS CODE-SPECIFIC ITEMS ───────────────────────────────────────────
  if (hsCode) {
    const hsProduct = getHSProduct(hsCode)
    const hsItems = hsProduct?.additionalItems?.[country] || []
    hsItems.forEach(hsItem => {
      checklist.push({
        id: id++,
        category: hsItem.category,
        item: `[${hsProduct!.hsCode}] ${hsItem.item}`,
        priority: hsItem.priority,
        phase: hsItem.phase,
        details: hsItem.details,
        required: hsItem.priority === 'critical',
      })
    })
  }

  return checklist
}

/**
 * Group checklist items by category
 */
export function getChecklistByCategory(
  checklist: ChecklistItem[]
): Record<string, ChecklistItem[]> {
  return checklist.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, ChecklistItem[]>
  )
}

/**
 * Calculate checklist completion progress
 */
export function getChecklistProgress(
  checklist: ChecklistItem[],
  checkedItems: Record<string, boolean>
): { total: number; completed: number; percentage: number } {
  const total = checklist.length
  const completed = checklist.filter(c => checkedItems[String(c.id)]).length
  const percentage = total > 0 ? (completed / total) * 100 : 0

  return { total, completed, percentage }
}

/**
 * Filter checklist items by phase
 */
export function filterChecklistByPhase(
  checklist: ChecklistItem[],
  phase: ChecklistPhase
): ChecklistItem[] {
  return checklist.filter(c => c.phase === phase)
}

/**
 * Filter checklist items by priority
 */
export function filterChecklistByPriority(
  checklist: ChecklistItem[],
  priority: ChecklistPriority
): ChecklistItem[] {
  return checklist.filter(c => c.priority === priority)
}

/**
 * Get categories present in a checklist
 */
export function getCategories(checklist: ChecklistItem[]): string[] {
  return [...new Set(checklist.map(c => c.category))]
}

/**
 * Count items by priority
 */
export function countByPriority(
  checklist: ChecklistItem[]
): Record<ChecklistPriority, number> {
  return checklist.reduce(
    (acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1
      return acc
    },
    { critical: 0, high: 0, medium: 0, low: 0 } as Record<ChecklistPriority, number>
  )
}

/**
 * Count items by phase
 */
export function countByPhase(checklist: ChecklistItem[]): Record<ChecklistPhase, number> {
  return checklist.reduce(
    (acc, item) => {
      acc[item.phase] = (acc[item.phase] || 0) + 1
      return acc
    },
    {
      'one-time': 0,
      'pre-production': 0,
      'pre-shipment': 0,
      'per-shipment': 0,
      annual: 0,
      quarterly: 0,
    } as Record<ChecklistPhase, number>
  )
}

/**
 * Get critical items that are not yet completed
 */
export function getPendingCriticalItems(
  checklist: ChecklistItem[],
  checkedItems: Record<string, boolean>
): ChecklistItem[] {
  return checklist.filter(
    c => c.priority === 'critical' && !checkedItems[String(c.id)]
  )
}
