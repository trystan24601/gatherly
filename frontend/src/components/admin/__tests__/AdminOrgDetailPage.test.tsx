/**
 * FE-TEST-05: Component tests for <AdminOrgDetailPage>
 *
 * Written in the Red phase — tests must fail before implementation exists.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
  getAdminOrgDetail: vi.fn(),
  approveOrg: vi.fn(),
  rejectOrg: vi.fn(),
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

const PENDING_ORG_DETAIL = {
  orgId: 'org-pending-1',
  name: 'Pending Running Club',
  orgType: 'SPORTS_CLUB',
  description: 'A community running club for testing.',
  status: 'PENDING',
  contactEmail: 'hello@pending-running.co.uk',
  contactPhone: '07700900100',
  adminUserId: 'user-org-admin',
  submittedAt: '2026-03-01T10:00:00.000Z',
}

async function renderPage() {
  (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(SUPER_ADMIN_USER)
  const { AdminOrgDetailPage } = await import('../../../pages/AdminOrgDetailPage')
  return render(
    <MemoryRouter initialEntries={['/admin/organisations/org-pending-1']}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/organisations/:orgId" element={<AdminOrgDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('<AdminOrgDetailPage>', () => {
  it('renders all org detail fields', async () => {
    const { getAdminOrgDetail } = await import('../../../lib/organisations')
    ;(getAdminOrgDetail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORG_DETAIL)

    await renderPage()

    await waitFor(() => {
      expect(screen.getByText('Pending Running Club')).toBeInTheDocument()
      expect(screen.getByText(/sports club/i)).toBeInTheDocument()
      expect(screen.getByText(/A community running club for testing/i)).toBeInTheDocument()
      expect(screen.getByText(/hello@pending-running\.co\.uk/i)).toBeInTheDocument()
    })
  })

  it('renders an "Approve" button for PENDING orgs', async () => {
    const { getAdminOrgDetail } = await import('../../../lib/organisations')
    ;(getAdminOrgDetail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORG_DETAIL)

    await renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    })
  })

  it('renders a "Reject" button for PENDING orgs', async () => {
    const { getAdminOrgDetail } = await import('../../../lib/organisations')
    ;(getAdminOrgDetail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORG_DETAIL)

    await renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
    })
  })

  it('calls approveOrg and updates status on Approve click', async () => {
    const { getAdminOrgDetail, approveOrg } = await import('../../../lib/organisations')
    ;(getAdminOrgDetail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORG_DETAIL)
    ;(approveOrg as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...PENDING_ORG_DETAIL,
      status: 'APPROVED',
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /approve/i }))

    await waitFor(() => {
      expect(approveOrg).toHaveBeenCalledWith('org-pending-1')
    })
  })

  it('reveals a reason textarea when Reject button is clicked', async () => {
    const { getAdminOrgDetail } = await import('../../../lib/organisations')
    ;(getAdminOrgDetail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORG_DETAIL)

    await renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /reject/i }))

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /reason/i })).toBeInTheDocument()
    })
  })

  it('submit reject is disabled if reason < 10 chars', async () => {
    const { getAdminOrgDetail } = await import('../../../lib/organisations')
    ;(getAdminOrgDetail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORG_DETAIL)

    await renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }))

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /reason/i })).toBeInTheDocument()
    })

    const reasonInput = screen.getByRole('textbox', { name: /reason/i })
    await userEvent.type(reasonInput, 'Too short')

    const submitRejectBtn = screen.getByRole('button', { name: /submit rejection|confirm reject/i })
    expect(submitRejectBtn).toBeDisabled()
  })

  it('calls rejectOrg with reason when rejection is submitted', async () => {
    const { getAdminOrgDetail, rejectOrg } = await import('../../../lib/organisations')
    ;(getAdminOrgDetail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORG_DETAIL)
    ;(rejectOrg as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...PENDING_ORG_DETAIL,
      status: 'REJECTED',
      rejectionReason: 'The organisation details could not be verified.',
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }))

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /reason/i })).toBeInTheDocument()
    })

    const reasonInput = screen.getByRole('textbox', { name: /reason/i })
    const validReason = 'The organisation details could not be verified.'
    await userEvent.type(reasonInput, validReason)

    await userEvent.click(screen.getByRole('button', { name: /submit rejection|confirm reject/i }))

    await waitFor(() => {
      expect(rejectOrg).toHaveBeenCalledWith('org-pending-1', validReason)
    })
  })
})
