<script setup>
import { computed, ref } from 'vue'
import BrandWordmark from './BrandWordmark.vue'
import SpaceBackdrop from './SpaceBackdrop.vue'
import { getBrandGeometry } from './brandGeometry.js'
import { usePersistentCosmicScenes } from '../../visuals/cosmos/usePersistentCosmicScenes.js'
import { useSiteNavigation } from './useSiteNavigation.js'
import SiteBrandButton from './SiteBrandButton.vue'
import SiteNavigation from './SiteNavigation.vue'

const LOGO_HANDOFF_START = 0.58
const LOGO_HANDOFF_END = 0.82

const props = defineProps({
  home: {
    type: Boolean,
    default: false
  },
  sections: {
    type: Array,
    default: () => []
  },
  viewport: {
    type: Object,
    required: true
  },
  navigationViewport: {
    type: Object,
    required: true
  },
  scrollProgress: {
    type: Number,
    default: 0
  },
  activeSection: {
    type: String,
    default: ''
  },
  locked: {
    type: Boolean,
    default: false
  },
  brandHref: {
    type: String,
    required: true
  },
  brandMarkSrc: {
    type: String,
    required: true
  },
  routeLeaving: {
    type: Boolean,
    default: false
  },
  onIntroFrame: {
    type: Function,
    default: null
  }
})

const emit = defineEmits([
  'brand-select',
  'item-select',
  'main-scene-ready',
  'main-scene-error',
  'navigation-scene-ready',
  'navigation-scene-error'
])

const mainCanvasRef = ref(null)
const navigationCanvasRef = ref(null)
const heroTargetRef = ref(null)
const wordmarkRef = ref(null)
const brandTransitioning = ref(false)
let brandTransitionCount = 0

const {
  items: navigationItems
} = useSiteNavigation({
  sections: computed(() => props.sections),
  viewport: computed(() => props.navigationViewport),
  scrollProgress: computed(() => props.scrollProgress),
  isHome: computed(() => props.home),
  activeSection: computed(() => props.activeSection)
})

const brandGeometry = computed(() => getBrandGeometry({
  viewport: props.viewport,
  scrollProgress: props.scrollProgress,
  isHome: props.home
}))
const heroAnchorStyle = computed(() => brandGeometry.value.heroAnchorStyle)
const brandLayoutStyle = computed(() => brandGeometry.value.brandHomeStyle)
const wordmarkStyle = computed(() => brandGeometry.value.wordmarkStyle)
const wordmarkSettled = computed(() => !props.home)
const navigationGlassVisible = computed(
  () => !props.home || props.scrollProgress >= 0.92
)
const logoHandoffProgress = computed(() => {
  if (!props.home) return 1

  const progress = Math.min(
    Math.max(
      (props.scrollProgress - LOGO_HANDOFF_START) /
        (LOGO_HANDOFF_END - LOGO_HANDOFF_START),
      0
    ),
    1
  )
  return progress * progress * (3 - 2 * progress)
})
const mainLogoOpacity = computed(
  () => props.home ? 1 - logoHandoffProgress.value : 0
)
const brandGlassVisible = computed(
  () => !props.home || brandGeometry.value.progress > 0.96
)

function getLogoTarget() {
  return heroTargetRef.value
}

function getMainLogoOpacity() {
  return mainLogoOpacity.value
}

function getNavigationItems() {
  return navigationItems.value
}

function handleItemSelect(event, item) {
  emit('item-select', event, item)
}

function updateWordmarkLight(light) {
  wordmarkRef.value?.updateLight(light, heroTargetRef.value)
}

function beginBrandTransition() {
  if (brandTransitioning.value) return

  brandTransitionCount += 1
  brandTransitioning.value = true
}

function endBrandTransition() {
  brandTransitioning.value = false
}

const {
  navigationSceneFailed,
  prepareHomeVisuals,
  waitForVisualReady,
  getHomeScene
} = usePersistentCosmicScenes({
  mainCanvas: mainCanvasRef,
  navigationCanvas: navigationCanvasRef,
  isHome: computed(() => props.home),
  getLogoTarget,
  getMainLogoOpacity,
  getNavigationTargets: getNavigationItems,
  getExtraDebugState: () => ({ brandTransitionCount }),
  onIntroFrame: () => props.onIntroFrame?.(),
  onLightUpdate: updateWordmarkLight,
  onMainSceneReady: () => emit('main-scene-ready'),
  onMainSceneError: (error) => emit('main-scene-error', error),
  onNavigationSceneReady: () => emit('navigation-scene-ready'),
  onNavigationSceneError: (error) => emit('navigation-scene-error', error)
})

defineExpose({
  beginBrandTransition,
  endBrandTransition,
  getHomeScene,
  prepareHomeVisuals,
  waitForVisualReady
})
</script>

<template>
  <div
    class="site-chrome"
    :class="{
      'site-chrome--home': home,
      'site-chrome--brand-transitioning': brandTransitioning,
      'site-chrome--route-leaving': routeLeaving
    }"
    :style="{ '--chrome-transition-opacity': brandTransitioning ? 0 : 1 }"
  >
    <SpaceBackdrop />

    <div
      class="cosmic-home-layer"
      :class="{ 'cosmic-home-layer--active': home }"
      aria-hidden="true"
    >
      <canvas
        ref="mainCanvasRef"
        class="cosmic-home-canvas"
        data-cosmic-main-canvas
      />
    </div>

    <span
      ref="heroTargetRef"
      class="hero-logo-target"
      :style="heroAnchorStyle"
      aria-hidden="true"
    />

    <SiteBrandButton
      :href="brandHref"
      :mark-src="brandMarkSrc"
      :layout-style="brandLayoutStyle"
      :mark-opacity="logoHandoffProgress"
      :glass-visible="brandGlassVisible"
      @brand-select="emit('brand-select', $event)"
    />

    <BrandWordmark
      ref="wordmarkRef"
      :travel-style="wordmarkStyle"
      :settled="wordmarkSettled"
    />

    <canvas
      ref="navigationCanvasRef"
      class="site-navigation-canvas"
      data-cosmic-navigation-canvas
      aria-hidden="true"
    />

    <SiteNavigation
      :items="navigationItems"
      :home="home"
      :glass-visible="navigationGlassVisible"
      :locked="locked"
      :show-fallback="navigationSceneFailed"
      @item-select="handleItemSelect"
    />
  </div>
</template>

<style scoped>
.site-chrome {
  --chrome-transition-opacity: 1;
}

.cosmic-home-layer {
  position: fixed;
  z-index: 0;
  inset: 0;
  height: var(--site-viewport-height, 100vh);
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease;
}

.cosmic-home-layer--active {
  opacity: var(--chrome-transition-opacity, 1);
}

.cosmic-home-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.hero-logo-target {
  position: fixed;
  z-index: -1;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.site-navigation-canvas {
  position: fixed;
  z-index: 31;
  inset: 0;
  display: block;
  width: 100%;
  height: var(--site-viewport-height, 100%);
  opacity: var(--chrome-transition-opacity, 1);
  pointer-events: none;
  transition: opacity 180ms ease;
}

.site-chrome--route-leaving {
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .cosmic-home-layer,
  .site-navigation-canvas {
    transition: none;
  }
}
</style>
