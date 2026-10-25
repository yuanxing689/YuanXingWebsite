import {
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch
} from 'vue'
import { getBootParam } from '../../app/runtime/bootParams.js'
import { createCosmicLoop } from './cosmicLoop.js'
import { createLogoScene } from './logoScene.js'
import { createPersistentNavigationScene } from './persistentNavigationScene.js'

const VISUAL_READY_TIMEOUT_MS = 4000

/**
 * 持久 Three.js 场景生命周期：两块 canvas 只初始化一次，
 * 首页模式只切换主星活动状态，常驻导航星由单一调度器持续驱动。
 */
export function usePersistentCosmicScenes({
  mainCanvas,
  navigationCanvas,
  isHome,
  getLogoTarget,
  getMainLogoOpacity,
  getNavigationTargets,
  getExtraDebugState = () => ({}),
  onIntroFrame,
  onLightUpdate,
  onMainSceneReady,
  onMainSceneError,
  onNavigationSceneReady,
  onNavigationSceneError
}) {
  const mainSceneFailed = ref(false)
  const navigationSceneFailed = ref(false)

  let mainScene = null
  let navigationScene = null
  let cosmicLoop = null
  let animationMedia = null
  let homeFrameRendered = false
  let navigationFrameRendered = false
  let preparedHomeVisuals = false
  let preparedLogoVisible = false
  let visualReadyWaiters = new Set()

  function isHomeMode() {
    return Boolean(toValue(isHome))
  }

  function resolveMainLogoOpacity() {
    if (!isHomeMode() && preparedHomeVisuals) {
      return preparedLogoVisible ? 1 : 0
    }

    return getMainLogoOpacity?.() ?? 1
  }

  function isVisualReady() {
    if (!isHomeMode() && !preparedHomeVisuals) return true
    const mainReady = Boolean(mainScene) || mainSceneFailed.value
    const navigationReady =
      Boolean(navigationScene) || navigationSceneFailed.value
    return mainReady && navigationReady && homeFrameRendered && navigationFrameRendered
  }

  function resolveVisualReadyWaiters() {
    if (!isVisualReady()) return

    visualReadyWaiters.forEach(({ resolve, timeout }) => {
      window.clearTimeout(timeout)
      resolve()
    })
    visualReadyWaiters = new Set()
  }

  function waitForVisualReady() {
    if (isVisualReady()) return Promise.resolve()

    return new Promise((resolve) => {
      const waiter = { resolve, timeout: 0 }
      waiter.timeout = window.setTimeout(() => {
        visualReadyWaiters.delete(waiter)
        resolve()
      }, VISUAL_READY_TIMEOUT_MS)
      visualReadyWaiters.add(waiter)
    })
  }

  function getNavigationIntro() {
    if ((!isHomeMode() && !preparedHomeVisuals) || !mainScene) {
      return [1, 1, 1]
    }

    return [
      mainScene.intro.nav1,
      mainScene.intro.nav2,
      mainScene.intro.nav3
    ]
  }

  function renderCosmicFrame({ elapsed, delta, frameCount }) {
    onIntroFrame?.()
    const reducedMotion = animationMedia?.matches ?? false

    if ((isHomeMode() || preparedHomeVisuals) && mainScene) {
      mainScene.update({ elapsed, delta })
      mainScene.render()
      homeFrameRendered = true
    }

    if (navigationScene) {
      navigationScene.setIntro(getNavigationIntro())
      navigationScene.update({
        targets: getNavigationTargets(),
        elapsed,
        reducedMotion
      })
      navigationScene.render()
      navigationFrameRendered = true
    }

    if (window.__yuanxingCosmicDebug) {
      window.__yuanxingCosmicDebug.frameCount = frameCount
      window.__yuanxingCosmicDebug.mainFrameCount +=
        (isHomeMode() || preparedHomeVisuals) && mainScene ? 1 : 0
      window.__yuanxingCosmicDebug.navigationFrameCount += navigationScene ? 1 : 0
    }

    resolveVisualReadyWaiters()
  }

  function initializeScenes() {
    animationMedia = window.matchMedia('(prefers-reduced-motion: reduce)')

    try {
      mainScene = createLogoScene(mainCanvas.value, {
        view: getBootParam('view') || 'front',
        animate: getBootParam('motion') !== 'off',
        getLogoTarget,
        getMainLogoOpacity: resolveMainLogoOpacity,
        onLightUpdate
      })
      mainScene.setActive(isHomeMode())
      onMainSceneReady?.()
    } catch (error) {
      mainSceneFailed.value = true
      homeFrameRendered = true
      onMainSceneError?.(error)
    }

    try {
      navigationScene = createPersistentNavigationScene(
        navigationCanvas.value,
        { getTargets: getNavigationTargets }
      )
      onNavigationSceneReady?.()
    } catch (error) {
      navigationSceneFailed.value = true
      navigationFrameRendered = true
      onNavigationSceneError?.(error)
    }

    if (import.meta.env.DEV) {
      window.__yuanxingCosmicDebug = {
        frameCount: 0,
        mainFrameCount: 0,
        navigationFrameCount: 0,
        getSnapshot: getDebugSnapshot
      }
    }

    if (mainScene || navigationScene) {
      cosmicLoop = createCosmicLoop({ onFrame: renderCosmicFrame })
      cosmicLoop.start()
    }
  }

  function prepareHomeVisuals({ logoVisible = true } = {}) {
    if (!mainScene) {
      mainSceneFailed.value = true
      homeFrameRendered = true
      resolveVisualReadyWaiters()
      return
    }

    preparedHomeVisuals = true
    preparedLogoVisible = logoVisible
    homeFrameRendered = false
    mainScene.setActive(true)
  }

  function getDebugSnapshot() {
    const loopState = cosmicLoop?.getState() ?? {
      isRunning: false,
      elapsed: 0,
      frameCount: 0,
      startCount: 0
    }

    return {
      ...loopState,
      mainFrameCount: window.__yuanxingCosmicDebug?.mainFrameCount ?? 0,
      navigationFrameCount:
        window.__yuanxingCosmicDebug?.navigationFrameCount ?? 0,
      mainActive: (isHomeMode() || preparedHomeVisuals) && Boolean(mainScene),
      mainLogoOpacity: resolveMainLogoOpacity(),
      mainSceneFailed: mainSceneFailed.value,
      navigationSceneFailed: navigationSceneFailed.value,
      ...getExtraDebugState()
    }
  }

  watch(isHomeMode, (home) => {
    mainScene?.setActive(home)
    homeFrameRendered = false
    preparedHomeVisuals = false
    preparedLogoVisible = false
  }, { flush: 'post' })

  onMounted(initializeScenes)

  onBeforeUnmount(() => {
    visualReadyWaiters.forEach(({ resolve, timeout }) => {
      window.clearTimeout(timeout)
      resolve()
    })
    visualReadyWaiters = new Set()
    cosmicLoop?.destroy()
    cosmicLoop = null
    mainScene?.destroy()
    mainScene = null
    navigationScene?.destroy()
    navigationScene = null

    if (window.__yuanxingCosmicDebug) {
      delete window.__yuanxingCosmicDebug
    }
  })

  return {
    mainSceneFailed,
    navigationSceneFailed,
    prepareHomeVisuals,
    waitForVisualReady,
    getHomeScene: () => mainScene
  }
}
