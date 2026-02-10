// ============================================================================
// RiskScoreLegend - Explains how risk scores are calculated
// ============================================================================

import { useState } from 'react'
import { colors, spacing, borderRadius } from '@theme/index'

export function RiskScoreLegend() {
    const [isExpanded, setIsExpanded] = useState(false)

    const containerStyle: React.CSSProperties = {
        marginTop: spacing.lg,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border}`,
    }

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        userSelect: 'none',
    }

    const titleStyle: React.CSSProperties = {
        fontSize: '0.875rem',
        fontWeight: 600,
        color: colors.text,
    }

    const toggleIconStyle: React.CSSProperties = {
        fontSize: '0.75rem',
        color: colors.textMuted,
        transition: 'transform 0.2s',
        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
    }

    const contentStyle: React.CSSProperties = {
        marginTop: spacing.md,
        fontSize: '0.875rem',
        color: colors.text,
        lineHeight: 1.6,
    }

    const legendStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.md,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    }

    const legendItemStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        fontSize: '0.8125rem',
    }

    const dotStyle = (color: string): React.CSSProperties => ({
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: color,
    })

    return (
        <div style={containerStyle}>
            <div
                style={headerStyle}
                onClick={() => setIsExpanded(!isExpanded)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        setIsExpanded(!isExpanded)
                    }
                }}
                aria-expanded={isExpanded}
            >
                <span style={titleStyle}>💡 How is the risk score calculated?</span>
                <span style={toggleIconStyle}>▼</span>
            </div>

            {isExpanded && (
                <div style={contentStyle}>
                    <p style={{ margin: `${spacing.sm} 0` }}>
                        Risk scores (0-100) are calculated based on multiple compliance factors for each market:
                    </p>

                    <div style={legendStyle}>
                        <div style={legendItemStyle}>
                            <div style={dotStyle(colors.risk.low)} />
                            <span><strong>0-30</strong> Low Risk</span>
                        </div>
                        <div style={legendItemStyle}>
                            <div style={dotStyle(colors.risk.medium)} />
                            <span><strong>31-60</strong> Medium Risk</span>
                        </div>
                        <div style={legendItemStyle}>
                            <div style={dotStyle(colors.risk.high)} />
                            <span><strong>61-100</strong> High Risk</span>
                        </div>
                    </div>

                    <p style={{ margin: `${spacing.sm} 0`, fontSize: '0.8125rem' }}>
                        <strong>Factors considered:</strong>
                    </p>
                    <ul style={{ margin: `${spacing.xs} 0`, paddingLeft: spacing.lg, fontSize: '0.8125rem' }}>
                        <li><strong>CBAM compliance</strong> - Carbon reporting requirements (+15-25 points)</li>
                        <li><strong>ESG regulations</strong> - Environmental and social standards (+10-20 points)</li>
                        <li><strong>Product standards</strong> - CE marking, certifications (+10-15 points)</li>
                        <li><strong>Packaging rules</strong> - EPR, labeling requirements (+5-10 points)</li>
                        <li><strong>Documentation</strong> - Complexity of required paperwork (+5-15 points)</li>
                        <li><strong>FTA benefits</strong> - Active trade agreements (-10 to -20 points)</li>
                    </ul>

                    <p style={{ margin: `${spacing.sm} 0 0 0`, fontSize: '0.75rem', color: colors.textMuted }}>
                        Higher scores indicate more complex compliance requirements. Use this as a guide to prioritize resources and plan ahead for high-risk markets.
                    </p>
                </div>
            )}
        </div>
    )
}
