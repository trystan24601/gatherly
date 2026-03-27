/**
 * Authentication route handlers.
 *
 * Endpoints:
 *   POST /auth/register
 *   POST /auth/login
 *   POST /auth/org/login
 *   POST /auth/admin/login
 *   POST /auth/logout
 *   GET  /auth/me
 *   POST /auth/password-reset/request
 *   POST /auth/password-reset/confirm
 */

import { Router, type Request, type Response } from 'express'
import crypto from 'node:crypto'
import { v4 as uuidv4 } from 'uuid'
import { hashPassword, verifyPassword, isStrongPassword } from '../lib/auth'
import { createSession, getSession, deleteSession, isSessionExpired } from '../lib/session'
import { isRateLimited, recordFailedAttempt } from '../lib/rateLimiter'
import { getItem, putItem, transactWrite } from '../lib/dynamodb'
import { sendPasswordResetEmail } from '../lib/mailer'

const COOKIE_NAME = 'sid'
const RESET_TOKEN_TTL_SECONDS = 60 * 60 // 1 hour

const TABLE = (): string => {
  const name = process.env.DYNAMODB_TABLE_NAME
  if (!name) throw new Error('DYNAMODB_TABLE_NAME env var is required')
  return name
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  }
}

function stripSensitiveFields(user: Record<string, unknown>): Record<string, unknown> {
  const { passwordHash: _ph, PK: _pk, SK: _sk, GSI2PK: _g2pk, GSI2SK: _g2sk, ...safe } = user // eslint-disable-line @typescript-eslint/no-unused-vars
  return safe
}

// --------------------------------------------------------------------------
// Shared login factory
// --------------------------------------------------------------------------

async function loginHandler(
  req: Request,
  res: Response,
  requiredRole?: string
): Promise<void> {
  const ip = req.ip ?? 'unknown'

  // Rate limiting check
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' })
    return
  }

  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' })
    return
  }

  // Helper to respond with 401 and record a failed attempt
  function failLogin(): void {
    recordFailedAttempt(ip)
    res.status(401).json({ error: 'Invalid email or password.' })
  }

  // Look up USEREMAIL sentinel
  const sentinel = await getItem(TABLE(), { PK: `USEREMAIL#${email}`, SK: 'LOCK' })

  if (!sentinel) {
    failLogin()
    return
  }

  // Fetch USER profile
  const user = await getItem(TABLE(), {
    PK: `USER#${sentinel.userId as string}`,
    SK: 'PROFILE',
  })

  if (!user) {
    failLogin()
    return
  }

  // Role check (for org/admin login endpoints)
  if (requiredRole && (user.role as string) !== requiredRole) {
    failLogin()
    return
  }

  // Verify password
  const passwordHash = user.passwordHash as string | undefined
  if (!passwordHash) {
    failLogin()
    return
  }

  const match = await verifyPassword(password, passwordHash)
  if (!match) {
    failLogin()
    return
  }

  // Create session
  const session = await createSession(
    user.userId as string,
    user.role as string,
    user.orgId as string | undefined
  )

  res.cookie(COOKIE_NAME, session.sessionId, cookieOptions())
  res.status(200).json(stripSensitiveFields(user))
}

// --------------------------------------------------------------------------
// Router
// --------------------------------------------------------------------------

export const authRouter = Router()

// POST /auth/register
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName } = req.body as {
    email?: string
    password?: string
    firstName?: string
    lastName?: string
  }

  // Validation
  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({ error: 'email, password, firstName, and lastName are required.' })
    return
  }

  if (!isStrongPassword(password)) {
    res
      .status(400)
      .json({ error: 'Password must be at least 8 characters and include an uppercase letter and a number.' })
    return
  }

  const userId = uuidv4()
  const passwordHash = await hashPassword(password)
  const createdAt = new Date().toISOString()

  try {
    await transactWrite([
      {
        Put: {
          TableName: TABLE(),
          Item: {
            PK: `USER#${userId}`,
            SK: 'PROFILE',
            userId,
            email,
            firstName,
            lastName,
            role: 'VOLUNTEER',
            passwordHash,
            createdAt,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
      {
        Put: {
          TableName: TABLE(),
          Item: {
            PK: `USEREMAIL#${email}`,
            SK: 'LOCK',
            userId,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
    ])
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'TransactionCanceledException' ||
        err.constructor.name === 'TransactionCanceledException')
    ) {
      res.status(409).json({ error: 'An account with this email already exists.' })
      return
    }
    throw err
  }

  const session = await createSession(userId, 'VOLUNTEER')
  res.cookie(COOKIE_NAME, session.sessionId, cookieOptions())
  res.status(201).json({ userId, email, firstName, lastName, role: 'VOLUNTEER', createdAt })
})

// POST /auth/login (volunteer endpoint)
authRouter.post('/login', (req: Request, res: Response) => loginHandler(req, res))

// POST /auth/org/login
authRouter.post('/org/login', (req: Request, res: Response) =>
  loginHandler(req, res, 'ORG_ADMIN')
)

// POST /auth/admin/login
authRouter.post('/admin/login', (req: Request, res: Response) =>
  loginHandler(req, res, 'SUPER_ADMIN')
)

// POST /auth/logout
authRouter.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.cookies?.[COOKIE_NAME] as string | undefined

  if (sessionId) {
    await deleteSession(sessionId)
  }

  res.clearCookie(COOKIE_NAME, cookieOptions())
  res.status(204).send()
})

// GET /auth/me
authRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.cookies?.[COOKIE_NAME] as string | undefined

  if (!sessionId) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }

  const session = await getSession(sessionId)

  if (!session || isSessionExpired(session)) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }

  // Fetch full user profile for firstName/lastName/email
  const user = await getItem(TABLE(), {
    PK: `USER#${session.userId}`,
    SK: 'PROFILE',
  })

  if (!user) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }

  const safeUser = stripSensitiveFields(user)

  // Enrich ORG_ADMIN responses with live org status fields
  if ((user.role as string) === 'ORG_ADMIN' && user.orgId) {
    const org = await getItem(TABLE(), { PK: `ORG#${user.orgId as string}`, SK: 'PROFILE' })
    if (org) {
      safeUser.orgStatus = org.status as string
      if (org.submittedAt) safeUser.orgSubmittedAt = org.submittedAt as string
      if (org.rejectionReason) safeUser.orgRejectionReason = org.rejectionReason as string
    }
  }

  res.status(200).json(safeUser)
})

// POST /auth/password-reset/request
authRouter.post('/password-reset/request', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email?: string }

  // Always return 200 — no enumeration
  if (!email) {
    res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' })
    return
  }

  const sentinel = await getItem(TABLE(), { PK: `USEREMAIL#${email}`, SK: 'LOCK' })

  if (sentinel) {
    const user = await getItem(TABLE(), {
      PK: `USER#${sentinel.userId as string}`,
      SK: 'PROFILE',
    })

    if (user) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = Math.floor(Date.now() / 1000) + RESET_TOKEN_TTL_SECONDS

      await putItem(TABLE(), {
        PK: `RESET#${token}`,
        SK: 'PROFILE',
        token,
        userId: user.userId,
        expiresAt,
        used: false,
      })

      await sendPasswordResetEmail({ toEmail: email, resetToken: token })
    }
  }

  res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' })
})

// POST /auth/password-reset/confirm
authRouter.post('/password-reset/confirm', async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body as { token?: string; password?: string }

  if (!token || !password) {
    res.status(400).json({ error: 'Invalid or expired reset token.' })
    return
  }

  const resetItem = await getItem(TABLE(), { PK: `RESET#${token}`, SK: 'PROFILE' })

  if (!resetItem) {
    res.status(400).json({ error: 'Invalid or expired reset token.' })
    return
  }

  const expiresAt = resetItem.expiresAt as number
  const now = Math.floor(Date.now() / 1000)

  if (expiresAt <= now || resetItem.used === true) {
    res.status(400).json({ error: 'Invalid or expired reset token.' })
    return
  }

  if (!isStrongPassword(password)) {
    res.status(400).json({ error: 'Password must be at least 8 characters and include an uppercase letter and a number.' })
    return
  }

  const newHash = await hashPassword(password)
  const userId = resetItem.userId as string

  // Atomically update the password AND mark the token as used.
  // The condition on the RESET item prevents a concurrent request from using
  // the same token after we've already checked used === false above (TOCTOU fix).
  try {
    await transactWrite([
      {
        Update: {
          TableName: TABLE(),
          Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
          UpdateExpression: 'SET passwordHash = :hash',
          ExpressionAttributeValues: { ':hash': newHash },
        },
      },
      {
        Update: {
          TableName: TABLE(),
          Key: { PK: `RESET#${token}`, SK: 'PROFILE' },
          UpdateExpression: 'SET #used = :used',
          ConditionExpression: '#used = :false',
          ExpressionAttributeValues: { ':used': true, ':false': false },
          ExpressionAttributeNames: { '#used': 'used' },
        },
      },
    ])
  } catch (err: unknown) {
    const awsErr = err as { name?: string }
    if (awsErr?.name === 'TransactionCanceledException') {
      res.status(400).json({ error: 'Invalid or expired reset token.' })
      return
    }
    throw err
  }

  res.status(200).json({ message: 'Password updated successfully.' })
})
