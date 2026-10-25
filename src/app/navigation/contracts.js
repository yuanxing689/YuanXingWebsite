/**
 * 导航契约。运行时常量与 JSDoc 类型集中在此文件，
 * 各职责层只交换稳定的意图、上下文和恢复结果。
 */

export const NAVIGATION_SOURCES = Object.freeze({
  PROGRAMMATIC: 'programmatic',
  HISTORY_TRAVERSAL: 'history-traversal',
  HISTORY_TRANSITION_BRIDGE: 'history-transition-bridge',
  SAME_PAGE_HASH: 'same-page-hash',
  INITIAL: 'initial'
})

export const NAVIGATION_PHASES = Object.freeze({
  CREATED: 'created',
  PENDING: 'pending',
  COMMITTED: 'committed',
  RESTORING: 'restoring',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
})

export const NAVIGATION_OPERATIONS = Object.freeze({
  ENTER_GAME: 'enter-game',
  RETURN_GAME_CATALOG: 'return-game-catalog',
  HOME_SECTION: 'home-section',
  HOME_ROOT: 'home-root',
  LEAVE_HOME: 'leave-home',
  HISTORY_TRAVERSAL: 'history-traversal',
  PAGE_LOAD: 'page-load'
})

export const HISTORY_STRATEGIES = Object.freeze({
  PRESERVE: 'preserve',
  PUSH: 'push',
  REPLACE: 'replace',
  TRAVERSE: 'traverse',
  BRIDGE_SAME_URL: 'bridge-same-url'
})

export const TRANSITION_STRATEGIES = Object.freeze({
  SHARED_ELEMENTS: 'shared-elements',
  FALLBACK: 'fallback',
  NONE: 'none'
})

/**
 * @typedef {'programmatic' |
 *   'history-traversal' |
 *   'history-transition-bridge' |
 *   'same-page-hash' |
 *   'initial'} NavigationSource
 */

/**
 * @typedef {'created' |
 *   'pending' |
 *   'committed' |
 *   'restoring' |
 *   'completed' |
 *   'cancelled' |
 *   'failed'} NavigationPhase
 */

/**
 * @typedef {object} NavigationRestorationPolicy
 * @property {boolean} restoreHome
 * @property {boolean} restoreSection
 * @property {boolean} restoreCard
 * @property {'none' | 'hash' | 'snapshot'} scroll
 */

/**
 * @typedef {object} NavigationIntent
 * @property {string} operation
 * @property {string} targetUrl
 * @property {string | null} sectionId
 * @property {string | null} cardKey
 * @property {'preserve' | 'push' | 'replace' | 'traverse' | 'bridge-same-url'} history
 * @property {'shared-elements' | 'fallback' | 'none'} transition
 * @property {NavigationRestorationPolicy} restoration
 */

/**
 * @typedef {object} NavigationContext
 * @property {string} id
 * @property {NavigationSource} source
 * @property {string} targetUrl
 * @property {NavigationIntent | null} intent
 * @property {NavigationPhase} phase
 * @property {number} bridgeCount
 * @property {boolean} invalidated
 * @property {string | null} invalidationReason
 * @property {number} startedAt
 */

/**
 * @typedef {object} HomeReturnSnapshot
 * @property {1} version
 * @property {string} homeHash
 * @property {string} cardKey
 * @property {number | null} scrollY
 */

/**
 * @typedef {object} VitePressRouterAdapter
 * @property {(handlers?: object) => (() => void)} install
 * @property {() => void} restore
 * @property {(href: string, options?: object) => Promise<unknown>} navigate
 * @property {(options?: object) => Promise<unknown>} reloadCommittedUrl
 */

/**
 * @typedef {object} TransitionOrchestrator
 * @property {(navigation: object, update: Function) => Promise<boolean>} run
 * @property {() => Promise<void>} dispose
 */

/**
 * @typedef {object} HomeRestorationService
 * @property {() => void} capture
 * @property {() => HomeReturnSnapshot | null} read
 * @property {(snapshot?: HomeReturnSnapshot | null) => Promise<boolean>} restore
 * @property {() => void} clear
 */

export {}
