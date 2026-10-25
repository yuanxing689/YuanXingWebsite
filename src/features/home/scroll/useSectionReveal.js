import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useSectionReveal() {
  const target = ref(null)
  const ready = ref(false)
  const revealed = ref(false)
  let observer = null
  let scrollFrame = 0
  let handleScroll = null

  function scheduleOutsideCheck(element) {
    if (scrollFrame) return
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0
      const bounds = element.getBoundingClientRect()
      if (bounds.bottom <= 1 || bounds.top >= window.innerHeight - 1) {
        revealed.value = false
      }
    })
  }

  onMounted(() => {
    const element = target.value
    if (!element) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const bounds = element.getBoundingClientRect()
    const alreadyVisible = bounds.top < window.innerHeight * 0.85 && bounds.bottom > 0
    ready.value = true

    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealed.value = true
      return
    }

    revealed.value = alreadyVisible

    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        if (!entry) return

        if (!entry.isIntersecting) {
          revealed.value = false
          return
        }

        if (entry.intersectionRatio >= 0.12) revealed.value = true
      },
      { threshold: [0, 0.12] }
    )
    observer.observe(element)
    handleScroll = () => scheduleOutsideCheck(element)
    window.addEventListener('scroll', handleScroll, { passive: true })
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    if (handleScroll) window.removeEventListener('scroll', handleScroll)
    handleScroll = null
    if (scrollFrame) {
      window.cancelAnimationFrame(scrollFrame)
      scrollFrame = 0
    }
  })

  return { target, ready, revealed }
}
