/**
 * BE-TEST-02: Unit tests for backend/src/lib/session.ts
 *
 * All tests are expected to fail (Red phase) — no implementation exists yet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dynamodb module so session.ts does not touch a real DB
vi.mock('../dynamodb', () => ({
  putItem: vi.fn().mockResolvedValue(undefined),
  getItem: vi.fn().mockResolvedValue(undefined),
  deleteItem: vi.fn().mockResolvedValue(undefined),
}))

import { createSession, getSession, deleteSession, isSessionExpired } from '../session'
import { putItem, getItem, deleteItem } from '../dynamodb'

const TABLE_NAME = 'test-table'

beforeEach(() => {
  process.env.DYNAMODB_TABLE_NAME = TABLE_NAME
  vi.clearAllMocks()
})

describe('session lib — createSession', () => {
  it('calls putItem with PK=SESSION#<id> and SK=PROFILE', async () => {
    const session = await createSession('user-123', 'VOLUNTEER')

    expect(putItem).toHaveBeenCalledOnce()
    const [, item] = (putItem as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>]
    expect((item.PK as string)).toMatch(/^SESSION#/)
    expect(item.SK).toBe('PROFILE')
  })

  it('includes sessionId, userId, role, createdAt, expiresAt in the item', async () => {
    const session = await createSession('user-123', 'VOLUNTEER')

    const [, item] = (putItem as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>]
    expect(typeof item.sessionId).toBe('string')
    expect(item.userId).toBe('user-123')
    expect(item.role).toBe('VOLUNTEER')
    expect(typeof item.createdAt).toBe('string')
    expect(typeof item.expiresAt).toBe('number')
  })

  it('sets GSI6PK=USER#<userId> and GSI6SK=SESSION#<sessionId>', async () => {
    await createSession('user-456', 'ORG_ADMIN', 'org-789')

    const [, item] = (putItem as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>]
    expect(item.GSI6PK).toBe('USER#user-456')
    expect((item.GSI6SK as string)).toMatch(/^SESSION#/)
  })

  it('includes orgId when provided', async () => {
    await createSession('user-abc', 'ORG_ADMIN', 'org-xyz')

    const [, item] = (putItem as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>]
    expect(item.orgId).toBe('org-xyz')
  })

  it('returns the created session object with correct fields', async () => {
    const session = await createSession('user-123', 'VOLUNTEER')

    expect(session.userId).toBe('user-123')
    expect(session.role).toBe('VOLUNTEER')
    expect(typeof session.sessionId).toBe('string')
    expect(typeof session.expiresAt).toBe('number')
  })
})

describe('session lib — getSession', () => {
  it('calls getItem with PK=SESSION#<id> and SK=PROFILE', async () => {
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)
    await getSession('sess-abc')

    expect(getItem).toHaveBeenCalledWith(
      TABLE_NAME,
      { PK: 'SESSION#sess-abc', SK: 'PROFILE' }
    )
  })

  it('returns undefined when item not found', async () => {
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)
    const result = await getSession('nonexistent')
    expect(result).toBeUndefined()
  })

  it('returns a session object when item is found', async () => {
    const now = Math.floor(Date.now() / 1000)
    ;(getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      PK: 'SESSION#sess-abc',
      SK: 'PROFILE',
      sessionId: 'sess-abc',
      userId: 'user-123',
      role: 'VOLUNTEER',
      createdAt: new Date().toISOString(),
      expiresAt: now + 3600,
    })

    const session = await getSession('sess-abc')
    expect(session).toBeDefined()
    expect(session?.userId).toBe('user-123')
    expect(session?.role).toBe('VOLUNTEER')
  })
})

describe('session lib — deleteSession', () => {
  it('calls deleteItem with PK=SESSION#<id> and SK=PROFILE', async () => {
    await deleteSession('sess-del')

    expect(deleteItem).toHaveBeenCalledWith(
      TABLE_NAME,
      { PK: 'SESSION#sess-del', SK: 'PROFILE' }
    )
  })
})

describe('session lib — isSessionExpired', () => {
  it('returns false for a session that expires in the future', () => {
    const future = Math.floor(Date.now() / 1000) + 3600
    const result = isSessionExpired({ expiresAt: future })
    expect(result).toBe(false)
  })

  it('returns true for a session whose expiresAt is in the past', () => {
    const past = Math.floor(Date.now() / 1000) - 1
    const result = isSessionExpired({ expiresAt: past })
    expect(result).toBe(true)
  })
})
