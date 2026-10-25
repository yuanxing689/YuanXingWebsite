import { test, expect } from '@playwright/test'
import {
  GAME_CARD,
  NAVIGATION,
  installViewTransitionCounter,
  isSectionAtConfiguredScrollTarget,
  navigateHomeSection,
  openHome,
  triggerBrowserBack,
  waitForGameDetail,
  waitForHomeReady,
  waitForNavigationToSettle
} from './helpers/site.js'

const SNAPSHOT_KEY = 'yuanxing:home-return'

async function enterGameAt(page, index) {
  const card = page.locator(GAME_CARD).nth(index)
  const title = (await card.locator('.game-card__name').innerText()).trim()
  const href = await card.getAttribute('href')
  await card.click({ force: true })
  await waitForGameDetail(page)
  await waitForNavigationToSettle(page)
  return {
    title,
    path: new URL(href, page.url()).pathname.replace(/\/+$/, '') + '/'
  }
}

async function expectGamesDefaultPosition(page) {
  await expect(page).toHaveURL(/#games$/)
  await expect(
    page.locator(`${NAVIGATION} a[data-section-link="games"]`)
  ).toHaveAttribute('aria-current', 'location')
  await expect.poll(
    () => isSectionAtConfiguredScrollTarget(page, 'games')
  ).toBe(true)
}

test('首页返回快照缺失时直接恢复默认游戏目录', async ({ page }) => {
  await installViewTransitionCounter(page)
  await openHome(page)
  await navigateHomeSection(page, 'games')
  await enterGameAt(page, 1)
  await page.evaluate((key) => sessionStorage.removeItem(key), SNAPSHOT_KEY)

  const before = await page.evaluate(() => ({
    historyLength: history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0
  }))
  await triggerBrowserBack(page)
  await waitForHomeReady(page)
  await waitForNavigationToSettle(page)
  await expectGamesDefaultPosition(page)

  const after = await page.evaluate(() => ({
    historyLength: history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0,
    bridgeRequestCount:
      window.__yuanxingHistoryBridgeDebug?.getSnapshot?.().requestCount ?? 0
  }))
  expect(after.historyLength).toBe(before.historyLength)
  expect(after.transitionCount).toBe(before.transitionCount)
  expect(after.bridgeRequestCount).toBe(0)
  await expect(page.locator(`${GAME_CARD}[aria-current="true"]`)).toBeVisible()
})

test('首页返回快照损坏时清除数据并回到默认位置', async ({ page }) => {
  await installViewTransitionCounter(page)
  await openHome(page)
  await navigateHomeSection(page, 'games')
  await enterGameAt(page, 1)
  await page.evaluate((key) => sessionStorage.setItem(key, '{'), SNAPSHOT_KEY)

  await triggerBrowserBack(page)
  await waitForHomeReady(page)
  await waitForNavigationToSettle(page)
  await expectGamesDefaultPosition(page)

  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), SNAPSHOT_KEY)
  ).toBeNull()
})

test('快照卡片失效时恢复首卡且不会无限等待', async ({ page }) => {
  await installViewTransitionCounter(page)
  await openHome(page)
  await navigateHomeSection(page, 'games')
  const firstTitle = (
    await page.locator(GAME_CARD).first().locator('.game-card__name').innerText()
  ).trim()
  const entered = await enterGameAt(page, 1)

  await page.evaluate((key) => {
    const snapshot = JSON.parse(sessionStorage.getItem(key))
    snapshot.cardKey = '/games/missing-card/'
    sessionStorage.setItem(key, JSON.stringify(snapshot))
  }, SNAPSHOT_KEY)

  const before = await page.evaluate(() => ({
    historyLength: history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0
  }))
  await triggerBrowserBack(page)
  await waitForHomeReady(page)
  await waitForNavigationToSettle(page)
  await expectGamesDefaultPosition(page)

  const after = await page.evaluate((key) => ({
    historyLength: history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0,
    bridge: window.__yuanxingHistoryBridgeDebug?.getSnapshot?.() ?? null,
    snapshot: JSON.parse(sessionStorage.getItem(key))
  }), SNAPSHOT_KEY)

  expect(after.historyLength).toBe(before.historyLength)
  expect(after.transitionCount - before.transitionCount).toBe(1)
  expect(after.bridge).toMatchObject({
    requestCount: 1,
    transitionCount: 1,
    fallbackCount: 0,
    lastStatus: 'completed'
  })
  expect(after.snapshot.cardKey).not.toBe('/games/missing-card/')
  await expect(
    page.locator(`${GAME_CARD}[aria-current="true"] .game-card__name`)
  ).toHaveText(firstTitle)
  expect(entered.title).not.toBe(firstTitle)
})
