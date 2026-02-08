import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FTASchemes } from './FTASchemes'
import type { CountryCode } from '@/types'

describe('FTASchemes', () => {
  const defaultProps = {
    selectedCountries: ['EU', 'UAE', 'Australia'] as CountryCode[],
  }

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getByText(/FTA.*Schemes/i)).toBeInTheDocument()
    })
  })

  describe('FTA Section', () => {
    it('displays FTA section header', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getByText(/free trade agreements/i)).toBeInTheDocument()
    })

    it('shows FTA for selected countries', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getByText(/India-EU FTA/i)).toBeInTheDocument()
      expect(screen.getByText(/India-UAE CEPA/i)).toBeInTheDocument()
      expect(screen.getByText(/India-Australia ECTA/i)).toBeInTheDocument()
    })

    it('displays FTA status', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getAllByText(/under negotiation/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0)
    })

    it('shows preferential tariff indicator for active FTAs', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getAllByText(/preferential/i).length).toBeGreaterThan(0)
    })

    it('displays FTA notes', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getByText(/certificate of origin/i)).toBeInTheDocument()
    })
  })

  describe('Indian Export Schemes Section', () => {
    it('displays Indian schemes section', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getByText(/indian export schemes/i)).toBeInTheDocument()
    })

    it('shows RoDTEP scheme', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getByText(/RoDTEP/i)).toBeInTheDocument()
    })

    it('shows PLI scheme', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getByText(/PLI/i)).toBeInTheDocument()
    })

    it('shows Advance Authorization', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getByText(/advance authorization/i)).toBeInTheDocument()
    })

    it('shows scheme status', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0)
    })

    it('shows scheme descriptions', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getByText(/remission of duties/i)).toBeInTheDocument()
    })
  })

  describe('Country Flags', () => {
    it('displays country flags', () => {
      render(<FTASchemes {...defaultProps} />)
      expect(screen.getByText('🇪🇺')).toBeInTheDocument()
      expect(screen.getByText('🇦🇪')).toBeInTheDocument()
      expect(screen.getByText('🇦🇺')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows message when no countries selected', () => {
      render(<FTASchemes selectedCountries={[]} />)
      expect(screen.getByText(/select.*markets/i)).toBeInTheDocument()
    })
  })
})
