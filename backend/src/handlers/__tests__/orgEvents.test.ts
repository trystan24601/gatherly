/**
 * BE-TEST-02 through BE-TEST-05: Integration tests for /organisation/events endpoints
 *
 * Written in the Red phase — all tests must fail before implementation exists.
 *
 * Strategy: mock DynamoDB, session lib, and rateLimiter at module level so
 * tests are hermetic and fast. The Express app is imported from ../../app.
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

vi.mock('../../lib/rateLimiter', () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
  recordFailedAttempt: vi.fn().mockReturnValue(false),
  resetLimiter: vi.fn(),
}))

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { app } from '../../app'
import { getItem, queryItems, queryItemsPaginated, putItem, updateItem } from '../../lib/dynamodb'
import { getSession, isSessionExpired } from '../../lib/session'

// --------------------------------------------------------------------------
// Helpers / fixtures
// --------------------------------------------------------------------------

const ORG_ID = 'org-approved-test'
const OTHER_ORG_ID = 'org-other-test'
const EVENT_ID = 'event-test-abc'

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

// A valid future date (1 year from now)
function futureDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

const VALID_CREATE_PAYLOAD = {
  title: 'Test Event',
  eventTypeId: 'running',
  eventDate: futureDate(),
  startTime: '09:00',
  endTime: '17:00',
  venueName: 'Test Venue',
  venueAddress: '123 Test Street',
  city: 'London',
  postcode: 'SW1A 1AA',
}

const DRAFT_EVENT_ITEM = {
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
  GSI3PK: `EVENT_STATUS#DRAFT`,
  GSI3SK: `${futureDate()}#${EVENT_ID}`,
  GSI4PK: `ORG#${ORG_ID}`,
  GSI4SK: `${futureDate()}#${EVENT_ID}`,
}

const PUBLISHED_EVENT_ITEM = {
  ...DRAFT_EVENT_ITEM,
  status: 'PUBLISHED',
  GSI3PK: 'EVENT_STATUS#PUBLISHED',
}

const OTHER_ORG_EVENT_ITEM = {
  ...DRAFT_EVENT_ITEM,
  orgId: OTHER_ORG_ID,
  GSI4PK: `ORG#${OTHER_ORG_ID}`,
}

function mockSession(session: typeof ORG_ADMIN_SESSION | typeof VOLUNTEER_SESSION | null) {
  vi.mocked(getSession).mockResolvedValue(session as any)
  vi.mocked(isSessionExpired).mockReturnValue(false)
}

/** getItem is called as getItem(tableName, key) — match on key.PK */
function mockGetItemByPK(
  map: Record<string, Record<string, unknown> | undefined>
) {
  vi.mocked(getItem).mockImplementation(
    async (_tableName: string, key: Record<string, unknown>) => {
      const pk = String(key.PK ?? '')
      return map[pk] ?? undefined
    }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DYNAMODB_TABLE_NAME = 'test-table'
})

// --------------------------------------------------------------------------
// BE-TEST-02: POST /organisation/events
// --------------------------------------------------------------------------

describe('POST /organisation/events', () => {
  describe('success', () => {
    beforeEach(() => {
      mockSession(ORG_ADMIN_SESSION)
      mockGetItemByPK({ [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM })
      vi.mocked(putItem).mockResolvedValue(undefined)
    })

    it('returns 201 with event body containing eventId and status=DRAFT', async () => {
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send(VALID_CREATE_PAYLOAD)

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('eventId')
      expect(res.body.status).toBe('DRAFT')
    })

    it('assigns orgId from session, not from request body (AC-02)', async () => {
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send({ ...VALID_CREATE_PAYLOAD, orgId: 'attacker-org-id' })

      expect(res.status).toBe(201)
      expect(res.body.orgId).toBe(ORG_ID)
      expect(res.body.orgId).not.toBe('attacker-org-id')
    })
  })

  describe('validation — required fields', () => {
    beforeEach(() => {
      mockSession(ORG_ADMIN_SESSION)
      mockGetItemByPK({ [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM })
    })

    it('returns 400 when title is missing', async () => {
      const { title, ...payload } = VALID_CREATE_PAYLOAD
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send(payload)
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/title is required/i)
    })

    it('returns 400 when eventTypeId is missing', async () => {
      const { eventTypeId, ...payload } = VALID_CREATE_PAYLOAD
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send(payload)
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/eventTypeId is required/i)
    })

    it('returns 400 when eventDate is missing', async () => {
      const { eventDate, ...payload } = VALID_CREATE_PAYLOAD
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send(payload)
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/eventDate is required/i)
    })

    it('returns 400 when startTime is missing', async () => {
      const { startTime, ...payload } = VALID_CREATE_PAYLOAD
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send(payload)
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/startTime is required/i)
    })

    it('returns 400 when endTime is missing', async () => {
      const { endTime, ...payload } = VALID_CREATE_PAYLOAD
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send(payload)
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/endTime is required/i)
    })

    it('returns 400 when venueName is missing', async () => {
      const { venueName, ...payload } = VALID_CREATE_PAYLOAD
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send(payload)
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/venueName is required/i)
    })

    it('returns 400 when venueAddress is missing', async () => {
      const { venueAddress, ...payload } = VALID_CREATE_PAYLOAD
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send(payload)
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/venueAddress is required/i)
    })

    it('returns 400 when city is missing', async () => {
      const { city, ...payload } = VALID_CREATE_PAYLOAD
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send(payload)
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/city is required/i)
    })

    it('returns 400 when postcode is missing', async () => {
      const { postcode, ...payload } = VALID_CREATE_PAYLOAD
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send(payload)
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/postcode is required/i)
    })
  })

  describe('validation — business rules', () => {
    beforeEach(() => {
      mockSession(ORG_ADMIN_SESSION)
      mockGetItemByPK({ [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM })
    })

    it('returns 400 when eventDate is in the past', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send({ ...VALID_CREATE_PAYLOAD, eventDate: yesterday.toISOString().slice(0, 10) })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/event date must be in the future/i)
    })

    it('returns 400 when endTime is before startTime', async () => {
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send({ ...VALID_CREATE_PAYLOAD, startTime: '17:00', endTime: '09:00' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/end time must be after start time/i)
    })

    it('returns 400 when postcode is invalid', async () => {
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send({ ...VALID_CREATE_PAYLOAD, postcode: 'SW1A1AA' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/valid UK postcode/i)
    })

    it('returns 400 when title exceeds 150 characters', async () => {
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send({ ...VALID_CREATE_PAYLOAD, title: 'A'.repeat(151) })
      expect(res.status).toBe(400)
    })

    it('returns 400 when description exceeds 2000 characters', async () => {
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send({ ...VALID_CREATE_PAYLOAD, description: 'A'.repeat(2001) })
      expect(res.status).toBe(400)
    })

    it('returns 400 when maxVolunteers is 0', async () => {
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send({ ...VALID_CREATE_PAYLOAD, maxVolunteers: 0 })
      expect(res.status).toBe(400)
    })

    it('returns 400 when maxVolunteers is 10001', async () => {
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')
        .send({ ...VALID_CREATE_PAYLOAD, maxVolunteers: 10001 })
      expect(res.status).toBe(400)
    })
  })

  describe('auth & permission guards', () => {
    it('returns 401 when unauthenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)
      const res = await request(app)
        .post('/organisation/events')
        .send(VALID_CREATE_PAYLOAD)
      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as VOLUNTEER', async () => {
      mockSession(VOLUNTEER_SESSION)
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-volunteer')
        .send(VALID_CREATE_PAYLOAD)
      expect(res.status).toBe(403)
    })

    it('returns 403 when ORG_ADMIN but org is PENDING', async () => {
      mockSession(PENDING_ORG_SESSION)
      mockGetItemByPK({ 'ORG#org-pending-test': PENDING_ORG_ITEM })
      const res = await request(app)
        .post('/organisation/events')
        .set('Cookie', 'sid=sess-pending-admin')
        .send(VALID_CREATE_PAYLOAD)
      expect(res.status).toBe(403)
    })
  })
})

// --------------------------------------------------------------------------
// BE-TEST-03: PATCH /organisation/events/:eventId
// --------------------------------------------------------------------------

describe('PATCH /organisation/events/:eventId', () => {
  describe('success', () => {
    it('returns 200 with updated event for valid partial update on own DRAFT event', async () => {
      mockSession(ORG_ADMIN_SESSION)
      const updatedEventItem = { ...DRAFT_EVENT_ITEM, title: 'Updated Title' }
      // getItem is called: 1) by requireApprovedOrg (ORG), 2) by handler (EVENT), 3) handler re-fetch after update (EVENT)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)  // requireApprovedOrg
        .mockResolvedValueOnce(DRAFT_EVENT_ITEM)    // handler fetch
        .mockResolvedValueOnce(updatedEventItem)    // handler re-fetch after update
      vi.mocked(updateItem).mockResolvedValue(undefined)

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}`)
        .set('Cookie', 'sid=sess-org-admin')
        .send({ title: 'Updated Title' })

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('eventId')
    })
  })

  describe('error cases', () => {
    beforeEach(() => {
      mockSession(ORG_ADMIN_SESSION)
      mockGetItemByPK({ [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM })
    })

    it('returns 409 when event status is PUBLISHED', async () => {
      mockGetItemByPK({
        [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM,
        [`EVENT#${EVENT_ID}`]: PUBLISHED_EVENT_ITEM,
      })

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}`)
        .set('Cookie', 'sid=sess-org-admin')
        .send({ title: 'Updated Title' })

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/only draft events can be edited/i)
    })

    it('returns 404 when event belongs to a different org', async () => {
      mockGetItemByPK({
        [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM,
        [`EVENT#${EVENT_ID}`]: OTHER_ORG_EVENT_ITEM,
      })

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}`)
        .set('Cookie', 'sid=sess-org-admin')
        .send({ title: 'Updated Title' })

      expect(res.status).toBe(404)
    })

    it('returns 404 for non-existent eventId', async () => {
      mockGetItemByPK({ [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM })

      const res = await request(app)
        .patch('/organisation/events/nonexistent-event')
        .set('Cookie', 'sid=sess-org-admin')
        .send({ title: 'Updated Title' })

      expect(res.status).toBe(404)
    })

    it('returns 400 when eventDate is in the past (patch validation)', async () => {
      mockGetItemByPK({
        [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM,
        [`EVENT#${EVENT_ID}`]: DRAFT_EVENT_ITEM,
      })
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}`)
        .set('Cookie', 'sid=sess-org-admin')
        .send({ eventDate: yesterday.toISOString().slice(0, 10) })

      expect(res.status).toBe(400)
    })

    it('returns 400 when endTime provided and is before stored startTime', async () => {
      mockGetItemByPK({
        [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM,
        [`EVENT#${EVENT_ID}`]: { ...DRAFT_EVENT_ITEM, startTime: '09:00' },
      })

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}`)
        .set('Cookie', 'sid=sess-org-admin')
        .send({ endTime: '08:00' })

      expect(res.status).toBe(400)
    })
  })

  describe('auth & permission guards', () => {
    it('returns 401 when unauthenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)
      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}`)
        .send({ title: 'Updated' })
      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as VOLUNTEER', async () => {
      mockSession(VOLUNTEER_SESSION)
      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}`)
        .set('Cookie', 'sid=sess-volunteer')
        .send({ title: 'Updated' })
      expect(res.status).toBe(403)
    })
  })
})

// --------------------------------------------------------------------------
// BE-TEST-04: GET /organisation/events/:eventId
// --------------------------------------------------------------------------

describe('GET /organisation/events/:eventId', () => {
  describe('success', () => {
    it('returns 200 with event + roles array', async () => {
      mockSession(ORG_ADMIN_SESSION)
      mockGetItemByPK({
        [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM,
        [`EVENT#${EVENT_ID}`]: DRAFT_EVENT_ITEM,
      })
      vi.mocked(queryItems).mockResolvedValue([
        { PK: `EVENT#${EVENT_ID}`, SK: 'ROLE#role-1', roleId: 'role-1', name: 'Marshal', capacity: 10, filledCount: 0 },
      ])

      const res = await request(app)
        .get(`/organisation/events/${EVENT_ID}`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('eventId')
      expect(res.body).toHaveProperty('roles')
      expect(Array.isArray(res.body.roles)).toBe(true)
    })
  })

  describe('error cases', () => {
    beforeEach(() => {
      mockSession(ORG_ADMIN_SESSION)
    })

    it('returns 404 when event belongs to a different org', async () => {
      mockGetItemByPK({
        [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM,
        [`EVENT#${EVENT_ID}`]: OTHER_ORG_EVENT_ITEM,
      })
      const res = await request(app)
        .get(`/organisation/events/${EVENT_ID}`)
        .set('Cookie', 'sid=sess-org-admin')
      expect(res.status).toBe(404)
    })

    it('returns 404 for non-existent eventId', async () => {
      mockGetItemByPK({ [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM })
      const res = await request(app)
        .get('/organisation/events/nonexistent')
        .set('Cookie', 'sid=sess-org-admin')
      expect(res.status).toBe(404)
    })

    it('returns 401 when unauthenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)
      const res = await request(app).get(`/organisation/events/${EVENT_ID}`)
      expect(res.status).toBe(401)
    })
  })
})

// --------------------------------------------------------------------------
// BE-TEST-05: GET /organisation/events
// --------------------------------------------------------------------------

describe('GET /organisation/events', () => {
  describe('success', () => {
    beforeEach(() => {
      mockSession(ORG_ADMIN_SESSION)
      mockGetItemByPK({ [`ORG#${ORG_ID}`]: APPROVED_ORG_ITEM })
    })

    it('returns events for the session org with fill-rate fields', async () => {
      vi.mocked(queryItemsPaginated).mockResolvedValue({
        items: [{ ...DRAFT_EVENT_ITEM }],
        lastEvaluatedKey: undefined,
      })
      // roles query for fill rate
      vi.mocked(queryItems).mockResolvedValue([
        { PK: `EVENT#${EVENT_ID}`, SK: 'ROLE#role-1', roleId: 'role-1', name: 'Marshal', capacity: 10, filledCount: 3 },
      ])

      const res = await request(app)
        .get('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('events')
      expect(res.body).toHaveProperty('cursor')
      expect(Array.isArray(res.body.events)).toBe(true)
      const ev = res.body.events[0]
      expect(ev).toHaveProperty('eventId')
      expect(ev).toHaveProperty('title')
      expect(ev).toHaveProperty('eventDate')
      expect(ev).toHaveProperty('status')
      expect(ev).toHaveProperty('totalRoles')
      expect(ev).toHaveProperty('totalHeadcount')
      expect(ev).toHaveProperty('filledCount')
      expect(ev).toHaveProperty('fillRate')
    })

    it('returns { events: [], cursor: null } when org has no events (AC-10)', async () => {
      vi.mocked(queryItemsPaginated).mockResolvedValue({ items: [], lastEvaluatedKey: undefined })

      const res = await request(app)
        .get('/organisation/events')
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(200)
      expect(res.body.events).toEqual([])
      expect(res.body.cursor).toBeNull()
    })

    it('accepts limit and cursor query params for pagination', async () => {
      vi.mocked(queryItemsPaginated).mockResolvedValue({ items: [], lastEvaluatedKey: undefined })

      const cursor = Buffer.from(JSON.stringify({ PK: 'EVENT#abc', SK: 'PROFILE' })).toString('base64')
      const res = await request(app)
        .get(`/organisation/events?limit=5&cursor=${cursor}`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(200)
    })
  })

  describe('auth guards', () => {
    it('returns 401 when unauthenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)
      const res = await request(app).get('/organisation/events')
      expect(res.status).toBe(401)
    })
  })
})
