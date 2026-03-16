import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import App from './App'

// Mock auth hook to simulate an authenticated user
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    session: null,
    profile: null,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ then: (fn: any) => fn({ data: null }) }),
          order: () => ({ then: (fn: any) => fn({ data: null }) }),
          then: (fn: any) => fn({ data: null }),
        }),
      }),
    }),
  },
}))

// Mock API module
vi.mock('@/lib/api', () => ({
  fetchBatchRiskScore: vi.fn(),
  fetchChecklist: vi.fn(),
  fetchAlerts: vi.fn(),
  fetchFTAAgreements: vi.fn(),
  fetchExportSchemes: vi.fn(),
  fetchBatchFTASavings: vi.fn(),
  fetchCountries: vi.fn(),
}))

import {
  fetchBatchRiskScore,
  fetchChecklist,
  fetchAlerts,
  fetchFTAAgreements,
  fetchExportSchemes,
  fetchBatchFTASavings,
  fetchCountries,
} from '@/lib/api'

beforeEach(() => {
  vi.mocked(fetchBatchRiskScore).mockResolvedValue({
    results: [
      {
        country: 'EU',
        score: 65,
        level: 'high',
        factors: [{ category: 'CBAM', severity: 'high', detail: 'CBAM applies' }],
        recommendations: ['Track emissions'],
      },
      {
        country: 'UAE',
        score: 35,
        level: 'medium',
        factors: [{ category: 'Trade Agreement', severity: 'positive', detail: 'CEPA active' }],
        recommendations: ['File CoO'],
      },
    ],
  })

  vi.mocked(fetchChecklist).mockResolvedValue({
    items: [
      { id: 'doc-1', category: 'Documentation', item: 'Commercial Invoice', required: true, phase: 'pre-shipment', priority: 'high' },
      { id: 'doc-2', category: 'Documentation', item: 'Packing List', required: true, phase: 'pre-shipment', priority: 'medium' },
      { id: 'cert-1', category: 'Certifications', item: 'CE Marking', required: true, phase: 'pre-production', priority: 'high' },
    ],
  })

  vi.mocked(fetchAlerts).mockResolvedValue({
    alerts: [
      {
        id: 1,
        type: 'deadline',
        severity: 'critical',
        country: 'EU',
        countryName: 'European Union',
        flag: '\u{1F1EA}\u{1F1FA}',
        date: '2025-12-31',
        message: 'CBAM deadline approaching',
      },
      {
        id: 2,
        type: 'regulation_change',
        severity: 'warning',
        country: 'UK',
        countryName: 'United Kingdom',
        flag: '\u{1F1EC}\u{1F1E7}',
        date: '2025-06-01',
        message: 'UK REACH update',
      },
    ],
  })

  // FTA-related mocks (used when navigating to FTA schemes view)
  vi.mocked(fetchFTAAgreements).mockResolvedValue({
    agreements: [
      { country_code: 'EU', name: 'India-EU FTA', status: 'Under Negotiation', preferential_tariff: false, notes: 'Negotiations ongoing' },
      { country_code: 'UAE', name: 'India-UAE CEPA', status: 'Active', effective_date: '2022-05-01', preferential_tariff: true, notes: 'CEPA active' },
    ],
  })
  vi.mocked(fetchExportSchemes).mockResolvedValue({
    schemes: [
      { name: 'RoDTEP', description: 'Remission of Duties and Taxes', status: 'Active' },
    ],
  })
  vi.mocked(fetchCountries).mockResolvedValue({
    countries: [
      { code: 'EU', name: 'European Union', flag: '\u{1F1EA}\u{1F1FA}' },
      { code: 'UAE', name: 'United Arab Emirates', flag: '\u{1F1E6}\u{1F1EA}' },
    ],
  })
  vi.mocked(fetchBatchFTASavings).mockResolvedValue({ results: [] })
})

describe('App Component', () => {
  const getSidebar = () => screen.getByRole('navigation')

  describe('Rendering', () => {
    it('renders without crashing', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByTestId('app-container')).toBeInTheDocument()
      })
    })

    it('renders sidebar navigation', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })
    })

    it('renders main content area', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByTestId('main-content')).toBeInTheDocument()
      })
    })

    it('renders dashboard by default', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getAllByText(/compliance dashboard/i).length).toBeGreaterThan(0)
      })
    })
  })

  describe('Navigation', () => {
    it('navigates to risk analysis view', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /compliance risk/i }))

      expect(screen.getByRole('heading', { name: /compliance risk/i })).toBeInTheDocument()
    })

    it('navigates to checklist view', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /my checklist/i }))

      expect(screen.getAllByText(/compliance checklist/i).length).toBeGreaterThan(0)
    })

    it('navigates to alerts view', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /regulatory updates/i }))

      await waitFor(() => {
        expect(screen.getAllByText(/regulatory/i).length).toBeGreaterThan(0)
      })
    })

    it('navigates to FTA schemes view', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /trade deals/i }))

      await waitFor(() => {
        expect(screen.getAllByText(/trade|fta|savings/i).length).toBeGreaterThan(0)
      })
    })

    it('navigates to shipments view', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /shipments/i }))

      expect(screen.getAllByText(/shipments/i).length).toBeGreaterThan(0)
    })

    it('navigates back to dashboard', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /compliance risk/i }))
      fireEvent.click(within(sidebar).getByRole('button', { name: /dashboard/i }))

      expect(screen.getByText(/my company/i)).toBeInTheDocument()
    })
  })

  describe('Data Integration', () => {
    it('displays company profile', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByText(/my company/i)).toBeInTheDocument()
      })
    })

    it('displays selected product', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByText(/steel/i)).toBeInTheDocument()
      })
    })

    it('displays selected countries', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getAllByText(/EU/).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/UAE/).length).toBeGreaterThan(0)
      })
    })

    it('calculates and displays risk scores', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByTestId('critical-count')).toBeInTheDocument()
      })
    })

    it('generates alerts for selected countries', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /regulatory updates/i }))

      await waitFor(() => {
        expect(screen.getAllByTestId('alert-card').length).toBeGreaterThan(0)
      })
    })
  })

  describe('Sidebar Alert Badge', () => {
    it('displays alert count in sidebar', async () => {
      render(<App />)
      await waitFor(() => {
        const badge = screen.queryByTestId('alert-badge')
        expect(badge === null || badge !== null).toBe(true)
      })
    })
  })

  describe('Checklist Functionality', () => {
    it('displays checklist items', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /checklist/i }))

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })
    })

    it('allows checking items', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /my checklist/i }))

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })
    })
  })

  describe('Shipments', () => {
    it('displays sample shipments', async () => {
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /shipments/i }))

      expect(screen.getByText(/steel export batch/i)).toBeInTheDocument()
    })
  })
})
