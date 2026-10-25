import * as THREE from 'three'

const PROFILE_SAMPLES = 4096
const RAY_BISECTION_STEPS = 36
const MAX_SOLID_RADIUS = 1.6

/**
 * 星芒半径场：
 * 外段沿用原针芒曲线，仅在赤道附近换成 C1 连续的中心帽，
 * 消除两道实体交叉时会被放大的凹槽和薄唇。
 */
function buildRadiusProfile(shapeParams = {}) {
  const shape = {
    radiusX: 1,
    radiusY: 1.08,
    valleyX: 0.2,
    valleyY: 0.09,
    concavity: 0.72,
    ...shapeParams
  }

  const profile = createSparkleProfile({ ...shape, curveSegments: 64 })
  const valleyRadius = shape.valleyX * shape.radiusX
  const valleyY = shape.valleyY * shape.radiusY
  const outer = profile.filter((point) => point.y >= valleyY - 1e-9)
  const outerSlope = (outer[1].x - outer[0].x) / (outer[1].y - outer[0].y)
  const lookup = new Float32Array(PROFILE_SAMPLES + 1)

  const sampleOuterRadius = (distance) => {
    let low = 0
    let high = outer.length - 1

    while (low + 1 < high) {
      const middle = (low + high) >> 1
      if (outer[middle].y <= distance) low = middle
      else high = middle
    }

    const start = outer[low]
    const end = outer[high]
    const t = THREE.MathUtils.clamp((distance - start.y) / (end.y - start.y), 0, 1)
    return THREE.MathUtils.lerp(start.x, end.x, t)
  }

  for (let i = 0; i <= PROFILE_SAMPLES; i += 1) {
    const y = -shape.radiusY + (shape.radiusY * 2 * i) / PROFILE_SAMPLES
    const distance = Math.abs(y)

    if (distance >= valleyY) {
      lookup[i] = distance >= shape.radiusY ? 0 : sampleOuterRadius(distance)
      continue
    }

    const t = distance / valleyY
    const h00 = 2 * t * t * t - 3 * t * t + 1
    const h01 = -2 * t * t * t + 3 * t * t
    const h11 = t * t * t - t * t
    lookup[i] = h00 * shape.radiusX + h01 * valleyRadius + h11 * valleyY * outerSlope
  }

  return {
    radiusY: shape.radiusY,
    radiusAt(y) {
      const t = ((y + shape.radiusY) / (shape.radiusY * 2)) * PROFILE_SAMPLES
      const index = THREE.MathUtils.clamp(Math.floor(t), 0, PROFILE_SAMPLES - 1)
      return THREE.MathUtils.lerp(lookup[index], lookup[index + 1], t - index)
    }
  }
}

function smoothMax(a, b, radius) {
  if (radius <= 0) return Math.max(a, b)

  const maximum = Math.max(a, b)
  const difference = Math.abs(a - b)
  return maximum + radius * Math.log1p(Math.exp(-difference / radius))
}

// 从原点沿单位方向射线求实体边界，两个旋转体取平滑并集。
function findBoundaryDistance(profile, axisComponent) {
  const radialFactor = Math.sqrt(Math.max(1 - axisComponent * axisComponent, 0))
  let low = 0
  let high = MAX_SOLID_RADIUS

  for (let i = 0; i < RAY_BISECTION_STEPS; i += 1) {
    const distance = (low + high) * 0.5
    const axis = distance * axisComponent
    const outsideAxis = Math.abs(axis) > profile.radiusY
    const outsideSurface =
      !outsideAxis && distance * radialFactor > profile.radiusAt(axis)

    if (outsideAxis || outsideSurface) high = distance
    else low = distance
  }

  return (low + high) * 0.5
}

/**
 * 生成 + 形星芒单体网格：
 * 先求两个纺锤形旋转体沿任意射线的最外边界，再做局部平滑并集。
 * 网格只有一个闭合外壳，针尖角度保持原始母线比例。
 */
export function createSparkleEmblemGeometry({
  vertical = {},
  horizontal = {},
  blendRadius = 0.035,
  longitudes = 384,
  latitudes = 128
} = {}) {
  const verticalProfile = buildRadiusProfile(vertical)
  const horizontalProfile = buildRadiusProfile(horizontal)
  const columns = Math.max(32, longitudes - (longitudes % 4))
  const rows = Math.max(16, latitudes - (latitudes % 2))
  const ringCount = rows - 1
  const vertexCount = ringCount * columns + 2
  const triangleCount = columns * 2 * (rows - 1)
  const positions = new Float32Array(vertexCount * 3)
  const indices = new Uint32Array(triangleCount * 3)

  const getDistance = (nx, ny, nz) => {
    const verticalDistance = findBoundaryDistance(verticalProfile, ny)
    const horizontalDistance = findBoundaryDistance(horizontalProfile, nx)
    return smoothMax(verticalDistance, horizontalDistance, blendRadius)
  }

  const writeVertex = (index, nx, ny, nz, distance = getDistance(nx, ny, nz)) => {
    const offset = index * 3
    positions[offset] = nx * distance
    positions[offset + 1] = ny * distance
    positions[offset + 2] = nz * distance
  }

  writeVertex(0, 0, 0, 1)

  for (let row = 1; row < rows; row += 1) {
    const phi = (row / rows) * Math.PI
    const sinPhi = Math.sin(phi)
    const cosPhi = Math.cos(phi)
    for (let column = 0; column < columns; column += 1) {
      const theta = (column / columns) * Math.PI * 2
      const nx = sinPhi * Math.cos(theta)
      const ny = sinPhi * Math.sin(theta)
      const distance = getDistance(nx, ny, cosPhi)
      const vertexIndex = 1 + (row - 1) * columns + column
      writeVertex(vertexIndex, nx, ny, cosPhi, distance)
    }
  }

  const bottomIndex = vertexCount - 1
  writeVertex(bottomIndex, 0, 0, -1)

  let cursor = 0
  const pushTriangle = (a, b, c) => {
    indices[cursor] = a
    indices[cursor + 1] = b
    indices[cursor + 2] = c
    cursor += 3
  }

  for (let column = 0; column < columns; column += 1) {
    const next = (column + 1) % columns
    pushTriangle(0, 1 + column, 1 + next)
  }

  for (let row = 0; row < rows - 2; row += 1) {
    const current = 1 + row * columns
    const below = current + columns

    for (let column = 0; column < columns; column += 1) {
      const next = (column + 1) % columns
      pushTriangle(current + column, below + column, current + next)
      pushTriangle(current + next, below + column, below + next)
    }
  }

  const lastRing = 1 + (rows - 2) * columns
  for (let column = 0; column < columns; column += 1) {
    const next = (column + 1) % columns
    pushTriangle(lastRing + column, bottomIndex, lastRing + next)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * 生成共享厚度场的八角星单体：
 * 先求主星与 45° 短针星在二维平面上的并集轮廓，
 * 再沿统一的厚度函数生成前后两面，避免两个实体中心重叠。
 */
export function createSparkleOctagramGeometry({
  primary = {},
  secondary = {},
  secondaryRotation = Math.PI / 4,
  halfThickness = 0.224,
  edgeStart = 0.88,
  edgeThicknessRatio = 0.12,
  tipSharpAngle = 0.075,
  sharpThicknessPower = 1.1,
  radialSegments = 512,
  rings = 80
} = {}) {
  const primaryVertical = buildRadiusProfile(primary.vertical)
  const primaryHorizontal = buildRadiusProfile(primary.horizontal)
  const secondaryVertical = buildRadiusProfile(secondary.vertical)
  const secondaryHorizontal = buildRadiusProfile(secondary.horizontal)
  const columns = Math.max(64, radialSegments - (radialSegments % 8))
  const ringCount = Math.max(16, rings - 1)
  const silhouette = new Float32Array(columns)
  const tipWeight = new Float32Array(columns)
  const tipStep = Math.PI / 4

  const radialDistance = (vertical, horizontal, angle) => {
    const sine = Math.sin(angle)
    const cosine = Math.cos(angle)
    return Math.max(
      findBoundaryDistance(vertical, sine),
      findBoundaryDistance(horizontal, cosine)
    )
  }

  for (let column = 0; column < columns; column += 1) {
    const angle = (column / columns) * Math.PI * 2
    const primaryDistance = radialDistance(primaryVertical, primaryHorizontal, angle)
    const secondaryDistance = radialDistance(
      secondaryVertical,
      secondaryHorizontal,
      angle - secondaryRotation
    )
    silhouette[column] = Math.max(primaryDistance, secondaryDistance)
    const nearestTip = Math.round(angle / tipStep) * tipStep
    const tipDistance = Math.abs(angle - nearestTip)
    tipWeight[column] = THREE.MathUtils.smoothstep(
      tipDistance,
      tipSharpAngle * 0.35,
      tipSharpAngle
    )
  }

  const topCenterIndex = 0
  const bottomCenterIndex = 1
  const topRingStart = 2
  const bottomRingStart = topRingStart + ringCount * columns
  const rimStart = bottomRingStart + ringCount * columns
  const vertexCount = rimStart + columns
  const topTriangles = columns * (1 + ringCount * 2)
  const triangleCount = topTriangles * 2
  const positions = new Float32Array(vertexCount * 3)
  const indices = new Uint32Array(triangleCount * 3)
  const writeVertex = (index, radius, angle, z) => {
    const offset = index * 3
    positions[offset] = Math.cos(angle) * radius
    positions[offset + 1] = Math.sin(angle) * radius
    positions[offset + 2] = z
  }

  writeVertex(topCenterIndex, 0, 0, halfThickness)
  writeVertex(bottomCenterIndex, 0, 0, -halfThickness)

  for (let ring = 0; ring < ringCount; ring += 1) {
    const u = (ring + 1) / (ringCount + 1)
    let roundedThickness

    if (u <= edgeStart) {
      const t = u / edgeStart
      const h00 = 2 * t * t * t - 3 * t * t + 1
      const h01 = -2 * t * t * t + 3 * t * t
      roundedThickness =
        h00 * halfThickness + h01 * halfThickness * edgeThicknessRatio
    } else {
      const edgeT = (u - edgeStart) / (1 - edgeStart)
      roundedThickness =
        halfThickness *
        edgeThicknessRatio *
        Math.sqrt(Math.max(1 - edgeT * edgeT, 0))
    }
    const sharpThickness =
      halfThickness * Math.pow(1 - u * u, sharpThicknessPower)

    for (let column = 0; column < columns; column += 1) {
      const angle = (column / columns) * Math.PI * 2
      const radius = silhouette[column] * u
      const thickness = THREE.MathUtils.lerp(
        sharpThickness,
        roundedThickness,
        tipWeight[column]
      )
      writeVertex(
        topRingStart + ring * columns + column,
        radius,
        angle,
        thickness
      )
      writeVertex(
        bottomRingStart + ring * columns + column,
        radius,
        angle,
        -thickness
      )
    }
  }

  for (let column = 0; column < columns; column += 1) {
    const angle = (column / columns) * Math.PI * 2
    writeVertex(rimStart + column, silhouette[column], angle, 0)
  }

  let cursor = 0
  const pushTriangle = (a, b, c) => {
    indices[cursor] = a
    indices[cursor + 1] = b
    indices[cursor + 2] = c
    cursor += 3
  }

  for (let column = 0; column < columns; column += 1) {
    const next = (column + 1) % columns
    pushTriangle(
      topCenterIndex,
      topRingStart + column,
      topRingStart + next
    )
    pushTriangle(
      bottomCenterIndex,
      bottomRingStart + next,
      bottomRingStart + column
    )
  }

  const pushBand = (innerStart, outerStart, flip = false) => {
    for (let column = 0; column < columns; column += 1) {
      const next = (column + 1) % columns
      const a0 = innerStart + column
      const a1 = innerStart + next
      const b0 = outerStart + column
      const b1 = outerStart + next

      if (flip) {
        pushTriangle(a0, b1, b0)
        pushTriangle(a0, a1, b1)
      } else {
        pushTriangle(a0, b0, b1)
        pushTriangle(a0, b1, a1)
      }
    }
  }

  for (let ring = 0; ring < ringCount - 1; ring += 1) {
    const topInner = topRingStart + ring * columns
    const topOuter = topInner + columns
    const bottomInner = bottomRingStart + ring * columns
    const bottomOuter = bottomInner + columns
    pushBand(topInner, topOuter)
    pushBand(bottomInner, bottomOuter, true)
  }

  const topLastRing = topRingStart + (ringCount - 1) * columns
  const bottomLastRing = bottomRingStart + (ringCount - 1) * columns
  pushBand(topLastRing, rimStart)
  pushBand(bottomLastRing, rimStart, true)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * 单根星针外段的右半母线采样点。
 * 返回值保留原始曲线，中心帽由 buildRadiusProfile 统一重建。
 */
export function createSparkleProfile({
  radiusX = 1,
  radiusY = 1.08,
  valleyX = 0.2,
  valleyY = 0.09,
  concavity = 0.72,
  curveSegments = 48
} = {}) {
  const vx = valleyX * radiusX
  const vy = valleyY * radiusY
  const bottomTip = new THREE.Vector2(0, -radiusY)
  const valleyBottom = new THREE.Vector2(vx, -vy)
  const equatorTip = new THREE.Vector2(radiusX, 0)
  const valleyTop = new THREE.Vector2(vx, vy)
  const topTip = new THREE.Vector2(0, radiusY)
  const controlOf = (a, b) =>
    new THREE.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2).multiplyScalar(1 - concavity)
  const curves = [
    new THREE.QuadraticBezierCurve(bottomTip, controlOf(bottomTip, valleyBottom), valleyBottom),
    new THREE.QuadraticBezierCurve(valleyBottom, controlOf(valleyBottom, equatorTip), equatorTip),
    new THREE.QuadraticBezierCurve(equatorTip, controlOf(equatorTip, valleyTop), valleyTop),
    new THREE.QuadraticBezierCurve(valleyTop, controlOf(valleyTop, topTip), topTip)
  ]
  const points = []

  for (const curve of curves) {
    for (const point of curve.getPoints(curveSegments)) {
      const previous = points[points.length - 1]
      if (!previous || previous.distanceTo(point) > 1e-6) points.push(point)
    }
  }

  return points
}
