import * as THREE from 'three'
import { createSparkleOctagramGeometry } from './starGeometry.js'

export const NAVIGATION_BREATH_PERIOD = 3
export const NAVIGATION_BREATH_SPEED = (Math.PI * 2) / NAVIGATION_BREATH_PERIOD
export const NAVIGATION_ROTATION_PERIOD = 7
export const NAVIGATION_ROTATION_SPEED = (Math.PI * 2) / NAVIGATION_ROTATION_PERIOD
export const NAVIGATION_ICON_PIXEL_SIZE = 44

const NAVIGATION_NEEDLE = {
  valleyX: 0.85,
  valleyY: 0.05,
  concavity: 0.76
}

const NAVIGATION_OCTAGRAM = {
  halfThickness: 0.18,
  edgeStart: 0.86,
  edgeThicknessRatio: 0.14,
  radialSegments: 128,
  rings: 32
}

// 三颗星共用一套发光语言，但保留不同的相位、尺寸和色温，避免复制感
const NAVIGATION_VARIANTS = [
  {
    phase: 0,
    tiltX: 0.16,
    tiltY: -0.12,
    scale: 1,
    intensity: 1,
    tint: [1, 0.97, 0.9],
    depth: 0.015
  },
  {
    phase: 1.9,
    tiltX: -0.1,
    tiltY: 0.14,
    scale: 0.94,
    intensity: 0.9,
    tint: [0.94, 0.98, 1],
    depth: 0
  },
  {
    phase: 3.7,
    tiltX: 0.12,
    tiltY: 0.1,
    scale: 0.88,
    intensity: 0.82,
    tint: [1, 0.96, 0.92],
    depth: -0.015
  }
]

const starVertexShader = /* glsl */ `
  attribute float aPhase;
  attribute float aIntensity;
  attribute vec3 aTint;
  attribute float aIntro;

  varying vec3 vLocalPosition;
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying float vPhase;
  varying float vIntensity;
  varying vec3 vTint;
  varying float vIntro;

  void main() {
    mat4 instance = mat4(1.0);
    #ifdef USE_INSTANCING
      instance = instanceMatrix;
    #endif

    float introScale = mix(0.84, 1.0, aIntro);
    vec4 worldPosition = modelMatrix * instance * vec4(position * introScale, 1.0);
    vLocalPosition = position;
    vNormal = normalize(mat3(modelMatrix) * mat3(instance) * normal);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    vPhase = aPhase;
    vIntensity = aIntensity;
    vTint = aTint;
    vIntro = aIntro;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const starFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vLocalPosition;
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying float vPhase;
  varying float vIntensity;
  varying vec3 vTint;
  varying float vIntro;

  float hash(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float sparkle(vec3 p, float scale, float threshold, float timeOffset, float time) {
    vec3 cell = floor(p * scale);
    vec3 local = fract(p * scale) - 0.5;
    float gate = step(threshold, hash(cell));
    float radius = length(local);
    float core = 1.0 - smoothstep(0.015, 0.13, radius);
    float horizontalFlare =
      (1.0 - smoothstep(0.008, 0.035, abs(local.x))) *
      (1.0 - smoothstep(0.025, 0.24, abs(local.y)));
    float verticalFlare =
      (1.0 - smoothstep(0.008, 0.035, abs(local.y))) *
      (1.0 - smoothstep(0.025, 0.24, abs(local.x)));
    float glint = max(core, max(horizontalFlare, verticalFlare) * 0.5);
    float seed = hash(cell) * 18.0 + timeOffset;
    float twinkle = 0.22 + 0.78 * pow(0.5 + 0.5 * sin(time * 2.8 + seed), 5.0);
    return gate * glint * twinkle;
  }

  void main() {
    if (vIntro <= 0.001) discard;

    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vViewDirection);
    vec3 lightDirection = normalize(vec3(-0.35, 0.7, 1.0));
    float diffuse = 0.38 + 0.62 * max(dot(normal, lightDirection), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.2);
    float tip = smoothstep(0.4, 1.08, length(vLocalPosition.xy));
    float time = uTime + vPhase;
    float pulse = 0.84 + 0.16 * sin(time * 1.1 + vLocalPosition.y * 3.0);
    vec3 samplePosition = vLocalPosition * 2.8 + vec3(vPhase * 0.73, vPhase * 1.17, vPhase * 0.41);
    float fineStars = sparkle(samplePosition, 16.0, 0.965, 0.0, time);
    float brightStars = sparkle(samplePosition + 4.7, 6.5, 0.992, 2.4, time);

    vec3 starColor = vec3(1.0, 0.97, 0.84) * vTint;
    vec3 color = starColor * (1.18 + diffuse * 0.2);
    color += vec3(0.14, 0.34, 0.72) * (1.0 - diffuse) * 0.14;
    color += starColor * fineStars * pulse * 0.7;
    color += vec3(1.0, 0.985, 0.88) * brightStars * pulse * 0.9;
    color += vec3(0.68, 0.82, 1.0) * rim * 0.7;
    color += starColor * tip * 0.22;
    color *= uIntensity * vIntensity * vIntro;
    color *= 1.0 + 0.1 * sin(uTime * ${NAVIGATION_BREATH_SPEED.toFixed(6)} + vPhase);
    gl_FragColor = vec4(color, 1.0);
  }
`

const shellVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const shellFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uIntensity;
  uniform float uFalloff;
  uniform float uAlpha;
  uniform float uIntro;
  uniform float uPhase;
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vViewDirection);
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), uFalloff);
    float breath = 0.82 + 0.3 * sin(uTime * ${NAVIGATION_BREATH_SPEED.toFixed(6)} + uPhase);
    vec3 starColor = vec3(1.0, 0.94, 0.72);
    gl_FragColor = vec4(
      starColor * fresnel * breath * uIntensity * uIntro,
      fresnel * uAlpha * uIntensity * uIntro * breath
    );
  }
`

function createNavigationGeometry() {
  return createSparkleOctagramGeometry({
    primary: {
      vertical: { ...NAVIGATION_NEEDLE, radiusX: 0.18, radiusY: 1.08 },
      horizontal: { ...NAVIGATION_NEEDLE, radiusX: 0.18, radiusY: 1 }
    },
    secondary: {
      vertical: { ...NAVIGATION_NEEDLE, radiusX: 0.14, radiusY: 0.7 },
      horizontal: { ...NAVIGATION_NEEDLE, radiusX: 0.14, radiusY: 0.7 }
    },
    ...NAVIGATION_OCTAGRAM
  })
}

export function createNavigationStarField({ count = 3 } = {}) {
  const baseGeometry = createNavigationGeometry()
  const starGeometry = baseGeometry.clone()
  const phases = new Float32Array(count)
  const intensities = new Float32Array(count)
  const tints = new Float32Array(count * 3)
  const introReveals = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const variant = NAVIGATION_VARIANTS[index % NAVIGATION_VARIANTS.length]
    phases[index] = variant.phase
    intensities[index] = variant.intensity
    tints[index * 3] = variant.tint[0]
    tints[index * 3 + 1] = variant.tint[1]
    tints[index * 3 + 2] = variant.tint[2]
  }

  starGeometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1))
  starGeometry.setAttribute('aIntensity', new THREE.InstancedBufferAttribute(intensities, 1))
  starGeometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3))
  const introAttribute = new THREE.InstancedBufferAttribute(introReveals, 1)
  starGeometry.setAttribute('aIntro', introAttribute)

  const starMaterial = new THREE.ShaderMaterial({
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0.8 }
    },
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: true
  })
  starMaterial.toneMapped = false

  const stars = new THREE.InstancedMesh(starGeometry, starMaterial, count)
  stars.name = 'NavigationStars'
  stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  stars.frustumCulled = false

  function createShellMaterial({ falloff, alpha, intensity }) {
    const material = new THREE.ShaderMaterial({
      vertexShader: shellVertexShader,
      fragmentShader: shellFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uFalloff: { value: falloff },
        uAlpha: { value: alpha },
        uIntro: { value: 0 },
        uPhase: { value: 0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.BackSide
    })
    material.toneMapped = false
    return material
  }

  const shellMaterials = Array.from({ length: count }, (_, index) => {
    const material = createShellMaterial({ falloff: 1.8, alpha: 0.38, intensity: 0.9 })
    material.uniforms.uPhase.value =
      NAVIGATION_VARIANTS[index % NAVIGATION_VARIANTS.length].phase
    return material
  })
  const shells = Array.from({ length: count }, (_, index) => {
    const shell = new THREE.Mesh(baseGeometry, shellMaterials[index])
    shell.name = `NavigationGlowShell${index + 1}`
    return shell
  })

  function createStarGlowTexture() {
    const size = 320
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    const center = size / 2

    const drawStar = (radius, blur, color) => {
      context.save()
      context.filter = `blur(${blur}px)`
      context.fillStyle = color
      context.beginPath()
      for (let index = 0; index < 16; index += 1) {
        const angle = -Math.PI / 2 + (index * Math.PI) / 8
        const isTip = index % 2 === 0
        const tipIndex = index / 2
        const tipRadius = tipIndex % 2 === 1 ? radius * 0.62 : radius
        const distance = isTip ? tipRadius : radius * 0.18
        const x = center + Math.cos(angle) * distance
        const y = center + Math.sin(angle) * distance
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.closePath()
      context.fill()
      context.restore()
    }

    drawStar(size * 0.38, 18, 'rgba(120, 170, 255, 0.9)')
    drawStar(size * 0.3, 8, 'rgba(210, 230, 255, 0.95)')
    drawStar(size * 0.2, 3, 'rgba(255, 250, 235, 1)')

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  const glowTexture = createStarGlowTexture()
  const glowGeometry = new THREE.PlaneGeometry(1, 1)
  const glowMaterials = Array.from(
    { length: count },
    () =>
      new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        toneMapped: false
      })
  )
  const glows = Array.from({ length: count }, (_, index) => {
    const glow = new THREE.Mesh(glowGeometry, glowMaterials[index])
    glow.name = `NavigationGlow${index + 1}`
    return glow
  })

  const group = new THREE.Group()
  group.name = 'NavigationStarField'
  group.add(stars, ...shells, ...glows)

  const instanceMatrix = new THREE.Matrix4()
  const shellScale = new THREE.Vector3()

  function setIntro(reveals) {
    let changed = false
    for (let index = 0; index < count; index += 1) {
      const reveal = THREE.MathUtils.clamp(reveals?.[index] ?? 0, 0, 1)
      if (introReveals[index] === reveal) continue
      introReveals[index] = reveal
      shellMaterials[index].uniforms.uIntro.value = reveal
      changed = true
    }
    if (changed) introAttribute.needsUpdate = true
  }

  function setTransform(index, position, quaternion, scale, rotationZ) {
    instanceMatrix.compose(position, quaternion, scale)
    stars.setMatrixAt(index, instanceMatrix)

    const introScale = 0.84 + 0.16 * introReveals[index]
    const shell = shells[index]
    shell.position.copy(position)
    shell.quaternion.copy(quaternion)
    shellScale.copy(scale).multiplyScalar(1.12 * introScale)
    shell.scale.copy(shellScale)

    const glow = glows[index]
    glow.position.copy(position)
    glow.position.z -= 0.06
    glow.scale.set(scale.x * 6.5 * introScale, scale.x * 6.5 * introScale, 1)
    glow.rotation.set(0, 0, rotationZ)
  }

  function commit() {
    stars.instanceMatrix.needsUpdate = true
  }

  function update(time, motionEnabled) {
    starMaterial.uniforms.uTime.value = motionEnabled ? time : 0
    shellMaterials.forEach((material) => {
      material.uniforms.uTime.value = motionEnabled ? time : 0
    })
    glowMaterials.forEach((material, index) => {
      const phase = NAVIGATION_VARIANTS[index % NAVIGATION_VARIANTS.length].phase
      const breath = motionEnabled
        ? 0.85 + 0.15 * Math.sin(time * NAVIGATION_BREATH_SPEED + phase)
        : 1
      material.opacity = 0.8 * breath * introReveals[index]
    })
  }

  function dispose() {
    starGeometry.dispose()
    baseGeometry.dispose()
    starMaterial.dispose()
    shellMaterials.forEach((material) => material.dispose())
    glowGeometry.dispose()
    glowMaterials.forEach((material) => material.dispose())
    glowTexture.dispose()
  }

  return {
    group,
    variants: NAVIGATION_VARIANTS,
    setIntro,
    setTransform,
    commit,
    update,
    dispose
  }
}

export function createNavigationStarUpdater(field) {
  const position = new THREE.Vector3()
  const rotation = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const euler = new THREE.Euler()

  return function updateNavigationStars({
    targets = [],
    bounds,
    camera,
    elapsed = 0,
    reducedMotion = false
  }) {
    if (!field || !bounds?.width || !bounds?.height) return

    const worldWidth = camera.right - camera.left
    const worldHeight = camera.top - camera.bottom

    targets.slice(0, 3).forEach((target, index) => {
      if (!target) return

      const variant = field.variants[index % field.variants.length]
      const rect = typeof target.getBoundingClientRect === 'function'
        ? target.getBoundingClientRect()
        : null
      const x = rect
        ? rect.left + rect.width / 2 - bounds.left
        : target.x * bounds.width
      const y = rect
        ? rect.top + rect.height / 2 - bounds.top
        : target.y * bounds.height
      const navBreath = reducedMotion
        ? 0
        : Math.sin(elapsed * NAVIGATION_BREATH_SPEED + variant.phase)
      const rotationZ = reducedMotion
        ? variant.phase
        : elapsed * NAVIGATION_ROTATION_SPEED + variant.phase
      const tiltX = reducedMotion ? 0 : variant.tiltX
      const tiltY = reducedMotion ? 0 : variant.tiltY
      const pixelSize = Math.max(
        rect ? Math.min(rect.width, rect.height) : NAVIGATION_ICON_PIXEL_SIZE,
        28
      )
      const worldSize = (pixelSize / bounds.width) * worldWidth * 0.52
      const scaleBreath = reducedMotion ? 1 : 1 + navBreath * 0.06

      position.set(
        camera.left + (x / bounds.width) * worldWidth,
        camera.top - (y / bounds.height) * worldHeight,
        0.68 + variant.depth
      )
      euler.set(tiltX, tiltY, rotationZ)
      rotation.setFromEuler(euler)
      scale.setScalar(worldSize * variant.scale * scaleBreath)
      field.setTransform(index, position, rotation, scale, euler.z)
    })

    field.commit()
  }
}
