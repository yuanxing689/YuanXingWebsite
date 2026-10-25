import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NAVIGATION_SOURCES
} from '../../src/app/navigation/contracts.js'
import { createHistoryTransitionBridge } from '../../src/app/navigation/historyTransitionBridge.js'
import { createNavigationContextStore } from '../../src/app/navigation/navigationContext.js'

function createHarness() {
  const contexts = createNavigationContextStore()
  const history = {
    href: 'http://localhost/#games',
    length: 4,
    reloadCount: 0
  }
  const historyGateway = {
    getHref: () => history.href,
    getLength: () => history.length
  }
  const routerAdapter = {
    async reloadCommittedUrl() {
      history.reloadCount += 1
    }
  }
  const bridge = createHistoryTransitionBridge({
    contexts,
    historyGateway,
    routerAdapter,
    settleDelayMs: 0,
    schedule(callback) {
      queueMicrotask(callback)
      return 1
    },
    cancelSchedule() {}
  })
  return { bridge, contexts, history }
}

async function flushTasks() {
  await new Promise((resolve) => setImmediate(resolve))
  await new Promise((resolve) => setImmediate(resolve))
}

function beginTraversal(contexts, href = 'http://localhost/#games') {
  return contexts.begin({
    source: NAVIGATION_SOURCES.HISTORY_TRAVERSAL,
    targetUrl: href
  })
}

test('同一历史遍历只执行一次同 URL 桥接', async () => {
  const { bridge, contexts, history } = createHarness()
  const context = beginTraversal(contexts)
  let runs = 0
  let result = null

  const started = bridge.request({
    context,
    async runTransition(href, options) {
      runs += 1
      assert.equal(href, history.href)
      assert.equal(options.navigationContext, context)
      assert.equal(options.shouldCommitRoute(), true)
      await options.afterRouteChange()
      return true
    },
    onFinished(status) {
      result = status
    }
  })

  assert.equal(started, true)
  assert.equal(
    bridge.request({ context, runTransition: async () => true }),
    false
  )
  await flushTasks()

  assert.equal(runs, 1)
  assert.equal(history.reloadCount, 0)
  assert.equal(context.bridgeCount, 1)
  assert.equal(result.status, 'completed')
})

test('新历史遍历会让旧桥接失效且不再执行', async () => {
  const { bridge, contexts } = createHarness()
  const oldContext = beginTraversal(contexts)
  let runs = 0
  let result = null

  bridge.request({
    context: oldContext,
    async runTransition() {
      runs += 1
      return true
    },
    onFinished(status) {
      result = status
    }
  })
  beginTraversal(contexts, 'http://localhost/#about')
  await flushTasks()

  assert.equal(runs, 0)
  assert.equal(result.status, 'stale')
  assert.equal(oldContext.invalidated, true)
})

test('执行前 URL 或历史长度变化时只做一次无动画提交', async () => {
  const { bridge, contexts, history } = createHarness()
  const context = beginTraversal(contexts)
  let runs = 0
  let restores = 0

  bridge.request({
    context,
    async runTransition() {
      runs += 1
      return true
    },
    async restoreDefault() {
      restores += 1
    }
  })
  history.length = 5
  await flushTasks()

  assert.equal(runs, 0)
  assert.equal(history.reloadCount, 1)
  assert.equal(restores, 1)
})

test('转场失败时同一次桥接最多执行一次回退提交', async () => {
  const { bridge, contexts, history } = createHarness()
  const context = beginTraversal(contexts)
  let restores = 0
  let result = null

  bridge.request({
    context,
    async runTransition() {
      throw new Error('transition failed')
    },
    async restoreDefault() {
      restores += 1
    },
    onFinished(status) {
      result = status
    }
  })
  await flushTasks()

  assert.equal(history.reloadCount, 1)
  assert.equal(restores, 1)
  assert.equal(result.status, 'fallback')
})

test('路由已提交后恢复失败不会重复加载页面', async () => {
  const { bridge, contexts, history } = createHarness()
  const context = beginTraversal(contexts)
  let restores = 0

  bridge.request({
    context,
    async runTransition(href, options) {
      await options.afterRouteChange()
      return true
    },
    async afterCommit() {
      throw new Error('restore failed')
    },
    async restoreDefault() {
      restores += 1
    }
  })
  await flushTasks()

  assert.equal(history.reloadCount, 0)
  assert.equal(restores, 1)
})
