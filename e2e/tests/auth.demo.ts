/**
 * Feature demo: Authentication — complete auth journey.
 *
 * This is a visual demonstration test, not a validation test.
 * It produces a screen recording of the full register → dashboard → logout → login
 * happy path on a mobile viewport (390×844) at deliberate pace.
 *
 * Run with:
 *   cd e2e && npx playwright test --project=demo tests/auth.demo.ts
 */

import { test } from '@playwright/test'

const frontendURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

const DEMO_NAME_FIRST = 'Demo'
const DEMO_NAME_LAST = 'Volunteer'
const DEMO_EMAIL = 'demo-volunteer@example.com'
const DEMO_PASSWORD = 'DemoPass123!'

test.describe('Authentication — feature demo', () => {
  test('complete auth journey', async ({ page }) => {
    test.slow()

    // -----------------------------------------------------------------------
    // Step 1: Register a new account
    // -----------------------------------------------------------------------
    await page.goto(`${frontendURL}/register`)

    await page.getByLabel(/first name/i).fill(DEMO_NAME_FIRST)
    await page.getByLabel(/last name/i).fill(DEMO_NAME_LAST)
    await page.getByLabel(/email/i).fill(DEMO_EMAIL)
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
    await page.getByRole('button', { name: /create account/i }).click()

    // Wait for redirect to /dashboard
    await page.waitForURL(/\/dashboard/)

    // Pause so the dashboard is visible on the recording
    await page.waitForTimeout(1000)

    // -----------------------------------------------------------------------
    // Step 2: Log out via API (no logout UI yet — dashboard is a stub)
    // -----------------------------------------------------------------------
    const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3001'
    await page.request.post(`${apiURL}/auth/logout`, {})
    await page.goto(`${frontendURL}/login`)

    // -----------------------------------------------------------------------
    // Step 3: Log back in with the same credentials
    // -----------------------------------------------------------------------
    await page.getByLabel(/email/i).fill(DEMO_EMAIL)
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for redirect to /dashboard
    await page.waitForURL(/\/dashboard/)

    // Pause so the dashboard is visible on the recording
    await page.waitForTimeout(1000)
  })
})
