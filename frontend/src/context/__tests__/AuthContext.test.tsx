/**
 * FE-TEST-05: Unit tests for AuthContext
 * FE-TEST-06: Unit tests for ProtectedRoute
 *
 * All tests are expected to fail (Red phase) — no implementation exists yet.
 */
import { render, screen, waitFor, act } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '../AuthContext'
import { ProtectedRoute } from '../../components/auth/ProtectedRoute'
import { apiClient } from '../../lib/api'

vi.mock('../../lib/api', () => ({
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

beforeEach(() => {
  vi.resetAllMocks()
})

// Helper component to read AuthContext state
function AuthDisplay() {
  const { user, loading } = useAuth()
  if (loading) return <div>loading...</div>
  if (!user) return <div>no user</div>
  return <div>user:{user.role}</div>
}

describe('AuthContext', () => {
  it('initially returns { user: null, loading: true }', async () => {
    // GET /auth/me never resolves during this test
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

    render(
      <BrowserRouter>
        <AuthProvider>
          <AuthDisplay />
        </AuthProvider>
      </BrowserRouter>
    )

    expect(screen.getByText('loading...')).toBeInTheDocument()
  })

  it('calls GET /auth/me on mount', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'u1',
      email: 'vol@example.com',
      role: 'VOLUNTEER',
    })

    render(
      <BrowserRouter>
        <AuthProvider>
          <AuthDisplay />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
    })
  })

  it('sets user and loading: false on successful GET /auth/me', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'u1',
      email: 'vol@example.com',
      role: 'VOLUNTEER',
    })

    render(
      <BrowserRouter>
        <AuthProvider>
          <AuthDisplay />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('user:VOLUNTEER')).toBeInTheDocument()
    })
  })

  it('sets user: null and loading: false on 401 from GET /auth/me', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('401'), { status: 401 })
    )

    render(
      <BrowserRouter>
        <AuthProvider>
          <AuthDisplay />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('no user')).toBeInTheDocument()
    })
  })

  it('login() calls POST /auth/login and updates user state', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('401'))
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'u1',
      email: 'vol@example.com',
      role: 'VOLUNTEER',
    })

    function LoginButton() {
      const { login } = useAuth()
      return (
        <button onClick={() => login({ email: 'vol@example.com', password: 'Pass1!' })}>
          login
        </button>
      )
    }

    render(
      <BrowserRouter>
        <AuthProvider>
          <AuthDisplay />
          <LoginButton />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => screen.getByText('no user'))

    await act(async () => {
      screen.getByRole('button', { name: 'login' }).click()
    })

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'vol@example.com',
        password: 'Pass1!',
      })
      expect(screen.getByText('user:VOLUNTEER')).toBeInTheDocument()
    })
  })

  it('logout() calls POST /auth/logout and clears user state', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'u1',
      email: 'vol@example.com',
      role: 'VOLUNTEER',
    })
    ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

    function LogoutButton() {
      const { logout } = useAuth()
      return <button onClick={() => logout()}>logout</button>
    }

    render(
      <BrowserRouter>
        <AuthProvider>
          <AuthDisplay />
          <LogoutButton />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => screen.getByText('user:VOLUNTEER'))

    await act(async () => {
      screen.getByRole('button', { name: 'logout' }).click()
    })

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', {})
      expect(screen.getByText('no user')).toBeInTheDocument()
    })
  })
})

// --------------------------------------------------------------------------
// ProtectedRoute tests (FE-TEST-06)
// --------------------------------------------------------------------------

describe('<ProtectedRoute>', () => {
  it('renders a loading indicator when loading: true', () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

    render(
      <BrowserRouter>
        <AuthProvider>
          <ProtectedRoute>
            <div>protected content</div>
          </ProtectedRoute>
        </AuthProvider>
      </BrowserRouter>
    )

    // Protected content should not be visible while loading
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('redirects to /login when user is null (unauthenticated)', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('401'))

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>login page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('login page')).toBeInTheDocument()
    })
  })

  it('renders children when user is authenticated with the correct role', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'u1',
      role: 'VOLUNTEER',
    })

    render(
      <BrowserRouter>
        <AuthProvider>
          <ProtectedRoute role="VOLUNTEER">
            <div>protected content</div>
          </ProtectedRoute>
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('protected content')).toBeInTheDocument()
    })
  })

  it('redirects to /login when authenticated with wrong role', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'u1',
      role: 'VOLUNTEER',
    })

    render(
      <MemoryRouter initialEntries={['/org/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/org/dashboard"
              element={
                <ProtectedRoute role="ORG_ADMIN">
                  <div>org dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>login page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('login page')).toBeInTheDocument()
    })
  })
})
