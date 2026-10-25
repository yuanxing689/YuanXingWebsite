import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HISTORY_STRATEGIES,
  NAVIGATION_OPERATIONS,
  TRANSITION_STRATEGIES
} from '../../src/app/navigation/contracts.js'
import {
  createGameReturnIntent,
  createHomeSectionIntent
} from '../../src/app/navigation/navigationIntent.js'

test('显式区块导航 push，被动同步 replace', () => {
  const explicit = createHomeSectionIntent({
    targetUrl: '/#games',
    sectionId: 'games'
  })
  const passive = createHomeSectionIntent({
    targetUrl: '/#links',
    sectionId: 'links',
    passive: true
  })

  assert.equal(explicit.history, HISTORY_STRATEGIES.PUSH)
  assert.equal(passive.history, HISTORY_STRATEGIES.REPLACE)
  assert.equal(explicit.transition, TRANSITION_STRATEGIES.NONE)
  assert.equal(passive.restoration.scroll, 'hash')
})

test('浏览器后退的游戏返回使用同 URL 桥接策略', () => {
  const intent = createGameReturnIntent({
    targetUrl: 'http://localhost/#games',
    sectionId: 'games',
    cardKey: '/games/example/',
    fromHistoryTraversal: true
  })

  assert.equal(
    intent.operation,
    NAVIGATION_OPERATIONS.RETURN_GAME_CATALOG
  )
  assert.equal(intent.history, HISTORY_STRATEGIES.BRIDGE_SAME_URL)
  assert.equal(intent.transition, TRANSITION_STRATEGIES.SHARED_ELEMENTS)
  assert.deepEqual(intent.restoration, {
    restoreHome: true,
    restoreSection: true,
    restoreCard: true,
    scroll: 'snapshot'
  })
})
