import { test, expect } from '@playwright/test'
import {
  GAME_CARD,
  GAME_DETAIL,
  NAVIGATION,
  openHome,
  navigateHomeSection,
  waitForGameDetail,
  waitForHomeReady,
  waitForNavigationToSettle
} from './helpers/site.js'

const CHROME_SELECTORS = {
  mainCanvas: '[data-cosmic-main-canvas]',
  navigationCanvas: '[data-cosmic-navigation-canvas]',
  navigationGlass: '.star-navigation-glass',
  brand: '[data-site-brand]',
  wordmark: '.brand-wordmark',
  navigation: NAVIGATION
}

async function captureChromeIdentity(page) {
  await page.evaluate((selectors) => {
    window.__persistentChromeRefs = Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => [
        key,
        document.querySelector(selector)
      ])
    )
  }, CHROME_SELECTORS)
}

async function expectChromeIdentity(page) {
  const identity = await page.evaluate((selectors) =>
    Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => [
        key,
        window.__persistentChromeRefs?.[key] === document.querySelector(selector)
      ])
    ), CHROME_SELECTORS)

  expect(identity).toEqual({
    mainCanvas: true,
    navigationCanvas: true,
    navigationGlass: true,
    brand: true,
    wordmark: true,
    navigation: true
  })
}

async function enterFirstGame(page) {
  const card = page.locator(GAME_CARD).first()
  await expect(card).toBeVisible()
  await card.click({ force: true })
  await waitForGameDetail(page)
  await waitForNavigationToSettle(page)
}

async function readCosmicSnapshot(page) {
  return page.evaluate(
    () => window.__yuanxingCosmicDebug?.getSnapshot?.() ?? null
  )
}

test('持久视觉层跨首页、详情与返回保持相同 DOM 身份', async ({ page }) => {
  await openHome(page)
  await captureChromeIdentity(page)
  await expectChromeIdentity(page)

  await navigateHomeSection(page, 'about')
  await expectChromeIdentity(page)

  await navigateHomeSection(page, 'games')
  await enterFirstGame(page)
  await expectChromeIdentity(page)

  await page.locator(`${NAVIGATION} a[data-section-link="games"]`).click({ force: true })
  await waitForHomeReady(page)
  await waitForNavigationToSettle(page)
  await expect(page).toHaveURL(/#games$/)
  await expectChromeIdentity(page)

  await enterFirstGame(page)
  await page.locator(`${NAVIGATION} a[data-section-link="about"]`).click({ force: true })
  await waitForHomeReady(page)
  await expect(page).toHaveURL(/#about$/)
  await expectChromeIdentity(page)

  await enterFirstGame(page)
  await page.locator(`${NAVIGATION} a[data-section-link="links"]`).click({ force: true })
  await waitForHomeReady(page)
  await expect(page).toHaveURL(/#links$/)
  await expectChromeIdentity(page)
})

test('全站只有一个持续 Three.js 循环，导航相位跨路由不回零', async ({ page }) => {
  await openHome(page)

  const first = await readCosmicSnapshot(page)
  expect(first).not.toBeNull()
  expect(first.startCount).toBe(1)
  expect(first.isRunning).toBe(true)

  await page.waitForTimeout(260)
  const movingHome = await readCosmicSnapshot(page)
  expect(movingHome.elapsed).toBeGreaterThan(first.elapsed)
  expect(movingHome.navigationFrameCount).toBeGreaterThan(
    first.navigationFrameCount
  )
  expect(movingHome.mainFrameCount).toBeGreaterThan(first.mainFrameCount)

  await navigateHomeSection(page, 'games')
  await enterFirstGame(page)
  await page.waitForTimeout(120)
  const detailStart = await readCosmicSnapshot(page)
  await page.waitForTimeout(260)
  const detailLater = await readCosmicSnapshot(page)

  expect(detailLater.startCount).toBe(1)
  expect(detailLater.isRunning).toBe(true)
  expect(detailLater.mainFrameCount).toBe(detailStart.mainFrameCount)
  expect(detailLater.navigationFrameCount).toBeGreaterThan(
    detailStart.navigationFrameCount
  )
  expect(detailLater.elapsed).toBeGreaterThan(detailStart.elapsed)

  await page.locator(`${NAVIGATION} a[data-section-link="games"]`).click({ force: true })
  await waitForHomeReady(page)
  const returnedHome = await readCosmicSnapshot(page)

  expect(returnedHome.startCount).toBe(1)
  expect(returnedHome.elapsed).toBeGreaterThan(detailLater.elapsed)
  expect(returnedHome.navigationFrameCount).toBeGreaterThan(
    detailLater.navigationFrameCount
  )
})

test('首页主星在导航玻璃出现前完成静态 LOGO 交接', async ({ page }) => {
  await openHome(page)

  await page.evaluate(() => {
    window.scrollTo({
      top: window.innerHeight * 0.52,
      behavior: 'auto'
    })
  })
  await page.waitForTimeout(260)

  const beforeGlass = await page.evaluate(() => ({
    markOpacity: Number.parseFloat(
      getComputedStyle(document.querySelector('.brand-home__mark')).opacity
    ),
    glassOpacity: Number.parseFloat(
      getComputedStyle(document.querySelector('.star-navigation-glass')).opacity
    ),
    mainLogoOpacity:
      window.__yuanxingCosmicDebug?.getSnapshot?.().mainLogoOpacity
  }))

  expect(beforeGlass.markOpacity).toBeGreaterThanOrEqual(0.98)
  expect(beforeGlass.mainLogoOpacity).toBeLessThanOrEqual(0.02)
  expect(beforeGlass.glassOpacity).toBeLessThanOrEqual(0.02)
  await expect(page.locator('.hero-logo-replacement')).toHaveCount(0)

  await page.evaluate(() => {
    window.scrollTo({
      top: window.innerHeight * 0.64,
      behavior: 'auto'
    })
  })
  await page.waitForTimeout(300)

  await expect(
    page.locator('.star-navigation-glass')
  ).toHaveClass(/star-navigation-glass--visible/)
  expect(
    await page.locator('.brand-home__mark').evaluate(
      (element) => Number.parseFloat(getComputedStyle(element).opacity)
    )
  ).toBeGreaterThanOrEqual(0.98)
})

test('品牌按钮只触发一次整体视觉淡出淡入', async ({ page }) => {
  await openHome(page)
  await navigateHomeSection(page, 'games')
  await enterFirstGame(page)

  const before = await readCosmicSnapshot(page)
  await page.locator('[data-site-brand]').click()
  await waitForHomeReady(page)
  await expect.poll(async () => {
    const snapshot = await readCosmicSnapshot(page)
    return snapshot.brandTransitionCount - before.brandTransitionCount
  }).toBe(1)

  await expect(
    page.locator('.site-chrome--brand-transitioning')
  ).toHaveCount(0)
})

test('WebGL 正常时不显示降级星，真实失败时显示三颗降级星', async ({ page }) => {
  await openHome(page)
  await expect(page.locator('.star-navigation__fallback')).toHaveCount(0)

  await page.addInitScript(() => {
    const nativeGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (
        type === 'webgl' ||
        type === 'webgl2' ||
        type === 'experimental-webgl'
      ) {
        return null
      }
      return nativeGetContext.call(this, type, ...args)
    }
  })

  await page.goto('/?intro=off')
  await waitForHomeReady(page)
  await expect(page.locator('.star-navigation__fallback')).toHaveCount(3)

  const snapshot = await readCosmicSnapshot(page)
  expect(snapshot.mainSceneFailed).toBe(true)
  expect(snapshot.navigationSceneFailed).toBe(true)

  await page.locator(`${NAVIGATION} a[data-section-link="about"]`).click()
  await expect(page).toHaveURL(/#about$/)
})

test('直接访问详情、390px 手机与减少动态效果下可正常往返', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/games/roadsyettraveled/')

  await expect(page.locator(GAME_DETAIL)).toBeVisible()
  await expect(page.locator(NAVIGATION)).toBeVisible()
  await expect(page.locator('[data-site-brand]')).toHaveClass(/brand-home--ready/)

  const detailSnapshot = await readCosmicSnapshot(page)
  expect(detailSnapshot.isRunning).toBe(true)
  expect(detailSnapshot.startCount).toBe(1)

  await page.locator(`${NAVIGATION} a[data-section-link="about"]`).click()
  await waitForHomeReady(page)
  await expect(page).toHaveURL(/#about$/)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true)

  await page.evaluate(() => window.history.back())
  await expect(page.locator(GAME_DETAIL)).toBeVisible()
  await page.evaluate(() => window.history.forward())
  await waitForHomeReady(page)
  await expect(page).toHaveURL(/#about$/)
})
