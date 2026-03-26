/**
 * BE-TEST-01: Unit tests for backend/src/lib/auth.ts
 *
 * Tests run against the module under test — no implementation exists yet
 * so all tests are expected to fail (Red phase).
 */
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, generateSessionId, computeExpiresAt } from '../auth'

describe('auth lib — hashPassword', () => {
  it('returns a bcrypt hash string starting with $2b$', async () => {
    const hash = await hashPassword('MySecret1!')
    expect(hash).toMatch(/^\$2b\$/)
  })

  it('uses cost factor 12', async () => {
    const hash = await hashPassword('MySecret1!')
    // bcrypt hash format: $2b$<cost>$...
    expect(hash).toMatch(/^\$2b\$12\$/)
  })

  it('produces a different hash on each call (salt is random)', async () => {
    const h1 = await hashPassword('Same1!')
    const h2 = await hashPassword('Same1!')
    expect(h1).not.toBe(h2)
  })
})

describe('auth lib — verifyPassword', () => {
  it('returns true when plain password matches the hash', async () => {
    const hash = await hashPassword('Correct1!')
    const result = await verifyPassword('Correct1!', hash)
    expect(result).toBe(true)
  })

  it('returns false when plain password does not match the hash', async () => {
    const hash = await hashPassword('Correct1!')
    const result = await verifyPassword('Wrong1!', hash)
    expect(result).toBe(false)
  })
})

describe('auth lib — generateSessionId', () => {
  it('returns a UUID v4 string', () => {
    const id = generateSessionId()
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('returns a unique value each call', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateSessionId()))
    expect(ids.size).toBe(50)
  })
})

describe('auth lib — computeExpiresAt', () => {
  it('returns epoch seconds approximately 7 days in the future for VOLUNTEER', () => {
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = computeExpiresAt('VOLUNTEER')
    const sevenDays = 7 * 24 * 60 * 60
    expect(expiresAt).toBeGreaterThanOrEqual(now + sevenDays - 5)
    expect(expiresAt).toBeLessThanOrEqual(now + sevenDays + 5)
  })

  it('returns epoch seconds approximately 7 days in the future for ORG_ADMIN', () => {
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = computeExpiresAt('ORG_ADMIN')
    const sevenDays = 7 * 24 * 60 * 60
    expect(expiresAt).toBeGreaterThanOrEqual(now + sevenDays - 5)
    expect(expiresAt).toBeLessThanOrEqual(now + sevenDays + 5)
  })

  it('returns epoch seconds approximately 8 hours in the future for SUPER_ADMIN', () => {
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = computeExpiresAt('SUPER_ADMIN')
    const eightHours = 8 * 60 * 60
    expect(expiresAt).toBeGreaterThanOrEqual(now + eightHours - 5)
    expect(expiresAt).toBeLessThanOrEqual(now + eightHours + 5)
  })
})
