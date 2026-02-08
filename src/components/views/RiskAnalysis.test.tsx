import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RiskAnalysis } from './RiskAnalysis'
import type { RiskResult, CountryCode } from '@/types'

describe('RiskAnalysis', () => {
  const mockRiskResults: Array<RiskResult & { country: CountryCode }> = [
    {
      country: 'EU',
      score: 72,
      level: 'high',
      factors: [
        { category: 'CBAM', severity: 'high', detail: 'Product falls under EU CBAM scope' },
        { category: 'ESG', severity: 'high', detail: 'Scope 3 emissions reporting required' },
        { category: 'Certifications', severity: 'medium', detail: '6 certifications required' },
      ],
      recommendations: [
        'Implement carbon emissions tracking',
        'Register with CBAM declarant',
      ],
    },
    {
      country: 'UAE',
      score: 28,
      level: 'low',
      factors: [
        { category: 'Trade Agreement', severity: 'positive', detail: 'India-UAE CEPA active' },
        { category: 'Certifications', severity: 'low', detail: '3 certifications required' },
      ],
      recommendations: ['File Certificate of Origin for preferential tariff'],
    },
  ]

  const defaultProps = {
    selectedProduct: 'steel',
    riskResults: mockRiskResults,
  }

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<RiskAnalysis {...defaultProps} />)
      expect(screen.getByText(/risk analysis/i)).toBeInTheDocument()
    })

    it('displays product name', () => {
      render(<RiskAnalysis {...defaultProps} />)
      expect(screen.getByText(/steel/i)).toBeInTheDocument()
    })
  })

  describe('Country Risk Cards', () => {
    it('renders a card for each country', () => {
      render(<RiskAnalysis {...defaultProps} />)
      expect(screen.getByText(/european union/i)).toBeInTheDocument()
      expect(screen.getByText(/united arab emirates/i)).toBeInTheDocument()
    })

    it('displays risk scores for each country', () => {
      render(<RiskAnalysis {...defaultProps} />)
      expect(screen.getByText('72')).toBeInTheDocument()
      expect(screen.getByText('28')).toBeInTheDocument()
    })

    it('displays risk levels', () => {
      render(<RiskAnalysis {...defaultProps} />)
      expect(screen.getAllByText(/high/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/low/i).length).toBeGreaterThan(0)
    })
  })

  describe('Risk Factors', () => {
    it('displays risk factors for each country', () => {
      render(<RiskAnalysis {...defaultProps} />)
      expect(screen.getAllByText(/CBAM/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Scope 3/i).length).toBeGreaterThan(0)
    })

    it('shows factor severity badges', () => {
      render(<RiskAnalysis {...defaultProps} />)
      const highBadges = screen.getAllByText(/high/i)
      expect(highBadges.length).toBeGreaterThan(0)
    })

    it('shows positive factors', () => {
      render(<RiskAnalysis {...defaultProps} />)
      expect(screen.getByText(/CEPA active/i)).toBeInTheDocument()
    })
  })

  describe('Recommendations', () => {
    it('displays recommendations section', () => {
      render(<RiskAnalysis {...defaultProps} />)
      expect(screen.getAllByText(/recommendations/i).length).toBeGreaterThan(0)
    })

    it('shows recommendation items', () => {
      render(<RiskAnalysis {...defaultProps} />)
      expect(screen.getByText(/carbon emissions tracking/i)).toBeInTheDocument()
      expect(screen.getByText(/certificate of origin/i)).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows message when no risk results', () => {
      render(<RiskAnalysis selectedProduct="steel" riskResults={[]} />)
      expect(screen.getByText(/no markets selected/i)).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('sorts countries by risk score (highest first)', () => {
      render(<RiskAnalysis {...defaultProps} />)
      const scores = screen.getAllByTestId('risk-score')
      expect(scores[0]).toHaveTextContent('72')
      expect(scores[1]).toHaveTextContent('28')
    })
  })
})
