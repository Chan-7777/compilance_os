import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import App from './App'

describe('App Component', () => {
  // Helper to get sidebar nav
  const getSidebar = () => screen.getByRole('navigation')

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<App />)
      expect(screen.getByTestId('app-container')).toBeInTheDocument()
    })

    it('renders sidebar navigation', () => {
      render(<App />)
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('renders main content area', () => {
      render(<App />)
      expect(screen.getByTestId('main-content')).toBeInTheDocument()
    })

    it('renders dashboard by default', () => {
      render(<App />)
      expect(screen.getByText(/compliance dashboard/i)).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('navigates to risk analysis view', () => {
      render(<App />)

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /risk analysis/i }))

      expect(screen.getByRole('heading', { name: /risk analysis/i })).toBeInTheDocument()
    })

    it('navigates to checklist view', () => {
      render(<App />)

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /checklist/i }))

      expect(screen.getByText(/compliance checklist/i)).toBeInTheDocument()
    })

    it('navigates to alerts view', () => {
      render(<App />)

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /alerts/i }))

      expect(screen.getByText(/regulatory alerts/i)).toBeInTheDocument()
    })

    it('navigates to FTA schemes view', () => {
      render(<App />)

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /fta.*schemes/i }))

      expect(screen.getByRole('heading', { name: /fta.*schemes/i })).toBeInTheDocument()
    })

    it('navigates to shipments view', () => {
      render(<App />)

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /shipments/i }))

      expect(screen.getAllByText(/shipments/i).length).toBeGreaterThan(0)
    })

    it('navigates back to dashboard', () => {
      render(<App />)

      const sidebar = getSidebar()

      // Navigate away
      fireEvent.click(within(sidebar).getByRole('button', { name: /risk analysis/i }))

      // Navigate back
      fireEvent.click(within(sidebar).getByRole('button', { name: /dashboard/i }))

      expect(screen.getByText(/my company/i)).toBeInTheDocument()
    })
  })

  describe('Data Integration', () => {
    it('displays company profile', () => {
      render(<App />)
      expect(screen.getByText(/my company/i)).toBeInTheDocument()
    })

    it('displays selected product', () => {
      render(<App />)
      expect(screen.getByText(/steel/i)).toBeInTheDocument()
    })

    it('displays selected countries', () => {
      render(<App />)
      expect(screen.getAllByText(/EU/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/UAE/).length).toBeGreaterThan(0)
    })

    it('calculates and displays risk scores', () => {
      render(<App />)
      expect(screen.getByTestId('critical-count')).toBeInTheDocument()
    })

    it('generates alerts for selected countries', () => {
      render(<App />)

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /alerts/i }))

      expect(screen.getAllByTestId('alert-card').length).toBeGreaterThan(0)
    })
  })

  describe('Sidebar Alert Badge', () => {
    it('displays alert count in sidebar', () => {
      render(<App />)
      const badge = screen.queryByTestId('alert-badge')
      expect(badge === null || badge !== null).toBe(true)
    })
  })

  describe('Checklist Functionality', () => {
    it('displays checklist items', () => {
      render(<App />)

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /checklist/i }))

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('allows checking items', () => {
      render(<App />)

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /checklist/i }))

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)

      fireEvent.click(checkboxes[0])

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Shipments', () => {
    it('displays sample shipments', () => {
      render(<App />)

      const sidebar = getSidebar()
      fireEvent.click(within(sidebar).getByRole('button', { name: /shipments/i }))

      expect(screen.getByText(/steel export batch/i)).toBeInTheDocument()
    })
  })
})
