import { describe, it, expect } from 'vitest'

describe('Test Setup Verification', () => {
  it('vitest is configured correctly', () => {
    expect(true).toBe(true)
  })

  it('can perform basic arithmetic', () => {
    expect(1 + 1).toBe(2)
  })

  it('can use matchers from jest-dom', () => {
    const div = document.createElement('div')
    div.textContent = 'Hello'
    document.body.appendChild(div)

    expect(div).toBeInTheDocument()
    expect(div).toHaveTextContent('Hello')

    document.body.removeChild(div)
  })

  it('jsdom environment is working', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
    expect(document.createElement).toBeDefined()
  })
})
