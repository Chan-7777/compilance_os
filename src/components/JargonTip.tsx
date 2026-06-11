// ============================================================================
// JargonTip — Inline acronym/jargon tooltip
// Usage: <JargonTip term="CBAM" definition="A fee the EU charges on imports based on carbon emissions" />
// ============================================================================

import { useState } from 'react'
import { colors } from '@theme/index'

interface JargonTipProps {
  term: string
  definition: string
  children?: React.ReactNode
}

export function JargonTip({ term, definition, children }: JargonTipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="jargon-tip"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
    >
      <span
        className="jargon-tip__trigger"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        tabIndex={0}
        role="definition"
        aria-label={`${term}: ${definition}`}
        style={{
          borderBottom: `1px dashed ${colors.textSubtle}`,
          cursor: 'help',
          fontWeight: 500,
        }}
      >
        {children ?? term}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: colors.border,
          color: colors.textMuted,
          fontSize: '0.6rem',
          fontWeight: 700,
          cursor: 'help',
          flexShrink: 0,
        }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        aria-hidden="true"
      >
        ?
      </span>
      {visible && (
        <span
          className="jargon-tip__popup"
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: colors.sidebar,
            color: colors.white,
            fontSize: '0.72rem',
            fontWeight: 400,
            lineHeight: 1.4,
            padding: '6px 10px',
            borderRadius: 6,
            maxWidth: 220,
            whiteSpace: 'normal',
            textAlign: 'center',
            zIndex: 1000,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgb(0 0 0 / 0.2)',
          }}
        >
          {definition}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              border: '5px solid transparent',
              borderTopColor: colors.sidebar,
              display: 'block',
            }}
          />
        </span>
      )}
    </span>
  )
}

// ============================================================================
// Pre-defined jargon dictionary for ComplianceOS
// ============================================================================

export const JARGON: Record<string, string> = {
  CBAM: 'Carbon Border Adjustment Mechanism — a fee the EU charges on carbon-heavy imports',
  FTA: 'Free Trade Agreement — a deal between countries to reduce import taxes',
  'HS Code': 'Harmonized System Code — a global product classification number used by customs',
  'HS code': 'Harmonized System Code — a global product classification number used by customs',
  RoO: 'Rules of Origin — rules that determine which country a product is considered "from"',
  MFN: 'Most Favoured Nation — the standard import tax rate before any trade deal discounts',
  REACH: 'EU regulation ensuring chemicals used in products are safe for people and environment',
  RoHS: 'Restriction of Hazardous Substances — EU rules limiting dangerous chemicals in electronics',
  WEEE: 'Waste Electrical and Electronic Equipment — EU recycling rules for electronics',
  UFLPA: 'US law that bans imports made with forced labour from certain regions',
  EUDR: 'EU Deforestation Regulation — bans imports linked to deforestation',
  CSDDD: 'EU law requiring companies to check their supply chain for human rights violations',
  EPR: 'Extended Producer Responsibility — requires companies to fund recycling of their packaging',
  FSSAI: 'Food Safety and Standards Authority of India — the food safety regulator in India',
  HACCP: 'Food safety system that identifies and controls biological, chemical, and physical hazards',
  MSME: 'Micro, Small and Medium Enterprises — classification for small businesses in India',
  IEC: 'Importer Exporter Code — mandatory registration number for trading internationally from India',
  DGFT: 'Directorate General of Foreign Trade — India\'s trade policy authority',
  WCO: 'World Customs Organization — the international body that sets customs standards',
  'tCO2e': 'Tonnes of CO₂ equivalent — the standard unit for measuring carbon emissions',
  'CO2e': 'CO₂ equivalent — a measure combining all greenhouse gases into one carbon number',
  'Scope 3': 'Indirect emissions from your supply chain and product use — required for EU reporting',
  CSRD: 'EU Corporate Sustainability Reporting Directive — requires large companies to report on sustainability',
  IATF: 'International Automotive Task Force — quality standard for automotive suppliers',
  GMP: 'Good Manufacturing Practice — quality standards for pharmaceutical and food production',
}

export function J({ term, children }: { term: string; children?: React.ReactNode }) {
  const definition = JARGON[term]
  if (!definition) return <>{children ?? term}</>
  return <JargonTip term={term} definition={definition}>{children ?? term}</JargonTip>
}
