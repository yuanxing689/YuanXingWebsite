import * as THREE from 'three'

/** 沿两条边界生成收尖的实体带，正面轮廓与厚度、深度起伏独立。 */
export function createRibbonGeometry({
  outerEdge,
  innerEdge,
  depth = 0.028,
  bevel = 0.006,
  depthAt = () => 0,
  tubularSegments = 256,
  bevelSegments = 3
}) {
  const segments = Math.max(16, Math.floor(tubularSegments))
  const corners = Math.max(1, Math.floor(bevelSegments))
  const sectionSize = 4 * (corners + 1)
  const positions = []
  const uvs = []
  const indices = []
  const side = new THREE.Vector3()

  function writeVertex(x, y, z, u, v) {
    positions.push(x, y, z)
    uvs.push(u, v)
  }

  const start = outerEdge.getPoint(0)
  writeVertex(start.x, start.y, depthAt(0), 0, 0.5)

  for (let i = 1; i < segments; i += 1) {
    const t = i / segments
    const outer = outerEdge.getPoint(t)
    const inner = innerEdge.getPoint(t)
    const center = outer.clone().add(inner).multiplyScalar(0.5)
    side.subVectors(inner, outer)
    const halfWidth = side.length() * 0.5
    side.normalize()

    const tangent = outerEdge.getTangent(t).add(innerEdge.getTangent(t))
    if (tangent.x * side.y - tangent.y * side.x < 0) side.negate()

    // 厚度随端部带宽收尖，避免在尖端留下竖直切口。
    const halfDepth = Math.min(depth * 0.5, halfWidth * 0.35)
    const radius = Math.min(bevel, halfWidth * 0.45, halfDepth * 0.8)
    const profile = roundedSection(halfWidth, halfDepth, radius, corners)
    for (let j = 0; j < sectionSize; j += 1) {
      const [widthOffset, depthOffset] = profile[j]
      writeVertex(
        center.x + side.x * widthOffset,
        center.y + side.y * widthOffset,
        depthAt(t) + depthOffset,
        t,
        j / sectionSize
      )
    }
  }

  const endIndex = positions.length / 3
  const end = outerEdge.getPoint(1)
  writeVertex(end.x, end.y, depthAt(1), 1, 0.5)

  for (let j = 0; j < sectionSize; j += 1) {
    const next = (j + 1) % sectionSize
    indices.push(0, 1 + j, 1 + next)
    for (let i = 0; i < segments - 2; i += 1) {
      const a = 1 + i * sectionSize + j
      const b = a + sectionSize
      const c = 1 + i * sectionSize + next
      const d = c + sectionSize
      indices.push(a, b, c, b, d, c)
    }
    const last = 1 + (segments - 2) * sectionSize
    indices.push(last + j, endIndex, last + next)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function roundedSection(halfWidth, halfDepth, radius, segments) {
  const points = []
  const corners = [
    [halfWidth - radius, halfDepth - radius, Math.PI / 2],
    [halfWidth - radius, -halfDepth + radius, 0],
    [-halfWidth + radius, -halfDepth + radius, -Math.PI / 2],
    [-halfWidth + radius, halfDepth - radius, -Math.PI]
  ]
  for (const [x, z, startAngle] of corners) {
    for (let i = 0; i <= segments; i += 1) {
      const angle = startAngle - (i / segments) * Math.PI / 2
      points.push([x + Math.cos(angle) * radius, z + Math.sin(angle) * radius])
    }
  }
  return points
}
