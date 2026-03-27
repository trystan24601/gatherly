/**
 * Super Admin event management endpoints.
 *
 * Endpoints:
 *   POST /admin/events/:eventId/complete
 *
 * All routes require requireAuth + requireRole('SUPER_ADMIN') applied externally
 * in app.ts. No org ownership check — Super Admin can complete any event.
 */

import { Router, type Request, type Response } from 'express'
import { getItem, updateItem } from '../lib/dynamodb'

const TABLE = (): string => {
  const name = process.env.DYNAMODB_TABLE_NAME
  if (!name) throw new Error('DYNAMODB_TABLE_NAME env var is required')
  return name
}

export const adminEventsRouter = Router()

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function stripEventKeys(item: Record<string, unknown>): Record<string, unknown> {
  const { PK: _pk, SK: _sk, GSI3PK: _g3pk, GSI3SK: _g3sk, GSI4PK: _g4pk, GSI4SK: _g4sk, ...safe } = item // eslint-disable-line @typescript-eslint/no-unused-vars
  return safe
}

// --------------------------------------------------------------------------
// POST /admin/events/:eventId/complete
// --------------------------------------------------------------------------
adminEventsRouter.post('/:eventId/complete', async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params

  const event = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: 'PROFILE' })

  if (!event) {
    res.status(404).json({ error: 'Event not found.' })
    return
  }

  const status = event.status as string

  if (status !== 'PUBLISHED' && status !== 'ACTIVE') {
    res.status(409).json({ error: 'Only PUBLISHED or ACTIVE events can be completed.' })
    return
  }

  const completedAt = new Date().toISOString()

  await updateItem(
    TABLE(),
    { PK: `EVENT#${eventId}`, SK: 'PROFILE' },
    'SET #status = :completed, GSI3PK = :gsi3pk, completedAt = :completedAt',
    {
      ':completed': 'COMPLETED',
      ':gsi3pk': 'EVENT_STATUS#COMPLETED',
      ':completedAt': completedAt,
    },
    { '#status': 'status' }
  )

  const updatedEvent = await getItem(TABLE(), { PK: `EVENT#${eventId}`, SK: 'PROFILE' })
  res.status(200).json(
    updatedEvent
      ? stripEventKeys(updatedEvent)
      : { ...stripEventKeys(event), status: 'COMPLETED', completedAt }
  )
})
