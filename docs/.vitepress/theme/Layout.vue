<script setup>
import {
  computed,
  onMounted,
  ref,
  watch
} from 'vue'
import { useData, useRoute } from 'vitepress'
// 直接引用 Content，避免 data loader 与 VitePress 公共入口形成循环 chunk。
import { Content } from 'vitepress/dist/client/app/components/Content.js'
import GameArticleHero from '../../../src/features/games/components/GameArticleHero.vue'
import PersistentSiteChrome from '../../../src/components/chrome/PersistentSiteChrome.vue'
import NotFoundPage from '../../../src/app/NotFoundPage.vue'
import { data as homeSections } from '../data/home.data.js'
import {
  createNavigationContextStore
} from '../../../src/app/navigation/navigationContext.js'
import { useHomeHistory } from '../../../src/features/home/history/useHomeHistory.js'
import { useHomePageState } from '../../../src/features/home/state/useHomePageState.js'
import { useIntroController } from '../../../src/features/home/intro/useIntroController.js'
import { usePageSectionSnap } from '../../../src/features/home/scroll/usePageSectionSnap.js'
import { useSiteRouteTransitions } from '../../../src/app/navigation/useSiteRouteTransitions.js'
import {
  normalizeSitePath,
  toSiteHref
} from '../../../src/app/navigation/sitePaths.js'

const route = useRoute()
const { frontmatter, page, site } = useData()
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
</script>

<template>
  <div
    class="site-shell"
    :style="{ '--site-viewport-height': `${navigationViewport.height}px` }"
    :class="{
      'site-shell--home': isHome,
      'site-shell--route-leaving': routeLeaving
    }"
  >
    <PersistentSiteChrome
      ref="siteChromeRef"
      :home="isHome"
      :sections="homeSections"
      :viewport="viewport"
      :navigation-viewport="navigationViewport"
      :scroll-progress="scrollProgress"
      :active-section="activeSection"
      :locked="introLocked"
      :brand-href="toSiteHref('/')"
      :brand-mark-src="toSiteHref('/images/brand/logo-mark.png')"
      :route-leaving="routeLeaving"
      :on-intro-frame="updateSceneFrame"
      @brand-select="handleBrandSelect"
      @item-select="handleSectionNavigation"
      @main-scene-ready="handleSceneReady"
      @main-scene-error="handleSceneError"
      @navigation-scene-error="handleNavigationSceneError"
    />

    <div class="site-shell__content">
      <h1 v-if="isHome" id="home-title" class="visually-hidden">
        元星联邦
      </h1>

      <main v-if="isHome" class="home-page" :style="{ '--scroll-progress': scrollProgress }">
        <section class="home-hero" aria-labelledby="home-title" />
        <div class="page-content" :inert="introLocked ? '' : null">
          <Content />
        </div>
      </main>

      <main
        v-else
        class="page-content page-content--article"
        :class="{ 'page-content--game': isGamePage }"
      >
        <NotFoundPage v-if="isNotFound" />
        <template v-else>
          <GameArticleHero
            v-if="isGamePage"
            :frontmatter="frontmatter"
          />
          <div v-if="isGamePage" class="game-article-body">
            <Content />
          </div>
          <Content v-else />
        </template>
      </main>
    </div>

    <div v-if="isHome && introLocked" class="intro-input-lock" aria-hidden="true" />
  </div>
</template>
