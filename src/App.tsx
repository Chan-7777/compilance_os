// ============================================================================
// ComplianceOS - Main Application
// ============================================================================

import { useState, useMemo, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import {
  Dashboard,
  RiskAnalysis,
  Checklist,
  Alerts,
  FTASchemes,
  Shipments,
  Settings,
} from '@/components/views'
import {
  calculateMultiCountryRisk,
  generateChecklist,
  generateAlerts,
  getAlertCounts,
} from '@/utils'
import { getProductById } from '@/data'
import { colors } from '@theme/index'
import type {
  ViewType,
  CountryCode,
  CompanyProfile,
  Shipment,
  AlertSeverity,
  RiskResult,
} from '@/types'

// Default company profile
const DEFAULT_PROFILE: CompanyProfile = {
  name: 'My Company',
  size: 'small',
}

function App() {
  // -------------------------------------------------------------------------
  // Application State
  // -------------------------------------------------------------------------

  // Navigation
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')

  // Selections
  const [selectedProduct, setSelectedProduct] = useState<string>('steel')
  const [selectedCountries, setSelectedCountries] = useState<CountryCode[]>(['EU', 'UAE'])

  // Profile
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_PROFILE)

  // Checklist state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  // Alert filter
  const [activeAlertFilter, setActiveAlertFilter] = useState<'all' | AlertSeverity>('all')

  // Shipments
  const [shipments, setShipments] = useState<Shipment[]>([
    {
      id: 'ship-1',
      name: 'Steel Export Batch Q1',
      product: 'steel',
      country: 'EU',
      date: '2025-03-15',
      status: 'in_progress',
      riskScore: 72,
    },
    {
      id: 'ship-2',
      name: 'Textiles to UAE',
      product: 'textiles',
      country: 'UAE',
      date: '2025-04-01',
      status: 'pending',
      riskScore: 28,
    },
  ])

  // -------------------------------------------------------------------------
  // Computed Data
  // -------------------------------------------------------------------------

  // Get product display info
  const productInfo = useMemo(() => {
    const product = getProductById(selectedProduct)
    return product || { id: selectedProduct, label: selectedProduct, icon: '📦', hsPrefix: [] }
  }, [selectedProduct])

  // Calculate risk results for selected countries
  const riskResults = useMemo(() => {
    if (!selectedProduct || selectedCountries.length === 0) {
      return []
    }

    return calculateMultiCountryRisk(
      selectedProduct,
      selectedCountries,
      companyProfile.size
    ).map((result, index) => ({
      ...result,
      country: selectedCountries[index],
    }))
  }, [selectedProduct, selectedCountries, companyProfile.size])

  // Generate checklist for selected countries
  const checklist = useMemo(() => {
    if (!selectedProduct || selectedCountries.length === 0) {
      return []
    }

    // Generate checklist for first selected country (simplified)
    return generateChecklist(selectedProduct, selectedCountries[0])
  }, [selectedProduct, selectedCountries])

  // Generate alerts
  const alerts = useMemo(() => {
    return generateAlerts(selectedProduct, selectedCountries)
  }, [selectedProduct, selectedCountries])

  // Alert counts
  const alertCounts = useMemo(() => {
    return getAlertCounts(alerts)
  }, [alerts])

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------

  const handleNavigate = useCallback((view: ViewType) => {
    setCurrentView(view)
  }, [])

  const handleToggleChecklistItem = useCallback((itemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }, [])

  const handleAddShipment = useCallback((shipment: Omit<Shipment, 'id' | 'status'>) => {
    const newShipment: Shipment = {
      ...shipment,
      id: `ship-${Date.now()}`,
      status: 'pending',
    }
    setShipments(prev => [...prev, newShipment])
  }, [])

  const handleSelectShipment = useCallback((shipmentId: string) => {
    // Could navigate to shipment detail view
    console.log('Selected shipment:', shipmentId)
  }, [])

  const handleUpdateProfile = useCallback((profile: CompanyProfile) => {
    setCompanyProfile(profile)
  }, [])

  const handleSelectProduct = useCallback((productId: string) => {
    setSelectedProduct(productId)
  }, [])

  const handleToggleCountry = useCallback((country: CountryCode) => {
    setSelectedCountries(prev =>
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    )
  }, [])

  // -------------------------------------------------------------------------
  // Render Current View
  // -------------------------------------------------------------------------

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            companyProfile={companyProfile}
            selectedProduct={productInfo.label}
            selectedCountries={selectedCountries}
            riskResults={riskResults}
            alerts={alerts}
            onNavigate={handleNavigate}
          />
        )

      case 'risk':
        return (
          <RiskAnalysis
            selectedProduct={productInfo.label}
            riskResults={riskResults as Array<RiskResult & { country: CountryCode }>}
          />
        )

      case 'checklist':
        return (
          <Checklist
            selectedProduct={productInfo.label}
            selectedCountries={selectedCountries}
            checklist={checklist}
            checkedItems={checkedItems}
            onToggleItem={handleToggleChecklistItem}
          />
        )

      case 'alerts':
        return (
          <Alerts
            alerts={alerts}
            activeFilter={activeAlertFilter}
            onFilterChange={setActiveAlertFilter}
          />
        )

      case 'fta':
        return <FTASchemes selectedCountries={selectedCountries} />

      case 'shipments':
        return (
          <Shipments
            shipments={shipments}
            selectedProduct={selectedProduct}
            selectedCountries={selectedCountries}
            onAddShipment={handleAddShipment}
            onSelectShipment={handleSelectShipment}
          />
        )

      case 'settings':
        return (
          <Settings
            companyProfile={companyProfile}
            selectedProduct={selectedProduct}
            selectedCountries={selectedCountries}
            onUpdateProfile={handleUpdateProfile}
            onSelectProduct={handleSelectProduct}
            onToggleCountry={handleToggleCountry}
          />
        )

      default:
        return null
    }
  }

  // -------------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------------

  const appContainerStyle: React.CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: colors.background,
  }

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    marginLeft: '240px', // Sidebar width
    overflow: 'auto',
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div style={appContainerStyle} data-testid="app-container">
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        alertCount={alertCounts.critical}
      />
      <main style={mainContentStyle} data-testid="main-content">
        {renderView()}
      </main>
    </div>
  )
}

export default App
