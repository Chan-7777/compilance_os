// ============================================================================
// ComplianceOS - Main Application
// Phase 2: API-first architecture — all data fetched from FastAPI backend
// ============================================================================

import { useState, useMemo, useCallback, useTransition, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Auth } from '@/components/Auth'
import { Spinner } from '@/components/Spinner'
import {
  Dashboard,
  RiskAnalysis,
  Checklist,
  Alerts,
  FTASchemes,
  Shipments,
  Settings,
} from '@/components/views'
import { getProductById } from '@/data'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { fetchBatchRiskScore, fetchChecklist, fetchAlerts } from '@/lib/api'
import { colors } from '@theme/index'
import type {
  ViewType,
  CountryCode,
  CompanyProfile,
  Shipment,
  AlertSeverity,
  RiskResult,
} from '@/types'

// Check if Supabase is configured
const SUPABASE_ENABLED = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Default company profile (used when Supabase is not configured)
const DEFAULT_PROFILE: CompanyProfile = {
  name: 'My Company',
  size: 'small',
}

function App() {
  const auth = useAuth()

  // -------------------------------------------------------------------------
  // Application State
  // -------------------------------------------------------------------------

  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [isPending, startTransition] = useTransition()

  const [selectedProduct, setSelectedProduct] = useState<string>('steel')
  const [selectedCountries, setSelectedCountries] = useState<CountryCode[]>(['EU', 'UAE'])
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_PROFILE)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [activeAlertFilter, setActiveAlertFilter] = useState<'all' | AlertSeverity>('all')

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
  // API-fetched data (replaces static utils from Phase 1)
  // -------------------------------------------------------------------------

  const [riskResults, setRiskResults] = useState<any[]>([])
  const [checklist, setChecklist] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0, info: 0 })

  const [riskLoading, setRiskLoading] = useState(false)
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [alertsLoading, setAlertsLoading] = useState(false)

  // Product info (UI labels only — stays client-side)
  const productInfo = useMemo(() => {
    const product = getProductById(selectedProduct)
    return product || { id: selectedProduct, label: selectedProduct, icon: '📦', hsPrefix: [] }
  }, [selectedProduct])

  // Fetch risk scores from API
  useEffect(() => {
    if (!selectedProduct || selectedCountries.length === 0 || !auth.user) {
      setRiskResults([])
      return
    }

    let cancelled = false
    setRiskLoading(true)

    fetchBatchRiskScore(selectedProduct, selectedCountries, companyProfile.size)
      .then(data => {
        if (!cancelled) setRiskResults(data.results)
      })
      .catch(err => {
        console.error('Risk score fetch failed:', err)
        if (!cancelled) setRiskResults([])
      })
      .finally(() => {
        if (!cancelled) setRiskLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedProduct, selectedCountries, companyProfile.size, auth.user])

  // Fetch checklist from API
  useEffect(() => {
    if (!selectedProduct || selectedCountries.length === 0 || !auth.user) {
      setChecklist([])
      return
    }

    let cancelled = false
    setChecklistLoading(true)

    fetchChecklist(selectedProduct, selectedCountries[0])
      .then(data => {
        if (!cancelled) setChecklist(data.items || [])
      })
      .catch(err => {
        console.error('Checklist fetch failed:', err)
        if (!cancelled) setChecklist([])
      })
      .finally(() => {
        if (!cancelled) setChecklistLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedProduct, selectedCountries, auth.user])

  // Fetch alerts from API
  useEffect(() => {
    if (selectedCountries.length === 0 || !auth.user) {
      setAlerts([])
      setAlertCounts({ critical: 0, warning: 0, info: 0 })
      return
    }

    let cancelled = false
    setAlertsLoading(true)

    fetchAlerts(selectedCountries, selectedProduct)
      .then(data => {
        if (!cancelled) {
          setAlerts(data.alerts || [])
          setAlertCounts(data.counts || { critical: 0, warning: 0, info: 0 })
        }
      })
      .catch(err => {
        console.error('Alerts fetch failed:', err)
        if (!cancelled) {
          setAlerts([])
          setAlertCounts({ critical: 0, warning: 0, info: 0 })
        }
      })
      .finally(() => {
        if (!cancelled) setAlertsLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedProduct, selectedCountries, auth.user])

  // -------------------------------------------------------------------------
  // Load persisted data from Supabase when authenticated
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!SUPABASE_ENABLED || !auth.profile) return

    // Load company profile
    if (auth.profile.company) {
      setCompanyProfile({
        name: auth.profile.company.name,
        size: auth.profile.company.size as CompanyProfile['size'],
        iec: auth.profile.company.iec ?? undefined,
      })
    }

    // Load user settings (selected product/countries)
    supabase
      .from('user_settings')
      .select('*')
      .eq('company_id', auth.profile.company_id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelectedProduct(data.selected_product)
          setSelectedCountries(data.selected_countries as CountryCode[])
        }
      })

    // Load shipments
    supabase
      .from('shipments')
      .select('*')
      .eq('company_id', auth.profile.company_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setShipments(
            data.map((s: any) => ({
              id: s.id,
              name: s.name,
              product: s.product,
              country: s.country,
              date: s.date,
              status: s.status,
              riskScore: s.risk_score,
              hsCode: s.hs_code,
              shipmentValue: s.shipment_value ? parseFloat(s.shipment_value) : undefined,
              gateStatus: s.gate_status,
            }))
          )
        }
      })

    // Load checklist progress
    supabase
      .from('checklist_progress')
      .select('checked_items')
      .eq('company_id', auth.profile.company_id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const merged: Record<string, boolean> = {}
          for (const row of data) {
            const items = row.checked_items as Record<string, boolean>
            Object.assign(merged, items)
          }
          setCheckedItems(merged)
        }
      })
  }, [auth.profile])

  // -------------------------------------------------------------------------
  // Persist changes to Supabase
  // -------------------------------------------------------------------------

  const persistSettings = useCallback(
    async (product: string, countries: CountryCode[]) => {
      if (!SUPABASE_ENABLED || !auth.profile) return
      await supabase
        .from('user_settings')
        .upsert(
          {
            company_id: auth.profile.company_id,
            selected_product: product,
            selected_countries: countries,
          },
          { onConflict: 'company_id' }
        )
    },
    [auth.profile]
  )

  const persistProfile = useCallback(
    async (profile: CompanyProfile) => {
      if (!SUPABASE_ENABLED || !auth.profile) return
      await supabase
        .from('companies')
        .update({ name: profile.name, size: profile.size, iec: profile.iec })
        .eq('id', auth.profile.company_id)
    },
    [auth.profile]
  )

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------

  const handleNavigate = useCallback(
    (view: ViewType) => {
      startTransition(() => {
        setCurrentView(view)
      })
    },
    [startTransition]
  )

  const handleToggleChecklistItem = useCallback(
    (itemId: string | number) => {
      const key = String(itemId)
      setCheckedItems(prev => {
        const updated = { ...prev, [key]: !prev[key] }

        // Persist to Supabase
        if (SUPABASE_ENABLED && auth.profile) {
          supabase
            .from('checklist_progress')
            .upsert(
              {
                company_id: auth.profile.company_id,
                country_code: selectedCountries[0] || 'EU',
                product: selectedProduct,
                checked_items: updated,
              },
              { onConflict: 'company_id,shipment_id,country_code' }
            )
        }

        return updated
      })
    },
    [auth.profile, selectedCountries, selectedProduct]
  )

  const handleAddShipment = useCallback(
    async (shipment: Omit<Shipment, 'id' | 'status' | 'riskScore'>) => {
      if (SUPABASE_ENABLED && auth.profile) {
        const insertData: any = {
          company_id: auth.profile.company_id,
          name: shipment.name,
          product: shipment.product,
          country: shipment.country,
          date: shipment.date,
        }
        if (shipment.hsCode) insertData.hs_code = shipment.hsCode
        if (shipment.shipmentValue) insertData.shipment_value = shipment.shipmentValue

        const { data } = await supabase
          .from('shipments')
          .insert(insertData)
          .select()
          .single()

        if (data) {
          setShipments(prev => [
            {
              id: data.id,
              name: data.name,
              product: data.product,
              country: data.country,
              date: data.date,
              status: data.status,
              riskScore: data.risk_score,
              hsCode: data.hs_code,
              shipmentValue: data.shipment_value ? parseFloat(data.shipment_value) : undefined,
              gateStatus: data.gate_status,
            },
            ...prev,
          ])
        }
      } else {
        const newShipment: Shipment = {
          ...shipment,
          id: `ship-${Date.now()}`,
          status: 'pending',
        }
        setShipments(prev => [newShipment, ...prev])
      }
    },
    [auth.profile]
  )

  const handleSelectShipment = useCallback((_shipmentId: string) => {
    // Expand shipment detail — handled in Shipments view
  }, [])

  const handleUpdateProfile = useCallback(
    (profile: CompanyProfile) => {
      setCompanyProfile(profile)
      persistProfile(profile)
    },
    [persistProfile]
  )

  const handleSelectProduct = useCallback(
    (productId: string) => {
      setSelectedProduct(productId)
      persistSettings(productId, selectedCountries)
    },
    [selectedCountries, persistSettings]
  )

  const handleToggleCountry = useCallback(
    (country: CountryCode) => {
      setSelectedCountries(prev => {
        const updated = prev.includes(country)
          ? prev.filter(c => c !== country)
          : [...prev, country]
        persistSettings(selectedProduct, updated)
        return updated
      })
    },
    [selectedProduct, persistSettings]
  )

  // -------------------------------------------------------------------------
  // Keyboard Shortcuts
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const viewKeys: Record<string, ViewType> = {
        '1': 'dashboard',
        '2': 'risk',
        '3': 'checklist',
        '4': 'alerts',
        '5': 'fta',
        '6': 'shipments',
      }

      if (viewKeys[e.key]) {
        e.preventDefault()
        handleNavigate(viewKeys[e.key])
      } else if (e.key === ',' || (e.key === 's' && e.metaKey)) {
        if (e.key === 's') e.preventDefault()
        handleNavigate('settings')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNavigate])

  // -------------------------------------------------------------------------
  // Auth Gate — show login if Supabase is configured but user is not authed
  // -------------------------------------------------------------------------

  if (SUPABASE_ENABLED) {
    if (auth.loading) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: colors.background,
          }}
        >
          <Spinner />
        </div>
      )
    }

    if (!auth.user) {
      return <Auth onSignIn={auth.signIn} onSignUp={auth.signUp} />
    }
  }

  // -------------------------------------------------------------------------
  // Render
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
        return (
          <FTASchemes
            selectedCountries={selectedCountries}
            selectedProduct={selectedProduct as any}
          />
        )
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

  return (
    <div
      style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.background }}
      data-testid="app-container"
    >
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        alertCount={alertCounts.critical}
      />
      <main
        style={{ flex: 1, marginLeft: '240px', overflow: 'auto', paddingBottom: '48px' }}
        data-testid="main-content"
      >
        {renderView()}
      </main>

      {/* Legal Disclaimer Footer */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '240px',
          right: 0,
          backgroundColor: '#1e293b',
          color: '#94a3b8',
          fontSize: '0.7rem',
          padding: '8px 16px',
          textAlign: 'center',
          zIndex: 50,
          borderTop: '1px solid #334155',
        }}
        data-testid="disclaimer-footer"
      >
        ⚖️ ComplianceOS provides informational guidance only and does not constitute legal, tax, or trade compliance advice. Always consult qualified professionals before making compliance decisions.
      </div>
    </div>
  )
}

export default App
