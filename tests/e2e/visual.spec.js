import { test, expect } from '@playwright/test'
import {
  GAME_CARD,
  GAME_DETAIL,
  NAVIGATION,
  waitForGameDetail,
  waitForHomeReady,
  waitForNavigationToSettle
} from './helpers/site.js'

const DESKTOP_VIEWPORT = { width: 1440, height: 900 }
const MOBILE_VIEWPORT = { width: 390, height: 844 }
const SCREENSHOT_OPTIONS = {
  animations: 'disabled',
  caret: 'hide',
  maxDiffPixelRatio: 0.001
}

async function openDeterministicHome(page, { webgl = true } = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem('yuanxing:intro-seen', '1')
    } catch {
      // 截图只依赖当前页面，存储不可用时继续使用显式 intro=off。
    }
  })

  if (!webgl) {
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
  }

  await page.goto('/?intro=off&motion=off')
  await waitForHomeReady(page)
  await waitForDeterministicVisuals(page, {
    mainScene: webgl,
    expectSceneFailure: !webgl
  })
}

async function waitForDeterministicVisuals(page, {
  mainScene = true,
  expectSceneFailure = false
} = {}) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(resolve)
      })
    })
  })

  await expect.poll(() => page.evaluate(({ requiresMainScene }) => {
    const snapshot = window.__yuanxingCosmicDebug?.getSnapshot?.()
    if (!snapshot) return false
    if (snapshot.mainSceneFailed && snapshot.navigationSceneFailed) return true
    return (
      (!requiresMainScene || snapshot.mainFrameCount > 0) &&
      snapshot.navigationFrameCount > 0
    )
  }, { requiresMainScene: mainScene })).toBe(true)

  if (expectSceneFailure) {
    await expect.poll(() => page.evaluate(
      () => Boolean(window.__yuanxingCosmicDebug?.getSnapshot?.().mainSceneFailed)
    )).toBe(true)
    await expect.poll(() => page.evaluate(
      () => Boolean(
        window.__yuanxingCosmicDebug?.getSnapshot?.().navigationSceneFailed
      )
    )).toBe(true)
  }
}

async function waitForDetailVisuals(page) {
  await waitForDeterministicVisuals(page, {
    mainScene: false
  })
}

async function showHomeSection(page, sectionId) {
  const link = page.locator(`${NAVIGATION} a[data-section-link="${sectionId}"]`)
  await link.click({ force: true })
  await expect(page).toHaveURL(new RegExp(`#${sectionId}$`))
  await expect(link).toHaveAttribute('aria-current', 'location')
  await waitForDeterministicVisuals(page)
}

async function openDeterministicGameDetail(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/games/roadsyettraveled/?motion=off')
  await waitForGameDetail(page)
  await waitForNavigationToSettle(page)
  await waitForDetailVisuals(page)
}

async function enterFirstGameAndReturnWithBrand(page) {
  await openDeterministicHome(page)
  await showHomeSection(page, 'games')

  const card = page.locator(GAME_CARD).first()
  await card.click({ force: true })
  await waitForGameDetail(page)
  await waitForNavigationToSettle(page)

  await page.locator('[data-site-brand]').click()
  await waitForHomeReady(page)
  await waitForNavigationToSettle(page)
  await expect(page).toHaveURL(/\/$/)
  await waitForDeterministicVisuals(page)
}

test.describe('确定性视觉基线', () => {
  test.use({ viewport: DESKTOP_VIEWPORT })

  test('桌面首页初始画面', async ({ page }) => {
    await openDeterministicHome(page)
    await expect(page).toHaveScreenshot(
      'desktop-hero.png',
      SCREENSHOT_OPTIONS
    )
  })

  test('桌面首页 About 区块', async ({ page }) => {
    await openDeterministicHome(page)
    await showHomeSection(page, 'about')
    await expect(page).toHaveScreenshot(
      'desktop-about.png',
      SCREENSHOT_OPTIONS
    )
  })

  test('桌面首页 Games 区块', async ({ page }) => {
    await openDeterministicHome(page)
    await showHomeSection(page, 'games')
    await expect(page).toHaveScreenshot(
      'desktop-games.png',
      SCREENSHOT_OPTIONS
    )
  })

  test('桌面首页 Links 区块', async ({ page }) => {
    await openDeterministicHome(page)
    await showHomeSection(page, 'links')
    await expect(page).toHaveScreenshot(
      'desktop-links.png',
      SCREENSHOT_OPTIONS
    )
  })

  test('桌面游戏详情页', async ({ page }) => {
    await openDeterministicGameDetail(page)
    await expect(page).toHaveScreenshot(
      'desktop-detail.png',
      {
        ...SCREENSHOT_OPTIONS,
        fullPage: true
      }
    )
  })

  test('桌面品牌返回首页', async ({ page }) => {
    await enterFirstGameAndReturnWithBrand(page)
    await expect(page).toHaveScreenshot(
      'desktop-brand-return.png',
      SCREENSHOT_OPTIONS
    )
  })

  test('桌面 WebGL 降级游戏目录', async ({ page }) => {
    await openDeterministicHome(page, { webgl: false })
    await showHomeSection(page, 'games')
    await expect(page.locator('.star-navigation__fallback')).toHaveCount(3)
    await expect(page).toHaveScreenshot(
      'desktop-webgl-fallback.png',
      SCREENSHOT_OPTIONS
    )
  })
})

test.describe('确定性移动视觉基线', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test('手机首页初始画面', async ({ page }) => {
    await openDeterministicHome(page)
    await expect(page).toHaveScreenshot(
      'mobile-hero.png',
      SCREENSHOT_OPTIONS
    )
  })

  test('手机首页 About 区块', async ({ page }) => {
    await openDeterministicHome(page)
    await showHomeSection(page, 'about')
    await expect(page).toHaveScreenshot(
      'mobile-about.png',
      SCREENSHOT_OPTIONS
    )
  })

  test('手机首页 Games 区块', async ({ page }) => {
    await openDeterministicHome(page)
    await showHomeSection(page, 'games')
    await expect(page).toHaveScreenshot(
      'mobile-games.png',
      SCREENSHOT_OPTIONS
    )
  })

  test('手机首页 Links 区块', async ({ page }) => {
    await openDeterministicHome(page)
    await showHomeSection(page, 'links')
    await expect(page).toHaveScreenshot(
      'mobile-links.png',
      SCREENSHOT_OPTIONS
    )
  })

  test('手机游戏详情页', async ({ page }) => {
    await openDeterministicGameDetail(page)
    await expect(page.locator(GAME_DETAIL)).toBeVisible()
    await expect(page).toHaveScreenshot(
      'mobile-detail.png',
      {
        ...SCREENSHOT_OPTIONS,
        fullPage: true
      }
    )
  })

  test('手机品牌返回首页', async ({ page }) => {
    await enterFirstGameAndReturnWithBrand(page)
    await expect(page).toHaveScreenshot(
      'mobile-brand-return.png',
      SCREENSHOT_OPTIONS
    )
  })
})
