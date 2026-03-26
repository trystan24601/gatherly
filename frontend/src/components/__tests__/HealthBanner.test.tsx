import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// FE-TEST-02: HealthBanner component tests
// Imports from '../HealthBanner' which does NOT exist yet — all must FAIL

import { HealthBanner } from '../HealthBanner'

describe('HealthBanner component', () => {
  it('renders without crashing', () => {
    expect(() => render(<HealthBanner />)).not.toThrow()
  })

  it('renders the application heading "Gatherly"', () => {
    render(<HealthBanner />)
    expect(screen.getByText(/Gatherly/i)).toBeInTheDocument()
  })

  it('does not display an error state on initial mount', () => {
    render(<HealthBanner />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
  })
})
