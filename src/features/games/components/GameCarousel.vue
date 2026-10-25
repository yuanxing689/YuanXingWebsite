<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import GameCarouselCard from './GameCarouselCard.vue'
import {
  getGameCardKey,
  readActiveGameKey,
  rememberActiveGame,
  returningGameKey,
  signalGameCarouselReady
} from '../gameCarouselState.js'

const props = defineProps({
  games: { type: Array, default: () => [] }
})

const viewportRef = ref(null)
const trackRef = ref(null)
const activeIndex = ref(0)
const cardElements = new Map()
const SNAP_DELAY = 220
const WHEEL_MULTIPLIER = 0.9
const MAX_WHEEL_STEP = 120
const WHEEL_SMOOTHING = 14
let updateFrame = 0
let wheelFrame = 0
let wheelFrameTime = 0
let targetScrollLeft = 0
let snapTimer = 0
let snapEndTimer = 0
let resizeObserver = null
let allowScrollSnap = false
let isSnapping = false
let isWheelAnimating = false

const activeGame = computed(() => props.games[activeIndex.value] ?? null)

function setCardRef(element, index) {
  if (element) {
    cardElements.set(index, element)
    return
  }

  cardElements.delete(index)
}

function clampIndex(index) {
  return Math.min(Math.max(index, 0), Math.max(props.games.length - 1, 0))
}

function lerp(start, end, progress) {
  return start + (end - start) * progress
}

function getStackProfile(cardWidth) {
  const linear = Math.min(Math.max((cardWidth - 240) / 260, 0), 1)
  const progress = linear * linear * (3 - 2 * linear)

  return {
    focusScale: lerp(0.9, 1, progress),
    inward: lerp(58, 84, progress),
    scaleDrop: lerp(0.12, 0.1, progress),
    opacityDrop: lerp(0.3, 0.28, progress),
    lift: lerp(10, 14, progress),
    blur: lerp(1.2, 2.4, progress)
  }
}

function getCardStep() {
  const firstCard = cardElements.get(0)
  const track = trackRef.value
  if (!firstCard || !track) return 0

  const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0
  return firstCard.offsetWidth + gap
}

function updateCards() {
  updateFrame = 0
  const viewport = viewportRef.value
  const cardStep = getCardStep()
  if (!viewport || !cardStep) return

  const scrollPosition = viewport.scrollLeft / cardStep
  const cardWidth = cardElements.get(0)?.offsetWidth ?? 500
  const profile = getStackProfile(cardWidth)
  const nearestIndex = clampIndex(Math.round(scrollPosition))

  cardElements.forEach((card, index) => {
    const relative = index - scrollPosition
    const depth = Math.min(Math.abs(relative), 2)
    const primaryDepth = Math.min(depth, 1)
    const secondaryDepth = Math.max(depth - 1, 0)
    const scale =
      profile.focusScale *
      (1 - primaryDepth * profile.scaleDrop - secondaryDepth * 0.08)
    const stackX =
      -Math.sign(relative) * profile.inward * (primaryDepth + secondaryDepth * 0.85)
    const stackY = primaryDepth * profile.lift + secondaryDepth * 8
    const opacity = Math.max(1 - depth * profile.opacityDrop, 0.25)
    const blur = Math.min(
      primaryDepth * profile.blur + secondaryDepth * profile.blur * 0.55,
      3.5
    )

    card.style.setProperty('--carousel-shade', primaryDepth.toFixed(3))
    card.style.setProperty('--carousel-scale', scale.toFixed(3))
    card.style.setProperty('--carousel-x', `${stackX.toFixed(1)}px`)
    card.style.setProperty('--carousel-y', `${stackY.toFixed(1)}px`)
    card.style.setProperty('--carousel-opacity', opacity.toFixed(3))
    card.style.setProperty(
      '--carousel-filter',
      blur > 0.03 ? `blur(${blur.toFixed(2)}px)` : 'none'
    )
    card.style.zIndex = String(80 - Math.round(depth * 10))
  })

  if (activeIndex.value !== nearestIndex) {
    activeIndex.value = nearestIndex
    rememberActiveGame(getGameCardKey(props.games[nearestIndex]))
  }
}

function scheduleCardUpdate() {
  if (updateFrame) return
  updateFrame = window.requestAnimationFrame(updateCards)
}

function clearSnapTimer() {
  window.clearTimeout(snapTimer)
  snapTimer = 0
}

function stopWheelAnimation() {
  if (wheelFrame) {
    window.cancelAnimationFrame(wheelFrame)
    wheelFrame = 0
  }

  wheelFrameTime = 0
  isWheelAnimating = false

  const viewport = viewportRef.value
  if (viewport) targetScrollLeft = viewport.scrollLeft
}

function stopSnapAnimation() {
  clearSnapTimer()
  window.clearTimeout(snapEndTimer)
  snapEndTimer = 0

  const viewport = viewportRef.value
  if (isSnapping && viewport) {
    viewport.scrollTo({ left: viewport.scrollLeft, behavior: 'auto' })
  }
  isSnapping = false
}

function getCenteredScrollLeft(index) {
  const viewport = viewportRef.value
  const cardStep = getCardStep()
  if (!viewport || !cardStep) return null

  return clampIndex(index) * cardStep
}

function centerCard(index, behavior = 'smooth') {
  stopWheelAnimation()
  stopSnapAnimation()
  allowScrollSnap = false

  const viewport = viewportRef.value
  const target = getCenteredScrollLeft(index)
  if (!viewport || target === null) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  viewport.scrollTo({
    left: target,
    behavior: reducedMotion ? 'auto' : behavior
  })
}

function snapToNearestCard() {
  snapTimer = 0
  allowScrollSnap = false
  stopWheelAnimation()
  updateCards()

  const viewport = viewportRef.value
  const target = getCenteredScrollLeft(activeIndex.value)
  if (!viewport || target === null) return
  if (Math.abs(target - viewport.scrollLeft) < 1) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  isSnapping = true
  viewport.scrollTo({
    left: target,
    behavior: reducedMotion ? 'auto' : 'smooth'
  })

  if (reducedMotion) {
    isSnapping = false
    return
  }

  window.clearTimeout(snapEndTimer)
  snapEndTimer = window.setTimeout(() => {
    snapEndTimer = 0
    isSnapping = false
  }, 700)
}

function scheduleSnap() {
  if (!allowScrollSnap) return
  clearSnapTimer()
  snapTimer = window.setTimeout(snapToNearestCard, SNAP_DELAY)
}

function animateWheelScroll(timestamp) {
  wheelFrame = 0
  const viewport = viewportRef.value
  if (!viewport || !isWheelAnimating) return

  if (!wheelFrameTime) wheelFrameTime = timestamp
  const deltaTime = Math.min(Math.max((timestamp - wheelFrameTime) / 1000, 1 / 120), 0.05)
  wheelFrameTime = timestamp

  const current = viewport.scrollLeft
  const distance = targetScrollLeft - current
  if (Math.abs(distance) < 0.5) {
    viewport.scrollLeft = targetScrollLeft
    isWheelAnimating = false
    wheelFrameTime = 0
    scheduleCardUpdate()
    return
  }

  const progress = 1 - Math.exp(-WHEEL_SMOOTHING * deltaTime)
  viewport.scrollLeft = current + distance * progress
  scheduleCardUpdate()
  wheelFrame = window.requestAnimationFrame(animateWheelScroll)
}

function scheduleWheelAnimation() {
  if (wheelFrame) return
  isWheelAnimating = true
  wheelFrame = window.requestAnimationFrame(animateWheelScroll)
}

function handleWheel(event) {
  const viewport = viewportRef.value
  if (!viewport || event.ctrlKey || event.metaKey) return

  const deltaUnit =
    event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1
  const deltaX = event.deltaX * deltaUnit
  const deltaY = event.deltaY * deltaUnit

  if (Math.abs(deltaX) > Math.abs(deltaY) && deltaY === 0) {
    stopWheelAnimation()
    allowScrollSnap = true
    scheduleSnap()
    return
  }

  if (!deltaY) return

  const maxScroll = Math.max(viewport.scrollWidth - viewport.clientWidth, 0)
  if (!isWheelAnimating) targetScrollLeft = viewport.scrollLeft
  const projected = Math.min(Math.max(targetScrollLeft, 0), maxScroll)
  const atStart = deltaY < 0 && projected <= 1
  const atEnd = deltaY > 0 && projected >= maxScroll - 1
  if (atStart || atEnd) return

  event.preventDefault()
  stopSnapAnimation()
  allowScrollSnap = true

  const delta = Math.min(
    Math.max(deltaY * WHEEL_MULTIPLIER, -MAX_WHEEL_STEP),
    MAX_WHEEL_STEP
  )
  targetScrollLeft = Math.min(Math.max(targetScrollLeft + delta, 0), maxScroll)

  scheduleWheelAnimation()
  scheduleSnap()
}

function handlePointerDown(event) {
  stopWheelAnimation()
  stopSnapAnimation()
  if (event.pointerType === 'mouse') return
  allowScrollSnap = true
}

function handleViewportScroll() {
  scheduleCardUpdate()
  scheduleSnap()
}

function handleScrollEnd() {
  if (!isSnapping) return
  window.clearTimeout(snapEndTimer)
  snapEndTimer = 0
  isSnapping = false
}

function moveBy(offset) {
  const nextIndex = clampIndex(activeIndex.value + offset)
  centerCard(nextIndex)
}

function handleFocusIn(event) {
  const slide = event.target.closest?.('[data-carousel-index]')
  if (!slide) return

  const index = Number(slide.dataset.carouselIndex)
  if (!Number.isInteger(index)) return
  centerCard(index)
}

function handleKeydown(event) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    moveBy(-1)
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    moveBy(1)
  }
}

function applyLayout({
  defer = true,
  onReady = null
} = {}) {
  const viewport = viewportRef.value
  const track = trackRef.value
  if (!viewport || !track) {
    onReady?.()
    return false
  }

  const sidePeek = Math.min(Math.max(viewport.clientWidth * 0.08, 28), 44)
  const cardWidth = Math.min(
    500,
    Math.max(240, viewport.clientWidth - sidePeek * 2)
  )
  track.style.setProperty('--carousel-card-width', `${cardWidth.toFixed(2)}px`)

  const firstCard = cardElements.get(0)
  if (!firstCard) {
    onReady?.()
    return false
  }

  const edgeSpace = Math.max((viewport.clientWidth - firstCard.offsetWidth) / 2, 0)
  track.style.setProperty('--carousel-inline-space', `${edgeSpace}px`)

  const finishLayout = () => {
    centerCard(activeIndex.value, 'auto')
    updateCards()
    onReady?.()
  }

  if (defer) window.requestAnimationFrame(finishLayout)
  else finishLayout()

  return true
}

function updateLayout() {
  applyLayout()
}

onMounted(() => {
  const viewport = viewportRef.value
  if (!viewport) return

  const savedGameKey = returningGameKey.value || readActiveGameKey()
  const savedIndex = props.games.findIndex(
    (game) => getGameCardKey(game) === savedGameKey
  )
  if (savedIndex >= 0) {
    activeIndex.value = savedIndex
    rememberActiveGame(savedGameKey)
  }

  viewport.addEventListener('scroll', handleViewportScroll, { passive: true })
  viewport.addEventListener('wheel', handleWheel, { passive: false })
  viewport.addEventListener('pointerdown', handlePointerDown, { passive: true })
  viewport.addEventListener('scrollend', handleScrollEnd, { passive: true })
  resizeObserver = new ResizeObserver(updateLayout)
  resizeObserver.observe(viewport)
  applyLayout({
    defer: false,
    onReady: returningGameKey.value
      ? signalGameCarouselReady
      : undefined
  })
})

onBeforeUnmount(() => {
  viewportRef.value?.removeEventListener('scroll', handleViewportScroll)
  viewportRef.value?.removeEventListener('wheel', handleWheel)
  viewportRef.value?.removeEventListener('pointerdown', handlePointerDown)
  viewportRef.value?.removeEventListener('scrollend', handleScrollEnd)
  resizeObserver?.disconnect()
  resizeObserver = null
  cardElements.clear()
  stopWheelAnimation()
  clearSnapTimer()
  window.clearTimeout(snapEndTimer)

  if (updateFrame) {
    window.cancelAnimationFrame(updateFrame)
    updateFrame = 0
  }

})
</script>

<template>
  <div
    class="game-carousel"
    role="region"
    aria-roledescription="carousel"
    aria-label="汉化游戏列表"
    @focusin="handleFocusIn"
    @keydown="handleKeydown"
  >
    <div
      ref="viewportRef"
      class="game-carousel__viewport"
      tabindex="0"
    >
      <ul ref="trackRef" class="game-carousel__track">
        <li
          v-for="(game, index) in games"
          :key="game.url || game.id || game.title"
          :ref="(element) => setCardRef(element, index)"
          class="game-carousel__slide"
          :class="{ 'is-active': index === activeIndex }"
          :data-carousel-index="index"
        >
          <GameCarouselCard
            :game="game"
            :active="index === activeIndex"
            :transition-key="returningGameKey"
          />
        </li>
      </ul>
    </div>

    <p class="game-carousel__status" aria-live="polite">
      {{ activeGame ? `当前游戏：${activeGame.title}` : '' }}
    </p>
  </div>
</template>

<style scoped>
.game-carousel {
  --carousel-card-width: min(500px, calc(100vw - 104px));
  position: relative;
  width: calc(100% + var(--page-inline) * 2);
  margin-inline: calc(var(--page-inline) * -1);
  margin-top: clamp(10px, 2svh, 18px);
}

.game-carousel__viewport {
  overflow-x: auto;
  overflow-y: hidden;
  padding-block: 30px 38px;
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
}

.game-carousel__viewport::-webkit-scrollbar {
  display: none;
}

.game-carousel__viewport:focus-visible {
  outline: 2px solid rgba(184, 216, 255, 0.82);
  outline-offset: -2px;
}

.game-carousel__track {
  display: flex;
  width: max-content;
  min-width: 100%;
  align-items: flex-start;
  gap: clamp(18px, 2.4vw, 28px);
  margin: 0;
  padding-inline: var(--carousel-inline-space, 24px);
  list-style: none;
}

.game-carousel__slide {
  --carousel-filter: none;
  --carousel-shade: 0;
  --carousel-opacity: 1;
  --carousel-scale: 1;
  --carousel-x: 0px;
  --carousel-y: 0px;
  flex: 0 0 var(--carousel-card-width);
  min-width: 0;
  transform:
    translate3d(var(--carousel-x), var(--carousel-y), 0)
    scale(var(--carousel-scale));
  transform-origin: center center;
  opacity: var(--carousel-opacity);
  filter: var(--carousel-filter);
}

.game-carousel__slide.is-active {
  z-index: 2;
}

.game-carousel__status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 680px) {
  .game-carousel__viewport {
    padding-block: 24px 34px;
  }
}
</style>
