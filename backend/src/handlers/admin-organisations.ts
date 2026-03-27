/**
 * Super Admin organisation management endpoints.
 *
 * Endpoints:
 *   GET  /admin/organisations
 *   GET  /admin/organisations/:orgId
 *   POST /admin/organisations/:orgId/approve
 *   POST /admin/organisations/:orgId/reject
 *
 * All routes require requireAuth + requireRole('SUPER_ADMIN') applied externally
 * in app.ts.
 */

import { Router, type Request, type Response } from 'express'
import { getItem, updateItem, queryItemsPaginated } from '../lib/dynamodb'
import { enqueueOrgApproved, enqueueOrgRejected } from '../lib/orgMailer'

const TABLE = (): string => {
  const name = process.env.DYNAMODB_TABLE_NAME
  if (!name) throw new Error('DYNAMODB_TABLE_NAME env var is required')
  return name
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export const adminOrgsRouter = Router()

// --------------------------------------------------------------------------
// GET /admin/organisations
// --------------------------------------------------------------------------
adminOrgsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const status = (req.query.status as string | undefined) ?? 'PENDING'
  const rawLimit = parseInt((req.query.limit as string | undefined) ?? String(DEFAULT_LIMIT), 10)
  const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? DEFAULT_LIMIT : rawLimit, MAX_LIMIT)
  const cursorParam = req.query.cursor as string | undefined

  let exclusiveStartKey: Record<string, unknown> | undefined
  if (cursorParam) {
    try {
      exclusiveStartKey = JSON.parse(
        Buffer.from(cursorParam, 'base64').toString('utf-8')
      ) as Record<string, unknown>
    } catch {
      res.status(400).json({ error: 'Invalid cursor.' })
      return
    }
  }

  const { items, lastEvaluatedKey } = await queryItemsPaginated(
    TABLE(),
    'GSI1PK = :gsi1pk',
    { ':gsi1pk': `ORG_STATUS#${status}` },
    {
      indexName: 'GSI1',
      limit,
      scanIndexForward: false, // newest-first
      exclusiveStartKey,
    }
  )

  // Strip internal DynamoDB keys from response
  const safeItems = items.map(stripInternalKeys)

  const cursor = lastEvaluatedKey
    ? Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64')
    : null

  res.status(200).json({ items: safeItems, cursor })
})

// --------------------------------------------------------------------------
// GET /admin/organisations/:orgId
// --------------------------------------------------------------------------
adminOrgsRouter.get('/:orgId', async (req: Request, res: Response): Promise<void> => {
  const { orgId } = req.params

  const org = await getItem(TABLE(), { PK: `ORG#${orgId}`, SK: 'PROFILE' })

  if (!org) {
    res.status(404).json({ error: 'Organisation not found.' })
    return
  }

  res.status(200).json(stripInternalKeys(org))
})

// --------------------------------------------------------------------------
// POST /admin/organisations/:orgId/approve
// --------------------------------------------------------------------------
adminOrgsRouter.post('/:orgId/approve', async (req: Request, res: Response): Promise<void> => {
  const { orgId } = req.params
  const approvedBy = req.session?.userId

  const org = await getItem(TABLE(), { PK: `ORG#${orgId}`, SK: 'PROFILE' })

  if (!org) {
    res.status(404).json({ error: 'Organisation not found.' })
    return
  }

  if ((org.status as string) !== 'PENDING') {
    res.status(409).json({ error: 'Organisation is not in PENDING status.' })
    return
  }

  const approvedAt = new Date().toISOString()

  await updateItem(
    TABLE(),
    { PK: `ORG#${orgId}`, SK: 'PROFILE' },
    'SET #status = :status, approvedAt = :approvedAt, approvedBy = :approvedBy, GSI1PK = :gsi1pk',
    {
      ':status': 'APPROVED',
      ':approvedAt': approvedAt,
      ':approvedBy': approvedBy,
      ':gsi1pk': 'ORG_STATUS#APPROVED',
    },
    { '#status': 'status' }
  )

  // Fetch updated org for response and to get admin email for notification
  const updatedOrg = await getItem(TABLE(), { PK: `ORG#${orgId}`, SK: 'PROFILE' })

  // Fetch the org admin user to get their email
  if (updatedOrg) {
    const adminUser = await getItem(TABLE(), {
      PK: `USER#${org.adminUserId as string}`,
      SK: 'PROFILE',
    })

    if (adminUser) {
      await enqueueOrgApproved({
        orgId,
        orgName: org.name as string,
        adminEmail: adminUser.email as string,
        adminFirstName: adminUser.firstName as string,
      })
    }
  }

  res.status(200).json(updatedOrg ? stripInternalKeys(updatedOrg) : { orgId, status: 'APPROVED' })
})

// --------------------------------------------------------------------------
// POST /admin/organisations/:orgId/reject
// --------------------------------------------------------------------------
adminOrgsRouter.post('/:orgId/reject', async (req: Request, res: Response): Promise<void> => {
  const { orgId } = req.params
  const { reason } = req.body as { reason?: string }

  // Validate reason before fetching org
  if (!reason || reason.trim().length === 0) {
    res.status(400).json({ error: 'reason is required.' })
    return
  }

  if (reason.trim().length < 10) {
    res.status(400).json({ error: 'reason must be at least 10 characters.' })
    return
  }

  const org = await getItem(TABLE(), { PK: `ORG#${orgId}`, SK: 'PROFILE' })

  if (!org) {
    res.status(404).json({ error: 'Organisation not found.' })
    return
  }

  if ((org.status as string) !== 'PENDING') {
    res.status(409).json({ error: 'Organisation is not in PENDING status.' })
    return
  }

  const rejectedAt = new Date().toISOString()

  await updateItem(
    TABLE(),
    { PK: `ORG#${orgId}`, SK: 'PROFILE' },
    'SET #status = :status, rejectedAt = :rejectedAt, rejectionReason = :rejectionReason, GSI1PK = :gsi1pk',
    {
      ':status': 'REJECTED',
      ':rejectedAt': rejectedAt,
      ':rejectionReason': reason.trim(),
      ':gsi1pk': 'ORG_STATUS#REJECTED',
    },
    { '#status': 'status' }
  )

  const updatedOrg = await getItem(TABLE(), { PK: `ORG#${orgId}`, SK: 'PROFILE' })

  // Fetch the org admin user to get their email for notification
  const adminUser = await getItem(TABLE(), {
    PK: `USER#${org.adminUserId as string}`,
    SK: 'PROFILE',
  })

  if (adminUser) {
    await enqueueOrgRejected({
      orgId,
      orgName: org.name as string,
      adminEmail: adminUser.email as string,
      adminFirstName: adminUser.firstName as string,
      rejectionReason: reason.trim(),
    })
  }

  res.status(200).json(updatedOrg ? stripInternalKeys(updatedOrg) : { orgId, status: 'REJECTED' })
})

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function stripInternalKeys(item: Record<string, unknown>): Record<string, unknown> {
  const {
    PK: _pk,
    SK: _sk,
    GSI1PK: _g1pk,
    GSI1SK: _g1sk,
    GSI2PK: _g2pk,
    GSI2SK: _g2sk,
    passwordHash: _ph,
    ...safe
  } = item // eslint-disable-line @typescript-eslint/no-unused-vars
  return safe
}
