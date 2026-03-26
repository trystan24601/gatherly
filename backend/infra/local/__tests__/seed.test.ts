import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// BE-TEST-05: seed.ts tests
// Uses vi.mock at module level (hoisted) with no top-level variable references

interface CapturedPut {
  PK: string
  SK: string
  Item: Record<string, unknown>
}

const capturedPuts: CapturedPut[] = []

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = vi.fn().mockImplementation(
    async (command: { type: string; input: Record<string, unknown> }) => {
      if (command.type === 'PutItem') {
        const item = command.input.Item as Record<string, unknown>
        capturedPuts.push({
          PK: item.PK as string,
          SK: item.SK as string,
          Item: item,
        })
      }
      return {}
    }
  )

  return {
    DynamoDBDocumentClient: {
      from: vi.fn().mockReturnValue({ send: mockSend }),
    },
    PutCommand: vi.fn().mockImplementation((input) => ({ type: 'PutItem', input })),
    GetCommand: vi.fn().mockImplementation((input) => ({ type: 'GetItem', input })),
    UpdateCommand: vi.fn().mockImplementation((input) => ({ type: 'UpdateItem', input })),
    DeleteCommand: vi.fn().mockImplementation((input) => ({ type: 'DeleteItem', input })),
    QueryCommand: vi.fn().mockImplementation((input) => ({ type: 'QueryItem', input })),
  }
})

describe('seed.ts — seedData', () => {
  beforeEach(() => {
    process.env.DYNAMODB_TABLE_NAME = 'test-gatherly-seed'
    process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000'
    process.env.AWS_REGION = 'eu-west-2'
    process.env.AWS_ACCESS_KEY_ID = 'local'
    process.env.AWS_SECRET_ACCESS_KEY = 'local'
    capturedPuts.length = 0
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('seedData inserts exactly 1 Organisation item (PK=ORG#... SK=PROFILE)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const orgItems = capturedPuts.filter(
      (p) => p.PK.startsWith('ORG#') && p.SK === 'PROFILE'
    )
    expect(orgItems).toHaveLength(1)
  })

  it('seedData inserts exactly 1 User item (PK=USER#... SK=PROFILE)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const userItems = capturedPuts.filter(
      (p) => p.PK.startsWith('USER#') && p.SK === 'PROFILE'
    )
    expect(userItems).toHaveLength(1)
  })

  it('seedData inserts exactly 1 OrgEmail sentinel item (PK=ORGEMAIL#... SK=LOCK)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const sentinelItems = capturedPuts.filter(
      (p) => p.PK.startsWith('ORGEMAIL#') && p.SK === 'LOCK'
    )
    expect(sentinelItems).toHaveLength(1)
  })

  it('seedData inserts exactly 1 Event item (PK=EVENT#... SK=PROFILE)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const eventItems = capturedPuts.filter(
      (p) => p.PK.startsWith('EVENT#') && p.SK === 'PROFILE'
    )
    expect(eventItems).toHaveLength(1)
  })

  it('seedData inserts exactly 2 Role items (PK=EVENT#... SK=ROLE#...)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const roleItems = capturedPuts.filter(
      (p) => p.PK.startsWith('EVENT#') && p.SK.startsWith('ROLE#')
    )
    expect(roleItems).toHaveLength(2)
  })

  it('seeded org has status APPROVED', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const orgItem = capturedPuts.find(
      (p) => p.PK.startsWith('ORG#') && p.SK === 'PROFILE'
    )
    expect(orgItem?.Item.status).toBe('APPROVED')
  })

  it('seeded event has status PUBLISHED', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const eventItem = capturedPuts.find(
      (p) => p.PK.startsWith('EVENT#') && p.SK === 'PROFILE'
    )
    expect(eventItem?.Item.status).toBe('PUBLISHED')
  })

  it('seedData is idempotent — calling twice produces 6 items on first call and does not throw', async () => {
    const { seedData } = await import('../seed')
    await seedData()
    // 1 Org + 1 OrgEmail sentinel + 1 User + 1 Event + 2 Roles = 6 items
    expect(capturedPuts).toHaveLength(6)
    // Second call should not throw (conditional puts handle duplicates)
    await expect(seedData()).resolves.not.toThrow()
  })
})
