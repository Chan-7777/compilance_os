// ============================================================================
// ComplianceOS Type Definitions
// ============================================================================

// ----------------------------------------------------------------------------
// Country & Regulatory Types
// ----------------------------------------------------------------------------

export interface KeyDate {
  date: string
  event: string
}

export interface RegulationChange {
  date: string
  change: string
}

export interface CBAMConfig {
  active: boolean
  phase: string
  coveredSectors?: string[]
  reportingFrequency?: string
  penaltyPerTonne?: string
  keyDates?: KeyDate[]
  notes?: string
}

export interface ESGConfig {
  csrd?: boolean
  tcfd?: boolean
  secClimate?: boolean
  taxonomy?: boolean
  dueDiligence?: string
  reportingStandards: string[]
  scope3Required: boolean
  notes?: string
}

export interface CountryRegulation {
  name: string
  flag: string
  cbam: CBAMConfig
  esg: ESGConfig
  certifications: Record<string, string[]>
  packaging: string[]
  labeling: string[]
  customs: string[]
  sanctions: string[]
  recentChanges?: RegulationChange[]
}

// ----------------------------------------------------------------------------
// Product Types
// ----------------------------------------------------------------------------

export interface ProductCategory {
  id: string
  label: string
  icon: string
  hsPrefix: string[]
}

export type ProductCode = 'food' | 'textiles' | 'chemicals' | 'electronics' | 'steel' | 'pharma' | 'automotive' | 'machinery' | 'general'

// ----------------------------------------------------------------------------
// FTA Types
// ----------------------------------------------------------------------------

export interface FTAStatus {
  name: string
  status: 'Active' | 'Under Negotiation' | 'No FTA'
  effectiveDate?: string
  round?: string
  preferentialTariff: boolean
  notes: string
}

// ----------------------------------------------------------------------------
// Export Scheme Types
// ----------------------------------------------------------------------------

export interface ExportScheme {
  name: string
  desc: string
  status: string
}

// ----------------------------------------------------------------------------
// Company Profile Types
// ----------------------------------------------------------------------------

export type CompanySize = 'micro' | 'small' | 'medium' | 'large'

export interface CompanyProfile {
  name: string
  size: CompanySize
  iec?: string
  gstin?: string
  // ICEGATE / customs filing fields
  address?: string
  city?: string
  state?: string
  pin?: string
  stateCode?: string
  portOfLoading?: string
  // Onboarding profile fields
  designation?: string
  whatsapp?: string
  turnoverRange?: string
  yearsExporting?: string
  knownRegulations?: string[]
  complianceConfidence?: number
  pastComplianceIssues?: string[]
  painPoints?: string[]
}

// ----------------------------------------------------------------------------
// Risk Assessment Types
// ----------------------------------------------------------------------------

export type RiskSeverity = 'high' | 'medium' | 'low' | 'info' | 'positive'
export type RiskLevel = 'high' | 'medium' | 'low'

export interface RiskFactor {
  category: string
  severity: RiskSeverity
  detail: string
}

export interface RiskResult {
  score: number
  level: RiskLevel
  factors: RiskFactor[]
  recommendations: string[]
}

// ----------------------------------------------------------------------------
// Checklist Types
// ----------------------------------------------------------------------------

export type ChecklistPriority = 'critical' | 'high' | 'medium' | 'low'
export type ChecklistPhase =
  | 'immediate'
  | 'one-time'
  | 'pre-production'
  | 'pre-shipment'
  | 'per-shipment'
  | 'annual'
  | 'quarterly'

export interface ChecklistItem {
  id: number | string
  category: string
  item: string
  priority: ChecklistPriority
  phase: ChecklistPhase
  required?: boolean
  details?: string
}

// ----------------------------------------------------------------------------
// Alert Types
// ----------------------------------------------------------------------------

export type AlertType = 'regulation_change' | 'deadline' | 'fta_update'
export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface Alert {
  id: number
  type: AlertType
  severity: AlertSeverity
  country: string
  countryName: string
  flag: string
  date: string
  message: string
}

// ----------------------------------------------------------------------------
// Shipment Types
// ----------------------------------------------------------------------------

export type ShipmentStatus = 'pending' | 'in_progress' | 'preparing' | 'in_transit' | 'delivered'
export type GateStatus = 'pending' | 'approved' | 'blocked'

export interface Shipment {
  id: string
  name: string
  product: string
  country: string
  date: string
  status: ShipmentStatus
  riskScore?: number
  checklist?: ChecklistItem[]
  completed?: number
  hsCode?: string
  shipmentValue?: number
  gateStatus?: GateStatus
  buyerName?: string
  exporterName?: string
  buyer?: string
  quantity?: number
  transportMode?: string
  sanctionsRisk?: 'clear' | 'flag' | 'block'
}

// ----------------------------------------------------------------------------
// Compliance Gate Types
// ----------------------------------------------------------------------------

export interface HSValidationResult {
  valid: boolean
  hs_code: string
  description: string
  suggestions: string[]
}

export interface FTAEligibilityResult {
  eligible: boolean
  agreement: string
  mfn_rate: number
  preferential_rate: number
  potential_savings: number
  india_import_duty?: number  // India's own MFN rate on this product (for duty drawback)
}

export interface COORequirement {
  required: boolean
  agreement_name: string
  issuing_authority: string
  document_type: string
}

export interface RulesOfOriginResult {
  applicable: boolean
  rule_text: string
}

export interface ChecklistProgressResult {
  total_items: number
  completed_items: number
  critical_pending: number
  completion_percentage: number
}

export interface SanctionsMatch {
  uid: string
  name: string
  matched_as: string
  entity_type: string
  program: string
  score: number
}

export interface SanctionsCheckResult {
  risk_level: 'clear' | 'flag' | 'block'
  matches: SanctionsMatch[]
  query_name: string
  checked_at: string
}

export interface GateCheckResult {
  shipment_id: string
  gate_status: GateStatus
  blocking_reasons: string[]
  hs_validation: HSValidationResult
  fta_eligibility: FTAEligibilityResult
  coo_requirement: COORequirement
  rules_of_origin: RulesOfOriginResult
  checklist_progress: ChecklistProgressResult
  sanctions_check?: SanctionsCheckResult
  cbam_scope?: {
    applies: boolean
    sector: string | null
    co2e_tonnes?: number
    estimated_levy_eur?: number
    emissions_formatted?: string
  }
  checked_at: string
}

// ----------------------------------------------------------------------------
// Landed Cost Types
// ----------------------------------------------------------------------------

export interface LandedCostLineItem {
  amount: number
  currency: string
  description: string
  type: string
}

export interface LandedCostResult {
  duties: LandedCostLineItem[]
  taxes: LandedCostLineItem[]
  fees: LandedCostLineItem[]
  total_duties: number
  total_taxes: number
  total_fees: number
  grand_total: number
  currency: string
}

// ----------------------------------------------------------------------------
// API Key Types
// ----------------------------------------------------------------------------

export interface APIKeyInfo {
  id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at?: string
  rate_limit: number
  permissions: string[]
}

// ----------------------------------------------------------------------------
// Application State Types
// ----------------------------------------------------------------------------

export type ViewType =
  | 'dashboard'
  | 'risk'
  | 'checklist'
  | 'alerts'
  | 'fta'
  | 'shipments'
  | 'settings'
  | 'label-validator'
  | 'eu-compliance'
  | 'rodtep'

export interface AppState {
  currentView: ViewType
  selectedProduct: string | null
  selectedHsCode: string | null       // specific HS code within the product category
  selectedHsProductName: string | null // display name for the selected HS product
  selectedCountries: string[]
  companyProfile: CompanyProfile
  checkedItems: Record<string, boolean>
  showOnboarding: boolean
  activeAlertFilter: 'all' | AlertSeverity
  searchQuery: string
  selectedShipment: Shipment | null
  shipments: Shipment[]
  showAddShipment: boolean
  newShipment: Partial<Shipment>
}

// ----------------------------------------------------------------------------
// Database Types (for type-safe access)
// ----------------------------------------------------------------------------

export type CountryCode = 'EU' | 'US' | 'UK' | 'UAE' | 'Japan' | 'Australia'

export type RegulatoryDatabase = Record<CountryCode, CountryRegulation>
export type FTADatabase = Record<CountryCode, FTAStatus>

// ----------------------------------------------------------------------------
// Label Validation Types
// ----------------------------------------------------------------------------

export type LabelRuleCategory =
  | 'Language'
  | 'Nutrition'
  | 'Safety'
  | 'Origin'
  | 'Product-Specific'
  | 'Religious'
  | 'Environmental'
  | 'Identification'

export type LabelRuleSeverity = 'mandatory' | 'recommended'

export interface LabelingRule {
  id: string
  rule: string
  category: LabelRuleCategory
  appliesTo: ProductCode | 'all'
  severity: LabelRuleSeverity
  reference: string
  guidance: string
}

export interface LabelRuleResult {
  rule: LabelingRule
  status: 'pass' | 'fail' | 'skipped'
}

export interface LabelValidationResult {
  score: number
  totalRules: number
  passedRules: number
  failedRules: number
  skippedRules: number
  results: LabelRuleResult[]
  overallStatus: 'compliant' | 'partially_compliant' | 'non_compliant'
}

export type LabelRulesDatabase = Record<CountryCode, LabelingRule[]>

