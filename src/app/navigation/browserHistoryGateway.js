/**
 * 应用层唯一 History API 入口。
 * 写操作只允许当前文档内的地址变化，不接管 VitePress 路由内部历史。
 */
export function createBrowserHistoryGateway({
  windowRef = null
} = {}) {
  function getWindow() {
    if (windowRef) return windowRef
    if (typeof window === 'undefined') {
      throw new Error('浏览器 History Gateway 只能在客户端使用。')
    }
    return window
  }

  function getHistory() {
    return getWindow().history
  }

  function getLocation() {
    return getWindow().location
  }

  function getHref() {
    return getLocation().href
  }

  function getLocationKey(href = getHref()) {
    const url = new URL(href, getLocation().origin)
    return `${url.pathname}${url.search}${url.hash}`
  }

  function assertSameDocument(href) {
    const current = new URL(getHref())
    const next = new URL(href, current)
    if (
      next.origin !== current.origin ||
      next.pathname !== current.pathname
    ) {
      throw new Error('History Gateway 只允许当前文档内的导航。')
    }
    return next
  }

  function write(method, href, state) {
    assertSameDocument(href)
    getHistory()[method](state, '', href)
  }

  return {
    getHref,
    getLocationKey,
    getLength: () => getHistory().length,
    getState: () => getHistory().state ?? {},
    getScrollRestoration: () => getHistory().scrollRestoration,
    setScrollRestoration(value) {
      getHistory().scrollRestoration = value
    },
    push(href, state) {
      write('pushState', href, state)
    },
    replace(href, state) {
      write('replaceState', href, state)
    }
  }
}
