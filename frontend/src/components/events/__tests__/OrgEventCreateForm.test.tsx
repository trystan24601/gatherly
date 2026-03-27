/**
 * FE-TEST-01: Component tests for <OrgEventCreateForm>
 *
 * Written in the Red phase — tests must fail before implementation exists.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../../../context/AuthContext'

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
  createEvent: vi.fn(),
}))

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { apiClient, ApiError } from '../../../lib/api'
import { createEvent } from '../../../lib/events'

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

async function renderForm() {
  vi.mocked(apiClient.get).mockResolvedValue(ORG_ADMIN_USER)
  const { OrgEventCreateForm } = await import('../OrgEventCreateForm')
  return render(
    <MemoryRouter initialEntries={['/organisation/events/new']}>
      <AuthProvider>
        <OrgEventCreateForm />
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

describe('<OrgEventCreateForm>', () => {
  describe('renders required fields with accessible labels', () => {
    it('renders Event title field', async () => {
      await renderForm()
      expect(await screen.findByLabelText(/event title/i)).toBeInTheDocument()
    })

    it('renders Event type select', async () => {
      await renderForm()
      expect(await screen.findByLabelText(/event type/i)).toBeInTheDocument()
    })

    it('renders Date field', async () => {
      await renderForm()
      expect(await screen.findByLabelText(/date/i)).toBeInTheDocument()
    })

    it('renders Start time field', async () => {
      await renderForm()
      expect(await screen.findByLabelText(/start time/i)).toBeInTheDocument()
    })

    it('renders End time field', async () => {
      await renderForm()
      expect(await screen.findByLabelText(/end time/i)).toBeInTheDocument()
    })

    it('renders Venue name field', async () => {
      await renderForm()
      expect(await screen.findByLabelText(/venue name/i)).toBeInTheDocument()
    })

    it('renders Address field', async () => {
      await renderForm()
      expect(await screen.findByLabelText(/address/i)).toBeInTheDocument()
    })

    it('renders City field', async () => {
      await renderForm()
      expect(await screen.findByLabelText(/city/i)).toBeInTheDocument()
    })

    it('renders Postcode field', async () => {
      await renderForm()
      expect(await screen.findByLabelText(/postcode/i)).toBeInTheDocument()
    })
  })

  describe('renders optional fields', () => {
    it('renders Description textarea', async () => {
      await renderForm()
      expect(await screen.findByLabelText(/description/i)).toBeInTheDocument()
    })

    it('renders Max volunteers number input', async () => {
      await renderForm()
      expect(await screen.findByLabelText(/max volunteers/i)).toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('renders a "Save as draft" submit button', async () => {
      await renderForm()
      expect(await screen.findByRole('button', { name: /save as draft/i })).toBeInTheDocument()
    })

    it('renders a back link to /organisation/dashboard', async () => {
      await renderForm()
      const backLink = await screen.findByRole('link', { name: /back|dashboard/i })
      expect(backLink).toBeInTheDocument()
      expect(backLink).toHaveAttribute('href', '/organisation/dashboard')
    })
  })

  describe('form submission', () => {
    it('calls createEvent with correct payload (without orgId) on submit', async () => {
      vi.mocked(createEvent).mockResolvedValue({
        eventId: 'new-event-id',
        orgId: 'org-demo-runners',
        title: 'My Event',
        eventTypeId: 'running',
        eventDate: '2027-06-15',
        startTime: '09:00',
        endTime: '17:00',
        venueName: 'Test Venue',
        venueAddress: '123 Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        status: 'DRAFT' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        roles: [],
      })
      await renderForm()

      await userEvent.type(await screen.findByLabelText(/event title/i), 'My Event')
      await userEvent.selectOptions(await screen.findByLabelText(/event type/i), 'running')
      await userEvent.type(await screen.findByLabelText(/date/i), '2027-06-15')
      await userEvent.type(await screen.findByLabelText(/start time/i), '09:00')
      await userEvent.type(await screen.findByLabelText(/end time/i), '17:00')
      await userEvent.type(await screen.findByLabelText(/venue name/i), 'Test Venue')
      await userEvent.type(await screen.findByLabelText(/address/i), '123 Street')
      await userEvent.type(await screen.findByLabelText(/city/i), 'London')
      await userEvent.type(await screen.findByLabelText(/postcode/i), 'SW1A 1AA')

      await userEvent.click(screen.getByRole('button', { name: /save as draft/i }))

      await waitFor(() => {
        expect(createEvent).toHaveBeenCalledWith(
          expect.not.objectContaining({ orgId: expect.anything() })
        )
        expect(createEvent).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'My Event' })
        )
      })
    })

    it('navigates to /organisation/dashboard after successful submission', async () => {
      vi.mocked(createEvent).mockResolvedValue({
        eventId: 'new-event-id',
        orgId: 'org-demo-runners',
        title: 'My Event',
        eventTypeId: 'running',
        eventDate: '2027-06-15',
        startTime: '09:00',
        endTime: '17:00',
        venueName: 'Test Venue',
        venueAddress: '123 Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        status: 'DRAFT' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        roles: [],
      })
      await renderForm()

      await userEvent.type(await screen.findByLabelText(/event title/i), 'My Event')
      await userEvent.selectOptions(await screen.findByLabelText(/event type/i), 'running')
      await userEvent.type(await screen.findByLabelText(/date/i), '2027-06-15')
      await userEvent.type(await screen.findByLabelText(/start time/i), '09:00')
      await userEvent.type(await screen.findByLabelText(/end time/i), '17:00')
      await userEvent.type(await screen.findByLabelText(/venue name/i), 'Test Venue')
      await userEvent.type(await screen.findByLabelText(/address/i), '123 Street')
      await userEvent.type(await screen.findByLabelText(/city/i), 'London')
      await userEvent.type(await screen.findByLabelText(/postcode/i), 'SW1A 1AA')

      await userEvent.click(screen.getByRole('button', { name: /save as draft/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/organisation/dashboard')
      })
    })
  })

  describe('validation errors', () => {
    it('displays error when API returns 400 for past date', async () => {
      vi.mocked(createEvent).mockRejectedValue(
        new ApiError(400, { error: 'Event date must be in the future.' })
      )
      await renderForm()

      await userEvent.type(await screen.findByLabelText(/event title/i), 'My Event')
      await userEvent.selectOptions(await screen.findByLabelText(/event type/i), 'running')
      await userEvent.type(await screen.findByLabelText(/date/i), '2020-01-01')
      await userEvent.type(await screen.findByLabelText(/start time/i), '09:00')
      await userEvent.type(await screen.findByLabelText(/end time/i), '17:00')
      await userEvent.type(await screen.findByLabelText(/venue name/i), 'Test Venue')
      await userEvent.type(await screen.findByLabelText(/address/i), '123 Street')
      await userEvent.type(await screen.findByLabelText(/city/i), 'London')
      await userEvent.type(await screen.findByLabelText(/postcode/i), 'SW1A 1AA')

      await userEvent.click(screen.getByRole('button', { name: /save as draft/i }))

      expect(
        await screen.findByText(/event date must be in the future/i)
      ).toBeInTheDocument()
    })

    it('displays error for endTime before startTime', async () => {
      vi.mocked(createEvent).mockRejectedValue(
        new ApiError(400, { error: 'End time must be after start time.' })
      )
      await renderForm()

      await userEvent.type(await screen.findByLabelText(/event title/i), 'My Event')
      await userEvent.selectOptions(await screen.findByLabelText(/event type/i), 'running')
      await userEvent.type(await screen.findByLabelText(/date/i), '2027-06-15')
      await userEvent.type(await screen.findByLabelText(/start time/i), '17:00')
      await userEvent.type(await screen.findByLabelText(/end time/i), '09:00')
      await userEvent.type(await screen.findByLabelText(/venue name/i), 'Test Venue')
      await userEvent.type(await screen.findByLabelText(/address/i), '123 Street')
      await userEvent.type(await screen.findByLabelText(/city/i), 'London')
      await userEvent.type(await screen.findByLabelText(/postcode/i), 'SW1A 1AA')

      await userEvent.click(screen.getByRole('button', { name: /save as draft/i }))

      expect(
        await screen.findByText(/end time must be after start time/i)
      ).toBeInTheDocument()
    })

    it('displays error for invalid UK postcode', async () => {
      vi.mocked(createEvent).mockRejectedValue(
        new ApiError(400, { error: 'Please enter a valid UK postcode.' })
      )
      await renderForm()

      await userEvent.type(await screen.findByLabelText(/event title/i), 'My Event')
      await userEvent.selectOptions(await screen.findByLabelText(/event type/i), 'running')
      await userEvent.type(await screen.findByLabelText(/date/i), '2027-06-15')
      await userEvent.type(await screen.findByLabelText(/start time/i), '09:00')
      await userEvent.type(await screen.findByLabelText(/end time/i), '17:00')
      await userEvent.type(await screen.findByLabelText(/venue name/i), 'Test Venue')
      await userEvent.type(await screen.findByLabelText(/address/i), '123 Street')
      await userEvent.type(await screen.findByLabelText(/city/i), 'London')
      await userEvent.type(await screen.findByLabelText(/postcode/i), 'SW1A1AA')

      await userEvent.click(screen.getByRole('button', { name: /save as draft/i }))

      expect(
        await screen.findByText(/valid UK postcode/i)
      ).toBeInTheDocument()
    })
  })
})
