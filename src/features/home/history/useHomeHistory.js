import { onBeforeUnmount, watch } from 'vue'
import { toSiteHref } from '../../../app/navigation/sitePaths.js'

// 首页区块历史：显式导航新增条目，滚动与路由离场只更新当前条目。
const SECTION_SYNC_DELAY = 140
const NAVIGATION_FALLBACK_DELAY = 1200

function getSectionHref(section) {
  return toSiteHref(section ? `/#${encodeURIComponent(section)}` : '/')
}

function getLocationKey(href = window.location.href) {
  const url = new URL(href, window.location.origin)
  return `${url.pathname}${url.search}${url.hash}`
}

export function useHomeHistory({ isHome, activeSection }) {
  let initialized = false
  let suspended = false
  let expectedSection = null
  let syncTimer = 0
  let navigationTimer = 0

  function clearSyncTimer() {
    window.clearTimeout(syncTimer)
    syncTimer = 0
  }

  function clearNavigationTimer() {
    window.clearTimeout(navigationTimer)
    navigationTimer = 0
  }

  function canWriteHistory() {
    return initialized && !suspended && isHome.value
  }

  function replaceSection(section) {
    if (!canWriteHistory()) return false

    const href = getSectionHref(section)
    if (getLocationKey(href) === getLocationKey()) return false

    window.history.replaceState({
      ...(window.history.state ?? {}),
      homeSection: section || '',
      scrollPosition: window.scrollY
    }, '', href)
    return true
  }

  function scheduleSectionSync() {
    clearSyncTimer()
    syncTimer = window.setTimeout(() => {
      syncTimer = 0
      replaceSection(activeSection.value)
    }, SECTION_SYNC_DELAY)
  }

  function pushSection(section) {
    if (!initialized || suspended || !isHome.value) return

    const normalizedSection = section || ''
    const href = getSectionHref(normalizedSection)
    const state = {
      ...(window.history.state ?? {}),
      homeSection: normalizedSection,
      // 0 让 VitePress 在直接返回该历史项时按 hash 定位
      scrollPosition: 0
    }

    clearSyncTimer()
    clearNavigationTimer()
    expectedSection = normalizedSection

    if (getLocationKey(href) === getLocationKey()) {
      window.history.replaceState(state, '', href)
    } else {
      window.history.pushState(state, '', href)
    }

    navigationTimer = window.setTimeout(() => {
      navigationTimer = 0
      expectedSection = null
      replaceSection(activeSection.value)
    }, NAVIGATION_FALLBACK_DELAY)
  }

  function finishSectionNavigation(section, completed) {
    const normalizedSection = section || ''
    if (expectedSection !== normalizedSection) return

    expectedSection = null
    clearNavigationTimer()

    if (completed) {
      replaceSection(normalizedSection)
    } else {
      replaceSection(activeSection.value)
    }
  }

  function commitCurrentSection() {
    if (!initialized || suspended || !isHome.value) return

    clearSyncTimer()
    const section = expectedSection ?? activeSection.value
    replaceSection(section)
  }

  function start() {
    initialized = true
    suspended = false
    replaceSection(activeSection.value)
  }

  function suspend() {
    suspended = true
    expectedSection = null
    clearSyncTimer()
    clearNavigationTimer()
  }

  function resume() {
    suspended = false
    initialized = true
    expectedSection = null
    clearSyncTimer()
    clearNavigationTimer()
    replaceSection(activeSection.value)
  }

  watch([isHome, activeSection], ([home]) => {
    if (!home || !initialized || suspended) {
      clearSyncTimer()
      return
    }

    if (expectedSection !== null) return
    scheduleSectionSync()
  }, { flush: 'post' })

  onBeforeUnmount(() => {
    clearSyncTimer()
    clearNavigationTimer()
  })

  return {
    start,
    suspend,
    resume,
    pushSection,
    finishSectionNavigation,
    commitCurrentSection
  }
}
