// ============================================================================
// ComplianceOS - Main Application
// Phase 2: API-first architecture — all data fetched from FastAPI backend
// ============================================================================

import { useState, useMemo, useCallback, useTransition, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Auth } from '@/components/Auth'
import { Spinner } from '@/components/Spinner'
import { Onboarding } from '@/components/Onboarding'
import { ProblemSelector } from '@/components/ProblemSelector'
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
import { fetchBatchRiskScore, fetchChecklist, fetchAlerts, fetchRodtepRate } from '@/lib/api'
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
  // Show problem selector once per login session for users who have completed onboarding
  const [showProblemSelector, setShowProblemSelector] = useState<boolean>(false)
  // Guard against re-running onboarding logic on auth token refreshes (tab switches)
  const settingsLoadedRef = useRef(false)

  const [selectedProduct, setSelectedProduct] = useState<string>('steel')
  const [selectedHsCode, setSelectedHsCode] = useState<string | null>(null)
  const [selectedHsProductName, setSelectedHsProductName] = useState<string | null>(null)
  const [selectedCountries, setSelectedCountries] = useState<CountryCode[]>(['EU', 'UAE'])
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_PROFILE)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [activeAlertFilter, setActiveAlertFilter] = useState<'all' | AlertSeverity>('all')

  const [shipments, setShipments] = useState<Shipment[]>([])
  const [rodtepEstimate, setRodtepEstimate] = useState<number | null>(null)

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
      .catch(() => {
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

    fetchChecklist(
      selectedProduct,
      selectedCountries[0],
      selectedHsCode ?? undefined,
      selectedHsProductName ?? undefined,
      selectedCountries
    )
      .then(data => {
        if (!cancelled) setChecklist(data.items || [])
      })
      .catch(() => {
        if (!cancelled) setChecklist([])
      })

    return () => { cancelled = true }
  }, [selectedProduct, selectedCountries, selectedHsCode, selectedHsProductName, auth.user])

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
      .catch(() => {
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

  // Compute RoDTEP ₹ entitlement estimate for dashboard
  useEffect(() => {
    const TURNOVER_MIDPOINTS: Record<string, number> = {
      '< ₹1 Crore': 5_000_000,
      '₹1–5 Crore': 30_000_000,
      '₹5–25 Crore': 150_000_000,
      '₹25–100 Crore': 625_000_000,
      '₹100 Crore+': 2_000_000_000,
    }
    const midpoint = companyProfile.turnoverRange ? TURNOVER_MIDPOINTS[companyProfile.turnoverRange] : null
    const hsCode = selectedHsCode || (productInfo.hsPrefix?.[0] ?? null)
    if (!midpoint || !hsCode) { setRodtepEstimate(null); return }
    let cancelled = false
    fetchRodtepRate(hsCode).then(rate => {
      if (!cancelled) setRodtepEstimate(midpoint * (rate / 100))
    }).catch(() => { if (!cancelled) setRodtepEstimate(null) })
    return () => { cancelled = true }
  }, [selectedHsCode, companyProfile.turnoverRange, productInfo.hsPrefix])

  // -------------------------------------------------------------------------
  // Load persisted data from Supabase when authenticated
  // -------------------------------------------------------------------------

  // New user: logged in but no company profile yet → show onboarding
  // Uses localStorage so onboarding doesn't repeat if profile row is missing
  useEffect(() => {
    if (!SUPABASE_ENABLED || auth.loading) return
    if (auth.user && !auth.profile) {
      const done = localStorage.getItem(`cos_ob_${auth.user.id}`)
      if (!done) setShowOnboarding(true)
    }
  }, [auth.loading, auth.user, auth.profile])

  useEffect(() => {
    if (!SUPABASE_ENABLED || !auth.profile) return
    // Skip re-loading on token refreshes (e.g. browser tab switches) — settings
    // are already in state and re-running this would re-trigger onboarding.
    if (settingsLoadedRef.current) return
    settingsLoadedRef.current = true

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
        const userId = auth.profile.id
        if (data && data.selected_product) {
          setSelectedProduct(data.selected_product)
          setSelectedCountries(data.selected_countries as CountryCode[])
          // Clean up any stale localStorage backup now that Supabase has the data
          localStorage.removeItem(`cos_sel_${userId}`)
          // Show problem selector once per browser session for returning users
          const sessionKey = `cos_problem_seen_${auth.profile?.company_id}`
          if (!sessionStorage.getItem(sessionKey)) {
            setShowProblemSelector(true)
          }
        } else {
          // No saved settings in Supabase — check localStorage backup written during
          // onboarding (happens when auth.profile wasn't loaded yet, so persistSettings
          // returned early without saving to Supabase)
          const savedSel = localStorage.getItem(`cos_sel_${userId}`)
          if (savedSel) {
            try {
              const { product: p, countries: c } = JSON.parse(savedSel) as { product: string; countries: CountryCode[] }
              setSelectedProduct(p)
              setSelectedCountries(c)
              // Profile is now loaded — save to Supabase and clean up the backup
              supabase
                .from('user_settings')
                .upsert({ company_id: auth.profile.company_id, selected_product: p, selected_countries: c }, { onConflict: 'company_id' })
                .then(() => localStorage.removeItem(`cos_sel_${userId}`))
                .catch(() => {})
              const sessionKey = `cos_problem_seen_${auth.profile?.company_id}`
              if (!sessionStorage.getItem(sessionKey)) {
                setShowProblemSelector(true)
              }
            } catch {
              // Corrupt backup — fall through to onboarding check
              const done = localStorage.getItem(`cos_ob_${userId}`)
              if (!done) setShowOnboarding(true)
            }
          } else {
            // No backup either — show onboarding unless already completed
            const done = localStorage.getItem(`cos_ob_${userId}`)
            if (!done) setShowOnboarding(true)
          }
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
            buyerName: s.buyer_name,
            sanctionsRisk: s.sanctions_risk ?? undefined,
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
          designation: profile.designation,
          whatsapp: profile.whatsapp,
          turnover_range: profile.turnoverRange,
          years_exporting: profile.yearsExporting,
          known_regulations: profile.knownRegulations,
          compliance_confidence: profile.complianceConfidence,
          past_compliance_issues: profile.pastComplianceIssues,
          pain_points: profile.painPoints,
        })
        .eq('id', auth.profile.company_id)
    },
    [auth.profile]
  )

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------

  const handleOnboardingComplete = useCallback(
    (product: string, countries: CountryCode[], companyDetails?: { iec?: string; gstin?: string; name?: string; designation?: string; city?: string; whatsapp?: string; turnoverRange?: string; yearsExporting?: string; knownRegulations?: string[]; complianceConfidence?: number; pastComplianceIssues?: string[]; painPoints?: string[] }, hsCode?: string, hsProductName?: string) => {
      setSelectedProduct(product)
      setSelectedCountries(countries)
      if (hsCode) setSelectedHsCode(hsCode)
      if (hsProductName) setSelectedHsProductName(hsProductName)
      setShowOnboarding(false)
      setShowProblemSelector(true)
      persistSettings(product, countries)
      // Mark onboarding done in localStorage so it won't reappear if profile row is missing.
      // Also save the selection as a backup — if auth.profile wasn't loaded yet when
      // persistSettings ran (e.g. slow DB trigger), Effect 2 will restore + re-save it.
      if (auth.user?.id) {
        localStorage.setItem(`cos_ob_${auth.user.id}`, '1')
        localStorage.setItem(`cos_sel_${auth.user.id}`, JSON.stringify({ product, countries }))
      }
      if (companyDetails) {
        setCompanyProfile(prev => {
          const updated = {
            ...prev,
            ...(companyDetails.name && { name: companyDetails.name }),
            ...(companyDetails.iec && { iec: companyDetails.iec }),
            ...(companyDetails.gstin && { gstin: companyDetails.gstin }),
            ...(companyDetails.city && { city: companyDetails.city }),
            ...(companyDetails.designation && { designation: companyDetails.designation }),
            ...(companyDetails.whatsapp && { whatsapp: companyDetails.whatsapp }),
            ...(companyDetails.turnoverRange && { turnoverRange: companyDetails.turnoverRange }),
            ...(companyDetails.yearsExporting && { yearsExporting: companyDetails.yearsExporting }),
            ...(companyDetails.knownRegulations && { knownRegulations: companyDetails.knownRegulations }),
            ...(companyDetails.complianceConfidence !== undefined && { complianceConfidence: companyDetails.complianceConfidence }),
            ...(companyDetails.pastComplianceIssues && { pastComplianceIssues: companyDetails.pastComplianceIssues }),
            ...(companyDetails.painPoints && { painPoints: companyDetails.painPoints }),
          }
          persistProfile(updated)
          return updated
        })
      }
    },
    [persistSettings, persistProfile, auth.user]
  )

  const handleProblemSelect = useCallback(
    (view: ViewType) => {
      if (auth.profile) {
        sessionStorage.setItem(`cos_problem_seen_${auth.profile.company_id}`, '1')
      }
      setShowProblemSelector(false)
      startTransition(() => setCurrentView(view))
    },
    [auth.profile, startTransition]
  )

  const handleProblemSkip = useCallback(() => {
    if (auth.profile) {
      sessionStorage.setItem(`cos_problem_seen_${auth.profile.company_id}`, '1')
    }
    setShowProblemSelector(false)
  }, [auth.profile])

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
        if (shipment.buyerName) insertData.buyer_name = shipment.buyerName

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
              buyerName: data.buyer_name,
              sanctionsRisk: data.sanctions_risk ?? undefined,
            },
            ...prev,
          ])

          // Auto-screen buyer against OFAC sanctions in the background
          if (shipment.buyerName && shipment.buyerName.trim().length > 2) {
            supabase.functions
              .invoke('sanctions-check', { body: { name: shipment.buyerName } })
              .then(({ data: sData }) => {
                if (!sData?.risk_level) return
                const risk = sData.risk_level as 'clear' | 'flag' | 'block'
                // Persist to DB
                supabase
                  .from('shipments')
                  .update({ sanctions_risk: risk })
                  .eq('id', data.id)
                  .then(() => {})
                // Update local state immediately
                setShipments(prev =>
                  prev.map(s => s.id === data.id ? { ...s, sanctionsRisk: risk } : s)
                )
              })
              .catch(() => {})
          }
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

  const persistDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleUpdateProfile = useCallback(
    (profile: CompanyProfile) => {
      setCompanyProfile(profile)
      if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current)
      persistDebounceRef.current = setTimeout(() => persistProfile(profile), 600)
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
            rodtepEstimate={rodtepEstimate}
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
            selectedProduct={selectedHsProductName ? `${selectedHsProductName} (${selectedHsCode})` : productInfo.label}
            selectedCountries={selectedCountries}
            checklist={checklist}
            checkedItems={checkedItems}
            onToggleItem={handleToggleChecklistItem}
            onUpdateHsProduct={(hsCode, hsName) => {
              setSelectedHsCode(hsCode ?? null)
              setSelectedHsProductName(hsName ?? null)
            }}
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
            selectedHsCode={selectedHsCode}
            selectedHsProductName={selectedHsProductName}
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

      {/* Problem selector — shown once per session after onboarding or on first login */}
      {!showOnboarding && showProblemSelector && (
        <ProblemSelector onSelect={handleProblemSelect} onSkip={handleProblemSkip} />
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
        style={{ flex: 1, marginLeft: isMobile ? 0 : '232px', marginTop: '56px', overflow: 'auto', overflowX: 'hidden', paddingBottom: '24px', maxWidth: '100vw' }}
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
