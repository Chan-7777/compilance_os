// ============================================================================
// Data Layer - Central export for all regulatory data
// ============================================================================

// Regulatory Database
export {
  REGULATORY_DB,
  COUNTRY_CODES,
  getCountryData,
  isProductCoveredByCBAM,
  getCertifications,
} from './regulatory-db'

// Product Categories
export {
  PRODUCT_CATEGORIES,
  getProductById,
  getProductByHsPrefix,
  getProductIds,
  isValidProductId,
} from './products'

// FTA Database
export {
  FTA_DATABASE,
  getActiveFTAs,
  getFTAByCountry,
  hasPreferentialTariff,
  getFTAsUnderNegotiation,
  getFTASummary,
} from './fta'

// Indian Export Schemes
export {
  INDIAN_EXPORT_SCHEMES,
  getActiveSchemes,
  getSchemeByName,
  getSchemeNames,
  isValidScheme,
  getSchemesByStatus,
} from './indian-schemes'

// FTA Compliance Details (scraped from Trade Connect)
export {
  FTA_COMPLIANCE_DETAILS,
  type HSComplianceDetail,
} from './fta_compliance_details'
