// ============================================================================
// ComplianceOS - Main Application
// Phase 2: API-first architecture — all data fetched from FastAPI backend
// ============================================================================

import { useState, useMemo, useCallback, useTransition, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Auth } from '@/components/Auth'
import { Spinner } from '@/components/Spinner'
import { Onboarding } from '@/components/Onboarding'
import { TopBar } from '@/components/TopBar'
import { useMobile } from '@/hooks/useMobile'
import {
  Dashboard,
  RiskAnalysis,
  Checklist,
  Alerts,
  FTASchemes,
  Shipments,
  Settings,
  LabelValidator,
  EUCompliance,
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
  const isMobile = useMobile()

  // -------------------------------------------------------------------------
  // Application State
  // -------------------------------------------------------------------------

  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [, startTransition] = useTransition()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Show onboarding to first-time users (no stored product/market selection)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false)

  const [selectedProduct, setSelectedProduct] = useState<string>('steel')
  const [selectedCountries, setSelectedCountries] = useState<CountryCode[]>(['EU', 'UAE'])
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_PROFILE)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [activeAlertFilter, setActiveAlertFilter] = useState<'all' | AlertSeverity>('all')

  const [shipments, setShipments] = useState<Shipment[]>([])

  // -------------------------------------------------------------------------
  // API-fetched data (replaces static utils from Phase 1)
  // -------------------------------------------------------------------------

  const [riskResults, setRiskResults] = useState<any[]>([])
  const [checklist, setChecklist] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0, info: 0 })

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

    fetchBatchRiskScore(selectedProduct, selectedCountries, companyProfile.size)
      .then(data => {
        if (!cancelled) setRiskResults(data.results)
      })
      .catch(err => {
        console.error('Risk score fetch failed:', err)
        if (!cancelled) setRiskResults([])
      })
      .finally(() => {
        // loading complete
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

    fetchChecklist(selectedProduct, selectedCountries[0])
      .then(data => {
        if (!cancelled) setChecklist(data.items || [])
      })
      .catch(err => {
        console.error('Checklist fetch failed:', err)
        if (!cancelled) setChecklist([])
      })
      .finally(() => {
        // loading complete
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

    fetchAlerts(selectedCountries, [selectedProduct])
      .then(data => {
        if (!cancelled) {
          setAlerts(data.alerts || [])

          // Recompute counts natively based on returned alerts
          const alertsList = data.alerts || []
          setAlertCounts({
            critical: alertsList.filter(a => a.severity === 'critical').length,
            warning: alertsList.filter(a => a.severity === 'warning').length,
            info: alertsList.filter(a => a.severity === 'info').length,
          })
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
        // loading complete
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
      const c = auth.profile.company as any
      setCompanyProfile({
        name: c.name,
        size: c.size as CompanyProfile['size'],
        iec: c.iec ?? undefined,
        gstin: c.gstin ?? undefined,
        address: c.address ?? undefined,
        city: c.city ?? undefined,
        state: c.state ?? undefined,
        pin: c.pin ?? undefined,
        stateCode: c.state_code ?? undefined,
        portOfLoading: c.port_of_loading ?? undefined,
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
        } else {
          // No saved settings — show onboarding
          setShowOnboarding(true)
        }
      })

    // Load shipments
    supabase
      .from('shipments')
      .select('*')
      .eq('company_id', auth.profile.company_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setShipments(
          (data ?? []).map((s: any) => ({
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
        .update({
          name: profile.name,
          size: profile.size,
          iec: profile.iec,
          gstin: profile.gstin,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          pin: profile.pin,
          state_code: profile.stateCode,
          port_of_loading: profile.portOfLoading,
        })
        .eq('id', auth.profile.company_id)
    },
    [auth.profile]
  )

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------

  const handleOnboardingComplete = useCallback(
    (product: string, countries: CountryCode[], companyDetails?: { iec?: string; gstin?: string }) => {
      setSelectedProduct(product)
      setSelectedCountries(countries)
      setShowOnboarding(false)
      persistSettings(product, countries)
      if (companyDetails && (companyDetails.iec || companyDetails.gstin)) {
        setCompanyProfile(prev => {
          const updated = { ...prev, ...companyDetails }
          persistProfile(updated)
          return updated
        })
      }
    },
    [persistSettings, persistProfile]
  )

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

        const { data, error } = await supabase
          .from('shipments')
          .insert(insertData)
          .select()
          .single()

        if (error || !data) {
          // Fall back to local-only shipment so the user isn't left with nothing
          setShipments(prev => [{
            ...shipment,
            id: `local-${Date.now()}`,
            status: 'pending' as const,
          }, ...prev])
          console.error('Failed to save shipment to database:', error?.message)
          return
        }

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
            shipments={shipments}
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
            companyProfile={companyProfile}
            checkedItems={checkedItems}
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
            onNavigateToDashboard={() => handleNavigate('dashboard')}
          />
        )
      case 'label-validator':
        return (
          <LabelValidator
            selectedProduct={selectedProduct}
            selectedCountries={selectedCountries}
            shipments={shipments.map(s => ({ id: s.id, name: s.name, country: s.country }))}
          />
        )
      case 'eu-compliance':
        return (
          <EUCompliance
            companyProfile={companyProfile}
            selectedProduct={productInfo.label}
            selectedCountries={selectedCountries}
            shipments={shipments}
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
      {/* Onboarding overlay for first-time users */}
      {showOnboarding && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      <TopBar
        title={currentView}
        isMobile={isMobile}
        onMenuToggle={() => setSidebarOpen(o => !o)}
        userName={auth.user?.email || companyProfile.name || 'User'}
      />

      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 150,
          }}
        />
      )}

      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        alertCount={alertCounts.critical}
        isMobile={isMobile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => auth.signOut()}
        euEnabled={selectedCountries.includes('EU')}
      />
      <main
        style={{ flex: 1, marginLeft: isMobile ? 0 : '210px', marginTop: '56px', overflow: 'auto', paddingBottom: '24px' }}
        data-testid="main-content"
      >
        <>
          {renderView()}
          <div style={{ padding: '12px 24px 0', fontSize: '0.65rem', color: '#9CA3AF', borderTop: '1px solid #E5E7EB', marginTop: '24px' }}>
            ComplianceOS provides informational guidance only — not legal, tax, or trade advice. Always consult a qualified professional.
          </div>
        </>
      </main>
    </div>
  )
}

export default App
