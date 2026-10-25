import * as THREE from 'three'
import {
  createCosmicCamera,
  createCosmicRenderer,
  resizeCosmicCamera
} from './cosmicRuntime.js'
import { createLogoBloom } from './logoBloom.js'
import {
  createNavigationStarField,
  createNavigationStarUpdater
} from './navigationStars.js'

/**
 * 导航星场景只负责自身资源、尺寸和单帧绘制。
 * 生命周期与 requestAnimationFrame 由 usePersistentCosmicScenes 统一管理。
 */
export function createPersistentNavigationScene(canvas, {
  getTargets = () => []
} = {}) {
  const renderer = createCosmicRenderer(canvas)
  const scene = new THREE.Scene()
  const camera = createCosmicCamera()
  const field = createNavigationStarField({ count: 3 })
  const updateStars = createNavigationStarUpdater(field)
  const bloom = createLogoBloom(renderer, scene, camera)
  bloom.setIntensity(1)
  scene.add(field.group)

  function resize() {
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    renderer.setSize(width, height, false)
    bloom.resize(width, height)
    resizeCosmicCamera(camera, width, height)
  }

  function setIntro(reveals) {
    field.setIntro(reveals)
  }

  function update({ elapsed, reducedMotion = false }) {
    updateStars({
      targets: getTargets(),
      bounds: canvas.getBoundingClientRect(),
      camera,
      elapsed,
      reducedMotion
    })
    field.update(reducedMotion ? 0 : elapsed, !reducedMotion)
  }

  function render() {
    bloom.render()
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  resize()

  return {
    resize,
    setIntro,
    update,
    render,
    destroy() {
      resizeObserver.disconnect()
      field.dispose()
      bloom.dispose()
      renderer.dispose()
    }
  }
}
