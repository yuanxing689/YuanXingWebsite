import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HOME_RETURN_SNAPSHOT_VERSION,
  createHomeReturnSnapshotStore
} from '../../src/features/home/restoration/homeReturnSnapshot.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
}

test('HomeReturnSnapshot 捕获、校验并更新稳定卡片键', () => {
  const storage = createStorage()
  const snapshots = createHomeReturnSnapshotStore({ storage })

  const captured = snapshots.capture({
    homeHash: '#games',
    cardKey: '/games/roadsyettraveled/',
    scrollY: 720
  })
  assert.deepEqual(captured, {
    version: HOME_RETURN_SNAPSHOT_VERSION,
    homeHash: '#games',
    cardKey: '/games/roadsyettraveled/',
    scrollY: 720
  })
  assert.deepEqual(snapshots.read(), captured)

  assert.equal(
    snapshots.updateCardKey('/games/game-wiki-sample/'),
    true
  )
  assert.equal(snapshots.read().cardKey, '/games/game-wiki-sample/')
})

test('损坏、旧版本或不完整快照会清除并返回空', () => {
  const storage = createStorage()
  const snapshots = createHomeReturnSnapshotStore({ storage })
  const key = 'yuanxing:home-return'

  for (const invalid of [
    '{',
    JSON.stringify({
      version: HOME_RETURN_SNAPSHOT_VERSION,
      homeHash: 'games',
      cardKey: '/games/example/',
      scrollY: 0
    }),
    JSON.stringify({
      version: 0,
      homeHash: '#games',
      cardKey: '/games/example/',
      scrollY: 0
    })
  ]) {
    storage.setItem(key, invalid)
    assert.equal(snapshots.read(), null)
    assert.equal(storage.getItem(key), null)
  }
})

test('无效捕获不会覆盖已有快照', () => {
  const storage = createStorage()
  const snapshots = createHomeReturnSnapshotStore({ storage })
  snapshots.capture({
    homeHash: '#games',
    cardKey: '/games/example/',
    scrollY: 0
  })

  assert.equal(snapshots.capture({
    homeHash: 'games',
    cardKey: '/games/other/',
    scrollY: -1
  }), null)
  assert.equal(snapshots.read().cardKey, '/games/example/')
})
