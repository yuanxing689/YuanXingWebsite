export const HOME_RETURN_SNAPSHOT_VERSION = 1
const STORAGE_KEY = 'yuanxing:home-return'

function isValidHash(value) {
  return typeof value === 'string' && (
    value === '' ||
    /^#[^\s]+$/.test(value)
  )
}

function normalizeCardKey(value) {
  const cardKey = String(value || '')
  try {
    const decoded = decodeURI(cardKey)
    return decoded.startsWith('/') ? decoded : ''
  } catch {
    return ''
  }
}

/**
 * 返回快照存储。无效版本、JSON 或字段会立即清除，让调用方进入默认恢复。
 */
export function createHomeReturnSnapshotStore({
  storage = null
} = {}) {
  function getStorage() {
    if (storage) return storage
    if (typeof window === 'undefined') return null
    return window.sessionStorage
  }

  function clear() {
    try {
      getStorage()?.removeItem(STORAGE_KEY)
    } catch {
      // 存储不可用时按无快照处理。
    }
  }

  function read() {
    let value
    try {
      value = getStorage()?.getItem(STORAGE_KEY)
    } catch {
      return null
    }
    if (!value) return null

    try {
      const snapshot = JSON.parse(value)
      const scrollY = snapshot?.scrollY
      const valid =
        snapshot?.version === HOME_RETURN_SNAPSHOT_VERSION &&
        isValidHash(snapshot.homeHash) &&
        normalizeCardKey(snapshot.cardKey) === snapshot.cardKey &&
        (
          scrollY === null ||
          (Number.isFinite(scrollY) && scrollY >= 0)
        )
      if (!valid) {
        clear()
        return null
      }
      return snapshot
    } catch {
      clear()
      return null
    }
  }

  function write(snapshot) {
    try {
      getStorage()?.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // 存储不可用时仍允许本次会话继续。
    }
    return snapshot
  }

  function capture({
    homeHash = '',
    cardKey,
    scrollY = null
  }) {
    const normalizedCardKey = normalizeCardKey(cardKey)
    if (!isValidHash(homeHash) || !normalizedCardKey) return null
    if (
      scrollY !== null &&
      (!Number.isFinite(scrollY) || scrollY < 0)
    ) {
      return null
    }

    return write({
      version: HOME_RETURN_SNAPSHOT_VERSION,
      homeHash,
      cardKey: normalizedCardKey,
      scrollY
    })
  }

  function updateCardKey(cardKey) {
    const snapshot = read()
    const normalizedCardKey = normalizeCardKey(cardKey)
    if (!snapshot || !normalizedCardKey) return false

    write({
      ...snapshot,
      cardKey: normalizedCardKey
    })
    return true
  }

  return {
    capture,
    read,
    updateCardKey,
    clear
  }
}

export const homeReturnSnapshotStore = createHomeReturnSnapshotStore()

export function readHomeReturnSnapshot() {
  return homeReturnSnapshotStore.read()
}

export function clearHomeReturnSnapshot() {
  homeReturnSnapshotStore.clear()
}
