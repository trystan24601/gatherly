/**
 * Event cancellation bulk-registration helper.
 *
 * Chunks a list of PENDING registration items into batches of 25 (the
 * DynamoDB TransactWrite maximum) and issues a TransactWrite for each batch,
 * setting status=CANCELLED on every item.
 *
 * When the registrations array is empty, no DynamoDB call is made.
 */
import { transactWrite } from './dynamodb'

const BATCH_SIZE = 25

/**
 * Cancel all provided registration items by setting their status to CANCELLED.
 *
 * @param registrations - Array of registration items with at least `regId` (PK derived as REG#<regId>)
 * @param tableName     - DynamoDB table name
 */
export async function cancelEventRegistrations(
  registrations: Record<string, unknown>[],
  tableName: string
): Promise<void> {
  if (registrations.length === 0) return

  const cancelledAt = new Date().toISOString()

  for (let i = 0; i < registrations.length; i += BATCH_SIZE) {
    const batch = registrations.slice(i, i + BATCH_SIZE)

    await transactWrite(
      batch.map((reg) => ({
        Update: {
          TableName: tableName,
          Key: { PK: `REG#${reg.regId as string}`, SK: 'META' },
          UpdateExpression: 'SET #status = :cancelled, cancelledAt = :cancelledAt',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':cancelled': 'CANCELLED',
            ':cancelledAt': cancelledAt,
          },
        },
      }))
    )
  }
}
