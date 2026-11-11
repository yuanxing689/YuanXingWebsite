import { test, expect } from '@playwright/test'
import {
  GAME_FIXTURE_PATH,
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

function expectSameRow(boxes) {
  const firstY = boxes[0].y
  for (const box of boxes.slice(1)) {
    expect(Math.abs(box.y - firstY)).toBeLessThanOrEqual(2)
  }
}

function expectDistinctColumns(boxes) {
  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index].x).toBeGreaterThan(boxes[index - 1].x + 20)
  }
}

function expectSameCenterLine(boxes) {
  const centerLines = boxes.map((box) => box.y + box.height / 2)
  const firstCenter = centerLines[0]
  for (const center of centerLines.slice(1)) {
    expect(Math.abs(center - firstCenter)).toBeLessThanOrEqual(2)
  }
}

test('固定画廊支持二至四列，手机端统一改为单列', async ({ page }) => {
  await page.goto(GAME_FIXTURE_PATH)
  await waitForGameDetail(page)

  const galleries = [
    { selector: '.media-grid--2', columns: 2 },
    { selector: '.media-grid--3', columns: 3 },
    { selector: '.media-grid--4', columns: 4 }
  ]

  for (const gallery of galleries) {
    const images = page.locator(`${gallery.selector} img`)
    await expect(images).toHaveCount(gallery.columns)
    await expect(images.first()).toBeVisible()

    const boxes = await readImageBoxes(images)
    expectSameRow(boxes)
    expectDistinctColumns(boxes)
  }

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
  for (const gallery of galleries) {
    const images = page.locator(`${gallery.selector} img`)
    await expect.poll(async () => {
      const boxes = await readImageBoxes(images)
      const sharesX = boxes.every(
        (box) => Math.abs(box.x - boxes[0].x) <= 2
      )
      const descends = boxes.every(
        (box, index) => index === 0 || box.y > boxes[index - 1].y + 20
      )
      return sharesX && descends
    }).toBe(true)
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true)
})

test('图文流按段落组成自由分行，并保持侧栏环绕', async ({ page }) => {
  await page.goto(GAME_FIXTURE_PATH)
  await waitForGameDetail(page)

  await expect(page.locator('.media-flow--right')).toHaveCount(2)
  const flow = page.locator('.media-flow--right').first()
  const images = flow.locator('img')
  await expect(images).toHaveCount(3)
  await expect(page.locator('.media-stop')).toHaveCount(1)
  expect(await flow.evaluate(
    (element) => window.getComputedStyle(element).float
  )).toBe('right')

  const boxes = await readImageBoxes(images)
  expect(boxes[1].y).toBeGreaterThan(boxes[0].y + 20)
  expect(Math.abs(boxes[1].y - boxes[2].y)).toBeLessThanOrEqual(2)
  expect(boxes[2].x).toBeGreaterThan(boxes[1].x + 20)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(
    () => flow.evaluate((element) => window.getComputedStyle(element).float)
  ).toBe('none')
  const mobileBoxes = await readImageBoxes(images)
  expect(mobileBoxes[1].y).toBeGreaterThan(mobileBoxes[0].y + 20)
  expect(
    Math.abs(mobileBoxes[1].y - mobileBoxes[2].y)
  ).toBeLessThanOrEqual(2)
  expect(mobileBoxes[2].x).toBeGreaterThan(mobileBoxes[1].x + 20)
})

test('多图流保留纵向图片序列', async ({ page }) => {
  await page.goto(GAME_FIXTURE_PATH)
  await waitForGameDetail(page)

  const flows = page.locator('.media-flow--right')
  await expect(flows).toHaveCount(2)
  const flow = flows.nth(1)
  const flowImages = flow.locator('img')
  await expect(flowImages).toHaveCount(3)
  expect(await flow.evaluate(
    (element) => window.getComputedStyle(element).float
  )).toBe('right')

  const desktopBoxes = await readImageBoxes(flowImages)
  for (let index = 1; index < desktopBoxes.length; index += 1) {
    expect(desktopBoxes[index].y).toBeGreaterThan(
      desktopBoxes[index - 1].y + 20
    )
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(
    () => flow.evaluate((element) => window.getComputedStyle(element).float)
  ).toBe('none')
  const mobileBoxes = await readImageBoxes(flowImages)
  for (let index = 1; index < mobileBoxes.length; index += 1) {
    expect(mobileBoxes[index].y).toBeGreaterThan(
      mobileBoxes[index - 1].y + 20
    )
  }
})

test('图标条支持一至四列，并在手机端保持单行排列', async ({ page }) => {
  await openHome(page)
  await page.locator('#links').scrollIntoViewIfNeeded()

  const homeStrip = page.locator('.media-strip--4')
  const homeStripImages = homeStrip.locator('img')
  await expect(homeStripImages).toHaveCount(4)
  const desktopBoxes = await readImageBoxes(homeStripImages)
  expectSameCenterLine(desktopBoxes)
  expectDistinctColumns(desktopBoxes)
  expect(Math.max(...desktopBoxes.map((box) => box.height)))
    .toBeLessThanOrEqual(121)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(async () => {
    const boxes = await readImageBoxes(homeStripImages)
    const firstCenter = boxes[0].y + boxes[0].height / 2
    return boxes.every(
      (box, index) =>
        Math.abs(box.y + box.height / 2 - firstCenter) <= 2 &&
        (index === 0 || box.x > boxes[index - 1].x)
    )
  }).toBe(true)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true)

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(GAME_FIXTURE_PATH)
  await waitForGameDetail(page)

  const strips = [
    { selector: '.media-strip--1', columns: 1 },
    { selector: '.media-strip--2', columns: 2 },
    { selector: '.media-strip--3', columns: 3 },
    { selector: '.media-strip--4', columns: 4 }
  ]

  for (const strip of strips) {
    const images = page.locator(`${strip.selector} img`)
    await expect(images).toHaveCount(strip.columns)
    await expect(images.first()).toBeVisible()
    const boxes = await readImageBoxes(images)
    expectSameCenterLine(boxes)
    expectDistinctColumns(boxes)
    expect(Math.max(...boxes.map((box) => box.height)))
      .toBeLessThanOrEqual(121)
    expect(Math.max(...boxes.map((box) => box.width)))
      .toBeLessThanOrEqual(181)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  for (const strip of strips) {
    const images = page.locator(`${strip.selector} img`)
    await expect.poll(async () => {
      const boxes = await readImageBoxes(images)
      const firstCenter = boxes[0].y + boxes[0].height / 2
      return boxes.every(
        (box, index) =>
          Math.abs(box.y + box.height / 2 - firstCenter) <= 2 &&
          (index === 0 || box.x > boxes[index - 1].x)
      )
    }).toBe(true)
    const boxes = await readImageBoxes(images)
    expect(Math.max(...boxes.map((box) => box.height)))
      .toBeLessThanOrEqual(97)
    expect(Math.max(...boxes.map((box) => box.width)))
      .toBeLessThanOrEqual(181)
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true)
})
