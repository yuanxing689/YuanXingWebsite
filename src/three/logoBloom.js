import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SavePass } from 'three/addons/postprocessing/SavePass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

/** 保留模型原始透明度，只在明亮轮廓附近叠加短距离泛光。 */
const BASE_STRENGTH = 0.8

export function createLogoBloom(renderer, scene, camera, {
  enabled = true
} = {}) {
  if (!enabled) {
    return {
      render() {
        renderer.render(scene, camera)
      },
      setIntensity() {},
      resize() {},
      dispose() {}
    }
  }

  const composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  const original = new SavePass()
  // UnrealBloomPass 的 radius 会把每个 mip 权重与 1.2-f 混合：radius 大于 0 时，写 0 的 mip
  // 仍会以 1.2*radius 参与合成，最宽的模糊层铺满画布就会在画布边缘留下方形底雾。
  // 因此 radius 取 0，让 bloomFactors 按字面生效。
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), BASE_STRENGTH, 0, 0.9)
  // 前四项沿用原 radius=0.28 下 [1, 0.42, 0.08, 0, 0] 的等效权重以保持观感，只关掉最宽的 mip4。
  bloom.compositeMaterial.uniforms.bloomFactors.value = [0.78, 0.52, 0.37, 0.34, 0]

  const output = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tOriginal: { value: null }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform sampler2D tOriginal;
      varying vec2 vUv;

      void main() {
        vec4 original = texture2D(tOriginal, vUv);
        vec3 combined = texture2D(tDiffuse, vUv).rgb;
        vec3 glow = max(combined - original.rgb, vec3(0.0));
        float energy = max(glow.r, max(glow.g, glow.b));
        float glowAlpha = 1.0 - exp(-energy * 1.8);
        float alpha = max(original.a, glowAlpha);
        gl_FragColor = vec4(combined / max(alpha, 0.0001), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        // WebGL 画布使用预乘透明度，必须在显示空间中执行预乘。
        gl_FragColor.rgb *= alpha;
      }
    `
  })
  output.uniforms.tOriginal.value = original.renderTarget.texture
  output.material.depthTest = false
  output.material.depthWrite = false
  composer.addPass(renderPass)
  composer.addPass(original)
  composer.addPass(bloom)
  composer.addPass(output)

  return {
    render() {
      composer.render()
    },
    /** 开场动画用：按 0~1 的系数缩放泛光强度 */
    setIntensity(factor) {
      bloom.strength = BASE_STRENGTH * factor
    },
    resize(width, height) {
      composer.setSize(width, height)
    },
    dispose() {
      original.dispose()
      bloom.dispose()
      output.dispose()
      composer.dispose()
    }
  }
}
