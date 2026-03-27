import { putItem } from '../../src/lib/dynamodb'

const TABLE_NAME = () => {
  const name = process.env.DYNAMODB_TABLE_NAME
  if (!name) throw new Error('DYNAMODB_TABLE_NAME env var is required')
  return name
}

const ORG_ID = 'org-demo-runners'
const PENDING_ORG_ID = 'org-seed-pending'
const REJECTED_ORG_ID = 'org-seed-rejected'
const USER_ID = 'user-demo-volunteer'
const ADMIN_USER_ID = 'user-demo-admin'
const PENDING_ORG_ADMIN_USER_ID = 'user-seed-pending-admin'
const REJECTED_ORG_ADMIN_USER_ID = 'user-seed-rejected-admin'
const SUPER_ADMIN_USER_ID = 'user-seed-super-admin'
const ORG_EMAIL = 'hello@gatherly-demo.com'
const PENDING_ORG_EMAIL = 'admin@pending-org.com'
const REJECTED_ORG_EMAIL = 'admin@rejected-org.com'
const EVENT_ID = 'event-demo-fun-run'
const ROLE_ID_1 = 'role-marshal'
const ROLE_ID_2 = 'role-water-station'

// Pre-computed bcrypt hash (cost 12) for "TestPassword123!"
// Generated with: bcrypt.hashSync('TestPassword123!', 12)
const TEST_PASSWORD_HASH = '$2b$12$/vfUcNqaYnJ66Je3xw2Y9uwa.zN68SjsSioRPIo7v6OadjCpE./2q'

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

  // 1. Approved Organisation item — ORG# / PROFILE
  await upsert(
    tableName,
    {
      PK: `ORG#${ORG_ID}`,
      SK: 'PROFILE',
      orgId: ORG_ID,
      name: 'Gatherly Demo Runners',
      status: 'APPROVED',
      contactEmail: ORG_EMAIL,
      submittedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      GSI1PK: 'ORG_STATUS#APPROVED',
      GSI1SK: `2026-01-01T00:00:00.000Z#${ORG_ID}`,
    },
    'attribute_not_exists(PK)'
  )

  // 2. Approved OrgEmail sentinel — ORGEMAIL# / LOCK
  await upsert(
    tableName,
    {
      PK: `ORGEMAIL#${ORG_EMAIL}`,
      SK: 'LOCK',
      orgId: ORG_ID,
    },
    'attribute_not_exists(PK)'
  )

  // 3. Pending Organisation item — ORG# / PROFILE
  await upsert(
    tableName,
    {
      PK: `ORG#${PENDING_ORG_ID}`,
      SK: 'PROFILE',
      orgId: PENDING_ORG_ID,
      name: 'Pending Community Group',
      orgType: 'COMMUNITY',
      description: 'A community group for testing the organisation registration flow and approval queue.',
      contactEmail: PENDING_ORG_EMAIL,
      contactPhone: '+447700900001',
      status: 'PENDING',
      submittedAt: '2026-02-01T00:00:00.000Z',
      createdAt: '2026-02-01T00:00:00.000Z',
      GSI1PK: 'ORG_STATUS#PENDING',
      GSI1SK: `2026-02-01T00:00:00.000Z#${PENDING_ORG_ID}`,
    },
    'attribute_not_exists(PK)'
  )

  // 4. Pending OrgEmail sentinel — ORGEMAIL# / LOCK
  await upsert(
    tableName,
    {
      PK: `ORGEMAIL#${PENDING_ORG_EMAIL}`,
      SK: 'LOCK',
      orgId: PENDING_ORG_ID,
    },
    'attribute_not_exists(PK)'
  )

  // 5. Rejected Organisation item — ORG# / PROFILE
  await upsert(
    tableName,
    {
      PK: `ORG#${REJECTED_ORG_ID}`,
      SK: 'PROFILE',
      orgId: REJECTED_ORG_ID,
      name: 'Rejected Demo Org',
      orgType: 'SPORTS_CLUB',
      description: 'A sports club whose registration was rejected.',
      contactEmail: REJECTED_ORG_EMAIL,
      contactPhone: '+447700900002',
      status: 'REJECTED',
      submittedAt: '2026-01-15T00:00:00.000Z',
      rejectionReason: 'The organisation details provided were incomplete and could not be verified.',
      createdAt: '2026-01-15T00:00:00.000Z',
      GSI1PK: 'ORG_STATUS#REJECTED',
      GSI1SK: `2026-01-15T00:00:00.000Z#${REJECTED_ORG_ID}`,
    },
    'attribute_not_exists(PK)'
  )

  // 6. Rejected OrgEmail sentinel — ORGEMAIL# / LOCK
  await upsert(
    tableName,
    {
      PK: `ORGEMAIL#${REJECTED_ORG_EMAIL}`,
      SK: 'LOCK',
      orgId: REJECTED_ORG_ID,
    },
    'attribute_not_exists(PK)'
  )

  // 7. Volunteer user item — USER# / PROFILE
  await upsert(
    tableName,
    {
      PK: `USER#${USER_ID}`,
      SK: 'PROFILE',
      userId: USER_ID,
      email: 'volunteer@example.com',
      firstName: 'Demo',
      lastName: 'Volunteer',
      role: 'VOLUNTEER',
      passwordHash: TEST_PASSWORD_HASH,
      createdAt: '2026-01-01T00:00:00.000Z',
      GSI2PK: `ORG#${ORG_ID}`,
      GSI2SK: `USER#${USER_ID}`,
    },
    'attribute_not_exists(PK)'
  )

  // 7b. Volunteer USEREMAIL sentinel — USEREMAIL# / LOCK
  await upsert(
    tableName,
    {
      PK: 'USEREMAIL#volunteer@example.com',
      SK: 'LOCK',
      userId: USER_ID,
    },
    'attribute_not_exists(PK)'
  )

  // 8. Approved Org Admin user item — USER# / PROFILE
  await upsert(
    tableName,
    {
      PK: `USER#${ADMIN_USER_ID}`,
      SK: 'PROFILE',
      userId: ADMIN_USER_ID,
      email: 'admin@gatherlydemohq.com',
      firstName: 'Demo',
      lastName: 'Admin',
      role: 'ORG_ADMIN',
      orgId: ORG_ID,
      passwordHash: TEST_PASSWORD_HASH,
      createdAt: '2026-01-01T00:00:00.000Z',
      GSI2PK: `ORG#${ORG_ID}`,
      GSI2SK: `USER#${ADMIN_USER_ID}`,
    },
    'attribute_not_exists(PK)'
  )

  // 8b. Approved Org Admin USEREMAIL sentinel — USEREMAIL# / LOCK
  await upsert(
    tableName,
    {
      PK: 'USEREMAIL#admin@gatherlydemohq.com',
      SK: 'LOCK',
      userId: ADMIN_USER_ID,
    },
    'attribute_not_exists(PK)'
  )

  // 9. Pending Org Admin user item — USER# / PROFILE
  await upsert(
    tableName,
    {
      PK: `USER#${PENDING_ORG_ADMIN_USER_ID}`,
      SK: 'PROFILE',
      userId: PENDING_ORG_ADMIN_USER_ID,
      email: PENDING_ORG_EMAIL,
      firstName: 'Pending',
      lastName: 'OrgAdmin',
      role: 'ORG_ADMIN',
      orgId: PENDING_ORG_ID,
      passwordHash: TEST_PASSWORD_HASH,
      createdAt: '2026-02-01T00:00:00.000Z',
      GSI2PK: `ORG#${PENDING_ORG_ID}`,
      GSI2SK: `USER#${PENDING_ORG_ADMIN_USER_ID}`,
    },
    'attribute_not_exists(PK)'
  )

  // 9b. Pending Org Admin USEREMAIL sentinel — USEREMAIL# / LOCK
  await upsert(
    tableName,
    {
      PK: `USEREMAIL#${PENDING_ORG_EMAIL}`,
      SK: 'LOCK',
      userId: PENDING_ORG_ADMIN_USER_ID,
    },
    'attribute_not_exists(PK)'
  )

  // 10. Rejected Org Admin user item — USER# / PROFILE
  await upsert(
    tableName,
    {
      PK: `USER#${REJECTED_ORG_ADMIN_USER_ID}`,
      SK: 'PROFILE',
      userId: REJECTED_ORG_ADMIN_USER_ID,
      email: REJECTED_ORG_EMAIL,
      firstName: 'Rejected',
      lastName: 'OrgAdmin',
      role: 'ORG_ADMIN',
      orgId: REJECTED_ORG_ID,
      passwordHash: TEST_PASSWORD_HASH,
      createdAt: '2026-01-15T00:00:00.000Z',
      GSI2PK: `ORG#${REJECTED_ORG_ID}`,
      GSI2SK: `USER#${REJECTED_ORG_ADMIN_USER_ID}`,
    },
    'attribute_not_exists(PK)'
  )

  // 10b. Rejected Org Admin USEREMAIL sentinel — USEREMAIL# / LOCK
  await upsert(
    tableName,
    {
      PK: `USEREMAIL#${REJECTED_ORG_EMAIL}`,
      SK: 'LOCK',
      userId: REJECTED_ORG_ADMIN_USER_ID,
    },
    'attribute_not_exists(PK)'
  )

  // 11. Super Admin user item — USER# / PROFILE
  await upsert(
    tableName,
    {
      PK: `USER#${SUPER_ADMIN_USER_ID}`,
      SK: 'PROFILE',
      userId: SUPER_ADMIN_USER_ID,
      email: 'superadmin@gatherlywork.com',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      passwordHash: TEST_PASSWORD_HASH,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    'attribute_not_exists(PK)'
  )

  // 11b. Super Admin USEREMAIL sentinel — USEREMAIL# / LOCK
  await upsert(
    tableName,
    {
      PK: 'USEREMAIL#superadmin@gatherlywork.com',
      SK: 'LOCK',
      userId: SUPER_ADMIN_USER_ID,
    },
    'attribute_not_exists(PK)'
  )

  // 12. Event item — EVENT# / PROFILE
  await upsert(
    tableName,
    {
      PK: `EVENT#${EVENT_ID}`,
      SK: 'PROFILE',
      eventId: EVENT_ID,
      orgId: ORG_ID,
      title: 'Demo Fun Run 2026',
      eventTypeId: 'running',
      eventDate: '2026-06-15',
      startTime: '09:00',
      endTime: '12:00',
      venueName: 'Brockwell Park',
      venueAddress: 'Brockwell Park, Herne Hill',
      city: 'London',
      postcode: 'SE24 9BJ',
      status: 'PUBLISHED',
      createdAt: '2026-01-01T00:00:00.000Z',
      GSI3PK: 'EVENT_STATUS#PUBLISHED',
      GSI3SK: `2026-06-15#${EVENT_ID}`,
      GSI4PK: `ORG#${ORG_ID}`,
      GSI4SK: `2026-06-15#${EVENT_ID}`,
    },
    'attribute_not_exists(PK)'
  )

  // 13. Role 1 — EVENT# / ROLE#
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

  // 14. Role 2 — EVENT# / ROLE#
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
