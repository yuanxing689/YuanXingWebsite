import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173'
const isCI = Boolean(process.env.CI)
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL || undefined
const browserUse = {
  ...devices['Desktop Chrome'],
  ...(browserChannel ? { channel: browserChannel } : {})
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
    actionTimeout: 12_000,
    ...browserUse
  },
  projects: [
    {
      name: 'chromium',
      use: browserUse
    }
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      SITE_BASE: '/',
      SITE_ORIGIN: baseURL
    }
  }
})
