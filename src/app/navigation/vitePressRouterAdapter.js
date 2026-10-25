import {
  NAVIGATION_PHASES,
  NAVIGATION_SOURCES
} from './contracts.js'
import { createNavigationContextStore } from './navigationContext.js'

const HOOK_NAMES = [
  'onBeforeRouteChange',
  'onBeforePageLoad',
  'onAfterRouteChange'
]

/**
 * 统一管理 VitePress Router 钩子。
 *
 * `popstate` 在 capture 阶段建立历史遍历上下文，保证先于 VitePress
 * 的 bubble 处理器；钩子只安装一次，并在卸载时恢复原始处理函数。
 */
export function createVitePressRouterAdapter(router, {
  windowRef = null,
  contexts = createNavigationContextStore()
} = {}) {
  const subscribers = new Set()
  const previousHooks = {}
  let installed = false
  let pendingNavigation = null

  function getWindow() {
    if (windowRef) return windowRef
    if (typeof window === 'undefined') {
      throw new Error('VitePress Router Adapter 只能在客户端安装。')
    }
    return window
  }

  function getTargetUrl(href) {
    return new URL(href, getWindow().location.href).href
  }

  function beginNavigation(source, href, intent = null) {
    return contexts.begin({
      source,
      targetUrl: getTargetUrl(href),
      intent
    })
  }

  function ensureNavigation(href, source = NAVIGATION_SOURCES.PROGRAMMATIC) {
    const targetUrl = getTargetUrl(href)
    const current = contexts.getCurrent()
    if (
      current &&
      !current.invalidated &&
      current.targetUrl === targetUrl &&
      current.phase !== NAVIGATION_PHASES.COMPLETED
    ) {
      return current
    }
    return beginNavigation(source, href)
  }

  async function runHook(name, href, context) {
    const previous = previousHooks[name]
    if (previous) {
      const previousResult = await previous(href)
      if (previousResult === false) return false
    }

    for (const handlers of Array.from(subscribers)) {
      const handler = handlers[name]
      if (!handler) continue
      const result = await handler(href, context)
      if (result === false) return false
    }
    return true
  }

  function install(handlers = {}) {
    if (handlers && typeof handlers === 'object') subscribers.add(handlers)

    if (!installed) {
      HOOK_NAMES.forEach((name) => {
        previousHooks[name] = router[name]
      })

      router.onBeforeRouteChange = async (href) => {
        const context =
          pendingNavigation ?? beginNavigation(
            NAVIGATION_SOURCES.PROGRAMMATIC,
            href
          )
        pendingNavigation = null
        contexts.advance(context, NAVIGATION_PHASES.PENDING)
        return runHook('onBeforeRouteChange', href, context)
      }

      router.onBeforePageLoad = async (href) => {
        const context = ensureNavigation(href)
        contexts.advance(context, NAVIGATION_PHASES.PENDING)
        return runHook('onBeforePageLoad', href, context)
      }

      router.onAfterRouteChange = async (href) => {
        const context = ensureNavigation(href)
        contexts.advance(context, NAVIGATION_PHASES.COMMITTED)
        return runHook('onAfterRouteChange', href, context)
      }

      const captureTraversal = () => {
        const context = beginNavigation(
          NAVIGATION_SOURCES.HISTORY_TRAVERSAL,
          getWindow().location.href
        )
        contexts.advance(context, NAVIGATION_PHASES.PENDING)
      }

      install.captureTraversal = captureTraversal
      getWindow().addEventListener('popstate', captureTraversal, true)

      if (!contexts.getCurrent()) {
        const initial = beginNavigation(
          NAVIGATION_SOURCES.INITIAL,
          getWindow().location.href
        )
        contexts.advance(initial, NAVIGATION_PHASES.COMMITTED)
      }
      installed = true
    }

    let active = true
    return () => {
      if (!active) return
      active = false
      subscribers.delete(handlers)
      if (subscribers.size === 0) restore()
    }
  }

  function restore() {
    if (!installed) return

    getWindow().removeEventListener('popstate', install.captureTraversal, true)
    delete install.captureTraversal
    HOOK_NAMES.forEach((name) => {
      router[name] = previousHooks[name]
      delete previousHooks[name]
    })
    subscribers.clear()
    pendingNavigation = null
    installed = false
  }

  /**
   * 普通导航；调用方可以携带既有历史遍历上下文进入同 URL 桥接。
   */
  function navigate(href, {
    source = NAVIGATION_SOURCES.PROGRAMMATIC,
    context = null,
    intent = null
  } = {}) {
    pendingNavigation =
      context ?? beginNavigation(source, href, intent)
    return router.go(href)
  }

  /**
   * 只重新提交浏览器当前已提交的 URL，不创建历史记录。
   */
  function reloadCommittedUrl(options = {}) {
    return navigate(getWindow().location.href, options)
  }

  return {
    install,
    restore,
    navigate,
    reloadCommittedUrl,
    contexts
  }
}
