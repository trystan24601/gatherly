import { test, expect, request as apiRequest } from '@playwright/test'

const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3001'
const dynamoAdminURL = 'http://localhost:8001'
const mailhogURL = 'http://localhost:8025'

// TST-03: API contract test — /health endpoint
test.describe('API contract — GET /health', () => {
  test('returns status 200', async () => {
    const ctx = await apiRequest.newContext({ baseURL: apiURL })
    const response = await ctx.get('/health')
    expect(response.status()).toBe(200)
    await ctx.dispose()
  })

  test('response body contains status: "ok"', async () => {
    const ctx = await apiRequest.newContext({ baseURL: apiURL })
    const response = await ctx.get('/health')
    const body = await response.json() as { status: string; timestamp: string }
    expect(body.status).toBe('ok')
    await ctx.dispose()
  })

  test('response body contains a valid ISO 8601 timestamp', async () => {
    const ctx = await apiRequest.newContext({ baseURL: apiURL })
    const response = await ctx.get('/health')
    const body = await response.json() as { status: string; timestamp: string }
    expect(typeof body.timestamp).toBe('string')
    // A valid ISO 8601 string round-trips through Date
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
    await ctx.dispose()
  })
})

// TST-02: Local stack smoke test — infrastructure services
test.describe('Local stack smoke tests', () => {
  test('frontend responds with HTTP 200', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('DynamoDB Admin UI responds with HTTP 200', async () => {
    const ctx = await apiRequest.newContext({ baseURL: dynamoAdminURL })
    const response = await ctx.get('/')
    expect(response.status()).toBe(200)
    await ctx.dispose()
  })

  test('Mailhog UI responds with HTTP 200', async () => {
    const ctx = await apiRequest.newContext({ baseURL: mailhogURL })
    const response = await ctx.get('/')
    expect(response.status()).toBe(200)
    await ctx.dispose()
  })
})

// TST-04: Frontend load test
test.describe('Frontend loads correctly', () => {
  test('page loads without JavaScript console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Filter out known benign errors:
    // - favicon 404 (browser auto-request, no favicon in dev)
    // - 401 Unauthorized from GET /auth/me — expected when no session exists on page load
    const realErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('404') && !e.includes('401')
    )
    expect(realErrors).toHaveLength(0)
  })

  test('page does not show a visible error state', async ({ page }) => {
    await page.goto('/')
    // No elements with role="alert" should be visible
    const alertElement = page.getByRole('alert')
    await expect(alertElement).not.toBeVisible()
  })

  test('page contains the application heading "Gatherly"', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Gatherly/i)).toBeVisible()
  })

  test('page title contains "Gatherly"', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Gatherly/i)
  })
})
