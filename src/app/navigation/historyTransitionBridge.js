import {
  NAVIGATION_PHASES,
  NAVIGATION_SOURCES
} from './contracts.js'

/**
 * 历史遍历桥接服务。
 *
 * 浏览器完成 popstate 后，VitePress 的首次页面加载会被暂时拦下；
 * 此服务只对当前同一 URL 提交一次 VitePress 路由，以便共享元素过渡
 * 获得已完成历史切换的 DOM 提交。它不写 History，也不改变历史顺序。
 */
export function createHistoryTransitionBridge({
  contexts,
  routerAdapter,
  historyGateway,
  settleDelayMs = 100,
  schedule = (callback) => window.setTimeout(callback, settleDelayMs),
  cancelSchedule = (timer) => window.clearTimeout(timer)
}) {
  let pending = null
  let sequence = 0
  const diagnostics = {
    requestCount: 0,
    transitionCount: 0,
    fallbackCount: 0,
    lastStatus: 'idle',
    lastError: null
  }

  function publishDiagnostics() {
    if (
      typeof window === 'undefined' ||
      !import.meta.env?.DEV
    ) {
      return
    }

    window.__yuanxingHistoryBridgeDebug = {
      getSnapshot() {
        const context = contexts.getCurrent()
        return {
          ...diagnostics,
          pending: Boolean(pending),
          context: context
            ? {
                id: context.id,
                source: context.source,
                phase: context.phase,
                bridgeCount: context.bridgeCount,
                invalidated: context.invalidated
              }
            : null
        }
      }
    }
  }

  publishDiagnostics()

  function getSnapshot() {
    return {
      href: historyGateway.getHref(),
      historyLength: historyGateway.getLength()
    }
  }

  function matchesSnapshot(request) {
    const snapshot = getSnapshot()
    return (
      snapshot.href === request.expectedHref &&
      snapshot.historyLength === request.expectedHistoryLength
    )
  }

  function settle(request, status, error = null) {
    if (pending !== request) return
    cancelSchedule(request.timer)
    pending = null
    diagnostics.lastStatus = status
    diagnostics.lastError = error?.message ?? null
    publishDiagnostics()
    request.onFinished?.({ status, error })
  }

  function cancel(reason = 'cancelled') {
    if (!pending) return false
    const request = pending
    contexts.invalidate(request.context, reason)
    settle(request, 'cancelled')
    return true
  }

  function validate(request) {
    if (!contexts.isCurrent(request.context)) {
      throw new Error('历史遍历事务已失效。')
    }
    if (request.context.bridgeCount !== 1) {
      throw new Error('历史遍历桥接次数无效。')
    }
    if (!matchesSnapshot(request)) {
      throw new Error('桥接前后 URL 或 history.length 发生变化。')
    }
  }

  async function restoreWithoutSecondLoad(request) {
    if (!contexts.isCurrent(request.context)) return false

    try {
      if (!request.routeCommitted) {
        diagnostics.fallbackCount += 1
        publishDiagnostics()
        const historyLength = historyGateway.getLength()
        await routerAdapter.reloadCommittedUrl({
          source: NAVIGATION_SOURCES.HISTORY_TRANSITION_BRIDGE,
          context: request.context,
          intent: request.intent
        })
        if (historyGateway.getLength() !== historyLength) {
          throw new Error('无动画回退提交改变了 history.length。')
        }
        request.routeCommitted = true
      }

      contexts.advance(
        request.context,
        NAVIGATION_PHASES.RESTORING
      )
      await request.restoreDefault?.()
      contexts.complete(request.context)
      return true
    } catch (error) {
      contexts.fail(request.context)
      request.lastError = error
      return false
    }
  }

  async function execute(request) {
    request.timer = null
    if (pending !== request) return

    if (!contexts.isCurrent(request.context)) {
      settle(request, 'stale')
      return
    }

    if (!matchesSnapshot(request)) {
      const restored = await restoreWithoutSecondLoad(request)
      settle(request, restored ? 'fallback' : 'failed')
      return
    }

    request.onStarted?.()

    try {
      await request.waitForVisuals?.(request.expectedHref)
      validate(request)

      diagnostics.transitionCount += 1
      publishDiagnostics()
      const completed = await request.runTransition(request.expectedHref, {
        preempt: true,
        navigationContext: request.context,
        navigationSource:
          NAVIGATION_SOURCES.HISTORY_TRANSITION_BRIDGE,
        shouldCommitRoute() {
          validate(request)
          return true
        },
        async afterRouteChange() {
          validate(request)
          request.routeCommitted = true
          contexts.advance(
            request.context,
            NAVIGATION_PHASES.RESTORING
          )
          await request.afterCommit?.()
          validate(request)
        }
      })

      if (!completed) {
        throw new Error('历史遍历桥接未完成路由提交。')
      }

      validate(request)
      contexts.complete(request.context)
      settle(request, 'completed')
    } catch (error) {
      if (!contexts.isCurrent(request.context)) {
        settle(request, 'stale', error)
        return
      }

      const restored = await restoreWithoutSecondLoad(request)
      if (!restored) request.lastError = error
      settle(request, restored ? 'fallback' : 'failed', error)
    }
  }

  function request(options) {
    const { context } = options
    if (
      !context ||
      context.source !== NAVIGATION_SOURCES.HISTORY_TRAVERSAL ||
      context.bridgeCount !== 0 ||
      !contexts.markBridge(context)
    ) {
      return false
    }

    if (pending) {
      cancelSchedule(pending.timer)
      pending = null
    }

    sequence += 1
    diagnostics.requestCount += 1
    publishDiagnostics()
    const snapshot = getSnapshot()
    const entry = {
      id: sequence,
      context,
      intent: options.intent ?? null,
      expectedHref: snapshot.href,
      expectedHistoryLength: snapshot.historyLength,
      waitForVisuals: options.waitForVisuals,
      runTransition: options.runTransition,
      afterCommit: options.afterCommit,
      restoreDefault: options.restoreDefault,
      onStarted: options.onStarted,
      onFinished: options.onFinished,
      routeCommitted: false,
      lastError: null,
      timer: null
    }
    pending = entry
    entry.timer = schedule(() => {
      void execute(entry)
    })
    return true
  }

  return {
    request,
    cancel,
    getPendingContext() {
      return pending?.context ?? null
    }
  }
}
