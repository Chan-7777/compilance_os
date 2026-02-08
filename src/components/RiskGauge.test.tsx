import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RiskGauge } from './RiskGauge'

describe('RiskGauge', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<RiskGauge score={50} level="medium" />)
      expect(screen.getByRole('meter')).toBeInTheDocument()
    })

    it('displays the score value', () => {
      render(<RiskGauge score={75} level="high" />)
      expect(screen.getByText('75')).toBeInTheDocument()
    })

    it('displays the risk level label', () => {
      render(<RiskGauge score={25} level="low" />)
      expect(screen.getByText(/low/i)).toBeInTheDocument()
    })

    it('has correct aria attributes', () => {
      render(<RiskGauge score={60} level="high" />)
      const meter = screen.getByRole('meter')
      expect(meter).toHaveAttribute('aria-valuenow', '60')
      expect(meter).toHaveAttribute('aria-valuemin', '0')
      expect(meter).toHaveAttribute('aria-valuemax', '100')
    })
  })

  describe('Risk Levels', () => {
    it('applies high risk styling for high level', () => {
      render(<RiskGauge score={80} level="high" />)
      const gauge = screen.getByTestId('risk-gauge')
      expect(gauge).toHaveAttribute('data-level', 'high')
    })

    it('applies medium risk styling for medium level', () => {
      render(<RiskGauge score={45} level="medium" />)
      const gauge = screen.getByTestId('risk-gauge')
      expect(gauge).toHaveAttribute('data-level', 'medium')
    })

    it('applies low risk styling for low level', () => {
      render(<RiskGauge score={15} level="low" />)
      const gauge = screen.getByTestId('risk-gauge')
      expect(gauge).toHaveAttribute('data-level', 'low')
    })
  })

  describe('Score Display', () => {
    it('displays score of 0', () => {
      render(<RiskGauge score={0} level="low" />)
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('displays score of 100', () => {
      render(<RiskGauge score={100} level="high" />)
      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('clamps score to 0-100 range', () => {
      const { rerender } = render(<RiskGauge score={-10} level="low" />)
      expect(screen.getByText('0')).toBeInTheDocument()

      rerender(<RiskGauge score={150} level="high" />)
      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })

  describe('Size Variants', () => {
    it('renders small size', () => {
      render(<RiskGauge score={50} level="medium" size="sm" />)
      const gauge = screen.getByTestId('risk-gauge')
      expect(gauge).toHaveAttribute('data-size', 'sm')
    })

    it('renders medium size by default', () => {
      render(<RiskGauge score={50} level="medium" />)
      const gauge = screen.getByTestId('risk-gauge')
      expect(gauge).toHaveAttribute('data-size', 'md')
    })

    it('renders large size', () => {
      render(<RiskGauge score={50} level="medium" size="lg" />)
      const gauge = screen.getByTestId('risk-gauge')
      expect(gauge).toHaveAttribute('data-size', 'lg')
    })
  })

  describe('Label', () => {
    it('displays custom label when provided', () => {
      render(<RiskGauge score={50} level="medium" label="Export Risk" />)
      expect(screen.getByText('Export Risk')).toBeInTheDocument()
    })

    it('displays default label when not provided', () => {
      render(<RiskGauge score={50} level="medium" />)
      expect(screen.getByText(/risk score/i)).toBeInTheDocument()
    })
  })
})
