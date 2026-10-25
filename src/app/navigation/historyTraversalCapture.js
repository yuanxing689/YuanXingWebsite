/**
 * 必须在 VitePress 创建 Router 之前执行。
 * `popstate` 的目标节点是 window，仅设置 capture 不能越过更早注册的
 * 同目标监听器；因此主题引导阶段先安装，Adapter 安装后只订阅结果。
 */
function createHistoryTraversalCapture() {
  let installedWindow = null
  let removeListener = null
  const subscribers = new Set()

  function handlePopState(event) {
    const snapshot = {
      event,
      href: installedWindow.location.href,
      historyLength: installedWindow.history.length
    }
    Array.from(subscribers).forEach((subscriber) => subscriber(snapshot))
  }

  function install({ windowRef = null } = {}) {
    const targetWindow = windowRef ??
      (typeof window === 'undefined' ? null : window)
    if (!targetWindow || installedWindow === targetWindow) return

    removeListener?.()
    installedWindow = targetWindow
    targetWindow.addEventListener('popstate', handlePopState, true)
    removeListener = () => {
      targetWindow.removeEventListener('popstate', handlePopState, true)
    }
  }

  function subscribe(subscriber, options = {}) {
    install(options)
    subscribers.add(subscriber)
    return () => subscribers.delete(subscriber)
  }

  return {
    install,
    subscribe
  }
}

const historyTraversalCapture = createHistoryTraversalCapture()

export function installHistoryTraversalCapture(options) {
  historyTraversalCapture.install(options)
}

export function subscribeHistoryTraversal(subscriber, options) {
  return historyTraversalCapture.subscribe(subscriber, options)
}
