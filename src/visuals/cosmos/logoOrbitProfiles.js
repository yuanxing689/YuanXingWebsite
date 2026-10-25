import * as THREE from 'three'

// 基于 YXLB (3).png 的 1000px 原图描摹；星心 (500, 474)，主针半长约 220px。
const ORIGIN = [500, 474]
const SCALE = [1.02 / 220, 1.12 / 220]

const PROFILES = [
  {
    name: 'OrbitAscending',
    start: [365, 510],
    outer: [
      [[325, 546], [282, 599], [301, 610]],
      [[324, 650], [446, 579], [500, 551]],
      [[603, 494], [727, 387], [700, 356]],
      [[682, 333], [625, 358], [570, 381]]
    ],
    inner: [
      [[338, 539], [295, 579], [321, 592]],
      [[344, 611], [443, 558], [492, 529]],
      [[589, 470], [695, 393], [673, 366]],
      [[661, 348], [618, 362], [570, 381]]
    ],
    depth: 0.036,
    // 大环后→前→后：中段穿过星芒前方，两端退到后方。
    depthAt: (t) => -0.28 * Math.cos(t * Math.PI * 2)
  },
  {
    name: 'OrbitDescending',
    start: [438, 423],
    outer: [
      [[367, 402], [310, 406], [330, 444]],
      [[356, 489], [514, 562], [626, 569]],
      [[697, 573], [669, 534], [600, 488]]
    ],
    inner: [
      [[380, 409], [333, 409], [354, 444]],
      [[391, 487], [532, 548], [622, 554]],
      [[676, 556], [644, 521], [600, 488]]
    ],
    depth: 0.032,
    // 小环前→后→前：两端在前方，中段退到星芒后方。
    depthAt: (t) => 0.24 * Math.cos(t * Math.PI * 2)
  }
]

function modelPoint([x, y]) {
  return new THREE.Vector3((x - ORIGIN[0]) * SCALE[0], (ORIGIN[1] - y) * SCALE[1], 0)
}

function createEdge(start, segments) {
  let previous = modelPoint(start)
  const curves = segments.map(([controlA, controlB, end]) => {
    const finish = modelPoint(end)
    const curve = new THREE.CubicBezierCurve3(previous, modelPoint(controlA), modelPoint(controlB), finish)
    previous = finish
    return curve
  })
  // 两条边界使用相同的分段参数，保持对应转弯处的截面连续。
  function parameter(t) {
    const scaled = THREE.MathUtils.clamp(t, 0, 1) * curves.length
    const index = Math.min(Math.floor(scaled), curves.length - 1)
    return [curves[index], scaled - index]
  }
  return {
    getPoint(t) {
      const [curve, u] = parameter(t)
      return curve.getPoint(u)
    },
    getTangent(t) {
      const [curve, u] = parameter(t)
      return curve.getTangent(u)
    }
  }
}

export function createLogoOrbitProfiles() {
  return PROFILES.map(({ name, start, outer, inner, depth, depthAt }) => ({
    name,
    outerEdge: createEdge(start, outer),
    innerEdge: createEdge(start, inner),
    depth,
    depthAt,
    bevel: 0.004
  }))
}
