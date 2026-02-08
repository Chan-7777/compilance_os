import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('renders children content', () => {
      render(<Button>Submit Form</Button>)
      expect(screen.getByText('Submit Form')).toBeInTheDocument()
    })

    it('renders as button element by default', () => {
      render(<Button>Button</Button>)
      expect(screen.getByRole('button').tagName).toBe('BUTTON')
    })
  })

  describe('Variants', () => {
    it('renders primary variant by default', () => {
      render(<Button>Primary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'primary')
    })

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'secondary')
    })

    it('renders outline variant', () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'outline')
    })

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'ghost')
    })

    it('renders danger variant', () => {
      render(<Button variant="danger">Danger</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'danger')
    })
  })

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'sm')
    })

    it('renders medium size by default', () => {
      render(<Button>Medium</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'md')
    })

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'lg')
    })
  })

  describe('States', () => {
    it('can be disabled', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('shows loading state', () => {
      render(<Button loading>Loading</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-loading', 'true')
      expect(button).toBeDisabled()
    })

    it('displays loading spinner when loading', () => {
      render(<Button loading>Submit</Button>)
      expect(screen.getByTestId('button-spinner')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click</Button>)

      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(
        <Button disabled onClick={handleClick}>
          Click
        </Button>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('does not call onClick when loading', () => {
      const handleClick = vi.fn()
      render(
        <Button loading onClick={handleClick}>
          Click
        </Button>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Full Width', () => {
    it('renders full width when specified', () => {
      render(<Button fullWidth>Full Width</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-full-width', 'true')
    })
  })

  describe('Accessibility', () => {
    it('has button type by default', () => {
      render(<Button>Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('can have submit type', () => {
      render(<Button type="submit">Submit</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('accepts custom className', () => {
      render(<Button className="custom-btn">Custom</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-btn')
    })

    it('forwards aria-label', () => {
      render(<Button aria-label="Close dialog">X</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Close dialog')
    })
  })

  describe('Icons', () => {
    it('renders with left icon', () => {
      render(<Button leftIcon={<span data-testid="left-icon">←</span>}>Back</Button>)
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('renders with right icon', () => {
      render(<Button rightIcon={<span data-testid="right-icon">→</span>}>Next</Button>)
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })
  })
})
