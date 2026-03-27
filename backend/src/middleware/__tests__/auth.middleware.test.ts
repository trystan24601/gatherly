/**
 * BE-TEST-11: Unit tests for backend/src/middleware/auth.middleware.ts
 *
 * All tests are expected to fail (Red phase) — no implementation exists yet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// Mock session and dynamodb modules
vi.mock('../../lib/session', () => ({
  getSession: vi.fn(),
  isSessionExpired: vi.fn().mockReturnValue(false),
}))

vi.mock('../../lib/dynamodb', () => ({
  getItem: vi.fn(),
}))

import { requireAuth, requireRole, requireApprovedOrg } from '../auth.middleware'
import { getSession, isSessionExpired } from '../../lib/session'
import { getItem } from '../../lib/dynamodb'

function makeMocks(overrides?: { cookies?: Record<string, string> }) {
  const req = {
    cookies: overrides?.cookies ?? {},
    session: undefined as unknown,
  } as unknown as Request

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response

  const next = vi.fn() as unknown as NextFunction

  return { req, res, next }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DYNAMODB_TABLE_NAME = 'test-table'
})

describe('requireAuth middleware', () => {
  it('returns 401 when no sid cookie is present', async () => {
    const { req, res, next } = makeMocks({ cookies: {} })

    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when session is not found in DynamoDB', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)
    const { req, res, next } = makeMocks({ cookies: { sid: 'nonexistent-session' } })

    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when session is expired', async () => {
    const expiredSession = {
      sessionId: 'sess-expired',
      userId: 'user-1',
      role: 'VOLUNTEER',
      createdAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    }
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(expiredSession)
    ;(isSessionExpired as ReturnType<typeof vi.fn>).mockReturnValueOnce(true)
    const { req, res, next } = makeMocks({ cookies: { sid: 'sess-expired' } })

    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() and attaches req.session when session is valid', async () => {
    const validSession = {
      sessionId: 'sess-valid',
      userId: 'user-1',
      role: 'VOLUNTEER',
      createdAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    }
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(validSession)
    const { req, res, next } = makeMocks({ cookies: { sid: 'sess-valid' } })

    await requireAuth(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect((req as unknown as { session: typeof validSession }).session).toMatchObject({
      userId: 'user-1',
      role: 'VOLUNTEER',
    })
  })
})

describe('requireRole middleware', () => {
  it('returns 403 when req.session.role does not match required role', async () => {
    const { req, res, next } = makeMocks()
    ;(req as unknown as { session: { userId: string; role: string } }).session = {
      userId: 'user-1',
      role: 'VOLUNTEER',
    }

    const middleware = requireRole('ORG_ADMIN')
    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() when req.session.role matches required role', async () => {
    const { req, res, next } = makeMocks()
    ;(req as unknown as { session: { userId: string; role: string } }).session = {
      userId: 'user-1',
      role: 'ORG_ADMIN',
    }

    const middleware = requireRole('ORG_ADMIN')
    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('calls next() when SUPER_ADMIN accesses any role-required endpoint', async () => {
    const { req, res, next } = makeMocks()
    ;(req as unknown as { session: { userId: string; role: string } }).session = {
      userId: 'user-1',
      role: 'SUPER_ADMIN',
    }

    const middleware = requireRole('ORG_ADMIN')
    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })
})

describe('requireApprovedOrg middleware', () => {
  it('returns 403 when org status is PENDING', async () => {
    const { req, res, next } = makeMocks()
    ;(req as unknown as { session: { userId: string; role: string; orgId: string } }).session = {
      userId: 'user-1',
      role: 'ORG_ADMIN',
      orgId: 'org-pending',
    }
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      PK: 'ORG#org-pending',
      SK: 'PROFILE',
      status: 'PENDING',
    })

    await requireApprovedOrg(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Organisation is not approved.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() when org status is APPROVED', async () => {
    const { req, res, next } = makeMocks()
    ;(req as unknown as { session: { userId: string; role: string; orgId: string } }).session = {
      userId: 'user-1',
      role: 'ORG_ADMIN',
      orgId: 'org-approved',
    }
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      PK: 'ORG#org-approved',
      SK: 'PROFILE',
      status: 'APPROVED',
    })

    await requireApprovedOrg(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('returns 403 when org status is REJECTED', async () => {
    const { req, res, next } = makeMocks()
    ;(req as unknown as { session: { userId: string; role: string; orgId: string } }).session = {
      userId: 'user-1',
      role: 'ORG_ADMIN',
      orgId: 'org-rejected',
    }
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      PK: 'ORG#org-rejected',
      SK: 'PROFILE',
      status: 'REJECTED',
    })

    await requireApprovedOrg(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Organisation is not approved.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when orgId is missing from session', async () => {
    const { req, res, next } = makeMocks()
    ;(req as unknown as { session: { userId: string; role: string } }).session = {
      userId: 'user-1',
      role: 'ORG_ADMIN',
    }

    await requireApprovedOrg(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})
