import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const BCRYPT_COST = 12

const TTL_SECONDS: Record<string, number> = {
  VOLUNTEER: 7 * 24 * 60 * 60,
  ORG_ADMIN: 7 * 24 * 60 * 60,
  SUPER_ADMIN: 8 * 60 * 60,
}

/**
 * Hash a plain-text password using bcrypt at cost factor 12.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST)
}

/**
 * Compare a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/**
 * Generate a UUID v4 string for use as a session identifier.
 */
export function generateSessionId(): string {
  return uuidv4()
}

/**
 * Compute the session expiry as Unix epoch seconds.
 * VOLUNTEER / ORG_ADMIN: 7 days; SUPER_ADMIN: 8 hours.
 */
export function computeExpiresAt(role: string): number {
  const ttl = TTL_SECONDS[role] ?? TTL_SECONDS.VOLUNTEER
  return Math.floor(Date.now() / 1000) + ttl
}

/**
 * Validate that a password meets minimum strength requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one digit
 */
export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  )
}
