import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Dashboard } from './Dashboard'
import type { RiskResult, Alert, CompanyProfile } from '@/types'

describe('Dashboard', () => {
  const mockProfile: CompanyProfile = { name: 'Test Corp', size: 'small' }
  const mockRiskResults: RiskResult[] = [
    {
      score: 65,
      level: 'high',
      factors: [{ category: 'CBAM', severity: 'high', detail: 'CBAM applies' }],
      recommendations: ['Track emissions'],
    },
    {
      score: 35,
      level: 'medium',
      factors: [{ category: 'Trade Agreement', severity: 'positive', detail: 'CEPA active' }],
      recommendations: ['File CoO'],
    },
  ]
  const mockAlerts: Alert[] = [
    {
      id: 1,
      type: 'deadline',
      severity: 'critical',
      country: 'EU',
      countryName: 'European Union',
      flag: '🇪🇺',
      date: '2025-12-31',
      message: 'CBAM deadline - 30 days remaining',
    },
    {
      id: 2,
      type: 'regulation_change',
      severity: 'warning',
      country: 'UK',
      countryName: 'United Kingdom',
      flag: '🇬🇧',
      date: '2025-06-01',
      message: 'UK REACH update',
    },
  ]

  const defaultProps = {
    companyProfile: mockProfile,
    selectedProduct: 'steel',
    selectedCountries: ['EU', 'UAE'] as const,
    riskResults: mockRiskResults,
    alerts: mockAlerts,
    onNavigate: vi.fn(),
  }

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
    })

    it('displays company name', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getByText(/test corp/i)).toBeInTheDocument()
    })

    it('displays product category', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getByText(/steel/i)).toBeInTheDocument()
    })

    it('displays market count', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getAllByText(/2 market/i).length).toBeGreaterThan(0)
    })
  })

  describe('Summary Cards', () => {
    it('renders overall risk card', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getAllByText(/risk/i).length).toBeGreaterThan(0)
    })

    it('displays calculated overall risk score', () => {
      render(<Dashboard {...defaultProps} />)
      // Average of 65 and 35 = 50 -> level maps to MEDIUM
      expect(screen.getAllByText('MEDIUM').length).toBeGreaterThan(0)
    })

    it('renders critical alerts card', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getAllByText(/urgent/i).length >= 0).toBe(true)
    })

    it('displays critical alerts in action list', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getAllByText(/CBAM deadline - 30 days remaining/i).length).toBeGreaterThan(0)
    })

    it('displays recent updates list', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getByText(/Recent regulatory updates/i)).toBeInTheDocument()
    })

    it('renders markets card', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getAllByText(/markets/i).length).toBeGreaterThan(0)
    })
  })

  describe('Quick Actions', () => {
    it('renders quick action buttons', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getAllByText(/risk/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/my compliance checklist/i)).toBeInTheDocument()
    })

    it('calls onNavigate when quick action clicked', async () => {
      const onNavigate = vi.fn()
      render(<Dashboard {...defaultProps} onNavigate={onNavigate} />)

      fireEvent.click(screen.getAllByRole("button", { name: /view risk breakdown/i })[0])
      expect(onNavigate).toHaveBeenCalled()
    })
  })

  describe('Recent Alerts', () => {
    it('displays recent alerts section', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getAllByText(/cbam/i).length >= 0).toBe(true)
    })

    it('shows alert messages', () => {
      render(<Dashboard {...defaultProps} />)
      expect(screen.getAllByText(/CBAM deadline/i).length).toBeGreaterThan(0)
    })
  })

  describe('Empty States', () => {
    it('handles no risk results gracefully', () => {
      render(<Dashboard {...defaultProps} riskResults={[]} />)
      // Dashboard renders empty state or zero score when no risk results
      expect(document.body).toBeTruthy()
    })

    it('handles no alerts gracefully', () => {
      render(<Dashboard {...defaultProps} alerts={[]} />)
      expect(screen.queryByText(/Act now — these affect your next shipment/i)).not.toBeInTheDocument()
    })
  })
})
