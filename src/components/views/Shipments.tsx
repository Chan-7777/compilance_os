// ============================================================================
// Shipments View - Shipment tracking with CRUD
// ============================================================================

import { useState } from 'react'
import { Card, CardContent } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { colors, spacing, borderRadius } from '@theme/index'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { PRODUCT_CATEGORIES } from '@/data/products'
import type { Shipment, CountryCode } from '@/types'

type ProductInfo = (typeof PRODUCT_CATEGORIES)[number]

export interface ShipmentsProps {
  shipments: Shipment[]
  selectedProduct: string
  selectedCountries: CountryCode[]
  onAddShipment: (shipment: Omit<Shipment, 'id' | 'status' | 'riskScore'>) => void
  onSelectShipment: (id: string) => void
}

export function Shipments({
  shipments,
  selectedProduct,
  selectedCountries,
  onAddShipment,
  onSelectShipment,
}: ShipmentsProps) {
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    product: selectedProduct || '',
    country: selectedCountries[0] || '',
    date: '',
  })

  const containerStyle: React.CSSProperties = {
    padding: spacing.lg,
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: 0,
    color: colors.text,
  }

  const shipmentListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  }

  const shipmentCardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    cursor: 'pointer',
    transition: 'all 0.2s',
  }

  const shipmentContentStyle: React.CSSProperties = {
    flex: 1,
  }

  const shipmentNameStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: spacing.xs,
  }

  const shipmentMetaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: '0.875rem',
    color: colors.textMuted,
  }

  const riskScoreStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
  }

  const formStyle: React.CSSProperties = {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  }

  const formGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing.md,
    marginBottom: spacing.md,
  }

  const formFieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: colors.textMuted,
  }

  const inputStyle: React.CSSProperties = {
    padding: spacing.sm,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    outline: 'none',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    backgroundColor: colors.white,
  }

  const formActionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  }

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: spacing['2xl'],
    color: colors.textMuted,
  }

  const getStatusVariant = (status: Shipment['status']) => {
    switch (status) {
      case 'delivered':
        return 'success' as const
      case 'in_transit':
      case 'in_progress':
        return 'info' as const
      case 'preparing':
        return 'warning' as const
      default:
        return 'default' as const
    }
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ')
  }

  const getRiskColor = (score?: number) => {
    if (!score) return colors.textMuted
    if (score >= 60) return colors.risk.high
    if (score >= 30) return colors.risk.medium
    return colors.risk.low
  }

  const isFormValid = formData.name && formData.product && formData.country && formData.date

  const handleSubmit = () => {
    if (isFormValid) {
      onAddShipment({
        name: formData.name,
        product: formData.product,
        country: formData.country,
        date: formData.date,
      })
      setFormData({
        name: '',
        product: selectedProduct || '',
        country: selectedCountries[0] || '',
        date: '',
      })
      setShowForm(false)
    }
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Shipments</h2>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          + New Shipment
        </Button>
      </div>

      {/* Add Shipment Form */}
      {showForm && (
        <div style={formStyle}>
          <div style={formGridStyle}>
            <div style={formFieldStyle}>
              <label style={labelStyle} htmlFor="shipment-name">
                Shipment Name
              </label>
              <input
                id="shipment-name"
                type="text"
                style={inputStyle}
                value={formData.name}
                onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                placeholder="e.g., Steel Export Batch 1"
              />
            </div>
            <div style={formFieldStyle}>
              <label style={labelStyle} htmlFor="shipment-product">
                Product
              </label>
              <select
                id="shipment-product"
                style={selectStyle}
                value={formData.product}
                onChange={e => setFormData(d => ({ ...d, product: e.target.value }))}
              >
                <option value="">Select product</option>
                {PRODUCT_CATEGORIES.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={formFieldStyle}>
              <label style={labelStyle} htmlFor="shipment-country">
                Destination
              </label>
              <select
                id="shipment-country"
                style={selectStyle}
                value={formData.country}
                onChange={e => setFormData(d => ({ ...d, country: e.target.value }))}
              >
                <option value="">Select destination</option>
                {selectedCountries.map(c => (
                  <option key={c} value={c}>
                    {REGULATORY_DB[c]?.flag} {REGULATORY_DB[c]?.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={formFieldStyle}>
              <label style={labelStyle} htmlFor="shipment-date">
                Date
              </label>
              <input
                id="shipment-date"
                type="date"
                style={inputStyle}
                value={formData.date}
                onChange={e => setFormData(d => ({ ...d, date: e.target.value }))}
              />
            </div>
          </div>
          <div style={formActionsStyle}>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!isFormValid} onClick={handleSubmit}>
              Create Shipment
            </Button>
          </div>
        </div>
      )}

      {/* Shipment List */}
      {shipments.length === 0 ? (
        <div style={emptyStyle}>
          <p>No shipments yet</p>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Create your first shipment
          </Button>
        </div>
      ) : (
        <div style={shipmentListStyle}>
          {shipments.map(shipment => {
            const country = REGULATORY_DB[shipment.country as CountryCode]
            const product = PRODUCT_CATEGORIES.find(p => p.id === shipment.product)
            const isExpanded = expandedId === shipment.id

            return (
              <div key={shipment.id}>
                <div
                  style={{
                    ...shipmentCardStyle,
                    borderColor: isExpanded ? colors.primary : colors.border,
                    borderBottomLeftRadius: isExpanded ? 0 : borderRadius.lg,
                    borderBottomRightRadius: isExpanded ? 0 : borderRadius.lg,
                  }}
                  onClick={() => {
                    setExpandedId(isExpanded ? null : shipment.id)
                    onSelectShipment(shipment.id)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setExpandedId(isExpanded ? null : shipment.id)
                      onSelectShipment(shipment.id)
                    }
                  }}
                  aria-expanded={isExpanded}
                >
                  <span style={{ fontSize: '1.5rem' }}>{country?.flag || '📦'}</span>
                  <div style={shipmentContentStyle}>
                    <div style={shipmentNameStyle}>{shipment.name}</div>
                    <div style={shipmentMetaStyle}>
                      <span>{product?.label || shipment.product}</span>
                      <span>→</span>
                      <span>{country?.name || shipment.country}</span>
                      <span>•</span>
                      <span>{shipment.date}</span>
                      <Badge variant={getStatusVariant(shipment.status)} size="sm">
                        {formatStatus(shipment.status)}
                      </Badge>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    {shipment.riskScore !== undefined && (
                      <div style={{ ...riskScoreStyle, color: getRiskColor(shipment.riskScore) }}>
                        {shipment.riskScore}
                      </div>
                    )}
                    <span style={{ fontSize: '0.75rem', color: colors.textMuted, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{
                    padding: spacing.lg,
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.primary}`,
                    borderTop: 'none',
                    borderBottomLeftRadius: borderRadius.lg,
                    borderBottomRightRadius: borderRadius.lg,
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md, marginBottom: spacing.md }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.xs }}>Product</div>
                        <div style={{ fontWeight: 500 }}>{product?.icon} {product?.label || shipment.product}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.xs }}>Destination</div>
                        <div style={{ fontWeight: 500 }}>{country?.flag} {country?.name || shipment.country}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.xs }}>Ship Date</div>
                        <div style={{ fontWeight: 500 }}>{shipment.date}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md, marginBottom: spacing.md }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.xs }}>Status</div>
                        <Badge variant={getStatusVariant(shipment.status)}>{formatStatus(shipment.status)}</Badge>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.xs }}>Risk Score</div>
                        <div style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: getRiskColor(shipment.riskScore) }}>
                          {shipment.riskScore !== undefined ? `${shipment.riskScore}/100` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.xs }}>HS Code Prefix</div>
                        <div style={{ fontWeight: 500 }}>{product?.hsPrefix?.join(', ') || 'N/A'}</div>
                      </div>
                    </div>
                    {country?.cbam?.active && (
                      <div style={{ padding: spacing.sm, backgroundColor: `${colors.risk.high}11`, border: `1px solid ${colors.risk.high}33`, borderRadius: borderRadius.md, fontSize: '0.875rem', marginBottom: spacing.sm }}>
                        <strong>CBAM Notice:</strong> This destination has active CBAM requirements. Ensure carbon emissions data is prepared.
                      </div>
                    )}
                    {country?.packaging && country.packaging.length > 0 && (
                      <div style={{ fontSize: '0.875rem', color: colors.textMuted }}>
                        <strong>Packaging:</strong> {country.packaging.join(' · ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
