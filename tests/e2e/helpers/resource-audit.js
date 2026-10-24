/**
 * 路由离场资源审计：统计未完成的 rAF、定时器和轮播视口监听器。
 * 仅在测试进程内包装浏览器 API，不修改站点源码。
 */
export async function installResourceAudit(page) {
  await page.addInitScript(() => {
    const rafs = new Map()
    const timeouts = new Map()
    const intervals = new Map()
    const listenersByTarget = new WeakMap()
    let activeCarouselListeners = 0

    const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window)
    const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window)
    const nativeSetTimeout = window.setTimeout.bind(window)
    const nativeClearTimeout = window.clearTimeout.bind(window)
    const nativeSetInterval = window.setInterval.bind(window)
    const nativeClearInterval = window.clearInterval.bind(window)

    window.requestAnimationFrame = (callback) => {
      let id
      const stack = new Error().stack || ''
      id = nativeRequestAnimationFrame((timestamp) => {
        rafs.delete(id)
        callback(timestamp)
      })
      rafs.set(id, stack)
      return id
    }

    window.cancelAnimationFrame = (id) => {
      rafs.delete(id)
      return nativeCancelAnimationFrame(id)
    }

    window.setTimeout = (callback, delay, ...args) => {
      if (typeof callback !== 'function') {
        return nativeSetTimeout(callback, delay, ...args)
      }
      let id
      const stack = new Error().stack || ''
      id = nativeSetTimeout(() => {
        timeouts.delete(id)
        callback.apply(window, args)
      }, delay)
      timeouts.set(id, { delay: Number(delay) || 0, stack })
      return id
    }

    window.clearTimeout = (id) => {
      timeouts.delete(id)
      return nativeClearTimeout(id)
    }

    window.setInterval = (callback, delay, ...args) => {
      if (typeof callback !== 'function') {
        return nativeSetInterval(callback, delay, ...args)
      }
      const stack = new Error().stack || ''
      const id = nativeSetInterval(() => callback.apply(window, args), delay)
      intervals.set(id, { delay: Number(delay) || 0, stack })
      return id
    }

    window.clearInterval = (id) => {
      intervals.delete(id)
      return nativeClearInterval(id)
    }

    const eventTarget = EventTarget.prototype
    const nativeAddEventListener = eventTarget.addEventListener
    const nativeRemoveEventListener = eventTarget.removeEventListener

    function captureFlag(options) {
      return typeof options === 'boolean' ? options : Boolean(options?.capture)
    }

    function isCarouselViewport(target) {
      return typeof Element !== 'undefined' &&
        target instanceof Element &&
        target.matches('.game-carousel__viewport')
    }

    eventTarget.addEventListener = function (type, listener, options) {
      if (listener && isCarouselViewport(this)) {
        let entries = listenersByTarget.get(this)
        if (!entries) {
          entries = []
          listenersByTarget.set(this, entries)
        }
        const capture = captureFlag(options)
        const exists = entries.some((entry) =>
          entry.type === type &&
          entry.listener === listener &&
          entry.capture === capture
        )
        if (!exists) {
          entries.push({ type, listener, capture })
          activeCarouselListeners += 1
        }
      }
      return nativeAddEventListener.call(this, type, listener, options)
    }

    eventTarget.removeEventListener = function (type, listener, options) {
      if (listener && isCarouselViewport(this)) {
        const entries = listenersByTarget.get(this) || []
        const capture = captureFlag(options)
        const index = entries.findIndex((entry) =>
          entry.type === type &&
          entry.listener === listener &&
          entry.capture === capture
        )
        if (index >= 0) {
          entries.splice(index, 1)
          activeCarouselListeners -= 1
        }
      }
      return nativeRemoveEventListener.call(this, type, listener, options)
    }

    Object.defineProperty(window, '__yuanxingE2EResourceAudit', {
      configurable: false,
      value: {
        snapshot() {
          return {
            pendingAnimationFrames: rafs.size,
            pendingTimeouts: timeouts.size,
            pendingIntervals: intervals.size,
            activeCarouselListeners,
            animationFrameStacks: [...rafs.values()].slice(0, 12),
            timeoutStacks: [...timeouts.values()]
              .map((item) => item.stack)
              .slice(0, 12)
          }
        }
      }
    })
  })
}

export async function readResourceAudit(page) {
  return page.evaluate(() => {
    if (!window.__yuanxingE2EResourceAudit) {
      throw new Error('Resource audit was not installed before page navigation')
    }
    return window.__yuanxingE2EResourceAudit.snapshot()
  })
}
