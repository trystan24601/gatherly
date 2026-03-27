/**
 * BE-TEST-01 through BE-TEST-08: Integration tests for role and slot endpoints.
 *
 * Written in the Red phase — all tests must fail before implementation exists.
 *
 * Endpoints under test:
 *   POST   /organisation/events/:eventId/roles                          (FR-01)
 *   PATCH  /organisation/events/:eventId/roles/:roleId                  (FR-02)
 *   DELETE /organisation/events/:eventId/roles/:roleId                  (FR-03)
 *   POST   /organisation/events/:eventId/roles/:roleId/slots            (FR-04)
 *   PATCH  /organisation/events/:eventId/roles/:roleId/slots/:slotId    (FR-05)
 *   DELETE /organisation/events/:eventId/roles/:roleId/slots/:slotId    (FR-06)
 *   GET    /organisation/events/:eventId  — updated with roles[].slots[] (FR-07)
 *   POST   /organisation/events/:eventId/publish — tightened guard       (FR-08)
 *
 * Strategy: same mock approach as orgEvents.test.ts — mock DynamoDB, session,
 * and rateLimiter at module level; the Express app is imported from ../../app.
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
import { getItem, queryItems, putItem, updateItem, transactWrite, deleteItem, queryItemsPaginated } from '../../lib/dynamodb'
import { getSession, isSessionExpired } from '../../lib/session'

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

const ORG_ID = 'org-roles-test'
const OTHER_ORG_ID = 'org-other-roles-test'
const EVENT_ID = 'event-roles-test'
const ROLE_ID = 'role-test-1'
const SLOT_ID = 'slot-test-1'

function futureDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

const ORG_ADMIN_SESSION = {
  sessionId: 'sess-org-admin-roles',
  userId: 'user-org-admin-roles',
  role: 'ORG_ADMIN',
  orgId: ORG_ID,
  createdAt: new Date().toISOString(),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
}

const VOLUNTEER_SESSION = {
  sessionId: 'sess-volunteer-roles',
  userId: 'user-volunteer-roles',
  role: 'VOLUNTEER',
  createdAt: new Date().toISOString(),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
}

const APPROVED_ORG_ITEM = {
  PK: `ORG#${ORG_ID}`,
  SK: 'PROFILE',
  orgId: ORG_ID,
  name: 'Test Roles Org',
  status: 'APPROVED',
}

function makeDraftEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    PK: `EVENT#${EVENT_ID}`,
    SK: 'PROFILE',
    eventId: EVENT_ID,
    orgId: ORG_ID,
    title: 'Roles Test Event',
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
const PUBLISHED_EVENT = makeDraftEvent({ status: 'PUBLISHED', GSI3PK: 'EVENT_STATUS#PUBLISHED' })
const OTHER_ORG_EVENT = makeDraftEvent({ orgId: OTHER_ORG_ID, GSI4PK: `ORG#${OTHER_ORG_ID}` })

const ROLE_ITEM = {
  PK: `EVENT#${EVENT_ID}`,
  SK: `ROLE#${ROLE_ID}`,
  entityType: 'ROLE',
  roleId: ROLE_ID,
  eventId: EVENT_ID,
  orgId: ORG_ID,
  name: 'Marshal',
  description: 'Keep runners on course',
  skillIds: [],
}

const SLOT_ITEM = {
  PK: `EVENT#${EVENT_ID}`,
  SK: `ROLE#${ROLE_ID}#SLOT#${SLOT_ID}`,
  entityType: 'SLOT',
  slotId: SLOT_ID,
  roleId: ROLE_ID,
  eventId: EVENT_ID,
  shiftStart: '09:00',
  shiftEnd: '13:00',
  headcount: 5,
  filledCount: 0,
  status: 'OPEN',
}

function mockSession(session: typeof ORG_ADMIN_SESSION | typeof VOLUNTEER_SESSION | null) {
  vi.mocked(getSession).mockResolvedValue(session as any)
  vi.mocked(isSessionExpired).mockReturnValue(false)
}

beforeEach(() => {
  // Use resetAllMocks (not clearAllMocks) so that mockResolvedValueOnce queues
  // are fully drained between tests, preventing mock contamination.
  vi.resetAllMocks()
  // Re-apply default implementations that the factory set (now cleared by reset).
  vi.mocked(putItem).mockResolvedValue(undefined)
  vi.mocked(updateItem).mockResolvedValue(undefined)
  vi.mocked(deleteItem).mockResolvedValue(undefined)
  vi.mocked(transactWrite).mockResolvedValue(undefined)
  vi.mocked(queryItems).mockResolvedValue([])
  vi.mocked(queryItemsPaginated).mockResolvedValue({ items: [], lastEvaluatedKey: undefined })
  vi.mocked(isSessionExpired).mockReturnValue(false)
  process.env.DYNAMODB_TABLE_NAME = 'test-table'
})

// --------------------------------------------------------------------------
// BE-TEST-01: POST /organisation/events/:eventId/roles
// --------------------------------------------------------------------------

describe('POST /organisation/events/:eventId/roles', () => {
  describe('success', () => {
    it('creates a ROLE item with correct entityType, PK, SK, and returns 201', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'Marshal', description: 'Keep runners on course' })

      expect(res.status).toBe(201)
      expect(res.body.roleId).toBeDefined()
      expect(res.body.name).toBe('Marshal')
      expect(res.body.entityType).toBe('ROLE')
      expect(res.body.description).toBe('Keep runners on course')
      // putItem should have been called with correct PK/SK
      expect(putItem).toHaveBeenCalledWith(
        'test-table',
        expect.objectContaining({
          PK: `EVENT#${EVENT_ID}`,
          entityType: 'ROLE',
        })
      )
    })

    it('creates a ROLE item with optional skillIds array', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'Medic', skillIds: ['first-aid', 'cpr'] })

      expect(res.status).toBe(201)
      expect(res.body.skillIds).toEqual(['first-aid', 'cpr'])
    })

    it('creates a ROLE without optional fields when only name is provided', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'Runner' })

      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Runner')
    })
  })

  describe('400 — validation', () => {
    it('returns 400 when name is missing', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/name/i)
    })

    it('returns 400 when name is fewer than 2 characters', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'X' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/name/i)
    })

    it('returns 400 when name exceeds 100 characters', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'A'.repeat(101) })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/name/i)
    })

    it('returns 400 when description exceeds 500 characters', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'Valid Name', description: 'D'.repeat(501) })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/description/i)
    })
  })

  describe('404 — not found / ownership', () => {
    it('returns 404 when event is not found', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(undefined)

      const res = await request(app)
        .post(`/organisation/events/nonexistent/roles`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'Marshal' })

      expect(res.status).toBe(404)
    })

    it('returns 404 when event belongs to a different org', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(OTHER_ORG_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'Marshal' })

      expect(res.status).toBe(404)
    })
  })

  describe('409 — wrong status', () => {
    it('returns 409 when event is not DRAFT', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(PUBLISHED_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'Marshal' })

      expect(res.status).toBe(409)
    })
  })

  describe('auth guards', () => {
    it('returns 401 when unauthenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(undefined)
      const res = await request(app).post(`/organisation/events/${EVENT_ID}/roles`)
      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as VOLUNTEER', async () => {
      mockSession(VOLUNTEER_SESSION)
      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles`)
        .set('Cookie', 'sid=sess-volunteer-roles')
        .send({ name: 'Marshal' })
      expect(res.status).toBe(403)
    })
  })
})

// --------------------------------------------------------------------------
// BE-TEST-02: PATCH /organisation/events/:eventId/roles/:roleId
// --------------------------------------------------------------------------

describe('PATCH /organisation/events/:eventId/roles/:roleId', () => {
  describe('success', () => {
    it('updates only the provided fields and returns 200', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'Updated Marshal' })

      expect(res.status).toBe(200)
      expect(updateItem).toHaveBeenCalledWith(
        'test-table',
        { PK: `EVENT#${EVENT_ID}`, SK: `ROLE#${ROLE_ID}` },
        expect.stringContaining('#name'),
        expect.objectContaining({ ':name': 'Updated Marshal' }),
        { '#name': 'name' }
      )
    })

    it('allows updating description and skillIds', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ description: 'New description', skillIds: ['first-aid'] })

      expect(res.status).toBe(200)
    })
  })

  describe('400 — validation', () => {
    it('returns 400 when name is fewer than 2 characters on update', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'X' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/name/i)
    })
  })

  describe('404 — not found', () => {
    it('returns 404 when role is not found', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(undefined) // role not found

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}/roles/nonexistent`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'Updated' })

      expect(res.status).toBe(404)
    })

    it('returns 404 when event is not owned by the session org', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(OTHER_ORG_EVENT)

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'Updated' })

      expect(res.status).toBe(404)
    })
  })

  describe('409 — wrong status', () => {
    it('returns 409 when event is not DRAFT', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(PUBLISHED_EVENT)

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ name: 'Updated' })

      expect(res.status).toBe(409)
    })
  })
})

// --------------------------------------------------------------------------
// BE-TEST-03: DELETE /organisation/events/:eventId/roles/:roleId
// --------------------------------------------------------------------------

describe('DELETE /organisation/events/:eventId/roles/:roleId', () => {
  describe('success', () => {
    it('returns 204 and uses transactWrite to delete ROLE and all SLOT items', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)
      // queryItems: first call = slots for role, second call = active registrations (none)
      vi.mocked(queryItems)
        .mockResolvedValueOnce([SLOT_ITEM]) // slots for the role
        .mockResolvedValueOnce([])           // no active registrations

      const res = await request(app)
        .delete(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')

      expect(res.status).toBe(204)
      expect(transactWrite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ Delete: expect.objectContaining({ Key: { PK: `EVENT#${EVENT_ID}`, SK: `ROLE#${ROLE_ID}` } }) }),
          expect.objectContaining({ Delete: expect.objectContaining({ Key: { PK: `EVENT#${EVENT_ID}`, SK: `ROLE#${ROLE_ID}#SLOT#${SLOT_ID}` } }) }),
        ])
      )
    })

    it('returns 204 when the role has no slots', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)
      vi.mocked(queryItems)
        .mockResolvedValueOnce([]) // no slots
        .mockResolvedValueOnce([]) // no registrations

      const res = await request(app)
        .delete(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')

      expect(res.status).toBe(204)
    })
  })

  describe('409 — active registrations', () => {
    it('returns 409 with correct message when active registrations exist on a slot', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)
      vi.mocked(queryItems)
        .mockResolvedValueOnce([SLOT_ITEM])         // slots exist
        .mockResolvedValueOnce([{ regId: 'reg-1', status: 'PENDING' }]) // active registration

      const res = await request(app)
        .delete(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')

      expect(res.status).toBe(409)
      expect(res.body.error).toBe('Cannot delete a role with active registrations.')
    })
  })

  describe('409 — wrong status', () => {
    it('returns 409 when event is not DRAFT', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(PUBLISHED_EVENT)

      const res = await request(app)
        .delete(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')

      expect(res.status).toBe(409)
    })
  })

  describe('404 — not found', () => {
    it('returns 404 when role is not found', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(undefined) // role not found

      const res = await request(app)
        .delete(`/organisation/events/${EVENT_ID}/roles/nonexistent`)
        .set('Cookie', 'sid=sess-org-admin-roles')

      expect(res.status).toBe(404)
    })

    it('returns 404 when event belongs to another org', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(OTHER_ORG_EVENT)

      const res = await request(app)
        .delete(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')

      expect(res.status).toBe(404)
    })
  })
})

// --------------------------------------------------------------------------
// BE-TEST-04: POST /organisation/events/:eventId/roles/:roleId/slots
// --------------------------------------------------------------------------

describe('POST /organisation/events/:eventId/roles/:roleId/slots', () => {
  describe('success', () => {
    it('creates a SLOT item with filledCount=0, status=OPEN, correct PK/SK, and returns 201', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ shiftStart: '09:00', shiftEnd: '13:00', headcount: 5 })

      expect(res.status).toBe(201)
      expect(res.body.slotId).toBeDefined()
      expect(res.body.filledCount).toBe(0)
      expect(res.body.status).toBe('OPEN')
      expect(res.body.entityType).toBe('SLOT')
      expect(putItem).toHaveBeenCalledWith(
        'test-table',
        expect.objectContaining({
          PK: `EVENT#${EVENT_ID}`,
          entityType: 'SLOT',
          filledCount: 0,
          status: 'OPEN',
          headcount: 5,
        })
      )
    })

    it('creates a SLOT with optional location field', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ shiftStart: '09:00', shiftEnd: '13:00', headcount: 3, location: 'Start line' })

      expect(res.status).toBe(201)
      expect(res.body.location).toBe('Start line')
    })
  })

  describe('400 — validation', () => {
    it('returns 400 when shiftStart is missing', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ shiftEnd: '13:00', headcount: 5 })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/shiftStart/i)
    })

    it('returns 400 when shiftEnd is missing', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ shiftStart: '09:00', headcount: 5 })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/shiftEnd/i)
    })

    it('returns 400 when shiftEnd is not after shiftStart', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ shiftStart: '13:00', shiftEnd: '09:00', headcount: 5 })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/shiftEnd/i)
    })

    it('returns 400 when headcount is below 1', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ shiftStart: '09:00', shiftEnd: '13:00', headcount: 0 })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/headcount/i)
    })

    it('returns 400 when headcount exceeds 500', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ shiftStart: '09:00', shiftEnd: '13:00', headcount: 501 })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/headcount/i)
    })

    it('returns 400 when location exceeds 200 characters', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(ROLE_ITEM)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ shiftStart: '09:00', shiftEnd: '13:00', headcount: 5, location: 'L'.repeat(201) })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/location/i)
    })
  })

  describe('404 — not found', () => {
    it('returns 404 when role is not found', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(undefined) // role not found

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles/nonexistent/slots`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ shiftStart: '09:00', shiftEnd: '13:00', headcount: 5 })

      expect(res.status).toBe(404)
    })

    it('returns 404 when event belongs to another org', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(OTHER_ORG_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ shiftStart: '09:00', shiftEnd: '13:00', headcount: 5 })

      expect(res.status).toBe(404)
    })
  })

  describe('409 — wrong status', () => {
    it('returns 409 when event is not DRAFT', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(PUBLISHED_EVENT)

      const res = await request(app)
        .post(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ shiftStart: '09:00', shiftEnd: '13:00', headcount: 5 })

      expect(res.status).toBe(409)
    })
  })
})

// --------------------------------------------------------------------------
// BE-TEST-05: PATCH /organisation/events/:eventId/roles/:roleId/slots/:slotId
// --------------------------------------------------------------------------

describe('PATCH /organisation/events/:eventId/roles/:roleId/slots/:slotId', () => {
  describe('success', () => {
    it('updates only the provided fields and returns 200', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(SLOT_ITEM)

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots/${SLOT_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ headcount: 10 })

      expect(res.status).toBe(200)
      expect(updateItem).toHaveBeenCalledWith(
        'test-table',
        { PK: `EVENT#${EVENT_ID}`, SK: `ROLE#${ROLE_ID}#SLOT#${SLOT_ID}` },
        expect.stringContaining('headcount'),
        expect.objectContaining({ ':headcount': 10 }),
        undefined
      )
    })

    it('allows updating location and shift times', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(SLOT_ITEM)

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots/${SLOT_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ location: 'Finish line', shiftStart: '10:00', shiftEnd: '14:00' })

      expect(res.status).toBe(200)
    })
  })

  describe('409 — headcount below filledCount', () => {
    it('returns 409 when reducing headcount below filledCount', async () => {
      mockSession(ORG_ADMIN_SESSION)
      const slotWithFilled = { ...SLOT_ITEM, filledCount: 5 }
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(slotWithFilled)

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots/${SLOT_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ headcount: 3 }) // below filledCount of 5

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/headcount/i)
    })
  })

  describe('409 — wrong status', () => {
    it('returns 409 when event is not DRAFT', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(PUBLISHED_EVENT)

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots/${SLOT_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ headcount: 10 })

      expect(res.status).toBe(409)
    })
  })

  describe('404 — not found', () => {
    it('returns 404 when slot is not found', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(undefined) // slot not found

      const res = await request(app)
        .patch(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots/nonexistent`)
        .set('Cookie', 'sid=sess-org-admin-roles')
        .send({ headcount: 10 })

      expect(res.status).toBe(404)
    })
  })
})

// --------------------------------------------------------------------------
// BE-TEST-06: DELETE /organisation/events/:eventId/roles/:roleId/slots/:slotId
// --------------------------------------------------------------------------

describe('DELETE /organisation/events/:eventId/roles/:roleId/slots/:slotId', () => {
  describe('success', () => {
    it('returns 204 when no active registrations exist for the slot', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(SLOT_ITEM)
      // queryItems: active registrations for this slot (none)
      vi.mocked(queryItems).mockResolvedValueOnce([])

      const res = await request(app)
        .delete(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots/${SLOT_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')

      expect(res.status).toBe(204)
    })
  })

  describe('409 — active registrations', () => {
    it('returns 409 with correct message when active registrations exist on this slot', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(SLOT_ITEM)
      vi.mocked(queryItems).mockResolvedValueOnce([{ regId: 'reg-1', status: 'CONFIRMED' }])

      const res = await request(app)
        .delete(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots/${SLOT_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')

      expect(res.status).toBe(409)
      expect(res.body.error).toBe('Cannot delete a slot with active registrations.')
    })
  })

  describe('409 — wrong status', () => {
    it('returns 409 when event is not DRAFT', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(PUBLISHED_EVENT)

      const res = await request(app)
        .delete(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots/${SLOT_ID}`)
        .set('Cookie', 'sid=sess-org-admin-roles')

      expect(res.status).toBe(409)
    })
  })

  describe('404 — not found', () => {
    it('returns 404 when slot is not found', async () => {
      mockSession(ORG_ADMIN_SESSION)
      vi.mocked(getItem)
        .mockResolvedValueOnce(APPROVED_ORG_ITEM)
        .mockResolvedValueOnce(DRAFT_EVENT)
        .mockResolvedValueOnce(undefined) // slot not found

      const res = await request(app)
        .delete(`/organisation/events/${EVENT_ID}/roles/${ROLE_ID}/slots/nonexistent`)
        .set('Cookie', 'sid=sess-org-admin-roles')

      expect(res.status).toBe(404)
    })
  })
})

// --------------------------------------------------------------------------
// BE-TEST-07: GET /organisation/events/:eventId — nested roles[].slots[]
// --------------------------------------------------------------------------

describe('GET /organisation/events/:eventId — nested roles[].slots[]', () => {
  it('returns event with roles array where each role contains a slots array', async () => {
    mockSession(ORG_ADMIN_SESSION)
    vi.mocked(getItem)
      .mockResolvedValueOnce(APPROVED_ORG_ITEM)
      .mockResolvedValueOnce(DRAFT_EVENT)
    // queryItems returns one ROLE item and one SLOT item
    vi.mocked(queryItems)
      .mockResolvedValueOnce([ROLE_ITEM, SLOT_ITEM]) // all ROLE# prefix items
      .mockResolvedValueOnce([])                      // pending registrations

    const res = await request(app)
      .get(`/organisation/events/${EVENT_ID}`)
      .set('Cookie', 'sid=sess-org-admin-roles')

    expect(res.status).toBe(200)
    expect(res.body.roles).toHaveLength(1)
    expect(res.body.roles[0].roleId).toBe(ROLE_ID)
    expect(res.body.roles[0].slots).toHaveLength(1)
    expect(res.body.roles[0].slots[0].slotId).toBe(SLOT_ID)
  })

  it('returns event with roles: [] when no role items exist', async () => {
    mockSession(ORG_ADMIN_SESSION)
    vi.mocked(getItem)
      .mockResolvedValueOnce(APPROVED_ORG_ITEM)
      .mockResolvedValueOnce(DRAFT_EVENT)
    vi.mocked(queryItems)
      .mockResolvedValueOnce([]) // no items
      .mockResolvedValueOnce([]) // no registrations

    const res = await request(app)
      .get(`/organisation/events/${EVENT_ID}`)
      .set('Cookie', 'sid=sess-org-admin-roles')

    expect(res.status).toBe(200)
    expect(res.body.roles).toEqual([])
  })

  it('groups SLOT items under the correct parent ROLE', async () => {
    const ROLE_2 = { ...ROLE_ITEM, SK: 'ROLE#role-2', roleId: 'role-2', name: 'Medic' }
    const SLOT_2 = { ...SLOT_ITEM, SK: 'ROLE#role-2#SLOT#slot-2', slotId: 'slot-2', roleId: 'role-2' }

    mockSession(ORG_ADMIN_SESSION)
    vi.mocked(getItem)
      .mockResolvedValueOnce(APPROVED_ORG_ITEM)
      .mockResolvedValueOnce(DRAFT_EVENT)
    vi.mocked(queryItems)
      .mockResolvedValueOnce([ROLE_ITEM, ROLE_2, SLOT_ITEM, SLOT_2])
      .mockResolvedValueOnce([])

    const res = await request(app)
      .get(`/organisation/events/${EVENT_ID}`)
      .set('Cookie', 'sid=sess-org-admin-roles')

    expect(res.status).toBe(200)
    expect(res.body.roles).toHaveLength(2)

    const marshalRole = res.body.roles.find((r: { roleId: string }) => r.roleId === ROLE_ID)
    const medicRole = res.body.roles.find((r: { roleId: string }) => r.roleId === 'role-2')

    expect(marshalRole.slots).toHaveLength(1)
    expect(marshalRole.slots[0].slotId).toBe(SLOT_ID)
    expect(medicRole.slots).toHaveLength(1)
    expect(medicRole.slots[0].slotId).toBe('slot-2')
  })
})

// --------------------------------------------------------------------------
// BE-TEST-08: POST /organisation/events/:eventId/publish — tightened guard
// --------------------------------------------------------------------------

describe('POST /organisation/events/:eventId/publish — tightened guard', () => {
  it('returns 400 with unified message when no roles exist', async () => {
    mockSession(ORG_ADMIN_SESSION)
    vi.mocked(getItem)
      .mockResolvedValueOnce(APPROVED_ORG_ITEM)
      .mockResolvedValueOnce(DRAFT_EVENT)
    vi.mocked(queryItems).mockResolvedValueOnce([]) // no roles

    const res = await request(app)
      .post(`/organisation/events/${EVENT_ID}/publish`)
      .set('Cookie', 'sid=sess-org-admin-roles')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Event must have at least one role with at least one slot before publishing.')
  })

  it('returns 400 with unified message when roles exist but none have slots', async () => {
    mockSession(ORG_ADMIN_SESSION)
    vi.mocked(getItem)
      .mockResolvedValueOnce(APPROVED_ORG_ITEM)
      .mockResolvedValueOnce(DRAFT_EVENT)
    vi.mocked(queryItems).mockResolvedValueOnce([ROLE_ITEM]) // role but no slots

    const res = await request(app)
      .post(`/organisation/events/${EVENT_ID}/publish`)
      .set('Cookie', 'sid=sess-org-admin-roles')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Event must have at least one role with at least one slot before publishing.')
  })

  it('succeeds (200) when at least one role with at least one slot exists', async () => {
    mockSession(ORG_ADMIN_SESSION)
    const publishedEvent = { ...DRAFT_EVENT, status: 'PUBLISHED', publishedAt: '2026-05-01T00:00:00.000Z' }
    vi.mocked(getItem)
      .mockResolvedValueOnce(APPROVED_ORG_ITEM)
      .mockResolvedValueOnce(DRAFT_EVENT)
      .mockResolvedValueOnce(publishedEvent)
    // queryItems returns both a ROLE item and a SLOT item
    vi.mocked(queryItems).mockResolvedValueOnce([ROLE_ITEM, SLOT_ITEM])

    const res = await request(app)
      .post(`/organisation/events/${EVENT_ID}/publish`)
      .set('Cookie', 'sid=sess-org-admin-roles')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PUBLISHED')
  })
})
