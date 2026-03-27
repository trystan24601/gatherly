/**
 * FE-TEST-06: Tests for org-status-aware redirect logic in <ProtectedRoute>
 *
 * Written in the Red phase — tests must fail before implementation exists.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../../../context/AuthContext'
import { ProtectedRoute } from '../ProtectedRoute'
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

beforeEach(() => {
  vi.resetAllMocks()
})

function renderWithOrgStatus(orgStatus: string, targetPath = '/organisation/dashboard') {
  const user = {
    userId: 'user-org-admin',
    email: 'admin@org.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ORG_ADMIN',
    orgId: 'org-test',
    orgStatus,
  }
  ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(user)

  return render(
    <MemoryRouter initialEntries={[targetPath]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/organisation/dashboard"
            element={
              <ProtectedRoute role="ORG_ADMIN">
                <div>Org Dashboard Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/organisation/pending" element={<div>Pending Page</div>} />
          <Route path="/organisation/rejected" element={<div>Rejected Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('ProtectedRoute — org status redirects', () => {
  it('redirects ORG_ADMIN with orgStatus=PENDING to /organisation/pending', async () => {
    renderWithOrgStatus('PENDING')

    await waitFor(() => {
      expect(screen.getByText('Pending Page')).toBeInTheDocument()
      expect(screen.queryByText('Org Dashboard Content')).not.toBeInTheDocument()
    })
  })

  it('redirects ORG_ADMIN with orgStatus=REJECTED to /organisation/rejected', async () => {
    renderWithOrgStatus('REJECTED')

    await waitFor(() => {
      expect(screen.getByText('Rejected Page')).toBeInTheDocument()
      expect(screen.queryByText('Org Dashboard Content')).not.toBeInTheDocument()
    })
  })

  it('allows ORG_ADMIN with orgStatus=APPROVED to access protected route', async () => {
    renderWithOrgStatus('APPROVED')

    await waitFor(() => {
      expect(screen.getByText('Org Dashboard Content')).toBeInTheDocument()
    })
  })

  it('does NOT redirect on /organisation/pending path even if status=PENDING (avoids redirect loop)', async () => {
    const user = {
      userId: 'user-org-admin',
      email: 'admin@org.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ORG_ADMIN',
      orgId: 'org-test',
      orgStatus: 'PENDING',
    }
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(user)

    render(
      <MemoryRouter initialEntries={['/organisation/pending']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/organisation/pending"
              element={
                <ProtectedRoute role="ORG_ADMIN">
                  <div>Pending Page Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Pending Page Content')).toBeInTheDocument()
    })
  })

  it('does NOT redirect on /organisation/rejected path even if status=REJECTED (avoids redirect loop)', async () => {
    const user = {
      userId: 'user-org-admin',
      email: 'admin@org.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ORG_ADMIN',
      orgId: 'org-test',
      orgStatus: 'REJECTED',
    }
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(user)

    render(
      <MemoryRouter initialEntries={['/organisation/rejected']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/organisation/rejected"
              element={
                <ProtectedRoute role="ORG_ADMIN">
                  <div>Rejected Page Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Rejected Page Content')).toBeInTheDocument()
    })
  })
})
