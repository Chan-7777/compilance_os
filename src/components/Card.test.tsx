import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card'

describe('Card', () => {
  describe('Card Container', () => {
    it('renders without crashing', () => {
      render(<Card>Content</Card>)
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('renders children', () => {
      render(
        <Card>
          <p>Card content here</p>
        </Card>
      )
      expect(screen.getByText('Card content here')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Card className="custom-card">Content</Card>)
      const card = screen.getByText('Content').closest('[data-component="card"]')
      expect(card).toHaveClass('custom-card')
    })

    it('has correct data attribute', () => {
      render(<Card>Content</Card>)
      const card = screen.getByText('Content').closest('[data-component="card"]')
      expect(card).toHaveAttribute('data-component', 'card')
    })
  })

  describe('Card Variants', () => {
    it('renders default variant', () => {
      render(<Card>Default</Card>)
      const card = screen.getByText('Default').closest('[data-component="card"]')
      expect(card).toHaveAttribute('data-variant', 'default')
    })

    it('renders outlined variant', () => {
      render(<Card variant="outlined">Outlined</Card>)
      const card = screen.getByText('Outlined').closest('[data-component="card"]')
      expect(card).toHaveAttribute('data-variant', 'outlined')
    })

    it('renders elevated variant', () => {
      render(<Card variant="elevated">Elevated</Card>)
      const card = screen.getByText('Elevated').closest('[data-component="card"]')
      expect(card).toHaveAttribute('data-variant', 'elevated')
    })
  })

  describe('CardHeader', () => {
    it('renders header content', () => {
      render(
        <Card>
          <CardHeader>Header Content</CardHeader>
        </Card>
      )
      expect(screen.getByText('Header Content')).toBeInTheDocument()
    })

    it('has correct data attribute', () => {
      render(
        <Card>
          <CardHeader>Header</CardHeader>
        </Card>
      )
      const header = screen.getByText('Header').closest('[data-component="card-header"]')
      expect(header).toBeInTheDocument()
    })
  })

  describe('CardTitle', () => {
    it('renders title text', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>My Title</CardTitle>
          </CardHeader>
        </Card>
      )
      expect(screen.getByText('My Title')).toBeInTheDocument()
    })

    it('renders as h3 by default', () => {
      render(
        <Card>
          <CardTitle>Title</CardTitle>
        </Card>
      )
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    })

    it('renders as custom heading level', () => {
      render(
        <Card>
          <CardTitle as="h2">Title</CardTitle>
        </Card>
      )
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })
  })

  describe('CardContent', () => {
    it('renders content', () => {
      render(
        <Card>
          <CardContent>Main content area</CardContent>
        </Card>
      )
      expect(screen.getByText('Main content area')).toBeInTheDocument()
    })

    it('has correct data attribute', () => {
      render(
        <Card>
          <CardContent>Content</CardContent>
        </Card>
      )
      const content = screen.getByText('Content').closest('[data-component="card-content"]')
      expect(content).toBeInTheDocument()
    })
  })

  describe('CardFooter', () => {
    it('renders footer content', () => {
      render(
        <Card>
          <CardFooter>Footer area</CardFooter>
        </Card>
      )
      expect(screen.getByText('Footer area')).toBeInTheDocument()
    })

    it('has correct data attribute', () => {
      render(
        <Card>
          <CardFooter>Footer</CardFooter>
        </Card>
      )
      const footer = screen.getByText('Footer').closest('[data-component="card-footer"]')
      expect(footer).toBeInTheDocument()
    })
  })

  describe('Full Card Composition', () => {
    it('renders complete card with all sections', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>Card body content</CardContent>
          <CardFooter>Card footer</CardFooter>
        </Card>
      )

      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card body content')).toBeInTheDocument()
      expect(screen.getByText('Card footer')).toBeInTheDocument()
    })
  })
})
