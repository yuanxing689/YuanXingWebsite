import {
  NAVIGATION_PHASES,
  NAVIGATION_SOURCES
} from './contracts.js'

const SOURCE_VALUES = new Set(Object.values(NAVIGATION_SOURCES))
const PHASE_VALUES = new Set(Object.values(NAVIGATION_PHASES))

/**
 * 导航事务存储：同一时刻只允许一个有效事务。
 * 新事务、历史遍历或显式失效都会让旧事务的后续异步步骤失效。
 */
export function createNavigationContextStore({
  now = () => Date.now()
} = {}) {
  let sequence = 0
  let current = null

  /** @returns {import('./contracts.js').NavigationContext | null} */
  function getCurrent() {
    return current
  }

  function isCurrent(context) {
    return Boolean(
      context &&
      current === context &&
      context.invalidated === false
    )
  }

  function invalidate(context = current, reason = 'superseded') {
    if (!context || context.invalidated) return false

    context.invalidated = true
    context.invalidationReason = reason
    if (context.phase !== NAVIGATION_PHASES.COMPLETED) {
      context.phase = NAVIGATION_PHASES.CANCELLED
    }
    return true
  }

  /**
   * @param {object} options
   * @param {import('./contracts.js').NavigationSource} options.source
   * @param {string} options.targetUrl
   * @param {import('./contracts.js').NavigationIntent | null} [options.intent]
   * @returns {import('./contracts.js').NavigationContext}
   */
  function begin({ source, targetUrl, intent = null }) {
    if (!SOURCE_VALUES.has(source)) {
      throw new TypeError(`未知导航来源：${source}`)
    }

    invalidate(current, 'new-navigation')
    sequence += 1
    current = {
      id: `navigation-${sequence}`,
      source,
      targetUrl: String(targetUrl),
      intent,
      phase: NAVIGATION_PHASES.CREATED,
      bridgeCount: 0,
      invalidated: false,
      invalidationReason: null,
      startedAt: now()
    }
    return current
  }

  function advance(context, phase, {
    source = null,
    intent = undefined
  } = {}) {
    if (!isCurrent(context) || !PHASE_VALUES.has(phase)) return false
    if (source !== null) {
      if (!SOURCE_VALUES.has(source)) {
        throw new TypeError(`未知导航来源：${source}`)
      }
      context.source = source
    }
    if (intent !== undefined) context.intent = intent
    context.phase = phase
    return true
  }

  function markBridge(context) {
    if (!isCurrent(context) || context.bridgeCount >= 1) return false
    context.source = NAVIGATION_SOURCES.HISTORY_TRANSITION_BRIDGE
    context.bridgeCount = 1
    return true
  }

  function complete(context) {
    return advance(context, NAVIGATION_PHASES.COMPLETED)
  }

  function fail(context) {
    return advance(context, NAVIGATION_PHASES.FAILED)
  }

  function clear(reason = 'cleared') {
    invalidate(current, reason)
    current = null
  }

  return {
    getCurrent,
    isCurrent,
    begin,
    advance,
    markBridge,
    invalidate,
    complete,
    fail,
    clear
  }
}
