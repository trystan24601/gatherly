import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// BE-TEST-04: bootstrap.ts tests

const mockSend = vi.fn()

vi.mock('@aws-sdk/client-dynamodb', () => {
  return {
    DynamoDBClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
    CreateTableCommand: vi.fn().mockImplementation((input) => ({ type: 'CreateTable', input })),
    DescribeTableCommand: vi.fn().mockImplementation((input) => ({ type: 'DescribeTable', input })),
    ResourceInUseException: class ResourceInUseException extends Error {
      name = 'ResourceInUseException'
      $metadata = {}
      constructor(args: { message: string; $metadata: Record<string, unknown> }) {
        super(args.message)
        this.name = 'ResourceInUseException'
        this.$metadata = args.$metadata
      }
    },
  }
})

describe('bootstrap.ts — bootstrapTable', () => {
  beforeEach(() => {
    process.env.DYNAMODB_TABLE_NAME = 'test-gatherly-bootstrap'
    process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000'
    process.env.AWS_REGION = 'eu-west-2'
    process.env.AWS_ACCESS_KEY_ID = 'local'
    process.env.AWS_SECRET_ACCESS_KEY = 'local'
    mockSend.mockReset()
    mockSend.mockResolvedValue({})
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('bootstrapTable creates a table named from DYNAMODB_TABLE_NAME env var', async () => {
    const { bootstrapTable } = await import('../bootstrap')
    await bootstrapTable()

    const { CreateTableCommand } = await import('@aws-sdk/client-dynamodb')
    expect(CreateTableCommand).toHaveBeenCalledWith(
      expect.objectContaining({ TableName: 'test-gatherly-bootstrap' })
    )
  })

  it('bootstrapTable creates composite PK hash key (string) and SK range key (string)', async () => {
    const { bootstrapTable } = await import('../bootstrap')
    await bootstrapTable()

    const { CreateTableCommand } = await import('@aws-sdk/client-dynamodb')
    expect(CreateTableCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        KeySchema: expect.arrayContaining([
          expect.objectContaining({ AttributeName: 'PK', KeyType: 'HASH' }),
          expect.objectContaining({ AttributeName: 'SK', KeyType: 'RANGE' }),
        ]),
        AttributeDefinitions: expect.arrayContaining([
          expect.objectContaining({ AttributeName: 'PK', AttributeType: 'S' }),
          expect.objectContaining({ AttributeName: 'SK', AttributeType: 'S' }),
        ]),
      })
    )
  })

  it('bootstrapTable creates all 6 GSIs: GSI1 through GSI6', async () => {
    const { bootstrapTable } = await import('../bootstrap')
    await bootstrapTable()

    const { CreateTableCommand } = await import('@aws-sdk/client-dynamodb')
    const callArg = vi.mocked(CreateTableCommand).mock.calls[0][0]

    const gsiNames = (callArg.GlobalSecondaryIndexes ?? []).map(
      (gsi) => gsi.IndexName ?? ''
    )
    expect(gsiNames).toContain('GSI1')
    expect(gsiNames).toContain('GSI2')
    expect(gsiNames).toContain('GSI3')
    expect(gsiNames).toContain('GSI4')
    expect(gsiNames).toContain('GSI5')
    expect(gsiNames).toContain('GSI6')
  })

  it('bootstrapTable is idempotent — calling twice does not throw', async () => {
    const { ResourceInUseException } = await import('@aws-sdk/client-dynamodb')

    // First call succeeds
    mockSend.mockResolvedValueOnce({})
    // Second call throws ResourceInUseException (table already exists)
    const err = new (ResourceInUseException as new (a: { message: string; $metadata: Record<string, unknown> }) => Error)({
      message: 'Table already exists',
      $metadata: {},
    })
    mockSend.mockRejectedValueOnce(err)

    const { bootstrapTable } = await import('../bootstrap')

    await expect(bootstrapTable()).resolves.not.toThrow()
    await expect(bootstrapTable()).resolves.not.toThrow()
  })
})
