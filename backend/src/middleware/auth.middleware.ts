import type { Request, Response, NextFunction } from 'express'
import { getSession, isSessionExpired } from '../lib/session'
import { getItem } from '../lib/dynamodb'

const TABLE = (): string => {
  const name = process.env.DYNAMODB_TABLE_NAME
  if (!name) throw new Error('DYNAMODB_TABLE_NAME env var is required')
  return name
}

/**
 * Validate the `sid` cookie, look up the session in DynamoDB, and attach
 * it to `req.session`. Returns 401 if the cookie is missing, the session
 * does not exist, or the session has expired.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.sid as string | undefined

  if (!sessionId) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }

  const session = await getSession(sessionId)

  if (!session || isSessionExpired(session)) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }

  req.session = session
  next()
}

/**
 * Restrict a route to users with a specific role.
 * SUPER_ADMIN is granted access to all role-restricted endpoints.
 * Must be used after `requireAuth`.
 */
export function requireRole(role: string) {
  return async function (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const userRole = req.session?.role

    if (!userRole) {
      res.status(401).json({ error: 'Authentication required.' })
      return
    }

    if (userRole !== role && userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions.' })
      return
    }

    next()
  }
}

/**
 * Ensure the session's org is in APPROVED status.
 * Performs a single DynamoDB GetItem to check the ORG item.
 * Returns 403 when the org is not found, not approved, or orgId is missing.
 * Must be used after `requireAuth`.
 */
export async function requireApprovedOrg(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const orgId = req.session?.orgId

  if (!orgId) {
    res.status(403).json({ error: 'Organisation is not approved.' })
    return
  }

  const org = await getItem(TABLE(), { PK: `ORG#${orgId}`, SK: 'PROFILE' })

  if (!org || (org.status as string) !== 'APPROVED') {
    res.status(403).json({ error: 'Organisation is not approved.' })
    return
  }

  next()
}
