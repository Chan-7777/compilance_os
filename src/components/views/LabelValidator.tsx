// ============================================================================
// Label Validator View - Interactive label compliance checking
// ============================================================================

import { useState, useMemo } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { colors, spacing, borderRadius, transition } from '@/theme/index'
import { REGULATORY_DB } from '@/data/regulatory-db'
import { PRODUCT_CATEGORIES } from '@/data/products'
import { getLabelRulesForProduct, getLabelRuleCategories } from '@/data/label-rules'
import { validateLabel, groupResultsByCategory } from '@/utils/label-validator'
import { analyzeLabelVision } from '@/lib/api'
import type { CountryCode } from '@/types'

export interface LabelValidatorProps {
    selectedProduct: string
    selectedCountries: CountryCode[]
    shipments?: { id: string; name: string; country: string }[]
}

export function LabelValidator({ selectedProduct, selectedCountries, shipments }: LabelValidatorProps) {
    const [activeCountry, setActiveCountry] = useState<CountryCode>(selectedCountries[0] || 'EU')
    const [activeProduct, setActiveProduct] = useState(selectedProduct || 'food')
    const [answers, setAnswers] = useState<Record<string, boolean>>({})
    const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({})
    const [uploadedImage, setUploadedImage] = useState<string | null>(null)
    const [isDragOver, setIsDragOver] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [linkedShipmentId, setLinkedShipmentId] = useState<string | null>(null)
    const [savedToShipment, setSavedToShipment] = useState(false)

    // Get applicable rules
    const rules = useMemo(
        () => getLabelRulesForProduct(activeCountry, activeProduct),
        [activeCountry, activeProduct]
    )

    const categories = useMemo(
        () => getLabelRuleCategories(activeCountry, activeProduct),
        [activeCountry, activeProduct]
    )

    // Run validation
    const result = useMemo(
        () => validateLabel(activeProduct, activeCountry, answers),
        [activeProduct, activeCountry, answers]
    )

    const groupedResults = useMemo(
        () => groupResultsByCategory(result.results),
        [result.results]
    )

    const handleToggleAnswer = (ruleId: string) => {
        setAnswers(prev => ({
            ...prev,
            [ruleId]: !prev[ruleId],
        }))
    }

    const handleToggleExpand = (ruleId: string) => {
        setExpandedRules(prev => ({
            ...prev,
            [ruleId]: !prev[ruleId],
        }))
    }

    const handleResetAll = () => {
        setAnswers({})
        setExpandedRules({})
    }

    const handleMarkAllCompliant = () => {
        const allAnswers: Record<string, boolean> = {}
        rules.forEach(r => { allAnswers[r.id] = true })
        setAnswers(allAnswers)
    }

    const handleCountryChange = (country: CountryCode) => {
        setActiveCountry(country)
        setAnswers({})
        setExpandedRules({})
    }

    const handleProductChange = (product: string) => {
        setActiveProduct(product)
        setAnswers({})
        setExpandedRules({})
    }

    // AI Vision Handlers
    const handleFileUpload = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG).')
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setUploadedImage(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleScanLabel = async () => {
        if (!uploadedImage) return

        setIsScanning(true)
        try {
            // Prepare rules payload
            const simplifiedRules = rules.map(r => ({ id: r.id, rule: r.rule, guidance: r.guidance }))

            const result = await analyzeLabelVision(
                uploadedImage,
                simplifiedRules,
                activeCountry,
                activeProduct
            )

            // Apply AI answers
            setAnswers(result.answers)

            // Auto-expand failed rules
            const newExpanded: Record<string, boolean> = { ...expandedRules }
            Object.entries(result.answers).forEach(([id, compliant]) => {
                if (!compliant) newExpanded[id] = true
            })
            setExpandedRules(newExpanded)

            if (result.mock) {
                console.warn('Vision API returned mock data because no API key was configured.')
            }
        } catch (error) {
            console.error('Scan failed:', error)
            alert('Failed to scan label with AI. Please try answering manually.')
        } finally {
            setIsScanning(false)
        }
    }

    // Score display helpers
    const scoreColor = result.score >= 80
        ? colors.risk.low
        : result.score >= 50
            ? colors.risk.medium
            : colors.risk.high

    const statusLabel = result.overallStatus === 'compliant'
        ? '✅ Compliant'
        : result.overallStatus === 'partially_compliant'
            ? '⚠️ Partially Compliant'
            : '❌ Non-Compliant'

    const statusColor = result.overallStatus === 'compliant'
        ? colors.risk.low
        : result.overallStatus === 'partially_compliant'
            ? colors.risk.medium
            : colors.risk.high

    const countryData = REGULATORY_DB[activeCountry]

    return (
        <div style={{ padding: spacing.lg }}>
            {/* Header */}
            <div style={{ marginBottom: spacing.xl }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: colors.text }}>
                    🏷️ Label Validator
                </h2>
                <p style={{ color: colors.textMuted, margin: `${spacing.xs} 0 0`, fontSize: '0.875rem' }}>
                    Check if your product label meets destination country requirements
                </p>
            </div>

            {/* Selectors Row */}
            <div style={{
                display: 'flex',
                gap: spacing.md,
                marginBottom: spacing.lg,
                flexWrap: 'wrap',
            }}>
                {/* Product Selector */}
                <div style={{ flex: '1 1 250px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: colors.textMuted,
                        marginBottom: spacing.xs,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        Product Category
                    </label>
                    <select
                        value={activeProduct}
                        onChange={e => handleProductChange(e.target.value)}
                        style={{
                            width: '100%',
                            padding: `${spacing.sm} ${spacing.md}`,
                            borderRadius: borderRadius.md,
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.white,
                            fontSize: '0.875rem',
                            color: colors.text,
                            cursor: 'pointer',
                        }}
                    >
                        {PRODUCT_CATEGORIES.map(p => (
                            <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                        ))}
                    </select>
                </div>

                {/* Country Selector */}
                <div style={{ flex: '1 1 250px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: colors.textMuted,
                        marginBottom: spacing.xs,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        Destination Country
                    </label>
                    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                        {(Object.keys(REGULATORY_DB) as CountryCode[]).map(code => (
                            <button
                                key={code}
                                onClick={() => handleCountryChange(code)}
                                style={{
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    borderRadius: borderRadius.md,
                                    border: `1px solid ${activeCountry === code ? colors.orange : colors.border}`,
                                    backgroundColor: activeCountry === code ? `${colors.orange}15` : colors.white,
                                    color: activeCountry === code ? colors.orange : colors.text,
                                    fontWeight: activeCountry === code ? 600 : 400,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: `all ${transition.fast}`,
                                }}
                            >
                                {REGULATORY_DB[code].flag} {code}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Upload Area */}
            <div style={{ marginBottom: spacing.xl }}>
                <div
                    style={{
                        padding: spacing.xl,
                        border: `2px dashed ${isDragOver ? colors.primary : colors.border}`,
                        borderRadius: borderRadius.lg,
                        backgroundColor: isDragOver ? `${colors.primary}08` : colors.surface,
                        textAlign: 'center',
                        transition: `all ${transition.normal}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: spacing.md,
                    }}
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={e => {
                        e.preventDefault()
                        setIsDragOver(false)
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileUpload(e.dataTransfer.files[0])
                        }
                    }}
                >
                    {uploadedImage ? (
                        <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
                            <img
                                src={uploadedImage}
                                alt="Uploaded label"
                                style={{ width: '100%', borderRadius: borderRadius.md, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <button
                                onClick={() => setUploadedImage(null)}
                                style={{
                                    position: 'absolute',
                                    top: -10,
                                    right: -10,
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    backgroundColor: colors.white,
                                    border: `1px solid ${colors.border}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{ fontSize: '3rem', color: colors.textMuted }}>📸</div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: colors.text }}>Upload Label Artwork</h3>
                                <p style={{ margin: `${spacing.xs} 0 0`, color: colors.textMuted, fontSize: '0.875rem' }}>
                                    Drag and drop a label image here, or upload from your computer to automatically verify compliance using AI.
                                </p>
                            </div>
                            <label style={{ cursor: 'pointer' }}>
                                <input
                                    type="file"
                                    accept="image/jpeg, image/png, image/webp"
                                    style={{ display: 'none' }}
                                    onChange={e => e.target.files && handleFileUpload(e.target.files[0])}
                                />
                                <div style={{
                                    padding: `${spacing.sm} ${spacing.xl}`,
                                    backgroundColor: colors.white,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: borderRadius.md,
                                    fontWeight: 600,
                                    color: colors.text,
                                    transition: `all ${transition.fast}`,
                                }}>
                                    Browse Files
                                </div>
                            </label>
                        </>
                    )}

                    {uploadedImage && (
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleScanLabel}
                            disabled={isScanning}
                            style={{ marginTop: spacing.md, width: '100%', maxWidth: 400 }}
                        >
                            {isScanning ? '✨ Scanning with AI...' : '✨ Verify with AI Vision'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Score Card */}
            <div style={{
                display: 'flex',
                gap: spacing.lg,
                marginBottom: spacing.lg,
                flexWrap: 'wrap',
            }}>
                {/* Main Score */}
                <div style={{
                    flex: '1 1 280px',
                    padding: spacing.lg,
                    backgroundColor: colors.surface,
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.sm, letterSpacing: '0.05em', fontWeight: 600 }}>
                        Label Compliance Score
                    </div>
                    <div style={{
                        fontSize: '3.5rem',
                        fontWeight: 800,
                        color: scoreColor,
                        lineHeight: 1,
                        marginBottom: spacing.sm,
                    }}>
                        {result.score}%
                    </div>
                    <div style={{
                        display: 'inline-block',
                        padding: `${spacing.xs} ${spacing.md}`,
                        borderRadius: borderRadius.full,
                        backgroundColor: `${statusColor}18`,
                        color: statusColor,
                        fontWeight: 600,
                        fontSize: '0.85rem',
                    }}>
                        {statusLabel}
                    </div>
                    <div style={{ marginTop: spacing.md, fontSize: '0.8rem', color: colors.textMuted }}>
                        {countryData?.flag} {countryData?.name} — {PRODUCT_CATEGORIES.find(p => p.id === activeProduct)?.label}
                    </div>
                </div>

                {/* Stats */}
                <div style={{
                    flex: '1 1 280px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: spacing.sm,
                }}>
                    <div style={statCardStyle}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.risk.low }}>{result.passedRules}</div>
                        <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>Passed</div>
                    </div>
                    <div style={statCardStyle}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.risk.high }}>{result.failedRules}</div>
                        <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>Failed / Unanswered</div>
                    </div>
                    <div style={statCardStyle}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text }}>{result.totalRules}</div>
                        <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>Total Rules</div>
                    </div>
                    <div style={statCardStyle}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.textMuted }}>{result.skippedRules}</div>
                        <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>Not Applicable</div>
                    </div>
                </div>
            </div>

            {/* Link to Shipment */}
            {shipments && shipments.length > 0 && (
              <div style={{ marginBottom: spacing.lg, padding: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.md, border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: spacing.sm }}>
                  Link to Shipment
                </div>
                <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
                  <select
                    value={linkedShipmentId ?? ''}
                    onChange={e => { setLinkedShipmentId(e.target.value || null); setSavedToShipment(false) }}
                    style={{
                      flex: 1,
                      padding: `${spacing.xs} ${spacing.sm}`,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.white,
                      fontSize: '0.875rem',
                      color: colors.text,
                    }}
                  >
                    <option value="">— Select shipment —</option>
                    {shipments.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!linkedShipmentId || savedToShipment}
                    onClick={() => {
                      if (!linkedShipmentId) return
                      // Save label score to localStorage keyed by shipment id
                      const key = `label_validation_${linkedShipmentId}`
                      localStorage.setItem(key, JSON.stringify({
                        score: result.score,
                        status: result.overallStatus,
                        country: activeCountry,
                        product: activeProduct,
                        savedAt: new Date().toISOString(),
                        failedRules: result.failedRules,
                        totalRules: result.totalRules,
                      }))
                      setSavedToShipment(true)
                    }}
                  >
                    {savedToShipment ? '✓ Saved' : 'Save Score'}
                  </Button>
                </div>
                {savedToShipment && (
                  <div style={{ fontSize: '0.75rem', color: colors.risk.low, marginTop: spacing.xs }}>
                    Label compliance score saved to shipment record.
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.lg }}>
                <Button variant="secondary" size="sm" onClick={handleMarkAllCompliant}>
                    ✓ Mark All Compliant
                </Button>
                <Button variant="ghost" size="sm" onClick={handleResetAll}>
                    ↺ Reset All
                </Button>
            </div>

            {/* Progress Bar */}
            <div style={{
                height: 6,
                backgroundColor: colors.border,
                borderRadius: borderRadius.full,
                overflow: 'hidden',
                marginBottom: spacing.xl,
            }}>
                <div style={{
                    height: '100%',
                    width: `${result.score}%`,
                    backgroundColor: scoreColor,
                    transition: 'width 0.4s ease, background-color 0.4s ease',
                    borderRadius: borderRadius.full,
                }} />
            </div>

            {/* Rules by Category */}
            {categories.map(category => {
                const categoryResults = groupedResults[category] || []
                const catPassed = categoryResults.filter(r => r.status === 'pass').length
                const catTotal = categoryResults.filter(r => r.status !== 'skipped').length

                return (
                    <div key={category} style={{ marginBottom: spacing.lg }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: spacing.sm,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                                <span style={{ fontWeight: 600, fontSize: '1rem', color: colors.text }}>
                                    {getCategoryIcon(category)} {category}
                                </span>
                                <Badge
                                    variant={catPassed === catTotal ? 'success' : catPassed > 0 ? 'warning' : 'default'}
                                    size="sm"
                                >
                                    {catPassed}/{catTotal}
                                </Badge>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                            {categoryResults.map(({ rule }) => {
                                const isCompliant = answers[rule.id] === true
                                const isAnswered = answers[rule.id] !== undefined
                                const isExpanded = expandedRules[rule.id]

                                return (
                                    <div
                                        key={rule.id}
                                        style={{
                                            border: `1px solid ${isCompliant ? colors.risk.low : isAnswered ? colors.risk.high : colors.border}`,
                                            borderRadius: borderRadius.md,
                                            backgroundColor: isCompliant
                                                ? `${colors.risk.low}08`
                                                : isAnswered
                                                    ? `${colors.risk.high}08`
                                                    : colors.white,
                                            transition: `all ${transition.fast}`,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: spacing.sm,
                                                padding: spacing.md,
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => handleToggleAnswer(rule.id)}
                                        >
                                            {/* Toggle Switch */}
                                            <div style={{
                                                width: 40,
                                                height: 22,
                                                borderRadius: 11,
                                                backgroundColor: isCompliant ? colors.risk.low : '#ddd',
                                                position: 'relative',
                                                cursor: 'pointer',
                                                transition: `background-color ${transition.fast}`,
                                                flexShrink: 0,
                                            }}>
                                                <div style={{
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: '50%',
                                                    backgroundColor: colors.white,
                                                    position: 'absolute',
                                                    top: 2,
                                                    left: isCompliant ? 20 : 2,
                                                    transition: `left ${transition.fast}`,
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                }} />
                                            </div>

                                            {/* Rule Text */}
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    color: colors.text,
                                                    fontWeight: 500,
                                                }}>
                                                    {rule.rule}
                                                </div>
                                            </div>

                                            {/* Severity Badge */}
                                            <Badge
                                                variant={rule.severity === 'mandatory' ? 'danger' : 'default'}
                                                size="sm"
                                            >
                                                {rule.severity}
                                            </Badge>

                                            {/* Expand button */}
                                            <button
                                                onClick={e => { e.stopPropagation(); handleToggleExpand(rule.id) }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: colors.textMuted,
                                                    fontSize: '0.85rem',
                                                    padding: spacing.xs,
                                                    borderRadius: borderRadius.sm,
                                                    transition: `background-color ${transition.fast}`,
                                                }}
                                                title="Show details"
                                            >
                                                {isExpanded ? '▲' : '▼'}
                                            </button>
                                        </div>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <div style={{
                                                padding: `0 ${spacing.md} ${spacing.md}`,
                                                paddingLeft: `calc(${spacing.md} + 52px)`,
                                                fontSize: '0.8rem',
                                                borderTop: `1px solid ${colors.border}`,
                                                paddingTop: spacing.sm,
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, color: colors.textMuted }}>📖 Regulation: </span>
                                                        <span style={{ color: colors.text }}>{rule.reference}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontWeight: 600, color: colors.textMuted }}>💡 Guidance: </span>
                                                        <span style={{ color: colors.text }}>{rule.guidance}</span>
                                                    </div>
                                                    {!isCompliant && isAnswered && (
                                                        <div style={{
                                                            marginTop: spacing.xs,
                                                            padding: spacing.sm,
                                                            backgroundColor: `${colors.risk.high}10`,
                                                            borderRadius: borderRadius.sm,
                                                            border: `1px solid ${colors.risk.high}30`,
                                                            color: colors.risk.high,
                                                            fontWeight: 500,
                                                        }}>
                                                            ⚠️ Action Required: This is a {rule.severity} requirement. Please review and address before shipping.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}

            {/* Summary Footer */}
            {result.failedRules > 0 && Object.keys(answers).length > 0 && (
                <div style={{
                    marginTop: spacing.xl,
                    padding: spacing.lg,
                    backgroundColor: `${colors.risk.high}08`,
                    border: `1px solid ${colors.risk.high}30`,
                    borderRadius: borderRadius.lg,
                }}>
                    <h3 style={{ margin: 0, marginBottom: spacing.sm, color: colors.risk.high, fontSize: '1rem' }}>
                        ⚠️ {result.failedRules} Issue{result.failedRules > 1 ? 's' : ''} Found
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: colors.text }}>
                        {result.results
                            .filter(r => r.status === 'fail' && answers[r.rule.id] === false)
                            .map(r => (
                                <li key={r.rule.id} style={{ marginBottom: spacing.xs }}>
                                    <strong>{r.rule.category}:</strong> {r.rule.rule}
                                    {r.rule.severity === 'mandatory' && (
                                        <span style={{ marginLeft: spacing.xs }}>
                                            <Badge variant="danger" size="sm">mandatory</Badge>
                                        </span>
                                    )}
                                </li>
                            ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

// Stat card helper style
const statCardStyle: React.CSSProperties = {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
    textAlign: 'center',
}

function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
        'Language': '🌐',
        'Nutrition': '🥗',
        'Safety': '🛡️',
        'Origin': '📍',
        'Product-Specific': '🏭',
        'Religious': '☪️',
        'Environmental': '♻️',
        'Identification': '🔖',
    }
    return icons[category] || '📋'
}
