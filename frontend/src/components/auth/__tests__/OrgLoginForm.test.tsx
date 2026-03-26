/**
 * FE-TEST-03: Component tests for <OrgLoginForm>
 *
 * All tests are expected to fail (Red phase) — no implementation exists yet.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrgLoginForm } from '../OrgLoginForm'
import { AuthProvider } from '../../../context/AuthContext'
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

describe('<OrgLoginForm>', () => {
  it('renders email input with accessible label', () => {
    renderWithRouter(<OrgLoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders password input with accessible label', () => {
    renderWithRouter(<OrgLoginForm />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders a submit button', () => {
    renderWithRouter(<OrgLoginForm />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('calls apiClient.post with /auth/org/login on submit', async () => {
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'u1',
      email: 'admin@org.com',
      role: 'ORG_ADMIN',
      orgId: 'org-123',
    })
    const user = userEvent.setup()
    renderWithRouter(<OrgLoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'admin@org.com')
    await user.type(screen.getByLabelText(/password/i), 'Pass1!')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/org/login', {
        email: 'admin@org.com',
        password: 'Pass1!',
      })
    })
  })

  it('displays an error message on failed login', async () => {
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      status: 401,
      body: { error: 'Invalid email or password.' },
    })
    const user = userEvent.setup()
    renderWithRouter(<OrgLoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'bad@org.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
