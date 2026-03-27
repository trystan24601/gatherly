/**
 * Layer 3: End-to-End tests for Event Roles & Slots (PRD event-roles).
 *
 * TST-01: Add a role to a DRAFT event
 * TST-02: Add a slot to a role
 * TST-03: Edit a role
 * TST-04: Edit a slot
 * TST-05: Delete a slot (no registrations)
 * TST-06: Delete a role (no registrations)
 * TST-07: Publish guard — DRAFT event with role but no slots → button disabled
 * TST-08: Publish guard — role with slot → publish succeeds
 * TST-09: DRAFT-only guard — management controls hidden on PUBLISHED event
 * TST-10: API contract — POST /roles returns 409 for non-DRAFT event
 *
 * Prerequisites:
 *   docker compose up
 *   cd backend && npm run db:bootstrap && npm run db:seed
 *
 * Run with:
 *   cd e2e && npx playwright test tests/event-roles.test.ts
 *
 * Note: Tests use seed data from backend/infra/local/seed.ts.
 * Most tests create their own DRAFT events to avoid order dependencies.
 */

import { test, expect, request as apiRequest, type Page } from '@playwright/test'

const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3001'
const frontendURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

// --------------------------------------------------------------------------
// Seed credentials
// --------------------------------------------------------------------------

const ORG_ADMIN_EMAIL = 'admin@gatherlydemohq.com'
const ORG_ADMIN_PASSWORD = 'TestPassword123!'

// Seeded PUBLISHED event — used for DRAFT-only guard tests and API contract test
const SEEDED_PUBLISHED_EVENT_ID = 'event-demo-published'

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Log in as seeded org admin via the login page */
async function loginAsOrgAdmin(page: Page, path?: string) {
  await page.context().clearCookies()
  await page.goto(`${frontendURL}/org/login`)
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/email/i).fill(ORG_ADMIN_EMAIL)
  await page.getByLabel(/password/i).fill(ORG_ADMIN_PASSWORD)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/(org|organisation)\/dashboard/, { timeout: 15000 })
  if (path) {
    await page.goto(`${frontendURL}${path}`)
    await page.waitForLoadState('networkidle')
  }
}

/** Get session cookie from page context */
async function getSessionCookie(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies()
  return cookies.find((c) => c.name === 'sid')?.value
}

/** Create a fresh DRAFT event via API and return its eventId */
async function createFreshDraftEvent(sid: string): Promise<string> {
  const ctx = await apiRequest.newContext({ baseURL: apiURL })
  const future = new Date()
  future.setFullYear(future.getFullYear() + 2)
  const futureDate = future.toISOString().slice(0, 10)

  const res = await ctx.post('/organisation/events', {
    headers: { Cookie: `sid=${sid}` },
    data: {
      title: 'E2E Roles Test Event',
      eventTypeId: 'running',
      eventDate: futureDate,
      startTime: '09:00',
      endTime: '17:00',
      venueName: 'Test Park',
      venueAddress: '1 Park Lane',
      city: 'London',
      postcode: 'W1K 1AA',
    },
  })
  expect(res.status()).toBe(201)
  const body = await res.json() as { eventId: string }
  await ctx.dispose()
  return body.eventId
}

/** Create a role via API and return its roleId */
async function createRoleApi(
  sid: string,
  eventId: string,
  name: string
): Promise<string> {
  const ctx = await apiRequest.newContext({ baseURL: apiURL })
  const res = await ctx.post(`/organisation/events/${eventId}/roles`, {
    headers: { Cookie: `sid=${sid}` },
    data: { name },
  })
  expect(res.status()).toBe(201)
  const body = await res.json() as { roleId: string }
  await ctx.dispose()
  return body.roleId
}

/** Create a slot via API and return its slotId */
async function createSlotApi(
  sid: string,
  eventId: string,
  roleId: string,
  shiftStart: string,
  shiftEnd: string,
  headcount: number
): Promise<string> {
  const ctx = await apiRequest.newContext({ baseURL: apiURL })
  const res = await ctx.post(`/organisation/events/${eventId}/roles/${roleId}/slots`, {
    headers: { Cookie: `sid=${sid}` },
    data: { shiftStart, shiftEnd, headcount },
  })
  expect(res.status()).toBe(201)
  const body = await res.json() as { slotId: string }
  await ctx.dispose()
  return body.slotId
}

/** Get event detail via API */
async function getEventApi(
  sid: string,
  eventId: string
): Promise<Record<string, unknown>> {
  const ctx = await apiRequest.newContext({ baseURL: apiURL })
  const res = await ctx.get(`/organisation/events/${eventId}`, {
    headers: { Cookie: `sid=${sid}` },
  })
  const body = await res.json() as Record<string, unknown>
  await ctx.dispose()
  return body
}

// --------------------------------------------------------------------------
// TST-01: Add a role to a DRAFT event
// --------------------------------------------------------------------------

test.describe('TST-01: Add a role to a DRAFT event', () => {
  test('org admin adds a role via UI; role appears in the list with 0 slots', async ({ page }) => {
    await loginAsOrgAdmin(page)
    const sid = await getSessionCookie(page)
    const eventId = await createFreshDraftEvent(sid!)

    await page.goto(`${frontendURL}/organisation/events/${eventId}`)
    await page.waitForLoadState('networkidle')

    // Click "+ Add role"
    await page.getByRole('button', { name: /add role/i }).click()

    // Fill modal
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.getByLabel(/name/i).fill('Course Marshal')
    await page.getByLabel(/description/i).fill('Keep runners on the right path')
    await page.getByRole('button', { name: /save/i }).click()

    // Role should appear in the list
    await expect(page.getByText('Course Marshal')).toBeVisible({ timeout: 10000 })

    // Verify via API
    const event = await getEventApi(sid!, eventId)
    const roles = event.roles as Array<{ name: string; slots: unknown[] }>
    expect(roles.some((r) => r.name === 'Course Marshal')).toBe(true)
  })
})

// --------------------------------------------------------------------------
// TST-02: Add a slot to a role
// --------------------------------------------------------------------------

test.describe('TST-02: Add a slot to a role', () => {
  test('org admin adds a slot; slot appears nested under the role with correct details', async ({ page }) => {
    await loginAsOrgAdmin(page)
    const sid = await getSessionCookie(page)
    const eventId = await createFreshDraftEvent(sid!)
    await createRoleApi(sid!, eventId, 'Water Station')

    await page.goto(`${frontendURL}/organisation/events/${eventId}`)
    await page.waitForLoadState('networkidle')

    // Click "+ Add slot" on the role
    await page.getByRole('button', { name: /add slot/i }).click()

    // Fill slot modal
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.getByLabel(/shift start/i).fill('09:00')
    await page.getByLabel(/shift end/i).fill('13:00')
    await page.getByLabel(/headcount/i).fill('5')
    await page.getByLabel(/location/i).fill('Start line')
    await page.getByRole('button', { name: /save/i }).click()

    // Slot details should appear
    await expect(page.getByText(/09:00.+13:00/)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Start line')).toBeVisible()
  })
})

// --------------------------------------------------------------------------
// TST-03: Edit a role
// --------------------------------------------------------------------------

test.describe('TST-03: Edit a role', () => {
  test('org admin edits a role name; updated name appears in the list', async ({ page }) => {
    await loginAsOrgAdmin(page)
    const sid = await getSessionCookie(page)
    const eventId = await createFreshDraftEvent(sid!)
    await createRoleApi(sid!, eventId, 'Old Role Name')

    await page.goto(`${frontendURL}/organisation/events/${eventId}`)
    await page.waitForLoadState('networkidle')

    // Verify original name is visible
    await expect(page.getByText('Old Role Name')).toBeVisible({ timeout: 5000 })

    // Click "Edit role"
    await page.getByRole('button', { name: /edit role/i }).click()

    // Update name in modal
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    const nameInput = page.getByLabel(/name/i)
    await nameInput.clear()
    await nameInput.fill('Updated Role Name')
    await page.getByRole('button', { name: /save/i }).click()

    // Updated name should be visible
    await expect(page.getByText('Updated Role Name')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Old Role Name')).not.toBeVisible()
  })
})

// --------------------------------------------------------------------------
// TST-04: Edit a slot
// --------------------------------------------------------------------------

test.describe('TST-04: Edit a slot', () => {
  test('org admin edits a slot headcount; updated headcount is shown', async ({ page }) => {
    await loginAsOrgAdmin(page)
    const sid = await getSessionCookie(page)
    const eventId = await createFreshDraftEvent(sid!)
    const roleId = await createRoleApi(sid!, eventId, 'Medic')
    await createSlotApi(sid!, eventId, roleId, '09:00', '13:00', 5)

    await page.goto(`${frontendURL}/organisation/events/${eventId}`)
    await page.waitForLoadState('networkidle')

    // Verify original headcount (0/5 filled)
    await expect(page.getByText(/0.+5.+filled/)).toBeVisible({ timeout: 5000 })

    // Click "Edit slot"
    await page.getByRole('button', { name: /edit slot/i }).click()

    // Update headcount
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    const headcountInput = page.getByLabel(/headcount/i)
    await headcountInput.clear()
    await headcountInput.fill('10')
    await page.getByRole('button', { name: /save/i }).click()

    // Updated headcount should be shown
    await expect(page.getByText(/0.+10.+filled/)).toBeVisible({ timeout: 10000 })
  })
})

// --------------------------------------------------------------------------
// TST-05: Delete a slot (no registrations)
// --------------------------------------------------------------------------

test.describe('TST-05: Delete a slot', () => {
  test('org admin deletes a slot; slot is removed from the list', async ({ page }) => {
    await loginAsOrgAdmin(page)
    const sid = await getSessionCookie(page)
    const eventId = await createFreshDraftEvent(sid!)
    const roleId = await createRoleApi(sid!, eventId, 'Runner')
    await createSlotApi(sid!, eventId, roleId, '14:00', '17:00', 3)

    await page.goto(`${frontendURL}/organisation/events/${eventId}`)
    await page.waitForLoadState('networkidle')

    // Slot should be visible
    await expect(page.getByText(/14:00.+17:00/)).toBeVisible({ timeout: 5000 })

    // Delete the slot
    await page.getByRole('button', { name: /delete slot/i }).click()

    // Slot should no longer be visible
    await expect(page.getByText(/14:00.+17:00/)).not.toBeVisible({ timeout: 10000 })
  })
})

// --------------------------------------------------------------------------
// TST-06: Delete a role (no registrations)
// --------------------------------------------------------------------------

test.describe('TST-06: Delete a role', () => {
  test('org admin deletes a role with no registrations; role and its slots are removed', async ({ page }) => {
    await loginAsOrgAdmin(page)
    const sid = await getSessionCookie(page)
    const eventId = await createFreshDraftEvent(sid!)
    await createRoleApi(sid!, eventId, 'Steward')

    await page.goto(`${frontendURL}/organisation/events/${eventId}`)
    await page.waitForLoadState('networkidle')

    // Role should be visible
    await expect(page.getByText('Steward')).toBeVisible({ timeout: 5000 })

    // Delete the role
    await page.getByRole('button', { name: /delete role/i }).click()

    // Role should be removed
    await expect(page.getByText('Steward')).not.toBeVisible({ timeout: 10000 })
  })
})

// --------------------------------------------------------------------------
// TST-07: Publish guard — role with no slots → "Publish event" button disabled
// --------------------------------------------------------------------------

test.describe('TST-07: Publish guard — role with no slots', () => {
  test('"Publish event" button is disabled when a role exists but has no slots', async ({ page }) => {
    await loginAsOrgAdmin(page)
    const sid = await getSessionCookie(page)
    const eventId = await createFreshDraftEvent(sid!)
    await createRoleApi(sid!, eventId, 'Volunteer')

    await page.goto(`${frontendURL}/organisation/events/${eventId}`)
    await page.waitForLoadState('networkidle')

    // Role is shown but no slots
    await expect(page.getByText('Volunteer')).toBeVisible({ timeout: 5000 })

    // "Publish event" button should be disabled
    const publishBtn = page.getByRole('button', { name: /publish event/i })
    await expect(publishBtn).toBeVisible()
    await expect(publishBtn).toBeDisabled()
  })
})

// --------------------------------------------------------------------------
// TST-08: Publish guard — role with slot → publish succeeds
// --------------------------------------------------------------------------

test.describe('TST-08: Publish guard — role with slot, publish succeeds', () => {
  test('org admin adds slot then publishes; event transitions to PUBLISHED', async ({ page }) => {
    await loginAsOrgAdmin(page)
    const sid = await getSessionCookie(page)
    const eventId = await createFreshDraftEvent(sid!)
    const roleId = await createRoleApi(sid!, eventId, 'Helper')
    await createSlotApi(sid!, eventId, roleId, '10:00', '14:00', 4)

    await page.goto(`${frontendURL}/organisation/events/${eventId}`)
    await page.waitForLoadState('networkidle')

    // "Publish event" button should be enabled
    const publishBtn = page.getByRole('button', { name: /publish event/i })
    await expect(publishBtn).toBeVisible({ timeout: 5000 })
    await expect(publishBtn).not.toBeDisabled()

    // Click Publish
    await publishBtn.click()

    // Status should change to PUBLISHED
    await expect(page.getByText(/published/i).first()).toBeVisible({ timeout: 10000 })

    // Verify via API
    const event = await getEventApi(sid!, eventId)
    expect(event.status).toBe('PUBLISHED')
  })
})

// --------------------------------------------------------------------------
// TST-09: DRAFT-only guard — management controls hidden on PUBLISHED event
// --------------------------------------------------------------------------

test.describe('TST-09: DRAFT-only guard — PUBLISHED event is read-only', () => {
  test('navigates to published event; role management controls are not rendered', async ({ page }) => {
    // Use a PUBLISHED event from seed — after possible mutation from other tests,
    // we navigate to an event that may have been published or use the seeded fun-run
    // which starts as PUBLISHED. Use the seeded PUBLISHED event directly.
    // Note: SEEDED_PUBLISHED_EVENT_ID may be CANCELLED after event-lifecycle tests.
    // Create and publish a fresh event for this test.
    await loginAsOrgAdmin(page)
    const sid = await getSessionCookie(page)
    const eventId = await createFreshDraftEvent(sid!)
    const roleId = await createRoleApi(sid!, eventId, 'Marshal')
    await createSlotApi(sid!, eventId, roleId, '09:00', '12:00', 5)

    // Publish via API
    const ctx = await apiRequest.newContext({ baseURL: apiURL })
    const pubRes = await ctx.post(`/organisation/events/${eventId}/publish`, {
      headers: { Cookie: `sid=${sid}` },
    })
    expect(pubRes.status()).toBe(200)
    await ctx.dispose()

    await page.goto(`${frontendURL}/organisation/events/${eventId}`)
    await page.waitForLoadState('networkidle')

    // Verify PUBLISHED status
    await expect(page.getByText(/published/i).first()).toBeVisible({ timeout: 5000 })

    // Management controls should not be rendered
    await expect(page.getByRole('button', { name: /add role/i })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /add slot/i })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /edit role/i })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /delete role/i })).not.toBeVisible()
  })
})

// --------------------------------------------------------------------------
// TST-10: API contract — POST /roles returns 409 for non-DRAFT event
// --------------------------------------------------------------------------

test.describe('TST-10: API contract — POST /roles on non-DRAFT event', () => {
  test('directly calls API; POST /organisation/events/:id/roles returns 409 for PUBLISHED event', async ({ page }) => {
    // The seeded published event has status PUBLISHED (before any lifecycle tests run)
    // We create a fresh published event to avoid test order dependency.
    await loginAsOrgAdmin(page)
    const sid = await getSessionCookie(page)

    // Create draft, add role+slot, publish it
    const eventId = await createFreshDraftEvent(sid!)
    const roleId = await createRoleApi(sid!, eventId, 'Check Volunteer')
    await createSlotApi(sid!, eventId, roleId, '09:00', '11:00', 2)

    const pubCtx = await apiRequest.newContext({ baseURL: apiURL })
    const pubRes = await pubCtx.post(`/organisation/events/${eventId}/publish`, {
      headers: { Cookie: `sid=${sid}` },
    })
    expect(pubRes.status()).toBe(200)
    await pubCtx.dispose()

    // Now try to add a role to the PUBLISHED event
    const ctx = await apiRequest.newContext({ baseURL: apiURL })
    const res = await ctx.post(`/organisation/events/${eventId}/roles`, {
      headers: { Cookie: `sid=${sid}` },
      data: { name: 'Another Role' },
    })

    expect(res.status()).toBe(409)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/draft/i)

    await ctx.dispose()
  })
})
