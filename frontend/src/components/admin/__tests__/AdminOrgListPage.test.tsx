/**
 * FE-TEST-04: Component tests for <AdminOrgListPage>
 *
 * Written in the Red phase — tests must fail before implementation exists.
 */
import { render, screen, waitFor } from '@testing-library/react'
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

vi.mock('../../../lib/organisations', () => ({
  getAdminOrgs: vi.fn(),
}))

beforeEach(() => {
  vi.resetAllMocks()
})

const SUPER_ADMIN_USER = {
  userId: 'user-super',
  email: 'super@gatherlywork.com',
  firstName: 'Super',
  lastName: 'Admin',
  role: 'SUPER_ADMIN',
}

const PENDING_ORGS_PAGE_1 = {
  items: [
    {
      orgId: 'org-pending-1',
      name: 'Pending Running Club',
      orgType: 'SPORTS_CLUB',
      status: 'PENDING',
      submittedAt: '2026-03-01T10:00:00.000Z',
    },
    {
      orgId: 'org-pending-2',
      name: 'Pending Charity',
      orgType: 'CHARITY',
      status: 'PENDING',
      submittedAt: '2026-03-02T10:00:00.000Z',
    },
  ],
  cursor: 'next-page-cursor',
}

const PENDING_ORGS_PAGE_2 = {
  items: [
    {
      orgId: 'org-pending-3',
      name: 'Another Pending Org',
      orgType: 'COMMUNITY',
      status: 'PENDING',
      submittedAt: '2026-03-03T10:00:00.000Z',
    },
  ],
  cursor: null,
}

async function renderPage() {
  ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(SUPER_ADMIN_USER)
  const { AdminOrgListPage } = await import('../../../pages/AdminOrgListPage')
  return render(
    <MemoryRouter initialEntries={['/admin/organisations']}>
      <AuthProvider>
        <AdminOrgListPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('<AdminOrgListPage>', () => {
  it('renders a list of pending orgs from mocked API', async () => {
    const { getAdminOrgs } = await import('../../../lib/organisations')
    ;(getAdminOrgs as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORGS_PAGE_1)

    await renderPage()

    await waitFor(() => {
      expect(screen.getByText('Pending Running Club')).toBeInTheDocument()
      expect(screen.getByText('Pending Charity')).toBeInTheDocument()
    })
  })

  it('renders org name, type, status badge for each row', async () => {
    const { getAdminOrgs } = await import('../../../lib/organisations')
    ;(getAdminOrgs as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORGS_PAGE_1)

    await renderPage()

    await waitFor(() => {
      expect(screen.getByText('Pending Running Club')).toBeInTheDocument()
      // Status badge
      const badges = screen.getAllByText(/pending/i)
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  it('shows "Load more" button when cursor is non-null', async () => {
    const { getAdminOrgs } = await import('../../../lib/organisations')
    ;(getAdminOrgs as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORGS_PAGE_1)

    await renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
    })
  })

  it('hides "Load more" button when cursor is null', async () => {
    const { getAdminOrgs } = await import('../../../lib/organisations')
    ;(getAdminOrgs as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORGS_PAGE_2)

    await renderPage()

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    })
  })

  it('clicking "Load more" appends next page of results', async () => {
    const { getAdminOrgs } = await import('../../../lib/organisations')
    ;(getAdminOrgs as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(PENDING_ORGS_PAGE_1)
      .mockResolvedValueOnce(PENDING_ORGS_PAGE_2)

    await renderPage()

    await waitFor(() => {
      expect(screen.getByText('Pending Running Club')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /load more/i }))

    await waitFor(() => {
      expect(screen.getByText('Pending Running Club')).toBeInTheDocument()
      expect(screen.getByText('Pending Charity')).toBeInTheDocument()
      expect(screen.getByText('Another Pending Org')).toBeInTheDocument()
    })
  })
})
