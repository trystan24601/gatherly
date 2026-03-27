/**
 * Organisation lifecycle email dispatch.
 *
 * Behaviour:
 * - ORG_SUBMITTED: enqueue SQS message only (no email in MVP). No-op locally
 *   when SQS_QUEUE_URL is not set.
 * - ORG_APPROVED: enqueue SQS message when SQS_QUEUE_URL is set; otherwise
 *   send directly via SMTP (Mailhog locally).
 * - ORG_REJECTED: same as ORG_APPROVED, includes rejection reason.
 */

import nodemailer from 'nodemailer'
import { log } from './logger'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface OrgSubmittedPayload {
  orgId: string
  orgName: string
}

export interface OrgApprovedPayload {
  orgId: string
  orgName: string
  adminEmail: string
  adminFirstName: string
}

export interface OrgRejectedPayload {
  orgId: string
  orgName: string
  adminEmail: string
  adminFirstName: string
  rejectionReason: string
}

// --------------------------------------------------------------------------
// SMTP path (local / Mailhog)
// --------------------------------------------------------------------------

function createTransport() {
  const host = process.env.SMTP_HOST ?? 'localhost'
  const port = parseInt(process.env.SMTP_PORT ?? '1025', 10)
  const secure = process.env.SMTP_SECURE === 'true'
  return nodemailer.createTransport({ host, port, secure })
}

async function sendApprovedViaSMTP(payload: OrgApprovedPayload): Promise<void> {
  const from = process.env.EMAIL_FROM ?? 'noreply@gatherlywork.com'
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173'

  const transport = createTransport()
  await transport.sendMail({
    from,
    to: payload.adminEmail,
    subject: `Your organisation "${payload.orgName}" has been approved`,
    text: `Hi ${payload.adminFirstName},\n\nGreat news! Your organisation "${payload.orgName}" has been approved on Occasion HQ.\n\nYou can now log in and start managing your events:\n${appUrl}/org/login\n\nThe Occasion HQ team`,
    html: `<p>Hi ${payload.adminFirstName},</p><p>Great news! Your organisation "<strong>${payload.orgName}</strong>" has been approved on Occasion HQ.</p><p><a href="${appUrl}/org/login">Log in to your dashboard</a></p><p>The Occasion HQ team</p>`,
  })
}

async function sendRejectedViaSMTP(payload: OrgRejectedPayload): Promise<void> {
  const from = process.env.EMAIL_FROM ?? 'noreply@gatherlywork.com'

  const transport = createTransport()
  await transport.sendMail({
    from,
    to: payload.adminEmail,
    subject: `Your organisation application for "${payload.orgName}" was not approved`,
    text: `Hi ${payload.adminFirstName},\n\nUnfortunately, your organisation application for "${payload.orgName}" was not approved for the following reason:\n\n${payload.rejectionReason}\n\nIf you believe this is an error, please contact support.\n\nThe Occasion HQ team`,
    html: `<p>Hi ${payload.adminFirstName},</p><p>Unfortunately, your organisation application for "<strong>${payload.orgName}</strong>" was not approved for the following reason:</p><blockquote>${payload.rejectionReason}</blockquote><p>If you believe this is an error, please contact support.</p><p>The Occasion HQ team</p>`,
  })
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
    requestId: 'orgMailer',
    action: `${action}.error`,
    userId: undefined,
  })
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[orgMailer] Failed to ${action}:`, err)
  }
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * ORG_SUBMITTED: enqueue SQS message only. No email in MVP.
 * No-op locally when SQS_QUEUE_URL is not set.
 */
export async function enqueueOrgSubmitted(payload: OrgSubmittedPayload): Promise<void> {
  const sqsUrl = process.env.SQS_QUEUE_URL
  if (!sqsUrl) {
    // No-op locally — no Mailhog email for ORG_SUBMITTED per MVP spec (OQ-05)
    return
  }

  try {
    await sendViaSQS({ type: 'ORG_SUBMITTED', ...payload })
  } catch (err) {
    handleMailerError('enqueueOrgSubmitted', err)
  }
}

/**
 * ORG_APPROVED: enqueue SQS message (cloud) or send via SMTP (local/Mailhog).
 */
export async function enqueueOrgApproved(payload: OrgApprovedPayload): Promise<void> {
  const sqsUrl = process.env.SQS_QUEUE_URL

  try {
    if (sqsUrl) {
      await sendViaSQS({ type: 'ORG_APPROVED', ...payload })
    } else {
      await sendApprovedViaSMTP(payload)
    }
  } catch (err) {
    handleMailerError('enqueueOrgApproved', err)
  }
}

/**
 * ORG_REJECTED: enqueue SQS message (cloud) or send via SMTP (local/Mailhog).
 */
export async function enqueueOrgRejected(payload: OrgRejectedPayload): Promise<void> {
  const sqsUrl = process.env.SQS_QUEUE_URL

  try {
    if (sqsUrl) {
      await sendViaSQS({ type: 'ORG_REJECTED', ...payload })
    } else {
      await sendRejectedViaSMTP(payload)
    }
  } catch (err) {
    handleMailerError('enqueueOrgRejected', err)
  }
}
