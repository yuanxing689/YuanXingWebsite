import { test, expect } from '@playwright/test'
import {
  GAME_CARD,
  navigateHomeSection,
  openHome,
  triggerBrowserBack,
  waitForGameDetail,
  waitForHomeReady,
  waitForNavigationToSettle
} from './helpers/site.js'

test('首页、游戏进入与浏览器后退没有未捕获错误', async ({ page }) => {
  const issues = []
  page.on('pageerror', (error) => {
    issues.push(`pageerror: ${error.stack || error.message}`)
  })
  page.on('console', (message) => {
    if (message.type() === 'error') {
      issues.push(`console.error: ${message.text()}`)
    }
  })

  await openHome(page)
  await navigateHomeSection(page, 'games')
  await page.locator(GAME_CARD).first().click({ force: true })
  await waitForGameDetail(page)
  await waitForNavigationToSettle(page)
  await triggerBrowserBack(page)
  await waitForHomeReady(page)
  await waitForNavigationToSettle(page)
  await navigateHomeSection(page, 'links')

  expect(issues).toEqual([])
})
