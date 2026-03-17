// ============================================================================
// Settings View - Configuration for product and market selection + API Keys
// ============================================================================

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/Tabs'
import { colors, spacing, borderRadius } from '@theme/index'
import { PRODUCT_CATEGORIES } from '@/data'
import { fetchAPIKeys, createAPIKey, revokeAPIKey, fetchHSLookup } from '@/lib/api'
import type { HSLookupResult } from '@/lib/api'
import { searchHSProducts } from '@/data/hs-product-db'
import type { CountryCode, CompanyProfile, CompanySize, APIKeyInfo } from '@/types'

export interface SettingsProps {
  companyProfile: CompanyProfile
  selectedProduct: string
  selectedCountries: CountryCode[]
  selectedHsCode?: string
  selectedHsProductName?: string
  onUpdateProfile: (profile: CompanyProfile) => void
  onSelectProduct: (productId: string) => void
  onToggleCountry: (country: CountryCode) => void
  onUpdateHsProduct?: (hsCode: string | undefined, hsName: string | undefined) => void
  onNavigateToDashboard?: () => void
}

const COUNTRY_LIST: Array<{ code: CountryCode; name: string; flag: string }> = [
  { code: 'EU', name: 'European Union', flag: '🇪🇺' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'UAE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'Japan', name: 'Japan', flag: '🇯🇵' },
  { code: 'Australia', name: 'Australia', flag: '🇦🇺' },
]

const COMPANY_SIZES: Array<{ id: CompanySize; label: string; description: string }> = [
  { id: 'micro', label: 'Micro', description: '< 10 employees' },
  { id: 'small', label: 'Small', description: '10-50 employees' },
  { id: 'medium', label: 'Medium', description: '50-250 employees' },
  { id: 'large', label: 'Large', description: '250+ employees' },
]

export function Settings({
  companyProfile,
  selectedProduct,
  selectedCountries,
  selectedHsCode,
  selectedHsProductName,
  onUpdateProfile,
  onSelectProduct,
  onToggleCountry,
  onUpdateHsProduct,
  onNavigateToDashboard,
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState(0)

  // HS product search state
  const [hsQuery, setHsQuery] = useState(selectedHsProductName ?? '')
  const [hsResults, setHsResults] = useState<HSLookupResult[]>([])
  const [hsLoading, setHsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handleHsQueryChange = (q: string) => {
    setHsQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.trim().length < 2) {
      setHsResults([])
      setHsLoading(false)
      return
    }

    // Local results immediately
    const local = searchHSProducts(q, selectedProduct).map(p => ({
      hsCode: p.hsCode,
      name: p.name,
      confidence: 'high' as const,
      reason: '',
      source: 'local' as const,
    }))
    setHsResults(local)

    // AI results after debounce
    setHsLoading(true)
    debounceRef.current = setTimeout(async () => {
      const apiResults = await fetchHSLookup(q, selectedProduct)
      const apiCodes = new Set(apiResults.map(r => r.hsCode))
      const merged = [...apiResults, ...local.filter(l => !apiCodes.has(l.hsCode))]
      setHsResults(merged.slice(0, 8))
      setHsLoading(false)
    }, 600)
  }

  const handleSelectHsProduct = (p: HSLookupResult) => {
    setHsQuery(p.name)
    setHsResults([])
    setHsLoading(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    onUpdateHsProduct?.(p.hsCode, p.name)
  }

  const handleClearHsProduct = () => {
    setHsQuery('')
    setHsResults([])
    setHsLoading(false)
    onUpdateHsProduct?.(undefined, undefined)
  }

  // API Keys state
  const [apiKeys, setApiKeys] = useState<APIKeyInfo[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null)
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  useEffect(() => {
    setApiKeysLoading(true)
    fetchAPIKeys()
      .then(keys => setApiKeys(keys || []))
      .catch(err => console.error('Failed to load API keys:', err))
      .finally(() => setApiKeysLoading(false))
  }, [])

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return
    try {
      const result = await createAPIKey(newKeyName.trim())
      setNewKeyPlaintext(result.key)
      setNewKeyName('')
      // Refresh keys list
      const keys = await fetchAPIKeys()
      setApiKeys(keys || [])
    } catch (err) {
      console.error('Failed to create API key:', err)
    }
  }

  const handleRevokeKey = async (id: string) => {
    try {
      await revokeAPIKey(id)
      setApiKeys(prev => prev.filter(k => k.id !== id))
    } catch (err) {
      console.error('Failed to revoke API key:', err)
    }
  }

  const handleCopyPrefix = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKeyId(id)
    setTimeout(() => setCopiedKeyId(null), 1500)
  }

  const containerStyle: React.CSSProperties = {
    padding: spacing.lg,
  }

  const headerStyle: React.CSSProperties = {
    marginBottom: spacing.xl,
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: 0,
    marginBottom: spacing.xs,
    color: colors.text,
  }

  const subtitleStyle: React.CSSProperties = {
    color: colors.textMuted,
    fontSize: '0.875rem',
    margin: 0,
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: spacing.xl,
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: spacing.md,
    color: colors.text,
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: spacing.md,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: spacing.sm,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    fontSize: '1rem',
    backgroundColor: colors.white,
  }

  const optionCardStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: spacing.md,
    border: `2px solid ${isSelected ? colors.primary : colors.border}`,
    borderRadius: borderRadius.lg,
    backgroundColor: isSelected ? colors.surface : colors.white,
    cursor: 'pointer',
    transition: 'all 0.2s',
  })

  const countryCardStyle = (isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    border: `2px solid ${isSelected ? colors.primary : colors.border}`,
    borderRadius: borderRadius.lg,
    backgroundColor: isSelected ? colors.surface : colors.white,
    cursor: 'pointer',
    transition: 'all 0.2s',
  })

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Settings</h2>
        <p style={subtitleStyle}>Configure your export compliance profile</p>
      </div>

      <Tabs index={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab>Profile &amp; Markets</Tab>
          <Tab>Developer</Tab>
        </TabList>
        <TabPanels>
          {/* Tab 1: Profile & Markets */}
          <TabPanel>
            {/* Company Profile Section */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Company Profile</h3>
              <Card>
                <CardContent>
                  <div style={{ marginBottom: spacing.md }}>
                    <label
                      htmlFor="company-name"
                      style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 500 }}
                    >
                      Company Name
                    </label>
                    <input
                      id="company-name"
                      type="text"
                      value={companyProfile.name}
                      onChange={e => onUpdateProfile({ ...companyProfile, name: e.target.value })}
                      style={inputStyle}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div style={{ marginBottom: spacing.md }}>
                    <label
                      htmlFor="iec-code"
                      style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 500 }}
                    >
                      IEC Code (Import Export Code)
                    </label>
                    <input
                      id="iec-code"
                      type="text"
                      value={companyProfile.iec ?? ''}
                      onChange={e => onUpdateProfile({ ...companyProfile, iec: e.target.value })}
                      style={inputStyle}
                      placeholder="e.g. 0388277364"
                      maxLength={10}
                    />
                  </div>
                  <div style={{ marginBottom: spacing.md }}>
                    <label
                      htmlFor="gstin"
                      style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 500 }}
                    >
                      GSTIN
                    </label>
                    <input
                      id="gstin"
                      type="text"
                      value={companyProfile.gstin ?? ''}
                      onChange={e => onUpdateProfile({ ...companyProfile, gstin: e.target.value })}
                      style={inputStyle}
                      placeholder="e.g. 27AABCU9603R1Z5"
                      maxLength={15}
                    />
                  </div>

                  {/* ICEGATE / Customs Filing Fields */}
                  <div style={{
                    marginTop: spacing.md,
                    marginBottom: spacing.sm,
                    paddingTop: spacing.md,
                    borderTop: `1px solid ${colors.border}`,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: colors.textMuted,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.5px',
                  }}>
                    Customs Filing Details (ICEGATE)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginBottom: spacing.md }}>
                    Used in Shipping Bill generation. All fields optional — defaults applied if blank.
                  </div>

                  <div style={{ marginBottom: spacing.md }}>
                    <label
                      htmlFor="company-address"
                      style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 500 }}
                    >
                      Registered Address
                    </label>
                    <input
                      id="company-address"
                      type="text"
                      value={companyProfile.address ?? ''}
                      onChange={e => onUpdateProfile({ ...companyProfile, address: e.target.value })}
                      style={inputStyle}
                      placeholder="e.g. 101 Export House, MIDC"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, marginBottom: spacing.md }}>
                    <div>
                      <label
                        htmlFor="company-city"
                        style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 500 }}
                      >
                        City
                      </label>
                      <input
                        id="company-city"
                        type="text"
                        value={companyProfile.city ?? ''}
                        onChange={e => onUpdateProfile({ ...companyProfile, city: e.target.value })}
                        style={inputStyle}
                        placeholder="e.g. Mumbai"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="company-state"
                        style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 500 }}
                      >
                        State
                      </label>
                      <input
                        id="company-state"
                        type="text"
                        value={companyProfile.state ?? ''}
                        onChange={e => onUpdateProfile({ ...companyProfile, state: e.target.value })}
                        style={inputStyle}
                        placeholder="e.g. Maharashtra"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, marginBottom: spacing.md }}>
                    <div>
                      <label
                        htmlFor="company-pin"
                        style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 500 }}
                      >
                        PIN Code
                      </label>
                      <input
                        id="company-pin"
                        type="text"
                        value={companyProfile.pin ?? ''}
                        onChange={e => onUpdateProfile({ ...companyProfile, pin: e.target.value })}
                        style={inputStyle}
                        placeholder="e.g. 400001"
                        maxLength={6}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="company-state-code"
                        style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 500 }}
                      >
                        State Code (2-letter)
                      </label>
                      <input
                        id="company-state-code"
                        type="text"
                        value={companyProfile.stateCode ?? ''}
                        onChange={e => onUpdateProfile({ ...companyProfile, stateCode: e.target.value.toUpperCase() })}
                        style={inputStyle}
                        placeholder="e.g. MH"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: spacing.md }}>
                    <label
                      htmlFor="port-of-loading"
                      style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 500 }}
                    >
                      Port of Loading (ICEGATE Code)
                    </label>
                    <input
                      id="port-of-loading"
                      type="text"
                      value={companyProfile.portOfLoading ?? ''}
                      onChange={e => onUpdateProfile({ ...companyProfile, portOfLoading: e.target.value.toUpperCase() })}
                      style={inputStyle}
                      placeholder="e.g. INBOM4 (Mumbai), INMAA1 (Chennai)"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: spacing.sm, fontWeight: 500 }}>
                      Company Size
                    </label>
                    <div style={gridStyle}>
                      {COMPANY_SIZES.map(size => (
                        <div
                          key={size.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={companyProfile.size === size.id}
                          onClick={() => onUpdateProfile({ ...companyProfile, size: size.id })}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              onUpdateProfile({ ...companyProfile, size: size.id })
                            }
                          }}
                          style={optionCardStyle(companyProfile.size === size.id)}
                          data-testid={`size-${size.id}`}
                        >
                          <div style={{ fontWeight: 600 }}>{size.label}</div>
                          <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                            {size.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Product Category Section */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Product Category</h3>
              <div style={gridStyle}>
                {PRODUCT_CATEGORIES.map(product => (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedProduct === product.id}
                    onClick={() => onSelectProduct(product.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectProduct(product.id)
                      }
                    }}
                    style={optionCardStyle(selectedProduct === product.id)}
                    data-testid={`product-${product.id}`}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: spacing.xs }}>{product.icon}</div>
                    <div style={{ fontWeight: 600 }}>{product.label}</div>
                    <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                      HS: {product.hsPrefix.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Specific Product / HS Code Section */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Specific Product (HS Code)</h3>
              <p style={{ fontSize: '0.875rem', color: colors.textMuted, marginBottom: spacing.md }}>
                Narrow your compliance checklist to a specific product within your category. For example, "Guntur Mirchi" vs "Chilli Powder" have different testing requirements.
              </p>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={hsQuery}
                  onChange={e => handleHsQueryChange(e.target.value)}
                  placeholder={`Search by product name or HS code…`}
                  style={{
                    width: '100%',
                    padding: `${spacing.sm} ${spacing.md}`,
                    border: `1px solid ${selectedHsCode ? colors.primary : colors.border}`,
                    borderRadius: borderRadius.lg,
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              {(hsResults.length > 0 || hsLoading) && (
                <div style={{
                  marginTop: 4,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.white,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  zIndex: 10,
                  position: 'relative',
                  maxHeight: 240,
                  overflowY: 'auto',
                }}>
                  {hsLoading && (
                    <div style={{ padding: '4px 12px', fontSize: '0.7rem', color: colors.textMuted, backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
                      {hsResults.length === 0 ? 'Searching…' : 'Refining with AI…'}
                    </div>
                  )}
                  {hsResults.map(r => (
                    <div
                      key={r.hsCode}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectHsProduct(r)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSelectHsProduct(r) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: spacing.sm,
                        padding: `${spacing.sm} ${spacing.md}`,
                        borderBottom: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: colors.primary, backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        {r.hsCode}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: colors.text, flex: 1 }}>{r.name}</span>
                      {r.source === 'api' && r.confidence === 'high' && (
                        <span style={{ fontSize: '0.65rem', color: colors.risk?.low ?? '#16a34a', whiteSpace: 'nowrap' }}>AI ✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedHsCode && (
                <div style={{
                  marginTop: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: '#EFF6FF',
                  border: `1px solid #BFDBFE`,
                  borderRadius: borderRadius.md,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  fontSize: '0.875rem',
                }}>
                  <span style={{ fontFamily: 'monospace', color: colors.primary, fontWeight: 600 }}>{selectedHsCode}</span>
                  <span style={{ color: colors.text }}>{selectedHsProductName}</span>
                  <button
                    onClick={handleClearHsProduct}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, fontSize: '0.8rem', fontFamily: 'inherit' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Target Markets Section */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>
                Target Markets
                <div style={{ marginLeft: spacing.sm, display: 'inline-block' }}>
                  <Badge variant="default" size="sm">
                    {selectedCountries.length} selected
                  </Badge>
                </div>
              </h3>
              <div style={gridStyle}>
                {COUNTRY_LIST.map(country => (
                  <div
                    key={country.code}
                    role="checkbox"
                    tabIndex={0}
                    aria-checked={selectedCountries.includes(country.code)}
                    onClick={() => onToggleCountry(country.code)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onToggleCountry(country.code)
                      }
                    }}
                    style={countryCardStyle(selectedCountries.includes(country.code))}
                    data-testid={`country-${country.code}`}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{country.flag}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{country.name}</div>
                      <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{country.code}</div>
                    </div>
                    {selectedCountries.includes(country.code) && (
                      <div style={{ marginLeft: 'auto' }}>
                        <Badge variant="success" size="sm">
                          Selected
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {onNavigateToDashboard && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: spacing.lg }}>
                <Button variant="primary" onClick={onNavigateToDashboard}>
                  Go to Dashboard →
                </Button>
              </div>
            )}
          </TabPanel>

          {/* Tab 2: Developer */}
          <TabPanel>
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Developer</h3>
              <div style={{
                padding: spacing.sm,
                marginBottom: spacing.md,
                backgroundColor: colors.surface,
                borderRadius: borderRadius.md,
                fontSize: '0.8rem',
                color: colors.textMuted,
                lineHeight: 1.6,
              }}>
                💡 <strong>API keys are optional</strong> — only needed if you want to integrate ComplianceOS
                with third-party systems (ERP, customs software, etc.). You can use all features without configuring API keys.
              </div>
              <Card>
                <CardContent>
                  <h4 style={{ margin: 0, marginBottom: spacing.md, fontSize: '1rem', fontWeight: 600 }}>🔑 API Keys</h4>
                  {/* Create new key */}
                  <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                      placeholder="Key name (e.g., Production, Staging)"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <Button variant="primary" onClick={handleCreateKey} disabled={!newKeyName.trim()}>
                      Generate Key
                    </Button>
                  </div>

                  {/* Show newly created key */}
                  {newKeyPlaintext && (
                    <div style={{
                      padding: spacing.md,
                      marginBottom: spacing.md,
                      backgroundColor: '#dcfce7',
                      border: '1px solid #86efac',
                      borderRadius: borderRadius.md,
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: spacing.xs }}>🎉 New API Key Created!</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', wordBreak: 'break-all', backgroundColor: colors.white, padding: spacing.sm, borderRadius: borderRadius.sm, flex: 1 }}>
                          {newKeyPlaintext}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyPrefix('__new__', newKeyPlaintext)}
                        >
                          {copiedKeyId === '__new__' ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: spacing.xs }}>
                        ⚠️ Copy this key now — it will never be shown again!
                      </div>
                      <Button variant="ghost" onClick={() => setNewKeyPlaintext(null)} style={{ marginTop: spacing.xs }}>
                        Dismiss
                      </Button>
                    </div>
                  )}

                  {/* Keys list */}
                  {apiKeysLoading ? (
                    <div style={{ textAlign: 'center', padding: spacing.md, color: colors.textMuted }}>Loading keys...</div>
                  ) : apiKeys.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: spacing.md, color: colors.textMuted }}>
                      No API keys yet. Generate one to enable third-party integrations.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                      {apiKeys.map(key => (
                        <div
                          key={key.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.md,
                            padding: spacing.sm,
                            border: `1px solid ${colors.border}`,
                            borderRadius: borderRadius.md,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{key.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                              <div style={{ fontSize: '0.75rem', color: colors.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                                {key.key_prefix}••••••••
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyPrefix(key.id, key.key_prefix)}
                              >
                                {copiedKeyId === key.id ? 'Copied!' : 'Copy'}
                              </Button>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: colors.textMuted }}>
                              Created: {new Date(key.created_at).toLocaleDateString()}
                              {key.last_used_at && ` • Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                              {` • Limit: ${key.rate_limit}/day`}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            onClick={() => handleRevokeKey(key.id)}
                            style={{ color: colors.risk.high }}
                          >
                            Revoke
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
