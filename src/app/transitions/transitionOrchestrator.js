import {
  TRANSITION_STRATEGIES
} from '../navigation/contracts.js'
import { runCssRouteTransition } from './cssRouteTransition.js'
import {
  runNativeViewTransition,
  settleNativeTransition
} from './nativeViewTransition.js'

const TRANSITIONING_CLASS = 'game-route-transitioning'

/**
 * @returns {import('../navigation/contracts.js').TransitionOrchestrator}
 */
export function createTransitionOrchestrator({
  windowRef = null,
  documentRef = null
} = {}) {
  let activeTransition = null

  function getWindow() {
    return windowRef ??
      (typeof window === 'undefined' ? null : window)
  }

  function getDocument() {
    return documentRef ??
      (typeof document === 'undefined' ? null : document)
  }

  async function settle() {
    const document = getDocument()
    if (!document) return
    await settleNativeTransition(document, activeTransition)
    activeTransition = null
  }

  async function run(navigation, update) {
    const window = getWindow()
    const document = getDocument()
    if (!window || !document) return update()

    await settle()
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const strategy =
      navigation?.intent?.transition ??
      TRANSITION_STRATEGIES.FALLBACK

    if (
      reducedMotion ||
      strategy === TRANSITION_STRATEGIES.NONE
    ) {
      return update()
    }

    const root = document.documentElement
    root.classList.add(TRANSITIONING_CLASS)
    try {
      const nativeResult = await runNativeViewTransition({
        documentRef: document,
        update
      })
      if (nativeResult.used) {
        activeTransition = nativeResult.transition
        return nativeResult.result
      }

      return await runCssRouteTransition({
        windowRef: window,
        documentRef: document,
        update
      })
    } finally {
      activeTransition = null
      root.classList.remove(TRANSITIONING_CLASS)
    }
  }

  return {
    run,
    dispose: settle
  }
}
