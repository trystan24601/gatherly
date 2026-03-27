/**
 * FE-TEST-02: Component tests for <OrgPendingPage>
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

const PENDING_USER = {
  userId: 'user-pending',
  email: 'admin@pending-org.com',
  firstName: 'Pending',
  lastName: 'Admin',
  role: 'ORG_ADMIN',
  orgId: 'org-pending',
  orgStatus: 'PENDING',
  orgSubmittedAt: '2026-03-01T10:00:00.000Z',
}

async function renderPage() {
  (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(PENDING_USER)
  ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({})

  const { OrgPendingPage } = await import('../../../pages/OrgPendingPage')
  return render(
    <MemoryRouter initialEntries={['/organisation/pending']}>
      <AuthProvider>
        <OrgPendingPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('<OrgPendingPage>', () => {
  it('renders "Application under review" heading', async () => {
    await renderPage()
    expect(await screen.findByRole('heading', { name: /application under review/i })).toBeInTheDocument()
  })

  it('renders awaiting approval message', async () => {
    await renderPage()
    expect(
      await screen.findByText(/submitted.*awaiting approval|awaiting.*approval/i)
    ).toBeInTheDocument()
  })

  it('renders submitted date formatted as DD MMMM YYYY', async () => {
    await renderPage()
    // 2026-03-01T10:00:00.000Z should render as "1 March 2026"
    expect(await screen.findByText(/1 March 2026/i)).toBeInTheDocument()
  })

  it('renders a Sign out button', async () => {
    await renderPage()
    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('calls logout when Sign out button is clicked', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({})
    await renderPage()

    const signOutBtn = await screen.findByRole('button', { name: /sign out/i })
    await userEvent.click(signOutBtn)

    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', {})
  })
})
