/**
 * Email dispatch for password-reset messages.
 *
 * Behaviour:
 * - When SQS_QUEUE_URL is set: publish a JSON message to SQS (cloud path).
 * - When SQS_QUEUE_URL is empty/absent: send directly via SMTP using nodemailer
 *   (local development with Mailhog).
 */

import nodemailer from 'nodemailer'
import { log } from './logger'

export interface PasswordResetPayload {
  toEmail: string
  resetToken: string
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

async function sendViaSMTP(payload: PasswordResetPayload): Promise<void> {
  const from = process.env.EMAIL_FROM ?? 'noreply@gatherlywork.com'
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173'
  const resetUrl = `${appUrl}/reset-password?token=${payload.resetToken}`

  const transport = createTransport()
  await transport.sendMail({
    from,
    to: payload.toEmail,
    subject: 'Reset your Gatherly password',
    text: `Click the link below to reset your password (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request a password reset, ignore this email.`,
    html: `<p>Click the link below to reset your password (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request a password reset, ignore this email.</p>`,
  })
}

// --------------------------------------------------------------------------
// SQS path (cloud)
// --------------------------------------------------------------------------

async function sendViaSQS(payload: PasswordResetPayload): Promise<void> {
  // Dynamic import so the SQS SDK is not bundled when running locally without it
  const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs')

  const client = new SQSClient({ region: process.env.AWS_REGION ?? 'eu-west-2' })
  await client.send(
    new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL!,
      MessageBody: JSON.stringify({
        type: 'PASSWORD_RESET',
        ...payload,
      }),
    })
  )
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function sendPasswordResetEmail(
  payload: PasswordResetPayload
): Promise<void> {
  const sqsUrl = process.env.SQS_QUEUE_URL

  try {
    if (sqsUrl) {
      await sendViaSQS(payload)
    } else {
      await sendViaSMTP(payload)
    }
  } catch (err) {
    // Log the error but do not surface it to callers — the reset request
    // handler always returns 200 to avoid enumeration.
    log({
      requestId: 'mailer',
      action: 'sendPasswordResetEmail.error',
      userId: undefined,
    })
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to send password reset email:', err)
    }
  }
}
