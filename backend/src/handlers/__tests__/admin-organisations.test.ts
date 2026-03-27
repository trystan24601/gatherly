/**
 * BE-TEST-02: Integration tests for /admin/organisations endpoints
 *
 * Tests are written in the Red phase — they must fail before implementation.
 *
 * Strategy: mock dynamodb, session lib, and orgMailer at module level.
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

vi.mock('../../lib/rateLimiter', () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
  recordFailedAttempt: vi.fn().mockReturnValue(false),
  resetLimiter: vi.fn(),
}))

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { app } from '../../app'
import { getItem, queryItemsPaginated, updateItem } from '../../lib/dynamodb'
import { getSession, isSessionExpired } from '../../lib/session'
import { enqueueOrgApproved, enqueueOrgRejected } from '../../lib/orgMailer'

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

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
  orgId: 'org-approved',
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

const PENDING_ORG = {
  PK: 'ORG#org-pending-1',
  SK: 'PROFILE',
  orgId: 'org-pending-1',
  name: 'Pending Running Club',
  orgType: 'SPORTS_CLUB',
  description: 'A pending org for testing purposes.',
  status: 'PENDING',
  contactEmail: 'hello@pending-running.co.uk',
  contactPhone: '07700900100',
  adminUserId: 'user-org-admin',
  submittedAt: '2026-03-01T10:00:00.000Z',
  GSI1PK: 'ORG_STATUS#PENDING',
  GSI1SK: '2026-03-01T10:00:00.000Z#org-pending-1',
}

/** Helper to set up SUPER_ADMIN session cookie via mock */
function mockSuperAdminSession() {
  ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(SUPER_ADMIN_SESSION)
  ;(isSessionExpired as ReturnType<typeof vi.fn>).mockReturnValue(false)
}

function mockOrgAdminSession() {
  ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(ORG_ADMIN_SESSION)
  ;(isSessionExpired as ReturnType<typeof vi.fn>).mockReturnValue(false)
}

function mockVolunteerSession() {
  ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(VOLUNTEER_SESSION)
  ;(isSessionExpired as ReturnType<typeof vi.fn>).mockReturnValue(false)
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DYNAMODB_TABLE_NAME = 'test-table'
})

// --------------------------------------------------------------------------
// GET /admin/organisations
// --------------------------------------------------------------------------

describe('GET /admin/organisations', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const res = await request(app)
      .get('/admin/organisations')
      .set('Cookie', 'sid=nonexistent')

    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated as VOLUNTEER', async () => {
    mockVolunteerSession()

    const res = await request(app)
      .get('/admin/organisations')
      .set('Cookie', 'sid=sess-volunteer')

    expect(res.status).toBe(403)
  })

  it('returns 403 when authenticated as ORG_ADMIN', async () => {
    mockOrgAdminSession()

    const res = await request(app)
      .get('/admin/organisations')
      .set('Cookie', 'sid=sess-org-admin')

    expect(res.status).toBe(403)
  })

  it('returns paginated list with items[] and cursor for SUPER_ADMIN', async () => {
    mockSuperAdminSession()
    ;(queryItemsPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      items: [PENDING_ORG],
      lastEvaluatedKey: undefined,
    })

    const res = await request(app)
      .get('/admin/organisations?status=PENDING')
      .set('Cookie', 'sid=sess-super-admin')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].orgId).toBe('org-pending-1')
    expect(res.body).toHaveProperty('cursor')
  })

  it('defaults to PENDING status when status param is omitted', async () => {
    mockSuperAdminSession()
    ;(queryItemsPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      items: [PENDING_ORG],
      lastEvaluatedKey: undefined,
    })

    const res = await request(app)
      .get('/admin/organisations')
      .set('Cookie', 'sid=sess-super-admin')

    expect(res.status).toBe(200)
    // Confirm queryItemsPaginated was called with the PENDING GSI1PK
    expect(queryItemsPaginated).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ ':gsi1pk': 'ORG_STATUS#PENDING' }),
      expect.anything()
    )
  })

  it('returns null cursor when there are no more pages', async () => {
    mockSuperAdminSession()
    ;(queryItemsPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      items: [PENDING_ORG],
      lastEvaluatedKey: undefined,
    })

    const res = await request(app)
      .get('/admin/organisations')
      .set('Cookie', 'sid=sess-super-admin')

    expect(res.status).toBe(200)
    expect(res.body.cursor).toBeNull()
  })
})

// --------------------------------------------------------------------------
// GET /admin/organisations/:orgId
// --------------------------------------------------------------------------

describe('GET /admin/organisations/:orgId', () => {
  it('returns 404 when org does not exist', async () => {
    mockSuperAdminSession()
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    const res = await request(app)
      .get('/admin/organisations/nonexistent-org')
      .set('Cookie', 'sid=sess-super-admin')

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('returns full org detail for SUPER_ADMIN', async () => {
    mockSuperAdminSession()
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORG)

    const res = await request(app)
      .get('/admin/organisations/org-pending-1')
      .set('Cookie', 'sid=sess-super-admin')

    expect(res.status).toBe(200)
    expect(res.body.orgId).toBe('org-pending-1')
    expect(res.body.name).toBe('Pending Running Club')
    expect(res.body.status).toBe('PENDING')
  })
})

// --------------------------------------------------------------------------
// POST /admin/organisations/:orgId/approve
// --------------------------------------------------------------------------

describe('POST /admin/organisations/:orgId/approve', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const res = await request(app)
      .post('/admin/organisations/org-pending-1/approve')
      .set('Cookie', 'sid=nonexistent')

    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated as wrong role', async () => {
    mockOrgAdminSession()

    const res = await request(app)
      .post('/admin/organisations/org-pending-1/approve')
      .set('Cookie', 'sid=sess-org-admin')

    expect(res.status).toBe(403)
  })

  it('returns 404 when org does not exist', async () => {
    mockSuperAdminSession()
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    const res = await request(app)
      .post('/admin/organisations/nonexistent-org/approve')
      .set('Cookie', 'sid=sess-super-admin')

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 409 when org is not currently PENDING', async () => {
    mockSuperAdminSession()
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...PENDING_ORG,
      status: 'APPROVED',
    })

    const res = await request(app)
      .post('/admin/organisations/org-pending-1/approve')
      .set('Cookie', 'sid=sess-super-admin')

    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('error')
  })

  it('approves org: sets status=APPROVED, updates GSI1PK, calls enqueueOrgApproved', async () => {
    mockSuperAdminSession()
    const APPROVED_ORG = { ...PENDING_ORG, status: 'APPROVED', approvedAt: new Date().toISOString() }
    const ADMIN_USER = {
      PK: 'USER#user-org-admin',
      SK: 'PROFILE',
      userId: 'user-org-admin',
      email: 'admin@pending-running.co.uk',
      firstName: 'Pending',
      lastName: 'Admin',
      role: 'ORG_ADMIN',
    }
    // First getItem: fetch org to check status
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORG)
    // Second getItem: fetch updated org after updateItem
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(APPROVED_ORG)
    // Third getItem: fetch admin user for email notification
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ADMIN_USER)

    const res = await request(app)
      .post('/admin/organisations/org-pending-1/approve')
      .set('Cookie', 'sid=sess-super-admin')

    expect(res.status).toBe(200)
    expect(updateItem).toHaveBeenCalledOnce()
    // Verify updateItem was called with APPROVED status and GSI1PK
    const updateCall = (updateItem as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(updateCall[2]).toContain('status')
    expect(updateCall[3]).toMatchObject(expect.objectContaining({
      ':status': 'APPROVED',
      ':gsi1pk': 'ORG_STATUS#APPROVED',
    }))
    expect(enqueueOrgApproved).toHaveBeenCalledOnce()
  })
})

// --------------------------------------------------------------------------
// POST /admin/organisations/:orgId/reject
// --------------------------------------------------------------------------

describe('POST /admin/organisations/:orgId/reject', () => {
  it('returns 400 when reason is missing', async () => {
    mockSuperAdminSession()
    // No getItem mock needed — handler returns 400 before any DB call

    const res = await request(app)
      .post('/admin/organisations/org-pending-1/reject')
      .set('Cookie', 'sid=sess-super-admin')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when reason is shorter than 10 chars', async () => {
    mockSuperAdminSession()
    // No getItem mock needed — handler returns 400 before any DB call

    const res = await request(app)
      .post('/admin/organisations/org-pending-1/reject')
      .set('Cookie', 'sid=sess-super-admin')
      .send({ reason: 'Too short' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 409 when org is not currently PENDING', async () => {
    mockSuperAdminSession()
    // First getItem: org is already REJECTED (not PENDING)
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...PENDING_ORG,
      status: 'REJECTED',
    })

    const res = await request(app)
      .post('/admin/organisations/org-pending-1/reject')
      .set('Cookie', 'sid=sess-super-admin')
      .send({ reason: 'This is a valid reason for rejection.' })

    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('error')
  })

  it('rejects org: sets status=REJECTED, rejectionReason, updates GSI1PK, calls enqueueOrgRejected', async () => {
    mockSuperAdminSession()
    const reason = 'The organisation details could not be verified with the provided evidence.'
    const REJECTED_ORG = {
      ...PENDING_ORG,
      status: 'REJECTED',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
    }
    const ADMIN_USER = {
      PK: 'USER#user-org-admin',
      SK: 'PROFILE',
      userId: 'user-org-admin',
      email: 'admin@pending-running.co.uk',
      firstName: 'Pending',
      lastName: 'Admin',
      role: 'ORG_ADMIN',
    }
    // First getItem: fetch org to check status (PENDING)
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(PENDING_ORG)
    // Second getItem: fetch updated org after updateItem
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(REJECTED_ORG)
    // Third getItem: fetch admin user for email notification
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ADMIN_USER)

    const res = await request(app)
      .post('/admin/organisations/org-pending-1/reject')
      .set('Cookie', 'sid=sess-super-admin')
      .send({ reason })

    expect(res.status).toBe(200)
    expect(updateItem).toHaveBeenCalledOnce()
    const updateCall = (updateItem as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(updateCall[3]).toMatchObject(expect.objectContaining({
      ':status': 'REJECTED',
      ':gsi1pk': 'ORG_STATUS#REJECTED',
      ':rejectionReason': reason,
    }))
    expect(enqueueOrgRejected).toHaveBeenCalledOnce()
  })
})
