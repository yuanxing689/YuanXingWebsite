import { ref } from 'vue'
import { toSitePath } from '../../app/navigation/sitePaths.js'
import {
  homeReturnSnapshotStore
} from '../home/restoration/homeReturnSnapshot.js'

export const returningGameKey = ref('')

let returnReady = false

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
  returnReady = false
}

export function signalGameCarouselReady() {
  returnReady = true
}

export function isGameCarouselReady() {
  return returnReady
}

export function endGameReturn() {
  returningGameKey.value = ''
  returnReady = false
}
