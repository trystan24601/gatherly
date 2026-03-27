/**
 * FE-TEST-04: Unit tests for frontend/src/lib/events.ts
 *
 * Written in the Red phase — these tests must fail before implementation exists.
 * They specify the expected API client calls for each event library function.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --------------------------------------------------------------------------
// Module mock
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

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { apiClient } from '../../lib/api'
import { createEvent, updateEvent, getEvent, listOrgEvents, publishEvent, cancelEvent } from '../events'

const VALID_PAYLOAD = {
  title: 'Test Event',
  eventTypeId: 'running',
  eventDate: '2027-06-15',
  startTime: '09:00',
  endTime: '17:00',
  venueName: 'Test Venue',
  venueAddress: '123 Test Street',
  city: 'London',
  postcode: 'SW1A 1AA',
}

const CREATED_EVENT = {
  eventId: 'event-123',
  orgId: 'org-abc',
  ...VALID_PAYLOAD,
  status: 'DRAFT',
  createdAt: '2026-01-01T00:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createEvent', () => {
  it('calls apiClient.post with /organisation/events and the payload', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(CREATED_EVENT)

    const result = await createEvent(VALID_PAYLOAD)

    expect(apiClient.post).toHaveBeenCalledWith('/organisation/events', VALID_PAYLOAD)
    expect(result).toEqual(CREATED_EVENT)
  })
})

describe('updateEvent', () => {
  it('calls apiClient.patch with /organisation/events/:eventId and the patch', async () => {
    const patch = { title: 'Updated Title' }
    const updated = { ...CREATED_EVENT, title: 'Updated Title' }
    vi.mocked(apiClient.patch).mockResolvedValue(updated)

    const result = await updateEvent('event-123', patch)

    expect(apiClient.patch).toHaveBeenCalledWith('/organisation/events/event-123', patch)
    expect(result).toEqual(updated)
  })
})

describe('getEvent', () => {
  it('calls apiClient.get with /organisation/events/:eventId and returns event + roles', async () => {
    const eventWithRoles = { ...CREATED_EVENT, roles: [] }
    vi.mocked(apiClient.get).mockResolvedValue(eventWithRoles)

    const result = await getEvent('event-123')

    expect(apiClient.get).toHaveBeenCalledWith('/organisation/events/event-123')
    expect(result).toEqual(eventWithRoles)
  })
})

describe('listOrgEvents', () => {
  it('calls apiClient.get with /organisation/events?limit=20 by default', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ events: [], cursor: null })

    await listOrgEvents()

    expect(apiClient.get).toHaveBeenCalledWith('/organisation/events?limit=20')
  })

  it('includes cursor param when provided', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ events: [], cursor: null })

    await listOrgEvents({ limit: 10, cursor: 'abc123' })

    expect(apiClient.get).toHaveBeenCalledWith('/organisation/events?limit=10&cursor=abc123')
  })

  it('returns the events list response', async () => {
    const response = { events: [CREATED_EVENT], cursor: null }
    vi.mocked(apiClient.get).mockResolvedValue(response)

    const result = await listOrgEvents()

    expect(result).toEqual(response)
  })
})

// --------------------------------------------------------------------------
// FE-TEST-03: publishEvent and cancelEvent
// --------------------------------------------------------------------------

describe('publishEvent', () => {
  it('calls apiClient.post with /organisation/events/:eventId/publish (no body)', async () => {
    const publishedEvent = { ...CREATED_EVENT, status: 'PUBLISHED', publishedAt: '2026-05-01T00:00:00.000Z' }
    vi.mocked(apiClient.post).mockResolvedValue(publishedEvent)

    const result = await publishEvent('event-123')

    expect(apiClient.post).toHaveBeenCalledWith('/organisation/events/event-123/publish', undefined)
    expect(result).toEqual(publishedEvent)
  })
})

describe('cancelEvent', () => {
  it('calls apiClient.post with /organisation/events/:eventId/cancel (no body)', async () => {
    const cancelledEvent = { ...CREATED_EVENT, status: 'CANCELLED', cancelledAt: '2026-06-01T00:00:00.000Z' }
    vi.mocked(apiClient.post).mockResolvedValue(cancelledEvent)

    const result = await cancelEvent('event-123')

    expect(apiClient.post).toHaveBeenCalledWith('/organisation/events/event-123/cancel', undefined)
    expect(result).toEqual(cancelledEvent)
  })
})
