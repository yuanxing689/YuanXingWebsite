import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'
import { useRouter } from 'vitepress'
import {
  getGameCardKey,
  readActiveGameKey,
  rememberActiveGame
} from '../../features/games/gameCarouselState.js'
import {
  normalizeSitePath,
  toSiteHref
} from './sitePaths.js'
import { createBrowserHistoryGateway } from './browserHistoryGateway.js'
import { NAVIGATION_SOURCES } from './contracts.js'
import { createHistoryTransitionBridge } from './historyTransitionBridge.js'
import { createGameReturnIntent } from './navigationIntent.js'
import { useNavigationCoordinator } from './navigationCoordinator.js'
import { createVitePressRouterAdapter } from './vitePressRouterAdapter.js'
import {
  createHomeRestorationService
} from '../../features/home/restoration/homeRestorationService.js'

const ROUTE_CONTENT_FADE_MS = 180

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
  homeHistory,
  navigationContexts = null
}) {
  const routeLeaving = ref(false)
  const gameReturnPending = ref(false)
  const router = useRouter()
  const historyGateway = createBrowserHistoryGateway()
  const routerAdapter = createVitePressRouterAdapter(router, {
    ...(navigationContexts ? { contexts: navigationContexts } : {})
  })
  const { navigate: navigateWithTransition } =
    useNavigationCoordinator({ routerAdapter })
  const historyTransitionBridge = createHistoryTransitionBridge({
    contexts: routerAdapter.contexts,
    routerAdapter,
    historyGateway
  })
  const homeRestoration = createHomeRestorationService({
    isHome,
    scrollOffset,
    refresh: refreshHomeScrollState
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

  async function restoreHomeAnchor(anchor) {
    const plan = homeRestoration.createPlan({
      anchor: anchor ?? window.location.hash,
      snapshot: null,
      defaultSection: ''
    })
    return homeRestoration.restore(plan)
  }

  function finishAutomaticGameReturn() {
    if (!automaticReturnPending) return

    automaticReturnPending = false
    committingGameReturn = false
    homeRestoration.finish()
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
    }

    const settledHref = historyGateway.getHref()
    const snapshot = homeRestoration.read()
    const plan = homeRestoration.createPlan({
      anchor: new URL(settledHref).hash,
      snapshot,
      defaultSection: 'games'
    })
    const intent = createGameReturnIntent({
      targetUrl: settledHref,
      sectionId: plan.sectionId,
      cardKey: gameKey,
      fromHistoryTraversal: true
    })

    automaticReturnPending = true
    homeRestoration.prepare(plan)
    const started = historyTransitionBridge.request({
      context: navigationContext,
      intent,
      waitForVisuals: () => waitForHomeVisuals(settledHref),
      runTransition: (target, options) =>
        navigateWithTransition(target, {
          ...options,
          intent
        }),
      onStarted() {
        committingGameReturn = true
      },
      afterCommit() {
        homeRestoration.restoreCommitted(plan)
      },
      restoreDefault() {
        homeRestoration.restoreDefault()
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
    const snapshot = homeRestoration.read()
    const plan = homeRestoration.createPlan({
      anchor: '#games',
      snapshot,
      defaultSection: 'games'
    })
    plan.cardKey =
      plan.cardKey || getGameCardKey({ url: route.path })
    homeRestoration.prepare(plan)

    try {
      committingGameReturn = true
      const returnHref = toSiteHref('/#games')
      await waitForHomeVisuals(returnHref)
      const intent = createGameReturnIntent({
        targetUrl: returnHref,
        sectionId: 'games',
        cardKey: plan.cardKey,
        fromHistoryTraversal: false
      })
      await navigateWithTransition(returnHref, {
        intent,
        afterRouteChange: () => {
          homeRestoration.restoreCommitted(plan)
        }
      })
    } finally {
      committingGameReturn = false
      gameReturnPending.value = false
      homeRestoration.finish()
      resumeHomeAlignment()
      homeHistory.resume()
    }
  }

  async function leaveHomeTo(href) {
    if (routeLeaving.value) return

    suspendHomeAlignment()
    homeHistory.suspend()
    routeLeaving.value = true
    await new Promise((resolve) => {
      window.setTimeout(resolve, ROUTE_CONTENT_FADE_MS)
    })

    try {
      await waitForHomeVisuals(href)
      await routerAdapter.navigate(href)
      await nextTick()
      await restoreHomeAnchor(window.location.hash)
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
