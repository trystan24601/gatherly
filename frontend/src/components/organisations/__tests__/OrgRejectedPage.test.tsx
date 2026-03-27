/**
 * FE-TEST-03: Component tests for <OrgRejectedPage>
 *
 * Written in the Red phase — tests must fail before implementation exists.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

beforeEach(() => {
  vi.resetAllMocks()
})

const REJECTED_USER = {
  userId: 'user-rejected',
  email: 'admin@rejected-org.com',
  firstName: 'Rejected',
  lastName: 'Admin',
  role: 'ORG_ADMIN',
  orgId: 'org-rejected',
  orgStatus: 'REJECTED',
  orgRejectionReason: 'The organisation details provided were incomplete and could not be verified.',
}

async function renderPage() {
  (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(REJECTED_USER)
  ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({})

  const { OrgRejectedPage } = await import('../../../pages/OrgRejectedPage')
  return render(
    <MemoryRouter initialEntries={['/organisation/rejected']}>
      <AuthProvider>
        <OrgRejectedPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('<OrgRejectedPage>', () => {
  it('renders "Application rejected" heading', async () => {
    await renderPage()
    expect(await screen.findByRole('heading', { name: /application rejected/i })).toBeInTheDocument()
  })

  it('renders the verbatim rejectionReason text', async () => {
    await renderPage()
    expect(
      await screen.findByText(/The organisation details provided were incomplete and could not be verified/i)
    ).toBeInTheDocument()
  })

  it('renders a Sign out button', async () => {
    await renderPage()
    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('calls logout when Sign out button is clicked', async () => {
    await renderPage()
    const signOutBtn = await screen.findByRole('button', { name: /sign out/i })
    await userEvent.click(signOutBtn)
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', {})
  })
})
