import { expect } from '@playwright/test'
import { SITE_SCROLL_OFFSET } from '../../../src/navigation/siteScroll.js'

export const HOME_PATH = '/?intro=off'
export const NAVIGATION = 'nav[aria-label="主导航"]'
export const GAME_CAROUSEL_VIEWPORT = '.game-carousel__viewport'
export const GAME_CARD = 'a.game-card__link'
export const GAME_DETAIL = 'main.page-content--article.page-content--game'

export async function openHome(page) {
  await page.goto(HOME_PATH)
  await waitForHomeReady(page)
}

export async function waitForHomeReady(page) {
  await expect(page.locator('main.home-page')).toBeVisible()
  await expect(page.locator(NAVIGATION)).toBeVisible()
  await page.waitForFunction(
    () => !document.documentElement.classList.contains('intro-locked') &&
      !document.querySelector('.intro-input-lock'),
    null,
    { timeout: 20_000 }
  )
}

export async function navigateHomeSection(page, sectionId) {
  await waitForHomeReady(page)
  const link = page.locator(`${NAVIGATION} a[data-section-link="${sectionId}"]`)
  await expect(link).toHaveCount(1)

  // 导航星在滚动过程中会移动，force 只跳过元素稳定性等待，点击处理器仍会执行。
  await link.click({ force: true })
  await expect(page).toHaveURL(new RegExp(`#${sectionId}$`))
  await expect(link).toHaveAttribute('aria-current', 'location')
  await expect.poll(
    () => isSectionAtConfiguredScrollTarget(page, sectionId),
    {
      message: `#${sectionId} should be active and aligned to its scroll target`
    }
  ).toBe(true)
}

export async function isSectionAtConfiguredScrollTarget(page, sectionId) {
  return page.evaluate(({ sectionId, scrollOffset }) => {
    const section = document.getElementById(sectionId)
    if (!section) return false

    const style = window.getComputedStyle(section)
    let transformY = 0
    if (style.transform !== 'none' && window.DOMMatrixReadOnly) {
      transformY = new window.DOMMatrixReadOnly(style.transform).m42
    }

    // 与 usePageSectionSnap.js 的落点算法保持一致，并计入显现动画位移。
    const documentTop =
      section.getBoundingClientRect().top + window.scrollY - transformY
    const paddingTop = Number.parseFloat(style.paddingTop) || 0
    const documentHeight = document.documentElement.scrollHeight
    const maxScrollY = Math.max(documentHeight - window.innerHeight, 0)
    const expectedScrollY = Math.min(
      documentTop - scrollOffset + paddingTop,
      maxScrollY
    )
    return Math.abs(window.scrollY - expectedScrollY) <= 6
  }, { sectionId, scrollOffset: SITE_SCROLL_OFFSET })
}

export async function triggerBrowserBack(page) {
  await page.evaluate(() => window.history.back())
}

export async function waitForNavigationToSettle(page) {
  await expect.poll(() => page.evaluate(() => ({
    transitioning:
      document.documentElement.classList.contains('game-route-transitioning') ||
      document.documentElement.classList.contains('route-fallback-leaving'),
    routeLeaving: Boolean(document.querySelector('.site-shell--route-leaving')),
    activeViewTransition: Boolean(document.activeViewTransition)
  }))).toEqual({
    transitioning: false,
    routeLeaving: false,
    activeViewTransition: false
  })
}

export async function installViewTransitionCounter(page) {
  await page.addInitScript(() => {
    const nativeStartViewTransition = document.startViewTransition?.bind(document)
    if (!nativeStartViewTransition) return

    let transitionCount = 0
    const sharedElementSnapshots = []
    document.startViewTransition = (callback) => {
      transitionCount += 1
      return nativeStartViewTransition(async () => {
        await callback()
        sharedElementSnapshots.push({
          cover: [...document.querySelectorAll('.game-card__cover-media')]
            .some((element) => Boolean(element.style.viewTransitionName)),
          title: [...document.querySelectorAll('.game-card__name')]
            .some((element) => Boolean(element.style.viewTransitionName)),
          status: [...document.querySelectorAll('.game-card__status')]
            .some((element) => Boolean(element.style.viewTransitionName))
        })
      })
    }
    window.__getViewTransitionCount = () => transitionCount
    window.__getViewTransitionSharedElements = () =>
      sharedElementSnapshots.at(-1) ?? null
  })
}

export async function readViewTransitionCount(page) {
  return page.evaluate(() => window.__getViewTransitionCount?.() ?? 0)
}

export async function readLastViewTransitionSharedElements(page) {
  return page.evaluate(
    () => window.__getViewTransitionSharedElements?.() ?? null
  )
}

export async function waitForGameDetail(page) {
  await expect(page.locator(GAME_DETAIL)).toBeVisible()
  await expect(page.locator('.game-article-hero')).toBeVisible()
  await expect(page.locator('.game-article-body')).toBeAttached()
}
