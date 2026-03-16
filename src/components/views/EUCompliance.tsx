// ============================================================================
// EU Compliance View — Document Drafting & Supply Chain Due Diligence
// Only relevant when EU is a selected target market.
// ============================================================================

import { useState } from 'react'
import { Card, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/Tabs'
import { colors, spacing, borderRadius } from '@theme/index'
import {
  generateGSPStatement,
  generateEUCommercialInvoice,
  generateREXDeclaration,
  generateEUDRDueDiligenceStatement,
  type GSPStatementData,
  type EUInvoiceData,
  type REXData,
  type EUDRData,
} from '@/lib/eu-documents'
import type { CompanyProfile, CountryCode, Shipment } from '@/types'

// ─── Props ───────────────────────────────────────────────────────────────────

export interface EUComplianceProps {
  companyProfile: CompanyProfile
  selectedProduct: string
  selectedCountries: CountryCode[]
  shipments: Shipment[]
}

// ─── Shared Styles ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: `1px solid ${colors.border}`,
  borderRadius: borderRadius.md,
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  backgroundColor: colors.white,
  color: colors.text,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: spacing.xs,
}

const fieldStyle: React.CSSProperties = {
  marginBottom: spacing.md,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 700,
  margin: 0,
  color: colors.text,
}

const sectionDescStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: colors.textMuted,
  margin: `${spacing.xs} 0 ${spacing.lg}`,
  lineHeight: 1.6,
}

// ─── EUDR commodity list ─────────────────────────────────────────────────────

const EUDR_COMMODITIES = [
  'cattle', 'leather', 'hide', 'beef', 'cocoa', 'chocolate', 'coffee',
  'palm oil', 'palm', 'soy', 'soya', 'soybean', 'wood', 'timber', 'lumber',
  'furniture', 'pulp', 'paper', 'rubber', 'latex',
]

function isEUDRInScope(product: string): boolean {
  const lower = product.toLowerCase()
  return EUDR_COMMODITIES.some(c => lower.includes(c))
}

// ─── Helper: section header row ──────────────────────────────────────────────

function SectionHeader({
  title,
  badge,
  badgeVariant = 'default',
}: {
  title: string
  badge?: string
  badgeVariant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
        flexWrap: 'wrap',
      }}
    >
      <h3 style={sectionTitleStyle}>{title}</h3>
      {badge && (
        <Badge variant={badgeVariant} size="sm">
          {badge}
        </Badge>
      )}
    </div>
  )
}

// ─── Helper: form field ───────────────────────────────────────────────────────

function Field({
  label,
  children,
  style,
}: {
  label: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{ ...fieldStyle, ...style }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ─── Tab 1: Document Drafting ─────────────────────────────────────────────────

function DocumentDraftingTab({
  companyProfile,
  selectedProduct,
}: {
  companyProfile: CompanyProfile
  selectedProduct: string
}) {
  // ── Section A: GSP State ──
  const [gsp, setGsp] = useState<Omit<GSPStatementData, 'exporterName' | 'exporterIEC'>>({
    buyerName: '',
    buyerCountry: 'EU',
    exporterAddress: '',
    productDescription: selectedProduct,
    hsCode: '',
    invoiceNumber: '',
    invoiceDate: '',
    shipmentValue: 0,
    currency: 'USD',
    mfnRate: 7.5,
    gspRate: 0,
    originDeclaration: 'The exporter of the products covered by this document declares that, except where otherwise clearly indicated, these products are of Indian preferential origin.',
    quantity: '',
    unit: 'pcs',
  })
  const [gspLoading, setGspLoading] = useState(false)

  const gspDutySaving =
    gsp.shipmentValue > 0
      ? `Duty saving: INR ${(gsp.shipmentValue * 0.075).toLocaleString()} (7.5% MFN − 0% GSP on INR ${gsp.shipmentValue.toLocaleString()})`
      : 'Enter shipment value to see duty saving estimate'

  const handleGenerateGSP = async () => {
    setGspLoading(true)
    try {
      await generateGSPStatement({
        ...gsp,
        exporterName: companyProfile.name,
        exporterIEC: companyProfile.iec ?? '',
      })
    } finally {
      setGspLoading(false)
    }
  }

  // ── Section B: EU Commercial Invoice ──
  const [inv, setInv] = useState<Omit<EUInvoiceData, 'exporterName' | 'exporterIEC'>>({
    invoiceNumber: '',
    invoiceDate: '',
    exporterAddress: '',
    exporterGSTIN: '',
    buyerName: '',
    buyerAddress: '',
    buyerEORI: '',
    buyerVAT: '',
    productDescription: selectedProduct,
    hsCode: '',
    quantity: '',
    unit: 'pcs',
    unitPrice: 0,
    totalValue: 0,
    currency: 'USD',
    incoterms: 'FOB',
    portOfLoading: '',
    portOfDischarge: '',
    grossWeight: '',
    netWeight: '',
    packages: '',
    paymentTerms: '',
    countryOfOrigin: 'India',
    declarationText: 'I declare that the information contained in this invoice is true and correct.',
  })
  const [invLoading, setInvLoading] = useState(false)

  const handleGenerateInvoice = async () => {
    setInvLoading(true)
    try {
      await generateEUCommercialInvoice({
        ...inv,
        exporterName: companyProfile.name,
        exporterIEC: companyProfile.iec ?? '',
      })
    } finally {
      setInvLoading(false)
    }
  }

  // ── Section C: REX Declaration ──
  const [rex, setRex] = useState<REXData>({
    rexNumber: '',
    exporterName: companyProfile.name,
    exporterAddress: '',
    exporterIEC: companyProfile.iec ?? '',
    originCriteria: 'Wholly Obtained',
    invoiceNumber: '',
    invoiceDate: '',
    productDescription: selectedProduct,
    hsCode: '',
    shipmentValue: 0,
    currency: 'USD',
  })
  const [rexLoading, setRexLoading] = useState(false)

  const handleGenerateREX = async () => {
    setRexLoading(true)
    try {
      await generateREXDeclaration({ ...rex, exporterName: companyProfile.name })
    } finally {
      setRexLoading(false)
    }
  }

  return (
    <div>
      {/* Section A: GSP Statement on Origin */}
      <div style={{ marginBottom: spacing.xl }}>
        <SectionHeader title="GSP Statement on Origin" badge="Saves up to 7.5% duty" badgeVariant="success" />
        <p style={sectionDescStyle}>
          India exports to EU under GSP (Generalised System of Preferences). Generate the mandatory
          exporter statement to claim 0% preferential duty.
        </p>
        <Card>
          <CardContent>
            <Field label="Buyer Name">
              <input
                type="text"
                style={inputStyle}
                value={gsp.buyerName}
                placeholder="e.g. ABC GmbH"
                onChange={e => setGsp(p => ({ ...p, buyerName: e.target.value }))}
              />
            </Field>
            <Field label="Buyer Country">
              <input
                type="text"
                style={inputStyle}
                value={gsp.buyerCountry}
                onChange={e => setGsp(p => ({ ...p, buyerCountry: e.target.value }))}
              />
            </Field>
            <Field label="Product Description">
              <input
                type="text"
                style={inputStyle}
                value={gsp.productDescription}
                onChange={e => setGsp(p => ({ ...p, productDescription: e.target.value }))}
              />
            </Field>
            <Field label="HS Code">
              <input
                type="text"
                style={inputStyle}
                value={gsp.hsCode}
                placeholder="e.g. 6109.10"
                onChange={e => setGsp(p => ({ ...p, hsCode: e.target.value }))}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field label="Invoice Number">
                <input
                  type="text"
                  style={inputStyle}
                  value={gsp.invoiceNumber}
                  placeholder="e.g. INV-2024-001"
                  onChange={e => setGsp(p => ({ ...p, invoiceNumber: e.target.value }))}
                />
              </Field>
              <Field label="Invoice Date">
                <input
                  type="date"
                  style={inputStyle}
                  value={gsp.invoiceDate}
                  onChange={e => setGsp(p => ({ ...p, invoiceDate: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Shipment Value (INR)">
              <input
                type="number"
                style={inputStyle}
                value={gsp.shipmentValue || ''}
                placeholder="e.g. 500000"
                min={0}
                onChange={e => setGsp(p => ({ ...p, shipmentValue: Number(e.target.value) }))}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: spacing.md }}>
              <Field label="Quantity">
                <input
                  type="text"
                  style={inputStyle}
                  value={gsp.quantity}
                  placeholder="e.g. 500"
                  onChange={e => setGsp(p => ({ ...p, quantity: e.target.value }))}
                />
              </Field>
              <Field label="Unit">
                <input
                  type="text"
                  style={inputStyle}
                  value={gsp.unit}
                  placeholder="e.g. pcs / kg"
                  onChange={e => setGsp(p => ({ ...p, unit: e.target.value }))}
                />
              </Field>
            </div>

            {/* Info box */}
            <div
              style={{
                padding: spacing.md,
                backgroundColor: `${colors.risk.low}10`,
                border: `1px solid ${colors.risk.low}40`,
                borderRadius: borderRadius.md,
                fontSize: '0.8rem',
                color: colors.risk.low,
                marginBottom: spacing.md,
                fontWeight: 500,
              }}
            >
              {gspDutySaving}
            </div>

            <Button
              variant="primary"
              onClick={handleGenerateGSP}
              disabled={gspLoading}
              loading={gspLoading}
            >
              Generate GSP Statement
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Section B: EU Commercial Invoice */}
      <div style={{ marginBottom: spacing.xl }}>
        <SectionHeader title="EU Commercial Invoice" badge="Customs Required" badgeVariant="warning" />
        <p style={sectionDescStyle}>
          Generate a EU customs-compliant commercial invoice with all mandatory fields: HS code,
          EORI, Incoterms, country of origin, and gross/net weight.
        </p>
        <Card>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field label="Invoice Number">
                <input
                  type="text"
                  style={inputStyle}
                  value={inv.invoiceNumber}
                  placeholder="e.g. INV-2024-001"
                  onChange={e => setInv(p => ({ ...p, invoiceNumber: e.target.value }))}
                />
              </Field>
              <Field label="Invoice Date">
                <input
                  type="date"
                  style={inputStyle}
                  value={inv.invoiceDate}
                  onChange={e => setInv(p => ({ ...p, invoiceDate: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Buyer Name">
              <input
                type="text"
                style={inputStyle}
                value={inv.buyerName}
                placeholder="e.g. ABC GmbH"
                onChange={e => setInv(p => ({ ...p, buyerName: e.target.value }))}
              />
            </Field>
            <Field label="Buyer Address">
              <input
                type="text"
                style={inputStyle}
                value={inv.buyerAddress}
                placeholder="e.g. Hauptstr. 1, 10115 Berlin, Germany"
                onChange={e => setInv(p => ({ ...p, buyerAddress: e.target.value }))}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field label="Buyer EORI (optional)">
                <input
                  type="text"
                  style={inputStyle}
                  value={inv.buyerEORI ?? ''}
                  placeholder="e.g. DE123456789"
                  onChange={e => setInv(p => ({ ...p, buyerEORI: e.target.value }))}
                />
              </Field>
              <Field label="Buyer VAT (optional)">
                <input
                  type="text"
                  style={inputStyle}
                  value={inv.buyerVAT ?? ''}
                  placeholder="e.g. DE987654321"
                  onChange={e => setInv(p => ({ ...p, buyerVAT: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Product Description">
              <input
                type="text"
                style={inputStyle}
                value={inv.productDescription}
                onChange={e => setInv(p => ({ ...p, productDescription: e.target.value }))}
              />
            </Field>
            <Field label="HS Code">
              <input
                type="text"
                style={inputStyle}
                value={inv.hsCode}
                placeholder="e.g. 6109.10"
                onChange={e => setInv(p => ({ ...p, hsCode: e.target.value }))}
              />
            </Field>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: spacing.md,
              }}
            >
              <Field label="Quantity">
                <input
                  type="text"
                  style={inputStyle}
                  value={inv.quantity}
                  placeholder="500"
                  onChange={e => setInv(p => ({ ...p, quantity: e.target.value }))}
                />
              </Field>
              <Field label="Unit">
                <input
                  type="text"
                  style={inputStyle}
                  value={inv.unit}
                  placeholder="pcs"
                  onChange={e => setInv(p => ({ ...p, unit: e.target.value }))}
                />
              </Field>
              <Field label="Currency">
                <select
                  style={inputStyle}
                  value={inv.currency}
                  onChange={e =>
                    setInv(p => ({ ...p, currency: e.target.value as EUInvoiceData['currency'] }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="INR">INR</option>
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field label={`Unit Price (${inv.currency})`}>
                <input
                  type="number"
                  style={inputStyle}
                  value={inv.unitPrice || ''}
                  placeholder="0.00"
                  min={0}
                  step="0.01"
                  onChange={e => setInv(p => ({ ...p, unitPrice: Number(e.target.value) }))}
                />
              </Field>
              <Field label={`Total Value (${inv.currency})`}>
                <input
                  type="number"
                  style={inputStyle}
                  value={inv.totalValue || ''}
                  placeholder="0.00"
                  min={0}
                  step="0.01"
                  onChange={e => setInv(p => ({ ...p, totalValue: Number(e.target.value) }))}
                />
              </Field>
            </div>

            <Field label="Incoterms">
              <select
                style={inputStyle}
                value={inv.incoterms}
                onChange={e =>
                  setInv(p => ({ ...p, incoterms: e.target.value as EUInvoiceData['incoterms'] }))
                }
              >
                <option value="FOB">FOB — Free on Board</option>
                <option value="CIF">CIF — Cost, Insurance & Freight</option>
                <option value="EXW">EXW — Ex Works</option>
                <option value="DDP">DDP — Delivered Duty Paid</option>
                <option value="DAP">DAP — Delivered at Place</option>
              </select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field label="Port of Loading">
                <input
                  type="text"
                  style={inputStyle}
                  value={inv.portOfLoading}
                  placeholder="e.g. INNHAVA (Nhava Sheva)"
                  onChange={e => setInv(p => ({ ...p, portOfLoading: e.target.value }))}
                />
              </Field>
              <Field label="Port of Discharge">
                <input
                  type="text"
                  style={inputStyle}
                  value={inv.portOfDischarge}
                  placeholder="e.g. DEHAM (Hamburg)"
                  onChange={e => setInv(p => ({ ...p, portOfDischarge: e.target.value }))}
                />
              </Field>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: spacing.md,
              }}
            >
              <Field label="Gross Weight (kg)">
                <input
                  type="text"
                  style={inputStyle}
                  value={inv.grossWeight}
                  placeholder="e.g. 250"
                  onChange={e => setInv(p => ({ ...p, grossWeight: e.target.value }))}
                />
              </Field>
              <Field label="Net Weight (kg)">
                <input
                  type="text"
                  style={inputStyle}
                  value={inv.netWeight}
                  placeholder="e.g. 220"
                  onChange={e => setInv(p => ({ ...p, netWeight: e.target.value }))}
                />
              </Field>
              <Field label="No. of Packages">
                <input
                  type="text"
                  style={inputStyle}
                  value={inv.packages}
                  placeholder="e.g. 10"
                  onChange={e => setInv(p => ({ ...p, packages: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Payment Terms">
              <input
                type="text"
                style={inputStyle}
                value={inv.paymentTerms}
                placeholder="e.g. 30% advance, 70% against BL"
                onChange={e => setInv(p => ({ ...p, paymentTerms: e.target.value }))}
              />
            </Field>

            <Button
              variant="primary"
              onClick={handleGenerateInvoice}
              disabled={invLoading}
              loading={invLoading}
            >
              Generate Invoice
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Section C: REX Supplier's Declaration */}
      <div style={{ marginBottom: spacing.xl }}>
        <SectionHeader title="REX Supplier's Declaration" />
        <p style={sectionDescStyle}>
          Registered Exporter (REX) declaration for EU preferential tariff. Required for shipments
          over EUR 6,000 to claim GSP benefits.
        </p>
        <Card>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field label="REX Number">
                <input
                  type="text"
                  style={inputStyle}
                  value={rex.rexNumber}
                  placeholder="e.g. IN/REX/12345"
                  onChange={e => setRex(p => ({ ...p, rexNumber: e.target.value }))}
                />
              </Field>
              <Field label="Origin Criteria">
                <select
                  style={inputStyle}
                  value={rex.originCriteria}
                  onChange={e =>
                    setRex(p => ({
                      ...p,
                      originCriteria: e.target.value as REXData['originCriteria'],
                    }))
                  }
                >
                  <option value="Wholly Obtained">Wholly Obtained</option>
                  <option value="Sufficient Processing">Sufficient Processing</option>
                  <option value="Specific Rule">Specific Rule</option>
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field label="Invoice Number">
                <input
                  type="text"
                  style={inputStyle}
                  value={rex.invoiceNumber}
                  placeholder="e.g. INV-2024-001"
                  onChange={e => setRex(p => ({ ...p, invoiceNumber: e.target.value }))}
                />
              </Field>
              <Field label="Invoice Date">
                <input
                  type="date"
                  style={inputStyle}
                  value={rex.invoiceDate}
                  onChange={e => setRex(p => ({ ...p, invoiceDate: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Product Description">
              <input
                type="text"
                style={inputStyle}
                value={rex.productDescription}
                onChange={e => setRex(p => ({ ...p, productDescription: e.target.value }))}
              />
            </Field>
            <Field label="HS Code">
              <input
                type="text"
                style={inputStyle}
                value={rex.hsCode}
                placeholder="e.g. 6109.10"
                onChange={e => setRex(p => ({ ...p, hsCode: e.target.value }))}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: spacing.md }}>
              <Field label="Shipment Value">
                <input
                  type="number"
                  style={inputStyle}
                  value={rex.shipmentValue || ''}
                  placeholder="0"
                  min={0}
                  onChange={e => setRex(p => ({ ...p, shipmentValue: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Currency">
                <select
                  style={inputStyle}
                  value={rex.currency}
                  onChange={e =>
                    setRex(p => ({ ...p, currency: e.target.value as REXData['currency'] }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="INR">INR</option>
                </select>
              </Field>
            </div>

            <Button
              variant="primary"
              onClick={handleGenerateREX}
              disabled={rexLoading}
              loading={rexLoading}
            >
              Generate REX Declaration
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Tab 2: Supply Chain Due Diligence ────────────────────────────────────────

const CSDDD_ITEMS = [
  'Human rights policy documented and published',
  'Environmental due diligence process in place',
  'Supplier code of conduct signed by tier-1 suppliers',
  'Grievance mechanism available for workers',
  'Climate transition plan aligned with 1.5°C pathway',
  'Supply chain mapping completed (tier-1 minimum)',
  'Annual sustainability report published',
  'Third-party audit conducted in last 2 years',
]

const FORCED_LABOUR_QUESTIONS = [
  'Do you have a documented recruitment policy prohibiting forced labour?',
  'Are all workers free to leave employment without penalty?',
  'Do workers retain their own identity documents?',
  'Is overtime voluntary and compensated per local law?',
  'Do you conduct annual audits of your supply chain for forced labour risks?',
]

function SupplyChainTab({ selectedProduct }: { selectedProduct: string }) {
  // ── Section A: EUDR ──
  const eudrInScope = isEUDRInScope(selectedProduct)
  const [eudr, setEudr] = useState<EUDRData>({
    operatorName: '',
    operatorAddress: '',
    productDescription: selectedProduct,
    hsCode: '',
    commodityType: selectedProduct,
    countryOfProduction: 'India',
    geoCoordinates: '',
    invoiceNumber: '',
    quantity: '',
    declarationDate: new Date().toISOString().split('T')[0],
    traceabilitySystem: '',
  })
  const [eudrLoading, setEudrLoading] = useState(false)

  const handleGenerateEUDR = async () => {
    setEudrLoading(true)
    try {
      await generateEUDRDueDiligenceStatement(eudr)
    } finally {
      setEudrLoading(false)
    }
  }

  // ── Section B: CSDDD ──
  const [csdddChecked, setCsdddChecked] = useState<Record<number, boolean>>({})
  const csdddCount = Object.values(csdddChecked).filter(Boolean).length
  const csdddPct = Math.round((csdddCount / CSDDD_ITEMS.length) * 100)

  const csdddBarColor =
    csdddPct >= 80 ? colors.risk.low : csdddPct >= 50 ? colors.risk.medium : colors.risk.high

  // ── Section C: Forced Labour ──
  const [flAnswers, setFlAnswers] = useState<Record<number, 'yes' | 'no' | null>>(
    Object.fromEntries(FORCED_LABOUR_QUESTIONS.map((_, i) => [i, null]))
  )

  const flAnswered = Object.values(flAnswers).filter(v => v !== null).length
  const flYes = Object.values(flAnswers).filter(v => v === 'yes').length
  const flNo = Object.values(flAnswers).filter(v => v === 'no').length

  type FlRisk = 'low' | 'medium' | 'high' | null
  let flRisk: FlRisk = null
  if (flAnswered === FORCED_LABOUR_QUESTIONS.length) {
    if (flNo > 0) flRisk = 'high'
    else if (flYes < FORCED_LABOUR_QUESTIONS.length) flRisk = 'medium'
    else flRisk = 'low'
  }

  const flRiskConfig: Record<
    NonNullable<FlRisk>,
    { label: string; color: string; bg: string; border: string }
  > = {
    low: {
      label: 'Low Risk',
      color: colors.risk.low,
      bg: `${colors.risk.low}10`,
      border: `${colors.risk.low}40`,
    },
    medium: {
      label: 'Medium Risk — address gaps before 2027',
      color: colors.risk.medium,
      bg: `${colors.risk.medium}10`,
      border: `${colors.risk.medium}40`,
    },
    high: {
      label: 'High Risk — immediate action required',
      color: colors.risk.high,
      bg: `${colors.risk.high}10`,
      border: `${colors.risk.high}40`,
    },
  }

  return (
    <div>
      {/* Section A: EUDR */}
      <div style={{ marginBottom: spacing.xl }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.xs,
            flexWrap: 'wrap',
          }}
        >
          <h3 style={sectionTitleStyle}>EU Deforestation Regulation (EUDR) Check</h3>
          <Badge variant={eudrInScope ? 'danger' : 'success'} size="sm">
            {eudrInScope ? 'In Scope' : 'Not in Scope'}
          </Badge>
        </div>

        {eudrInScope ? (
          <>
            {/* Warning card */}
            <div
              style={{
                padding: spacing.md,
                backgroundColor: `${colors.risk.high}08`,
                border: `1px solid ${colors.risk.high}30`,
                borderRadius: borderRadius.lg,
                marginBottom: spacing.lg,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: colors.risk.high,
                  fontSize: '0.9rem',
                  marginBottom: spacing.sm,
                }}
              >
                Your product category falls under EUDR scope. EU buyers will require a Due
                Diligence Statement before accepting shipment from Jan 2025.
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: colors.text,
                  marginBottom: spacing.xs,
                }}
              >
                Required documents:
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '1.2rem',
                  fontSize: '0.8rem',
                  color: colors.text,
                  lineHeight: 1.7,
                }}
              >
                <li>Geo-coordinates of production area</li>
                <li>Supply chain traceability records</li>
                <li>Non-deforestation declaration</li>
                <li>Third-party verification (recommended)</li>
              </ul>
            </div>

            {/* EUDR form */}
            <Card>
              <CardContent>
                <Field label="Product Description">
                  <input
                    type="text"
                    style={inputStyle}
                    value={eudr.productDescription}
                    onChange={e => setEudr(p => ({ ...p, productDescription: e.target.value }))}
                  />
                </Field>
                <Field label="Exporter Name">
                  <input
                    type="text"
                    style={inputStyle}
                    value={eudr.operatorName}
                    placeholder="Your company name"
                    onChange={e => setEudr(p => ({ ...p, operatorName: e.target.value }))}
                  />
                </Field>
                <Field label="Country of Production">
                  <input
                    type="text"
                    style={inputStyle}
                    value={eudr.countryOfProduction}
                    onChange={e => setEudr(p => ({ ...p, countryOfProduction: e.target.value }))}
                  />
                </Field>
                <Field label="Geo-coordinates (optional)">
                  <input
                    type="text"
                    style={inputStyle}
                    value={eudr.geoCoordinates ?? ''}
                    placeholder="e.g. 12.9716° N, 77.5946° E"
                    onChange={e => setEudr(p => ({ ...p, geoCoordinates: e.target.value }))}
                  />
                </Field>
                <Field label="Traceability System">
                  <input
                    type="text"
                    style={inputStyle}
                    value={eudr.traceabilitySystem}
                    placeholder="e.g. FSC Chain of Custody, Internal traceability records"
                    onChange={e => setEudr(p => ({ ...p, traceabilitySystem: e.target.value }))}
                  />
                </Field>
                <Field label="Quantity">
                  <input
                    type="text"
                    style={inputStyle}
                    value={eudr.quantity}
                    placeholder="e.g. 5000 kg"
                    onChange={e => setEudr(p => ({ ...p, quantity: e.target.value }))}
                  />
                </Field>

                <Button
                  variant="primary"
                  onClick={handleGenerateEUDR}
                  disabled={eudrLoading}
                  loading={eudrLoading}
                >
                  Generate EUDR Statement
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <div
            style={{
              padding: spacing.md,
              backgroundColor: `${colors.risk.low}10`,
              border: `1px solid ${colors.risk.low}40`,
              borderRadius: borderRadius.lg,
              fontSize: '0.875rem',
              color: colors.risk.low,
              fontWeight: 500,
            }}
          >
            Your current product is not in EUDR scope. No deforestation declaration required.
          </div>
        )}
      </div>

      {/* Section B: CSDDD */}
      <div style={{ marginBottom: spacing.xl }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.xs,
            flexWrap: 'wrap',
          }}
        >
          <h3 style={sectionTitleStyle}>Corporate Sustainability Due Diligence (CSDDD)</h3>
          <Badge variant="warning" size="sm">
            Mandatory from 2027
          </Badge>
        </div>
        <p style={sectionDescStyle}>
          EU buyers (large companies) will require their Indian suppliers to demonstrate CSDDD
          readiness. Start preparing now.
        </p>

        <Card>
          <CardContent>
            {/* Progress bar */}
            <div style={{ marginBottom: spacing.lg }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: colors.textMuted,
                  marginBottom: spacing.xs,
                  fontWeight: 600,
                }}
              >
                <span>Readiness</span>
                <span style={{ color: csdddBarColor, fontWeight: 700 }}>
                  {csdddCount}/{CSDDD_ITEMS.length} ({csdddPct}%)
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  backgroundColor: colors.border,
                  borderRadius: borderRadius.full,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${csdddPct}%`,
                    backgroundColor: csdddBarColor,
                    borderRadius: borderRadius.full,
                    transition: 'width 0.3s ease, background-color 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Checklist items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {CSDDD_ITEMS.map((item, i) => {
                const checked = !!csdddChecked[i]
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: spacing.sm,
                      padding: `${spacing.sm} ${spacing.md}`,
                      backgroundColor: checked ? `${colors.risk.low}08` : colors.surface,
                      border: `1px solid ${checked ? colors.risk.low + '40' : colors.border}`,
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() =>
                      setCsdddChecked(prev => ({ ...prev, [i]: !prev[i] }))
                    }
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: borderRadius.sm,
                        border: `2px solid ${checked ? colors.risk.low : colors.border}`,
                        backgroundColor: checked ? colors.risk.low : colors.white,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {checked && (
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          fill="none"
                          style={{ display: 'block' }}
                        >
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="white"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        color: checked ? colors.text : colors.textMuted,
                        lineHeight: 1.5,
                        userSelect: 'none',
                        textDecoration: checked ? 'none' : 'none',
                        fontWeight: checked ? 500 : 400,
                      }}
                    >
                      {item}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section C: Forced Labour */}
      <div style={{ marginBottom: spacing.xl }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.xs,
            flexWrap: 'wrap',
          }}
        >
          <h3 style={sectionTitleStyle}>EU Forced Labour Regulation</h3>
          <Badge variant="warning" size="sm">
            In Force 2027
          </Badge>
        </div>
        <p style={sectionDescStyle}>
          Products made with forced labour will be banned from EU market. Complete this
          self-assessment.
        </p>

        <Card>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {FORCED_LABOUR_QUESTIONS.map((q, i) => {
                const answer = flAnswers[i]
                return (
                  <div
                    key={i}
                    style={{
                      padding: spacing.md,
                      border: `1px solid ${
                        answer === 'yes'
                          ? colors.risk.low + '40'
                          : answer === 'no'
                          ? colors.risk.high + '40'
                          : colors.border
                      }`,
                      borderRadius: borderRadius.md,
                      backgroundColor:
                        answer === 'yes'
                          ? `${colors.risk.low}08`
                          : answer === 'no'
                          ? `${colors.risk.high}08`
                          : colors.white,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.875rem',
                        color: colors.text,
                        marginBottom: spacing.sm,
                        fontWeight: 500,
                        lineHeight: 1.5,
                      }}
                    >
                      {i + 1}. {q}
                    </div>
                    <div style={{ display: 'flex', gap: spacing.md }}>
                      {(['yes', 'no'] as const).map(val => (
                        <label
                          key={val}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.xs,
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: answer === val ? 600 : 400,
                            color:
                              answer === val
                                ? val === 'yes'
                                  ? colors.risk.low
                                  : colors.risk.high
                                : colors.textMuted,
                          }}
                        >
                          <input
                            type="radio"
                            name={`fl-q-${i}`}
                            value={val}
                            checked={answer === val}
                            onChange={() =>
                              setFlAnswers(prev => ({ ...prev, [i]: val }))
                            }
                            style={{ accentColor: val === 'yes' ? colors.risk.low : colors.risk.high }}
                          />
                          {val.charAt(0).toUpperCase() + val.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Risk result */}
            {flRisk !== null && (
              <div
                style={{
                  marginTop: spacing.lg,
                  padding: spacing.md,
                  backgroundColor: flRiskConfig[flRisk].bg,
                  border: `1px solid ${flRiskConfig[flRisk].border}`,
                  borderRadius: borderRadius.md,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: flRiskConfig[flRisk].color,
                }}
              >
                {flRisk === 'low' && 'Low Risk — self-assessment passed'}
                {flRisk === 'medium' && 'Medium Risk — address gaps before 2027'}
                {flRisk === 'high' && 'High Risk — immediate action required'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EUCompliance({
  companyProfile,
  selectedProduct,
  selectedCountries,
  shipments: _shipments,
}: EUComplianceProps) {
  const [activeTab, setActiveTab] = useState(0)

  // Guard: only relevant for EU market
  const isEUSelected = selectedCountries.includes('EU')

  if (!isEUSelected) {
    return (
      <div style={{ padding: spacing.lg }}>
        <div
          style={{
            padding: spacing.xl,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.lg,
            textAlign: 'center',
            color: colors.textMuted,
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: spacing.sm }}>🇪🇺</div>
          <h3 style={{ margin: 0, marginBottom: spacing.xs, color: colors.text, fontSize: '1.125rem', fontWeight: 600 }}>
            EU Compliance
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            Add the European Union as a target market in Settings to unlock EU-specific compliance
            tools and document drafting.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: spacing.lg }}>
      {/* Page Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: 0,
            color: colors.text,
          }}
        >
          🇪🇺 EU Compliance
        </h2>
        <p
          style={{
            color: colors.textMuted,
            margin: `${spacing.xs} 0 0`,
            fontSize: '0.875rem',
          }}
        >
          EU supply chain compliance tools and commercial document drafting for Indian exporters
        </p>
      </div>

      <Tabs index={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab>Document Drafting</Tab>
          <Tab>Supply Chain Due Diligence</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <DocumentDraftingTab
              companyProfile={companyProfile}
              selectedProduct={selectedProduct}
            />
          </TabPanel>
          <TabPanel>
            <SupplyChainTab selectedProduct={selectedProduct} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
