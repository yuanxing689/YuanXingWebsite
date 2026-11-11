import { test, expect } from '@playwright/test'
import {
  GAME_FIXTURE_PATH,
  waitForGameDetail
} from './helpers/site.js'

test('正文和三级标题保持清晰的字号与颜色层级', async ({ page }) => {
  await page.goto(GAME_FIXTURE_PATH)
  await waitForGameDetail(page)

  const readType = () => page.evaluate(() => {
    const paragraph = [...document.querySelectorAll('.game-article-body p')]
      .find((element) => element.textContent.includes('你是否认为'))
    const heading2 = document.querySelector('.game-article-body h2')
    const heading3 = document.querySelector('.game-article-body h3')
    const style = (element) => {
      const computed = window.getComputedStyle(element)
      return {
        color: computed.color,
        fontSize: Number.parseFloat(computed.fontSize),
        lineHeight: Number.parseFloat(computed.lineHeight)
      }
    }
    return {
      paragraph: style(paragraph),
      heading2: style(heading2),
      heading3: style(heading3)
    }
  })

  const desktop = await readType()
  expect(desktop.paragraph.fontSize).toBe(17)
  expect(desktop.paragraph.lineHeight).toBeCloseTo(31.45, 1)
  expect(desktop.paragraph.color).toBe('rgb(199, 211, 232)')
  expect(desktop.heading3.fontSize).toBe(28)
  expect(desktop.heading2.fontSize / desktop.heading3.fontSize)
    .toBeLessThan(1.8)

  await page.setViewportSize({ width: 390, height: 844 })
  const mobile = await readType()
  expect(mobile.paragraph.fontSize).toBe(17)
  expect(mobile.heading3.fontSize).toBeGreaterThan(21)
})

test('正文段落支持左中右对齐且不使用内联样式', async ({ page }) => {
  await page.goto(GAME_FIXTURE_PATH)
  await waitForGameDetail(page)

  const readAlignment = (text) => page.evaluate((content) => {
    const paragraph = [...document.querySelectorAll('.game-article-body p')]
      .find((element) => element.textContent.includes(content))
    const computed = window.getComputedStyle(paragraph)
    return {
      styleAttribute: paragraph.getAttribute('style'),
      textAlign: computed.textAlign
    }
  }, text)

  for (const alignment of [
    { text: '左对齐段落', expected: 'left' },
    { text: '居中对齐段落', expected: 'center' },
    { text: '右对齐段落', expected: 'right' },
    { text: '引用中的居中段落', expected: 'center' }
  ]) {
    const result = await readAlignment(alignment.text)
    expect(result.styleAttribute).toBeNull()
    expect(result.textAlign).toBe(alignment.expected)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  expect((await readAlignment('居中对齐段落')).textAlign).toBe('center')
  expect((await readAlignment('右对齐段落')).textAlign).toBe('right')
})
