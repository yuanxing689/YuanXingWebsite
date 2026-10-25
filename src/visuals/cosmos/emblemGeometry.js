import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * 立体四芒星：两根拉长的八面体沿 X/Y 轴交叉，
 * 形成带尖刺与棱面的星体，而非平面剪影。
 */
export function createSparkle3DGeometry(outerX = 1, outerY = 1, thickness = 0.14) {
  const horizontal = new THREE.OctahedronGeometry(1, 0)
  horizontal.scale(outerX, thickness, thickness * 1.15)

  const vertical = new THREE.OctahedronGeometry(1, 0)
  vertical.scale(thickness, outerY, thickness * 1.15)

  // 轻微倾斜让两根尖刺错开棱面，避免完全重合
  horizontal.rotateY(0.12)
  vertical.rotateY(-0.12)

  const merged = mergeGeometries([horizontal, vertical], false)
  merged.computeVertexNormals()
  return merged
}

/**
 * 平面四芒星（小点缀用），带轻微厚度。
 */
export function createSparkleShape(outerX = 1, outerY = 1, innerR = 0.12) {
  const points = [
    new THREE.Vector2(0, outerY),
    new THREE.Vector2(innerR, innerR),
    new THREE.Vector2(outerX, 0),
    new THREE.Vector2(innerR, -innerR),
    new THREE.Vector2(0, -outerY),
    new THREE.Vector2(-innerR, -innerR),
    new THREE.Vector2(-outerX, 0),
    new THREE.Vector2(-innerR, innerR)
  ]
  return new THREE.Shape(points)
}

/**
 * 椭圆圆环（带孔的扁环）。
 */
export function createEllipseRingShape(radiusX, radiusY, thickness) {
  const shape = new THREE.Shape()
  shape.absellipse(0, 0, radiusX, radiusY, 0, Math.PI * 2, false, 0)

  const hole = new THREE.Path()
  const innerX = Math.max(0.05, radiusX - thickness)
  const innerY = Math.max(0.05, radiusY - thickness)
  hole.absellipse(0, 0, innerX, innerY, 0, Math.PI * 2, true, 0)
  shape.holes.push(hole)
  return shape
}

/**
 * 椭圆轨道管：沿三维椭圆路径的管体，真正有圆截面厚度。
 */
export function createOrbitTubeGeometry(radiusX, radiusY, tubeRadius = 0.035) {
  const segments = 128
  const points = []
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(t) * radiusX, Math.sin(t) * radiusY, 0))
  }
  const curve = new THREE.CatmullRomCurve3(points, true)
  return new THREE.TubeGeometry(curve, 160, tubeRadius, 12, true)
}

/**
 * 端点收尖的圆环弧段（断环）。
 */
export function createPointedArcShape(
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  tipExtend = 0.12
) {
  const midRadius = (innerRadius + outerRadius) / 2
  const segments = 36
  const points = []

  points.push(
    new THREE.Vector2(
      Math.cos(startAngle - tipExtend) * midRadius,
      Math.sin(startAngle - tipExtend) * midRadius
    )
  )

  for (let i = 0; i <= segments; i += 1) {
    const angle = startAngle + ((endAngle - startAngle) * i) / segments
    points.push(
      new THREE.Vector2(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius)
    )
  }

  points.push(
    new THREE.Vector2(
      Math.cos(endAngle + tipExtend) * midRadius,
      Math.sin(endAngle + tipExtend) * midRadius
    )
  )

  for (let i = segments; i >= 0; i -= 1) {
    const angle = startAngle + ((endAngle - startAngle) * i) / segments
    points.push(
      new THREE.Vector2(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius)
    )
  }

  return new THREE.Shape(points)
}

/**
 * 细长菱形尖刺，沿 +Y 方向指向外侧。
 */
export function createSpikeShape(length = 1, width = 0.12, tail = 0.22) {
  const shape = new THREE.Shape()
  shape.moveTo(0, length)
  shape.lineTo(width, 0)
  shape.lineTo(0, -length * tail)
  shape.lineTo(-width, 0)
  shape.closePath()
  return shape
}

export function extrudeShape(shape, depth, bevelSize = 0.012) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 2,
    curveSegments: 24
  })
  // 仅沿 Z 居中，保留 XY 以维持弧段/尖刺的径向布局
  geometry.translate(0, 0, -depth / 2)
  return geometry
}
