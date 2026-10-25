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
} from '../../features/games/gameCarouselState.js'
import {
  normalizeSitePath,
  toSiteHref
} from './sitePaths.js'
import { createBrowserHistoryGateway } from './browserHistoryGateway.js'
import {
  HISTORY_STRATEGIES,
  NAVIGATION_OPERATIONS,
  NAVIGATION_SOURCES,
  TRANSITION_STRATEGIES
} from './contracts.js'
import { createHistoryTransitionBridge } from './historyTransitionBridge.js'
import { createVitePressRouterAdapter } from './vitePressRouterAdapter.js'
import { getScrollTargetTop } from '../../features/home/scroll/usePageSectionSnap.js'
import { useViewTransitionNavigation } from '../transitions/useViewTransitionNavigation.js'

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
  const historyGateway = createBrowserHistoryGateway()
  const routerAdapter = createVitePressRouterAdapter(router)
  const { navigate: navigateWithTransition } =
    useViewTransitionNavigation({ routerAdapter })
  const historyTransitionBridge = createHistoryTransitionBridge({
    contexts: routerAdapter.contexts,
    routerAdapter,
    historyGateway
  })
  let previousScrollRestoration = 'auto'
  let uninstallRouterHooks = null
  let committingGameReturn = false
  let automaticReturnPending = false

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

  function finishAutomaticGameReturn() {
    if (!automaticReturnPending) return

    automaticReturnPending = false
    committingGameReturn = false
    endGameReturn()
    gameReturnPending.value = false
    resumeHomeAlignment()
    homeHistory.resume()
  }

  function interceptGameReturn(href, navigationContext) {
    if (routeLeaving.value) return

    const targetPath = normalizeSitePath(
      new URL(href, window.location.origin).pathname
    )
    if (navigationContext?.source !== NAVIGATION_SOURCES.HISTORY_TRAVERSAL) {
      return
    }
    const gameKey = readActiveGameKey()
    const isGameCatalogReturn =
      isGamePage.value &&
      targetPath === normalizeSitePath(siteHomePath.value) &&
      Boolean(gameKey)

    if (!isGameCatalogReturn) {
      if (automaticReturnPending) {
        historyTransitionBridge.cancel('traversal-superseded')
        finishAutomaticGameReturn()
      }
      return
    }

    if (!gameReturnPending.value) {
      gameReturnPending.value = true
      suspendHomeAlignment()
      homeHistory.suspend()
      beginGameReturn(gameKey)
    }

    const settledHref = historyGateway.getHref()
    const returnAnchor = new URL(settledHref).hash || '#games'
    const intent = {
      operation: NAVIGATION_OPERATIONS.RETURN_GAME_CATALOG,
      targetUrl: settledHref,
      sectionId: returnAnchor.replace(/^#/, ''),
      cardKey: gameKey,
      history: HISTORY_STRATEGIES.BRIDGE_SAME_URL,
      transition: TRANSITION_STRATEGIES.SHARED_ELEMENTS,
      restoration: {
        restoreHome: true,
        restoreSection: true,
        restoreCard: true,
        scroll: 'snapshot'
      }
    }

    automaticReturnPending = true
    const started = historyTransitionBridge.request({
      context: navigationContext,
      intent,
      waitForVisuals: () => waitForHomeVisuals(settledHref),
      runTransition: (target, options) =>
        navigateWithTransition(target, options),
      onStarted() {
        committingGameReturn = true
      },
      async afterCommit() {
        await restoreHomeAnchor(returnAnchor)
        await waitForGameCarouselReady()
        await restoreHomeAnchor(returnAnchor)
        await nextTick()
        homeHistory.resume()
      },
      async restoreDefault() {
        window.scrollTo({ top: 0, behavior: 'auto' })
        refreshHomeScrollState()
        await nextTick()
        homeHistory.resume()
      },
      onFinished() {
        finishAutomaticGameReturn()
      }
    })

    if (!started) {
      finishAutomaticGameReturn()
      return
    }

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
      await routerAdapter.navigate(href)
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
    previousScrollRestoration = historyGateway.getScrollRestoration()
    historyGateway.setScrollRestoration('manual')

    uninstallRouterHooks = routerAdapter.install({
      onBeforeRouteChange(href, navigationContext) {
        if (
          automaticReturnPending &&
          navigationContext?.source === NAVIGATION_SOURCES.PROGRAMMATIC
        ) {
          historyTransitionBridge.cancel('programmatic-navigation')
          finishAutomaticGameReturn()
        }
        if (isHome.value) homeHistory.commitCurrentSection()
      },
      onBeforePageLoad(href, navigationContext) {
        return interceptGameReturn(href, navigationContext)
      }
    })
  })

  onBeforeUnmount(() => {
    historyTransitionBridge.cancel('unmount')
    automaticReturnPending = false
    committingGameReturn = false
    uninstallRouterHooks?.()
    uninstallRouterHooks = null
    historyGateway.setScrollRestoration(previousScrollRestoration)
  })

  return {
    routeLeaving,
    restoreHomeAnchor,
    handleSectionNavigation,
    handleHomeNavigation
  }
}
