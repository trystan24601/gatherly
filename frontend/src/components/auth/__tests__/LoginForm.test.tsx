/**
 * FE-TEST-01: Component tests for <LoginForm>
 *
 * All tests are expected to fail (Red phase) — no implementation exists yet.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginForm } from '../LoginForm'
import { AuthProvider } from '../../../context/AuthContext'
import { apiClient } from '../../../lib/api'

// Mock apiClient
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
  // GET /auth/me returns 401 — user is not logged in
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

describe('<LoginForm>', () => {
  it('renders email input with accessible label', () => {
    renderWithRouter(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders password input with accessible label', () => {
    renderWithRouter(<LoginForm />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders a "Sign in" submit button', () => {
    renderWithRouter(<LoginForm />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders a "Forgot your password?" link pointing to /forgot-password', () => {
    renderWithRouter(<LoginForm />)
    const link = screen.getByRole('link', { name: /forgot.*password/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/forgot-password')
  })

  it('renders a "Register" link pointing to /register', () => {
    renderWithRouter(<LoginForm />)
    const link = screen.getByRole('link', { name: /register/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/register')
  })

  it('calls apiClient.post with /auth/login and credentials on submit', async () => {
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'u1',
      email: 'test@example.com',
      role: 'VOLUNTEER',
    })
    const user = userEvent.setup()
    renderWithRouter(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Pass1!')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'Pass1!',
      })
    })
  })

  it('displays an inline error message on 401 response', async () => {
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      status: 401,
      body: { error: 'Invalid email or password.' },
    })
    const user = userEvent.setup()
    renderWithRouter(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'bad@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('displays rate-limit message on 429 response', async () => {
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      status: 429,
      body: { error: 'Too many login attempts. Try again in 15 minutes.' },
    })
    const user = userEvent.setup()
    renderWithRouter(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'bad@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('has correct keyboard tab order: email → password → submit', () => {
    renderWithRouter(<LoginForm />)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // Tab index should ensure natural order (no tabIndex > 0)
    expect(emailInput).not.toHaveAttribute('tabindex', expect.stringMatching(/^[1-9]/))
    expect(passwordInput).not.toHaveAttribute('tabindex', expect.stringMatching(/^[1-9]/))
    expect(submitButton).not.toHaveAttribute('tabindex', expect.stringMatching(/^[1-9]/))
  })
})
