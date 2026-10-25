import * as THREE from 'three'

export const COSMIC_FRUSTUM_SIZE = 1.35
const SOFTWARE_RENDERER_PATTERN = /swiftshader|llvmpipe|software/i
// 软件 WebGL 降低像素比，并由场景跳过全屏 Bloom，避免阻塞页面主线程。
const SOFTWARE_PIXEL_RATIO = 0.6

export function createCosmicRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  const softwareRenderer = detectSoftwareRenderer(renderer)
  renderer.cosmicSoftwareRenderer = softwareRenderer
  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      softwareRenderer ? SOFTWARE_PIXEL_RATIO : 2
    )
  )
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.setClearColor(0x000000, 0)
  return renderer
}

function detectSoftwareRenderer(renderer) {
  const gl = renderer.getContext()
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  if (!debugInfo) return false

  const rendererName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
  return SOFTWARE_RENDERER_PATTERN.test(String(rendererName))
}

export function isSoftwareCosmicRenderer(renderer) {
  return renderer.cosmicSoftwareRenderer === true
}

export function createCosmicCamera() {
  const camera = new THREE.OrthographicCamera(
    -COSMIC_FRUSTUM_SIZE,
    COSMIC_FRUSTUM_SIZE,
    COSMIC_FRUSTUM_SIZE,
    -COSMIC_FRUSTUM_SIZE,
    0.1,
    50
  )
  camera.position.set(0, 0, 5)
  camera.up.set(0, 1, 0)
  camera.lookAt(0, 0, 0)
  return camera
}

export function resizeCosmicCamera(camera, width, height) {
  const aspect = width / Math.max(height, 1)
  const halfHeight = COSMIC_FRUSTUM_SIZE / Math.min(aspect, 1)
  camera.left = -halfHeight * aspect
  camera.right = halfHeight * aspect
  camera.top = halfHeight
  camera.bottom = -halfHeight
  camera.updateProjectionMatrix()
}
