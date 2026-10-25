import * as THREE from 'three'

export const MAIN_STAR_BREATH_PERIOD = 5
export const MAIN_STAR_BREATH_SPEED = (Math.PI * 2) / MAIN_STAR_BREATH_PERIOD

const vertexShader = /* glsl */ `
  varying vec3 vLocalPosition;
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vLocalPosition = position;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    vWorldPosition = worldPosition.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const starFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uIntro;
  uniform float uReveal;
  uniform float uOpacity;
  varying vec3 vLocalPosition;
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  float hash(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float sparkle(vec3 p, float scale, float threshold, float timeOffset) {
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
    float twinkle = 0.22 + 0.78 * pow(0.5 + 0.5 * sin(uTime * 2.8 + seed), 5.0);
    return gate * glint * twinkle;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vViewDirection);
    vec3 lightDirection = normalize(vec3(-0.35, 0.7, 1.0));
    float diffuse = 0.38 + 0.62 * max(dot(normal, lightDirection), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.2);
    float pulse = 0.82 + 0.18 * sin(uTime * 1.25 + vLocalPosition.y * 3.0);
    vec3 samplePosition = vLocalPosition * 2.8;
    float fineStars = sparkle(samplePosition, 16.0, 0.965, 0.0);
    float brightStars = sparkle(samplePosition + 4.7, 6.5, 0.992, 2.4);

    vec3 starColor = vec3(1.0, 0.97, 0.84);
    vec3 color = starColor * (1.22 + diffuse * 0.22);
    color += vec3(0.14, 0.34, 0.72) * (1.0 - diffuse) * 0.18;
    color += starColor * fineStars * pulse * 0.72;
    color += vec3(1.0, 0.985, 0.88) * brightStars * pulse * 0.95;
    color += vec3(0.68, 0.82, 1.0) * rim * 0.28;
    float breath = 1.0 + 0.05 * sin(uTime * ${MAIN_STAR_BREATH_SPEED.toFixed(6)} + 0.3);
    color *= breath;
    // 开场：光从星心向外扩散，uReveal 为当前扩散半径
    float reveal = 1.0 - smoothstep(uReveal - 0.32, uReveal + 0.12, length(vLocalPosition.xy));
    color *= uIntro * mix(0.02, 1.0, reveal);
    gl_FragColor = vec4(color, uOpacity);
  }
`

const ribbonFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uIntro;
  uniform float uReveal;
  uniform float uOpacity;
  uniform vec3 uStarLightPosition;
  uniform vec3 uStarLightColor;
  uniform float uStarLightPower;
  uniform float uStarLightRange;
  uniform float uStarLightDecay;
  varying vec3 vLocalPosition;
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 local = fract(p);
    vec2 blend = local * local * (3.0 - 2.0 * local);
    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vViewDirection);
    float lightDistance = distance(uStarLightPosition, vWorldPosition);
    float cutoff = pow(clamp(1.0 - lightDistance / uStarLightRange, 0.0, 1.0), 2.0);
    float starLight = cutoff * uStarLightPower / max(pow(lightDistance, uStarLightDecay), 0.15);
    float diffuse = 0.35 + 0.65 * max(dot(normal, normalize(vec3(-0.2, 0.65, 1.0))), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.0);
    vec2 flowUv = vec2(vUv.x * 4.0 - uTime * 0.045, vUv.y * 5.0);
    float cloud = noise(flowUv) * 0.65 + noise(flowUv * 2.4 + 3.7) * 0.35;
    float galaxyBand = smoothstep(0.35, 0.78, cloud);
    float cell = hash(floor(flowUv * vec2(28.0, 12.0)));
    float starGate = step(0.975, cell);
    vec2 starLocal = fract(flowUv * vec2(28.0, 12.0)) - 0.5;
    float star = starGate * smoothstep(0.22, 0.0, length(starLocal));
    float twinkle = 0.75 + 0.25 * sin(uTime * 2.1 + cell * 20.0);

    vec3 deepBlue = vec3(0.004, 0.012, 0.06);
    vec3 cloudBlue = vec3(0.025, 0.16, 0.66);
    vec3 glint = vec3(0.64, 0.88, 1.0);
    vec3 whiteStarlight = vec3(0.9, 0.97, 1.0);
    vec3 color = mix(deepBlue, cloudBlue, galaxyBand * 0.9) * diffuse;
    color += vec3(0.06, 0.28, 1.0) * rim * 0.6;
    color += glint * star * twinkle * 1.35;
    color += whiteStarlight * star * (0.45 + 0.25 * sin(uTime * 1.7 + cell * 12.0));
    vec3 toStar = normalize(uStarLightPosition - vWorldPosition);
    float lightFacing = max(dot(normal, toStar), 0.0);
    color += uStarLightColor * starLight * lightFacing * (0.025 + galaxyBand * 0.06);
    // 开场：光从环带中段（最接近星心处）向两端扩散，uReveal 为当前扩散半程
    float ringSpan = abs(vUv.x - 0.5) * 2.0;
    float ringWave = 1.0 - smoothstep(uReveal - 0.22, uReveal, ringSpan);
    color *= uIntro * mix(0.03, 1.0, ringWave);
    gl_FragColor = vec4(color, uOpacity);
  }
`

const glowFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uIntro;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vViewDirection);
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.4);
    float breath = 0.82 + 0.3 * sin(uTime * ${MAIN_STAR_BREATH_SPEED.toFixed(6)} + 0.6);
    vec3 starColor = vec3(1.0, 0.94, 0.72);
    gl_FragColor = vec4(
      starColor * fresnel * breath * uIntro * uOpacity,
      fresnel * 0.46 * breath * uIntro * uOpacity
    );
  }
`

function createMaterial(fragmentShader) {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uReveal: { value: -0.2 },
      uOpacity: { value: 1 },
      uStarLightPosition: { value: new THREE.Vector3() },
      uStarLightColor: { value: new THREE.Color(0xfff4d6) },
      uStarLightPower: { value: 1.5 },
      uStarLightRange: { value: 3.4 },
      uStarLightDecay: { value: 2.0 }
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
    depthTest: true
  })
  return material
}

function createGlowMaterial() {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: glowFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uOpacity: { value: 1 },
      uStarLightPosition: { value: new THREE.Vector3() },
      uStarLightColor: { value: new THREE.Color(0xfff4d6) },
      uStarLightPower: { value: 1.0 }
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

export function createCosmicMaterials() {
  const star = createMaterial(starFragmentShader)
  star.toneMapped = false
  return {
    star,
    ribbon: createMaterial(ribbonFragmentShader),
    starGlow: createGlowMaterial()
  }
}
