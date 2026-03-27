/**
 * Validation helpers for event creation and editing.
 *
 * These are pure functions with no side-effects, making them easy to unit-test.
 */

/**
 * Validates a UK postcode.
 * Accepts the standard format: letters, digits, a space, digit, two letters.
 * Examples: SW1A 1AA, EC1A 1BB, W1A 0AX, SE24 9BJ
 */
export function validatePostcode(value: string): boolean {
  // Standard UK postcode regex — requires a space between outward and inward codes
  const UK_POSTCODE = /^[A-Z]{1,2}[0-9][0-9A-Z]? [0-9][ABD-HJLNP-UW-Z]{2}$/
  return UK_POSTCODE.test(value)
}

/**
 * Returns true if the ISO date string (YYYY-MM-DD) is today or in the future.
 */
export function isDateInFuture(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return dateStr >= today
}

/**
 * Returns true if endTime (HH:MM) is strictly after startTime (HH:MM).
 */
export function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
  return endTime > startTime
}

/**
 * Validates a shift time range (HH:MM format).
 * Returns an error message string if invalid, or null if valid.
 */
export function validateTimeRange(shiftStart: unknown, shiftEnd: unknown): string | null {
  const HH_MM = /^\d{2}:\d{2}$/

  if (!shiftStart || !HH_MM.test(shiftStart as string)) {
    return 'shiftStart is required and must be in HH:MM format.'
  }
  if (!shiftEnd || !HH_MM.test(shiftEnd as string)) {
    return 'shiftEnd is required and must be in HH:MM format.'
  }
  if (!isEndTimeAfterStartTime(shiftStart as string, shiftEnd as string)) {
    return 'shiftEnd must be after shiftStart.'
  }
  return null
}
