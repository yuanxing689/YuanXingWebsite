import { onBeforeUnmount, watch } from 'vue'
import { createBrowserHistoryGateway } from '../../../app/navigation/browserHistoryGateway.js'
import {
  NAVIGATION_PHASES,
  NAVIGATION_SOURCES
} from '../../../app/navigation/contracts.js'
import {
  createHomeSectionIntent
} from '../../../app/navigation/navigationIntent.js'
import { toSiteHref } from '../../../app/navigation/sitePaths.js'

// 首页区块历史：显式导航新增条目，滚动与路由离场只更新当前条目。
const SECTION_SYNC_DELAY = 140
const NAVIGATION_FALLBACK_DELAY = 1200

function getSectionHref(section) {
  return toSiteHref(section ? `/#${encodeURIComponent(section)}` : '/')
}

export function useHomeHistory({
  isHome,
  activeSection,
  pendingSection,
  setPendingSection,
  clearPendingSection,
  navigationContexts = null
}) {
  const historyGateway = createBrowserHistoryGateway()
  let initialized = false
  let suspended = false
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

  function recordSamePageNavigation({
    href,
    section,
    passive,
    phase = NAVIGATION_PHASES.COMMITTED
  }) {
    if (!navigationContexts) return

    const context = navigationContexts.begin({
      source: NAVIGATION_SOURCES.SAME_PAGE_HASH,
      targetUrl: new URL(href, window.location.origin).href,
      intent: createHomeSectionIntent({
        targetUrl: href,
        sectionId: section,
        passive
      })
    })
    navigationContexts.advance(context, phase)
  }

  function replaceSection(section) {
    if (!canWriteHistory()) return false

    const href = getSectionHref(section)
    if (
      historyGateway.getLocationKey(href) === historyGateway.getLocationKey()
    ) {
      return false
    }

    historyGateway.replace(href, {
      ...historyGateway.getState(),
      homeSection: section || '',
      scrollPosition: window.scrollY
    })
    recordSamePageNavigation({
      href,
      section,
      passive: true
    })
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
      ...historyGateway.getState(),
      homeSection: normalizedSection,
      // 0 让 VitePress 在直接返回该历史项时按 hash 定位
      scrollPosition: 0
    }

    clearSyncTimer()
    clearNavigationTimer()
    setPendingSection(normalizedSection)

    if (
      historyGateway.getLocationKey(href) === historyGateway.getLocationKey()
    ) {
      historyGateway.replace(href, state)
    } else {
      historyGateway.push(href, state)
    }
    recordSamePageNavigation({
      href,
      section: normalizedSection,
      passive: false,
      phase: NAVIGATION_PHASES.PENDING
    })

    navigationTimer = window.setTimeout(() => {
      navigationTimer = 0
      clearPendingSection()
      replaceSection(activeSection.value)
    }, NAVIGATION_FALLBACK_DELAY)
  }

  function finishSectionNavigation(section, completed) {
    const normalizedSection = section || ''
    if (pendingSection.value !== normalizedSection) return

    clearPendingSection()
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
    const section = pendingSection.value ?? activeSection.value
    replaceSection(section)
  }

  function start() {
    initialized = true
    suspended = false
    replaceSection(activeSection.value)
  }

  function suspend() {
    suspended = true
    clearPendingSection()
    clearSyncTimer()
    clearNavigationTimer()
  }

  function resume() {
    suspended = false
    initialized = true
    clearPendingSection()
    clearSyncTimer()
    clearNavigationTimer()
    replaceSection(activeSection.value)
  }

  watch([isHome, activeSection], ([home]) => {
    if (!home || !initialized || suspended) {
      clearSyncTimer()
      return
    }

    if (pendingSection.value !== null) return
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
