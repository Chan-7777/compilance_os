import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Settings } from './Settings'
import type { CompanyProfile, CountryCode } from '@/types'

describe('Settings', () => {
  const mockProfile: CompanyProfile = {
    name: 'Test Company',
    size: 'small',
  }

  const defaultProps = {
    companyProfile: mockProfile,
    selectedProduct: 'steel',
    selectedCountries: ['EU', 'UAE'] as CountryCode[],
    onUpdateProfile: vi.fn(),
    onSelectProduct: vi.fn(),
    onToggleCountry: vi.fn(),
  }

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Settings {...defaultProps} />)
      expect(screen.getByText(/settings/i)).toBeInTheDocument()
    })

    it('displays company profile section', () => {
      render(<Settings {...defaultProps} />)
      expect(screen.getByText(/company profile/i)).toBeInTheDocument()
    })

    it('displays product category section', () => {
      render(<Settings {...defaultProps} />)
      expect(screen.getByText(/product category/i)).toBeInTheDocument()
    })

    it('displays target markets section', () => {
      render(<Settings {...defaultProps} />)
      expect(screen.getByText(/target markets/i)).toBeInTheDocument()
    })
  })

  describe('Company Profile', () => {
    it('displays company name input', () => {
      render(<Settings {...defaultProps} />)
      const input = screen.getByLabelText(/company name/i)
      expect(input).toHaveValue('Test Company')
    })

    it('calls onUpdateProfile when name changes', () => {
      const onUpdateProfile = vi.fn()
      render(<Settings {...defaultProps} onUpdateProfile={onUpdateProfile} />)

      const input = screen.getByLabelText(/company name/i)
      fireEvent.change(input, { target: { value: 'New Company' } })

      expect(onUpdateProfile).toHaveBeenCalledWith({
        name: 'New Company',
        size: 'small',
      })
    })

    it('displays company size options', () => {
      render(<Settings {...defaultProps} />)
      expect(screen.getByTestId('size-micro')).toBeInTheDocument()
      expect(screen.getByTestId('size-small')).toBeInTheDocument()
      expect(screen.getByTestId('size-medium')).toBeInTheDocument()
      expect(screen.getByTestId('size-large')).toBeInTheDocument()
    })

    it('calls onUpdateProfile when size is selected', () => {
      const onUpdateProfile = vi.fn()
      render(<Settings {...defaultProps} onUpdateProfile={onUpdateProfile} />)

      fireEvent.click(screen.getByTestId('size-large'))

      expect(onUpdateProfile).toHaveBeenCalledWith({
        name: 'Test Company',
        size: 'large',
      })
    })
  })

  describe('Product Category', () => {
    it('displays product options', () => {
      render(<Settings {...defaultProps} />)
      expect(screen.getByTestId('product-steel')).toBeInTheDocument()
      expect(screen.getByTestId('product-textiles')).toBeInTheDocument()
    })

    it('calls onSelectProduct when product is clicked', () => {
      const onSelectProduct = vi.fn()
      render(<Settings {...defaultProps} onSelectProduct={onSelectProduct} />)

      fireEvent.click(screen.getByTestId('product-textiles'))

      expect(onSelectProduct).toHaveBeenCalledWith('textiles')
    })

    it('highlights selected product', () => {
      render(<Settings {...defaultProps} selectedProduct="steel" />)
      const steelCard = screen.getByTestId('product-steel')
      expect(steelCard).toHaveStyle({ borderColor: expect.stringContaining('250') })
    })
  })

  describe('Target Markets', () => {
    it('displays all country options', () => {
      render(<Settings {...defaultProps} />)
      expect(screen.getByTestId('country-EU')).toBeInTheDocument()
      expect(screen.getByTestId('country-US')).toBeInTheDocument()
      expect(screen.getByTestId('country-UK')).toBeInTheDocument()
      expect(screen.getByTestId('country-UAE')).toBeInTheDocument()
      expect(screen.getByTestId('country-Japan')).toBeInTheDocument()
      expect(screen.getByTestId('country-Australia')).toBeInTheDocument()
    })

    it('shows selected count badge', () => {
      render(<Settings {...defaultProps} selectedCountries={['EU', 'UAE', 'UK']} />)
      expect(screen.getByText('3 selected')).toBeInTheDocument()
    })

    it('calls onToggleCountry when country is clicked', () => {
      const onToggleCountry = vi.fn()
      render(<Settings {...defaultProps} onToggleCountry={onToggleCountry} />)

      fireEvent.click(screen.getByTestId('country-Japan'))

      expect(onToggleCountry).toHaveBeenCalledWith('Japan')
    })

    it('shows Selected badge for selected countries', () => {
      render(<Settings {...defaultProps} selectedCountries={['EU']} />)
      const euCard = screen.getByTestId('country-EU')
      expect(euCard).toHaveTextContent('Selected')
    })
  })

  describe('Accessibility', () => {
    it('size options are keyboard accessible', () => {
      const onUpdateProfile = vi.fn()
      render(<Settings {...defaultProps} onUpdateProfile={onUpdateProfile} />)

      const sizeOption = screen.getByTestId('size-medium')
      fireEvent.keyDown(sizeOption, { key: 'Enter' })

      expect(onUpdateProfile).toHaveBeenCalled()
    })

    it('product options are keyboard accessible', () => {
      const onSelectProduct = vi.fn()
      render(<Settings {...defaultProps} onSelectProduct={onSelectProduct} />)

      const productOption = screen.getByTestId('product-chemicals')
      fireEvent.keyDown(productOption, { key: ' ' })

      expect(onSelectProduct).toHaveBeenCalledWith('chemicals')
    })

    it('country options are keyboard accessible', () => {
      const onToggleCountry = vi.fn()
      render(<Settings {...defaultProps} onToggleCountry={onToggleCountry} />)

      const countryOption = screen.getByTestId('country-UK')
      fireEvent.keyDown(countryOption, { key: 'Enter' })

      expect(onToggleCountry).toHaveBeenCalledWith('UK')
    })
  })
})
