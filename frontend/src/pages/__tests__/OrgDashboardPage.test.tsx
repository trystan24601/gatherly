/**
 * FE-TEST-03: Component tests for <OrgDashboardPage>
 *
 * Written in the Red phase — tests must fail before implementation exists.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../../context/AuthContext'
import type { EventSummary } from '../../lib/events'

// --------------------------------------------------------------------------
// Module mocks
// --------------------------------------------------------------------------

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

vi.mock('../../lib/events', () => ({
  listOrgEvents: vi.fn(),
}))

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { apiClient } from '../../lib/api'
import { listOrgEvents } from '../../lib/events'

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
  orgName: 'Gatherly Demo Runners',
  orgStatus: 'APPROVED',
}

const DRAFT_EVENT: EventSummary = {
  eventId: 'event-draft-1',
  title: 'Draft Event',
  eventDate: '2027-06-15',
  status: 'DRAFT',
  totalRoles: 2,
  totalHeadcount: 15,
  filledCount: 5,
  fillRate: 0.333,
}

const PUBLISHED_EVENT: EventSummary = {
  eventId: 'event-pub-1',
  title: 'Published Event',
  eventDate: '2027-07-20',
  status: 'PUBLISHED',
  totalRoles: 1,
  totalHeadcount: 10,
  filledCount: 10,
  fillRate: 1.0,
}

async function renderPage() {
  vi.mocked(apiClient.get).mockResolvedValue(ORG_ADMIN_USER)
  const { OrgDashboardPage } = await import('../OrgDashboardPage')
  return render(
    <MemoryRouter initialEntries={['/organisation/dashboard']}>
      <AuthProvider>
        <OrgDashboardPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('<OrgDashboardPage>', () => {
  describe('data fetching', () => {
    it('calls listOrgEvents on mount with limit=20', async () => {
      vi.mocked(listOrgEvents).mockResolvedValue({ events: [], cursor: null })
      await renderPage()
      await waitFor(() => {
        expect(listOrgEvents).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }))
      })
    })
  })

  describe('events table', () => {
    it('renders events table with Title, Date, Status, Fill columns', async () => {
      vi.mocked(listOrgEvents).mockResolvedValue({ events: [DRAFT_EVENT], cursor: null })
      await renderPage()

      expect(await screen.findByText(/title/i)).toBeInTheDocument()
      expect(await screen.findByText(/date/i)).toBeInTheDocument()
      expect(await screen.findByText(/status/i)).toBeInTheDocument()
      expect(await screen.findByText(/fill/i)).toBeInTheDocument()
    })

    it('renders event title in table row', async () => {
      vi.mocked(listOrgEvents).mockResolvedValue({ events: [DRAFT_EVENT], cursor: null })
      await renderPage()
      expect(await screen.findByText('Draft Event')).toBeInTheDocument()
    })

    it('renders fill column as filledCount/totalHeadcount', async () => {
      vi.mocked(listOrgEvents).mockResolvedValue({ events: [DRAFT_EVENT], cursor: null })
      await renderPage()
      // 5/15 fill
      expect(await screen.findByText(/5\s*\/\s*15/)).toBeInTheDocument()
    })
  })

  describe('status badges', () => {
    it('renders DRAFT badge with grey styling', async () => {
      vi.mocked(listOrgEvents).mockResolvedValue({ events: [DRAFT_EVENT], cursor: null })
      await renderPage()
      const badge = await screen.findByText('DRAFT')
      expect(badge).toBeInTheDocument()
      // grey styling — expect class containing grey
      expect(badge.className).toMatch(/grey|gray|slate|neutral/i)
    })

    it('renders PUBLISHED badge with green styling', async () => {
      vi.mocked(listOrgEvents).mockResolvedValue({ events: [PUBLISHED_EVENT], cursor: null })
      await renderPage()
      const badge = await screen.findByText('PUBLISHED')
      expect(badge).toBeInTheDocument()
      expect(badge.className).toMatch(/green|emerald/i)
    })
  })

  describe('empty state', () => {
    it('renders empty state message when events array is empty (AC-10)', async () => {
      vi.mocked(listOrgEvents).mockResolvedValue({ events: [], cursor: null })
      await renderPage()
      expect(
        await screen.findByText(/no events yet|create your first event|haven't created/i)
      ).toBeInTheDocument()
    })
  })

  describe('create event CTA', () => {
    it('renders a "Create event" button/link', async () => {
      vi.mocked(listOrgEvents).mockResolvedValue({ events: [], cursor: null })
      await renderPage()
      const createLink = await screen.findByRole('link', { name: /create event/i })
      expect(createLink).toBeInTheDocument()
      expect(createLink).toHaveAttribute('href', '/organisation/events/new')
    })
  })

  describe('pagination', () => {
    it('renders a "Load more" button when cursor is not null', async () => {
      vi.mocked(listOrgEvents).mockResolvedValue({ events: [DRAFT_EVENT], cursor: 'next-cursor' })
      await renderPage()
      expect(await screen.findByRole('button', { name: /load more/i })).toBeInTheDocument()
    })

    it('does not render "Load more" when cursor is null', async () => {
      vi.mocked(listOrgEvents).mockResolvedValue({ events: [DRAFT_EVENT], cursor: null })
      await renderPage()
      await screen.findByText('Draft Event') // wait for render
      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    })

    it('fetches the next page and appends events when "Load more" is clicked', async () => {
      vi.mocked(listOrgEvents)
        .mockResolvedValueOnce({ events: [DRAFT_EVENT], cursor: 'next-cursor' })
        .mockResolvedValueOnce({ events: [PUBLISHED_EVENT], cursor: null })

      await renderPage()

      const loadMore = await screen.findByRole('button', { name: /load more/i })
      await userEvent.click(loadMore)

      expect(await screen.findByText('Draft Event')).toBeInTheDocument()
      expect(await screen.findByText('Published Event')).toBeInTheDocument()
    })
  })
})
