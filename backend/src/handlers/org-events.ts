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
import { getItem, putItem, updateItem, queryItems, queryItemsPaginated, transactWrite, deleteItem } from '../lib/dynamodb'
import { validatePostcode, isDateInFuture, isEndTimeAfterStartTime, validateTimeRange } from '../lib/eventValidation'
import { cancelEventRegistrations } from '../lib/eventCancellation'
import { enqueueEventCancelled } from '../lib/eventMailer'

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
 * Determine whether a ROLE# item is a ROLE or SLOT based on SK structure.
 * SK = `ROLE#<roleId>` → ROLE
 * SK = `ROLE#<roleId>#SLOT#<slotId>` → SLOT
 */
function isSlotItem(item: Record<string, unknown>): boolean {
  const sk = item.SK as string
  return sk.includes('#SLOT#')
}

/**
 * Build a nested roles[].slots[] structure from a flat list of ROLE# items.
 * Uses SK structure for entity detection so it is robust whether or not
 * `entityType` is present on legacy items.
 */
function buildRolesWithSlots(items: Record<string, unknown>[]): Record<string, unknown>[] {
  const roles: Map<string, Record<string, unknown>> = new Map()
  const slots: Record<string, unknown>[] = []

  for (const item of items) {
    if (isSlotItem(item)) {
      slots.push(item)
    } else {
      const roleId = item.roleId as string
      roles.set(roleId, { ...stripRoleKeys(item), slots: [] })
    }
  }

  for (const slot of slots) {
    const roleId = slot.roleId as string
    const role = roles.get(roleId)
    if (role) {
      (role.slots as Record<string, unknown>[]).push(stripRoleKeys(slot))
    }
  }

  return Array.from(roles.values())
}

/**
 * Validate role name and optional description/skillIds.
 * Returns an error message string if invalid, or null if valid.
 */
function validateRoleFields(fields: Record<string, unknown>, requireName = true): string | null {
  if (requireName && (!fields.name || String(fields.name).trim() === '')) {
    return 'name is required.'
  }
  if (fields.name !== undefined) {
    const name = String(fields.name).trim()
    if (name.length < 2) return 'name must be at least 2 characters.'
    if (name.length > 100) return 'name must be 100 characters or fewer.'
  }
  if (fields.description !== undefined && String(fields.description).length > 500) {
    return 'description must be 500 characters or fewer.'
  }
  return null
}

/**
 * Validate slot fields.
 * Returns an error message string if invalid, or null if valid.
 */
function validateSlotFields(fields: Record<string, unknown>): string | null {
  const timeError = validateTimeRange(fields.shiftStart, fields.shiftEnd)
  if (timeError) return timeError

  if (fields.headcount !== undefined) {
    const hc = Number(fields.headcount)
    if (isNaN(hc) || hc < 1 || hc > 500) return 'headcount must be between 1 and 500.'
  }
  if (fields.location !== undefined && String(fields.location).length > 200) {
    return 'location must be 200 characters or fewer.'
  }
  return null
}

/**
 * Check for active (PENDING or CONFIRMED) registrations on a specific slot.
 * Returns true if active registrations exist.
 *
 * TODO: wired up by Volunteer Registration PRD — queries GSI on REGISTRATION items by slotId/roleId
 */
async function hasActiveRegistrationsForSlot(_slotId: string): Promise<boolean> {
  // TODO: wired up by Volunteer Registration PRD — queries GSI on REGISTRATION items by slotId
  return false
}

/**
 * Check for active (PENDING or CONFIRMED) registrations on any slot of a role.
 * Returns true if active registrations exist.
 *
 * TODO: wired up by Volunteer Registration PRD — queries GSI on REGISTRATION items by slotId/roleId
 */
async function hasActiveRegistrationsForRole(_roleId: string, slotItems: Record<string, unknown>[]): Promise<boolean> {
  // Placeholder: checks each slot's registration count via the mock-ready helper.
  // The real implementation will query a GSI keyed on roleId once registrations exist.
  for (const slot of slotItems) {
    const hasRegs = await hasActiveRegistrationsForSlot(slot.slotId as string)
    if (hasRegs) return true
  }
  return false
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

  const event = await getOwnedEvent(eventId, orgId)

  if (!event) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }

  const [roleAndSlotItems, pendingRegs] = await Promise.all([
    queryItems(
      TABLE(),
      'PK = :pk AND begins_with(SK, :skPrefix)',
      { ':pk': `EVENT#${eventId}`, ':skPrefix': 'ROLE#' }
    ),
    queryItems(
      TABLE(),
      'GSI4PK = :gsi4pk',
      { ':gsi4pk': `EVENT#${eventId}`, ':pending': 'PENDING' },
      {
        indexName: 'GSI4',
        filterExpression: '#status = :pending',
        expressionAttributeNames: { '#status': 'status' },
      }
    ),
  ])

  const roles = buildRolesWithSlots(roleAndSlotItems)
  const pendingRegistrationCount = pendingRegs.length

  res.status(200).json({ ...stripEventKeys(event), roles, pendingRegistrationCount })
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

  const event = await getOwnedEvent(eventId, orgId)

  if (!event) {
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

// --------------------------------------------------------------------------
// POST /organisation/events/:eventId/publish
// --------------------------------------------------------------------------
orgEventsRouter.post('/:eventId/publish', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
  const { eventId } = req.params

  const event = await getOwnedEvent(eventId, orgId)
  if (!event) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }

  if ((event.status as string) !== 'DRAFT') {
    res.status(409).json({ error: 'Only DRAFT events can be published.' })
    return
  }

  // Require at least one role with at least one slot
  const roleAndSlotItems = await queryItems(
    TABLE(),
    'PK = :pk AND begins_with(SK, :skPrefix)',
    { ':pk': `EVENT#${eventId}`, ':skPrefix': 'ROLE#' }
  )

  // Use buildRolesWithSlots to correctly check parentage — a role must have
  // at least one slot nested under it, not just any slot existing in the partition.
  const rolesWithSlots = buildRolesWithSlots(roleAndSlotItems)
  const hasRoleWithSlot = rolesWithSlots.some(
    (role) => Array.isArray(role.slots) && (role.slots as unknown[]).length > 0
  )

  if (!hasRoleWithSlot) {
    res.status(400).json({ error: 'Event must have at least one role with at least one slot before publishing.' })
    return
  }

  const publishedAt = new Date().toISOString()

  await updateItem(
    TABLE(),
    { PK: `EVENT#${eventId}`, SK: 'PROFILE' },
    'SET #status = :published, GSI3PK = :gsi3pk, publishedAt = :publishedAt',
    {
      ':published': 'PUBLISHED',
      ':gsi3pk': 'EVENT_STATUS#PUBLISHED',
      ':publishedAt': publishedAt,
    },
    { '#status': 'status' }
  )

  const updatedEvent = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: 'PROFILE' })
  res.status(200).json(updatedEvent ? stripEventKeys(updatedEvent) : { ...stripEventKeys(event), status: 'PUBLISHED', publishedAt })
})

// --------------------------------------------------------------------------
// POST /organisation/events/:eventId/cancel
// --------------------------------------------------------------------------
orgEventsRouter.post('/:eventId/cancel', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
  const { eventId } = req.params

  const event = await getOwnedEvent(eventId, orgId)
  if (!event) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }

  const status = event.status as string

  if (status === 'DRAFT') {
    res.status(409).json({ error: 'Draft events cannot be cancelled. Delete the event instead.' })
    return
  }

  if (status === 'COMPLETED' || status === 'CANCELLED') {
    res.status(409).json({ error: 'Completed events cannot be cancelled.' })
    return
  }

  const cancelledAt = new Date().toISOString()

  // Query GSI4 for all PENDING registrations BEFORE updating event status so
  // that the event status change and the first registration batch are atomic.
  const pendingRegistrations = await queryItems(
    TABLE(),
    'GSI4PK = :gsi4pk',
    { ':gsi4pk': `EVENT#${eventId}`, ':pending': 'PENDING' },
    {
      indexName: 'GSI4',
      filterExpression: '#status = :pending',
      expressionAttributeNames: { '#status': 'status' },
    }
  )

  // Build the event update as a TransactWrite item so it is included atomically
  // in the first batch with the registration cancellations.
  const eventUpdateItem = {
    Update: {
      TableName: TABLE(),
      Key: { PK: `EVENT#${eventId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET #status = :cancelled, GSI3PK = :gsi3pk, cancelledAt = :cancelledAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':cancelled': 'CANCELLED',
        ':gsi3pk': 'EVENT_STATUS#CANCELLED',
        ':cancelledAt': cancelledAt,
      },
    },
  }

  // Bulk-cancel registrations; event update is the leadItem in the first batch.
  await cancelEventRegistrations(pendingRegistrations, TABLE(), eventUpdateItem)

  // Enqueue SQS notification (or log locally)
  await enqueueEventCancelled({
    eventId,
    eventTitle: event.title as string,
    cancelledAt,
    affectedRegistrations: pendingRegistrations.map((r) => ({
      regId: r.regId as string,
      volunteerId: r.volunteerId as string,
    })),
  })

  const updatedEvent = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: 'PROFILE' })
  res.status(200).json(updatedEvent ? stripEventKeys(updatedEvent) : { ...stripEventKeys(event), status: 'CANCELLED', cancelledAt })
})

// --------------------------------------------------------------------------
// POST /organisation/events/:eventId/roles  (FR-01)
// --------------------------------------------------------------------------
orgEventsRouter.post('/:eventId/roles', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
  const { eventId } = req.params
  const body = req.body as Record<string, unknown>

  const event = await getOwnedEvent(eventId, orgId)
  if (!event) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }
  if ((event.status as string) !== 'DRAFT') {
    res.status(409).json({ error: 'Roles can only be managed on DRAFT events.' })
    return
  }

  const validationError = validateRoleFields(body)
  if (validationError) {
    res.status(400).json({ error: validationError })
    return
  }

  const roleId = uuidv4()
  const item: Record<string, unknown> = {
    PK: `EVENT#${eventId}`,
    SK: `ROLE#${roleId}`,
    entityType: 'ROLE',
    roleId,
    eventId,
    orgId,
    name: String(body.name).trim(),
  }

  if (body.description !== undefined) {
    item.description = String(body.description).trim()
  }
  if (body.skillIds !== undefined) {
    item.skillIds = body.skillIds
  }

  await putItem(TABLE(), item)

  res.status(201).json(stripRoleKeys(item))
})

// --------------------------------------------------------------------------
// PATCH /organisation/events/:eventId/roles/:roleId  (FR-02)
// --------------------------------------------------------------------------
orgEventsRouter.patch('/:eventId/roles/:roleId', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
  const { eventId, roleId } = req.params
  const body = req.body as Record<string, unknown>

  const event = await getOwnedEvent(eventId, orgId)
  if (!event) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }
  if ((event.status as string) !== 'DRAFT') {
    res.status(409).json({ error: 'Roles can only be managed on DRAFT events.' })
    return
  }

  const role = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: `ROLE#${roleId}` })
  if (!role) {
    res.status(404).json({ error: 'Role not found.' })
    return
  }

  const validationError = validateRoleFields(body, false)
  if (validationError) {
    res.status(400).json({ error: validationError })
    return
  }

  const setClauses: string[] = []
  const exprValues: Record<string, unknown> = {}
  // Only add #name alias when name is actually being updated — DynamoDB throws
  // ValidationException if ExpressionAttributeNames contains unreferenced keys.
  const exprNames: Record<string, string> = {}

  if (body.name !== undefined) {
    // 'name' is a DynamoDB reserved keyword — must be aliased
    exprNames['#name'] = 'name'
    setClauses.push('#name = :name')
    exprValues[':name'] = String(body.name).trim()
  }
  if (body.description !== undefined) {
    setClauses.push('description = :description')
    exprValues[':description'] = String(body.description).trim()
  }
  if (body.skillIds !== undefined) {
    setClauses.push('skillIds = :skillIds')
    exprValues[':skillIds'] = body.skillIds
  }

  if (setClauses.length > 0) {
    await updateItem(
      TABLE(),
      { PK: `EVENT#${eventId}`, SK: `ROLE#${roleId}` },
      `SET ${setClauses.join(', ')}`,
      exprValues,
      Object.keys(exprNames).length > 0 ? exprNames : undefined
    )
  }

  const updatedRole = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: `ROLE#${roleId}` })
  res.status(200).json(stripRoleKeys(updatedRole ?? role))
})

// --------------------------------------------------------------------------
// DELETE /organisation/events/:eventId/roles/:roleId  (FR-03)
// --------------------------------------------------------------------------
orgEventsRouter.delete('/:eventId/roles/:roleId', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
  const { eventId, roleId } = req.params

  const event = await getOwnedEvent(eventId, orgId)
  if (!event) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }
  if ((event.status as string) !== 'DRAFT') {
    res.status(409).json({ error: 'Roles can only be managed on DRAFT events.' })
    return
  }

  const role = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: `ROLE#${roleId}` })
  if (!role) {
    res.status(404).json({ error: 'Role not found.' })
    return
  }

  // Query all SLOT items for this role
  const slotItems = await queryItems(
    TABLE(),
    'PK = :pk AND begins_with(SK, :skPrefix)',
    { ':pk': `EVENT#${eventId}`, ':skPrefix': `ROLE#${roleId}#SLOT#` }
  )

  // Check for active registrations on any slot of this role
  const hasRegs = await hasActiveRegistrationsForRole(roleId, slotItems)
  if (hasRegs) {
    res.status(409).json({ error: 'Cannot delete a role with active registrations.' })
    return
  }

  // Atomically delete ROLE + all SLOT items via TransactWrite
  const deleteItems = [
    { Delete: { TableName: TABLE(), Key: { PK: `EVENT#${eventId}`, SK: `ROLE#${roleId}` } } },
    ...slotItems.map((slot) => ({
      Delete: {
        TableName: TABLE(),
        Key: { PK: `EVENT#${eventId}`, SK: slot.SK as string },
      },
    })),
  ]

  await transactWrite(deleteItems)

  res.status(204).send()
})

// --------------------------------------------------------------------------
// POST /organisation/events/:eventId/roles/:roleId/slots  (FR-04)
// --------------------------------------------------------------------------
orgEventsRouter.post('/:eventId/roles/:roleId/slots', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
  const { eventId, roleId } = req.params
  const body = req.body as Record<string, unknown>

  const event = await getOwnedEvent(eventId, orgId)
  if (!event) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }
  if ((event.status as string) !== 'DRAFT') {
    res.status(409).json({ error: 'Slots can only be managed on DRAFT events.' })
    return
  }

  const role = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: `ROLE#${roleId}` })
  if (!role) {
    res.status(404).json({ error: 'Role not found.' })
    return
  }

  // Validate required fields first before general slot validation
  if (!body.shiftStart) {
    res.status(400).json({ error: 'shiftStart is required and must be in HH:MM format.' })
    return
  }
  if (!body.shiftEnd) {
    res.status(400).json({ error: 'shiftEnd is required and must be in HH:MM format.' })
    return
  }
  if (body.headcount === undefined) {
    res.status(400).json({ error: 'headcount must be between 1 and 500.' })
    return
  }

  const validationError = validateSlotFields(body)
  if (validationError) {
    res.status(400).json({ error: validationError })
    return
  }

  const slotId = uuidv4()
  const item: Record<string, unknown> = {
    PK: `EVENT#${eventId}`,
    SK: `ROLE#${roleId}#SLOT#${slotId}`,
    entityType: 'SLOT',
    slotId,
    roleId,
    eventId,
    orgId,
    shiftStart: body.shiftStart as string,
    shiftEnd: body.shiftEnd as string,
    headcount: Number(body.headcount),
    filledCount: 0,
    status: 'OPEN',
  }

  if (body.location !== undefined) {
    item.location = String(body.location)
  }

  await putItem(TABLE(), item)

  res.status(201).json(stripRoleKeys(item))
})

// --------------------------------------------------------------------------
// PATCH /organisation/events/:eventId/roles/:roleId/slots/:slotId  (FR-05)
// --------------------------------------------------------------------------
orgEventsRouter.patch('/:eventId/roles/:roleId/slots/:slotId', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
  const { eventId, roleId, slotId } = req.params
  const body = req.body as Record<string, unknown>

  const event = await getOwnedEvent(eventId, orgId)
  if (!event) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }
  if ((event.status as string) !== 'DRAFT') {
    res.status(409).json({ error: 'Slots can only be managed on DRAFT events.' })
    return
  }

  const slot = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: `ROLE#${roleId}#SLOT#${slotId}` })
  if (!slot) {
    res.status(404).json({ error: 'Slot not found.' })
    return
  }

  // Validate headcount vs filledCount before general validation
  if (body.headcount !== undefined) {
    const newHc = Number(body.headcount)
    const filled = Number(slot.filledCount ?? 0)
    if (newHc < filled) {
      res.status(409).json({ error: 'headcount cannot be reduced below the current filledCount.' })
      return
    }
  }

  // Validate time range if either shift time is being updated
  if (body.shiftStart !== undefined || body.shiftEnd !== undefined) {
    const start = (body.shiftStart ?? slot.shiftStart) as string
    const end = (body.shiftEnd ?? slot.shiftEnd) as string
    const timeError = validateTimeRange(start, end)
    if (timeError) {
      res.status(400).json({ error: timeError })
      return
    }
  }

  if (body.location !== undefined && String(body.location).length > 200) {
    res.status(400).json({ error: 'location must be 200 characters or fewer.' })
    return
  }

  const setClauses: string[] = []
  const exprValues: Record<string, unknown> = {}

  const allowedFields = ['shiftStart', 'shiftEnd', 'headcount', 'location']
  for (const field of allowedFields) {
    if (body[field] === undefined) continue
    setClauses.push(`${field} = :${field}`)
    exprValues[`:${field}`] = field === 'headcount' ? Number(body[field]) : body[field]
  }

  if (setClauses.length > 0) {
    await updateItem(
      TABLE(),
      { PK: `EVENT#${eventId}`, SK: `ROLE#${roleId}#SLOT#${slotId}` },
      `SET ${setClauses.join(', ')}`,
      exprValues,
      undefined
    )
  }

  const updatedSlot = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: `ROLE#${roleId}#SLOT#${slotId}` })
  res.status(200).json(stripRoleKeys(updatedSlot ?? slot))
})

// --------------------------------------------------------------------------
// DELETE /organisation/events/:eventId/roles/:roleId/slots/:slotId  (FR-06)
// --------------------------------------------------------------------------
orgEventsRouter.delete('/:eventId/roles/:roleId/slots/:slotId', async (req: Request, res: Response): Promise<void> => {
  const orgId = req.session!.orgId!
  const { eventId, roleId, slotId } = req.params

  const event = await getOwnedEvent(eventId, orgId)
  if (!event) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }
  if ((event.status as string) !== 'DRAFT') {
    res.status(409).json({ error: 'Slots can only be managed on DRAFT events.' })
    return
  }

  const slot = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: `ROLE#${roleId}#SLOT#${slotId}` })
  if (!slot) {
    res.status(404).json({ error: 'Slot not found.' })
    return
  }

  // Check for active registrations on this slot
  const hasRegs = await hasActiveRegistrationsForSlot(slotId)
  if (hasRegs) {
    res.status(409).json({ error: 'Cannot delete a slot with active registrations.' })
    return
  }

  await deleteItem(TABLE(), { PK: `EVENT#${eventId}`, SK: `ROLE#${roleId}#SLOT#${slotId}` })

  res.status(204).send()
})

// --------------------------------------------------------------------------
// Shared helper: fetch event and verify ownership
// --------------------------------------------------------------------------

async function getOwnedEvent(
  eventId: string,
  orgId: string
): Promise<Record<string, unknown> | undefined> {
  const event = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: 'PROFILE' })
  if (!event || (event.orgId as string) !== orgId) return undefined
  return event
}
