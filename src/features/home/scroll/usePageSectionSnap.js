import { onBeforeUnmount, onMounted, watch } from 'vue'

const SNAP_RATIO = 0.42
const IDLE_DELAY = 180
const SNAP_MIN_DURATION = 380
const SNAP_MAX_DURATION = 650
const SNAP_DURATION_PER_PIXEL = 1.2
const NAV_MIN_DURATION = 420
const NAV_MAX_DURATION = 760
const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' '
])

export function getDocumentTop(element) {
  const top = element.getBoundingClientRect().top + window.scrollY
  const transform = window.getComputedStyle(element).transform
  if (transform === 'none' || !window.DOMMatrixReadOnly) return top

  return top - new window.DOMMatrixReadOnly(transform).m42
}

export function getScrollTargetTop(element, scrollOffset = 0) {
  const top = getDocumentTop(element)
  if (!element.classList.contains('home-section')) return top

  const paddingTop = Number.parseFloat(
    window.getComputedStyle(element).paddingTop
  ) || 0
  return top - scrollOffset + paddingTop
}

export function usePageSectionSnap({ enabled, scrollOffset = 0 }) {
  let idleTimer = 0
  let snapFrame = 0
  let snapToken = 0
  let stopEnabledWatch = null
  let isSnapping = false
  let alignmentSuspended = false
  let activeSnapCallback = null

  function canSnap() {
    return (
      enabled.value &&
      !alignmentSuspended &&
      window.innerWidth > 680 &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  function clearIdleTimer() {
    window.clearTimeout(idleTimer)
    idleTimer = 0
  }

  function scheduleAlignment() {
    clearIdleTimer()
    idleTimer = window.setTimeout(alignNearestSection, IDLE_DELAY)
  }

  function finishSnap(completed = false) {
    const onFinished = activeSnapCallback
    activeSnapCallback = null

    if (snapFrame) {
      window.cancelAnimationFrame(snapFrame)
      snapFrame = 0
    }

    snapToken += 1
    isSnapping = false
    onFinished?.(completed)
  }

  function cancelSnap() {
    clearIdleTimer()
    if (!isSnapping) return

    finishSnap()
  }

  function suspendAutoAlignment() {
    alignmentSuspended = true
    cancelSnap()
  }

  function resumeAutoAlignment() {
    alignmentSuspended = false
  }

  function getSnapTargets() {
    return Array.from(document.querySelectorAll('.home-hero, .home-section'))
      .map((element) => getScrollTargetTop(element, scrollOffset))
      .sort((a, b) => a - b)
  }

  function alignNearestSection() {
    idleTimer = 0
    if (!canSnap() || isSnapping) return

    const targets = getSnapTargets()
    if (!targets.length) return

    const current = window.scrollY
    const nearest = targets.reduce((best, target) =>
      Math.abs(target - current) < Math.abs(best - current) ? target : best
    )
    const threshold = Math.min(
      Math.max(window.innerHeight * SNAP_RATIO, 160),
      420
    )

    if (Math.abs(nearest - current) <= 1) return
    if (Math.abs(nearest - current) > threshold) return

    startSnap(nearest)
  }

  function startSnap(
    target,
    minDuration = SNAP_MIN_DURATION,
    maxDuration = SNAP_MAX_DURATION,
    onFinished = null
  ) {
    finishSnap()

    const start = window.scrollY
    const distance = target - start
    const duration = Math.min(
      Math.max(Math.abs(distance) * SNAP_DURATION_PER_PIXEL, minDuration),
      maxDuration
    )
    const startedAt = window.performance.now()
    const token = ++snapToken

    isSnapping = true
    activeSnapCallback = onFinished

    const step = (timestamp) => {
      if (!isSnapping || token !== snapToken) return

      const progress = Math.min((timestamp - startedAt) / duration, 1)
      const eased =
        progress * progress * progress *
        (progress * (progress * 6 - 15) + 10)
      window.scrollTo({ top: start + distance * eased, behavior: 'auto' })

      if (progress < 1) {
        snapFrame = window.requestAnimationFrame(step)
        return
      }

      snapFrame = 0
      isSnapping = false
      const finish = activeSnapCallback
      activeSnapCallback = null
      finish?.(true)
    }

    snapFrame = window.requestAnimationFrame(step)
  }

  function scrollToSection(target, {
    onFinished = null
  } = {}) {
    if (!enabled.value) return false

    const element =
      typeof target === 'string' ? document.querySelector(target) : target
    if (!element) return false

    clearIdleTimer()
    finishSnap()

    const destination = getScrollTargetTop(element, scrollOffset)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion || Math.abs(destination - window.scrollY) <= 1) {
      window.scrollTo({ top: destination, behavior: 'auto' })
      onFinished?.(true)
      return true
    }

    startSnap(
      destination,
      NAV_MIN_DURATION,
      NAV_MAX_DURATION,
      onFinished
    )
    return true
  }

  function handleScroll() {
    if (!canSnap() || isSnapping) return
    scheduleAlignment()
  }

  function handleScrollEnd() {
    if (!enabled.value || alignmentSuspended) return

    if (isSnapping) return

    scheduleAlignment()
  }

  function handleInput() {
    cancelSnap()
  }

  function handleKeydown(event) {
    if (SCROLL_KEYS.has(event.key)) cancelSnap()
  }

  function handleResize() {
    cancelSnap()
    clearIdleTimer()
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('scrollend', handleScrollEnd, { passive: true })
    window.addEventListener('wheel', handleInput, { passive: true })
    window.addEventListener('touchstart', handleInput, { passive: true })
    window.addEventListener('pointerdown', handleInput, { passive: true })
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('resize', handleResize)

    stopEnabledWatch = watch(enabled, (active) => {
      if (active) return
      cancelSnap()
      clearIdleTimer()
    })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('scrollend', handleScrollEnd)
    window.removeEventListener('wheel', handleInput)
    window.removeEventListener('touchstart', handleInput)
    window.removeEventListener('pointerdown', handleInput)
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('resize', handleResize)
    stopEnabledWatch?.()
    stopEnabledWatch = null
    finishSnap()
    clearIdleTimer()
  })

  return {
    scrollToSection,
    suspendAutoAlignment,
    resumeAutoAlignment
  }
}
