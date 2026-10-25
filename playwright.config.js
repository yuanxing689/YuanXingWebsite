import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173'
const isCI = Boolean(process.env.CI)
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL || undefined
const browserProject = browserChannel === 'msedge' ? 'edge' : 'chromium'
const chromiumLaunchOptions = isCI && !browserChannel
  ? {
      args: [
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader'
      ]
    }
  : null
const browserUse = {
  ...devices['Desktop Chrome'],
  deviceScaleFactor: 1,
  ...(browserChannel ? { channel: browserChannel } : {}),
  ...(chromiumLaunchOptions
    ? { launchOptions: chromiumLaunchOptions }
    : {})
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  snapshotPathTemplate:
    '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  timeout: isCI ? 90_000 : 30_000,
  expect: { timeout: isCI ? 20_000 : 8_000 },
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: isCI ? 20_000 : 12_000,
    ...browserUse
  },
  projects: [
    {
      name: browserProject,
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
