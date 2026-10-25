import assert from 'node:assert/strict'
import test from 'node:test'
import {
  TRANSITION_STRATEGIES
} from '../../src/app/navigation/contracts.js'
import { createTransitionOrchestrator } from '../../src/app/transitions/transitionOrchestrator.js'

function createHarness({
  reducedMotion = false,
  native = true
} = {}) {
  const classes = new Set()
  const documentRef = {
    documentElement: {
      classList: {
        add(value) {
          classes.add(value)
        },
        remove(value) {
          classes.delete(value)
        }
      }
    },
    activeViewTransition: null
  }
  let starts = 0
  if (native) {
    documentRef.startViewTransition = (callback) => {
      starts += 1
      const finished = Promise.resolve().then(callback).then(() => {})
      return {
        ready: Promise.resolve(),
        finished,
        skipTransition() {}
      }
    }
  }
  const timerDelays = []
  let frameCount = 0
  const windowRef = {
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout(callback, delay) {
      timerDelays.push(delay)
      callback()
      return 1
    },
    requestAnimationFrame(callback) {
      frameCount += 1
      callback()
      return 1
    }
  }
  const orchestrator = createTransitionOrchestrator({
    windowRef,
    documentRef
  })
  return {
    classes,
    documentRef,
    getFrameCount: () => frameCount,
    getStarts: () => starts,
    orchestrator,
    timerDelays
  }
}

test('共享元素策略只执行一次原生 View Transition', async () => {
  const harness = createHarness()
  let updates = 0
  const result = await harness.orchestrator.run({
    intent: { transition: TRANSITION_STRATEGIES.SHARED_ELEMENTS }
  }, async () => {
    updates += 1
    return true
  })

  assert.equal(result, true)
  assert.equal(updates, 1)
  assert.equal(harness.getStarts(), 1)
  assert.equal(harness.classes.size, 0)
})

test('减少动态效果与 none 策略直接提交', async () => {
  const reduced = createHarness({ reducedMotion: true })
  let reducedUpdates = 0
  await reduced.orchestrator.run({
    intent: { transition: TRANSITION_STRATEGIES.SHARED_ELEMENTS }
  }, async () => {
    reducedUpdates += 1
  })

  const none = createHarness()
  let noneUpdates = 0
  await none.orchestrator.run({
    intent: { transition: TRANSITION_STRATEGIES.NONE }
  }, async () => {
    noneUpdates += 1
  })

  assert.equal(reducedUpdates, 1)
  assert.equal(reduced.getStarts(), 0)
  assert.equal(noneUpdates, 1)
  assert.equal(none.getStarts(), 0)
})

test('原生 API 不存在或启动失败时使用一次 CSS 降级', async () => {
  const unsupported = createHarness({ native: false })
  let fallbackUpdates = 0
  const fallbackPromise = unsupported.orchestrator.run({
    intent: { transition: TRANSITION_STRATEGIES.SHARED_ELEMENTS }
  }, async () => {
    fallbackUpdates += 1
    return true
  })
  assert.equal(await fallbackPromise, true)

  const broken = createHarness()
  broken.documentRef.startViewTransition = () => {
    throw new Error('unsupported')
  }
  let brokenUpdates = 0
  const brokenPromise = broken.orchestrator.run({
    intent: { transition: TRANSITION_STRATEGIES.SHARED_ELEMENTS }
  }, async () => {
    brokenUpdates += 1
  })
  await brokenPromise

  assert.equal(fallbackUpdates, 1)
  assert.equal(brokenUpdates, 1)
  assert.equal(unsupported.timerDelays.includes(140), true)
  assert.equal(unsupported.getFrameCount(), 1)
  assert.equal(unsupported.classes.size, 0)
  assert.equal(broken.classes.size, 0)
})

test('更新回调失败不会重复提交并清理转场类', async () => {
  const harness = createHarness()
  let updates = 0

  await assert.rejects(
    harness.orchestrator.run({
      intent: { transition: TRANSITION_STRATEGIES.SHARED_ELEMENTS }
    }, async () => {
      updates += 1
      throw new Error('route failed')
    }),
    /route failed/
  )

  assert.equal(updates, 1)
  assert.equal(harness.classes.size, 0)
})
