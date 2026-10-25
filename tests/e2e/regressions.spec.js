import { test, expect } from '@playwright/test'
import {
  GAME_CARD,
  GAME_CAROUSEL_VIEWPORT,
  GAME_DETAIL,
  NAVIGATION,
  installViewTransitionCounter,
  isSectionAtConfiguredScrollTarget,
  navigateHomeSection,
  openHome,
  readViewTransitionCount,
  readLastViewTransitionSharedElements,
  triggerBrowserBack,
  waitForGameDetail,
  waitForHomeReady,
  waitForNavigationToSettle
} from './helpers/site.js'
import { installResourceAudit, readResourceAudit } from './helpers/resource-audit.js'

async function enterFirstGame(page) {
  const card = page.locator(GAME_CARD).first()
  await expect(card).toBeVisible()
  const title = (await card.locator('.game-card__name').innerText()).trim()
  const href = await card.getAttribute('href')
  expect(href, 'game cards should have a real same-site href').toMatch(/\/games\//)
  const targetPath = new URL(href, page.url()).pathname

  await card.click({ force: true })
  await waitForGameDetail(page)
  await expect.poll(() => new URL(page.url()).pathname).toBe(targetPath)
  return { title, targetPath }
}

async function waitForSectionState(page, sectionId) {
  const link = page.locator(`${NAVIGATION} a[data-section-link="${sectionId}"]`)
  await expect(page).toHaveURL(new RegExp(`#${sectionId}$`))
  await expect(link).toHaveAttribute('aria-current', 'location')
  await expect.poll(
    () => isSectionAtConfiguredScrollTarget(page, sectionId)
  ).toBe(true)
}

test('1. 进入游戏详情后浏览器后退，恢复相同游戏卡片与横向位置', async ({ page }) => {
  await openHome(page)
  await navigateHomeSection(page, 'games')

  const { title } = await enterFirstGame(page)
  await triggerBrowserBack(page)
  await waitForHomeReady(page)

  const activeCard = page.locator(`${GAME_CARD}[aria-current="true"]`)
  await expect(activeCard.locator('.game-card__name')).toHaveText(title)

  const position = await activeCard.evaluate((card) => {
    const slide = card.closest('[data-carousel-index]')
    const viewport = document.querySelector('.game-carousel__viewport')
    const track = document.querySelector('.game-carousel__track')
    const firstSlide = track?.querySelector('[data-carousel-index]')
    if (!slide || !viewport || !track || !firstSlide) return null

    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0
    const cardStep = firstSlide.offsetWidth + gap
    const index = Number(slide.getAttribute('data-carousel-index'))
    return {
      actual: viewport.scrollLeft,
      expected: index * cardStep
    }
  })
  expect(position).not.toBeNull()
  expect(Math.abs(position.actual - position.expected)).toBeLessThanOrEqual(5)
  await expect(page.locator(GAME_DETAIL)).toHaveCount(0)
})

test('2. 游戏详情页连续快速后退，最终路由、活动区块与转场状态一致', async ({ page }) => {
  await openHome(page)
  await navigateHomeSection(page, 'about')
  await navigateHomeSection(page, 'games')
  await enterFirstGame(page)

  await page.evaluate(() => {
    window.history.back()
    window.setTimeout(() => window.history.back(), 70)
  })

  await expect(page.locator('main.home-page')).toBeVisible()
  await waitForHomeReady(page)
  await waitForSectionState(page, 'about')

  await expect.poll(() => page.evaluate(() => ({
    gameDetailVisible: Boolean(
      document.querySelector('main.page-content--article.page-content--game')
    ),
    transitioning:
      document.documentElement.classList.contains('game-route-transitioning') ||
      document.documentElement.classList.contains('route-fallback-leaving'),
    routeLeaving: Boolean(document.querySelector('.site-shell--route-leaving'))
  }))).toEqual({
    gameDetailVisible: false,
    transitioning: false,
    routeLeaving: false
  })
})

test('3. 首页区块导航的 URL、当前区块与实际滚动目标一致', async ({ page }) => {
  await openHome(page)

  for (const sectionId of ['about', 'games', 'links']) {
    await navigateHomeSection(page, sectionId)
    await waitForSectionState(page, sectionId)
  }
})

test('4. 滚动转场未结束时再次导航，最后一次导航应胜出', async ({ page }) => {
  await openHome(page)

  const aboutLink = page.locator(`${NAVIGATION} a[data-section-link="about"]`)
  const linksLink = page.locator(`${NAVIGATION} a[data-section-link="links"]`)
  await aboutLink.click({ force: true })
  await page.waitForTimeout(45)
  await linksLink.click({ force: true })

  await waitForSectionState(page, 'links')
  await page.waitForTimeout(900)

  await waitForSectionState(page, 'links')
  await expect(aboutLink).not.toHaveAttribute('aria-current', 'location')
})

test('5. 手机尺寸下轮播单行横向排列且页面没有横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openHome(page)
  await navigateHomeSection(page, 'games')

  const viewport = page.locator(GAME_CAROUSEL_VIEWPORT)
  const layout = await viewport.evaluate((element) => {
    const track = element.querySelector('.game-carousel__track')
    const slides = track
      ? [...track.querySelectorAll(':scope > li[data-carousel-index]')]
      : []
    return {
      trackDisplay: track ? window.getComputedStyle(track).display : '',
      flexDirection: track ? window.getComputedStyle(track).flexDirection : '',
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      slideCount: slides.length,
      offsetTops: slides.map((slide) => slide.offsetTop),
      offsetLefts: slides.map((slide) => slide.offsetLeft)
    }
  })

  expect(layout.slideCount).toBeGreaterThan(1)
  expect(layout.trackDisplay).toBe('flex')
  expect(layout.flexDirection).toBe('row')
  expect(new Set(layout.offsetTops).size).toBe(1)
  expect(
    layout.offsetLefts.every((left, index, all) =>
      index === 0 || left > all[index - 1]
    )
  ).toBe(true)
  expect(layout.scrollWidth).toBeGreaterThan(layout.clientWidth)
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth + 1)

  await viewport.evaluate((element) => {
    element.scrollTo({
      left: Math.min(element.scrollWidth - element.clientWidth, element.clientWidth + 80),
      behavior: 'auto'
    })
  })
  await expect.poll(
    () => viewport.evaluate((element) => element.scrollLeft)
  ).toBeGreaterThan(0)
})

test('6. 重复进出详情页不累积轮播监听器和持续性动画任务', async ({ page }) => {
  test.setTimeout(60_000)
  await installResourceAudit(page)
  await openHome(page)

  let firstDetailSnapshot = null
  const samples = []

  for (let cycle = 0; cycle < 4; cycle += 1) {
    await navigateHomeSection(page, 'games')
    await enterFirstGame(page)
    await page.waitForTimeout(900)

    const snapshot = await readResourceAudit(page)
    samples.push(snapshot)
    expect(
      snapshot.activeCarouselListeners,
      JSON.stringify(snapshot)
    ).toBe(0)

    if (!firstDetailSnapshot) {
      firstDetailSnapshot = snapshot
    } else {
      expect(
        snapshot.pendingAnimationFrames,
        JSON.stringify(samples)
      ).toBeLessThanOrEqual(firstDetailSnapshot.pendingAnimationFrames + 1)
      expect(
        snapshot.pendingTimeouts,
        JSON.stringify(samples)
      ).toBeLessThanOrEqual(firstDetailSnapshot.pendingTimeouts + 2)
      expect(
        snapshot.pendingIntervals,
        JSON.stringify(samples)
      ).toBeLessThanOrEqual(firstDetailSnapshot.pendingIntervals)
    }

    if (cycle < 3) {
      await triggerBrowserBack(page)
      await waitForHomeReady(page)
      await expect(page).toHaveURL(/#games$/)
      await waitForNavigationToSettle(page)
    }
  }
})

test('7. 游戏目录按钮显式返回只执行一次共享元素过渡', async ({ page }) => {
  await installViewTransitionCounter(page)
  await openHome(page)
  await navigateHomeSection(page, 'games')

  const { title } = await enterFirstGame(page)
  await waitForNavigationToSettle(page)
  const transitionsBeforeReturn = await readViewTransitionCount(page)

  const catalogLink = page.locator(
    `${NAVIGATION} a[data-section-link="games"]`
  )
  await catalogLink.click({ force: true })
  await waitForHomeReady(page)
  await waitForNavigationToSettle(page)

  await expect(page).toHaveURL(/#games$/)
  await expect(
    page.locator(`${GAME_CARD}[aria-current="true"] .game-card__name`)
  ).toHaveText(title)
  expect(
    await readViewTransitionCount(page) - transitionsBeforeReturn
  ).toBe(1)
  await expect.poll(
    () => readLastViewTransitionSharedElements(page)
  ).toEqual({
    cover: true,
    title: true,
    status: true
  })
})
