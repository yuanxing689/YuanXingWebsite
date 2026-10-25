import { toSitePath } from '../../../app/navigation/sitePaths.js'
import {
  beginGameReturn,
  endGameReturn,
  rememberActiveGame,
  waitForGameCarouselReady
} from '../../games/gameCarouselState.js'
import { getScrollTargetTop } from '../scroll/usePageSectionSnap.js'
import { homeReturnSnapshotStore } from './homeReturnSnapshot.js'

const DOM_READY_TIMEOUT_MS = 800
const DEFAULT_SECTION_ID = 'games'

function getHashId(hash) {
  if (!hash) return ''
  try {
    return decodeURIComponent(String(hash).replace(/^#/, ''))
  } catch {
    return String(hash).replace(/^#/, '')
  }
}

/**
 * 首页返回恢复：快照只提供稳定卡片键和可选滚动位置，
 * 当前 URL 的 hash 优先决定区块；缺失数据时回到游戏目录默认卡。
 */
export function createHomeRestorationService({
  isHome,
  scrollOffset = 0,
  refresh = () => {},
  snapshots = homeReturnSnapshotStore,
  prepareCardReturn = beginGameReturn,
  waitForCardReturn = waitForGameCarouselReady,
  finishCardReturn = endGameReturn,
  rememberCard = rememberActiveGame
}) {
  let activePlan = null

  function findTarget(sectionId) {
    if (!sectionId || typeof document === 'undefined') return null
    return document.getElementById(sectionId)
  }

  function waitForTarget(sectionId) {
    const target = findTarget(sectionId)
    if (target || typeof document === 'undefined') {
      return Promise.resolve(target)
    }

    return new Promise((resolve) => {
      let observer = null
      let timeout = 0

      const finish = (nextTarget) => {
        observer?.disconnect()
        window.clearTimeout(timeout)
        resolve(nextTarget)
      }
      observer = new MutationObserver(() => {
        const nextTarget = findTarget(sectionId)
        if (nextTarget) finish(nextTarget)
      })
      observer.observe(document.body, { childList: true, subtree: true })
      timeout = window.setTimeout(() => finish(null), DOM_READY_TIMEOUT_MS)
    })
  }

  function createPlan({
    anchor = '',
    snapshot = null,
    defaultSection = DEFAULT_SECTION_ID
  }) {
    const anchorId = getHashId(anchor)
    const snapshotId = getHashId(snapshot?.homeHash)
    const sectionId = anchorId || snapshotId || defaultSection
    const scrollY = Number.isFinite(snapshot?.scrollY)
      ? snapshot.scrollY
      : null

    return {
      sectionId,
      cardKey: toSitePath(snapshot?.cardKey || ''),
      scrollY
    }
  }

  function applyPlan(plan) {
    if (!isHome.value) return false

    const target = findTarget(plan.sectionId)
    if (target) {
      window.scrollTo({
        top: getScrollTargetTop(target, scrollOffset),
        behavior: 'auto'
      })
    } else {
      window.scrollTo({
        top: plan.scrollY ?? 0,
        behavior: 'auto'
      })
    }
    refresh()
    return Boolean(target)
  }

  function prepare(plan) {
    activePlan = plan
    if (plan.cardKey) prepareCardReturn(plan.cardKey)
  }

  async function restore(plan = activePlan) {
    if (!isHome.value || !plan) return false
    activePlan = plan

    if (plan.sectionId) await waitForTarget(plan.sectionId)
    applyPlan(plan)

    let cardRestored = !plan.cardKey
    if (plan.cardKey) {
      await waitForCardReturn()
      const activeCard = document.querySelector(
        'a.game-card__link[aria-current="true"]'
      )
      const activeCardKey = activeCard
        ? toSitePath(new URL(activeCard.href).pathname)
        : ''
      cardRestored = activeCardKey === plan.cardKey

      if (!cardRestored && activeCardKey) {
        rememberCard(activeCardKey)
      }
    }

    applyPlan(plan)
    return {
      ...plan,
      cardRestored
    }
  }

  async function restoreDefault() {
    return restore(createPlan({
      defaultSection: DEFAULT_SECTION_ID
    }))
  }

  function finish() {
    activePlan = null
    finishCardReturn()
  }

  function capture(cardKey) {
    return snapshots.capture({
      homeHash: window.location.hash,
      cardKey,
      scrollY: window.scrollY
    })
  }

  return {
    createPlan,
    prepare,
    restore,
    restoreDefault,
    capture,
    read: () => snapshots.read(),
    clear: () => snapshots.clear(),
    finish
  }
}
