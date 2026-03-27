/**
 * FE-TEST-02: Component tests for <OrgEventEditForm>
 *
 * Written in the Red phase — tests must fail before implementation exists.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../../../context/AuthContext'
import type { EventDetail } from '../../../lib/events'

// --------------------------------------------------------------------------
// Module mocks
// --------------------------------------------------------------------------

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../../lib/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, public body: unknown) {
      super(`HTTP ${status}`)
      this.name = 'ApiError'
    }
  },
}))

vi.mock('../../../lib/events', () => ({
  updateEvent: vi.fn(),
}))

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { apiClient, ApiError } from '../../../lib/api'
import { updateEvent } from '../../../lib/events'

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const ORG_ADMIN_USER = {
  userId: 'user-admin',
  email: 'admin@gatherlydemohq.com',
  firstName: 'Demo',
  lastName: 'Admin',
  role: 'ORG_ADMIN',
  orgId: 'org-demo-runners',
  orgStatus: 'APPROVED',
}

const DRAFT_EVENT: EventDetail = {
  eventId: 'event-draft-1',
  orgId: 'org-demo-runners',
  title: 'Original Title',
  eventTypeId: 'running',
  eventDate: '2027-06-15',
  startTime: '09:00',
  endTime: '17:00',
  venueName: 'Original Venue',
  venueAddress: '123 Original Street',
  city: 'London',
  postcode: 'SW1A 1AA',
  status: 'DRAFT',
  createdAt: '2026-01-01T00:00:00.000Z',
  roles: [],
}

async function renderForm(event = DRAFT_EVENT) {
  vi.mocked(apiClient.get).mockResolvedValue(ORG_ADMIN_USER)
  const { OrgEventEditForm } = await import('../OrgEventEditForm')
  return render(
    <MemoryRouter initialEntries={[`/organisation/events/${event.eventId}/edit`]}>
      <AuthProvider>
        <OrgEventEditForm event={event} />
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mockNavigate.mockReset()
})

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('<OrgEventEditForm>', () => {
  it('pre-populates all fields from the event passed as props', async () => {
    await renderForm()

    expect(await screen.findByDisplayValue('Original Title')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Original Venue')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('SW1A 1AA')).toBeInTheDocument()
  })

  it('calls updateEvent with the eventId and changed fields on submit', async () => {
    vi.mocked(updateEvent).mockResolvedValue({ ...DRAFT_EVENT, title: 'Updated Title' })
    await renderForm()

    const titleInput = await screen.findByDisplayValue('Original Title')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Updated Title')

    await userEvent.click(screen.getByRole('button', { name: /save|update/i }))

    await waitFor(() => {
      expect(updateEvent).toHaveBeenCalledWith(
        'event-draft-1',
        expect.objectContaining({ title: 'Updated Title' })
      )
    })
  })

  it('navigates to /organisation/dashboard after successful update', async () => {
    vi.mocked(updateEvent).mockResolvedValue({ ...DRAFT_EVENT, title: 'Updated Title' })
    await renderForm()

    const titleInput = await screen.findByDisplayValue('Original Title')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Updated Title')

    await userEvent.click(screen.getByRole('button', { name: /save|update/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/organisation/dashboard')
    })
  })

  it('displays a 409 error banner: "Only DRAFT events can be edited."', async () => {
    vi.mocked(updateEvent).mockRejectedValue(
      new ApiError(409, { error: 'Only DRAFT events can be edited.' })
    )
    await renderForm()

    await userEvent.click(await screen.findByRole('button', { name: /save|update/i }))

    expect(
      await screen.findByText(/only draft events can be edited/i)
    ).toBeInTheDocument()
  })
})
