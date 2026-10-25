import {
  computed,
  onMounted,
  ref,
  watch
} from 'vue'
import { useHomeHistory } from '../../features/home/history/useHomeHistory.js'
import { useIntroController } from '../../features/home/intro/useIntroController.js'
import { usePageSectionSnap } from '../../features/home/scroll/usePageSectionSnap.js'
import { useHomePageState } from '../../features/home/state/useHomePageState.js'
import { createNavigationContextStore } from '../navigation/navigationContext.js'
import {
  normalizeSitePath,
  toSiteHref
} from '../navigation/sitePaths.js'
import { useSiteRouteTransitions } from '../navigation/useSiteRouteTransitions.js'

/**
 * 应用组合服务：创建导航事务、首页状态、开场与转场协调器。
 * Layout 只接收这里暴露的状态和事件处理器。
 */
export function useSiteApplication({
  route,
  frontmatter,
  page,
  site
}) {
  const siteChromeRef = ref(null)
  const navigationContexts = createNavigationContextStore()
  const siteHomePath = computed(() => normalizeSitePath(toSiteHref('/')))
  const isHome = computed(() => {
    const homePath = siteHomePath.value
    if (normalizeSitePath(route.path) === homePath) return true

    return (
      typeof window !== 'undefined' &&
      normalizeSitePath(window.location.pathname) === homePath
    )
  })
  const isGamePage = computed(() => frontmatter.value?.type === 'game')
  const isNotFound = computed(() => page.value?.isNotFound === true)
  const siteScrollOffset = site.value.scrollOffset ?? 0

  const {
    introLocked,
    enterHome: enterHomeIntro,
    leaveHome: leaveHomeIntro,
    prepareHomeVisualScene,
    updateSceneFrame,
    handleSceneReady,
    handleSceneError
  } = useIntroController({
    isHome,
    getHomeScene: () => siteChromeRef.value?.getHomeScene?.() ?? null
  })

  const {
    viewport,
    navigationViewport,
    scrollProgress,
    activeSection,
    pendingSection,
    setPendingSection,
    clearPendingSection,
    refreshLayout
  } = useHomePageState({ isHome })

  const {
    scrollToSection,
    suspendAutoAlignment,
    resumeAutoAlignment
  } = usePageSectionSnap({
    enabled: isHome,
    scrollOffset: siteScrollOffset
  })
  const homeHistory = useHomeHistory({
    isHome,
    activeSection,
    pendingSection,
    setPendingSection,
    clearPendingSection,
    navigationContexts
  })
  const {
    routeLeaving,
    restoreHomeAnchor,
    handleSectionNavigation,
    handleHomeNavigation
  } = useSiteRouteTransitions({
    route,
    isHome,
    isGamePage,
    siteHomePath,
    scrollToSection,
    scrollOffset: siteScrollOffset,
    refreshHomeScrollState: refreshLayout,
    suspendHomeAlignment: suspendAutoAlignment,
    resumeHomeAlignment: resumeAutoAlignment,
    waitForHomeVisuals: prepareHomeVisualsBeforeNavigation,
    homeHistory,
    navigationContexts
  })

  function waitForChromeVisuals() {
    return siteChromeRef.value?.waitForVisualReady?.() ?? Promise.resolve()
  }

  async function prepareHomeVisualsBeforeNavigation(href = '/') {
    const target = new URL(href, window.location.origin)
    const logoVisible = !target.hash || target.hash === '#'

    prepareHomeVisualScene()
    siteChromeRef.value?.prepareHomeVisuals({ logoVisible })
    await waitForChromeVisuals()
  }

  function isPlainPrimaryClick(event) {
    return (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    )
  }

  async function handleBrandSelect(event) {
    const chrome = siteChromeRef.value
    const shouldFade = isPlainPrimaryClick(event) && Boolean(chrome)

    if (shouldFade) chrome.beginBrandTransition()

    try {
      await handleHomeNavigation(event, { waitForCompletion: true })
    } finally {
      if (shouldFade) chrome.endBrandTransition()
    }
  }

  function handleNavigationSceneError(error) {
    console.error('导航星场景初始化失败，已切换到静态降级。', error)
  }

  watch(isHome, async (home) => {
    refreshLayout()
    await waitForChromeVisuals()

    if (!home) {
      leaveHomeIntro()
      return
    }

    await enterHomeIntro()
  }, { flush: 'post' })

  onMounted(async () => {
    await waitForChromeVisuals()

    if (isHome.value) {
      await restoreHomeAnchor()
      refreshLayout()
      homeHistory.start()
      await enterHomeIntro()
      return
    }

    leaveHomeIntro()
  })

  return {
    siteChromeRef,
    siteHomePath,
    isHome,
    isGamePage,
    isNotFound,
    introLocked,
    viewport,
    navigationViewport,
    scrollProgress,
    activeSection,
    routeLeaving,
    updateSceneFrame,
    handleSceneReady,
    handleSceneError,
    handleNavigationSceneError,
    handleSectionNavigation,
    handleBrandSelect,
    brandHref: toSiteHref('/'),
    brandMarkSrc: toSiteHref('/images/brand/logo-mark.png')
  }
}
