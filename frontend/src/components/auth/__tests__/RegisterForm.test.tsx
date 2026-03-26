/**
 * FE-TEST-02: Component tests for <RegisterForm>
 *
 * All tests are expected to fail (Red phase) — no implementation exists yet.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegisterForm } from '../RegisterForm'
import { apiClient } from '../../../lib/api'
import { AuthProvider } from '../../../context/AuthContext'

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
  ;(apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'))
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('<RegisterForm>', () => {
  it('renders firstName input with accessible label', () => {
    renderWithRouter(<RegisterForm />)
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
  })

  it('renders lastName input with accessible label', () => {
    renderWithRouter(<RegisterForm />)
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
  })

  it('renders email input with accessible label', () => {
    renderWithRouter(<RegisterForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders password input with accessible label', () => {
    renderWithRouter(<RegisterForm />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders "Create account" submit button', () => {
    renderWithRouter(<RegisterForm />)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders a "Sign in" link', () => {
    renderWithRouter(<RegisterForm />)
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders password hint text', () => {
    renderWithRouter(<RegisterForm />)
    expect(screen.getByText(/min 8 chars/i)).toBeInTheDocument()
  })

  it('calls apiClient.post with /auth/register on valid submit', async () => {
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'u1',
      email: 'new@example.com',
      role: 'VOLUNTEER',
    })
    const user = userEvent.setup()
    renderWithRouter(<RegisterForm />)

    await user.type(screen.getByLabelText(/first name/i), 'Test')
    await user.type(screen.getByLabelText(/last name/i), 'User')
    await user.type(screen.getByLabelText(/email/i), 'new@example.com')
    await user.type(screen.getByLabelText(/password/i), 'StrongPass1!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        firstName: 'Test',
        lastName: 'User',
        email: 'new@example.com',
        password: 'StrongPass1!',
      })
    })
  })

  it('displays 409 duplicate-email error as a field-level error', async () => {
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      status: 409,
      body: { error: 'An account with this email already exists.' },
    })
    const user = userEvent.setup()
    renderWithRouter(<RegisterForm />)

    await user.type(screen.getByLabelText(/first name/i), 'Test')
    await user.type(screen.getByLabelText(/last name/i), 'User')
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.type(screen.getByLabelText(/password/i), 'StrongPass1!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('does NOT call apiClient.post when password is too weak (client-side validation)', async () => {
    const user = userEvent.setup()
    renderWithRouter(<RegisterForm />)

    await user.type(screen.getByLabelText(/first name/i), 'Test')
    await user.type(screen.getByLabelText(/last name/i), 'User')
    await user.type(screen.getByLabelText(/email/i), 'new@example.com')
    await user.type(screen.getByLabelText(/password/i), 'weak')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Should show a validation error, not call the API
    await waitFor(() => {
      expect(apiClient.post).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
