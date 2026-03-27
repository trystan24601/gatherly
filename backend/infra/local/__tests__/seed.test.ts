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
    TransactWriteCommand: vi.fn().mockImplementation((input) => ({ type: 'TransactWriteItem', input })),
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

  it('seedData inserts exactly 3 Organisation items (PK=ORG#... SK=PROFILE)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const orgItems = capturedPuts.filter(
      (p) => p.PK.startsWith('ORG#') && p.SK === 'PROFILE'
    )
    expect(orgItems).toHaveLength(3)
  })

  it('seedData inserts exactly 5 User items (PK=USER#... SK=PROFILE)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const userItems = capturedPuts.filter(
      (p) => p.PK.startsWith('USER#') && p.SK === 'PROFILE'
    )
    expect(userItems).toHaveLength(5)
  })

  it('seedData inserts exactly 3 OrgEmail sentinel items (PK=ORGEMAIL#... SK=LOCK)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const sentinelItems = capturedPuts.filter(
      (p) => p.PK.startsWith('ORGEMAIL#') && p.SK === 'LOCK'
    )
    expect(sentinelItems).toHaveLength(3)
  })

  it('seedData inserts exactly 5 UserEmail sentinel items (PK=USEREMAIL#... SK=LOCK)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const sentinelItems = capturedPuts.filter(
      (p) => p.PK.startsWith('USEREMAIL#') && p.SK === 'LOCK'
    )
    expect(sentinelItems).toHaveLength(5)
  })

  it('volunteer user item has role VOLUNTEER and passwordHash set', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const volunteerItem = capturedPuts.find(
      (p) => p.PK === 'USER#user-demo-volunteer' && p.SK === 'PROFILE'
    )
    expect(volunteerItem?.Item.role).toBe('VOLUNTEER')
    expect(typeof volunteerItem?.Item.passwordHash).toBe('string')
    expect((volunteerItem?.Item.passwordHash as string).startsWith('$2b$')).toBe(true)
  })

  it('org admin user item has role ORG_ADMIN, orgId, and passwordHash set', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const adminItem = capturedPuts.find(
      (p) => p.PK === 'USER#user-demo-admin' && p.SK === 'PROFILE'
    )
    expect(adminItem?.Item.role).toBe('ORG_ADMIN')
    expect(adminItem?.Item.orgId).toBe('org-demo-runners')
    expect(typeof adminItem?.Item.passwordHash).toBe('string')
    expect((adminItem?.Item.passwordHash as string).startsWith('$2b$')).toBe(true)
  })

  it('seeded pending org has GSI1PK = ORG_STATUS#PENDING', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const pendingOrg = capturedPuts.find(
      (p) => p.PK === 'ORG#org-seed-pending' && p.SK === 'PROFILE'
    )
    expect(pendingOrg?.Item.GSI1PK).toBe('ORG_STATUS#PENDING')
    expect(pendingOrg?.Item.status).toBe('PENDING')
  })

  it('seeded rejected org has GSI1PK = ORG_STATUS#REJECTED', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const rejectedOrg = capturedPuts.find(
      (p) => p.PK === 'ORG#org-seed-rejected' && p.SK === 'PROFILE'
    )
    expect(rejectedOrg?.Item.GSI1PK).toBe('ORG_STATUS#REJECTED')
    expect(rejectedOrg?.Item.status).toBe('REJECTED')
    expect((rejectedOrg?.Item.rejectionReason as string)).toMatch(/The organisation details provided were incomplete/)
  })

  it('seeded approved org has GSI1PK = ORG_STATUS#APPROVED', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const approvedOrg = capturedPuts.find(
      (p) => p.PK === 'ORG#org-demo-runners' && p.SK === 'PROFILE'
    )
    expect(approvedOrg?.Item.GSI1PK).toBe('ORG_STATUS#APPROVED')
    expect(approvedOrg?.Item.status).toBe('APPROVED')
  })

  it('super admin user has role SUPER_ADMIN', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const superAdminItem = capturedPuts.find(
      (p) => p.PK === 'USER#user-seed-super-admin' && p.SK === 'PROFILE'
    )
    expect(superAdminItem?.Item.role).toBe('SUPER_ADMIN')
    expect(typeof superAdminItem?.Item.passwordHash).toBe('string')
    expect((superAdminItem?.Item.passwordHash as string).startsWith('$2b$')).toBe(true)
  })

  it('seedData inserts exactly 3 Event items (PK=EVENT#... SK=PROFILE)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const eventItems = capturedPuts.filter(
      (p) => p.PK.startsWith('EVENT#') && p.SK === 'PROFILE'
    )
    // event-demo-fun-run (PUBLISHED), event-demo-published (PUBLISHED), event-demo-draft (DRAFT)
    expect(eventItems).toHaveLength(3)
  })

  it('seedData inserts exactly 4 Role items (PK=EVENT#... SK=ROLE#...)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const roleItems = capturedPuts.filter(
      (p) => p.PK.startsWith('EVENT#') && p.SK.startsWith('ROLE#')
    )
    // 2 roles for event-demo-fun-run, 1 for event-demo-published, 1 for event-demo-draft
    expect(roleItems).toHaveLength(4)
  })

  it('seedData inserts exactly 1 PENDING Registration item (PK=REG#... SK=META)', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const regItems = capturedPuts.filter(
      (p) => p.PK.startsWith('REG#') && p.SK === 'META'
    )
    expect(regItems).toHaveLength(1)
    expect(regItems[0].Item.status).toBe('PENDING')
  })

  it('seeded fun-run event has status PUBLISHED', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const eventItem = capturedPuts.find(
      (p) => p.PK === 'EVENT#event-demo-fun-run' && p.SK === 'PROFILE'
    )
    expect(eventItem?.Item.status).toBe('PUBLISHED')
  })

  it('seeded published event for cancel tests has status PUBLISHED and a PENDING registration', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const eventItem = capturedPuts.find(
      (p) => p.PK === 'EVENT#event-demo-published' && p.SK === 'PROFILE'
    )
    expect(eventItem?.Item.status).toBe('PUBLISHED')

    const regItem = capturedPuts.find(
      (p) => p.PK === 'REG#reg-demo-pending' && p.SK === 'META'
    )
    expect(regItem?.Item.status).toBe('PENDING')
    expect(regItem?.Item.eventId).toBe('event-demo-published')
  })

  it('seeded draft event for publish tests has status DRAFT with one role', async () => {
    const { seedData } = await import('../seed')
    await seedData()

    const eventItem = capturedPuts.find(
      (p) => p.PK === 'EVENT#event-demo-draft' && p.SK === 'PROFILE'
    )
    expect(eventItem?.Item.status).toBe('DRAFT')

    const roleItem = capturedPuts.find(
      (p) => p.PK === 'EVENT#event-demo-draft' && p.SK.startsWith('ROLE#')
    )
    expect(roleItem).toBeDefined()
  })

  it('seedData is idempotent — calling once produces 24 items and does not throw on second call', async () => {
    const { seedData } = await import('../seed')
    await seedData()
    // 3 Orgs + 3 OrgEmail sentinels
    // + 5 Users (volunteer, approved-admin, pending-admin, rejected-admin, super-admin)
    // + 5 UserEmail sentinels
    // + 3 Events + 4 Roles + 1 Registration = 24 items
    expect(capturedPuts).toHaveLength(24)
    // Second call should not throw (conditional puts handle duplicates)
    await expect(seedData()).resolves.not.toThrow()
  })
})
