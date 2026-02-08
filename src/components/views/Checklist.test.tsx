import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Checklist } from './Checklist'
import type { ChecklistItem, CountryCode } from '@/types'

describe('Checklist', () => {
  const mockChecklist: ChecklistItem[] = [
    {
      id: 'doc-1',
      category: 'Documentation',
      item: 'Commercial Invoice',
      required: true,
      phase: 'pre-shipment',
      priority: 'high',
      details: 'Include all transaction details',
    },
    {
      id: 'doc-2',
      category: 'Documentation',
      item: 'Packing List',
      required: true,
      phase: 'pre-shipment',
      priority: 'medium',
    },
    {
      id: 'cert-1',
      category: 'Certifications',
      item: 'CE Marking',
      required: true,
      phase: 'pre-production',
      priority: 'high',
    },
    {
      id: 'cbam-1',
      category: 'CBAM',
      item: 'Carbon emissions data',
      required: true,
      phase: 'pre-shipment',
      priority: 'critical',
    },
  ]

  const defaultProps = {
    selectedProduct: 'steel',
    selectedCountries: ['EU'] as CountryCode[],
    checklist: mockChecklist,
    checkedItems: {} as Record<string, boolean>,
    onToggleItem: vi.fn(),
  }

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Checklist {...defaultProps} />)
      expect(screen.getByText(/checklist/i)).toBeInTheDocument()
    })

    it('displays checklist items', () => {
      render(<Checklist {...defaultProps} />)
      expect(screen.getByText(/commercial invoice/i)).toBeInTheDocument()
      expect(screen.getByText(/packing list/i)).toBeInTheDocument()
    })
  })

  describe('Categories', () => {
    it('groups items by category', () => {
      render(<Checklist {...defaultProps} />)
      expect(screen.getByText(/documentation/i)).toBeInTheDocument()
      expect(screen.getByText(/certifications/i)).toBeInTheDocument()
      expect(screen.getByText(/CBAM/i)).toBeInTheDocument()
    })
  })

  describe('Progress Tracking', () => {
    it('displays progress bar', () => {
      render(<Checklist {...defaultProps} />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('shows 0% when no items checked', () => {
      render(<Checklist {...defaultProps} />)
      expect(screen.getByText(/0%/)).toBeInTheDocument()
    })

    it('updates progress when items checked', () => {
      const checkedItems = { 'doc-1': true, 'doc-2': true }
      render(<Checklist {...defaultProps} checkedItems={checkedItems} />)
      expect(screen.getByText(/50%/)).toBeInTheDocument()
    })

    it('shows completion message at 100%', () => {
      const checkedItems = {
        'doc-1': true,
        'doc-2': true,
        'cert-1': true,
        'cbam-1': true,
      }
      render(<Checklist {...defaultProps} checkedItems={checkedItems} />)
      expect(screen.getByText(/100%/)).toBeInTheDocument()
      expect(screen.getByText(/✓ Complete/)).toBeInTheDocument()
    })
  })

  describe('Item Interaction', () => {
    it('calls onToggleItem when item clicked', () => {
      const onToggleItem = vi.fn()
      render(<Checklist {...defaultProps} onToggleItem={onToggleItem} />)

      const checkbox = screen.getByLabelText(/commercial invoice/i)
      fireEvent.click(checkbox)

      expect(onToggleItem).toHaveBeenCalledWith('doc-1')
    })

    it('shows checked state for completed items', () => {
      const checkedItems = { 'doc-1': true }
      render(<Checklist {...defaultProps} checkedItems={checkedItems} />)

      const checkbox = screen.getByLabelText(/commercial invoice/i)
      expect(checkbox).toBeChecked()
    })
  })

  describe('Priority Display', () => {
    it('shows priority badges', () => {
      render(<Checklist {...defaultProps} />)
      expect(screen.getByText(/critical/i)).toBeInTheDocument()
      expect(screen.getAllByText(/high/i).length).toBeGreaterThan(0)
    })
  })

  describe('Phase Display', () => {
    it('shows phase information', () => {
      render(<Checklist {...defaultProps} />)
      expect(screen.getAllByText(/pre-shipment/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/pre-production/i).length).toBeGreaterThan(0)
    })
  })

  describe('Country Tabs', () => {
    it('shows tabs for multiple countries', () => {
      render(
        <Checklist
          {...defaultProps}
          selectedCountries={['EU', 'UAE']}
        />
      )
      expect(screen.getByRole('tab', { name: /EU/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /UAE/i })).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows message when no checklist items', () => {
      render(<Checklist {...defaultProps} checklist={[]} />)
      expect(screen.getByText(/no items/i)).toBeInTheDocument()
    })
  })
})
