import * as THREE from 'three'
import { createSparkleOctagramGeometry } from './starGeometry.js'
import { createRibbonGeometry } from './ribbonGeometry.js'
import { createLogoOrbitProfiles } from './logoOrbitProfiles.js'
import { createCosmicMaterials, MAIN_STAR_BREATH_SPEED } from './cosmicMaterials.js'
import { createLogoBloom } from './logoBloom.js'
import {
  createCosmicCamera,
  createCosmicRenderer,
  isSoftwareCosmicRenderer,
  resizeCosmicCamera
} from './cosmicRuntime.js'

// 星体外观：哑光深蓝，体积交给模型本身，材质只做基础塑形
const STAR_MATERIAL = {
  color: 0x213c6e,
  metalness: 0.55,
  roughness: 0.42,
  clearcoat: 0.3,
  clearcoatRoughness: 0.4,
  emissive: 0x060c1c,
  emissiveIntensity: 0.12,
  envMapIntensity: 0.9
}

// 星芒比例取自参考图测量值：针芒细长、谷点内凹
// concavity 控制边缘内凹深度：越大针芒越细越锋利
// radiusX 控制针芒根部的鼓包半径，radiusY 控制针芒长度
// valleyX / valleyY 控制谷点位置：贴近 1 时根部过渡平滑
const NEEDLE = {
  valleyX: 0.85,
  valleyY: 0.05,
  concavity: 0.76,
  curveSegments: 64
}
const VERTICAL_STAR = { ...NEEDLE, radiusX: 0.2, radiusY: 1.12 }
const HORIZONTAL_STAR = { ...NEEDLE, radiusX: 0.2, radiusY: 1.02 }
const DIAGONAL_STAR = { ...NEEDLE, radiusX: 0.14, radiusY: 0.62 }
const OCTAGRAM = {
  halfThickness: 0.17,
  edgeStart: 0.88,
  edgeThicknessRatio: 0.12,
  radialSegments: 512,
  rings: 96
}
const POINTER_TILT = {
  pitch: 0.18,
  yaw: 0.28
}
// 八角轮廓由长针主星与 45° 短针星取并集，前后共用同一厚度场
function buildStarEmblem(material) {
  const geometry = createSparkleOctagramGeometry({
    primary: {
      vertical: VERTICAL_STAR,
      horizontal: HORIZONTAL_STAR
    },
    secondary: {
      vertical: DIAGONAL_STAR,
      horizontal: DIAGONAL_STAR
    },
    ...OCTAGRAM
  })
  return new THREE.Mesh(geometry, material)
}

// 程序化生成摄影棚式环境贴图：上亮下暗的蓝色渐变 + 两条高光带
function createStudioEnvironment(renderer) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height)
  sky.addColorStop(0, '#0b1430')
  sky.addColorStop(0.4, '#2f57a6')
  sky.addColorStop(0.55, '#16294f')
  sky.addColorStop(1, '#04060d')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const band = (x, y, w, h, color, alpha) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, w)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = alpha
    ctx.fillStyle = gradient
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, h / w)
    ctx.translate(-x, -y)
    ctx.fillRect(x - w, y - w, w * 2, w * 2)
    ctx.restore()
    ctx.globalAlpha = 1
  }

  band(300, 150, 320, 130, '#eaf2ff', 0.95)
  band(760, 190, 260, 110, '#7db4ff', 0.8)
  band(520, 400, 360, 150, '#20408a', 0.7)

  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envMap = pmrem.fromEquirectangular(texture).texture
  pmrem.dispose()
  texture.dispose()
  return envMap
}

// 冷色三点光：主光塑形、轮廓光勾边、底部补光
function buildLights(scene) {
  scene.add(new THREE.AmbientLight(0x24365e, 0.7))

  const key = new THREE.DirectionalLight(0xdceaff, 2.2)
  key.position.set(2.6, 3.0, 4.4)
  scene.add(key)

  const rim = new THREE.DirectionalLight(0x4f8dff, 1.5)
  rim.position.set(-3.4, -1.6, 2.6)
  scene.add(rim)

  const fill = new THREE.PointLight(0x86bcff, 26, 16, 2)
  fill.position.set(0, -2.2, 3.2)
  scene.add(fill)
}

export function createLogoScene(canvas, {
  animate = true,
  view = 'front',
  onLightUpdate,
  getLogoTarget,
  getMainLogoOpacity
} = {}) {
  const renderer = createCosmicRenderer(canvas)

  const scene = new THREE.Scene()
  const environment = createStudioEnvironment(renderer)
  scene.environment = environment

  const camera = createCosmicCamera()
  const isSideView = view === 'side'
  if (isSideView) {
    camera.position.set(5, 0.05, 0)
    camera.lookAt(0, 0, 0)
  }

  buildLights(scene)

  const cosmicMaterials = createCosmicMaterials()
  const starMaterial = cosmicMaterials.star
  const orbitMaterial = cosmicMaterials.ribbon

  const root = new THREE.Group()
  root.name = 'LogoRoot'
  const starLight = new THREE.PointLight(0xfff4d6, 1.5, 3.4, 2)
  starLight.name = 'StarLight'
  starLight.position.set(0, 0, 0.18)
  root.add(starLight)
  const star = buildStarEmblem(starMaterial)
  star.name = 'StarEmblem'
  const starGlow = new THREE.Mesh(star.geometry.clone(), cosmicMaterials.starGlow)
  starGlow.name = 'StarGlow'
  starGlow.scale.setScalar(1.028)
  root.add(starGlow)
  root.add(star)
  const parts = { star }
  for (const orbit of createLogoOrbitProfiles()) {
    const ribbon = new THREE.Mesh(createRibbonGeometry(orbit), orbitMaterial)
    ribbon.name = orbit.name
    parts[orbit.name] = ribbon
    root.add(ribbon)
  }
  scene.add(root)
  // 星标模型整体缩放（略大于 1 让徽章在画面中更饱满）
  const MODEL_SCALE = 1.06
  root.scale.setScalar(MODEL_SCALE)

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const bloom = createLogoBloom(renderer, scene, camera, {
    enabled: !isSoftwareCosmicRenderer(renderer)
  })

  // 开场动画状态：由外部时间轴（Anime.js）直接改写，渲染循环每帧读取并应用
  const intro = {
    starReveal: -0.2,
    ringReveal: 0,
    star: 0,
    ribbon: 0,
    glow: 0,
    light: 0,
    bloom: 0,
    motion: 0,
    nav1: 0,
    nav2: 0,
    nav3: 0
  }
  const STAR_LIGHT_INTENSITY = starLight.intensity
  let mainLogoOpacity = 1

  const pointer = { x: 0, y: 0 }
  const targetTilt = { x: 0, y: 0 }
  const currentTilt = { x: 0, y: 0 }
  let active = true
  const starLightWorldPosition = new THREE.Vector3()
  const starLightScreenPosition = new THREE.Vector3()

  function applyIntro() {
    mainLogoOpacity = THREE.MathUtils.clamp(getMainLogoOpacity?.() ?? 1, 0, 1)
    starMaterial.uniforms.uIntro.value = intro.star
    starMaterial.uniforms.uReveal.value = intro.starReveal
    starMaterial.uniforms.uOpacity.value = mainLogoOpacity
    orbitMaterial.uniforms.uIntro.value = intro.ribbon
    orbitMaterial.uniforms.uReveal.value = intro.ringReveal
    orbitMaterial.uniforms.uOpacity.value = mainLogoOpacity
    cosmicMaterials.starGlow.uniforms.uIntro.value = intro.glow
    cosmicMaterials.starGlow.uniforms.uOpacity.value = mainLogoOpacity
    starLight.intensity = STAR_LIGHT_INTENSITY * intro.light
    bloom.setIntensity(intro.bloom)
  }

  function resize() {
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 1
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 1
    renderer.setSize(width, height, false)
    bloom.resize(width, height)
    resizeCosmicCamera(camera, width, height)
    root.scale.setScalar(MODEL_SCALE)
    applyIntro()
  }

  function updateLogoFromTarget() {
    const target = getLogoTarget?.()
    if (!target) {
      root.visible = mainLogoOpacity > 0.001
      root.scale.setScalar(MODEL_SCALE)
      root.position.set(0, 0, 0)
      return
    }

    const rect = target.getBoundingClientRect()
    const bounds = canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return

    const visible = rect.bottom > 0 && rect.top < bounds.height && rect.right > 0 && rect.left < bounds.width
    root.visible = visible && mainLogoOpacity > 0.001
    if (!visible) return

    const worldWidth = camera.right - camera.left
    const worldHeight = camera.top - camera.bottom
    const centerX = rect.left + rect.width / 2 - bounds.left
    const centerY = rect.top + rect.height / 2 - bounds.top
    root.position.set(
      camera.left + (centerX / bounds.width) * worldWidth,
      camera.top - (centerY / bounds.height) * worldHeight,
      0
    )
    root.scale.setScalar(MODEL_SCALE * ((rect.height / bounds.height) * worldHeight / 2.7))
  }

  function onPointerMove(event) {
    if (event.pointerType === 'touch') return

    const rect = canvas.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    targetTilt.y = pointer.x * POINTER_TILT.yaw
    targetTilt.x = pointer.y * POINTER_TILT.pitch
  }

  function onPointerLeave() {
    targetTilt.x = 0
    targetTilt.y = 0
    pointer.x = 0
    pointer.y = 0
  }

  function update({ elapsed, delta }) {
    if (!active) return

    applyIntro()

    // 固定正视相机，小幅转动整个徽章，保留原图交汇点与主轮廓。
    const motionEnabled = animate && !isSideView && !reducedMotion.matches
    // 开场期间先锁住摆动与指针视差，动画结束后再交给交互相
    const motionScale = motionEnabled ? intro.motion : 0
    const sway = Math.sin(elapsed * 0.28) * 0.012 * motionScale
    const pitch = Math.sin(elapsed * 0.24) * 0.015 * motionScale
    const damping = 1 - Math.exp(-8 * delta)
    currentTilt.x = THREE.MathUtils.lerp(currentTilt.x, (targetTilt.x + pitch) * motionScale, damping)
    currentTilt.y = THREE.MathUtils.lerp(currentTilt.y, (targetTilt.y + sway) * motionScale, damping)

    root.rotation.x = currentTilt.x
    root.rotation.y = currentTilt.y
    updateLogoFromTarget()
    const starBreath = motionEnabled
      ? 1 + Math.sin(elapsed * MAIN_STAR_BREATH_SPEED + 0.3) * 0.028 * intro.star
      : 1
    star.scale.setScalar(starBreath)
    starGlow.scale.setScalar(1.028 * starBreath)
    if (root.visible && !getLogoTarget?.()) {
      root.position.y += Math.sin(elapsed * 0.45) * 0.008 * motionScale
    }
    root.updateMatrixWorld()
    starLight.getWorldPosition(starLightWorldPosition)
    starLightScreenPosition.copy(starLightWorldPosition).project(camera)
    onLightUpdate?.({
      x: THREE.MathUtils.clamp((starLightScreenPosition.x * 0.5 + 0.5) * 100, 0, 100),
      y: THREE.MathUtils.clamp((1 - (starLightScreenPosition.y * 0.5 + 0.5)) * 100, 0, 100),
      visible: starLightScreenPosition.z > -1 && starLightScreenPosition.z < 1
    })

    cosmicMaterials.star.uniforms.uTime.value = motionEnabled ? elapsed : 0
    cosmicMaterials.ribbon.uniforms.uTime.value = motionEnabled ? elapsed : 0
    cosmicMaterials.starGlow.uniforms.uTime.value = motionEnabled ? elapsed : 0
    cosmicMaterials.ribbon.uniforms.uStarLightPosition.value.copy(starLightWorldPosition)
    cosmicMaterials.ribbon.uniforms.uStarLightColor.value.copy(starLight.color)
    cosmicMaterials.ribbon.uniforms.uStarLightPower.value = starLight.intensity
    cosmicMaterials.ribbon.uniforms.uStarLightRange.value = starLight.distance
    cosmicMaterials.ribbon.uniforms.uStarLightDecay.value = starLight.decay
  }

  function render() {
    if (!active) return
    bloom.render()
  }

  function setActive(nextActive) {
    active = Boolean(nextActive)
    if (!active) root.visible = false
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas.parentElement || canvas)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('blur', onPointerLeave)
  document.documentElement.addEventListener('pointerleave', onPointerLeave)
  resize()

  return {
    root,
    parts,
    intro,
    resize,
    update,
    render,
    setActive,
    destroy() {
      ro.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('blur', onPointerLeave)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)

      const geometries = new Set()
      root.traverse((object) => {
        if (object.isMesh && object.geometry) geometries.add(object.geometry)
      })
      geometries.forEach((geometry) => geometry.dispose())
      cosmicMaterials.star.dispose()
      cosmicMaterials.ribbon.dispose()
      cosmicMaterials.starGlow.dispose()
      bloom.dispose()
      environment.dispose()
      renderer.dispose()
    }
  }
}
