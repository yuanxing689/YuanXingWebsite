import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.55;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = rot * p * 2.02;
      amplitude *= 0.5;
    }
    return value;
  }

  float softStar(vec2 uv, float density, float size, float seed) {
    vec2 scaled = uv * density + seed;
    vec2 cell = floor(scaled);
    vec2 f = fract(scaled) - 0.5;
    float gate = step(1.0 - size, hash(cell));
    float d = length(f);
    return gate * smoothstep(0.22, 0.0, d);
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float radius = length(uv);

    vec2 drift = vec2(uTime * 0.01, uTime * 0.007);
    vec2 q = uv * 1.55 + drift;
    float warp = fbm(q + fbm(q * 0.55) * 0.9);
    float nebula = fbm(q * 1.1 + warp * 1.05);

    // 亮带：略向右上倾斜的银河感
    float band = smoothstep(0.2, 1.1, 1.0 - abs(uv.y - 0.12 + uv.x * 0.22));
    float cloud = mix(nebula, nebula * 0.65 + 0.35, band);

    vec3 deep = vec3(0.05, 0.09, 0.28);
    vec3 mid = vec3(0.12, 0.36, 0.88);
    vec3 bright = vec3(0.42, 0.78, 1.0);
    vec3 highlight = vec3(0.92, 0.97, 1.0);

    float n = smoothstep(0.18, 0.82, cloud);
    vec3 color = mix(deep, mid, n);
    color = mix(color, bright, smoothstep(0.38, 0.82, cloud) * (0.35 + band * 0.65));
    color = mix(color, highlight, smoothstep(0.62, 1.0, cloud) * band * 0.9);

    // 柔和圆点星，避免方块
    float starsA = softStar(uv, 36.0, 0.12, 3.1);
    float starsB = softStar(uv, 72.0, 0.08, 8.7);
    float twinkle = 0.7 + 0.3 * sin(uTime * 1.3 + hash(floor(uv * 36.0)) * 18.0);
    color += vec3(0.95, 0.98, 1.0) * starsA * twinkle * 0.75;
    color += vec3(0.8, 0.9, 1.0) * starsB * 0.45;

    // 边缘略微收束
    float vignette = 1.0 - smoothstep(0.78, 1.02, radius) * 0.55;
    color *= vignette;

    float alpha = 1.0 - smoothstep(0.97, 1.0, radius);
    gl_FragColor = vec4(color, alpha);
  }
`

export function createGalaxyMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 }
    },
    transparent: true,
    depthWrite: false
  })
}
