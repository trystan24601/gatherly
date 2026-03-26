import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// BE-TEST-07: logger module tests

describe('Logger module', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleSpy: any

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.resetModules()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    vi.restoreAllMocks()
  })

  function getLogOutput(): Record<string, unknown> {
    const raw = consoleSpy.mock.calls[0][0] as string
    return JSON.parse(raw) as Record<string, unknown>
  }

  it('logger emits JSON to stdout (console.log)', async () => {
    const { log } = await import('../logger')
    log({ requestId: 'req-1', action: 'test' })

    expect(consoleSpy).toHaveBeenCalledOnce()
    const raw = consoleSpy.mock.calls[0][0] as string
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  it('emitted log contains requestId field when provided', async () => {
    const { log } = await import('../logger')
    log({ requestId: 'req-abc-123', action: 'health.check' })

    const output = getLogOutput()
    expect(output.requestId).toBe('req-abc-123')
  })

  it('emitted log contains userId field when provided', async () => {
    const { log } = await import('../logger')
    log({ requestId: 'req-1', userId: 'user-999', action: 'user.get' })

    const output = getLogOutput()
    expect(output.userId).toBe('user-999')
  })

  it('emitted log contains orgId field when provided', async () => {
    const { log } = await import('../logger')
    log({ requestId: 'req-1', orgId: 'org-555', action: 'org.get' })

    const output = getLogOutput()
    expect(output.orgId).toBe('org-555')
  })

  it('emitted log contains action field when provided', async () => {
    const { log } = await import('../logger')
    log({ requestId: 'req-1', action: 'event.create' })

    const output = getLogOutput()
    expect(output.action).toBe('event.create')
  })

  it('emitted log contains durationMs field when provided', async () => {
    const { log } = await import('../logger')
    log({ requestId: 'req-1', action: 'db.query', durationMs: 42 })

    const output = getLogOutput()
    expect(output.durationMs).toBe(42)
  })

  it('emitted log contains statusCode field when provided', async () => {
    const { log } = await import('../logger')
    log({ requestId: 'req-1', action: 'health.check', statusCode: 200 })

    const output = getLogOutput()
    expect(output.statusCode).toBe(200)
  })

  it('missing optional fields are omitted (not present as null)', async () => {
    const { log } = await import('../logger')
    log({ requestId: 'req-1', action: 'minimal.log' })

    const output = getLogOutput()
    expect(Object.prototype.hasOwnProperty.call(output, 'userId')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(output, 'orgId')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(output, 'durationMs')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(output, 'statusCode')).toBe(false)
  })
})
