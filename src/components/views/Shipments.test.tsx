import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Shipments } from './Shipments'
import type { Shipment, CountryCode } from '@/types'

describe('Shipments', () => {
  const mockShipments: Shipment[] = [
    {
      id: 'ship-1',
      name: 'Steel Export Batch 1',
      product: 'steel',
      country: 'EU',
      date: '2025-03-15',
      status: 'in_progress',
      riskScore: 65,
    },
    {
      id: 'ship-2',
      name: 'Textiles to UAE',
      product: 'textiles',
      country: 'UAE',
      date: '2025-04-01',
      status: 'pending',
      riskScore: 28,
    },
  ]

  const defaultProps = {
    shipments: mockShipments,
    selectedProduct: 'steel',
    selectedCountries: ['EU', 'UAE'] as CountryCode[],
    onAddShipment: vi.fn(),
    onSelectShipment: vi.fn(),
  }

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Shipments {...defaultProps} />)
      expect(screen.getByText(/shipments/i)).toBeInTheDocument()
    })

    it('displays shipment list', () => {
      render(<Shipments {...defaultProps} />)
      expect(screen.getByText(/steel export batch 1/i)).toBeInTheDocument()
      expect(screen.getByText(/textiles to uae/i)).toBeInTheDocument()
    })
  })

  describe('Add Shipment', () => {
    it('renders add shipment button', () => {
      render(<Shipments {...defaultProps} />)
      expect(screen.getByRole('button', { name: /new shipment/i })).toBeInTheDocument()
    })

    it('shows add shipment form when button clicked', () => {
      render(<Shipments {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /new shipment/i }))

      expect(screen.getByLabelText(/shipment name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/product/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/destination/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    })

    it('calls onAddShipment with form data', () => {
      const onAddShipment = vi.fn()
      render(<Shipments {...defaultProps} onAddShipment={onAddShipment} />)

      // Open form
      fireEvent.click(screen.getByRole('button', { name: /new shipment/i }))

      // Fill form
      fireEvent.change(screen.getByLabelText(/shipment name/i), {
        target: { value: 'New Test Shipment' },
      })
      fireEvent.change(screen.getByLabelText(/product/i), {
        target: { value: 'steel' },
      })
      fireEvent.change(screen.getByLabelText(/destination/i), {
        target: { value: 'EU' },
      })
      fireEvent.change(screen.getByLabelText(/date/i), {
        target: { value: '2025-05-01' },
      })

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /create/i }))

      expect(onAddShipment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Test Shipment',
          product: 'steel',
          country: 'EU',
          date: '2025-05-01',
        })
      )
    })
  })

  describe('Shipment Card', () => {
    it('displays shipment name', () => {
      render(<Shipments {...defaultProps} />)
      expect(screen.getByText(/steel export batch 1/i)).toBeInTheDocument()
    })

    it('displays shipment status', () => {
      render(<Shipments {...defaultProps} />)
      expect(screen.getByText(/in progress/i)).toBeInTheDocument()
      expect(screen.getByText(/pending/i)).toBeInTheDocument()
    })

    it('displays shipment date', () => {
      render(<Shipments {...defaultProps} />)
      expect(screen.getByText(/2025-03-15/)).toBeInTheDocument()
    })

    it('displays risk score', () => {
      render(<Shipments {...defaultProps} />)
      expect(screen.getByText('65')).toBeInTheDocument()
      expect(screen.getByText('28')).toBeInTheDocument()
    })

    it('displays country information', () => {
      render(<Shipments {...defaultProps} />)
      expect(screen.getByText(/European Union/)).toBeInTheDocument()
      expect(screen.getByText(/United Arab Emirates/)).toBeInTheDocument()
    })
  })

  describe('Shipment Selection', () => {
    it('calls onSelectShipment when shipment clicked', () => {
      const onSelectShipment = vi.fn()
      render(<Shipments {...defaultProps} onSelectShipment={onSelectShipment} />)

      fireEvent.click(screen.getByText(/steel export batch 1/i))

      expect(onSelectShipment).toHaveBeenCalledWith('ship-1')
    })
  })

  describe('Empty State', () => {
    it('shows message when no shipments', () => {
      render(<Shipments {...defaultProps} shipments={[]} />)
      expect(screen.getByText(/no shipments/i)).toBeInTheDocument()
    })

    it('shows call to action in empty state', () => {
      render(<Shipments {...defaultProps} shipments={[]} />)
      expect(screen.getByRole('button', { name: /create.*first/i })).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('disables create button when form incomplete', () => {
      render(<Shipments {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /new shipment/i }))

      const createButton = screen.getByRole('button', { name: /create/i })
      expect(createButton).toBeDisabled()
    })
  })
})
