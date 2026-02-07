// ============================================================================
// Product Categories - Supported export product types with HS code mappings
// ============================================================================

import type { ProductCategory } from '@/types'

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'food', label: 'Food & Agriculture', icon: '🌾', hsPrefix: ['01-24'] },
  { id: 'textiles', label: 'Textiles & Apparel', icon: '🧵', hsPrefix: ['50-63'] },
  { id: 'chemicals', label: 'Chemicals & Fertilizers', icon: '⚗️', hsPrefix: ['28-38'] },
  { id: 'electronics', label: 'Electronics & Electricals', icon: '⚡', hsPrefix: ['84-85'] },
  { id: 'steel', label: 'Steel & Iron Products', icon: '🔩', hsPrefix: ['72-73'] },
  { id: 'pharma', label: 'Pharmaceuticals', icon: '💊', hsPrefix: ['30'] },
  { id: 'automotive', label: 'Automotive & Parts', icon: '🚗', hsPrefix: ['87'] },
  { id: 'machinery', label: 'Machinery & Equipment', icon: '⚙️', hsPrefix: ['84'] },
  { id: 'general', label: 'Other / General', icon: '📦', hsPrefix: [] },
]

/**
 * Get a product category by its ID
 */
export function getProductById(productId: string): ProductCategory | undefined {
  return PRODUCT_CATEGORIES.find(p => p.id === productId)
}

/**
 * Get a product category by HS code prefix
 * Returns the first matching category based on HS code range
 */
export function getProductByHsPrefix(hsCode: string): ProductCategory | undefined {
  const code = parseInt(hsCode, 10)
  if (isNaN(code)) return undefined

  for (const product of PRODUCT_CATEGORIES) {
    for (const prefix of product.hsPrefix) {
      // Handle range format like "01-24" or "72-73"
      if (prefix.includes('-')) {
        const [start, end] = prefix.split('-').map(s => parseInt(s, 10))
        if (code >= start && code <= end) {
          return product
        }
      } else {
        // Handle single code like "30" or "87"
        if (code === parseInt(prefix, 10)) {
          return product
        }
      }
    }
  }

  return undefined
}

/**
 * Get all product IDs
 */
export function getProductIds(): string[] {
  return PRODUCT_CATEGORIES.map(p => p.id)
}

/**
 * Check if a product ID is valid
 */
export function isValidProductId(productId: string): boolean {
  return PRODUCT_CATEGORIES.some(p => p.id === productId)
}
