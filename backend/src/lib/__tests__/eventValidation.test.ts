/**
 * BE-TEST-01: Unit tests for eventValidation helpers
 *
 * Written in the Red phase — these tests must fail before the implementation
 * exists. They specify the exact behaviour of the three validation helpers.
 */
import { describe, it, expect } from 'vitest'
import {
  validatePostcode,
  isDateInFuture,
  isEndTimeAfterStartTime,
} from '../eventValidation'

describe('validatePostcode', () => {
  it('accepts SW1A 1AA', () => {
    expect(validatePostcode('SW1A 1AA')).toBe(true)
  })

  it('accepts EC1A 1BB', () => {
    expect(validatePostcode('EC1A 1BB')).toBe(true)
  })

  it('accepts W1A 0AX', () => {
    expect(validatePostcode('W1A 0AX')).toBe(true)
  })

  it('rejects lowercase sw1a1aa (no space)', () => {
    expect(validatePostcode('sw1a1aa')).toBe(false)
  })

  it('rejects INVALID', () => {
    expect(validatePostcode('INVALID')).toBe(false)
  })

  it('rejects numeric-only 12345', () => {
    expect(validatePostcode('12345')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validatePostcode('')).toBe(false)
  })
})

describe('isDateInFuture', () => {
  it('returns true for a date one year in the future', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    expect(isDateInFuture(future.toISOString().slice(0, 10))).toBe(true)
  })

  it('returns true for today', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(isDateInFuture(today)).toBe(true)
  })

  it('returns false for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isDateInFuture(yesterday.toISOString().slice(0, 10))).toBe(false)
  })
})

describe('isEndTimeAfterStartTime', () => {
  it('returns true when end is after start (09:00 / 17:00)', () => {
    expect(isEndTimeAfterStartTime('09:00', '17:00')).toBe(true)
  })

  it('returns false when end is before start (17:00 / 09:00)', () => {
    expect(isEndTimeAfterStartTime('17:00', '09:00')).toBe(false)
  })

  it('returns false when end equals start (09:00 / 09:00)', () => {
    expect(isEndTimeAfterStartTime('09:00', '09:00')).toBe(false)
  })
})
