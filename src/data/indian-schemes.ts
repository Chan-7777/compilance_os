// ============================================================================
// Indian Export Schemes - Government incentives and benefits for exporters
// ============================================================================

import type { ExportScheme } from '@/types'

export const INDIAN_EXPORT_SCHEMES: ExportScheme[] = [
  {
    name: 'RoDTEP',
    desc: 'Remission of Duties and Taxes on Exported Products',
    status: 'Active',
  },
  {
    name: 'PLI Scheme',
    desc: 'Production Linked Incentive for eligible sectors',
    status: 'Sector-specific',
  },
  {
    name: 'MEIS/RoSCTL',
    desc: 'Merchandise Exports from India / Rebate of State and Central Taxes',
    status: 'Check current rates',
  },
  {
    name: 'Advance Authorization',
    desc: 'Duty-free import of inputs for export production',
    status: 'Active',
  },
  {
    name: 'EPCG Scheme',
    desc: 'Export Promotion Capital Goods at zero/reduced duty',
    status: 'Active',
  },
  {
    name: 'SEZ/EOU Benefits',
    desc: 'Special Economic Zone / Export Oriented Unit tax benefits',
    status: 'Active',
  },
  {
    name: 'ECGC Insurance',
    desc: 'Export Credit Guarantee Corporation coverage',
    status: 'Active',
  },
  {
    name: 'Market Access Initiative',
    desc: 'Financial assistance for export promotion activities',
    status: 'Active',
  },
]

/**
 * Get all schemes with Active status
 */
export function getActiveSchemes(): ExportScheme[] {
  return INDIAN_EXPORT_SCHEMES.filter(scheme => scheme.status === 'Active')
}

/**
 * Get a scheme by its exact name
 */
export function getSchemeByName(name: string): ExportScheme | undefined {
  return INDIAN_EXPORT_SCHEMES.find(scheme => scheme.name === name)
}

/**
 * Get all scheme names
 */
export function getSchemeNames(): string[] {
  return INDIAN_EXPORT_SCHEMES.map(s => s.name)
}

/**
 * Check if a scheme exists
 */
export function isValidScheme(name: string): boolean {
  return INDIAN_EXPORT_SCHEMES.some(s => s.name === name)
}

/**
 * Get schemes by status
 */
export function getSchemesByStatus(status: string): ExportScheme[] {
  return INDIAN_EXPORT_SCHEMES.filter(s => s.status === status)
}
