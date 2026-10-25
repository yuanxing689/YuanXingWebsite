import {
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'

export function useHomeScrollState({ isHome }) {
  const viewport = ref({ width: 1440, height: 900 })
  const navigationViewport = ref({ width: 1440, height: 900 })
  const scrollProgress = ref(0)
  const activeSection = ref('')
  let scrollFrame = 0

  function updateViewport() {
    viewport.value = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    navigationViewport.value = {
      width: window.visualViewport?.width ?? window.innerWidth,
      height: window.visualViewport?.height ?? window.innerHeight
    }
  }

  function updateScrollProgress() {
    scrollProgress.value = Math.min(
      Math.max(window.scrollY / Math.max(window.innerHeight * 0.62, 1), 0),
      1
    )
  }

  function updateActiveSection() {
    if (!isHome.value) {
      activeSection.value = ''
      return
    }

    const activationLine = window.innerHeight * 0.5
    const section = Array.from(document.querySelectorAll('.home-section'))
      .find((element) => {
        const bounds = element.getBoundingClientRect()
        return bounds.top <= activationLine && bounds.bottom > activationLine
      })

    activeSection.value = section?.dataset.section ?? ''
  }

  function refreshLayout() {
    if (scrollFrame) {
      window.cancelAnimationFrame(scrollFrame)
      scrollFrame = 0
    }

    updateViewport()
    updateScrollProgress()
    updateActiveSection()
  }

  function scheduleLayoutRefresh() {
    if (scrollFrame) return

    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0
      refreshLayout()
    })
  }

  watch(isHome, refreshLayout, { flush: 'post' })

  onMounted(() => {
    window.addEventListener('scroll', scheduleLayoutRefresh, { passive: true })
    window.addEventListener('resize', scheduleLayoutRefresh)
    window.visualViewport?.addEventListener(
      'resize',
      scheduleLayoutRefresh
    )
    window.visualViewport?.addEventListener(
      'scroll',
      scheduleLayoutRefresh,
      { passive: true }
    )
    refreshLayout()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', scheduleLayoutRefresh)
    window.removeEventListener('resize', scheduleLayoutRefresh)
    window.visualViewport?.removeEventListener('resize', scheduleLayoutRefresh)
    window.visualViewport?.removeEventListener('scroll', scheduleLayoutRefresh)

    if (scrollFrame) {
      window.cancelAnimationFrame(scrollFrame)
      scrollFrame = 0
    }
  })

  return {
    viewport,
    navigationViewport,
    scrollProgress,
    activeSection,
    refreshLayout
  }
}
