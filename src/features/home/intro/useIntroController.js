import { onBeforeUnmount, ref } from 'vue'
import { applyIntroEndState } from './introState.js'

export function useIntroController({
  isHome,
  getHomeScene
}) {
  const introLocked = ref(isHome.value)
  const sceneFailed = ref(false)
  let introModule = null
  let introHandle = null
  let introLoadFailed = false
  let sceneReady = false

  function setIntroLock(locked) {
    introLocked.value = locked
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('intro-locked', locked)
  }

  setIntroLock(introLocked.value)

  function applyStaticPageVisuals() {
    document.documentElement.style.setProperty('--intro-backdrop', '1')
  }

  function resetIntro() {
    introHandle?.dispose()
    introHandle = null
    introLoadFailed = false
  }

  function finishIntro() {
    setIntroLock(false)
  }

  function updateSceneFrame() {
    introModule?.updateIntroEngine()
  }

  function applyLoadFallback() {
    const scene = sceneReady ? getHomeScene?.() ?? null : null
    applyIntroEndState(scene)
    setIntroLock(false)
  }

  async function loadIntroModule() {
    if (introModule) return true

    try {
      introModule = await import('./intro.js')
      introLoadFailed = false
      return true
    } catch (error) {
      introLoadFailed = true
      applyLoadFallback()
      console.error('开场模块加载失败，已切换到静态终态。', error)
      return false
    }
  }

  function startIntroIfReady() {
    if (!isHome.value || introLoadFailed || !introModule || introHandle) return
    if (!sceneReady && !sceneFailed.value) return

    introHandle = introModule.initIntro({
      scene: sceneReady ? getHomeScene?.() ?? null : null,
      onComplete: finishIntro
    })
  }

  function handleSceneReady() {
    sceneReady = true
    sceneFailed.value = false

    if (introLoadFailed) {
      applyLoadFallback()
      return
    }

    startIntroIfReady()
  }

  function handleSceneError() {
    sceneReady = false
    sceneFailed.value = true
    startIntroIfReady()
  }

  async function enterHome() {
    resetIntro()
    setIntroLock(true)

    const loaded = await loadIntroModule()
    if (!loaded || !isHome.value) return

    introModule.applyIntroFallback()
    startIntroIfReady()
  }

  function leaveHome() {
    resetIntro()
    setIntroLock(false)
    applyStaticPageVisuals()
  }

  function prepareHomeVisualScene() {
    applyIntroEndState(getHomeScene?.() ?? null)
    setIntroLock(false)
  }

  onBeforeUnmount(() => {
    resetIntro()
    setIntroLock(false)
  })

  return {
    introLocked,
    sceneFailed,
    enterHome,
    leaveHome,
    prepareHomeVisualScene,
    updateSceneFrame,
    handleSceneReady,
    handleSceneError
  }
}
