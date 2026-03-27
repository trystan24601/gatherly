/**
 * FE-TEST-01: Component tests for <OrgEventDetailPage>
 *
 * Written in the Red phase — all tests must fail before the component exists.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --------------------------------------------------------------------------
// Module mocks
// --------------------------------------------------------------------------

vi.mock('../../lib/events', () => ({
  getEvent: vi.fn(),
  publishEvent: vi.fn(),
  cancelEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  listOrgEvents: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  createSlot: vi.fn(),
  updateSlot: vi.fn(),
  deleteSlot: vi.fn(),
}))

vi.mock('../../lib/api', () => ({
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

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { getEvent, publishEvent, deleteRole } from '../../lib/events'
import { OrgEventDetailPage } from '../../pages/OrgEventDetailPage'

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

const EVENT_ID = 'event-lifecycle-test'

function makeEvent(status: string, overrides: Record<string, unknown> = {}) {
  return {
    eventId: EVENT_ID,
    orgId: 'org-test',
    title: 'Demo Fun Run',
    eventTypeId: 'running',
    eventDate: '2027-06-15',
    startTime: '09:00',
    endTime: '17:00',
    venueName: 'Brockwell Park',
    venueAddress: 'Brockwell Park, Herne Hill',
    city: 'London',
    postcode: 'SE24 9BJ',
    status,
    createdAt: '2026-01-01T00:00:00.000Z',
    roles: [
      {
        roleId: 'role-1',
        name: 'Marshal',
        description: 'Keep runners on course',
        skillIds: [],
        slots: [
          {
            slotId: 'slot-1',
            roleId: 'role-1',
            shiftStart: '09:00',
            shiftEnd: '13:00',
            headcount: 10,
            filledCount: 3,
            status: 'OPEN',
          },
        ],
      },
    ],
    pendingRegistrationCount: 1,
    ...overrides,
  }
}

const DRAFT_EVENT = makeEvent('DRAFT')
const DRAFT_EVENT_NO_ROLES = makeEvent('DRAFT', { roles: [] })
const PUBLISHED_EVENT = makeEvent('PUBLISHED', { publishedAt: '2026-02-01T00:00:00.000Z' })
const CANCELLED_EVENT = makeEvent('CANCELLED', { cancelledAt: '2026-03-01T00:00:00.000Z' })
const COMPLETED_EVENT = makeEvent('COMPLETED', { completedAt: '2026-04-01T00:00:00.000Z' })

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/organisation/events/${EVENT_ID}`]}>
      <Routes>
        <Route path="/organisation/events/:eventId" element={<OrgEventDetailPage />} />
        <Route path="/organisation/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// --------------------------------------------------------------------------
// FE-TEST-01: OrgEventDetailPage
// --------------------------------------------------------------------------

describe('OrgEventDetailPage', () => {
  describe('rendering — loads event and displays details', () => {
    it('fetches event on mount and renders title, status badge, and roles', async () => {
      vi.mocked(getEvent).mockResolvedValue(DRAFT_EVENT as any)

      renderPage()

      await waitFor(() => {
        expect(screen.getByText('Demo Fun Run')).toBeInTheDocument()
      })
      expect(getEvent).toHaveBeenCalledWith(EVENT_ID)
      // Status badge
      expect(screen.getByText(/draft/i)).toBeInTheDocument()
      // Role
      expect(screen.getByText('Marshal')).toBeInTheDocument()
    })

    it('renders a back link to /organisation/dashboard', async () => {
      vi.mocked(getEvent).mockResolvedValue(DRAFT_EVENT as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      const backLink = screen.getByRole('link', { name: /back|dashboard/i })
      expect(backLink).toBeInTheDocument()
    })
  })

  describe('lifecycle actions — DRAFT event', () => {
    it('renders "Publish event" button when status is DRAFT', async () => {
      vi.mocked(getEvent).mockResolvedValue(DRAFT_EVENT as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      expect(screen.getByRole('button', { name: /publish event/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /cancel event/i })).not.toBeInTheDocument()
    })

    it('"Publish event" button is disabled when event has zero roles', async () => {
      vi.mocked(getEvent).mockResolvedValue(DRAFT_EVENT_NO_ROLES as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      const publishBtn = screen.getByRole('button', { name: /publish event/i })
      expect(publishBtn).toBeDisabled()
    })

    it('calls publishEvent and re-fetches event on "Publish event" click', async () => {
      const publishedEvent = { ...DRAFT_EVENT, status: 'PUBLISHED', publishedAt: '2026-05-01T00:00:00.000Z' }
      vi.mocked(getEvent)
        .mockResolvedValueOnce(DRAFT_EVENT as any)
        .mockResolvedValueOnce(publishedEvent as any)
      vi.mocked(publishEvent).mockResolvedValue(publishedEvent as any)

      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      const publishBtn = screen.getByRole('button', { name: /publish event/i })
      await userEvent.click(publishBtn)

      await waitFor(() => {
        expect(publishEvent).toHaveBeenCalledWith(EVENT_ID)
        expect(getEvent).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('lifecycle actions — PUBLISHED event', () => {
    it('renders "Cancel event" button when status is PUBLISHED', async () => {
      vi.mocked(getEvent).mockResolvedValue(PUBLISHED_EVENT as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      expect(screen.getByRole('button', { name: /cancel event/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /publish event/i })).not.toBeInTheDocument()
    })

    it('opens CancelEventModal when "Cancel event" is clicked', async () => {
      vi.mocked(getEvent).mockResolvedValue(PUBLISHED_EVENT as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      const cancelBtn = screen.getByRole('button', { name: /cancel event/i })
      await userEvent.click(cancelBtn)

      // Modal should be visible with the event title and volunteer count
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('lifecycle actions — terminal states', () => {
    it('renders read-only notice for CANCELLED event (no action buttons)', async () => {
      vi.mocked(getEvent).mockResolvedValue(CANCELLED_EVENT as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      expect(screen.queryByRole('button', { name: /publish event/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /cancel event/i })).not.toBeInTheDocument()
      // At least one element with "cancelled" text exists (badge and/or notice)
      expect(screen.getAllByText(/cancelled/i).length).toBeGreaterThan(0)
    })

    it('renders read-only notice for COMPLETED event (no action buttons)', async () => {
      vi.mocked(getEvent).mockResolvedValue(COMPLETED_EVENT as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      expect(screen.queryByRole('button', { name: /publish event/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /cancel event/i })).not.toBeInTheDocument()
      // At least one element with "completed" text exists (badge and/or notice)
      expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0)
    })
  })

  describe('roles list', () => {
    it('renders each role with name', async () => {
      vi.mocked(getEvent).mockResolvedValue(DRAFT_EVENT as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      expect(screen.getByText('Marshal')).toBeInTheDocument()
    })

    it('renders nested slots under each role', async () => {
      vi.mocked(getEvent).mockResolvedValue(DRAFT_EVENT as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      // Slot shift times should appear
      expect(screen.getByText(/09:00.+13:00/)).toBeInTheDocument()
    })
  })

  describe('FE-TEST-05: role/slot management on DRAFT event', () => {
    it('renders an "+ Add role" button when event is DRAFT', async () => {
      vi.mocked(getEvent).mockResolvedValue(DRAFT_EVENT as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      expect(screen.getByRole('button', { name: /add role/i })).toBeInTheDocument()
    })

    it('calls deleteRole and re-fetches event when role Delete is clicked', async () => {
      vi.mocked(getEvent)
        .mockResolvedValueOnce(DRAFT_EVENT as any)
        .mockResolvedValueOnce(DRAFT_EVENT as any)
      vi.mocked(deleteRole).mockResolvedValue(undefined)

      renderPage()
      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      const deleteRoleBtn = screen.getByRole('button', { name: /delete role/i })
      await userEvent.click(deleteRoleBtn)

      await waitFor(() => {
        expect(deleteRole).toHaveBeenCalledWith(EVENT_ID, 'role-1')
        expect(getEvent).toHaveBeenCalledTimes(2)
      })
    })

    it('"Publish event" button is disabled when no role has any slot', async () => {
      const draftEventNoSlots = {
        ...DRAFT_EVENT,
        roles: [{ roleId: 'role-1', name: 'Marshal', slots: [] }],
      }
      vi.mocked(getEvent).mockResolvedValue(draftEventNoSlots as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      const publishBtn = screen.getByRole('button', { name: /publish event/i })
      expect(publishBtn).toBeDisabled()
    })

    it('"Publish event" button is enabled when at least one role has at least one slot', async () => {
      vi.mocked(getEvent).mockResolvedValue(DRAFT_EVENT as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      const publishBtn = screen.getByRole('button', { name: /publish event/i })
      expect(publishBtn).not.toBeDisabled()
    })

    it('role/slot management controls are hidden when event is not DRAFT', async () => {
      vi.mocked(getEvent).mockResolvedValue(PUBLISHED_EVENT as any)
      renderPage()

      await waitFor(() => expect(screen.getByText('Demo Fun Run')).toBeInTheDocument())

      expect(screen.queryByRole('button', { name: /add role/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /add slot/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /edit role/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /delete role/i })).not.toBeInTheDocument()
    })
  })
})
