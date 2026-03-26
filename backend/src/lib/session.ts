import { getItem, putItem, deleteItem } from './dynamodb'
import { generateSessionId, computeExpiresAt } from './auth'

const TABLE = (): string => {
  const name = process.env.DYNAMODB_TABLE_NAME
  if (!name) throw new Error('DYNAMODB_TABLE_NAME env var is required')
  return name
}

export interface Session {
  sessionId: string
  userId: string
  role: string
  orgId?: string
  createdAt: string
  expiresAt: number
}

/**
 * Persist a new SESSION item in DynamoDB and return the created session.
 */
export async function createSession(
  userId: string,
  role: string,
  orgId?: string
): Promise<Session> {
  const sessionId = generateSessionId()
  const expiresAt = computeExpiresAt(role)
  const createdAt = new Date().toISOString()

  const item: Record<string, unknown> = {
    PK: `SESSION#${sessionId}`,
    SK: 'PROFILE',
    sessionId,
    userId,
    role,
    createdAt,
    expiresAt,
    GSI6PK: `USER#${userId}`,
    GSI6SK: `SESSION#${sessionId}`,
  }

  if (orgId !== undefined) {
    item.orgId = orgId
  }

  await putItem(TABLE(), item)

  return { sessionId, userId, role, orgId, createdAt, expiresAt }
}

/**
 * Look up a SESSION item by session ID.
 * Returns undefined if not found.
 */
export async function getSession(sessionId: string): Promise<Session | undefined> {
  const item = await getItem(TABLE(), {
    PK: `SESSION#${sessionId}`,
    SK: 'PROFILE',
  })

  if (!item) return undefined

  return {
    sessionId: item.sessionId as string,
    userId: item.userId as string,
    role: item.role as string,
    orgId: item.orgId as string | undefined,
    createdAt: item.createdAt as string,
    expiresAt: item.expiresAt as number,
  }
}

/**
 * Delete a SESSION item by session ID.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await deleteItem(TABLE(), {
    PK: `SESSION#${sessionId}`,
    SK: 'PROFILE',
  })
}

/**
 * Return true when the session's expiresAt epoch is in the past.
 */
export function isSessionExpired(session: Pick<Session, 'expiresAt'>): boolean {
  return session.expiresAt <= Math.floor(Date.now() / 1000)
}
