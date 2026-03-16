// ============================================================================
// Settings View - Configuration for product and market selection + API Keys
// ============================================================================

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/Tabs'
import { colors, spacing, borderRadius } from '@theme/index'
import { PRODUCT_CATEGORIES } from '@/data'
import { fetchAPIKeys, createAPIKey, revokeAPIKey } from '@/lib/api'
import type { CountryCode, CompanyProfile, CompanySize, APIKeyInfo } from '@/types'

export interface SettingsProps {
  companyProfile: CompanyProfile
  selectedProduct: string
  selectedCountries: CountryCode[]
  onUpdateProfile: (profile: CompanyProfile) => void
  onSelectProduct: (productId: string) => void
  onToggleCountry: (country: CountryCode) => void
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
  onUpdateProfile,
  onSelectProduct,
  onToggleCountry,
  onNavigateToDashboard,
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState(0)

  // API Keys state
  const [apiKeys, setApiKeys] = useState<APIKeyInfo[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null)
  const [apiKeysLoading, setApiKeysLoading] = useState(false)

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
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', wordBreak: 'break-all', backgroundColor: colors.white, padding: spacing.sm, borderRadius: borderRadius.sm }}>
                        {newKeyPlaintext}
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
                            <div style={{ fontSize: '0.75rem', color: colors.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                              {key.key_prefix}••••••••
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
