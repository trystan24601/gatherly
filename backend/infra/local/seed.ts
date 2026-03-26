import { putItem } from '../../src/lib/dynamodb'

const TABLE_NAME = () => {
  const name = process.env.DYNAMODB_TABLE_NAME
  if (!name) throw new Error('DYNAMODB_TABLE_NAME env var is required')
  return name
}

const ORG_ID = 'org-demo-runners'
const USER_ID = 'user-demo-volunteer'
const ORG_EMAIL = 'hello@gatherly-demo.com'
const EVENT_ID = 'event-demo-fun-run'
const ROLE_ID_1 = 'role-marshal'
const ROLE_ID_2 = 'role-water-station'

/** Put an item idempotently — silently ignore ConditionalCheckFailedException */
async function upsert(
  tableName: string,
  item: Record<string, unknown>,
  conditionExpression: string
): Promise<void> {
  try {
    await putItem(tableName, item, conditionExpression)
  } catch (err) {
    // Item already exists — this is the desired idempotent behaviour
    if (
      err instanceof Error &&
      (err.name === 'ConditionalCheckFailedException' ||
        err.constructor.name === 'ConditionalCheckFailedException')
    ) {
      return
    }
    throw err
  }
}

export async function seedData(): Promise<void> {
  const tableName = TABLE_NAME()

  // 1. Organisation item — ORG# / PROFILE
  await upsert(
    tableName,
    {
      PK: `ORG#${ORG_ID}`,
      SK: 'PROFILE',
      orgId: ORG_ID,
      name: 'Gatherly Demo Runners',
      status: 'APPROVED',
      contactEmail: ORG_EMAIL,
      createdAt: '2026-01-01T00:00:00.000Z',
      GSI1PK: 'ORG_APPROVAL',
      GSI1SK: `APPROVED#2026-01-01T00:00:00.000Z`,
    },
    'attribute_not_exists(PK)'
  )

  // 2. OrgEmail sentinel — ORGEMAIL# / LOCK
  await upsert(
    tableName,
    {
      PK: `ORGEMAIL#${ORG_EMAIL}`,
      SK: 'LOCK',
      orgId: ORG_ID,
    },
    'attribute_not_exists(PK)'
  )

  // 3. User item — USER# / PROFILE
  await upsert(
    tableName,
    {
      PK: `USER#${USER_ID}`,
      SK: 'PROFILE',
      userId: USER_ID,
      email: 'volunteer@example.com',
      firstName: 'Demo',
      lastName: 'Volunteer',
      createdAt: '2026-01-01T00:00:00.000Z',
      GSI2PK: `ORG#${ORG_ID}`,
      GSI2SK: `USER#${USER_ID}`,
    },
    'attribute_not_exists(PK)'
  )

  // 4. Event item — EVENT# / PROFILE
  await upsert(
    tableName,
    {
      PK: `EVENT#${EVENT_ID}`,
      SK: 'PROFILE',
      eventId: EVENT_ID,
      orgId: ORG_ID,
      title: 'Demo Fun Run 2026',
      status: 'PUBLISHED',
      date: '2026-06-15',
      createdAt: '2026-01-01T00:00:00.000Z',
      GSI3PK: 'EVENT_STATUS',
      GSI3SK: `PUBLISHED#2026-06-15`,
    },
    'attribute_not_exists(PK)'
  )

  // 5. Role 1 — EVENT# / ROLE#
  await upsert(
    tableName,
    {
      PK: `EVENT#${EVENT_ID}`,
      SK: `ROLE#${ROLE_ID_1}`,
      roleId: ROLE_ID_1,
      eventId: EVENT_ID,
      name: 'Marshal',
      capacity: 10,
      filledCount: 0,
    },
    'attribute_not_exists(SK)'
  )

  // 6. Role 2 — EVENT# / ROLE#
  await upsert(
    tableName,
    {
      PK: `EVENT#${EVENT_ID}`,
      SK: `ROLE#${ROLE_ID_2}`,
      roleId: ROLE_ID_2,
      eventId: EVENT_ID,
      name: 'Water Station',
      capacity: 5,
      filledCount: 0,
    },
    'attribute_not_exists(SK)'
  )

  console.log('Seed data inserted successfully.')
}

// Run when called directly
if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
