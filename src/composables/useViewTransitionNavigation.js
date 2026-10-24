import { nextTick } from 'vue'
import { useRouter } from 'vitepress'

const FALLBACK_FADE_MS = 140
const TRANSITION_TIMEOUT_MS = 3000
const ROUTE_FALLBACK_CLASS = 'route-fallback-leaving'
const TRANSITIONING_CLASS = 'game-route-transitioning'

let activeTransition = null

function waitForTransitionEnd(transition) {
  return new Promise((resolve) => {
    let settled = false
    let timeout = 0

    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      resolve()
    }

    timeout = window.setTimeout(() => {
      transition.skipTransition?.()
      finish()
    }, TRANSITION_TIMEOUT_MS)

    transition.ready.catch(() => {})
    transition.finished.then(finish, finish)
  })
}

async function settleActiveTransition() {
  const transition =
    document.activeViewTransition || activeTransition
  if (!transition) return

  transition.skipTransition?.()
  await waitForTransitionEnd(transition)

  if (activeTransition === transition) {
    activeTransition = null
  }
}

export function useViewTransitionNavigation() {
  const router = useRouter()
  let navigating = false

  function finishNavigation(onFinished) {
    try {
      onFinished?.()
    } finally {
      navigating = false
    }
  }

  async function navigate(href, {
    afterRouteChange = null,
    onFinished = null,
    preempt = false,
    shouldCommitRoute = null
  } = {}) {
    if (navigating && !preempt) return false
    navigating = true

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    let routeUpdated = false
    const updateRoute = async () => {
      if (shouldCommitRoute && !shouldCommitRoute()) return false
      await router.go(href)
      await nextTick()
      await afterRouteChange?.()
      routeUpdated = true
      return true
    }

    if (reducedMotion) {
      try {
        await settleActiveTransition()
        await updateRoute()
      } finally {
        finishNavigation(onFinished)
      }
      return routeUpdated
    }

    if (typeof document.startViewTransition === 'function') {
      let updateStarted = false
      let transition = null

      await settleActiveTransition()
      document.documentElement.classList.add(TRANSITIONING_CLASS)
      try {
        transition = document.startViewTransition(async () => {
          updateStarted = true
          await updateRoute()
        })
        activeTransition = transition
        await waitForTransitionEnd(transition)
      } catch {
        // 动画被浏览器拒绝时仍要完成路由更新
        if (!updateStarted) await updateRoute()
      } finally {
        if (activeTransition === transition) {
          activeTransition = null
        }
        document.documentElement.classList.remove(TRANSITIONING_CLASS)
        finishNavigation(onFinished)
      }
      return routeUpdated
    }

    await settleActiveTransition()
    document.documentElement.classList.add(ROUTE_FALLBACK_CLASS)
    document.documentElement.classList.add(TRANSITIONING_CLASS)
    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, FALLBACK_FADE_MS)
      })
      await updateRoute()
    } finally {
      await new Promise((resolve) => {
        window.requestAnimationFrame(resolve)
      })
      try {
        document.documentElement.classList.remove(ROUTE_FALLBACK_CLASS)
        document.documentElement.classList.remove(TRANSITIONING_CLASS)
      } finally {
        finishNavigation(onFinished)
      }
    }
    return routeUpdated
  }

  return {
    navigate
  }
}
