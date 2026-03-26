import {
  DynamoDBClient,
  CreateTableCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb'

function buildDynamoClient(): DynamoDBClient {
  const endpoint = process.env.DYNAMODB_ENDPOINT
  return new DynamoDBClient({
    region: process.env.AWS_REGION ?? 'eu-west-2',
    ...(endpoint ? { endpoint } : {}),
    credentials: endpoint
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
        }
      : undefined,
  })
}

export async function bootstrapTable(): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE_NAME
  if (!tableName) throw new Error('DYNAMODB_TABLE_NAME env var is required')

  const client = buildDynamoClient()

  const command = new CreateTableCommand({
    TableName: tableName,
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' },
      { AttributeName: 'GSI1SK', AttributeType: 'S' },
      { AttributeName: 'GSI2PK', AttributeType: 'S' },
      { AttributeName: 'GSI2SK', AttributeType: 'S' },
      { AttributeName: 'GSI3PK', AttributeType: 'S' },
      { AttributeName: 'GSI3SK', AttributeType: 'S' },
      { AttributeName: 'GSI4PK', AttributeType: 'S' },
      { AttributeName: 'GSI4SK', AttributeType: 'S' },
      { AttributeName: 'GSI5PK', AttributeType: 'S' },
      { AttributeName: 'GSI5SK', AttributeType: 'S' },
      { AttributeName: 'GSI6PK', AttributeType: 'S' },
      { AttributeName: 'GSI6SK', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI1',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'GSI2',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: 'HASH' },
          { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'GSI3',
        KeySchema: [
          { AttributeName: 'GSI3PK', KeyType: 'HASH' },
          { AttributeName: 'GSI3SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'GSI4',
        KeySchema: [
          { AttributeName: 'GSI4PK', KeyType: 'HASH' },
          { AttributeName: 'GSI4SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'GSI5',
        KeySchema: [
          { AttributeName: 'GSI5PK', KeyType: 'HASH' },
          { AttributeName: 'GSI5SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'GSI6',
        KeySchema: [
          { AttributeName: 'GSI6PK', KeyType: 'HASH' },
          { AttributeName: 'GSI6SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  })

  try {
    await client.send(command)
    console.log(`Table '${tableName}' created successfully.`)
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      console.log(`Table '${tableName}' already exists — skipping.`)
      return
    }
    throw err
  }
}

// Run when called directly
if (require.main === module) {
  bootstrapTable()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
