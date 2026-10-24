<script setup>
import {
  computed,
  defineAsyncComponent,
  onMounted,
  ref,
  watch
} from 'vue'
import { useData, useRoute } from 'vitepress'
// 直接引用 Content，避免 data loader 与 VitePress 公共入口形成循环 chunk。
import { Content } from 'vitepress/dist/client/app/components/Content.js'
import BrandWordmark from '../../../src/components/BrandWordmark.vue'
import GameArticleHero from '../../../src/components/games/GameArticleHero.vue'
import NavigationStarCanvas from '../../../src/components/navigation/NavigationStarCanvas.vue'
import NotFoundPage from '../../../src/components/NotFoundPage.vue'
import SiteHeader from '../../../src/components/navigation/SiteHeader.vue'
import SpaceBackdrop from '../../../src/components/SpaceBackdrop.vue'
import { data as homeSections } from '../data/home.data.js'
import { useHomeHistory } from '../../../src/composables/useHomeHistory.js'
import { usePageSectionSnap } from '../../../src/composables/usePageSectionSnap.js'
import { useHomeScrollState } from '../../../src/composables/useHomeScrollState.js'
import { useIntroController } from '../../../src/composables/useIntroController.js'
import { useSiteRouteTransitions } from '../../../src/composables/useSiteRouteTransitions.js'
import { useSiteNavigation } from '../../../src/composables/useSiteNavigation.js'
import { getBrandGeometry } from '../../../src/layout/brandGeometry.js'
import {
  normalizeSitePath,
  toSiteHref
} from '../../../src/navigation/sitePaths.js'

const LogoHero = defineAsyncComponent(() => import('../../../src/components/LogoHero.vue'))

const route = useRoute()
const { frontmatter, page, site } = useData()
const logoHeroRef = ref(null)
const heroAnchorRef = ref(null)
const wordmarkRef = ref(null)
const navigationSceneReady = ref(false)
const navigationSceneFailed = ref(false)

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
  sceneFailed,
  enterHome: enterHomeIntro,
  leaveHome: leaveHomeIntro,
  updateSceneFrame,
  handleSceneReady,
  handleSceneError
} = useIntroController({
  isHome,
  logoHeroRef
})
const {
  viewport,
  navigationViewport,
  scrollProgress,
  logoReplacementProgress,
  activeSection,
  getMainLogoOpacity,
  refreshLayout
} = useHomeScrollState({ isHome })

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
  activeSection
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
  homeHistory
})

const {
  items: navigationTargets,
  glassVisible: navigationGlassVisible
} = useSiteNavigation({
  sections: homeSections,
  viewport: navigationViewport,
  scrollProgress,
  isHome,
  activeSection
})

const navigationFallback = computed(() => {
  if (isHome.value) return sceneFailed.value
  return !navigationSceneReady.value || navigationSceneFailed.value
})

const brandGeometry = computed(() => getBrandGeometry({
  viewport: viewport.value,
  scrollProgress: scrollProgress.value,
  isHome: isHome.value
}))
const heroAnchorStyle = computed(() => brandGeometry.value.heroAnchorStyle)
const wordmarkStyle = computed(() => brandGeometry.value.wordmarkStyle)
const brandHomeStyle = computed(() => brandGeometry.value.brandHomeStyle)
const brandReady = computed(() => brandGeometry.value.brandReady)

function getNavigationTargets() {
  return navigationTargets.value
}

function updateWordmarkLight({ x, y, visible }) {
  wordmarkRef.value?.updateLight({ x, y, visible }, heroAnchorRef.value)
}

function getLogoTarget() {
  return heroAnchorRef.value
}

function handleNavigationSceneReady() {
  navigationSceneReady.value = true
  navigationSceneFailed.value = false
}

function handleNavigationSceneError() {
  navigationSceneReady.value = false
  navigationSceneFailed.value = true
}

watch(isHome, async (home) => {
  navigationSceneReady.value = false
  navigationSceneFailed.value = false

  if (!home) {
    leaveHomeIntro()
    refreshLayout()
    return
  }

  refreshLayout()
  await enterHomeIntro()
}, { flush: 'post' })

onMounted(async () => {
  if (isHome.value) {
    await restoreHomeAnchor()
    refreshLayout()
    homeHistory.start()
  }

  if (isHome.value) {
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
    <SpaceBackdrop />

    <SiteHeader
      :items="navigationTargets"
      :home="isHome"
      :brand-ready="brandReady"
      :brand-style="brandHomeStyle"
      :brand-href="toSiteHref('/')"
      :brand-mark-src="toSiteHref('/images/brand/logo-mark.png')"
      :wordmark-style="wordmarkStyle"
      :glass-visible="navigationGlassVisible"
      :locked="introLocked"
      :show-fallback="navigationFallback"
      @brand-select="handleHomeNavigation"
      @item-select="handleSectionNavigation"
    />

    <NavigationStarCanvas
      v-if="!isHome"
      :items="navigationTargets"
      @scene-ready="handleNavigationSceneReady"
      @scene-error="handleNavigationSceneError"
    />

    <div class="site-shell__content">
      <BrandWordmark
        v-if="isHome"
        ref="wordmarkRef"
        heading-id="home-title"
        :travel-style="wordmarkStyle"
      />

      <main v-if="isHome" class="home-page" :style="{ '--scroll-progress': scrollProgress }">
        <section class="home-hero" aria-labelledby="home-title">
          <div ref="heroAnchorRef" class="hero-logo-anchor" :style="heroAnchorStyle" />
          <img
            class="hero-logo-replacement"
            :src="toSiteHref('/images/brand/logo-mark.png')"
            :style="[heroAnchorStyle, { opacity: logoReplacementProgress }]"
            alt=""
            aria-hidden="true"
            decoding="async"
          />
          <LogoHero
            ref="logoHeroRef"
            class="home-hero__scene"
            :on-frame="updateSceneFrame"
            :get-logo-target="getLogoTarget"
            :get-main-logo-opacity="getMainLogoOpacity"
            :get-navigation-targets="getNavigationTargets"
            @light-update="updateWordmarkLight"
            @scene-ready="handleSceneReady"
            @scene-error="handleSceneError"
          />
        </section>
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
