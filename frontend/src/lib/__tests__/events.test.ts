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
import { createEvent, updateEvent, getEvent, listOrgEvents, publishEvent, cancelEvent, createRole, updateRole, deleteRole, createSlot, updateSlot, deleteSlot } from '../events'
import type { EventRole, EventSlot } from '../events'

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

// --------------------------------------------------------------------------
// FE-TEST-01: Role and slot API client functions
// --------------------------------------------------------------------------

const ROLE_RESULT: EventRole = {
  roleId: 'role-abc',
  name: 'Marshal',
  description: 'Keep runners on course',
  skillIds: [],
  slots: [],
}

const SLOT_RESULT: EventSlot = {
  slotId: 'slot-abc',
  roleId: 'role-abc',
  shiftStart: '09:00',
  shiftEnd: '13:00',
  headcount: 5,
  filledCount: 0,
  status: 'OPEN',
}

describe('createRole', () => {
  it('calls apiClient.post with /organisation/events/:eventId/roles and payload', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(ROLE_RESULT)

    const result = await createRole('event-123', { name: 'Marshal' })

    expect(apiClient.post).toHaveBeenCalledWith(
      '/organisation/events/event-123/roles',
      { name: 'Marshal' }
    )
    expect(result).toEqual(ROLE_RESULT)
  })
})

describe('updateRole', () => {
  it('calls apiClient.patch with /organisation/events/:eventId/roles/:roleId and patch', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ ...ROLE_RESULT, name: 'Updated Marshal' })

    const result = await updateRole('event-123', 'role-abc', { name: 'Updated Marshal' })

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/organisation/events/event-123/roles/role-abc',
      { name: 'Updated Marshal' }
    )
    expect(result).toEqual({ ...ROLE_RESULT, name: 'Updated Marshal' })
  })
})

describe('deleteRole', () => {
  it('calls apiClient.delete with /organisation/events/:eventId/roles/:roleId', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined)

    await deleteRole('event-123', 'role-abc')

    expect(apiClient.delete).toHaveBeenCalledWith(
      '/organisation/events/event-123/roles/role-abc'
    )
  })
})

describe('createSlot', () => {
  it('calls apiClient.post with /organisation/events/:eventId/roles/:roleId/slots and payload', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(SLOT_RESULT)

    const result = await createSlot('event-123', 'role-abc', {
      shiftStart: '09:00',
      shiftEnd: '13:00',
      headcount: 5,
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      '/organisation/events/event-123/roles/role-abc/slots',
      { shiftStart: '09:00', shiftEnd: '13:00', headcount: 5 }
    )
    expect(result).toEqual(SLOT_RESULT)
  })
})

describe('updateSlot', () => {
  it('calls apiClient.patch with /organisation/events/:eventId/roles/:roleId/slots/:slotId and patch', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ ...SLOT_RESULT, headcount: 10 })

    const result = await updateSlot('event-123', 'role-abc', 'slot-abc', { headcount: 10 })

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/organisation/events/event-123/roles/role-abc/slots/slot-abc',
      { headcount: 10 }
    )
    expect(result).toEqual({ ...SLOT_RESULT, headcount: 10 })
  })
})

describe('deleteSlot', () => {
  it('calls apiClient.delete with /organisation/events/:eventId/roles/:roleId/slots/:slotId', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined)

    await deleteSlot('event-123', 'role-abc', 'slot-abc')

    expect(apiClient.delete).toHaveBeenCalledWith(
      '/organisation/events/event-123/roles/role-abc/slots/slot-abc'
    )
  })
})

// --------------------------------------------------------------------------
// FE-TEST-06: Type checks for EventSlot and EventRole
// --------------------------------------------------------------------------

describe('EventRole type includes slots field', () => {
  it('EventRole has slots: EventSlot[] field', () => {
    const role: EventRole = {
      roleId: 'r1',
      name: 'Marshal',
      slots: [],
    }
    expect(role.slots).toEqual([])
  })

  it('EventRole can have optional description and skillIds', () => {
    const role: EventRole = {
      roleId: 'r1',
      name: 'Marshal',
      description: 'Keep runners safe',
      skillIds: ['first-aid'],
      slots: [],
    }
    expect(role.description).toBe('Keep runners safe')
    expect(role.skillIds).toEqual(['first-aid'])
  })
})

describe('EventSlot type has correct fields', () => {
  it('EventSlot has required fields: slotId, roleId, shiftStart, shiftEnd, headcount, filledCount, status', () => {
    const slot: EventSlot = {
      slotId: 's1',
      roleId: 'r1',
      shiftStart: '09:00',
      shiftEnd: '13:00',
      headcount: 5,
      filledCount: 0,
      status: 'OPEN',
    }
    expect(slot.slotId).toBe('s1')
    expect(slot.status).toBe('OPEN')
  })

  it('EventSlot has optional location field', () => {
    const slot: EventSlot = {
      slotId: 's1',
      roleId: 'r1',
      shiftStart: '09:00',
      shiftEnd: '13:00',
      headcount: 5,
      filledCount: 0,
      status: 'OPEN',
      location: 'Start line',
    }
    expect(slot.location).toBe('Start line')
  })
})
