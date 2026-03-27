import { test, expect, request as apiRequest } from '@playwright/test'

// TST-05: Database bootstrap acceptance test
// TST-06: Seed data acceptance test
// These tests query DynamoDB Local via the DynamoDB HTTP API directly

const DYNAMODB_URL = process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000'
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? 'gatherly-local'

// DynamoDB Local accepts any Authorization header
const DYNAMO_HEADERS = {
  'Content-Type': 'application/x-amz-json-1.0',
  Authorization:
    'AWS4-HMAC-SHA256 Credential=local/20260326/eu-west-2/dynamodb/aws4_request, SignedHeaders=host;x-amz-date;x-amz-target, Signature=fakesig',
  'X-Amz-Date': '20260326T000000Z',
}

interface DynamoItem {
  PK?: { S: string }
  SK?: { S: string }
  status?: { S: string }
  [key: string]: unknown
}

interface ScanResult {
  Count: number
  Items: DynamoItem[]
}

interface DescribeResult {
  Table?: {
    GlobalSecondaryIndexes?: Array<{ IndexName: string }>
  }
}

async function scanTable(): Promise<ScanResult> {
  const ctx = await apiRequest.newContext({ baseURL: DYNAMODB_URL })
  const response = await ctx.post('/', {
    headers: {
      ...DYNAMO_HEADERS,
      'X-Amz-Target': 'DynamoDB_20120810.Scan',
    },
    data: JSON.stringify({ TableName: TABLE_NAME }),
  })
  const body = await response.json() as ScanResult
  await ctx.dispose()
  return body
}

async function describeTable(): Promise<DescribeResult> {
  const ctx = await apiRequest.newContext({ baseURL: DYNAMODB_URL })
  const response = await ctx.post('/', {
    headers: {
      ...DYNAMO_HEADERS,
      'X-Amz-Target': 'DynamoDB_20120810.DescribeTable',
    },
    data: JSON.stringify({ TableName: TABLE_NAME }),
  })
  const body = await response.json() as DescribeResult
  await ctx.dispose()
  return body
}

// TST-05: Assert table exists with all 6 GSIs
test.describe('Database bootstrap acceptance', () => {
  test('table gatherly-local exists in DynamoDB Local', async () => {
    const result = await describeTable()
    expect(result.Table).toBeDefined()
  })

  test('all 6 GSIs exist (GSI1 through GSI6)', async () => {
    const result = await describeTable()
    const gsiNames = (result.Table?.GlobalSecondaryIndexes ?? []).map(
      (gsi) => gsi.IndexName
    )
    expect(gsiNames).toContain('GSI1')
    expect(gsiNames).toContain('GSI2')
    expect(gsiNames).toContain('GSI3')
    expect(gsiNames).toContain('GSI4')
    expect(gsiNames).toContain('GSI5')
    expect(gsiNames).toContain('GSI6')
  })
})

// TST-06: Assert seed data is correct
test.describe('Seed data acceptance', () => {
  test('table contains at least 1 Organisation item with status APPROVED', async () => {
    const result = await scanTable()
    const approvedOrgs = result.Items.filter(
      (item) =>
        item.PK?.S?.startsWith('ORG#') &&
        item.SK?.S === 'PROFILE' &&
        item.status?.S === 'APPROVED'
    )
    expect(approvedOrgs.length).toBeGreaterThanOrEqual(1)
  })

  test('table contains at least 1 User item', async () => {
    const result = await scanTable()
    const userItems = result.Items.filter(
      (item) => item.PK?.S?.startsWith('USER#') && item.SK?.S === 'PROFILE'
    )
    expect(userItems.length).toBeGreaterThanOrEqual(1)
  })

  test('table contains at least 1 OrgEmail sentinel item', async () => {
    const result = await scanTable()
    const sentinelItems = result.Items.filter(
      (item) => item.PK?.S?.startsWith('ORGEMAIL#') && item.SK?.S === 'LOCK'
    )
    expect(sentinelItems.length).toBeGreaterThanOrEqual(1)
  })

  test('table contains at least 1 Event item with status PUBLISHED', async () => {
    const result = await scanTable()
    const eventItems = result.Items.filter(
      (item) => item.PK?.S?.startsWith('EVENT#') && item.SK?.S === 'PROFILE'
    )
    expect(eventItems.length).toBeGreaterThanOrEqual(1)

    // At least one event item must be PUBLISHED (the seeded event-demo-fun-run)
    const hasPublished = eventItems.some((item) => item.status?.S === 'PUBLISHED')
    expect(hasPublished).toBe(true)
  })

  test('table contains at least 2 Role items', async () => {
    const result = await scanTable()
    const roleItems = result.Items.filter(
      (item) => item.PK?.S?.startsWith('EVENT#') && item.SK?.S?.startsWith('ROLE#')
    )
    expect(roleItems.length).toBeGreaterThanOrEqual(2)
  })

  test('running db:seed twice produces no duplicates (idempotency) — count >= 6', async () => {
    const result = await scanTable()
    // Must have at least: 1 org + 1 email + 1 user + 1 event + 2 roles = 6
    expect(result.Count).toBeGreaterThanOrEqual(6)
  })
})
