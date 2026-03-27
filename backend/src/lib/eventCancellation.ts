/**
 * Event cancellation bulk-registration helper.
 *
 * Chunks a list of PENDING registration items into batches of 25 (the
 * DynamoDB TransactWrite maximum) and issues a TransactWrite for each batch,
 * setting status=CANCELLED on every item.
 *
 * An optional `leadItem` (e.g. the event status update) is prepended to the
 * first batch, reserving one slot so that first batch never exceeds 25 items.
 * This makes the event status change and the first registration batch atomic.
 *
 * When the registrations array is empty and a leadItem is provided, a single
 * TransactWrite is issued for the leadItem alone.
 */
import { transactWrite, type TransactWriteItem } from './dynamodb'

const BATCH_SIZE = 25

/**
 * Cancel all provided registration items by setting their status to CANCELLED.
 *
 * @param registrations - Array of registration items with at least `regId` (PK derived as REG#<regId>)
 * @param tableName     - DynamoDB table name
 * @param leadItem      - Optional item prepended to the first TransactWrite batch (e.g. the event update)
 */
export async function cancelEventRegistrations(
  registrations: Record<string, unknown>[],
  tableName: string,
  leadItem?: TransactWriteItem
): Promise<void> {
  const cancelledAt = new Date().toISOString()

  // First batch: leadItem + up to (BATCH_SIZE - 1) registrations so total ≤ 25
  const firstBatchSize = leadItem ? BATCH_SIZE - 1 : BATCH_SIZE
  const firstBatch = registrations.slice(0, firstBatchSize)
  const remainingRegistrations = registrations.slice(firstBatchSize)

  if (leadItem || firstBatch.length > 0) {
    const items: TransactWriteItem[] = []
    if (leadItem) items.push(leadItem)
    items.push(
      ...firstBatch.map((reg) => ({
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
    await transactWrite(items)
  }

  for (let i = 0; i < remainingRegistrations.length; i += BATCH_SIZE) {
    const batch = remainingRegistrations.slice(i, i + BATCH_SIZE)
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
