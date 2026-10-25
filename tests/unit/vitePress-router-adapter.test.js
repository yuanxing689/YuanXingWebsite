import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NAVIGATION_PHASES,
  NAVIGATION_SOURCES
} from '../../src/app/navigation/contracts.js'
import { createNavigationContextStore } from '../../src/app/navigation/navigationContext.js'
import { createVitePressRouterAdapter } from '../../src/app/navigation/vitePressRouterAdapter.js'

function createEnvironment() {
  const listeners = []
  const windowRef = {
    location: {
      href: 'http://localhost/#about'
    },
    addEventListener(type, listener, capture) {
      listeners.push({ type, listener, capture })
    },
    removeEventListener(type, listener, capture) {
      const index = listeners.findIndex((entry) =>
        entry.type === type &&
        entry.listener === listener &&
        entry.capture === capture
      )
      if (index >= 0) listeners.splice(index, 1)
    }
  }
  const calls = []
  const router = {
    onBeforeRouteChange: null,
    onBeforePageLoad: null,
    onAfterRouteChange: null,
    async go(href) {
      calls.push(href)
    }
  }
  return { calls, listeners, router, windowRef }
}

test('Router Adapter 只在 capture 阶段建立一次历史遍历上下文', () => {
  const { listeners, router, windowRef } = createEnvironment()
  const contexts = createNavigationContextStore()
  const adapter = createVitePressRouterAdapter(router, {
    contexts,
    windowRef
  })
  const uninstall = adapter.install()

  assert.equal(listeners.length, 1)
  assert.equal(listeners[0].type, 'popstate')
  assert.equal(listeners[0].capture, true)

  windowRef.location.href = 'http://localhost/#games'
  listeners[0].listener({})
  const context = contexts.getCurrent()
  assert.equal(context.source, NAVIGATION_SOURCES.HISTORY_TRAVERSAL)
  assert.equal(context.phase, NAVIGATION_PHASES.PENDING)

  uninstall()
  assert.equal(listeners.length, 0)
  assert.equal(router.onBeforeRouteChange, null)
})

test('钩子按安装前的处理器、订阅顺序组合', async () => {
  const { router, windowRef } = createEnvironment()
  const order = []
  router.onBeforePageLoad = async () => {
    order.push('previous')
  }
  const adapter = createVitePressRouterAdapter(router, { windowRef })
  const uninstall = adapter.install({
    async onBeforePageLoad() {
      order.push('subscriber')
    }
  })

  await router.onBeforePageLoad('/#about')
  assert.deepEqual(order, ['previous', 'subscriber'])
  uninstall()
})

test('普通导航使用 Adapter 且恢复最新 URL 不产生额外语义', async () => {
  const { calls, router, windowRef } = createEnvironment()
  const contexts = createNavigationContextStore()
  const adapter = createVitePressRouterAdapter(router, {
    contexts,
    windowRef
  })
  const uninstall = adapter.install()

  await adapter.navigate('/games/example/')
  assert.deepEqual(calls, ['/games/example/'])
  assert.equal(
    contexts.getCurrent().source,
    NAVIGATION_SOURCES.PROGRAMMATIC
  )

  await adapter.reloadCommittedUrl()
  assert.deepEqual(calls, [
    '/games/example/',
    'http://localhost/#about'
  ])
  uninstall()
})
