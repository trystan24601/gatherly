/**
 * FE-TEST-04: Component tests for <ForgotPasswordForm>
 *
 * All tests are expected to fail (Red phase) — no implementation exists yet.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ForgotPasswordForm } from '../ForgotPasswordForm'
import { apiClient } from '../../../lib/api'

vi.mock('../../../lib/api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, public body: unknown) {
      super(`HTTP ${status}`)
      this.name = 'ApiError'
    }
  },
}))

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('<ForgotPasswordForm>', () => {
  it('renders email input with accessible label', () => {
    renderWithRouter(<ForgotPasswordForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders a submit button', () => {
    renderWithRouter(<ForgotPasswordForm />)
    expect(screen.getByRole('button', { name: /send|reset|submit/i })).toBeInTheDocument()
  })

  it('calls apiClient.post with /auth/password-reset/request on submit', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      message: 'If that email is registered, a reset link has been sent.',
    })
    const user = userEvent.setup()
    renderWithRouter(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send|reset|submit/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/password-reset/request', {
        email: 'test@example.com',
      })
    })
  })

  it('shows success message after submit regardless of whether email exists', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      message: 'If that email is registered, a reset link has been sent.',
    })
    const user = userEvent.setup()
    renderWithRouter(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText(/email/i), 'unknown@example.com')
    await user.click(screen.getByRole('button', { name: /send|reset|submit/i }))

    await waitFor(() => {
      // The component renders a "Check your email" heading after successful submit
      expect(
        screen.getAllByText(/check your email|reset link|sent/i).length
      ).toBeGreaterThan(0)
    })
  })

  it('shows success message even when API returns an error response', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))
    const user = userEvent.setup()
    renderWithRouter(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send|reset|submit/i }))

    // Even on failure, show the same success message (no enumeration)
    await waitFor(() => {
      // The component renders a "Check your email" heading after successful submit
      expect(
        screen.getAllByText(/check your email|reset link|sent/i).length
      ).toBeGreaterThan(0)
    })
  })
})
