#!/usr/bin/env tsx
/**
 * CLI script to provision a Super Admin account.
 *
 * Usage:
 *   DYNAMODB_TABLE_NAME=gatherly-local \
 *   DYNAMODB_ENDPOINT=http://localhost:8000 \
 *   tsx backend/scripts/provision-super-admin.ts \
 *     --email admin@example.com \
 *     --firstName Super \
 *     --lastName Admin
 *
 * The script:
 *   1. Generates a random temporary password and bcrypt-hashes it.
 *   2. Creates USER and USEREMAIL items via TransactWrite (atomic).
 *   3. Prints the temporary password to stdout.
 *
 * There is no UI path to create Super Admin accounts.
 */

import { v4 as uuidv4 } from 'uuid'
import { hashPassword } from '../src/lib/auth'
import { transactWrite } from '../src/lib/dynamodb'
import crypto from 'node:crypto'

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const value = args[i + 1]
      if (value && !value.startsWith('--')) {
        result[key] = value
        i++
      }
    }
  }
  return result
}

async function main(): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE_NAME
  if (!tableName) {
    console.error('Error: DYNAMODB_TABLE_NAME env var is required.')
    process.exit(1)
  }

  const args = parseArgs(process.argv.slice(2))
  const { email, firstName, lastName } = args

  if (!email || !firstName || !lastName) {
    console.error('Usage: provision-super-admin.ts --email <email> --firstName <name> --lastName <name>')
    process.exit(1)
  }

  // Generate a random temporary password: 24 chars of hex = 12 random bytes
  const tempPassword =
    crypto.randomBytes(6).toString('hex').toUpperCase() +
    crypto.randomBytes(6).toString('hex') +
    '!1'

  const passwordHash = await hashPassword(tempPassword)
  const userId = uuidv4()
  const createdAt = new Date().toISOString()

  await transactWrite([
    {
      Put: {
        TableName: tableName,
        Item: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
          userId,
          email,
          firstName,
          lastName,
          role: 'SUPER_ADMIN',
          passwordHash,
          createdAt,
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    },
    {
      Put: {
        TableName: tableName,
        Item: {
          PK: `USEREMAIL#${email}`,
          SK: 'LOCK',
          userId,
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    },
  ])

  console.log(`Super Admin account created:`)
  console.log(`  Email:     ${email}`)
  console.log(`  UserId:    ${userId}`)
  console.log(`  Password:  ${tempPassword}`)
  console.log(`\nIMPORTANT: Share this password securely and ask the user to change it immediately.`)
}

main().catch((err) => {
  console.error('Failed to provision super admin:', err instanceof Error ? err.message : err)
  process.exit(1)
})
