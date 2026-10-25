import { computed, toValue } from 'vue'
import { toSiteHref } from '../navigation/sitePaths.js'

const MOBILE_BREAKPOINT = 680
const DESKTOP_NAVIGATION_CENTER_Y = 45
const MOBILE_NAVIGATION_CENTER_OFFSET = 64
const DESKTOP_NAVIGATION_RIGHT_OFFSET = 388
const DESKTOP_NAVIGATION_SPACING = 124

const SECTION_POSITIONS = {
  about: { desktop: { x: 0.14, y: 0.36 }, mobile: { x: 0.13, y: 0.54 } },
  games: { desktop: { x: 0.84, y: 0.39 }, mobile: { x: 0.87, y: 0.54 } },
  links: { desktop: { x: 0.2, y: 0.76 }, mobile: { x: 0.5, y: 0.79 } }
}

function lerp(from, to, progress) {
  return from + (to - from) * progress
}

function smoothstep(progress) {
  return progress * progress * (3 - 2 * progress)
}

/**
 * @typedef {object} SiteNavigationItem
 * @property {string} id
 * @property {string} label
 * @property {string} href
 * @property {boolean} active
 * @property {number} x
 * @property {number} y
 */

export function useSiteNavigation({
  sections,
  viewport,
  scrollProgress,
  isHome,
  activeSection
}) {
  const navigationSections = computed(() =>
    [...(toValue(sections) || [])]
      .filter((section) => SECTION_POSITIONS[section.id])
      .sort((a, b) => (a.meta.order ?? 999) - (b.meta.order ?? 999))
      .map((section) => ({
        id: section.id,
        label: section.meta.navLabel || section.meta.title || section.id,
        scattered: SECTION_POSITIONS[section.id]
      }))
  )

  /** @type {import('vue').ComputedRef<SiteNavigationItem[]>} */
  const items = computed(() => {
    const { width, height } = viewport.value
    const progress = isHome.value ? scrollProgress.value : 1
    const easedProgress = smoothstep(progress)
    const mobile = width <= MOBILE_BREAKPOINT

    return navigationSections.value.map((section, index) => {
      const scattered = mobile ? section.scattered.mobile : section.scattered.desktop
      const settledX = mobile
        ? (index + 0.5) / navigationSections.value.length
        : (width - DESKTOP_NAVIGATION_RIGHT_OFFSET + index * DESKTOP_NAVIGATION_SPACING) / width
      const settledY = mobile
        ? height - MOBILE_NAVIGATION_CENTER_OFFSET
        : DESKTOP_NAVIGATION_CENTER_Y
      const x = lerp(scattered.x, settledX, easedProgress)
      const yPixels = lerp(scattered.y * height, settledY, easedProgress)

      return {
        id: section.id,
        label: section.label,
        href: toSiteHref(`/#${section.id}`),
        active: isHome.value && activeSection.value === section.id,
        x,
        y: yPixels / Math.max(height, 1)
      }
    })
  })

  const glassVisible = computed(
    () => !isHome.value || scrollProgress.value >= 0.92
  )

  return {
    items,
    glassVisible
  }
}
