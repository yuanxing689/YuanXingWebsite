// 全站 Three.js 唯一持续帧调度器。
export function createCosmicLoop({ onFrame }) {
  let frameId = null
  let lastTimestamp = 0
  let elapsed = 0
  let frameCount = 0
  let startCount = 0

  function tick(timestamp) {
    if (frameId === null) return

    if (!lastTimestamp) lastTimestamp = timestamp
    const delta = Math.min(Math.max((timestamp - lastTimestamp) / 1000, 0), 0.05)
    lastTimestamp = timestamp
    elapsed += delta
    frameCount += 1

    onFrame({ timestamp, delta, elapsed, frameCount })
    frameId = window.requestAnimationFrame(tick)
  }

  function start() {
    if (frameId !== null) return

    startCount += 1
    lastTimestamp = 0
    frameId = window.requestAnimationFrame(tick)
  }

  function stop() {
    if (frameId === null) return

    window.cancelAnimationFrame(frameId)
    frameId = null
  }

  return {
    start,
    stop,
    destroy: stop,
    getState() {
      return {
        isRunning: frameId !== null,
        elapsed,
        frameCount,
        startCount
      }
    }
  }
}
