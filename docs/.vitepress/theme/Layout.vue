<script setup>
import { useData, useRoute } from 'vitepress'
// 直接引用 Content，避免 data loader 与 VitePress 公共入口形成循环 chunk。
import { Content } from 'vitepress/dist/client/app/components/Content.js'
import GameArticleHero from '../../../src/features/games/components/GameArticleHero.vue'
import PersistentSiteChrome from '../../../src/components/chrome/PersistentSiteChrome.vue'
import NotFoundPage from '../../../src/app/NotFoundPage.vue'
import { data as homeSections } from '../data/home.data.js'
import {
  useSiteApplication
} from '../../../src/app/runtime/useSiteApplication.js'

const route = useRoute()
const { frontmatter, page, site } = useData()
const {
  siteChromeRef,
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
  brandHref,
  brandMarkSrc
} = useSiteApplication({
  route,
  frontmatter,
  page,
  site
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
      :brand-href="brandHref"
      :brand-mark-src="brandMarkSrc"
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
