/**
 * Org Admin event management endpoints.
 *
 * Endpoints:
 *   POST  /organisation/events          — create a new DRAFT event
 *   PATCH /organisation/events/:eventId — edit a DRAFT event
 *   GET   /organisation/events/:eventId — get event + roles
 *   GET   /organisation/events          — list org events (paginated, date desc)
 *
 * All routes require requireAuth + requireRole('ORG_ADMIN') + requireApprovedOrg
 * applied in app.ts before this router is mounted.
 */

import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getItem, putItem, updateItem, queryItems, queryItemsPaginated } from '../lib/dynamodb'
import { validatePostcode, isDateInFuture, isEndTimeAfterStartTime } from '../lib/eventValidation'

const TABLE = (): string => {
  const name = process.env.DYNAMODB_TABLE_NAME
  if (!name) throw new Error('DYNAMODB_TABLE_NAME env var is required')
  return name
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export const orgEventsRouter = Router()

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Strip DynamoDB internal keys from an event item before returning it. */
function stripEventKeys(item: Record<string, unknown>): Record<string, unknown> {
  const { PK: _pk, SK: _sk, GSI3PK: _g3pk, GSI3SK: _g3sk, GSI4PK: _g4pk, GSI4SK: _g4sk, ...safe } = item // eslint-disable-line @typescript-eslint/no-unused-vars
  return safe
}

/** Strip DynamoDB internal keys from a role item before returning it. */
function stripRoleKeys(item: Record<string, unknown>): Record<string, unknown> {
  const { PK: _pk, SK: _sk, ...safe } = item // eslint-disable-line @typescript-eslint/no-unused-vars
  return safe
}

/**
 * Validate required and optional fields for event creation/editing.
 * Returns an error message string if invalid, or null if valid.
 */
function validateEventFields(
  fields: Record<string, unknown>,
  existing?: Record<string, unknown>
): string | null {
  const isCreate = !existing

  // Required fields (only checked on create)
  if (isCreate) {
    const required = [
      'title',
      'eventTypeId',
      'eventDate',
      'startTime',
      'endTime',
      'venueName',
      'venueAddress',
      'city',
      'postcode',
    ]
    for (const field of required) {
      if (!fields[field] || String(fields[field]).trim() === '') {
        return `${field} is required.`
      }
    }
  }

  // title length
  if (fields.title !== undefined && String(fields.title).length > 150) {
    return 'title must be 150 characters or fewer.'
  }

  // description length
  if (fields.description !== undefined && String(fields.description).length > 2000) {
    return 'description must be 2000 characters or fewer.'
  }

  // maxVolunteers range
  if (fields.maxVolunteers !== undefined) {
    const mv = Number(fields.maxVolunteers)
    if (isNaN(mv) || mv < 1 || mv > 10000) {
      return 'maxVolunteers must be between 1 and 10000.'
    }
  }

  // eventDate validation
  if (fields.eventDate !== undefined) {
    if (!isDateInFuture(fields.eventDate as string)) {
      return 'Event date must be in the future.'
    }
  }

  // time validation — need both start and end to compare
  const startTime =
    (fields.startTime as string | undefined) ?? (existing?.startTime as string | undefined)
  const endTime =
    (fields.endTime as string | undefined) ?? (existing?.endTime as string | undefined)

  if (startTime && endTime) {
    if (!isEndTimeAfterStartTime(startTime, endTime)) {
      return 'End time must be after start time.'
    }
  }

  // postcode validation
  if (fields.postcode !== undefined) {
    if (!validatePostcode(fields.postcode as string)) {
      return 'Please enter a valid UK postcode.'
    }
  }

  return null
}

// --------------------------------------------------------------------------
// POST /organisation/events
// --------------------------------------------------------------------------
orgEventsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
  const body = req.body as Record<string, unknown>

  // Remove orgId from body — always use session value
  const { orgId: _ignoredOrgId, ...fields } = body // eslint-disable-line @typescript-eslint/no-unused-vars

  const validationError = validateEventFields(fields)
  if (validationError) {
    res.status(400).json({ error: validationError })
    return
  }

  const eventId = uuidv4()
  const eventDate = fields.eventDate as string
  const createdAt = new Date().toISOString()

  const item: Record<string, unknown> = {
    PK: `EVENT#${eventId}`,
    SK: 'PROFILE',
    eventId,
    orgId,
    title: (fields.title as string).trim(),
    eventTypeId: (fields.eventTypeId as string).trim(),
    eventDate,
    startTime: fields.startTime as string,
    endTime: fields.endTime as string,
    venueName: (fields.venueName as string).trim(),
    venueAddress: (fields.venueAddress as string).trim(),
    city: (fields.city as string).trim(),
    postcode: fields.postcode as string,
    status: 'DRAFT',
    createdAt,
    GSI3PK: 'EVENT_STATUS#DRAFT',
    GSI3SK: `${eventDate}#${eventId}`,
    GSI4PK: `ORG#${orgId}`,
    GSI4SK: `${eventDate}#${eventId}`,
  }

  if (fields.description) {
    item.description = (fields.description as string).trim()
  }

  if (fields.maxVolunteers !== undefined) {
    item.maxVolunteers = Number(fields.maxVolunteers)
  }

  await putItem(TABLE(), item)

  res.status(201).json(stripEventKeys(item))
})

// --------------------------------------------------------------------------
// GET /organisation/events — must come before /:eventId to avoid route clash
// --------------------------------------------------------------------------
orgEventsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
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
    'GSI4PK = :gsi4pk',
    { ':gsi4pk': `ORG#${orgId}` },
    {
      indexName: 'GSI4',
      limit,
      scanIndexForward: false,
      exclusiveStartKey,
    }
  )

  // Compute fill-rate from ROLE items for each event
  const events = await Promise.all(
    items.map(async (event) => {
      const eventId = event.eventId as string
      const roles = await queryItems(
        TABLE(),
        'PK = :pk AND begins_with(SK, :skPrefix)',
        { ':pk': `EVENT#${eventId}`, ':skPrefix': 'ROLE#' }
      )

      const totalRoles = roles.length
      const totalHeadcount = roles.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0)
      const filledCount = roles.reduce((sum, r) => sum + (Number(r.filledCount) || 0), 0)
      const fillRate = totalHeadcount > 0 ? filledCount / totalHeadcount : 0

      return {
        eventId,
        title: event.title,
        eventDate: event.eventDate,
        status: event.status,
        totalRoles,
        totalHeadcount,
        filledCount,
        fillRate,
      }
    })
  )

  const cursor = lastEvaluatedKey
    ? Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64')
    : null

  res.status(200).json({ events, cursor })
})

// --------------------------------------------------------------------------
// GET /organisation/events/:eventId
// --------------------------------------------------------------------------
orgEventsRouter.get('/:eventId', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
  const { eventId } = req.params

  const event = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: 'PROFILE' })

  if (!event || (event.orgId as string) !== orgId) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }

  const roleItems = await queryItems(
    TABLE(),
    'PK = :pk AND begins_with(SK, :skPrefix)',
    { ':pk': `EVENT#${eventId}`, ':skPrefix': 'ROLE#' }
  )

  const roles = roleItems.map(stripRoleKeys)

  res.status(200).json({ ...stripEventKeys(event), roles })
})

// --------------------------------------------------------------------------
// PATCH /organisation/events/:eventId
// --------------------------------------------------------------------------
orgEventsRouter.patch('/:eventId', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
  const { eventId } = req.params
  const body = req.body as Record<string, unknown>

  // Remove orgId from body
  const { orgId: _ignoredOrgId, ...fields } = body // eslint-disable-line @typescript-eslint/no-unused-vars

  const event = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: 'PROFILE' })

  if (!event || (event.orgId as string) !== orgId) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }

  if ((event.status as string) !== 'DRAFT') {
    res.status(409).json({ error: 'Only DRAFT events can be edited.' })
    return
  }

  const validationError = validateEventFields(fields, event)
  if (validationError) {
    res.status(400).json({ error: validationError })
    return
  }

  // Build update expression from provided fields
  const allowedFields = [
    'title',
    'eventTypeId',
    'eventDate',
    'startTime',
    'endTime',
    'venueName',
    'venueAddress',
    'city',
    'postcode',
    'description',
    'maxVolunteers',
  ]

  const setClauses: string[] = []
  const exprValues: Record<string, unknown> = {}
  const exprNames: Record<string, string> = {}

  for (const field of allowedFields) {
    if (fields[field] === undefined) continue

    // 'status' is a reserved word — use expression attribute name
    const attrName = field === 'status' ? '#status' : field
    if (field === 'status') exprNames['#status'] = 'status'

    setClauses.push(`${attrName} = :${field}`)
    exprValues[`:${field}`] = field === 'maxVolunteers' ? Number(fields[field]) : fields[field]
  }

  // If eventDate changes, also update GSI3SK and GSI4SK
  if (fields.eventDate) {
    const newDate = fields.eventDate as string
    setClauses.push('GSI3SK = :gsi3sk')
    exprValues[':gsi3sk'] = `${newDate}#${eventId}`
    setClauses.push('GSI4SK = :gsi4sk')
    exprValues[':gsi4sk'] = `${newDate}#${eventId}`
  }

  if (setClauses.length === 0) {
    // Nothing to update — return current event
    const roleItems = await queryItems(
      TABLE(),
      'PK = :pk AND begins_with(SK, :skPrefix)',
      { ':pk': `EVENT#${eventId}`, ':skPrefix': 'ROLE#' }
    )
    res.status(200).json({ ...stripEventKeys(event), roles: roleItems.map(stripRoleKeys) })
    return
  }

  await updateItem(
    TABLE(),
    { PK: `EVENT#${eventId}`, SK: 'PROFILE' },
    `SET ${setClauses.join(', ')}`,
    exprValues,
    Object.keys(exprNames).length > 0 ? exprNames : undefined
  )

  // Fetch updated event
  const updatedEvent = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: 'PROFILE' })

  res.status(200).json(updatedEvent ? stripEventKeys(updatedEvent) : stripEventKeys(event))
})
