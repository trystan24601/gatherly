/**
 * BE-TEST-03: Unit tests for backend/src/lib/rateLimiter.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { isRateLimited, recordFailedAttempt, resetLimiter } from '../rateLimiter'

beforeEach(() => {
  vi.useFakeTimers()
  resetLimiter()
})

afterEach(() => {
  vi.useRealTimers()
  resetLimiter()
})

describe('rateLimiter — isRateLimited (check only, does not record)', () => {
  it('returns false when no attempts have been recorded for an IP', () => {
    expect(isRateLimited('1.2.3.4')).toBe(false)
  })

  it('returns false after fewer than MAX_ATTEMPTS failed attempts', () => {
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt('10.0.0.1')
    }
    expect(isRateLimited('10.0.0.1')).toBe(false)
  })

  it('returns true after MAX_ATTEMPTS (5) failed attempts', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt('10.0.0.2')
    }
    expect(isRateLimited('10.0.0.2')).toBe(true)
  })

  it('continues returning true on further checks within the window', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt('10.0.0.3')
    }
    expect(isRateLimited('10.0.0.3')).toBe(true)
    expect(isRateLimited('10.0.0.3')).toBe(true)
  })

  it('does not block a different IP even after another IP is rate-limited', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt('10.0.0.4')
    }
    expect(isRateLimited('10.0.0.5')).toBe(false)
  })

  it('resets the counter after 15 minutes have elapsed', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt('10.0.0.6')
    }
    expect(isRateLimited('10.0.0.6')).toBe(true)

    // Advance time by 15 minutes + 1 second
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000)

    expect(isRateLimited('10.0.0.6')).toBe(false)
  })
})

describe('rateLimiter — recordFailedAttempt', () => {
  it('returns false for the first failed attempt', () => {
    expect(recordFailedAttempt('1.2.3.4')).toBe(false)
  })

  it('returns false for attempts 1–4', () => {
    for (let i = 0; i < 4; i++) {
      expect(recordFailedAttempt('10.0.0.7')).toBe(false)
    }
  })

  it('returns true on the 5th attempt (now rate-limited)', () => {
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt('10.0.0.8')
    }
    expect(recordFailedAttempt('10.0.0.8')).toBe(true)
  })

  it('resets after the 15-minute window and allows recording again', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt('10.0.0.9')
    }
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000)
    // First attempt after window resets should be allowed
    expect(recordFailedAttempt('10.0.0.9')).toBe(false)
  })
})
