import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'
import { useRouter } from 'vitepress'
import {
  beginGameReturn,
  endGameReturn,
  getGameCardKey,
  readActiveGameKey,
  rememberActiveGame,
  waitForGameCarouselReady
} from '../components/games/gameCarouselState.js'
import {
  normalizeSitePath,
  toSiteHref
} from '../navigation/sitePaths.js'
import { getScrollTargetTop } from './usePageSectionSnap.js'
import { useViewTransitionNavigation } from './useViewTransitionNavigation.js'

const RETURN_INPUT_SETTLE_MS = 100

export function useSiteRouteTransitions({
  route,
  isHome,
  isGamePage,
  siteHomePath,
  scrollToSection,
  scrollOffset = 0,
  refreshHomeScrollState = () => {},
  suspendHomeAlignment = () => {},
  resumeHomeAlignment = () => {},
  waitForHomeVisuals = () => Promise.resolve(),
  homeHistory
}) {
  const routeLeaving = ref(false)
  const gameReturnPending = ref(false)
  const router = useRouter()
  const { navigate: navigateWithTransition } = useViewTransitionNavigation()
  let previousScrollRestoration = 'auto'
  let previousBeforeRouteChange = null
  let previousBeforePageLoad = null
  let gameReturnTimer = 0
  let pendingReturnHref = ''
  let gameReturnRequestId = 0
  let committingGameReturn = false

  watch(isGamePage, (gamePage) => {
    if (gamePage && typeof window !== 'undefined') {
      rememberActiveGame(getGameCardKey({ url: route.path }))
    }
  }, { immediate: true })

  function getAnchorId(anchor) {
    const source = anchor ?? window.location.hash
    return String(source).replace(/^#/, '')
  }

  function findAnchorTarget(anchorId) {
    try {
      return document.getElementById(decodeURIComponent(anchorId))
    } catch {
      return document.getElementById(anchorId)
    }
  }

  function getLocationKey(href = window.location.href) {
    const url = new URL(href, window.location.origin)
    return `${url.pathname}${url.search}${url.hash}`
  }

  function applyHomeAnchor(anchor) {
    if (!isHome.value) return false

    const anchorId = getAnchorId(anchor)
    if (!anchorId) {
      window.scrollTo({ top: 0, behavior: 'auto' })
      refreshHomeScrollState()
      return true
    }

    const target = findAnchorTarget(anchorId)
    if (!target) return false

    window.scrollTo({
      top: getScrollTargetTop(target, scrollOffset),
      behavior: 'auto'
    })
    refreshHomeScrollState()
    return true
  }

  function waitForHomeAnchor(anchorId) {
    return new Promise((resolve) => {
      let observer = null
      let timeout = 0

      const finish = (target) => {
        observer?.disconnect()
        window.clearTimeout(timeout)
        resolve(target)
      }

      const target = findAnchorTarget(anchorId)
      if (target) {
        finish(target)
        return
      }

      observer = new MutationObserver(() => {
        const nextTarget = findAnchorTarget(anchorId)
        if (nextTarget) finish(nextTarget)
      })
      observer.observe(document.body, { childList: true, subtree: true })
      timeout = window.setTimeout(() => finish(null), 800)
    })
  }

  async function restoreHomeAnchor(anchor) {
    if (!isHome.value) return false

    const anchorId = getAnchorId(anchor)
    if (!anchorId) return applyHomeAnchor()
    if (!findAnchorTarget(anchorId)) {
      await waitForHomeAnchor(anchorId)
    }

    return applyHomeAnchor(`#${anchorId}`)
  }

  function waitForStableHomeAnchor(anchor) {
    return new Promise((resolve) => {
      const anchorId = getAnchorId(anchor)
      const startedAt = window.performance.now()
      let previousTop = null
      let stableFrames = 0

      const check = () => {
        if (!isHome.value) {
          resolve(false)
          return
        }

        const target = findAnchorTarget(anchorId)
        const top = target
          ? getScrollTargetTop(target, scrollOffset)
          : null

        if (
          top !== null &&
          previousTop !== null &&
          Math.abs(top - previousTop) <= 0.1
        ) {
          stableFrames += 1
        } else {
          stableFrames = 0
        }

        previousTop = top
        if (
          stableFrames >= 2 ||
          window.performance.now() - startedAt >= 350
        ) {
          resolve(top !== null)
          return
        }

        window.requestAnimationFrame(check)
      }

      window.requestAnimationFrame(check)
    })
  }

  function interceptGameReturn(href) {
    if (routeLeaving.value || committingGameReturn) return
    if (!isGamePage.value) return

    const targetPath = normalizeSitePath(
      new URL(href, window.location.origin).pathname
    )
    if (targetPath !== normalizeSitePath(siteHomePath.value)) return

    const gameKey = readActiveGameKey()
    if (!gameKey) return

    if (!gameReturnPending.value) {
      gameReturnPending.value = true
      suspendHomeAlignment()
      homeHistory.suspend()
      beginGameReturn(gameKey)
    }

    const returnHref = new URL(href, window.location.origin).href
    const requestId = ++gameReturnRequestId
    pendingReturnHref = returnHref
    window.clearTimeout(gameReturnTimer)
    gameReturnTimer = window.setTimeout(() => {
      gameReturnTimer = 0
      if (requestId !== gameReturnRequestId || !pendingReturnHref) return

      const settledHref = pendingReturnHref
      pendingReturnHref = ''
      const returnAnchor = new URL(settledHref).hash || '#games'
      const returnLocation = getLocationKey(settledHref)

      committingGameReturn = true
      void (async () => {
        try {
          await waitForHomeVisuals(settledHref)
          await navigateWithTransition(settledHref, {
            preempt: true,
            shouldCommitRoute: () => getLocationKey() === returnLocation,
            afterRouteChange: async () => {
              await restoreHomeAnchor(returnAnchor)
              await waitForGameCarouselReady()
              await restoreHomeAnchor(returnAnchor)
              await nextTick()
              homeHistory.resume()
            }
          })
        } catch {
          // 路由更新失败时由 VitePress 的下一次页面加载恢复
        } finally {
          committingGameReturn = false
          if (requestId !== gameReturnRequestId) return
          endGameReturn()
          gameReturnPending.value = false
          resumeHomeAlignment()
          homeHistory.resume()
        }
      })()
    }, RETURN_INPUT_SETTLE_MS)

    // 阻止 VitePress 在旧页面状态下先完成这次返回。
    return false
  }

  async function handleGameCatalogReturn() {
    if (gameReturnPending.value) return
    gameReturnPending.value = true
    suspendHomeAlignment()
    homeHistory.suspend()
    beginGameReturn(getGameCardKey({ url: route.path }))

    try {
      committingGameReturn = true
      const returnHref = toSiteHref('/#games')
      await waitForHomeVisuals(returnHref)
      await navigateWithTransition(returnHref, {
        afterRouteChange: async () => {
          await restoreHomeAnchor('games')
          await waitForGameCarouselReady()
          await restoreHomeAnchor('games')
          await nextTick()
          homeHistory.resume()
        },
        onFinished: endGameReturn
      })
    } finally {
      committingGameReturn = false
      gameReturnPending.value = false
      resumeHomeAlignment()
      homeHistory.resume()
    }
  }

  async function leaveHomeTo(href) {
    if (routeLeaving.value) return

    suspendHomeAlignment()
    homeHistory.suspend()
    routeLeaving.value = true
    await new Promise((resolve) => window.setTimeout(resolve, 180))

    try {
      await waitForHomeVisuals(href)
      await router.go(href)
      await nextTick()
      await restoreHomeAnchor()
      await waitForStableHomeAnchor()
      await restoreHomeAnchor()
      homeHistory.resume()
    } finally {
      resumeHomeAlignment()
      window.setTimeout(() => {
        routeLeaving.value = false
      }, 0)
    }
  }

  function navigateToHomeSection(target, sectionId) {
    homeHistory.pushSection(sectionId)
    return new Promise((resolve) => {
      const started = scrollToSection(target, {
        onFinished: (completed) => {
          homeHistory.finishSectionNavigation(sectionId, completed)
          resolve(completed)
        }
      })

      if (!started) {
        homeHistory.finishSectionNavigation(sectionId, false)
        resolve(false)
      }
    })
  }

  async function handleSectionNavigation(event, item) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    if (!isHome.value && isGamePage.value && item.id === 'games') {
      event.preventDefault()
      event.stopPropagation()
      await handleGameCatalogReturn()
      return
    }

    if (!isHome.value) {
      event.preventDefault()
      event.stopPropagation()
      await leaveHomeTo(item.href)
      return
    }

    const target = document.getElementById(item.id)
    if (!target) return

    event.preventDefault()
    event.stopPropagation()
    navigateToHomeSection(target, item.id)
  }

  async function handleHomeNavigation(event, {
    waitForCompletion = false
  } = {}) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    if (isHome.value) {
      const hero = document.querySelector('.home-hero')
      if (!hero) return

      event.preventDefault()
      event.stopPropagation()
      const navigation = navigateToHomeSection(hero, '')
      if (waitForCompletion) await navigation
      return
    }

    event.preventDefault()
    event.stopPropagation()
    await leaveHomeTo(toSiteHref('/'))
  }

  onMounted(() => {
    previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    previousBeforeRouteChange = router.onBeforeRouteChange
    router.onBeforeRouteChange = async (href) => {
      const previousResult = await previousBeforeRouteChange?.(href)
      if (previousResult === false) return false
      if (isHome.value) homeHistory.commitCurrentSection()
    }

    previousBeforePageLoad = router.onBeforePageLoad
    router.onBeforePageLoad = async (href) => {
      const previousResult = await previousBeforePageLoad?.(href)
      if (previousResult === false) return false
      return interceptGameReturn(href)
    }
  })

  onBeforeUnmount(() => {
    gameReturnRequestId += 1
    pendingReturnHref = ''
    committingGameReturn = false
    window.clearTimeout(gameReturnTimer)
    router.onBeforeRouteChange = previousBeforeRouteChange
    router.onBeforePageLoad = previousBeforePageLoad
    window.history.scrollRestoration = previousScrollRestoration
  })

  return {
    routeLeaving,
    restoreHomeAnchor,
    handleSectionNavigation,
    handleHomeNavigation
  }
}
