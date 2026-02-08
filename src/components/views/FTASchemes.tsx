// ============================================================================
// FTA & Schemes View - Trade agreements and Indian export schemes
// ============================================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { colors, spacing, borderRadius } from '@theme/index'
import { FTA_DATABASE } from '@/data/fta'
import { INDIAN_EXPORT_SCHEMES } from '@/data/indian-schemes'
import { REGULATORY_DB } from '@/data/regulatory-db'
import type { CountryCode } from '@/types'

export interface FTASchemesProps {
  selectedCountries: CountryCode[]
}

export function FTASchemes({ selectedCountries }: FTASchemesProps) {
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

  const sectionStyle: React.CSSProperties = {
    marginBottom: spacing.xl,
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: spacing.md,
    color: colors.text,
  }

  const ftaListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  }

  const ftaCardStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
  }

  const flagStyle: React.CSSProperties = {
    fontSize: '2rem',
  }

  const ftaContentStyle: React.CSSProperties = {
    flex: 1,
  }

  const ftaNameStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: spacing.xs,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  }

  const ftaNotesStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: colors.textMuted,
    marginTop: spacing.xs,
  }

  const schemeGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing.md,
  }

  const schemeCardStyle: React.CSSProperties = {
    padding: spacing.md,
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
  }

  const schemeNameStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: spacing.xs,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  }

  const schemeDescStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: colors.textMuted,
  }

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: spacing['2xl'],
    color: colors.textMuted,
  }

  const getStatusVariant = (status: string) => {
    if (status === 'Active') return 'success' as const
    if (status === 'Under Negotiation') return 'warning' as const
    return 'default' as const
  }

  if (selectedCountries.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>FTA & Schemes</h2>
        </div>
        <div style={emptyStyle}>
          <p>Select destination markets to see applicable trade agreements</p>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>FTA & Schemes</h2>
      </div>

      {/* Free Trade Agreements Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Free Trade Agreements</h3>
        <div style={ftaListStyle}>
          {selectedCountries.map(countryCode => {
            const fta = FTA_DATABASE[countryCode]
            const country = REGULATORY_DB[countryCode]
            if (!fta) return null

            return (
              <div key={countryCode} style={ftaCardStyle}>
                <span style={flagStyle}>{country?.flag}</span>
                <div style={ftaContentStyle}>
                  <div style={ftaNameStyle}>
                    {fta.name}
                    <Badge variant={getStatusVariant(fta.status)} size="sm">
                      {fta.status}
                    </Badge>
                    {fta.preferentialTariff && (
                      <Badge variant="success" size="sm">
                        Preferential Tariff
                      </Badge>
                    )}
                  </div>
                  {fta.effectiveDate && (
                    <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                      Effective: {fta.effectiveDate}
                    </div>
                  )}
                  <div style={ftaNotesStyle}>{fta.notes}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Indian Export Schemes Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Indian Export Schemes</h3>
        <div style={schemeGridStyle}>
          {INDIAN_EXPORT_SCHEMES.map(scheme => (
            <div key={scheme.name} style={schemeCardStyle}>
              <div style={schemeNameStyle}>
                {scheme.name}
                <Badge variant={scheme.status === 'Active' ? 'success' : 'warning'} size="sm">
                  {scheme.status}
                </Badge>
              </div>
              <div style={schemeDescStyle}>{scheme.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
