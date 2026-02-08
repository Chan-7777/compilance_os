import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Alerts } from './Alerts'
import type { Alert } from '@/types'

describe('Alerts', () => {
  const mockAlerts: Alert[] = [
    {
      id: 1,
      type: 'deadline',
      severity: 'critical',
      country: 'EU',
      countryName: 'European Union',
      flag: '🇪🇺',
      date: '2025-12-31',
      message: 'CBAM financial adjustments begin - 30 days remaining',
    },
    {
      id: 2,
      type: 'regulation_change',
      severity: 'warning',
      country: 'UK',
      countryName: 'United Kingdom',
      flag: '🇬🇧',
      date: '2025-06-01',
      message: 'UK REACH registration deadline extended',
    },
    {
      id: 3,
      type: 'fta_update',
      severity: 'info',
      country: 'EU',
      countryName: 'European Union',
      flag: '🇪🇺',
      date: '2025-03-15',
      message: 'India-EU FTA: Round 8 announced',
    },
  ]

  const defaultProps = {
    alerts: mockAlerts,
    activeFilter: 'all' as const,
    onFilterChange: vi.fn(),
  }

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Alerts {...defaultProps} />)
      expect(screen.getByText(/alerts/i)).toBeInTheDocument()
    })

    it('displays all alerts', () => {
      render(<Alerts {...defaultProps} />)
      expect(screen.getByText(/CBAM financial adjustments/i)).toBeInTheDocument()
      expect(screen.getByText(/UK REACH/i)).toBeInTheDocument()
      expect(screen.getByText(/India-EU FTA/i)).toBeInTheDocument()
    })
  })

  describe('Severity Filtering', () => {
    it('renders filter buttons', () => {
      render(<Alerts {...defaultProps} />)
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /critical/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /warning/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /info/i })).toBeInTheDocument()
    })

    it('calls onFilterChange when filter clicked', () => {
      const onFilterChange = vi.fn()
      render(<Alerts {...defaultProps} onFilterChange={onFilterChange} />)

      fireEvent.click(screen.getByRole('button', { name: /critical/i }))
      expect(onFilterChange).toHaveBeenCalledWith('critical')
    })

    it('shows only critical alerts when filtered', () => {
      render(<Alerts {...defaultProps} activeFilter="critical" />)
      expect(screen.getByText(/CBAM financial adjustments/i)).toBeInTheDocument()
      expect(screen.queryByText(/UK REACH/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/India-EU FTA/i)).not.toBeInTheDocument()
    })

    it('shows only warning alerts when filtered', () => {
      render(<Alerts {...defaultProps} activeFilter="warning" />)
      expect(screen.queryByText(/CBAM financial adjustments/i)).not.toBeInTheDocument()
      expect(screen.getByText(/UK REACH/i)).toBeInTheDocument()
    })
  })

  describe('Alert Display', () => {
    it('displays country flag and name', () => {
      render(<Alerts {...defaultProps} />)
      // Multiple EU alerts, so use getAllByText
      expect(screen.getAllByText('🇪🇺').length).toBeGreaterThan(0)
      expect(screen.getAllByText(/european union/i).length).toBeGreaterThan(0)
    })

    it('displays alert date', () => {
      render(<Alerts {...defaultProps} />)
      expect(screen.getByText(/2025-12-31/)).toBeInTheDocument()
    })

    it('displays severity badges', () => {
      render(<Alerts {...defaultProps} />)
      // Severity badges are shown in the alert cards
      const alertCards = screen.getAllByTestId('alert-card')
      expect(alertCards.length).toBe(3)
      // Check for severity text in cards
      expect(screen.getAllByText(/critical/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/warning/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/info/i).length).toBeGreaterThan(0)
    })

    it('displays alert type', () => {
      render(<Alerts {...defaultProps} />)
      // Multiple elements may contain these texts
      expect(screen.getAllByText(/deadline/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/regulation change/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/fta update/i).length).toBeGreaterThan(0)
    })
  })

  describe('Alert Counts', () => {
    it('displays count for each severity', () => {
      render(<Alerts {...defaultProps} />)
      expect(screen.getByTestId('count-critical')).toHaveTextContent('1')
      expect(screen.getByTestId('count-warning')).toHaveTextContent('1')
      expect(screen.getByTestId('count-info')).toHaveTextContent('1')
    })
  })

  describe('Empty State', () => {
    it('shows message when no alerts', () => {
      render(<Alerts {...defaultProps} alerts={[]} />)
      expect(screen.getByText(/no alerts/i)).toBeInTheDocument()
    })

    it('shows message when filter has no results', () => {
      const alertsWithoutInfo = mockAlerts.filter(a => a.severity !== 'info')
      render(<Alerts {...defaultProps} alerts={alertsWithoutInfo} activeFilter="info" />)
      expect(screen.getByText(/no.*alerts/i)).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('sorts alerts by severity (critical first)', () => {
      render(<Alerts {...defaultProps} />)
      const alertCards = screen.getAllByTestId('alert-card')
      // First alert should be critical
      expect(alertCards[0]).toHaveTextContent(/CBAM/i)
    })
  })
})
