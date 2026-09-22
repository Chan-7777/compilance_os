// ============================================================================
// Settings View - Configuration for product and market selection + API Keys
// ============================================================================

import { useState, useEffect } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { Card, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/Tabs'
import { colors, spacing, borderRadius } from '@theme/index'
import { PRODUCT_CATEGORIES } from '@/data'
import { fetchAPIKeys, revokeAPIKey, fetchNotificationSettings, updateNotificationSettings, sendWhatsAppAlert } from '@/lib/api'
import type { NotificationSettings } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
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
  const isMobile = useMobile()
  const [activeTab, setActiveTab] = useState(0)
  const { success: toastSuccess, error: toastError } = useToast()

  // API Keys state
  const [apiKeys, setApiKeys] = useState<APIKeyInfo[]>([])
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null)
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  // Notifications state
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({ whatsapp_number: null, whatsapp_alerts: false })
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifSaving, setNotifSaving] = useState(false)
  const [testSending, setTestSending] = useState(false)

  useEffect(() => {
    setApiKeysLoading(true)
    fetchAPIKeys()
      .then(keys => setApiKeys(keys || []))
      .catch(err => toastError(`Failed to load API keys: ${err?.message}`))
      .finally(() => setApiKeysLoading(false))
  }, [])

  useEffect(() => {
    setNotifLoading(true)
    fetchNotificationSettings()
      .then(s => setNotifSettings(s))
      .catch(() => { /* column may not exist yet — stay at defaults */ })
      .finally(() => setNotifLoading(false))
  }, [])

  const handleSaveNotifications = async () => {
    setNotifSaving(true)
    try {
      await updateNotificationSettings(notifSettings)
      toastSuccess('Notification settings saved')
    } catch (err: any) {
      toastError(`Failed to save: ${err?.message}`)
    } finally {
      setNotifSaving(false)
    }
  }

  const handleTestWhatsApp = async () => {
    if (!notifSettings.whatsapp_number) return
    setTestSending(true)
    try {
      const result = await sendWhatsAppAlert({
        to: notifSettings.whatsapp_number,
        severity: 'info',
        country: 'ComplianceOS',
        message: 'This is a test alert from ComplianceOS. Your WhatsApp notifications are working correctly.',
      })
      if (result.simulated) {
        toastSuccess('Test sent (sandbox mode — configure META_WHATSAPP_TOKEN to go live)')
      } else {
        toastSuccess('Test message sent to your WhatsApp!')
      }
    } catch (err: any) {
      toastError(`Test failed: ${err?.message}`)
    } finally {
      setTestSending(false)
    }
  }

  const handleRevokeKey = async (id: string) => {
    try {
      await revokeAPIKey(id)
      setApiKeys(prev => prev.filter(k => k.id !== id))
      toastSuccess('API key revoked')
    } catch (err: any) {
      toastError(`Failed to revoke key: ${err?.message}`)
    }
  }

  const handleCopyPrefix = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKeyId(id)
    setTimeout(() => setCopiedKeyId(null), 1500)
  }

  const containerStyle: React.CSSProperties = {
    padding: isMobile ? spacing.md : spacing.lg,
    maxWidth: '100%',
    boxSizing: 'border-box',
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
          <Tab>Notifications</Tab>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-flex', marginRight: '6px', verticalAlign: 'middle', color: colors.accent }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <strong>The external API is withdrawn.</strong> The lender-facing endpoint these keys
                authenticated has been taken down, so new keys cannot be issued and any existing key is
                inactive. Revoke anything still listed below. Every feature of ComplianceOS works without a key.
              </div>
              <Card>
                <CardContent>
                  <h4 style={{ margin: 0, marginBottom: spacing.md, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
                    API Keys
                  </h4>

                  {/* Show newly created key */}
                  {newKeyPlaintext && (
                    <div style={{
                      padding: spacing.md,
                      marginBottom: spacing.md,
                      backgroundColor: colors.surfaces.successBg,
                      border: `1px solid ${colors.status.success}44`,
                      borderRadius: borderRadius.md,
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: spacing.xs, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.status.success }}><polyline points="20 6 9 17 4 12" /></svg>
                        New API Key Created!
                      </div>
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
                      <div style={{ fontSize: '0.75rem', color: colors.surfaces.successText, marginTop: spacing.xs, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.status.pending }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        Copy this key now — it will never be shown again!
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
                      No API keys. Nothing to clean up.
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

          {/* Tab 2: Notifications */}
          <TabPanel>
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>WhatsApp Alerts</h3>
              <div style={{ padding: spacing.sm, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.md, fontSize: '0.8rem', color: colors.textMuted, lineHeight: 1.6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-flex', marginRight: '6px', verticalAlign: 'middle', color: colors.accent }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Get instant WhatsApp messages when critical regulatory changes affect your export markets. Powered by Meta WhatsApp Cloud API.
              </div>
              <Card>
                <CardContent>
                  {notifLoading ? (
                    <div style={{ textAlign: 'center', padding: spacing.md, color: colors.textMuted }}>Loading…</div>
                  ) : (
                    <>
                      <div style={{ marginBottom: spacing.lg }}>
                        <label htmlFor="wa-number" style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 500 }}>
                          WhatsApp Number
                        </label>
                        <div style={{ display: 'flex', gap: spacing.sm }}>
                          <input
                            id="wa-number"
                            type="tel"
                            value={notifSettings.whatsapp_number ?? ''}
                            onChange={e => setNotifSettings(s => ({ ...s, whatsapp_number: e.target.value || null }))}
                            placeholder="+91 98765 43210"
                            style={{ flex: 1, padding: spacing.sm, border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, fontSize: '1rem', backgroundColor: colors.white, fontFamily: 'inherit' }}
                          />
                          <Button
                            variant="ghost"
                            onClick={handleTestWhatsApp}
                            disabled={testSending || !notifSettings.whatsapp_number}
                          >
                            {testSending ? 'Sending…' : 'Send Test'}
                          </Button>
                        </div>
                        <div style={{ marginTop: spacing.xs, fontSize: '0.75rem', color: colors.textMuted }}>
                          Use E.164 format, e.g. +919876543210
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${spacing.md} 0`, borderTop: `1px solid ${colors.border}` }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Enable WhatsApp Alerts</div>
                          <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '2px' }}>
                            Receive critical regulatory updates instantly on WhatsApp
                          </div>
                        </div>
                        <button
                          role="switch"
                          aria-checked={notifSettings.whatsapp_alerts}
                          onClick={() => setNotifSettings(s => ({ ...s, whatsapp_alerts: !s.whatsapp_alerts }))}
                          style={{
                            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                            backgroundColor: notifSettings.whatsapp_alerts ? colors.accent : colors.border,
                            position: 'relative', transition: 'background 200ms ease', flexShrink: 0,
                          }}
                        >
                          <span style={{
                            position: 'absolute', top: 3, left: notifSettings.whatsapp_alerts ? 23 : 3,
                            width: 18, height: 18, borderRadius: '50%', backgroundColor: colors.white,
                            transition: 'left 200ms ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }} />
                        </button>
                      </div>

                      <div style={{ marginTop: spacing.lg }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: spacing.sm }}>
                          Alert triggers
                        </div>
                        {[
                          { label: 'Critical regulatory changes', desc: 'New laws, bans, or mandatory certificates affecting your markets' },
                          { label: 'Filing deadlines', desc: 'RoDTEP claim windows closing within 90 days' },
                          { label: 'Sanctions updates', desc: 'New OFAC/UN designations relevant to your shipments' },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm, padding: `${spacing.xs} 0`, borderBottom: `1px solid ${colors.border}` }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.label}</div>
                              <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{item.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: spacing.lg, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="primary" onClick={handleSaveNotifications} disabled={notifSaving}>
                          {notifSaving ? 'Saving…' : 'Save Notification Settings'}
                        </Button>
                      </div>
                    </>
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
