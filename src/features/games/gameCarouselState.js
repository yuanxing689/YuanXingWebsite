import { ref } from 'vue'
import { toSitePath } from '../../app/navigation/sitePaths.js'
import {
  homeReturnSnapshotStore
} from '../home/restoration/homeReturnSnapshot.js'

const RETURN_READY_TIMEOUT = 300

export const returningGameKey = ref('')

let resolveReturnReady = null
let returnReadyPromise = Promise.resolve()

export function getGameCardKey(game) {
  const gameKey = game?.url || game?.id || game?.title || ''
  return toSitePath(gameKey)
}

export function readActiveGameKey() {
  return toSitePath(homeReturnSnapshotStore.read()?.cardKey || '')
}

export function rememberActiveGame(gameKey) {
  const normalizedKey = toSitePath(gameKey)
  if (!normalizedKey) return
  homeReturnSnapshotStore.updateCardKey(normalizedKey)
}

export function captureGameReturn(gameKey) {
  const cardKey = toSitePath(gameKey)
  if (!cardKey) return null

  const snapshot = homeReturnSnapshotStore.capture({
    homeHash: window.location.hash,
    cardKey,
    scrollY: window.scrollY
  })
  if (snapshot) rememberActiveGame(cardKey)
  return snapshot
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
