import { ref } from 'vue'
import { toSitePath } from '../../app/navigation/sitePaths.js'

const ACTIVE_GAME_KEY = 'yuanxing:active-game'
const RETURN_READY_TIMEOUT = 300

export const returningGameKey = ref('')

let resolveReturnReady = null
let returnReadyPromise = Promise.resolve()

export function getGameCardKey(game) {
  const gameKey = game?.url || game?.id || game?.title || ''
  return toSitePath(gameKey)
}

export function readActiveGameKey() {
  try {
    return toSitePath(window.sessionStorage.getItem(ACTIVE_GAME_KEY) || '')
  } catch {
    return ''
  }
}

export function rememberActiveGame(gameKey) {
  const normalizedKey = toSitePath(gameKey)
  if (!normalizedKey) return

  try {
    window.sessionStorage.setItem(ACTIVE_GAME_KEY, normalizedKey)
  } catch {
    // 存储不可用时保持当前会话行为
  }
}

export function beginGameReturn(gameKey) {
  returningGameKey.value = toSitePath(gameKey)
  returnReadyPromise = new Promise((resolve) => {
    resolveReturnReady = resolve
  })
}

export function waitForGameCarouselReady() {
  const timeout = new Promise((resolve) => {
    window.setTimeout(resolve, RETURN_READY_TIMEOUT)
  })

  return Promise.race([returnReadyPromise, timeout])
}

export function signalGameCarouselReady() {
  const resolve = resolveReturnReady
  resolveReturnReady = null
  resolve?.()
}

export function endGameReturn() {
  returningGameKey.value = ''
  resolveReturnReady = null
  returnReadyPromise = Promise.resolve()
}
