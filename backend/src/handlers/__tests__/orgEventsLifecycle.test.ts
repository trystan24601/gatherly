/**
 * BE-TEST-01: POST /organisation/events/:eventId/publish
 * BE-TEST-02: POST /organisation/events/:eventId/cancel
 *
 * Written in the Red phase — all tests must fail before implementation exists.
 *
 * Strategy: same mock approach as orgEvents.test.ts — mock DynamoDB, session,
 * orgMailer, and rateLimiter at module level; the Express app is imported from
 * ../../app.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// --------------------------------------------------------------------------
// Module mocks — hoisted before any imports that use them
// --------------------------------------------------------------------------

vi.mock('../../lib/dynamodb', () => ({
  getItem: vi.fn(),
  putItem: vi.fn().mockResolvedValue(undefined),
  deleteItem: vi.fn().mockResolvedValue(undefined),
  updateItem: vi.fn().mockResolvedValue(undefined),
  transactWrite: vi.fn().mockResolvedValue(undefined),
  queryItems: vi.fn().mockResolvedValue([]),
  queryItemsPaginated: vi.fn().mockResolvedValue({ items: [], lastEvaluatedKey: undefined }),
}))

vi.mock('../../lib/session', () => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  deleteSession: vi.fn(),
  isSessionExpired: vi.fn().mockReturnValue(false),
}))

vi.mock('../../lib/orgMailer', () => ({
  enqueueOrgSubmitted: vi.fn().mockResolvedValue(undefined),
  enqueueOrgApproved: vi.fn().mockResolvedValue(undefined),
  enqueueOrgRejected: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../lib/eventMailer', () => ({
  enqueueEventCancelled: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../lib/rateLimiter', () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
  recordFailedAttempt: vi.fn().mockReturnValue(false),
  resetLimiter: vi.fn(),
}))

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { app } from '../../app'
import { getItem, queryItems, updateItem, transactWrite } from '../../lib/dynamodb'
import { getSession, isSessionExpired } from '../../lib/session'
import { enqueueEventCancelled } from '../../lib/eventMailer'

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

const ORG_ID = 'org-approved-test'
const OTHER_ORG_ID = 'org-other-test'
const EVENT_ID = 'event-lifecycle-test'

function futureDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

const ORG_ADMIN_SESSION = {
  sessionId: 'sess-org-admin',
  userId: 'user-org-admin',
  role: 'ORG_ADMIN',
  orgId: ORG_ID,
  createdAt: new Date().toISOString(),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
}

const PENDING_ORG_SESSION = {
  sessionId: 'sess-pending-admin',
  userId: 'user-pending-admin',
  role: 'ORG_ADMIN',
  orgId: 'org-pending-test',
  createdAt: new Date().toISOString(),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
}

const VOLUNTEER_SESSION = {
  sessionId: 'sess-volunteer',
  userId: 'user-volunteer',
  role: 'VOLUNTEER',
  createdAt: new Date().toISOString(),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
}

const APPROVED_ORG_ITEM = {
  PK: `ORG#${ORG_ID}`,
  SK: 'PROFILE',
  orgId: ORG_ID,
  name: 'Test Approved Org',
  status: 'APPROVED',
}

const PENDING_ORG_ITEM = {
  PK: 'ORG#org-pending-test',
  SK: 'PROFILE',
  orgId: 'org-pending-test',
  name: 'Test Pending Org',
  status: 'PENDING',
}

function makeDraftEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    PK: `EVENT#${EVENT_ID}`,
    SK: 'PROFILE',
    eventId: EVENT_ID,
    orgId: ORG_ID,
    title: 'Test Event',
    eventTypeId: 'running',
    eventDate: futureDate(),
    startTime: '09:00',
    endTime: '17:00',
    venueName: 'Test Venue',
    venueAddress: '123 Test Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    status: 'DRAFT',
    createdAt: '2026-01-01T00:00:00.000Z',
    GSI3PK: 'EVENT_STATUS#DRAFT',
    GSI3SK: `${futureDate()}#${EVENT_ID}`,
    GSI4PK: `ORG#${ORG_ID}`,
    GSI4SK: `${futureDate()}#${EVENT_ID}`,
    ...overrides,
  }
}

const DRAFT_EVENT = makeDraftEvent()
const PUBLISHED_EVENT = makeDraftEvent({ status: 'PUBLISHED', GSI3PK: 'EVENT_STATUS#PUBLISHED', publishedAt: '2026-02-01T00:00:00.000Z' })
const ACTIVE_EVENT = makeDraftEvent({ status: 'ACTIVE', GSI3PK: 'EVENT_STATUS#ACTIVE' })
const CANCELLED_EVENT = makeDraftEvent({ status: 'CANCELLED', GSI3PK: 'EVENT_STATUS#CANCELLED', cancelledAt: '2026-03-01T00:00:00.000Z' })
const COMPLETED_EVENT = makeDraftEvent({ status: 'COMPLETED', GSI3PK: 'EVENT_STATUS#COMPLETED', completedAt: '2026-04-01T00:00:00.000Z' })
const OTHER_ORG_EVENT = makeDraftEvent({ orgId: OTHER_ORG_ID, GSI4PK: `ORG#${OTHER_ORG_ID}` })

const ROLE_ITEM = {
  PK: `EVENT#${EVENT_ID}`,
  SK: 'ROLE#role-1',
  roleId: 'role-1',
  eventId: EVENT_ID,
  name: 'Marshal',
  capacity: 10,
  filledCount: 0,
}

const PENDING_REG_ITEM = {
  PK: 'REG#reg-1',
  SK: 'META',
  regId: 'reg-1',
  eventId: EVENT_ID,
  roleId: 'role-1',
  volunteerId: 'user-vol-1',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00.000Z',
  GSI4PK: `EVENT#${EVENT_ID}`,
  GSI4SK: 'REG#reg-1',
}

function mockSession(session: typeof ORG_ADMIN_SESSION | typeof VOLUNTEER_SESSION | null) {
  vi.mocked(getSession).mockResolvedValue(session as any)
  vi.mocked(isSessionExpired).mockReturnValue(false)
}


beforeEach(() => {
  vi.clearAllMocks()
  process.env.DYNAMODB_TABLE_NAME = 'test-table'
})

// --------------------------------------------------------------------------
// BE-TEST-01: POST /organisation/events/:eventId/publish
// --------------------------------------------------------------------------

describe('POST /organisation/events/:eventId/publish', () => {
  describe('success', () => {
    it('returns 200 with status=PUBLISHED and publishedAt when DRAFT event has at least one role', async () => {
      mockSession(ORG_ADMIN_SESSION)
      const publishedEvent = { ...DRAFT_EVENT, status: 'PUBLISHED', publishedAt: '2026-05-01T00:00:00.000Z' }
      // getItem calls: requireApprovedOrg (ORG), handler (EVENT), handler re-fetch after update (EVENT)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(publishedEvent)
      vi.mocked(queryItems).mockResolvedValue([ROLE_ITEM])

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/publish`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('PUBLISHED')
      expect(res.body).toHaveProperty('publishedAt')
    })

    it('calls updateItem with #status ExpressionAttributeNames alias', async () => {
      mockSession(ORG_ADMIN_SESSION)
      const publishedEvent = { ...DRAFT_EVENT, status: 'PUBLISHED', publishedAt: '2026-05-01T00:00:00.000Z' }
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(publishedEvent)
      vi.mocked(queryItems).mockResolvedValue([ROLE_ITEM])

      await request(app)
        .post(`/organisation/events/${EVENT_ID}/publish`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(updateItem).toHaveBeenCalledWith(
        'test-table',
        { PK: `EVENT#${EVENT_ID}`, SK: 'PROFILE' },
        expect.stringContaining('#status'),
        expect.objectContaining({ ':published': 'PUBLISHED', ':gsi3pk': 'EVENT_STATUS#PUBLISHED' }),
        expect.objectContaining({ '#status': 'status' })
      )
    })
  })

  describe('400 — no roles', () => {
    it('returns 400 with correct error when DRAFT event has zero roles', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
      vi.mocked(queryItems).mockResolvedValue([]) // zero roles

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/publish`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/at least one role/i)
    })
  })

  describe('409 — wrong status', () => {
    it('returns 409 when event is already PUBLISHED', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(PUBLISHED_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/publish`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/only draft events can be published/i)
    })

    it('returns 409 when event is CANCELLED', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(CANCELLED_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/publish`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/only draft events can be published/i)
    })

    it('returns 409 when event is COMPLETED', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(COMPLETED_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/publish`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/only draft events can be published/i)
    })
  })

  describe('404 — ownership / not found', () => {
    it('returns 404 when event belongs to a different org', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(OTHER_ORG_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/publish`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(404)
    })

    it('returns 404 for non-existent eventId', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(undefined)

      const res = await request(app)
        .post('/organisation/events/nonexistent/publish')
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(404)
    })
  })

  describe('auth & permission guards', () => {
    it('returns 401 when unauthenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(undefined)
      const res = await request(app).post(`/organisation/events/${EVENT_ID}/publish`)
      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as VOLUNTEER', async () => {
      mockSession(VOLUNTEER_SESSION)
      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/publish`)
        .set('Cookie', 'sid=sess-volunteer')
      expect(res.status).toBe(403)
    })

    it('returns 403 when ORG_ADMIN but org is PENDING', async () => {
      mockSession(PENDING_ORG_SESSION)
      vi.mocked(getItem).mockResolvedValueOnce(PENDING_ORG_ITEM)
      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/publish`)
        .set('Cookie', 'sid=sess-pending-admin')
      expect(res.status).toBe(403)
    })
  })
})

// --------------------------------------------------------------------------
// BE-TEST-02: POST /organisation/events/:eventId/cancel
// --------------------------------------------------------------------------

describe('POST /organisation/events/:eventId/cancel', () => {
  describe('success', () => {
    it('returns 200 with status=CANCELLED and cancelledAt when event is PUBLISHED', async () => {
      mockSession(ORG_ADMIN_SESSION)
      const cancelledEvent = { ...PUBLISHED_EVENT, status: 'CANCELLED', cancelledAt: '2026-05-01T00:00:00.000Z' }
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(PUBLISHED_EVENT)
        .mockResolvedValueOnce(cancelledEvent)
      vi.mocked(queryItems).mockResolvedValue([PENDING_REG_ITEM])

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/cancel`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('CANCELLED')
      expect(res.body).toHaveProperty('cancelledAt')
    })

    it('returns 200 when event is ACTIVE (also cancellable)', async () => {
      mockSession(ORG_ADMIN_SESSION)
      const cancelledEvent = { ...ACTIVE_EVENT, status: 'CANCELLED', cancelledAt: '2026-05-01T00:00:00.000Z' }
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(ACTIVE_EVENT)
        .mockResolvedValueOnce(cancelledEvent)
      vi.mocked(queryItems).mockResolvedValue([])

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/cancel`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('CANCELLED')
    })

    it('calls transactWrite with event update + registrations in first batch', async () => {
      mockSession(ORG_ADMIN_SESSION)
      const cancelledEvent = { ...PUBLISHED_EVENT, status: 'CANCELLED', cancelledAt: '2026-05-01T00:00:00.000Z' }
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(PUBLISHED_EVENT)
        .mockResolvedValueOnce(cancelledEvent)
      vi.mocked(queryItems).mockResolvedValue([PENDING_REG_ITEM])

      await request(app)
        .post(`/organisation/events/${EVENT_ID}/cancel`)
        .set('Cookie', 'sid=sess-org-admin')

      // First batch = event update (leadItem) + 1 registration = 2 items total
      expect(transactWrite).toHaveBeenCalledTimes(1)
      const [items] = vi.mocked(transactWrite).mock.calls[0]
      expect(items).toHaveLength(2)
      expect(items[0].Update?.Key).toEqual({ PK: `EVENT#${EVENT_ID}`, SK: 'PROFILE' })
      expect(items[1].Update?.Key).toEqual({ PK: 'REG#reg-1', SK: 'META' })
    })

    it('calls enqueueEventCancelled with EVENT_CANCELLED type and affected registrations', async () => {
      mockSession(ORG_ADMIN_SESSION)
      const cancelledEvent = { ...PUBLISHED_EVENT, status: 'CANCELLED', cancelledAt: '2026-05-01T00:00:00.000Z' }
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(PUBLISHED_EVENT)
        .mockResolvedValueOnce(cancelledEvent)
      vi.mocked(queryItems).mockResolvedValue([PENDING_REG_ITEM])

      await request(app)
        .post(`/organisation/events/${EVENT_ID}/cancel`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(enqueueEventCancelled).toHaveBeenCalledTimes(1)
      const [payload] = vi.mocked(enqueueEventCancelled).mock.calls[0]
      expect(payload.eventId).toBe(EVENT_ID)
      expect(payload.affectedRegistrations).toHaveLength(1)
      expect(payload.affectedRegistrations[0].regId).toBe('reg-1')
    })

    it('calls transactWrite once (event update only) when there are no PENDING registrations', async () => {
      mockSession(ORG_ADMIN_SESSION)
      const cancelledEvent = { ...PUBLISHED_EVENT, status: 'CANCELLED', cancelledAt: '2026-05-01T00:00:00.000Z' }
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(PUBLISHED_EVENT)
        .mockResolvedValueOnce(cancelledEvent)
      vi.mocked(queryItems).mockResolvedValue([]) // no registrations

      await request(app)
        .post(`/organisation/events/${EVENT_ID}/cancel`)
        .set('Cookie', 'sid=sess-org-admin')

      // transactWrite is called once with just the event status update (atomic even with 0 registrations)
      expect(transactWrite).toHaveBeenCalledTimes(1)
      expect(transactWrite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ Update: expect.objectContaining({ Key: { PK: `EVENT#${EVENT_ID}`, SK: 'PROFILE' } }) }),
        ])
      )
      expect(enqueueEventCancelled).toHaveBeenCalledWith(
        expect.objectContaining({ affectedRegistrations: [] })
      )
    })
  })

  describe('409 — wrong status', () => {
    it('returns 409 with draft error when event is DRAFT', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/cancel`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/draft events cannot be cancelled/i)
    })

    it('returns 409 with completed error when event is COMPLETED', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(COMPLETED_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/cancel`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/completed events cannot be cancelled/i)
    })

    it('returns 409 with completed error when event is already CANCELLED (OQ-01)', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(CANCELLED_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/cancel`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/completed events cannot be cancelled/i)
    })
  })

  describe('404 — ownership / not found', () => {
    it('returns 404 when event belongs to a different org', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(OTHER_ORG_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/cancel`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(404)
    })

    it('returns 404 for non-existent eventId', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(undefined)

      const res = await request(app)
        .post('/organisation/events/nonexistent/cancel')
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(404)
    })
  })

  describe('auth & permission guards', () => {
    it('returns 401 when unauthenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(undefined)
      const res = await request(app).post(`/organisation/events/${EVENT_ID}/cancel`)
      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as VOLUNTEER', async () => {
      mockSession(VOLUNTEER_SESSION)
      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/cancel`)
        .set('Cookie', 'sid=sess-volunteer')
      expect(res.status).toBe(403)
    })
  })
})
