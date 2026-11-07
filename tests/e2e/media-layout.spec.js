import { test, expect } from '@playwright/test'
import {
  openHome,
  waitForGameDetail
} from './helpers/site.js'

async function readImageBoxes(images) {
  return images.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      }
    })
  )
}

test('双图和单图容器按声明布局，手机端双图改为单列', async ({ page }) => {
  await page.goto('/games/game-wiki-sample/?motion=off')
  await waitForGameDetail(page)

  const gridImages = page.locator('.media-grid--2 img')
  await expect(gridImages).toHaveCount(2)
  await expect(gridImages.first()).toBeVisible()

  const desktopBoxes = await readImageBoxes(gridImages)
  expect(Math.abs(desktopBoxes[0].y - desktopBoxes[1].y)).toBeLessThanOrEqual(2)
  expect(desktopBoxes[1].x).toBeGreaterThan(desktopBoxes[0].x + 100)

  const centerImage = page.locator('.media-block--center img')
  const fullImage = page.locator('.media-block--full img')
  await expect(centerImage).toBeVisible()
  await expect(fullImage).toBeVisible()
  const blockPositions = await page.evaluate(() => {
    const content = document.querySelector('.game-article-body')
    const center = document.querySelector('.media-block--center img')
    const full = document.querySelector('.media-block--full img')
    const contentRect = content.getBoundingClientRect()
    const centerRect = center.getBoundingClientRect()
    const fullRect = full.getBoundingClientRect()
    return {
      centerOffset:
        (centerRect.left + centerRect.right) / 2 -
        (contentRect.left + contentRect.right) / 2,
      fullWidthRatio: fullRect.width / contentRect.width
    }
  })
  expect(Math.abs(blockPositions.centerOffset)).toBeLessThanOrEqual(2)
  expect(blockPositions.fullWidthRatio).toBeGreaterThan(0.95)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(async () => {
    const boxes = await readImageBoxes(gridImages)
    return Math.abs(boxes[0].x - boxes[1].x) <= 2 &&
      boxes[1].y > boxes[0].y + 20
  }).toBe(true)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true)
})

test('纵列图片组共用右侧浮动，三图画廊保持单行三列', async ({ page }) => {
  await page.goto('/games/roadsyettraveled/?motion=off')
  await waitForGameDetail(page)

  await expect(page.locator('.media-stack--right')).toHaveCount(4)
  await expect(page.locator('.media-stop')).toHaveCount(1)
  const stack = page.locator('.media-stack--right').first()
  const stackImages = stack.locator('img')
  await expect(stackImages).toHaveCount(3)
  expect(await stack.evaluate(
    (element) => window.getComputedStyle(element).float
  )).toBe('right')

  const stackBoxes = await readImageBoxes(stackImages)
  expect(Math.abs(stackBoxes[0].x - stackBoxes[1].x)).toBeLessThanOrEqual(2)
  expect(Math.abs(stackBoxes[1].x - stackBoxes[2].x)).toBeLessThanOrEqual(2)
  expect(stackBoxes[1].y).toBeGreaterThan(stackBoxes[0].y)
  expect(stackBoxes[2].y).toBeGreaterThan(stackBoxes[1].y)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(
    () => stack.evaluate((element) => window.getComputedStyle(element).float)
  ).toBe('none')
  const mobileStackBoxes = await readImageBoxes(stackImages)
  expect(Math.abs(
    mobileStackBoxes[0].x - mobileStackBoxes[1].x
  )).toBeLessThanOrEqual(2)
  expect(Math.abs(
    mobileStackBoxes[1].x - mobileStackBoxes[2].x
  )).toBeLessThanOrEqual(2)
  expect(mobileStackBoxes[1].y).toBeGreaterThan(mobileStackBoxes[0].y)
  expect(mobileStackBoxes[2].y).toBeGreaterThan(mobileStackBoxes[1].y)

  await openHome(page)
  const gallery = page.locator('.media-grid--3').first()
  await gallery.scrollIntoViewIfNeeded()
  const galleryImages = gallery.locator('img')
  await expect(galleryImages).toHaveCount(3)
  const galleryBoxes = await readImageBoxes(galleryImages)
  const centerLines = galleryBoxes.map((box) => box.y + box.height / 2)
  expect(Math.max(...centerLines) - Math.min(...centerLines))
    .toBeLessThanOrEqual(2)
  expect(galleryBoxes[1].x).toBeGreaterThan(galleryBoxes[0].x)
  expect(galleryBoxes[2].x).toBeGreaterThan(galleryBoxes[1].x)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true)
})
