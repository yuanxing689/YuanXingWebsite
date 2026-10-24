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

export function useSiteRouteTransitions({
  route,
  isHome,
  isGamePage,
  siteHomePath,
  scrollToSection,
  scrollOffset = 0,
  refreshHomeScrollState = () => {},
  suspendHomeAlignment = () => {},
  resumeHomeAlignment = () => {}
}) {
  const routeLeaving = ref(false)
  const gameReturnPending = ref(false)
  const router = useRouter()
  const { navigate: navigateWithTransition } = useViewTransitionNavigation()
  let previousScrollRestoration = 'auto'

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

  async function handleBrowserBack(event) {
    if (gameReturnPending.value) return
    if (
      normalizeSitePath(window.location.pathname) !==
      normalizeSitePath(siteHomePath.value)
    ) {
      return
    }
    if (!document.querySelector('.game-article-hero')) return

    const gameKey = readActiveGameKey()
    if (!gameKey) return

    // 阻止 VitePress 抢先切页，改由下方的受控过渡完成后退。
    event.stopImmediatePropagation()
    gameReturnPending.value = true
    suspendHomeAlignment()
    beginGameReturn(gameKey)

    try {
      await navigateWithTransition(window.location.href, {
        afterRouteChange: async () => {
          await restoreHomeAnchor('games')
          await waitForGameCarouselReady()
          await restoreHomeAnchor('games')
          await nextTick()
        }
      })
    } finally {
      endGameReturn()
      gameReturnPending.value = false
      resumeHomeAlignment()
    }
  }

  async function handleGameCatalogReturn() {
    if (gameReturnPending.value) return
    gameReturnPending.value = true
    suspendHomeAlignment()
    beginGameReturn(getGameCardKey({ url: route.path }))

    try {
      await navigateWithTransition(toSiteHref('/#games'), {
        afterRouteChange: async () => {
          await restoreHomeAnchor('games')
          await waitForGameCarouselReady()
          await restoreHomeAnchor('games')
          await nextTick()
        },
        onFinished: endGameReturn
      })
    } finally {
      gameReturnPending.value = false
      resumeHomeAlignment()
    }
  }

  async function leaveHomeTo(href) {
    if (routeLeaving.value) return

    suspendHomeAlignment()
    routeLeaving.value = true
    await new Promise((resolve) => window.setTimeout(resolve, 180))

    try {
      await router.go(href)
      await nextTick()
      await restoreHomeAnchor()
      await waitForStableHomeAnchor()
      await restoreHomeAnchor()
    } finally {
      resumeHomeAlignment()
      window.setTimeout(() => {
        routeLeaving.value = false
      }, 0)
    }
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
    scrollToSection(target, item.href)
  }

  async function handleHomeNavigation(event) {
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
      scrollToSection(hero, toSiteHref('/'))
      return
    }

    event.preventDefault()
    event.stopPropagation()
    await leaveHomeTo(toSiteHref('/'))
  }

  onMounted(() => {
    previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    window.addEventListener('popstate', handleBrowserBack, true)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('popstate', handleBrowserBack, true)
    window.history.scrollRestoration = previousScrollRestoration
  })

  return {
    routeLeaving,
    restoreHomeAnchor,
    handleSectionNavigation,
    handleHomeNavigation
  }
}
