/**
 * BE-TEST-04 through BE-TEST-10:
 * Integration tests for all /auth endpoints via supertest.
 *
 * All tests are expected to fail (Red phase) — no implementation exists yet.
 *
 * Strategy: mock dynamodb, bcryptjs, session lib, and rateLimiter at module
 * level so tests are hermetic and fast. The Express app is imported from
 * ../../app which will mount the /auth router once implemented.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'

// --------------------------------------------------------------------------
// Module mocks — must be hoisted before any imports that use them
// --------------------------------------------------------------------------

vi.mock('../../lib/dynamodb', () => ({
  getItem: vi.fn(),
  putItem: vi.fn().mockResolvedValue(undefined),
  deleteItem: vi.fn().mockResolvedValue(undefined),
  updateItem: vi.fn().mockResolvedValue(undefined),
  transactWrite: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../lib/session', () => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  deleteSession: vi.fn(),
  isSessionExpired: vi.fn().mockReturnValue(false),
}))

vi.mock('../../lib/rateLimiter', () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
  recordFailedAttempt: vi.fn().mockReturnValue(false),
  resetLimiter: vi.fn(),
}))

vi.mock('../../lib/mailer', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/auth')>()
  return {
    ...actual,
    hashPassword: vi.fn().mockResolvedValue('$2b$12$hashed'),
    verifyPassword: vi.fn().mockResolvedValue(true),
  }
})

// --------------------------------------------------------------------------
// Imports (after mocks are set up)
// --------------------------------------------------------------------------

import { app } from '../../app'
import { getItem, putItem, deleteItem, updateItem, transactWrite } from '../../lib/dynamodb'
import { createSession, getSession, isSessionExpired } from '../../lib/session'
import { isRateLimited } from '../../lib/rateLimiter'
import { verifyPassword } from '../../lib/auth'

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const VOLUNTEER_USER = {
  PK: 'USER#user-vol',
  SK: 'PROFILE',
  userId: 'user-vol',
  email: 'vol@example.com',
  firstName: 'Test',
  lastName: 'Volunteer',
  role: 'VOLUNTEER',
  passwordHash: '$2b$12$hashed',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const ORG_ADMIN_USER = {
  PK: 'USER#user-admin',
  SK: 'PROFILE',
  userId: 'user-admin',
  email: 'admin@example.com',
  firstName: 'Test',
  lastName: 'Admin',
  role: 'ORG_ADMIN',
  orgId: 'org-123',
  passwordHash: '$2b$12$hashed',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const SUPER_ADMIN_USER = {
  PK: 'USER#user-super',
  SK: 'PROFILE',
  userId: 'user-super',
  email: 'super@example.com',
  firstName: 'Super',
  lastName: 'Admin',
  role: 'SUPER_ADMIN',
  passwordHash: '$2b$12$hashed',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const VALID_SESSION = {
  sessionId: 'sess-abc',
  userId: 'user-vol',
  role: 'VOLUNTEER',
  createdAt: new Date().toISOString(),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
}

beforeEach(() => {
  process.env.DYNAMODB_TABLE_NAME = 'test-table'
  process.env.SESSION_SECRET = 'test-secret'
  process.env.NODE_ENV = 'test'
  // Reset all mocks including queued mockResolvedValueOnce calls and implementations
  vi.resetAllMocks()

  // Re-establish module-level defaults after reset
  ;(verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true)
  ;(createSession as ReturnType<typeof vi.fn>).mockResolvedValue(VALID_SESSION)
  ;(isRateLimited as ReturnType<typeof vi.fn>).mockReturnValue(false)
  ;(isSessionExpired as ReturnType<typeof vi.fn>).mockReturnValue(false)
  ;(putItem as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  ;(deleteItem as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  ;(updateItem as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  ;(transactWrite as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
})

// --------------------------------------------------------------------------
// POST /auth/register (BE-TEST-04)
// --------------------------------------------------------------------------

describe('POST /auth/register', () => {
  it('returns 201 with user profile (no passwordHash) and sets sid cookie on valid payload', async () => {
    // No existing USEREMAIL item
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'new@example.com',
        password: 'StrongPass1!',
        firstName: 'New',
        lastName: 'User',
      })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      role: 'VOLUNTEER',
    })
    expect(res.body.passwordHash).toBeUndefined()
    expect(res.headers['set-cookie']).toBeDefined()
    expect(
      (res.headers['set-cookie'] as unknown as string[]).some((c: string) => c.startsWith('sid='))
    ).toBe(true)
  })

  it('returns 409 with descriptive error when email is already registered', async () => {
    // USEREMAIL item exists — simulate TransactWrite throwing TransactionCanceledException
    ;(transactWrite as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('Transaction cancelled'), {
        name: 'TransactionCanceledException',
      })
    )

    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'existing@example.com',
        password: 'StrongPass1!',
        firstName: 'Dup',
        lastName: 'User',
      })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('An account with this email already exists.')
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'missing@example.com' }) // no password, firstName, lastName

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('returns 400 when password is too weak — no uppercase', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'weak@example.com',
        password: 'nouppercase1!',
        firstName: 'Weak',
        lastName: 'Pass',
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('returns 400 when password is too weak — under 8 characters', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'short@example.com',
        password: 'Sh1!',
        firstName: 'Short',
        lastName: 'Pass',
      })

    expect(res.status).toBe(400)
  })

  it('returns 400 when password has no number', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'nonumber@example.com',
        password: 'NoNumbers!',
        firstName: 'No',
        lastName: 'Number',
      })

    expect(res.status).toBe(400)
  })
})

// --------------------------------------------------------------------------
// POST /auth/login (BE-TEST-05)
// --------------------------------------------------------------------------

describe('POST /auth/login', () => {
  it('returns 200 with profile and sets sid cookie on valid credentials', async () => {
    ;(getItem as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ PK: 'USEREMAIL#vol@example.com', SK: 'LOCK', userId: 'user-vol' })
      .mockResolvedValueOnce(VOLUNTEER_USER)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'vol@example.com', password: 'StrongPass1!' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      userId: 'user-vol',
      email: 'vol@example.com',
      role: 'VOLUNTEER',
    })
    expect(res.body.passwordHash).toBeUndefined()
    expect(
      (res.headers['set-cookie'] as unknown as string[]).some((c: string) => c.startsWith('sid='))
    ).toBe(true)
  })

  it('returns 401 with non-enumerable error when password is wrong', async () => {
    ;(getItem as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ PK: 'USEREMAIL#vol@example.com', SK: 'LOCK', userId: 'user-vol' })
      .mockResolvedValueOnce(VOLUNTEER_USER)
    ;(verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'vol@example.com', password: 'WrongPass1!' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid email or password.')
  })

  it('returns 401 with same error when email is unknown (no enumeration)', async () => {
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'unknown@example.com', password: 'StrongPass1!' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid email or password.')
  })

  it('returns 429 on the 6th failed login attempt from the same IP', async () => {
    ;(isRateLimited as ReturnType<typeof vi.fn>).mockReturnValueOnce(true)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'vol@example.com', password: 'AnyPass1!' })

    expect(res.status).toBe(429)
    expect(res.body.error).toBe('Too many login attempts. Try again in 15 minutes.')
  })
})

// --------------------------------------------------------------------------
// POST /auth/org/login (BE-TEST-06)
// --------------------------------------------------------------------------

describe('POST /auth/org/login', () => {
  it('returns 200 with profile including orgId for valid org admin credentials', async () => {
    ;(createSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      sessionId: 'sess-org',
      userId: 'user-admin',
      role: 'ORG_ADMIN',
      orgId: 'org-123',
      createdAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    })
    ;(getItem as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ PK: 'USEREMAIL#admin@example.com', SK: 'LOCK', userId: 'user-admin' })
      .mockResolvedValueOnce(ORG_ADMIN_USER)

    const res = await request(app)
      .post('/auth/org/login')
      .send({ email: 'admin@example.com', password: 'StrongPass1!' })

    expect(res.status).toBe(200)
    expect(res.body.orgId).toBe('org-123')
    expect(res.body.role).toBe('ORG_ADMIN')
  })

  it('returns 401 for invalid credentials', async () => {
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    const res = await request(app)
      .post('/auth/org/login')
      .send({ email: 'nobody@example.com', password: 'Bad1!' })

    expect(res.status).toBe(401)
  })

  it('returns 401 when user exists but is not an ORG_ADMIN', async () => {
    ;(getItem as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ PK: 'USEREMAIL#vol@example.com', SK: 'LOCK', userId: 'user-vol' })
      .mockResolvedValueOnce(VOLUNTEER_USER)

    const res = await request(app)
      .post('/auth/org/login')
      .send({ email: 'vol@example.com', password: 'StrongPass1!' })

    expect(res.status).toBe(401)
  })
})

// --------------------------------------------------------------------------
// POST /auth/admin/login (BE-TEST-07)
// --------------------------------------------------------------------------

describe('POST /auth/admin/login', () => {
  it('returns 200 for valid super admin credentials', async () => {
    ;(createSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      sessionId: 'sess-super',
      userId: 'user-super',
      role: 'SUPER_ADMIN',
      createdAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    })
    ;(getItem as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ PK: 'USEREMAIL#super@example.com', SK: 'LOCK', userId: 'user-super' })
      .mockResolvedValueOnce(SUPER_ADMIN_USER)

    const res = await request(app)
      .post('/auth/admin/login')
      .send({ email: 'super@example.com', password: 'SuperPass1!' })

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('SUPER_ADMIN')
  })

  it('returns 401 for invalid credentials', async () => {
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    const res = await request(app)
      .post('/auth/admin/login')
      .send({ email: 'nobody@example.com', password: 'Bad1!' })

    expect(res.status).toBe(401)
  })

  it('returns 401 when user exists but is not SUPER_ADMIN', async () => {
    ;(getItem as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ PK: 'USEREMAIL#vol@example.com', SK: 'LOCK', userId: 'user-vol' })
      .mockResolvedValueOnce(VOLUNTEER_USER)

    const res = await request(app)
      .post('/auth/admin/login')
      .send({ email: 'vol@example.com', password: 'StrongPass1!' })

    expect(res.status).toBe(401)
  })
})

// --------------------------------------------------------------------------
// POST /auth/logout (BE-TEST-08)
// --------------------------------------------------------------------------

describe('POST /auth/logout', () => {
  it('returns 204 and clears the sid cookie when a valid sid cookie is present', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', 'sid=sess-abc')

    expect(res.status).toBe(204)
    // Cookie should be cleared (set to empty / past expiry)
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined
    if (setCookie) {
      const sidCookie = setCookie.find((c: string) => c.startsWith('sid='))
      expect(sidCookie).toMatch(/sid=;|sid=\s*;|Max-Age=0|Expires=.*1970/i)
    }
  })

  it('returns 204 (idempotent) when no sid cookie is present', async () => {
    const res = await request(app).post('/auth/logout')

    expect(res.status).toBe(204)
  })
})

// --------------------------------------------------------------------------
// GET /auth/me (BE-TEST-09)
// --------------------------------------------------------------------------

describe('GET /auth/me', () => {
  it('returns 200 with user profile when a valid sid cookie is present', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(VALID_SESSION)
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(VOLUNTEER_USER)

    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', 'sid=sess-abc')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      userId: 'user-vol',
      email: 'vol@example.com',
      firstName: 'Test',
      lastName: 'Volunteer',
      role: 'VOLUNTEER',
    })
    expect(res.body.passwordHash).toBeUndefined()
  })

  it('returns 401 when no sid cookie is present', async () => {
    const res = await request(app).get('/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Authentication required.')
  })

  it('returns 401 when session is expired', async () => {
    const expiredSession = {
      ...VALID_SESSION,
      expiresAt: Math.floor(Date.now() / 1000) - 3600,
    }
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(expiredSession)
    ;(isSessionExpired as ReturnType<typeof vi.fn>).mockReturnValueOnce(true)

    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', 'sid=sess-expired')

    expect(res.status).toBe(401)
  })

  it('returns 401 when session id is not found in DB', async () => {
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', 'sid=sess-missing')

    expect(res.status).toBe(401)
  })
})

// --------------------------------------------------------------------------
// Password reset (BE-TEST-10)
// --------------------------------------------------------------------------

describe('POST /auth/password-reset/request', () => {
  it('returns 200 for a known email without revealing existence', async () => {
    ;(getItem as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ PK: 'USEREMAIL#vol@example.com', SK: 'LOCK', userId: 'user-vol' })
      .mockResolvedValueOnce(VOLUNTEER_USER)

    const res = await request(app)
      .post('/auth/password-reset/request')
      .send({ email: 'vol@example.com' })

    expect(res.status).toBe(200)
  })

  it('returns 200 for an unknown email (no enumeration)', async () => {
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    const res = await request(app)
      .post('/auth/password-reset/request')
      .send({ email: 'unknown@example.com' })

    expect(res.status).toBe(200)
  })
})

describe('POST /auth/password-reset/confirm', () => {
  it('returns 200 and updates password hash for a valid token and strong password', async () => {
    const validResetItem = {
      PK: 'RESET#valid-token',
      SK: 'PROFILE',
      token: 'valid-token',
      userId: 'user-vol',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      used: false,
    }
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(validResetItem)

    const res = await request(app)
      .post('/auth/password-reset/confirm')
      .send({ token: 'valid-token', password: 'NewPass123!' })

    expect(res.status).toBe(200)
    expect(updateItem).toHaveBeenCalled()
  })

  it('returns 400 for an invalid token', async () => {
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    const res = await request(app)
      .post('/auth/password-reset/confirm')
      .send({ token: 'bad-token', password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid or expired reset token.')
  })

  it('returns 400 for an expired reset token', async () => {
    const expiredResetItem = {
      PK: 'RESET#expired-token',
      SK: 'PROFILE',
      token: 'expired-token',
      userId: 'user-vol',
      expiresAt: Math.floor(Date.now() / 1000) - 3600, // past
      used: false,
    }
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(expiredResetItem)

    const res = await request(app)
      .post('/auth/password-reset/confirm')
      .send({ token: 'expired-token', password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid or expired reset token.')
  })
})
