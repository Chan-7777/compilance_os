import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Badge>Test</Badge>)
      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('renders children content', () => {
      render(<Badge>Status Active</Badge>)
      expect(screen.getByText('Status Active')).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<Badge>Default</Badge>)
      const badge = screen.getByText('Default')
      expect(badge).toHaveAttribute('data-variant', 'default')
    })

    it('renders primary variant', () => {
      render(<Badge variant="primary">Primary</Badge>)
      const badge = screen.getByText('Primary')
      expect(badge).toHaveAttribute('data-variant', 'primary')
    })

    it('renders success variant', () => {
      render(<Badge variant="success">Success</Badge>)
      const badge = screen.getByText('Success')
      expect(badge).toHaveAttribute('data-variant', 'success')
    })

    it('renders warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>)
      const badge = screen.getByText('Warning')
      expect(badge).toHaveAttribute('data-variant', 'warning')
    })

    it('renders danger variant', () => {
      render(<Badge variant="danger">Danger</Badge>)
      const badge = screen.getByText('Danger')
      expect(badge).toHaveAttribute('data-variant', 'danger')
    })

    it('renders info variant', () => {
      render(<Badge variant="info">Info</Badge>)
      const badge = screen.getByText('Info')
      expect(badge).toHaveAttribute('data-variant', 'info')
    })
  })

  describe('Risk Level Variants', () => {
    it('renders high risk variant', () => {
      render(<Badge variant="risk-high">High Risk</Badge>)
      const badge = screen.getByText('High Risk')
      expect(badge).toHaveAttribute('data-variant', 'risk-high')
    })

    it('renders medium risk variant', () => {
      render(<Badge variant="risk-medium">Medium Risk</Badge>)
      const badge = screen.getByText('Medium Risk')
      expect(badge).toHaveAttribute('data-variant', 'risk-medium')
    })

    it('renders low risk variant', () => {
      render(<Badge variant="risk-low">Low Risk</Badge>)
      const badge = screen.getByText('Low Risk')
      expect(badge).toHaveAttribute('data-variant', 'risk-low')
    })
  })

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Badge size="sm">Small</Badge>)
      const badge = screen.getByText('Small')
      expect(badge).toHaveAttribute('data-size', 'sm')
    })

    it('renders medium size by default', () => {
      render(<Badge>Medium</Badge>)
      const badge = screen.getByText('Medium')
      expect(badge).toHaveAttribute('data-size', 'md')
    })

    it('renders large size', () => {
      render(<Badge size="lg">Large</Badge>)
      const badge = screen.getByText('Large')
      expect(badge).toHaveAttribute('data-size', 'lg')
    })
  })

  describe('Accessibility', () => {
    it('has role status by default', () => {
      render(<Badge>Status</Badge>)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('accepts custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>)
      const badge = screen.getByText('Custom')
      expect(badge).toHaveClass('custom-class')
    })
  })
})
