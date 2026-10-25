import {
  HISTORY_STRATEGIES,
  NAVIGATION_OPERATIONS,
  TRANSITION_STRATEGIES
} from './contracts.js'

/**
 * @returns {import('./contracts.js').NavigationIntent}
 */
export function createGameReturnIntent({
  targetUrl,
  sectionId,
  cardKey,
  fromHistoryTraversal
}) {
  return {
    operation: NAVIGATION_OPERATIONS.RETURN_GAME_CATALOG,
    targetUrl,
    sectionId: sectionId || 'games',
    cardKey: cardKey || null,
    history: fromHistoryTraversal
      ? HISTORY_STRATEGIES.BRIDGE_SAME_URL
      : HISTORY_STRATEGIES.PUSH,
    transition: TRANSITION_STRATEGIES.SHARED_ELEMENTS,
    restoration: {
      restoreHome: true,
      restoreSection: true,
      restoreCard: true,
      scroll: 'snapshot'
    }
  }
}

/**
 * @returns {import('./contracts.js').NavigationIntent}
 */
export function createGameEntryIntent({
  targetUrl,
  cardKey
}) {
  return {
    operation: NAVIGATION_OPERATIONS.ENTER_GAME,
    targetUrl,
    sectionId: 'games',
    cardKey: cardKey || null,
    history: HISTORY_STRATEGIES.PUSH,
    transition: TRANSITION_STRATEGIES.SHARED_ELEMENTS,
    restoration: {
      restoreHome: false,
      restoreSection: false,
      restoreCard: false,
      scroll: 'none'
    }
  }
}

/**
 * @returns {import('./contracts.js').NavigationIntent}
 */
export function createHomeSectionIntent({
  targetUrl,
  sectionId,
  passive = false
}) {
  return {
    operation: sectionId
      ? NAVIGATION_OPERATIONS.HOME_SECTION
      : NAVIGATION_OPERATIONS.HOME_ROOT,
    targetUrl,
    sectionId: sectionId || null,
    cardKey: null,
    history: passive
      ? HISTORY_STRATEGIES.REPLACE
      : HISTORY_STRATEGIES.PUSH,
    transition: TRANSITION_STRATEGIES.NONE,
    restoration: {
      restoreHome: true,
      restoreSection: true,
      restoreCard: false,
      scroll: sectionId ? 'hash' : 'none'
    }
  }
}
