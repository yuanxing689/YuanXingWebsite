import { test, expect } from '@playwright/test'
import {
  GAME_CARD,
  GAME_CAROUSEL_VIEWPORT,
  NAVIGATION,
  openHome,
  waitForHomeReady
} from './helpers/site.js'

test('基线：首页、导航、区块和游戏轮播可以渲染', async ({ page }) => {
  await openHome(page)

  await expect(page.locator('#about.home-section')).toHaveCount(1)
  await expect(page.locator('#games.home-section')).toHaveCount(1)
  await expect(page.locator('#links.home-section')).toHaveCount(1)

  for (const id of ['about', 'games', 'links']) {
    await expect(
      page.locator(`${NAVIGATION} a[data-section-link="${id}"]`)
    ).toHaveCount(1)
  }

  await expect(page.locator(GAME_CAROUSEL_VIEWPORT)).toBeVisible()
  await expect(page.locator(GAME_CARD).first()).toBeVisible()
  await expect(
    page.locator(`${GAME_CARD} .game-card__name`).first()
  ).toHaveText(/\S+/)
})

test('基线：强制开场结束后解除输入锁', async ({ page }) => {
  await page.goto('/?intro=on')
  await waitForHomeReady(page)
  await expect(page.locator('.intro-input-lock')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveClass(/intro-locked/)
})
