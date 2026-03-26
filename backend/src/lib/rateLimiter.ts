/**
 * In-memory IP-keyed rate limiter for failed login attempts.
 *
 * Tracks failed attempts only. Allows up to MAX_ATTEMPTS per IP within a
 * WINDOW_MS sliding window. Returns true when the caller is blocked.
 *
 * This is acceptable for the single-Lambda MVP. For a multi-instance
 * deployment, replace with a Redis-backed counter.
 */

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

interface Counter {
  count: number
  windowStart: number
}

const store = new Map<string, Counter>()

/**
 * Check whether the IP is currently rate-limited (i.e. has exceeded
 * MAX_ATTEMPTS failed attempts within the current WINDOW_MS).
 * Does NOT record a new attempt — call `recordFailedAttempt` for that.
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    return false
  }

  return entry.count >= MAX_ATTEMPTS
}

/**
 * Record one failed login attempt from `ip`.
 * Returns true immediately if the IP is now rate-limited after this attempt.
 */
export function recordFailedAttempt(ip: string): boolean {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now })
    return false
  }

  entry.count += 1
  return entry.count >= MAX_ATTEMPTS
}

/**
 * Reset the entire in-memory store — used in tests.
 */
export function resetLimiter(): void {
  store.clear()
}
