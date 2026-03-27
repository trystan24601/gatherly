/**
 * Organisation registration handler.
 *
 * Endpoints:
 *   POST /organisations/register
 */

import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { hashPassword, isStrongPassword } from '../lib/auth'
import { getItem, transactWrite } from '../lib/dynamodb'
import { enqueueOrgSubmitted } from '../lib/orgMailer'

const TABLE = (): string => {
  const name = process.env.DYNAMODB_TABLE_NAME
  if (!name) throw new Error('DYNAMODB_TABLE_NAME env var is required')
  return name
}

// Valid org types per FR-01
const VALID_ORG_TYPES = ['SPORTS_CLUB', 'CHARITY', 'COMMUNITY', 'OTHER'] as const
type OrgType = (typeof VALID_ORG_TYPES)[number]

/**
 * UK phone validation (OQ-03):
 * Accept +44 prefix or leading 0, followed by exactly 10 digits.
 * Examples: 07700900123, +447700900123, 01234567890
 */
const UK_PHONE_REGEX = /^(\+44|0)[0-9]{10}$/

/**
 * Validate a URL — must be a valid http/https URL.
 */
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validate an email address with a simple format check.
 */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export const organisationsRouter = Router()

// POST /organisations/register
organisationsRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const {
    name,
    orgType,
    description,
    contactEmail,
    contactPhone,
    website,
    adminFirstName,
    adminLastName,
    adminEmail,
    adminPassword,
  } = req.body as {
    name?: string
    orgType?: string
    description?: string
    contactEmail?: string
    contactPhone?: string
    website?: string
    adminFirstName?: string
    adminLastName?: string
    adminEmail?: string
    adminPassword?: string
  }

  // ------------------------------------------------------------------
  // Required field validation
  // ------------------------------------------------------------------
  if (!name) {
    res.status(400).json({ error: 'name is required.' })
    return
  }
  if (!orgType) {
    res.status(400).json({ error: 'orgType is required.' })
    return
  }
  if (!description) {
    res.status(400).json({ error: 'description is required.' })
    return
  }
  if (!contactEmail) {
    res.status(400).json({ error: 'contactEmail is required.' })
    return
  }
  if (!contactPhone) {
    res.status(400).json({ error: 'contactPhone is required.' })
    return
  }
  if (!adminFirstName) {
    res.status(400).json({ error: 'adminFirstName is required.' })
    return
  }
  if (!adminLastName) {
    res.status(400).json({ error: 'adminLastName is required.' })
    return
  }
  if (!adminEmail) {
    res.status(400).json({ error: 'adminEmail is required.' })
    return
  }
  if (!adminPassword) {
    res.status(400).json({ error: 'adminPassword is required.' })
    return
  }

  // ------------------------------------------------------------------
  // Field-level validation
  // ------------------------------------------------------------------
  if (name.length < 3 || name.length > 100) {
    res.status(400).json({ error: 'name must be between 3 and 100 characters.' })
    return
  }

  if (description.length < 20 || description.length > 1000) {
    res.status(400).json({ error: 'description must be between 20 and 1000 characters.' })
    return
  }

  if (!VALID_ORG_TYPES.includes(orgType as OrgType)) {
    res.status(400).json({
      error: `orgType must be one of: ${VALID_ORG_TYPES.join(', ')}.`,
    })
    return
  }

  if (!isValidEmail(contactEmail)) {
    res.status(400).json({ error: 'contactEmail must be a valid email address.' })
    return
  }

  if (!UK_PHONE_REGEX.test(contactPhone)) {
    res.status(400).json({
      error: 'contactPhone must be a valid UK phone number (e.g. 07700900123 or +447700900123).',
    })
    return
  }

  if (!isStrongPassword(adminPassword)) {
    res.status(400).json({
      error: 'adminPassword must be at least 8 characters and include an uppercase letter and a number.',
    })
    return
  }

  if (website !== undefined && website !== null && website !== '') {
    if (!isValidUrl(website)) {
      res.status(400).json({ error: 'website must be a valid URL (http or https).' })
      return
    }
  }

  // ------------------------------------------------------------------
  // Pre-check: admin email uniqueness (OQ-02)
  // Perform a GetItem on the USEREMAIL sentinel before the TransactWrite.
  // If it exists, return a field-specific 409 immediately.
  // The TransactionCanceledException (if any) therefore maps to ORGEMAIL conflict.
  // ------------------------------------------------------------------
  const existingSentinel = await getItem(TABLE(), {
    PK: `USEREMAIL#${adminEmail}`,
    SK: 'LOCK',
  })

  if (existingSentinel) {
    res.status(409).json({ error: 'An account with this email already exists.' })
    return
  }

  // ------------------------------------------------------------------
  // Build IDs and timestamps
  // ------------------------------------------------------------------
  const userId = uuidv4()
  const orgId = uuidv4()
  const passwordHash = await hashPassword(adminPassword)
  const submittedAt = new Date().toISOString()

  // ------------------------------------------------------------------
  // Atomic write: USER + ORG + ORGEMAIL sentinel
  // ------------------------------------------------------------------
  try {
    await transactWrite([
      {
        // USER item — ORG_ADMIN with orgId written in (OQ-04)
        Put: {
          TableName: TABLE(),
          Item: {
            PK: `USER#${userId}`,
            SK: 'PROFILE',
            userId,
            email: adminEmail,
            firstName: adminFirstName,
            lastName: adminLastName,
            role: 'ORG_ADMIN',
            orgId,
            passwordHash,
            createdAt: submittedAt,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
      {
        // USEREMAIL sentinel — uniqueness guard for admin email
        Put: {
          TableName: TABLE(),
          Item: {
            PK: `USEREMAIL#${adminEmail}`,
            SK: 'LOCK',
            userId,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
      {
        // ORG item — PENDING status, GSI1 keyed for approval queue
        Put: {
          TableName: TABLE(),
          Item: {
            PK: `ORG#${orgId}`,
            SK: 'PROFILE',
            orgId,
            name,
            orgType,
            description,
            contactEmail,
            contactPhone,
            ...(website ? { website } : {}),
            status: 'PENDING',
            adminUserId: userId,
            submittedAt,
            // GSI1 key design: ORG_STATUS#<status> / <submittedAt>#<orgId>
            // ISO8601 submittedAt sorts lexicographically = oldest-first
            GSI1PK: 'ORG_STATUS#PENDING',
            GSI1SK: `${submittedAt}#${orgId}`,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
      {
        // ORGEMAIL sentinel — uniqueness guard for org contact email
        Put: {
          TableName: TABLE(),
          Item: {
            PK: `ORGEMAIL#${contactEmail}`,
            SK: 'LOCK',
            orgId,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
    ])
  } catch (err) {
    // Because we pre-check adminEmail above, a TransactionCanceledException
    // here is caused by the ORGEMAIL or USER PK condition failing.
    // The ORGEMAIL conflict is the safe default mapping (OQ-02 invariant).
    if (
      err instanceof Error &&
      (err.name === 'TransactionCanceledException' ||
        err.constructor.name === 'TransactionCanceledException')
    ) {
      res.status(409).json({ error: 'An organisation with this email is already registered.' })
      return
    }
    throw err
  }

  // Enqueue ORG_SUBMITTED (no email in MVP — see OQ-05)
  await enqueueOrgSubmitted({ orgId, orgName: name })

  // User is NOT auto-logged-in (FR-03) — no sid cookie set
  res.status(201).json({
    orgId,
    message: 'Organisation submitted for review.',
  })
})
