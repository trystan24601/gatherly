import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  TransactWriteCommand,
  type GetCommandInput,
  type PutCommandInput,
  type UpdateCommandInput,
  type DeleteCommandInput,
  type QueryCommandInput,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb'

export function buildClient(): DynamoDBDocumentClient {
  const endpoint = process.env.DYNAMODB_ENDPOINT
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION ?? 'eu-west-2',
    ...(endpoint ? { endpoint } : {}),
    credentials: endpoint
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
        }
      : undefined,
  })
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  })
}

let _docClient: DynamoDBDocumentClient | undefined

function getDocClient(): DynamoDBDocumentClient {
  if (!_docClient) _docClient = buildClient()
  return _docClient
}

/** Reset the cached client — used in tests when env vars change */
export function resetClient(): void {
  _docClient = undefined
}

export async function getItem(
  tableName: string,
  key: Record<string, unknown>
): Promise<Record<string, unknown> | undefined> {
  const input: GetCommandInput = { TableName: tableName, Key: key }
  const result = await getDocClient().send(new GetCommand(input))
  return result.Item as Record<string, unknown> | undefined
}

export async function putItem(
  tableName: string,
  item: Record<string, unknown>,
  conditionExpression?: string
): Promise<void> {
  const input: PutCommandInput = {
    TableName: tableName,
    Item: item,
    ...(conditionExpression ? { ConditionExpression: conditionExpression } : {}),
  }
  await getDocClient().send(new PutCommand(input))
}

export async function updateItem(
  tableName: string,
  key: Record<string, unknown>,
  updateExpression: string,
  expressionAttributeValues: Record<string, unknown>,
  expressionAttributeNames?: Record<string, string>
): Promise<void> {
  const input: UpdateCommandInput = {
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ...(expressionAttributeNames
      ? { ExpressionAttributeNames: expressionAttributeNames }
      : {}),
  }
  await getDocClient().send(new UpdateCommand(input))
}

export async function deleteItem(
  tableName: string,
  key: Record<string, unknown>
): Promise<void> {
  const input: DeleteCommandInput = { TableName: tableName, Key: key }
  await getDocClient().send(new DeleteCommand(input))
}

export interface TransactWriteItem {
  Put?: {
    TableName: string
    Item: Record<string, unknown>
    ConditionExpression?: string
  }
  Delete?: {
    TableName: string
    Key: Record<string, unknown>
  }
  Update?: {
    TableName: string
    Key: Record<string, unknown>
    UpdateExpression: string
    ConditionExpression?: string
    ExpressionAttributeValues?: Record<string, unknown>
    ExpressionAttributeNames?: Record<string, string>
  }
}

/**
 * Execute a DynamoDB TransactWrite — all-or-nothing across multiple items.
 * Throws TransactionCanceledException on conflict or condition failure.
 */
export async function transactWrite(items: TransactWriteItem[]): Promise<void> {
  const input: TransactWriteCommandInput = {
    TransactItems: items,
  }
  await getDocClient().send(new TransactWriteCommand(input))
}

export async function queryItems(
  tableName: string,
  keyConditionExpression: string,
  expressionAttributeValues: Record<string, unknown>,
  options?: {
    indexName?: string
    filterExpression?: string
    expressionAttributeNames?: Record<string, string>
    limit?: number
    scanIndexForward?: boolean
  }
): Promise<Record<string, unknown>[]> {
  const input: QueryCommandInput = {
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ...(options?.indexName ? { IndexName: options.indexName } : {}),
    ...(options?.filterExpression ? { FilterExpression: options.filterExpression } : {}),
    ...(options?.expressionAttributeNames
      ? { ExpressionAttributeNames: options.expressionAttributeNames }
      : {}),
    ...(options?.limit ? { Limit: options.limit } : {}),
    ...(options?.scanIndexForward !== undefined
      ? { ScanIndexForward: options.scanIndexForward }
      : {}),
  }
  const result = await getDocClient().send(new QueryCommand(input))
  return (result.Items ?? []) as Record<string, unknown>[]
}
