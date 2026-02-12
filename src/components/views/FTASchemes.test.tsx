import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { FTASchemes } from './FTASchemes'
import type { CountryCode } from '@/types'

// Mock API module
vi.mock('@/lib/api', () => ({
  fetchFTAAgreements: vi.fn(),
  fetchExportSchemes: vi.fn(),
  fetchBatchFTASavings: vi.fn(),
  fetchCountries: vi.fn(),
}))

import { fetchFTAAgreements, fetchExportSchemes, fetchBatchFTASavings, fetchCountries } from '@/lib/api'

const mockAgreements = [
  { country_code: 'EU', name: 'India-EU FTA', status: 'Under Negotiation', preferential_tariff: false, notes: 'Negotiations ongoing; interim MFN rates apply. Key sticking points: dairy, auto, data localization' },
  { country_code: 'UAE', name: 'India-UAE CEPA', status: 'Active', effective_date: '2022-05-01', preferential_tariff: true, notes: 'Covers 90%+ tariff lines. Certificate of Origin required for preferential rates' },
  { country_code: 'Australia', name: 'India-Australia ECTA', status: 'Active', effective_date: '2022-12-29', preferential_tariff: true, notes: 'Interim agreement; CECA (comprehensive) under negotiation. 85% tariff lines covered' },
]

const mockSchemes = [
  { name: 'RoDTEP', description: 'Remission of Duties and Taxes on Exported Products', status: 'Active' },
  { name: 'PLI Scheme', description: 'Production Linked Incentive for eligible sectors', status: 'Sector-specific' },
  { name: 'Advance Authorization', description: 'Duty-free import of inputs for export production', status: 'Active' },
]

const mockCountries = [
  { code: 'EU', name: 'European Union', flag: '🇪🇺' },
  { code: 'UAE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'Australia', name: 'Australia', flag: '🇦🇺' },
]

beforeEach(() => {
  vi.mocked(fetchFTAAgreements).mockResolvedValue({ agreements: mockAgreements })
  vi.mocked(fetchExportSchemes).mockResolvedValue({ schemes: mockSchemes })
  vi.mocked(fetchCountries).mockResolvedValue({ countries: mockCountries })
  vi.mocked(fetchBatchFTASavings).mockResolvedValue({ results: [] })
})

describe('FTASchemes', () => {
  const defaultProps = {
    selectedCountries: ['EU', 'UAE', 'Australia'] as CountryCode[],
  }

  describe('Rendering', () => {
    it('renders without crashing', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/FTA.*Schemes/i)).toBeInTheDocument()
      })
    })
  })

  describe('FTA Section', () => {
    it('displays FTA section header', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/free trade agreements/i)).toBeInTheDocument()
      })
    })

    it('shows FTA for selected countries', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/India-EU FTA/i)).toBeInTheDocument()
        expect(screen.getByText(/India-UAE CEPA/i)).toBeInTheDocument()
        expect(screen.getByText(/India-Australia ECTA/i)).toBeInTheDocument()
      })
    })

    it('displays FTA status', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getAllByText(/under negotiation/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0)
      })
    })

    it('shows preferential tariff indicator for active FTAs', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getAllByText(/preferential/i).length).toBeGreaterThan(0)
      })
    })

    it('displays FTA notes', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/certificate of origin/i)).toBeInTheDocument()
      })
    })
  })

  describe('Indian Export Schemes Section', () => {
    it('displays Indian schemes section', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/indian export schemes/i)).toBeInTheDocument()
      })
    })

    it('shows RoDTEP scheme', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/RoDTEP/i)).toBeInTheDocument()
      })
    })

    it('shows PLI scheme', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/PLI/i)).toBeInTheDocument()
      })
    })

    it('shows Advance Authorization', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/advance authorization/i)).toBeInTheDocument()
      })
    })

    it('shows scheme status', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0)
      })
    })

    it('shows scheme descriptions', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/remission of duties/i)).toBeInTheDocument()
      })
    })
  })

  describe('Country Flags', () => {
    it('displays country flags', async () => {
      render(<FTASchemes {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('🇪🇺')).toBeInTheDocument()
        expect(screen.getByText('🇦🇪')).toBeInTheDocument()
        expect(screen.getByText('🇦🇺')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('shows message when no countries selected', async () => {
      render(<FTASchemes selectedCountries={[]} />)
      await waitFor(() => {
        expect(screen.getByText(/select.*markets/i)).toBeInTheDocument()
      })
    })
  })
})
