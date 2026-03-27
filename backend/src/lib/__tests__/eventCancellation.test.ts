/**
 * BE-TEST-04: Unit tests for the event cancellation bulk-cancel helper.
 *
 * Written in the Red phase — all tests must fail before implementation exists.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --------------------------------------------------------------------------
// Module mocks
// --------------------------------------------------------------------------

vi.mock('../dynamodb', () => ({
  transactWrite: vi.fn().mockResolvedValue(undefined),
}))

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { transactWrite } from '../dynamodb'
import { cancelEventRegistrations } from '../eventCancellation'

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function makePendingReg(regId: string, volunteerId = 'vol-1'): Record<string, unknown> {
  return {
    PK: `REG#${regId}`,
    SK: 'META',
    regId,
    eventId: 'event-test',
    roleId: 'role-1',
    volunteerId,
    status: 'PENDING',
    createdAt: '2026-01-01T00:00:00.000Z',
    GSI4PK: 'EVENT#event-test',
    GSI4SK: `REG#${regId}`,
  }
}

function makeRegs(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => makePendingReg(`reg-${i + 1}`, `vol-${i + 1}`))
}

const TABLE = 'test-table'

beforeEach(() => {
  vi.clearAllMocks()
})

// --------------------------------------------------------------------------
// BE-TEST-04: cancelEventRegistrations
// --------------------------------------------------------------------------

describe('cancelEventRegistrations', () => {
  it('does not call transactWrite when registrations array is empty', async () => {
    await cancelEventRegistrations([], TABLE)

    expect(transactWrite).not.toHaveBeenCalled()
  })

  it('calls transactWrite once for 1-25 registrations', async () => {
    const regs = makeRegs(25)
    await cancelEventRegistrations(regs, TABLE)

    expect(transactWrite).toHaveBeenCalledTimes(1)
    const [items] = vi.mocked(transactWrite).mock.calls[0]
    expect(items).toHaveLength(25)
  })

  it('calls transactWrite twice for 26 registrations (25 + 1)', async () => {
    const regs = makeRegs(26)
    await cancelEventRegistrations(regs, TABLE)

    expect(transactWrite).toHaveBeenCalledTimes(2)
    const [firstBatch] = vi.mocked(transactWrite).mock.calls[0]
    const [secondBatch] = vi.mocked(transactWrite).mock.calls[1]
    expect(firstBatch).toHaveLength(25)
    expect(secondBatch).toHaveLength(1)
  })

  it('calls transactWrite twice for 50 registrations (25 + 25)', async () => {
    const regs = makeRegs(50)
    await cancelEventRegistrations(regs, TABLE)

    expect(transactWrite).toHaveBeenCalledTimes(2)
    const [firstBatch] = vi.mocked(transactWrite).mock.calls[0]
    const [secondBatch] = vi.mocked(transactWrite).mock.calls[1]
    expect(firstBatch).toHaveLength(25)
    expect(secondBatch).toHaveLength(25)
  })

  it('calls transactWrite three times for 51 registrations (25 + 25 + 1)', async () => {
    const regs = makeRegs(51)
    await cancelEventRegistrations(regs, TABLE)

    expect(transactWrite).toHaveBeenCalledTimes(3)
    const calls = vi.mocked(transactWrite).mock.calls
    expect(calls[0][0]).toHaveLength(25)
    expect(calls[1][0]).toHaveLength(25)
    expect(calls[2][0]).toHaveLength(1)
  })

  it('each TransactWrite item uses #status ExpressionAttributeNames alias for reserved word', async () => {
    const regs = makeRegs(1)
    await cancelEventRegistrations(regs, TABLE)

    const [items] = vi.mocked(transactWrite).mock.calls[0]
    const updateItem = items[0].Update
    expect(updateItem).toBeDefined()
    expect(updateItem!.ExpressionAttributeNames).toEqual(expect.objectContaining({ '#status': 'status' }))
    expect(updateItem!.ExpressionAttributeValues).toEqual(
      expect.objectContaining({ ':cancelled': 'CANCELLED' })
    )
  })

  it('each TransactWrite item targets the correct REG# key', async () => {
    const regs = makeRegs(3)
    await cancelEventRegistrations(regs, TABLE)

    const [items] = vi.mocked(transactWrite).mock.calls[0]
    expect(items[0].Update!.Key).toEqual({ PK: 'REG#reg-1', SK: 'META' })
    expect(items[1].Update!.Key).toEqual({ PK: 'REG#reg-2', SK: 'META' })
    expect(items[2].Update!.Key).toEqual({ PK: 'REG#reg-3', SK: 'META' })
  })
})
