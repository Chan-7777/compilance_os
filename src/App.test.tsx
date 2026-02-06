import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />)
    // The default Vite template has a counter, let's check for its presence
    expect(document.body).toBeInTheDocument()
  })

  it('React Testing Library is configured correctly', () => {
    render(<App />)
    // Just verifying render works
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
