/**
 * BE-TEST-01: Integration tests for POST /organisations/register
 *
 * These tests are written in the Red phase — they must fail before
 * the implementation exists.
 *
 * Strategy: mock dynamodb, session lib, and orgMailer at module level
 * so tests are hermetic and fast. The Express app is imported from ../../app.
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

vi.mock('../../lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/auth')>()
  return {
    ...actual,
    hashPassword: vi.fn().mockResolvedValue('$2b$12$hashed'),
    verifyPassword: vi.fn().mockResolvedValue(true),
  }
})

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { app } from '../../app'
import { getItem, transactWrite } from '../../lib/dynamodb'
import { enqueueOrgSubmitted } from '../../lib/orgMailer'

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const VALID_PAYLOAD = {
  name: 'Sunrise Running Club',
  orgType: 'SPORTS_CLUB',
  description: 'A community running club based in South London for all abilities.',
  contactEmail: 'hello@sunrise-runners.co.uk',
  contactPhone: '07700900123',
  website: 'https://sunrise-runners.co.uk',
  adminFirstName: 'Alice',
  adminLastName: 'Smith',
  adminEmail: 'alice@sunrise-runners.co.uk',
  adminPassword: 'SecurePass1',
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DYNAMODB_TABLE_NAME = 'test-table'
  // Default: adminEmail USEREMAIL sentinel does NOT exist (no conflict)
  ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
})

// --------------------------------------------------------------------------
// POST /organisations/register
// --------------------------------------------------------------------------

describe('POST /organisations/register', () => {
  it('returns 201 with orgId and message on valid payload', async () => {
    const res = await request(app).post('/organisations/register').send(VALID_PAYLOAD)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('orgId')
    expect(res.body).toHaveProperty('message')
    expect(typeof res.body.orgId).toBe('string')
    expect(res.body.orgId.length).toBeGreaterThan(0)
  })

  it('calls transactWrite once on valid payload', async () => {
    await request(app).post('/organisations/register').send(VALID_PAYLOAD)

    expect(transactWrite).toHaveBeenCalledOnce()
  })

  it('enqueues ORG_SUBMITTED on success', async () => {
    await request(app).post('/organisations/register').send(VALID_PAYLOAD)

    expect(enqueueOrgSubmitted).toHaveBeenCalledOnce()
  })

  it('does NOT set a sid cookie on success (user is not auto-logged-in)', async () => {
    const res = await request(app).post('/organisations/register').send(VALID_PAYLOAD)

    expect(res.status).toBe(201)
    const setCookieHeader = res.headers['set-cookie'] as string[] | string | undefined
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : setCookieHeader
        ? [setCookieHeader]
        : []
    const hasSid = cookies.some((c) => c.startsWith('sid='))
    expect(hasSid).toBe(false)
  })

  // --------------------------------------------------------------------------
  // Required field validation (400)
  // --------------------------------------------------------------------------

  it.each([
    ['name'],
    ['orgType'],
    ['description'],
    ['contactEmail'],
    ['contactPhone'],
    ['adminFirstName'],
    ['adminLastName'],
    ['adminEmail'],
    ['adminPassword'],
  ])('returns 400 when required field "%s" is missing', async (field) => {
    const payload = { ...VALID_PAYLOAD }
    delete (payload as Record<string, unknown>)[field]

    const res = await request(app).post('/organisations/register').send(payload)

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  // --------------------------------------------------------------------------
  // Field-level validation
  // --------------------------------------------------------------------------

  it('returns 400 when name is shorter than 3 chars', async () => {
    const res = await request(app)
      .post('/organisations/register')
      .send({ ...VALID_PAYLOAD, name: 'AB' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when name is longer than 100 chars', async () => {
    const res = await request(app)
      .post('/organisations/register')
      .send({ ...VALID_PAYLOAD, name: 'A'.repeat(101) })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when description is shorter than 20 chars', async () => {
    const res = await request(app)
      .post('/organisations/register')
      .send({ ...VALID_PAYLOAD, description: 'Too short desc.' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when description is longer than 1000 chars', async () => {
    const res = await request(app)
      .post('/organisations/register')
      .send({ ...VALID_PAYLOAD, description: 'A'.repeat(1001) })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it.each([['INVALID_TYPE'], ['sports_club'], ['Charity'], ['']])(
    'returns 400 when orgType is "%s" (not a valid enum value)',
    async (orgType) => {
      const res = await request(app)
        .post('/organisations/register')
        .send({ ...VALID_PAYLOAD, orgType })

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    }
  )

  it.each([['SPORTS_CLUB'], ['CHARITY'], ['COMMUNITY'], ['OTHER']])(
    'returns 201 when orgType is valid enum value "%s"',
    async (orgType) => {
      const res = await request(app)
        .post('/organisations/register')
        .send({ ...VALID_PAYLOAD, orgType, contactEmail: `test-${orgType}@example.com` })

      expect(res.status).toBe(201)
    }
  )

  it('returns 400 when contactEmail is not a valid email', async () => {
    const res = await request(app)
      .post('/organisations/register')
      .send({ ...VALID_PAYLOAD, contactEmail: 'not-an-email' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it.each([
    ['07700900123'],       // valid UK mobile with 0
    ['07700 900 123'],     // spaces — should still be invalid due to non-digits
    ['+447700900123'],     // valid +44 prefix
    ['01234567890'],       // valid landline with 0
    ['not-a-phone'],       // clearly invalid
    ['1234567890'],        // no leading 0 or +44
    ['0770090012'],        // too short (9 digits after 0)
  ])(
    'validates UK phone "%s" correctly',
    async (contactPhone) => {
      const res = await request(app)
        .post('/organisations/register')
        .send({ ...VALID_PAYLOAD, contactPhone })

      // Valid UK phone formats should pass; invalid should return 400
      const validUkPhones = ['07700900123', '+447700900123', '01234567890']
      if (validUkPhones.includes(contactPhone)) {
        expect(res.status).toBe(201)
      } else {
        expect(res.status).toBe(400)
        expect(res.body).toHaveProperty('error')
      }
    }
  )

  it('returns 400 when adminPassword is weak (< 8 chars)', async () => {
    const res = await request(app)
      .post('/organisations/register')
      .send({ ...VALID_PAYLOAD, adminPassword: 'Short1' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when adminPassword has no uppercase letter', async () => {
    const res = await request(app)
      .post('/organisations/register')
      .send({ ...VALID_PAYLOAD, adminPassword: 'alllowercase1' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when adminPassword has no number', async () => {
    const res = await request(app)
      .post('/organisations/register')
      .send({ ...VALID_PAYLOAD, adminPassword: 'NoNumbersHere' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when website is provided but not a valid URL', async () => {
    const res = await request(app)
      .post('/organisations/register')
      .send({ ...VALID_PAYLOAD, website: 'not-a-url' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 201 when website is a valid URL', async () => {
    const res = await request(app)
      .post('/organisations/register')
      .send({ ...VALID_PAYLOAD, website: 'https://valid-site.co.uk' })

    expect(res.status).toBe(201)
  })

  it('returns 201 when website is omitted (optional field)', async () => {
    const { website: _w, ...payloadWithoutWebsite } = VALID_PAYLOAD // eslint-disable-line @typescript-eslint/no-unused-vars
    const res = await request(app).post('/organisations/register').send(payloadWithoutWebsite)

    expect(res.status).toBe(201)
  })

  // --------------------------------------------------------------------------
  // 409 — duplicate email handling
  // --------------------------------------------------------------------------

  it('returns 409 with adminEmail conflict message when USEREMAIL sentinel exists', async () => {
    // Pre-check GetItem returns a sentinel → admin email already registered
    (getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      PK: 'USEREMAIL#alice@sunrise-runners.co.uk',
      SK: 'LOCK',
      userId: 'some-existing-user',
    })

    const res = await request(app).post('/organisations/register').send(VALID_PAYLOAD)

    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'An account with this email already exists.' })
  })

  it('returns 409 with org email conflict message when TransactWrite fails on ORGEMAIL condition', async () => {
    // USEREMAIL pre-check passes (no existing user)
    (getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)
    // TransactWrite throws TransactionCanceledException
    const txError = new Error('Transaction cancelled')
    txError.name = 'TransactionCanceledException'
    ;(transactWrite as ReturnType<typeof vi.fn>).mockRejectedValueOnce(txError)

    const res = await request(app).post('/organisations/register').send(VALID_PAYLOAD)

    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'An organisation with this email is already registered.' })
  })
})
