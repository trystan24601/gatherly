import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3001'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on',
  },
  // Export API URL for use in tests
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/*.demo.ts',
      use: {
        browserName: 'chromium',
        baseURL,
      },
    },
    {
      name: 'demo',
      testMatch: '**/*.demo.ts',
      use: {
        browserName: 'chromium',
        baseURL,
        slowMo: 400,
        viewport: { width: 390, height: 844 },
        video: 'on',
        screenshot: 'off',
      },
    },
  ],
})

export { apiURL }
