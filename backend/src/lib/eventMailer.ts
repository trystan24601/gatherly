/**
 * Event lifecycle email/notification dispatch.
 *
 * EVENT_CANCELLED: enqueue SQS message when SQS_QUEUE_URL is set;
 * otherwise log the payload at INFO level (no direct SMTP for cancellation —
 * fan-out to volunteers is handled by a separate SQS consumer, not built in
 * this PRD per OQ-04).
 */
import { log } from './logger'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface EventCancelledPayload {
  eventId: string
  eventTitle: string
  cancelledAt: string
  affectedRegistrations: Array<{ regId: string; volunteerId: string }>
}

// --------------------------------------------------------------------------
// SQS path (cloud)
// --------------------------------------------------------------------------

async function sendViaSQS(message: Record<string, unknown>): Promise<void> {
  // Dynamic import so the SQS SDK is not bundled when running locally without it
  const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs')

  const client = new SQSClient({ region: process.env.AWS_REGION ?? 'eu-west-2' })
  await client.send(
    new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL!,
      MessageBody: JSON.stringify(message),
    })
  )
}

// --------------------------------------------------------------------------
// Shared error handler
// --------------------------------------------------------------------------

function handleMailerError(action: string, err: unknown): void {
  log({
    requestId: 'eventMailer',
    action: `${action}.error`,
    userId: undefined,
  })
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[eventMailer] Failed to ${action}:`, err)
  }
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * EVENT_CANCELLED: enqueue SQS message (cloud) or log payload locally.
 * No direct SMTP for cancellation in MVP — the SES fan-out is handled by a
 * separate consumer that reads from SQS.
 */
export async function enqueueEventCancelled(payload: EventCancelledPayload): Promise<void> {
  const sqsUrl = process.env.SQS_QUEUE_URL

  try {
    if (sqsUrl) {
      await sendViaSQS({ type: 'EVENT_CANCELLED', ...payload })
    } else {
      // Local dev: log the payload so it is visible without a real SQS queue
      log({
        requestId: 'eventMailer',
        action: 'EVENT_CANCELLED.local',
        userId: undefined,
      })
      if (process.env.NODE_ENV !== 'test') {
        console.info('[eventMailer] EVENT_CANCELLED (local, no SQS):', JSON.stringify(payload, null, 2))
      }
    }
  } catch (err) {
    handleMailerError('enqueueEventCancelled', err)
  }
}
