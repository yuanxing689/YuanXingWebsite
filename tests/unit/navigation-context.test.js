import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NAVIGATION_PHASES,
  NAVIGATION_SOURCES
} from '../../src/app/navigation/contracts.js'
import { createNavigationContextStore } from '../../src/app/navigation/navigationContext.js'

test('新导航会让旧事务失效且旧事务不能再推进阶段', () => {
  const contexts = createNavigationContextStore()
  const previous = contexts.begin({
    source: NAVIGATION_SOURCES.PROGRAMMATIC,
    targetUrl: 'http://localhost/#about'
  })
  const next = contexts.begin({
    source: NAVIGATION_SOURCES.HISTORY_TRAVERSAL,
    targetUrl: 'http://localhost/#games'
  })

  assert.equal(contexts.isCurrent(previous), false)
  assert.equal(previous.invalidated, true)
  assert.equal(previous.phase, NAVIGATION_PHASES.CANCELLED)
  assert.equal(contexts.advance(previous, NAVIGATION_PHASES.COMMITTED), false)
  assert.equal(contexts.isCurrent(next), true)
})

test('同一遍历最多桥接一次', () => {
  const contexts = createNavigationContextStore()
  const context = contexts.begin({
    source: NAVIGATION_SOURCES.HISTORY_TRAVERSAL,
    targetUrl: 'http://localhost/#games'
  })

  assert.equal(contexts.markBridge(context), true)
  assert.equal(context.bridgeCount, 1)
  assert.equal(
    context.source,
    NAVIGATION_SOURCES.HISTORY_TRANSITION_BRIDGE
  )
  assert.equal(contexts.markBridge(context), false)
  assert.equal(context.bridgeCount, 1)
})

test('阶段迁移校验来源和事务有效性', () => {
  const contexts = createNavigationContextStore()
  const context = contexts.begin({
    source: NAVIGATION_SOURCES.INITIAL,
    targetUrl: 'http://localhost/'
  })

  assert.equal(
    contexts.advance(context, NAVIGATION_PHASES.PENDING),
    true
  )
  assert.equal(context.phase, NAVIGATION_PHASES.PENDING)
  assert.throws(() => {
    contexts.begin({
      source: 'unknown',
      targetUrl: 'http://localhost/'
    })
  }, /未知导航来源/)
})
