import * as THREE from 'three'

/**
 * 椭圆轨道带：
 * 曲线在倾斜平面内闭合，截面半径按深度从前往后收细，
 * 到最深点收成尖点，形成后半段逐渐消失的轨道。
 */
export function createOrbitBandGeometry({
  semiMajor = 1.35,
  semiMinor = 0.58,
  roll = 0,
  tilt = 0,
  tiltY = 0,
  planeRoll = 0,
  centerX = 0,
  centerY = 0,
  centerZ = 0,
  depthOffset = 0,
  thickness = 0.03,
  taperStart = 0.02,
  taperEnd = 0.5,
  radialSegments = 12,
  tubularSegments = 384
} = {}) {
  const zAxis = new THREE.Vector3(0, 0, 1)
  const xAxis = new THREE.Vector3(1, 0, 0)
  const yAxis = new THREE.Vector3(0, 1, 0)
  const planeNormal = new THREE.Vector3(0, 0, 1)
    .applyAxisAngle(zAxis, roll)
    .applyAxisAngle(xAxis, tilt)
    .applyAxisAngle(yAxis, tiltY)
    .applyAxisAngle(zAxis, planeRoll)
    .normalize()
  const points = []

  for (let i = 0; i < tubularSegments; i += 1) {
    const angle = (i / tubularSegments) * Math.PI * 2
    const point = new THREE.Vector3(
      semiMajor * Math.cos(angle),
      semiMinor * Math.sin(angle),
      0
    )
    point.applyAxisAngle(zAxis, roll)
    point.applyAxisAngle(xAxis, tilt)
    point.applyAxisAngle(yAxis, tiltY)
    point.applyAxisAngle(zAxis, planeRoll)
    point.x += centerX
    point.y += centerY
    point.z += centerZ + depthOffset
    points.push(point)
  }

  const zValues = points.map((point) => point.z)
  const minZ = Math.min(...zValues)
  const maxZ = Math.max(...zValues)
  const minimumRadius = thickness * 0.006
  const positions = []
  const indices = []
  const crossSection = []

  for (let i = 0; i < tubularSegments; i += 1) {
    const previous = points[(i - 1 + tubularSegments) % tubularSegments]
    const next = points[(i + 1) % tubularSegments]
    const tangent = next.clone().sub(previous).normalize()
    const binormal = new THREE.Vector3().crossVectors(planeNormal, tangent).normalize()
    const depth = (points[i].z - minZ) / Math.max(maxZ - minZ, 1e-6)
    const taper = THREE.MathUtils.smoothstep(depth, taperStart, taperEnd)
    const radius = Math.max(thickness * taper, minimumRadius)
    const section = []

    for (let j = 0; j < radialSegments; j += 1) {
      const angle = (j / radialSegments) * Math.PI * 2
      const offset = planeNormal
        .clone()
        .multiplyScalar(Math.cos(angle) * radius)
        .addScaledVector(binormal, Math.sin(angle) * radius)
      const vertex = points[i].clone().add(offset)
      section.push(positions.length / 3)
      positions.push(vertex.x, vertex.y, vertex.z)
    }
    crossSection.push(section)
  }

  for (let i = 0; i < tubularSegments; i += 1) {
    const next = (i + 1) % tubularSegments

    for (let j = 0; j < radialSegments; j += 1) {
      const nextJ = (j + 1) % radialSegments
      const a = crossSection[i][j]
      const b = crossSection[next][j]
      const c = crossSection[i][nextJ]
      const d = crossSection[next][nextJ]
      indices.push(a, b, c, b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
