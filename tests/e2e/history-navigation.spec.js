import { test, expect } from '@playwright/test'
import {
  GAME_CARD,
  GAME_DETAIL,
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

async function enterFirstGame(page) {
  const card = page.locator(GAME_CARD).first()
  const title = (await card.locator('.game-card__name').innerText()).trim()
  await card.click({ force: true })
  await waitForGameDetail(page)
  await waitForNavigationToSettle(page)
  return title
}

async function expectHomeSection(page, sectionId) {
  const link = page.locator(`${NAVIGATION} a[data-section-link="${sectionId}"]`)
  await expect(page).toHaveURL(new RegExp(`#${sectionId}$`))
  await expect(link).toHaveAttribute('aria-current', 'location')
  await expect.poll(
    () => isSectionAtConfiguredScrollTarget(page, sectionId)
  ).toBe(true)
}

test('浏览器后退只做一次同 URL 桥接并保持历史顺序', async ({ page }) => {
  await installViewTransitionCounter(page)
  await openHome(page)
  await navigateHomeSection(page, 'games')
  await enterFirstGame(page)

  await page.evaluate(() => {
    window.__historyBridgeDocumentId = crypto.randomUUID()
  })
  const before = await page.evaluate(() => ({
    historyLength: window.history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0
  }))

  await triggerBrowserBack(page)
  await waitForHomeReady(page)
  await waitForNavigationToSettle(page)
  await expectHomeSection(page, 'games')
  await expect.poll(() => page.evaluate(
    () => window.__yuanxingHistoryBridgeDebug?.getSnapshot?.().lastStatus
  )).toBe('completed')

  const after = await page.evaluate(() => ({
    historyLength: window.history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0,
    sameDocument: Boolean(window.__historyBridgeDocumentId),
    navigationEntries: performance.getEntriesByType('navigation').length,
    bridgeDebug: window.__yuanxingHistoryBridgeDebug?.getSnapshot?.() ?? null,
    adapterDebug: window.__yuanxingRouterAdapterDebug?.getSnapshot?.() ?? null
  }))

  expect(after.historyLength).toBe(before.historyLength)
  expect(
    after.transitionCount - before.transitionCount,
    JSON.stringify({ before, after })
  ).toBe(1)
  expect(after.bridgeDebug).toMatchObject({
    requestCount: 1,
    transitionCount: 1,
    fallbackCount: 0,
    lastStatus: 'completed',
    context: {
      source: 'history-transition-bridge',
      phase: 'completed',
      bridgeCount: 1,
      invalidated: false
    }
  })
  expect(after.sameDocument).toBe(true)
  expect(after.navigationEntries).toBe(1)
  await expect(page.locator(GAME_DETAIL)).toHaveCount(0)
})

test('连续后退只让最新事务恢复且仅执行一次桥接', async ({ page }) => {
  await installViewTransitionCounter(page)
  await openHome(page)
  await navigateHomeSection(page, 'about')
  await navigateHomeSection(page, 'games')
  await enterFirstGame(page)

  const before = await page.evaluate(() => ({
    historyLength: window.history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0
  }))

  await page.evaluate(() => {
    window.history.back()
    window.setTimeout(() => window.history.back(), 70)
  })

  await expect(page.locator('main.home-page')).toBeVisible()
  await waitForHomeReady(page)
  await expectHomeSection(page, 'about')
  await waitForNavigationToSettle(page)
  await expect.poll(() => page.evaluate(
    () => window.__yuanxingHistoryBridgeDebug?.getSnapshot?.().lastStatus
  )).toBe('completed')

  const after = await page.evaluate(() => ({
    historyLength: window.history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0,
    bridgeDebug: window.__yuanxingHistoryBridgeDebug?.getSnapshot?.() ?? null
  }))
  expect(after.historyLength).toBe(before.historyLength)
  expect(after.transitionCount - before.transitionCount).toBe(1)
  expect(after.bridgeDebug).toMatchObject({
    requestCount: 2,
    transitionCount: 1,
    fallbackCount: 0,
    lastStatus: 'completed',
    context: {
      source: 'history-transition-bridge',
      bridgeCount: 1,
      invalidated: false
    }
  })
  await expect.poll(() => page.evaluate(() => ({
    transitioning:
      document.documentElement.classList.contains('game-route-transitioning') ||
      document.documentElement.classList.contains('route-fallback-leaving'),
    routeLeaving: Boolean(document.querySelector('.site-shell--route-leaving'))
  }))).toEqual({
    transitioning: false,
    routeLeaving: false
  })
})

test('普通首页前进后退不经过共享元素桥接', async ({ page }) => {
  await installViewTransitionCounter(page)
  await openHome(page)
  await navigateHomeSection(page, 'about')
  await navigateHomeSection(page, 'games')

  const before = await page.evaluate(() => ({
    historyLength: window.history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0
  }))

  await triggerBrowserBack(page)
  await expectHomeSection(page, 'about')
  await waitForNavigationToSettle(page)
  await page.evaluate(() => window.history.forward())
  await expectHomeSection(page, 'games')
  await waitForNavigationToSettle(page)

  const after = await page.evaluate(() => ({
    historyLength: window.history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0
  }))
  expect(after.historyLength).toBe(before.historyLength)
  expect(after.transitionCount).toBe(before.transitionCount)
})

test('显式游戏目录返回新增历史项并与浏览器后退区分', async ({ page }) => {
  await installViewTransitionCounter(page)
  await openHome(page)
  await navigateHomeSection(page, 'games')
  const title = await enterFirstGame(page)

  const before = await page.evaluate(() => ({
    historyLength: window.history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0
  }))

  await page.locator(`${NAVIGATION} a[data-section-link="games"]`).click({
    force: true
  })
  await waitForHomeReady(page)
  await waitForNavigationToSettle(page)
  await expectHomeSection(page, 'games')

  const after = await page.evaluate(() => ({
    historyLength: window.history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0,
    bridgeDebug: window.__yuanxingHistoryBridgeDebug?.getSnapshot?.() ?? null
  }))
  expect(after.historyLength).toBe(before.historyLength + 1)
  expect(after.transitionCount - before.transitionCount).toBe(1)
  expect(after.bridgeDebug.requestCount).toBe(0)
  await expect(
    page.locator(`${GAME_CARD}[aria-current="true"] .game-card__name`)
  ).toHaveText(title)
})

test('不支持 View Transitions 时后退仍完成一次无动画提交', async ({ page }) => {
  await installViewTransitionCounter(page)
  await page.addInitScript(() => {
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: undefined
    })
  })
  await openHome(page)
  await navigateHomeSection(page, 'games')
  await enterFirstGame(page)

  const before = await page.evaluate(() => ({
    historyLength: window.history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0
  }))
  await triggerBrowserBack(page)
  await waitForHomeReady(page)
  await waitForNavigationToSettle(page)
  await expectHomeSection(page, 'games')

  const after = await page.evaluate(() => ({
    historyLength: window.history.length,
    transitionCount: window.__getViewTransitionCount?.() ?? 0,
    bridgeDebug: window.__yuanxingHistoryBridgeDebug?.getSnapshot?.() ?? null
  }))
  expect(after.historyLength).toBe(before.historyLength)
  expect(after.transitionCount).toBe(before.transitionCount)
  expect(after.bridgeDebug).toMatchObject({
    requestCount: 1,
    transitionCount: 1,
    fallbackCount: 0,
    lastStatus: 'completed'
  })
})
