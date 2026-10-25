const MOBILE_BREAKPOINT = 680
const BRAND_PADDING = 8

function lerp(from, to, progress) {
  return from + (to - from) * progress
}

function getBrandLayout(viewport) {
  const compact = viewport.width <= MOBILE_BREAKPOINT
  const insetX = compact ? 18 : 34
  const insetY = compact ? 16 : 26
  const logoSize = compact ? 30 : 38
  const gap = compact ? 7 : 9

  return {
    insetX,
    insetY,
    logoSize,
    logoCenterX: insetX + logoSize / 2,
    logoCenterY: insetY + logoSize / 2,
    wordmarkLeft: insetX + logoSize + gap,
    wordmarkFontSize: compact ? 13 : 14
  }
}

function getHeroAnchorStyle(viewport, layout, progress) {
  const startSize = Math.min(viewport.width * 0.68, 620, viewport.height * 0.72)
  const size = lerp(startSize, layout.logoSize, progress)

  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${lerp(viewport.width / 2, layout.logoCenterX, progress)}px`,
    top: `${lerp(viewport.height / 2, layout.logoCenterY, progress)}px`
  }
}

function getWordmarkStyle(viewport, layout, progress) {
  const startSize = Math.min(viewport.width * 0.68, 620, viewport.height * 0.72)
  const startFontSize = startSize * 0.195
  const startTop = viewport.height / 2 + startSize * 0.425 + 20

  return {
    left: `${lerp(viewport.width / 2, layout.wordmarkLeft, progress)}px`,
    top: `${lerp(startTop, layout.logoCenterY, progress)}px`,
    fontSize: `${lerp(startFontSize, layout.wordmarkFontSize, progress)}px`,
    transform: `translate(${lerp(-50, 0, progress)}%, ${lerp(-56, -50, progress)}%)`
  }
}

function getBrandHomeStyle(layout) {
  const wordmarkWidth = layout.wordmarkFontSize * 4.9

  return {
    left: `${layout.insetX - BRAND_PADDING}px`,
    top: `${layout.insetY - BRAND_PADDING}px`,
    width: `${layout.wordmarkLeft - layout.insetX + wordmarkWidth + BRAND_PADDING * 2}px`,
    height: `${layout.logoSize + BRAND_PADDING * 2}px`,
    '--brand-logo-size': `${layout.logoSize}px`,
    '--brand-padding': `${BRAND_PADDING}px`
  }
}

export function getBrandGeometry({
  viewport,
  scrollProgress,
  isHome
}) {
  const progress = isHome
    ? scrollProgress * scrollProgress * (3 - 2 * scrollProgress)
    : 1
  const layout = getBrandLayout(viewport)

  return {
    layout,
    progress,
    heroAnchorStyle: getHeroAnchorStyle(viewport, layout, progress),
    wordmarkStyle: getWordmarkStyle(viewport, layout, progress),
    brandHomeStyle: getBrandHomeStyle(layout),
    brandReady: isHome && progress > 0.96
  }
}
