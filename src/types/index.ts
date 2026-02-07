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
  | 'one-time'
  | 'pre-production'
  | 'pre-shipment'
  | 'per-shipment'
  | 'annual'
  | 'quarterly'

export interface ChecklistItem {
  id: number
  category: string
  item: string
  priority: ChecklistPriority
  phase: ChecklistPhase
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

export type ShipmentStatus = 'preparing' | 'in_transit' | 'delivered'

export interface Shipment {
  id: number
  name: string
  product: string
  country: string
  date: string
  status: ShipmentStatus
  checklist: ChecklistItem[]
  completed: number
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

export interface AppState {
  currentView: ViewType
  selectedProduct: string | null
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
