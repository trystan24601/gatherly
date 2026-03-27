/**
 * FE-TEST-02: Component tests for <CancelEventModal>
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

vi.mock('../../../lib/events', () => ({
  cancelEvent: vi.fn(),
  getEvent: vi.fn(),
  publishEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  listOrgEvents: vi.fn(),
}))

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

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { cancelEvent } from '../../../lib/events'
import { CancelEventModal } from '../CancelEventModal'

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const EVENT_ID = 'event-test-123'
const EVENT_TITLE = 'Demo Fun Run'

function renderModal(
  overrides: Partial<{
    eventTitle: string
    registeredCount: number
    eventId: string
    onClose: () => void
  }> = {}
) {
  const onClose = overrides.onClose ?? vi.fn()
  return {
    onClose,
    ...render(
      <MemoryRouter initialEntries={[`/organisation/events/${EVENT_ID}`]}>
        <Routes>
          <Route
            path="/organisation/events/:eventId"
            element={
              <CancelEventModal
                eventTitle={overrides.eventTitle ?? EVENT_TITLE}
                registeredCount={overrides.registeredCount ?? 3}
                eventId={overrides.eventId ?? EVENT_ID}
                onClose={onClose}
              />
            }
          />
          <Route
            path="/organisation/dashboard"
            element={<div data-testid="dashboard">Dashboard</div>}
          />
        </Routes>
      </MemoryRouter>
    ),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// --------------------------------------------------------------------------
// FE-TEST-02: CancelEventModal
// --------------------------------------------------------------------------

describe('CancelEventModal', () => {
  describe('rendering', () => {
    it('renders the modal with event title and registered volunteer count in copy', () => {
      renderModal({ registeredCount: 3 })

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/demo fun run/i)).toBeInTheDocument()
      expect(screen.getByText(/3/)).toBeInTheDocument()
    })

    it('renders "Keep event" secondary button', () => {
      renderModal()

      expect(screen.getByRole('button', { name: /keep event/i })).toBeInTheDocument()
    })

    it('renders "Cancel event" destructive button', () => {
      renderModal()

      expect(screen.getByRole('button', { name: /cancel event/i })).toBeInTheDocument()
    })

    it('displays "This action cannot be undone" warning', () => {
      renderModal()

      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
    })
  })

  describe('"Keep event" button', () => {
    it('calls onClose when "Keep event" is clicked without making an API call', async () => {
      const onClose = vi.fn()
      renderModal({ onClose })

      await userEvent.click(screen.getByRole('button', { name: /keep event/i }))

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(cancelEvent).not.toHaveBeenCalled()
    })
  })

  describe('"Cancel event" button', () => {
    it('calls cancelEvent with the eventId on confirm', async () => {
      vi.mocked(cancelEvent).mockResolvedValue({
        eventId: EVENT_ID,
        status: 'CANCELLED',
        cancelledAt: '2026-05-01T00:00:00.000Z',
      } as any)

      renderModal()

      await userEvent.click(screen.getByRole('button', { name: /cancel event/i }))

      await waitFor(() => {
        expect(cancelEvent).toHaveBeenCalledWith(EVENT_ID)
      })
    })

    it('disables the "Cancel event" button while loading', async () => {
      // Make cancelEvent hang so we can observe the loading state
      let resolve: () => void
      const promise = new Promise<void>((r) => { resolve = r })
      vi.mocked(cancelEvent).mockReturnValue(promise as any)

      renderModal()

      const cancelBtn = screen.getByRole('button', { name: /cancel event/i })
      await userEvent.click(cancelBtn)

      await waitFor(() => {
        expect(cancelBtn).toBeDisabled()
      })

      resolve!()
    })

    it('navigates to /organisation/dashboard on success', async () => {
      vi.mocked(cancelEvent).mockResolvedValue({
        eventId: EVENT_ID,
        status: 'CANCELLED',
        cancelledAt: '2026-05-01T00:00:00.000Z',
      } as any)

      renderModal()

      await userEvent.click(screen.getByRole('button', { name: /cancel event/i }))

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      })
    })

    it('displays error message inside modal on API failure', async () => {
      const { ApiError } = await import('../../../lib/api')
      vi.mocked(cancelEvent).mockRejectedValue(
        new ApiError(409, { error: 'Completed events cannot be cancelled.' })
      )

      renderModal()

      await userEvent.click(screen.getByRole('button', { name: /cancel event/i }))

      await waitFor(() => {
        expect(screen.getByText(/completed events cannot be cancelled/i)).toBeInTheDocument()
      })
    })
  })
})
