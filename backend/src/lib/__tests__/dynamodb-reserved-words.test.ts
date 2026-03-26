import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// BE-TEST-03: updateItem reserved-word handling
// vi.mock is hoisted — no top-level variable references allowed in factory

interface UpdateCommandInput {
  TableName?: string
  Key?: Record<string, unknown>
  UpdateExpression?: string
  ExpressionAttributeValues?: Record<string, unknown>
  ExpressionAttributeNames?: Record<string, string>
}

const updateCalls: UpdateCommandInput[] = []

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = vi.fn().mockImplementation(
    async (command: { type: string; input: UpdateCommandInput }) => {
      if (command.type === 'UpdateItem') {
        updateCalls.push(command.input)
      }
      return {}
    }
  )

  return {
    DynamoDBDocumentClient: {
      from: vi.fn().mockReturnValue({ send: mockSend }),
    },
    UpdateCommand: vi.fn().mockImplementation((input: UpdateCommandInput) => ({
      type: 'UpdateItem',
      input,
    })),
    GetCommand: vi.fn().mockImplementation((input) => ({ type: 'GetItem', input })),
    PutCommand: vi.fn().mockImplementation((input) => ({ type: 'PutItem', input })),
    DeleteCommand: vi.fn().mockImplementation((input) => ({ type: 'DeleteItem', input })),
    QueryCommand: vi.fn().mockImplementation((input) => ({ type: 'QueryItem', input })),
  }
})

describe('updateItem reserved-word handling', () => {
  beforeEach(() => {
    process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000'
    process.env.AWS_REGION = 'eu-west-2'
    process.env.AWS_ACCESS_KEY_ID = 'local'
    process.env.AWS_SECRET_ACCESS_KEY = 'local'
    updateCalls.length = 0
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('updateItem merges expressionAttributeNames into UpdateCommand when provided as 5th arg', async () => {
    const { updateItem } = await import('../dynamodb')

    const expressionAttributeNames = { '#s': 'status', '#n': 'name' }
    await updateItem(
      'test-table',
      { PK: 'USER#123', SK: 'PROFILE' },
      'SET #s = :s, #n = :n',
      { ':s': 'ACTIVE', ':n': 'Alice' },
      expressionAttributeNames
    )

    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].ExpressionAttributeNames).toEqual(expressionAttributeNames)
  })

  it('updateItem works without expressionAttributeNames (4-arg form) — no ExpressionAttributeNames key', async () => {
    const { updateItem } = await import('../dynamodb')

    await updateItem(
      'test-table',
      { PK: 'USER#123', SK: 'PROFILE' },
      'SET #v = :v',
      { ':v': 'value' }
      // no 5th arg
    )

    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].ExpressionAttributeNames).toBeUndefined()
  })

  it('updateItem aliases status, name, type via expressionAttributeNames when passed', async () => {
    const { updateItem } = await import('../dynamodb')

    const expressionAttributeNames = {
      '#status': 'status',
      '#name': 'name',
      '#type': 'type',
    }

    await expect(
      updateItem(
        'test-table',
        { PK: 'ORG#456', SK: 'PROFILE' },
        'SET #status = :s, #name = :n, #type = :t',
        { ':s': 'APPROVED', ':n': 'Org Name', ':t': 'SPORTS' },
        expressionAttributeNames
      )
    ).resolves.not.toThrow()

    expect(updateCalls[0].ExpressionAttributeNames).toEqual(expressionAttributeNames)
  })
})
