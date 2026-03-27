/**
 * BE-TEST-03: POST /admin/events/:eventId/complete
 *
 * Written in the Red phase — all tests must fail before implementation exists.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// --------------------------------------------------------------------------
// Module mocks
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
import { getItem } from '../../lib/dynamodb'
import { getSession, isSessionExpired } from '../../lib/session'

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

const EVENT_ID = 'event-complete-test'

function futureDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

const SUPER_ADMIN_SESSION = {
  sessionId: 'sess-super-admin',
  userId: 'user-super-admin',
  role: 'SUPER_ADMIN',
  createdAt: new Date().toISOString(),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
}

const ORG_ADMIN_SESSION = {
  sessionId: 'sess-org-admin',
  userId: 'user-org-admin',
  role: 'ORG_ADMIN',
  orgId: 'org-test',
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

function makeEvent(status: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    PK: `EVENT#${EVENT_ID}`,
    SK: 'PROFILE',
    eventId: EVENT_ID,
    orgId: 'org-test',
    title: 'Test Event',
    eventTypeId: 'running',
    eventDate: futureDate(),
    startTime: '09:00',
    endTime: '17:00',
    venueName: 'Test Venue',
    venueAddress: '123 Test Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    status,
    createdAt: '2026-01-01T00:00:00.000Z',
    GSI3PK: `EVENT_STATUS#${status}`,
    GSI3SK: `${futureDate()}#${EVENT_ID}`,
    ...overrides,
  }
}

const PUBLISHED_EVENT = makeEvent('PUBLISHED')
const ACTIVE_EVENT = makeEvent('ACTIVE')
const DRAFT_EVENT = makeEvent('DRAFT')
const CANCELLED_EVENT = makeEvent('CANCELLED', { cancelledAt: '2026-03-01T00:00:00.000Z' })
const COMPLETED_EVENT = makeEvent('COMPLETED', { completedAt: '2026-04-01T00:00:00.000Z' })

function mockSession(session: typeof SUPER_ADMIN_SESSION | typeof ORG_ADMIN_SESSION | typeof VOLUNTEER_SESSION | null) {
  vi.mocked(getSession).mockResolvedValue(session as any)
  vi.mocked(isSessionExpired).mockReturnValue(false)
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DYNAMODB_TABLE_NAME = 'test-table'
})

// --------------------------------------------------------------------------
// BE-TEST-03: POST /admin/events/:eventId/complete
// --------------------------------------------------------------------------

describe('POST /admin/events/:eventId/complete', () => {
  describe('success', () => {
    it('returns 200 with status=COMPLETED and completedAt when event is PUBLISHED', async () => {
      mockSession(SUPER_ADMIN_SESSION)
      const completedEvent = { ...PUBLISHED_EVENT, status: 'COMPLETED', completedAt: '2026-05-01T00:00:00.000Z' }
      vi.mocked(getItem)
        .mockResolvedValueOnce(PUBLISHED_EVENT)
        .mockResolvedValueOnce(completedEvent)

      const res = await request(app)
        .post(`/admin/events/${EVENT_ID}/complete`)
        .set('Cookie', 'sid=sess-super-admin')

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('COMPLETED')
      expect(res.body).toHaveProperty('completedAt')
    })

    it('returns 200 when event is ACTIVE', async () => {
      mockSession(SUPER_ADMIN_SESSION)
      const completedEvent = { ...ACTIVE_EVENT, status: 'COMPLETED', completedAt: '2026-05-01T00:00:00.000Z' }
      vi.mocked(getItem)
        .mockResolvedValueOnce(ACTIVE_EVENT)
        .mockResolvedValueOnce(completedEvent)

      const res = await request(app)
        .post(`/admin/events/${EVENT_ID}/complete`)
        .set('Cookie', 'sid=sess-super-admin')

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('COMPLETED')
    })
  })

  describe('409 — wrong status', () => {
    it('returns 409 when event is DRAFT', async () => {
      mockSession(SUPER_ADMIN_SESSION)
      vi.mocked(getItem).mockResolvedValueOnce(DRAFT_EVENT)

      const res = await request(app)
        .post(`/admin/events/${EVENT_ID}/complete`)
        .set('Cookie', 'sid=sess-super-admin')

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/only published or active events can be completed/i)
    })

    it('returns 409 when event is CANCELLED', async () => {
      mockSession(SUPER_ADMIN_SESSION)
      vi.mocked(getItem).mockResolvedValueOnce(CANCELLED_EVENT)

      const res = await request(app)
        .post(`/admin/events/${EVENT_ID}/complete`)
        .set('Cookie', 'sid=sess-super-admin')

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/only published or active events can be completed/i)
    })

    it('returns 409 when event is already COMPLETED', async () => {
      mockSession(SUPER_ADMIN_SESSION)
      vi.mocked(getItem).mockResolvedValueOnce(COMPLETED_EVENT)

      const res = await request(app)
        .post(`/admin/events/${EVENT_ID}/complete`)
        .set('Cookie', 'sid=sess-super-admin')

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/only published or active events can be completed/i)
    })
  })

  describe('404 — not found', () => {
    it('returns 404 for non-existent eventId', async () => {
      mockSession(SUPER_ADMIN_SESSION)
      vi.mocked(getItem).mockResolvedValueOnce(undefined)

      const res = await request(app)
        .post('/admin/events/nonexistent/complete')
        .set('Cookie', 'sid=sess-super-admin')

      expect(res.status).toBe(404)
    })
  })

  describe('auth & permission guards', () => {
    it('returns 401 when unauthenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(undefined)
      const res = await request(app).post(`/admin/events/${EVENT_ID}/complete`)
      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as ORG_ADMIN', async () => {
      mockSession(ORG_ADMIN_SESSION)
      // requireApprovedOrg will try to look up org — we don't want it to short-circuit via 403
      // But since the route is /admin/events (not /organisation/events), requireApprovedOrg won't fire.
      // The requireRole('SUPER_ADMIN') guard should fire and return 403.
      vi.mocked(getItem).mockResolvedValue(undefined)

      const res = await request(app)
        .post(`/admin/events/${EVENT_ID}/complete`)
        .set('Cookie', 'sid=sess-org-admin')

      expect(res.status).toBe(403)
    })

    it('returns 403 when authenticated as VOLUNTEER', async () => {
      mockSession(VOLUNTEER_SESSION)

      const res = await request(app)
        .post(`/admin/events/${EVENT_ID}/complete`)
        .set('Cookie', 'sid=sess-volunteer')

      expect(res.status).toBe(403)
    })
  })
})
