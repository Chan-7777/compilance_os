// ============================================================================
// Shipments View - Shipment tracking with CRUD + Pre-Shipment Compliance Gate
// ============================================================================

import { useState, useEffect } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import { colors, spacing, borderRadius } from '@theme/index'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { PRODUCT_CATEGORIES } from '@/data/products'
import { isCBAMScope, getCBAMSector } from '@/data/cbam-hs-codes'
import { runGateCheck, downloadCOOPdf, generateDealPack, classifyProductHSCode, calculateLandedCost, generateCustomsPayload, processInvoiceOCR, submitTReDSFinancing } from '@/lib/api'
import type { Shipment, CountryCode, GateCheckResult, LandedCostResult, CompanyProfile } from '@/types'
import { GateStamp } from '@/components/GateStamp'

export interface ShipmentsProps {
  shipments: Shipment[]
  selectedProduct: string
  selectedCountries: CountryCode[]
  companyProfile: CompanyProfile
  checkedItems: Record<string, boolean>
  onAddShipment: (shipment: Omit<Shipment, 'id' | 'status' | 'riskScore'>) => void
  onSelectShipment: (id: string) => void
}

export function Shipments({
  shipments,
  selectedProduct,
  selectedCountries,
  companyProfile,
  checkedItems,
  onAddShipment,
  onSelectShipment,
}: ShipmentsProps) {
  const isMobile = useMobile()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    product: string
    description: string
    country: string
    date: string
    hsCode: string
    shipmentValue: string
    buyerName: string
  }>({
    name: '',
    product: selectedProduct || '',
    description: '',
    country: selectedCountries[0] || '',
    date: '',
    hsCode: '',
    shipmentValue: '',
    buyerName: '',
  })
  const [gateResults, setGateResults] = useState<Record<string, GateCheckResult>>({})
  const [gateLoading, setGateLoading] = useState<Record<string, boolean>>({})
  const [isClassifying, setIsClassifying] = useState(false)
  const [hsSuggestions, setHsSuggestions] = useState<Array<{ hsCode: string; name: string; confidence: string; reason: string }>>([])
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [landedCosts, setLandedCosts] = useState<Record<string, LandedCostResult>>({})
  const [landedCostLoading, setLandedCostLoading] = useState<Record<string, boolean>>({})
  const [filingLoading, setFilingLoading] = useState<Record<string, boolean>>({})
  const [filingResults, setFilingResults] = useState<Record<string, any>>({})
  const [tredsLoading, setTredsLoading] = useState<Record<string, boolean>>({})
  const [tredsResults, setTredsResults] = useState<Record<string, any>>({})
  const [hasDraft, setHasDraft] = useState(false)
  const [showFinancePanel, setShowFinancePanel] = useState(false)
  const [financeForm, setFinanceForm] = useState({ invoiceValue: '', buyerName: '', invoiceRef: '' })
  const [tredsEligibility, setTredsEligibility] = useState<null | { eligible: boolean; reason: string; maxAmount: number }>(null)
  const [lcDownloading, setLcDownloading] = useState(false)
  const [ecgcPremium, setEcgcPremium] = useState<null | { premium: number; coverage: number }>(null)

  const DRAFT_KEY = 'cos_shipment_draft'

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setFormData(parsed)
        setHasDraft(true)
      }
    } catch {
      // ignore corrupt draft
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateFormData = (updater: (prev: typeof formData) => typeof formData) => {
    setFormData(prev => {
      const next = updater(prev)
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
        setHasDraft(true)
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
    setFormData({
      name: '',
      product: selectedProduct || '',
      description: '',
      country: selectedCountries[0] || '',
      date: '',
      hsCode: '',
      shipmentValue: '',
      buyerName: '',
    })
  }

  const containerStyle: React.CSSProperties = {
    padding: isMobile ? spacing.md : spacing.lg,
    maxWidth: '100%',
    boxSizing: 'border-box',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: spacing.md,
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

  const ocrDropZoneStyle: React.CSSProperties = {
    gridColumn: '1 / -1',
    border: `2px dashed ${isProcessingOCR ? colors.primary : colors.border}`,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    textAlign: 'center',
    backgroundColor: isProcessingOCR ? `${colors.primary}11` : colors.surface,
    cursor: isProcessingOCR ? 'wait' : 'pointer',
    transition: 'all 0.2s',
    marginBottom: spacing.lg,
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

  const getGateVariant = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'success' as const
      case 'blocked':
        return 'danger' as const
      default:
        return 'warning' as const
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

  const { success: toastSuccess, error: toastError } = useToast()

  const handleDropOCR = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (isProcessingOCR) return

    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      toastError('Please upload a PDF or Image file.')
      return
    }

    setIsProcessingOCR(true)

    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1] ?? result)
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })

      const response = await processInvoiceOCR(fileBase64, file.name)
      if (response.success) {
        updateFormData(prev => ({
          ...prev,
          name: response.data.name,
          product: response.data.product,
          description: response.data.description,
          country: response.data.country,
          shipmentValue: response.data.value.toString(),
          hsCode: response.data.hsCode,
        }))
        toastSuccess('OCR Extraction Complete: Form auto-populated!')
        if (response.warnings && response.warnings.length > 0) {
          response.warnings.forEach((w: string) => toastError(`OCR Warning: ${w}`))
        }
      }
    } catch (err: any) {
      toastError(`OCR Failed: ${err.message}`)
    } finally {
      setIsProcessingOCR(false)
    }
  }

  const handleSubmit = () => {
    if (isFormValid) {
      onAddShipment({
        name: formData.name,
        product: formData.product,
        country: formData.country,
        date: formData.date,
        hsCode: formData.hsCode || undefined,
        shipmentValue: formData.shipmentValue ? parseFloat(formData.shipmentValue) : undefined,
        buyerName: formData.buyerName || undefined,
      })
      localStorage.removeItem(DRAFT_KEY)
      setHasDraft(false)
      setFormData({
        name: '',
        product: selectedProduct || '',
        description: '',
        country: selectedCountries[0] || '',
        date: '',
        hsCode: '',
        shipmentValue: '',
        buyerName: '',
      })
      setShowForm(false)
    }
  }

  const handleRunGateCheck = async (shipmentId: string) => {
    const shipment = shipments.find(s => s.id === shipmentId)
    if (!shipment) return
    setGateLoading(prev => ({ ...prev, [shipmentId]: true }))
    try {
      const result = await runGateCheck(shipment, checkedItems, companyProfile)
      setGateResults(prev => ({ ...prev, [shipmentId]: result }))
    } catch (err: any) {
      toastError(`Gate check failed: ${err?.message ?? 'Unknown error'}`)
    } finally {
      setGateLoading(prev => ({ ...prev, [shipmentId]: false }))
    }
  }

  const handleGenerateDealPack = (shipment: Shipment) => {
    generateDealPack(shipment, companyProfile, checkedItems)
  }

  const handleSuggestHSCode = async () => {
    if (!formData.description || !formData.country) return

    setIsClassifying(true)
    setHsSuggestions([])
    try {
      const result = await classifyProductHSCode(formData.description, formData.country, formData.product || undefined)
      if (result.suggestions && result.suggestions.length > 1) {
        // Show picker so user can choose the right subheading
        setHsSuggestions(result.suggestions)
        updateFormData(prev => ({ ...prev, hsCode: result.hs_code }))
      } else if (result.hs_code) {
        updateFormData(prev => ({ ...prev, hsCode: result.hs_code }))
      }
    } catch (err: any) {
      toastError(`HS classification failed: ${err.message}`)
    } finally {
      setIsClassifying(false)
    }
  }

  const handleDownloadCOO = async (shipmentId: string) => {
    try {
      const s = shipments.find(x => x.id === shipmentId)
      const blob = await downloadCOOPdf(shipmentId, s)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coo_${shipmentId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toastError(`CoO download failed: ${err?.message ?? 'Please try again'}`)
    }
  }

  const handleCalculateLandedCost = async (shipment: Shipment) => {
    const hsCode = shipment.hsCode
    const value = shipment.shipmentValue
    if (!hsCode || !value) return

    setLandedCostLoading(prev => ({ ...prev, [shipment.id]: true }))
    try {
      const result = await calculateLandedCost(hsCode, value, shipment.country)
      setLandedCosts(prev => ({ ...prev, [shipment.id]: result }))
    } catch (err: any) {
      toastError(`Landed cost calculation failed: ${err?.message ?? 'Please add HS code and value'}`)
    } finally {
      setLandedCostLoading(prev => ({ ...prev, [shipment.id]: false }))
    }
  }

  const handleFileToCustoms = async (shipment: Shipment) => {
    setFilingLoading(prev => ({ ...prev, [shipment.id]: true }))
    try {
      const result = await generateCustomsPayload(shipment)
      setFilingResults(prev => ({ ...prev, [shipment.id]: result }))
    } catch (err: any) {
      toastError(`Customs filing failed: ${err?.message ?? 'Please try again'}`)
    } finally {
      setFilingLoading(prev => ({ ...prev, [shipment.id]: false }))
    }
  }

  const handleSubmitTReDS = async (shipment: Shipment) => {
    if (!shipment.shipmentValue || !filingResults[shipment.id]) return

    setTredsLoading(prev => ({ ...prev, [shipment.id]: true }))
    try {
      const result = await submitTReDSFinancing({
        seller: { iec: companyProfile.iec || '' },
        buyer: { name: shipment.buyerName || '' },
        invoiceValue: shipment.shipmentValue,
        currency: 'INR',
        referenceNumber: filingResults[shipment.id].reference_number
      })
      setTredsResults(prev => ({ ...prev, [shipment.id]: result }))
      toastSuccess('Financing request recorded — a ComplianceOS advisor will contact you within 1 business day.')
    } catch (err: any) {
      toastError(`Financing request failed: ${err.message}`)
    } finally {
      setTredsLoading(prev => ({ ...prev, [shipment.id]: false }))
    }
  }

  const checkTReDSEligibility = () => {
    const value = parseFloat(financeForm.invoiceValue) || 0
    if (!companyProfile.iec) {
      setTredsEligibility({ eligible: false, reason: 'IEC number required. Add it in Settings → Company Details.', maxAmount: 0 })
      return
    }
    if (value < 100000) {
      setTredsEligibility({ eligible: false, reason: 'Minimum invoice value is ₹1,00,000 for TReDS.', maxAmount: 0 })
      return
    }
    setTredsEligibility({
      eligible: true,
      reason: 'IEC verified. Invoice eligible for TReDS discounting up to 90% of value.',
      maxAmount: Math.round(value * 0.9),
    })
  }

  const calculateECGCPremium = () => {
    const value = parseFloat(financeForm.invoiceValue) || 0
    if (value <= 0) return
    const insuredValue = value * 0.9
    const annualPremium = Math.round(insuredValue * 0.0072)
    const coverage = Math.round(insuredValue)
    setEcgcPremium({ premium: annualPremium, coverage })
  }

  const handleDownloadLCTemplate = () => {
    setLcDownloading(true)
    const html = `<!DOCTYPE html>
<html><head><title>Letter of Credit Template</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 20px;color:${colors.text}}
h1{font-size:1.4rem;border-bottom:2px solid ${colors.primary};padding-bottom:8px}
.field{border-bottom:1px solid ${colors.textSubtle};min-height:24px;margin:4px 0 16px;padding:4px}
label{font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${colors.textMuted}}
.section{margin:24px 0}.note{font-size:0.8rem;color:${colors.textSubtle};font-style:italic;margin-top:32px;border-top:1px solid ${colors.border};padding-top:12px}
</style></head><body>
<h1>Letter of Credit — Application Template</h1>
<p style="font-size:0.85rem;color:${colors.textMuted}">Complete and submit to your bank. This is a template only — your bank will issue the final LC.</p>
<div class="section">
<label>Applicant (Exporter)</label><div class="field">${companyProfile.name || '_______________'}</div>
<label>IEC Number</label><div class="field">${companyProfile.iec || '_______________'}</div>
<label>GSTIN</label><div class="field">${companyProfile.gstin || '_______________'}</div>
</div>
<div class="section">
<label>Beneficiary (Buyer)</label><div class="field">${financeForm.buyerName || '_______________'}</div>
<label>LC Amount (USD / INR)</label><div class="field">${financeForm.invoiceValue ? `\u20b9${parseFloat(financeForm.invoiceValue).toLocaleString('en-IN')}` : '_______________'}</div>
<label>Invoice / PO Reference</label><div class="field">${financeForm.invoiceRef || '_______________'}</div>
</div>
<div class="section">
<label>Shipment Terms (Incoterms)</label><div class="field">FOB / CIF / DAP (select applicable)</div>
<label>Latest Shipment Date</label><div class="field">_______________</div>
<label>Expiry Date of LC</label><div class="field">_______________</div>
<label>Port of Loading</label><div class="field">${companyProfile.portOfLoading || '_______________'}</div>
<label>Documents Required</label>
<div class="field">[ ] Commercial Invoice (3 originals)<br>[ ] Packing List<br>[ ] Bill of Lading / Airway Bill<br>[ ] Certificate of Origin (DGFT / Chamber of Commerce)<br>[ ] Phytosanitary / Quality Certificate (if applicable)<br>[ ] Packing Declaration</div>
</div>
<div class="note">Template generated by ComplianceOS. Not a binding legal document. Consult your bank's trade finance team before submission.</div>
</body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.print() }
    setLcDownloading(false)
  }

  const renderGateCheckPanel = (shipment: Shipment) => {
    const gate = gateResults[shipment.id]
    const loading = gateLoading[shipment.id]

    return (
      <div style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.md, border: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Pre-Shipment Compliance Gate</h4>
          </div>
          <Button
            variant="primary"
            onClick={() => handleRunGateCheck(shipment.id)}
            disabled={loading}
          >
            {loading ? 'Running...' : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Run Compliance Check
              </span>
            )}
          </Button>
        </div>

        {gate && (
          <>
            {/* Gate Status — the money moment */}
            <div style={{
              marginBottom: spacing.md, padding: spacing.md, borderRadius: borderRadius.md,
              backgroundColor: gate.gate_status === 'approved' ? colors.surfaces.successBg : gate.gate_status === 'blocked' ? colors.surfaces.dangerBg : colors.surfaces.warningBg,
              border: `1px solid ${gate.gate_status === 'approved' ? colors.status.success : gate.gate_status === 'blocked' ? colors.status.error : colors.status.pending}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md,
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: spacing.xs }}>
                  Gate Result
                </div>
                <Badge variant={getGateVariant(gate.gate_status)} size="sm">
                  {gate.gate_status.toUpperCase()}
                </Badge>
              </div>
              <GateStamp
                status={gate.gate_status === 'approved' ? 'approved' : gate.gate_status === 'blocked' ? 'blocked' : 'conditional'}
                date={new Date().toISOString()}
                companyName={companyProfile.name}
              />
            </div>

            {/* 5 Check Items */}
            <div style={{ display: 'grid', gap: spacing.sm }}>
              {/* HS Validation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.sm, backgroundColor: colors.surface }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {gate.hs_validation?.valid ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.status.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.status.error} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  )}
                </span>
                <div style={{ flex: 1 }}>
                  <strong>HS Code Validation</strong>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                    {gate.hs_validation?.description || 'N/A'}
                  </div>
                </div>
              </div>

              {/* FTA Eligibility */}
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.sm, backgroundColor: colors.surface }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {gate.fta_eligibility?.eligible ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.status.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.status.pending} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  )}
                </span>
                <div style={{ flex: 1 }}>
                  <strong>FTA Eligibility</strong>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                    {gate.fta_eligibility?.agreement || 'No FTA'} — MFN: {gate.fta_eligibility?.mfn_rate}% → Pref: {gate.fta_eligibility?.preferential_rate}%
                  </div>
                </div>
              </div>

              {/* FTA Savings Highlight */}
              {gate.fta_eligibility?.potential_savings > 0 && (
                <div style={{ padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surfaces.successBg, border: `1px solid ${colors.status.success}44`, textAlign: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: colors.surfaces.successText }}>
                    Potential Savings: ₹{gate.fta_eligibility.potential_savings.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* CoO Requirement */}
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.sm, backgroundColor: colors.surface }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {gate.coo_requirement?.required ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textSubtle} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  )}
                </span>
                <div style={{ flex: 1 }}>
                  <strong>Certificate of Origin</strong>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                    {gate.coo_requirement?.required
                      ? `Required — ${gate.coo_requirement.issuing_authority} (${gate.coo_requirement.document_type})`
                      : 'Not required'}
                  </div>
                </div>
                {gate.coo_requirement?.required && (
                  <Button variant="ghost" onClick={() => handleDownloadCOO(shipment.id)}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download CoO PDF
                    </span>
                  </Button>
                )}
              </div>

              {/* Rules of Origin */}
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.sm, backgroundColor: colors.surface }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {gate.rules_of_origin?.applicable ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.status.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textSubtle} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  )}
                </span>
                <div style={{ flex: 1 }}>
                  <strong>Rules of Origin</strong>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                    {gate.rules_of_origin?.rule_text || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Sanctions Check */}
              {gate.sanctions_check && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.sm,
                  borderRadius: borderRadius.sm,
                  backgroundColor: gate.sanctions_check.risk_level === 'block' ? colors.surfaces.dangerBg
                    : gate.sanctions_check.risk_level === 'flag' ? colors.surfaces.warningBg
                    : colors.surface,
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {gate.sanctions_check.risk_level === 'block' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.status.error} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    ) : gate.sanctions_check.risk_level === 'flag' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.status.pending} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.status.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong>OFAC Sanctions Screen</strong>
                    <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                      {gate.sanctions_check.risk_level === 'clear'
                        ? `"${gate.sanctions_check.query_name}" — No match on SDN list`
                        : gate.sanctions_check.risk_level === 'flag'
                        ? `Possible match: ${gate.sanctions_check.matches[0]?.name} [${gate.sanctions_check.matches[0]?.program}] — verify before proceeding`
                        : `BLOCKED: Matches "${gate.sanctions_check.matches[0]?.name}" [${gate.sanctions_check.matches[0]?.program}]`}
                    </div>
                  </div>
                </div>
              )}

              {/* CBAM Scope + Emissions */}
              {gate.cbam_scope?.applies && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.sm,
                  borderRadius: borderRadius.sm, backgroundColor: colors.surfaces.infoBg, border: `1px solid ${colors.accent}44`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <strong>EU CBAM Required — {gate.cbam_scope.sector}</strong>
                      {gate.cbam_scope.emissions_formatted && (
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px',
                          borderRadius: 99, backgroundColor: colors.surfaces.successBg, color: colors.surfaces.successText,
                        }}>
                          {gate.cbam_scope.emissions_formatted}
                        </span>
                      )}
                      {gate.cbam_scope.estimated_levy_eur !== undefined && (
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px',
                          borderRadius: 99, backgroundColor: colors.surfaces.warningBg, color: colors.surfaces.warningText,
                        }}>
                          ≈ €{gate.cbam_scope.estimated_levy_eur.toLocaleString()} CBAM levy
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: colors.surfaces.infoText, marginTop: 2 }}>
                      Submit embedded emissions declaration via EU CBAM portal before customs clearance. Non-compliance: penalty up to 3× carbon price per tCO₂e.
                    </div>
                  </div>
                </div>
              )}

              {/* Checklist Progress */}
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.sm, backgroundColor: colors.surface }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {(gate.checklist_progress?.completion_percentage ?? 0) >= 100 ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.status.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.status.pending} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  )}
                </span>
                <div style={{ flex: 1 }}>
                  <strong>Checklist Completion</strong>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                    {gate.checklist_progress?.completed_items}/{gate.checklist_progress?.total_items} items ({gate.checklist_progress?.completion_percentage}%)
                    {gate.checklist_progress?.critical_pending > 0 && (
                      <span style={{ color: colors.risk.high }}> — {gate.checklist_progress.critical_pending} critical pending</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Blocking Reasons */}
            {gate.blocking_reasons && gate.blocking_reasons.length > 0 && (
              <div style={{ marginTop: spacing.md, padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surfaces.dangerBg, border: `1px solid ${colors.status.error}44` }}>
                <strong style={{ color: colors.surfaces.dangerText }}>Blocking Reasons:</strong>
                <ul style={{ margin: `${spacing.xs} 0 0 ${spacing.md}`, paddingLeft: 0, listStyle: 'disc inside', color: colors.surfaces.dangerText, fontSize: '0.875rem' }}>
                  {gate.blocking_reasons.map((reason: string, i: number) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Shipments</h2>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          + New Shipment
        </Button>
      </div>

      {/* Finance This Order — always visible entry point */}
      <div style={{ marginBottom: spacing.lg }}>
        <button
          onClick={() => setShowFinancePanel(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: spacing.md,
            backgroundColor: showFinancePanel ? colors.accentSurface : colors.surface,
            border: `1px solid ${showFinancePanel ? colors.accent + '55' : colors.border}`,
            borderRadius: showFinancePanel ? `${borderRadius.lg} ${borderRadius.lg} 0 0` : borderRadius.lg,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent, flexShrink: 0 }}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: colors.text }}>Finance This Order</div>
              <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>TReDS eligibility · Bank LC template · ECGC coverage</div>
            </div>
          </div>
          <span style={{ color: colors.textMuted, fontSize: '0.75rem', transform: showFinancePanel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
        </button>

        {showFinancePanel && (
          <div style={{
            padding: spacing.lg, backgroundColor: colors.accentSurface,
            border: `1px solid ${colors.accent}55`, borderTop: 'none',
            borderRadius: `0 0 ${borderRadius.lg} ${borderRadius.lg}`,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md, marginBottom: spacing.lg }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Invoice Value (₹)</label>
                <input type="number" value={financeForm.invoiceValue} onChange={e => setFinanceForm(f => ({ ...f, invoiceValue: e.target.value }))} placeholder="e.g., 500000"
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Buyer Name</label>
                <input type="text" value={financeForm.buyerName} onChange={e => setFinanceForm(f => ({ ...f, buyerName: e.target.value }))} placeholder="e.g., Acme Imports GmbH"
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Invoice / PO Reference</label>
                <input type="text" value={financeForm.invoiceRef} onChange={e => setFinanceForm(f => ({ ...f, invoiceRef: e.target.value }))} placeholder="e.g., INV-2026-001"
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' as const }}>
              {/* TReDS */}
              <div style={{ flex: '1 1 280px', padding: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.lg, border: `1px solid ${colors.border}` }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: spacing.xs }}>TReDS Invoice Discounting</div>
                <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginBottom: spacing.md }}>Discount your export invoice with a bank on the TReDS platform. Get paid before buyer pays.</div>
                {!companyProfile.iec && (
                  <div style={{ fontSize: '0.75rem', color: colors.surfaces.warningText, backgroundColor: colors.surfaces.warningBg, padding: '6px 8px', borderRadius: borderRadius.sm, marginBottom: spacing.sm }}>
                    Add your IEC in Settings → Company Details to check eligibility
                  </div>
                )}
                <button onClick={checkTReDSEligibility} disabled={!financeForm.invoiceValue}
                  style={{ padding: '8px 16px', backgroundColor: colors.accent, color: 'white', border: 'none', borderRadius: borderRadius.md, cursor: financeForm.invoiceValue ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit', opacity: financeForm.invoiceValue ? 1 : 0.5, marginBottom: spacing.sm }}>
                  Check TReDS Eligibility
                </button>
                {tredsEligibility && (
                  <div style={{ padding: '8px 10px', borderRadius: borderRadius.sm, fontSize: '0.8rem', backgroundColor: tredsEligibility.eligible ? colors.surfaces.successBg : colors.surfaces.dangerBg, border: `1px solid ${tredsEligibility.eligible ? colors.status.success : colors.status.error}44`, color: tredsEligibility.eligible ? colors.surfaces.successText : colors.surfaces.dangerText }}>
                    {tredsEligibility.reason}
                    {tredsEligibility.eligible && tredsEligibility.maxAmount > 0 && (
                      <div style={{ fontWeight: 700, marginTop: 4 }}>Max discounting: ₹{tredsEligibility.maxAmount.toLocaleString('en-IN')}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Bank LC */}
              <div style={{ flex: '1 1 280px', padding: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.lg, border: `1px solid ${colors.border}` }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: spacing.xs }}>Bank Letter of Credit</div>
                <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginBottom: spacing.md }}>Generate a pre-filled LC application template for your bank. Includes all required document clauses.</div>
                <button onClick={handleDownloadLCTemplate} disabled={lcDownloading}
                  style={{ padding: '8px 16px', backgroundColor: colors.primary, color: 'white', border: 'none', borderRadius: borderRadius.md, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>
                  {lcDownloading ? 'Opening…' : 'Download LC Template'}
                </button>
                <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: spacing.xs }}>Template opens in a new tab ready to print. Submit to your bank's trade finance desk.</div>
              </div>

              {/* ECGC */}
              <div style={{ flex: '1 1 280px', padding: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.lg, border: `1px solid ${colors.border}` }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: spacing.xs }}>ECGC Export Cover</div>
                <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginBottom: spacing.md }}>Estimate your ECGC MSME Xport insurance premium. Protects up to 90% of invoice if buyer defaults.</div>
                <button onClick={calculateECGCPremium} disabled={!financeForm.invoiceValue}
                  style={{ padding: '8px 16px', backgroundColor: colors.primary, color: 'white', border: 'none', borderRadius: borderRadius.md, cursor: financeForm.invoiceValue ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit', opacity: financeForm.invoiceValue ? 1 : 0.5, marginBottom: spacing.sm }}>
                  Estimate Premium
                </button>
                {ecgcPremium && (
                  <div style={{ padding: '8px 10px', borderRadius: borderRadius.sm, fontSize: '0.8rem', backgroundColor: colors.surfaces.neutralBg, border: `1px solid ${colors.border}`, color: colors.surfaces.neutralText }}>
                    <div>Coverage: <strong>₹{ecgcPremium.coverage.toLocaleString('en-IN')}</strong></div>
                    <div>Est. annual premium: <strong>₹{ecgcPremium.premium.toLocaleString('en-IN')}</strong></div>
                    <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: 4 }}>Based on ECGC MSME Xport rate (0.72%). Actual rate may vary by buyer country.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Shipment Form */}
      {showForm && (
        <div style={formStyle}>
          {hasDraft && (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, fontSize: '0.8rem', color: colors.textMuted }}>
              <span style={{ color: colors.surfaces.successText, fontWeight: 500 }}>Draft saved</span>
              <button
                onClick={discardDraft}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.risk.high, fontSize: '0.8rem', padding: 0, textDecoration: 'underline' }}
              >
                Discard draft
              </button>
            </div>
          )}
          <div
            style={ocrDropZoneStyle}
            onDrop={handleDropOCR}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
          >
            {isProcessingOCR ? (
              <div style={{ color: colors.primary, fontWeight: 600 }}>
                Processing Invoice (OCR)...
              </div>
            ) : (
              <div style={{ color: colors.textMuted }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: spacing.xs }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.textSubtle }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <strong>Drag & Drop Commercial Invoice or Bill of Lading here</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', marginTop: spacing.xs }}>
                  Autofill shipment details with Document AI
                </p>
              </div>
            )}
          </div>
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
                onChange={e => updateFormData(d => ({ ...d, name: e.target.value }))}
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
                onChange={e => updateFormData(d => ({ ...d, product: e.target.value }))}
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
                onChange={e => updateFormData(d => ({ ...d, country: e.target.value }))}
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
                onChange={e => updateFormData(d => ({ ...d, date: e.target.value }))}
              />
            </div>
            <div style={{ ...formFieldStyle, gridColumn: '1 / -1' }}>
              <label style={labelStyle} htmlFor="shipment-description">
                Natural Product Description (Triggers AI Classification)
              </label>
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <input
                  id="shipment-description"
                  type="text"
                  style={{ ...inputStyle, flex: 1 }}
                  value={formData.description}
                  onChange={e => updateFormData(d => ({ ...d, description: e.target.value }))}
                  placeholder='e.g., "Men&apos;s 100% cotton woven long sleeve shirt"'
                />
                <Button
                  variant="secondary"
                  onClick={handleSuggestHSCode}
                  disabled={!formData.description || !formData.country || isClassifying}
                >
                  {isClassifying ? 'Classifying...' : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      Suggest HS Code
                    </span>
                  )}
                </Button>
              </div>
            </div>
            <div style={formFieldStyle}>
              <label style={labelStyle} htmlFor="shipment-hs-code">
                HS Code
              </label>
              <input
                id="shipment-hs-code"
                type="text"
                style={{
                  ...inputStyle,
                  backgroundColor: isClassifying ? `${colors.primary}10` : colors.white,
                  borderColor: isClassifying ? colors.primary : colors.border,
                  transition: 'all 0.3s'
                }}
                value={formData.hsCode}
                onChange={e => updateFormData(d => ({ ...d, hsCode: e.target.value }))}
                placeholder="e.g., 7208.51"
              />
              <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>
                DB + AI classification (hs-lookup)
              </span>
              {/* HS suggestion picker */}
              {hsSuggestions.length > 0 && (
                <div style={{
                  marginTop: spacing.xs, border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.sm, overflow: 'hidden', backgroundColor: colors.white,
                }}>
                  <div style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, backgroundColor: colors.surface }}>
                    {hsSuggestions.length} suggestions — click to select
                  </div>
                  {hsSuggestions.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        updateFormData(prev => ({ ...prev, hsCode: s.hsCode }))
                        setHsSuggestions([])
                      }}
                      style={{
                        padding: '6px 8px', cursor: 'pointer', display: 'flex', gap: spacing.sm,
                        alignItems: 'flex-start', borderTop: i > 0 ? `1px solid ${colors.border}` : 'none',
                        backgroundColor: formData.hsCode === s.hsCode ? `${colors.primary}10` : 'transparent',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${colors.primary}08`)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = formData.hsCode === s.hsCode ? `${colors.primary}10` : 'transparent')}
                    >
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: colors.primary, minWidth: 60, fontSize: '0.85rem' }}>
                        {s.hsCode}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: colors.text, flex: 1 }}>{s.name}</span>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px', borderRadius: 99,
                        backgroundColor: s.confidence === 'high' ? colors.surfaces.successBg : colors.surfaces.warningBg,
                        color: s.confidence === 'high' ? colors.surfaces.successText : colors.surfaces.warningText,
                        whiteSpace: 'nowrap',
                      }}>
                        {s.confidence}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={formFieldStyle}>
              <label style={labelStyle} htmlFor="shipment-value">
                Shipment Value (INR)
              </label>
              <input
                id="shipment-value"
                type="number"
                style={inputStyle}
                value={formData.shipmentValue}
                onChange={e => updateFormData(d => ({ ...d, shipmentValue: e.target.value }))}
                placeholder="e.g., 500000"
              />
            </div>
            <div style={formFieldStyle}>
              <label style={labelStyle} htmlFor="buyer-name">
                Buyer Name
              </label>
              <input
                id="buyer-name"
                type="text"
                style={inputStyle}
                value={formData.buyerName}
                onChange={e => updateFormData(d => ({ ...d, buyerName: e.target.value }))}
                placeholder="e.g., Acme Imports GmbH"
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
        <div style={{ textAlign: 'center', padding: spacing['2xl'], color: colors.textMuted }}>
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
                  <span style={{ fontSize: '1.5rem', display: 'inline-flex', alignItems: 'center' }}>{country?.flag || <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.textSubtle }}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><polygon points="12 22.08 12 12 3 6.92 3 17.08 12 22.08"/><polygon points="12 22.08 21 17.08 21 6.92 12 12 12 22.08"/><polygon points="12 12 21 6.92 12 1.84 3 6.92 12 12"/></svg>}</span>
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
                      {shipment.gateStatus && (
                        <Badge variant={getGateVariant(shipment.gateStatus)} size="sm">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            {shipment.gateStatus}
                          </span>
                        </Badge>
                      )}
                      {/* Sanctions auto-screen badge — shown as soon as shipment is saved */}
                      {shipment.sanctionsRisk && shipment.sanctionsRisk !== 'clear' && (
                        <Badge
                          variant={shipment.sanctionsRisk === 'block' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {shipment.sanctionsRisk === 'block' ? (
                              <>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                SANCTIONS BLOCK
                              </>
                            ) : (
                              <>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                SANCTIONS FLAG
                              </>
                            )}
                          </span>
                        </Badge>
                      )}
                      {/* CBAM badge — shown for EU shipments with covered HS codes */}
                      {shipment.hsCode && isCBAMScope(shipment.hsCode, shipment.country) && (
                        <Badge variant="info" size="sm">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                            CBAM: {getCBAMSector(shipment.hsCode)}
                          </span>
                        </Badge>
                      )}
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
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.xs }}>HS Code</div>
                        <div style={{ fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>{shipment.hsCode || product?.hsPrefix?.join(', ') || 'N/A'}</div>
                      </div>
                    </div>
                    {shipment.shipmentValue && (
                      <div style={{ marginBottom: spacing.md }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.xs }}>Shipment Value</div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>₹{shipment.shipmentValue.toLocaleString('en-IN')}</div>
                      </div>
                    )}

                    {/* ── Landed Cost Panel ── */}
                    {shipment.hsCode && shipment.shipmentValue && (
                      <div style={{ marginBottom: spacing.md, padding: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.md, border: `1px solid ${colors.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent }}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Landed Cost Breakdown</h4>
                          </div>
                          <Button
                            variant="primary"
                            onClick={() => handleCalculateLandedCost(shipment)}
                            disabled={landedCostLoading[shipment.id]}
                          >
                            {landedCostLoading[shipment.id] ? 'Calculating...' : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                                Calculate Landed Cost
                              </span>
                            )}
                          </Button>
                        </div>

                        {landedCosts[shipment.id] && (() => {
                          const lc = landedCosts[shipment.id]
                          const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                          return (
                            <div style={{ display: 'grid', gap: spacing.sm }}>
                              {/* Product Value */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: spacing.sm, backgroundColor: colors.surface, borderRadius: borderRadius.sm }}>
                                <span style={{ fontWeight: 500 }}>Product Value</span>
                                <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(shipment.shipmentValue!)}</span>
                              </div>
                              {/* Duties */}
                              {lc.duties.map((d, i) => (
                                <div key={`d-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: spacing.sm, backgroundColor: colors.surfaces.warningBg, borderRadius: borderRadius.sm }}>
                                  <span>{d.description}</span>
                                  <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(d.amount)}</span>
                                </div>
                              ))}
                              {/* Taxes */}
                              {lc.taxes.map((t, i) => (
                                <div key={`t-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: spacing.sm, backgroundColor: colors.surfaces.infoBg, borderRadius: borderRadius.sm }}>
                                  <span>{t.description}</span>
                                  <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(t.amount)}</span>
                                </div>
                              ))}
                              {/* Fees */}
                              {lc.fees.map((f, i) => (
                                <div key={`f-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: spacing.sm, backgroundColor: colors.surfaces.neutralBg, borderRadius: borderRadius.sm }}>
                                  <span>{f.description}</span>
                                  <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(f.amount)}</span>
                                </div>
                              ))}
                              {/* Grand Total */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.surfaces.successBg, borderRadius: borderRadius.md, border: `1px solid ${colors.status.success}44`, marginTop: spacing.xs }}>
                                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Total Landed Cost</span>
                                <span style={{ fontWeight: 700, fontSize: '1.15rem', fontFamily: "'JetBrains Mono', monospace", color: colors.surfaces.successText }}>{fmt(lc.grand_total)}</span>
                              </div>
                              {/* Zonos Data Attribution */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: spacing.sm,
                                padding: spacing.sm,
                                backgroundColor: colors.surface,
                                borderRadius: borderRadius.sm,
                                border: `1px solid ${colors.border}`,
                                color: colors.textMuted,
                              }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent, flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                <div>
                                  <strong style={{ display: 'block', fontSize: '0.85rem' }}>Powered by Zonos</strong>
                                  <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                                    Duty and tax estimates based on Zonos classification data. Verify final amounts with your freight forwarder before invoicing.
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                    {country?.cbam?.active && (
                      <div style={{ padding: spacing.sm, backgroundColor: `${colors.risk.high}11`, border: `1px solid ${colors.risk.high}33`, borderRadius: borderRadius.md, fontSize: '0.875rem', marginBottom: spacing.sm }}>
                        <strong>CBAM Notice:</strong> This destination has active CBAM requirements. Ensure carbon emissions data is prepared.
                      </div>
                    )}
                    {country?.packaging && country.packaging.length > 0 && (
                      <div style={{ fontSize: '0.875rem', color: colors.textMuted, marginBottom: spacing.sm }}>
                        <strong>Packaging:</strong> {country.packaging.join(' · ')}
                      </div>
                    )}

                    {/* Pre-Shipment Compliance Gate Panel */}
                    {renderGateCheckPanel(shipment)}

                    {/* Bank-Ready Deal Pack */}
                    <div style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.md, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: spacing.xs }}>Bank-Ready Export Deal Pack</div>
                        <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                          One-click PDF — compliance score, checklist, FTA eligibility & CBAM status for lenders
                        </div>
                      </div>
                      <Button variant="primary" onClick={() => handleGenerateDealPack(shipment)}>
                        Download Deal Pack
                      </Button>
                    </div>

                    {/* ICEGATE Customs Filing Panel */}
                    <div style={{ marginTop: spacing.lg, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent }}><path d="M4 22V4c0-.5.2-1 .6-1.4C5 2.2 5.5 2 6 2h12c.5 0 1 .2 1.4.6.4.4.6.9.6 1.4v18"/><path d="M18 22H6"/><path d="M8 6h8"/><path d="M8 10h8"/><path d="M8 14h8"/><path d="M8 18h8"/></svg>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>ICEGATE Export Filing</h4>
                          </div>
                          <p style={{ margin: `${spacing.xs} 0 0`, fontSize: '0.875rem', color: colors.textMuted }}>
                            Generate compliant JSON schema payload for Indian Customs (DGFT / ICEGATE).
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => handleFileToCustoms(shipment)}
                          disabled={filingLoading[shipment.id]}
                          style={{
                            backgroundColor: colors.primary,
                            color: 'white',
                            borderColor: colors.primary,
                          }}
                        >
                          {filingLoading[shipment.id] ? 'Generating Payload...' : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                              Generate Filing Payload
                            </span>
                          )}
                        </Button>
                      </div>

                      {filingResults[shipment.id] && (
                        <div style={{ marginTop: spacing.md, backgroundColor: colors.sidebar, borderRadius: borderRadius.md, padding: spacing.md, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm, color: colors.sidebarText, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                            <span>Status: <strong style={{ color: colors.status.success }}>{filingResults[shipment.id].status.toUpperCase()}</strong></span>
                            <span>Ref: {filingResults[shipment.id].reference_number}</span>
                          </div>
                          <pre style={{
                            margin: 0,
                            padding: spacing.sm,
                            backgroundColor: colors.primary,
                            borderRadius: borderRadius.sm,
                            color: colors.accent,
                            fontSize: '0.8rem',
                            maxHeight: '200px',
                            overflowY: 'auto',
                          }}>
                            {JSON.stringify(filingResults[shipment.id].payload_generated, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* TReDS Financing Panel (Conditional on ICEGATE Success) */}
                    {filingResults[shipment.id] && (filingResults[shipment.id].status === 'submitted' || filingResults[shipment.id].status === 'payload_ready') && (
                      <div style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surfaces.successBg, borderRadius: borderRadius.md, border: `1px solid ${colors.status.success}44` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: colors.surfaces.successText }}>Prepare TReDS Financing Request</h4>
                            <p style={{ margin: `${spacing.xs} 0 0`, fontSize: '0.875rem', color: colors.surfaces.successText }}>
                              Your shipment is verified by Customs. Generate a TReDS request payload to submit via your bank's RXIL or Invoicemart portal.
                            </p>
                          </div>
                          {!tredsResults[shipment.id] ? (
                            <Button
                              variant="primary"
                              onClick={() => handleSubmitTReDS(shipment)}
                              disabled={tredsLoading[shipment.id]}
                              style={{ backgroundColor: colors.status.success, borderColor: colors.status.success }}
                            >
                              {tredsLoading[shipment.id] ? 'Preparing...' : 'Generate TReDS Request'}
                            </Button>
                          ) : (
                            <div style={{ textAlign: 'right' }}>
                              <Badge key="treds-badge-success" variant="info">Request Recorded</Badge>
                              <div style={{ fontSize: '0.75rem', color: colors.surfaces.successText, marginTop: spacing.xs }}>
                                Ref: {tredsResults[shipment.id].reference_id} · Advisor will contact you
                              </div>
                            </div>
                          )}
                        </div>
                        {tredsResults[shipment.id] && (
                          <div style={{ marginTop: spacing.sm, padding: spacing.sm, backgroundColor: colors.white, borderRadius: borderRadius.sm, border: `1px solid ${colors.status.success}33`, fontSize: '0.875rem', color: colors.surfaces.successText }}>
                            {tredsResults[shipment.id].message}
                          </div>
                        )}
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
