// 仅用于后退动画诊断；正常访问不会写入日志。
const DEBUG_EVENT = 'yuanxing:back-transition-debug'
const MAX_ENTRIES = 60
const entries = []
let enabled = false
let initialized = false
let nextId = 1

function isDebugEnabled() {
  if (typeof window === 'undefined') return false
  if (!initialized) {
    initialized = true
    enabled =
      new URLSearchParams(window.location.search).get('debug') === 'back'
  }
  return enabled
}

export function enableBackTransitionDebug() {
  initialized = true
  enabled = true
}

export function recordBackTransition(label, details = {}) {
  if (!isDebugEnabled()) return

  entries.push({
    id: nextId,
    time: Math.round(window.performance.now()),
    label,
    details
  })
  nextId += 1

  if (entries.length > MAX_ENTRIES) entries.shift()
  window.dispatchEvent(new Event(DEBUG_EVENT))
}

export function getBackTransitionEntries() {
  return entries.slice()
}

export function subscribeBackTransitionDebug(listener) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(DEBUG_EVENT, listener)
  return () => {
    window.removeEventListener(DEBUG_EVENT, listener)
  }
}
