import { nextTick } from 'vue'
import { useRouter } from 'vitepress'
import { recordBackTransition } from '../navigation/backTransitionDiagnostics.js'

const FALLBACK_FADE_MS = 140
const VIEW_TRANSITION_READY_TIMEOUT_MS = 4000
const VIEW_TRANSITION_FINISH_TIMEOUT_MS = 1200
const ROUTE_FALLBACK_CLASS = 'route-fallback-leaving'
const TRANSITIONING_CLASS = 'game-route-transitioning'

function waitForViewTransition(transition) {
  return new Promise((resolve) => {
    let settled = false
    let readyTimeout = 0
    let finishTimeout = 0

    const finish = (result) => {
      if (settled) return
      settled = true
      window.clearTimeout(readyTimeout)
      window.clearTimeout(finishTimeout)
      resolve(result)
    }

    readyTimeout = window.setTimeout(
      () => finish('ready-timeout'),
      VIEW_TRANSITION_READY_TIMEOUT_MS
    )

    transition.ready.then(
      () => {
        window.clearTimeout(readyTimeout)
        finishTimeout = window.setTimeout(() => {
          transition.skipTransition?.()
          finish('finish-timeout')
        }, VIEW_TRANSITION_FINISH_TIMEOUT_MS)
        transition.finished.then(
          () => finish('finished'),
          () => finish('rejected')
        )
      },
      () => finish('ready-rejected')
    )
  })
}

async function clearActiveViewTransition() {
  const activeTransition = document.activeViewTransition
  if (!activeTransition) return

  recordBackTransition('view-transition:skip-active')
  activeTransition.skipTransition?.()

  // 等浏览器移除上一组伪元素后再创建新过渡。
  await new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve)
    })
  })
  recordBackTransition('view-transition:active-cleared', {
    activeViewTransition: Boolean(document.activeViewTransition)
  })
}

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
    recordBackTransition('navigate:enter', {
      href,
      navigating
    })
    if (navigating) {
      recordBackTransition('navigate:blocked')
      return
    }
    navigating = true

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const hasViewTransition =
      typeof document.startViewTransition === 'function'
    recordBackTransition('navigate:mode', {
      reducedMotion,
      hasViewTransition,
      activeViewTransition: Boolean(document.activeViewTransition)
    })

    if (hasViewTransition) {
      await clearActiveViewTransition()
    }

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

    if (hasViewTransition) {
      document.documentElement.classList.add(TRANSITIONING_CLASS)
      const startedAt = window.performance.now()
      try {
        const transition = document.startViewTransition(async () => {
          await router.go(href)
          await nextTick()
          await afterRouteChange?.()
        })
        recordBackTransition('view-transition:created')
        transition.ready.then(
          () => recordBackTransition('view-transition:ready'),
          (error) => recordBackTransition('view-transition:ready-error', {
            message: error?.message || String(error)
          })
        )
        const result = await waitForViewTransition(transition)
        recordBackTransition('view-transition:settled', {
          result,
          elapsedMs: Math.round(window.performance.now() - startedAt)
        })
      } catch {
        recordBackTransition('view-transition:failed')
        // 浏览器中止过渡时保留当前路由，不重复跳转
      } finally {
        document.documentElement.classList.remove(TRANSITIONING_CLASS)
        await finishTransition(onFinished)
        recordBackTransition('view-transition:cleanup')
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
        recordBackTransition('fallback:cleanup')
      })
    }
  }

  return {
    navigate
  }
}
