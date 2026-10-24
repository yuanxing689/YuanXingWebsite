import { nextTick } from 'vue'
import { useRouter } from 'vitepress'

const FALLBACK_FADE_MS = 140
const ROUTE_FALLBACK_CLASS = 'route-fallback-leaving'
const TRANSITIONING_CLASS = 'game-route-transitioning'

export function useViewTransitionNavigation() {
  const router = useRouter()
  let navigating = false

  async function finishTransition(onFinished) {
    try {
      onFinished?.()
    } finally {
      navigating = false
    }
  }

  async function navigate(href, {
    afterRouteChange = null,
    onFinished = null
  } = {}) {
    if (navigating) return
    navigating = true

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (reducedMotion) {
      try {
        await router.go(href)
        await nextTick()
        await afterRouteChange?.()
      } finally {
        try {
          onFinished?.()
        } finally {
          navigating = false
        }
      }
      return
    }

    if (typeof document.startViewTransition === 'function') {
      document.documentElement.classList.add(TRANSITIONING_CLASS)
      try {
        const transition = document.startViewTransition(async () => {
          await router.go(href)
          await nextTick()
          await afterRouteChange?.()
        })
        await transition.finished
      } catch {
        // 浏览器中止过渡时保留当前路由，不重复跳转
      } finally {
        document.documentElement.classList.remove(TRANSITIONING_CLASS)
        await finishTransition(onFinished)
      }
      return
    }

    document.documentElement.classList.add(ROUTE_FALLBACK_CLASS)
    document.documentElement.classList.add(TRANSITIONING_CLASS)
    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, FALLBACK_FADE_MS)
      })
      await router.go(href)
      await nextTick()
      await afterRouteChange?.()
    } finally {
      window.requestAnimationFrame(() => {
        document.documentElement.classList.remove(ROUTE_FALLBACK_CLASS)
        document.documentElement.classList.remove(TRANSITIONING_CLASS)
        finishTransition(onFinished)
      })
    }
  }

  async function transitionExistingNavigation({
    waitFor = null,
    onFinished = null
  } = {}) {
    if (navigating) return false
    navigating = true

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (reducedMotion) {
      try {
        await waitFor?.()
      } finally {
        await finishTransition(onFinished)
      }
      return false
    }

    if (typeof document.startViewTransition !== 'function') {
      document.documentElement.classList.add(ROUTE_FALLBACK_CLASS)
      document.documentElement.classList.add(TRANSITIONING_CLASS)
      try {
        await waitFor?.()
      } finally {
        window.requestAnimationFrame(() => {
          document.documentElement.classList.remove(ROUTE_FALLBACK_CLASS)
          document.documentElement.classList.remove(TRANSITIONING_CLASS)
          finishTransition(onFinished)
        })
      }
      return false
    }

    document.documentElement.classList.add(TRANSITIONING_CLASS)
    try {
      const transition = document.startViewTransition(async () => {
        await waitFor?.()
      })
      await transition.finished
    } catch {
      // 浏览器中止过渡时保留已经完成的路由切换
    } finally {
      document.documentElement.classList.remove(TRANSITIONING_CLASS)
      await finishTransition(onFinished)
    }

    return true
  }

  return {
    navigate,
    transitionExistingNavigation
  }
}
