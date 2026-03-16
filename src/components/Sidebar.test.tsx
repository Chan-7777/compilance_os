import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  const defaultProps = {
    currentView: 'dashboard' as const,
    onNavigate: vi.fn(),
    alertCount: 3,
  }

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('displays app title', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByRole('img', { name: /complianceos/i })).toBeInTheDocument()
    })
  })

  describe('Navigation Items', () => {
    it('renders all navigation items', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
      expect(screen.getByText(/compliance risk/i)).toBeInTheDocument()
      expect(screen.getByText(/my checklist/i)).toBeInTheDocument()
      expect(screen.getByText(/regulatory updates/i)).toBeInTheDocument()
      expect(screen.getByText(/trade deals/i)).toBeInTheDocument()
      expect(screen.getByText(/shipments/i)).toBeInTheDocument()
    })

    it('highlights active navigation item', () => {
      render(<Sidebar {...defaultProps} currentView="risk" />)
      const riskItem = screen.getByRole('button', { name: /compliance risk/i })
      expect(riskItem).toHaveAttribute('aria-current', 'page')
    })

    it('calls onNavigate when item clicked', () => {
      const onNavigate = vi.fn()
      render(<Sidebar {...defaultProps} onNavigate={onNavigate} />)

      fireEvent.click(screen.getByText(/compliance risk/i))
      expect(onNavigate).toHaveBeenCalledWith('risk')
    })
  })

  describe('Alert Badge', () => {
    it('displays alert count on alerts nav item', () => {
      render(<Sidebar {...defaultProps} alertCount={5} />)
      expect(screen.getByTestId('alert-badge')).toHaveTextContent('5')
    })

    it('hides badge when no alerts', () => {
      render(<Sidebar {...defaultProps} alertCount={0} />)
      expect(screen.queryByTestId('alert-badge')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Icons', () => {
    it('displays icons for each nav item', () => {
      render(<Sidebar {...defaultProps} />)
      // Icons are rendered as part of nav items
      const navItems = screen.getAllByRole('button')
      expect(navItems.length).toBeGreaterThanOrEqual(6)
    })
  })

  describe('Settings/Config', () => {
    it('renders settings button', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByRole('button', { name: /settings|config/i })).toBeInTheDocument()
    })

    it('calls onNavigate with settings when clicked', () => {
      const onNavigate = vi.fn()
      render(<Sidebar {...defaultProps} onNavigate={onNavigate} />)

      fireEvent.click(screen.getByRole('button', { name: /settings|config/i }))
      expect(onNavigate).toHaveBeenCalledWith('settings')
    })
  })

  describe('Accessibility', () => {
    it('has navigation landmark', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('nav items are keyboard accessible', () => {
      render(<Sidebar {...defaultProps} />)
      const dashboardButton = screen.getByRole('button', { name: /dashboard/i })
      dashboardButton.focus()
      expect(document.activeElement).toBe(dashboardButton)
    })
  })
})
