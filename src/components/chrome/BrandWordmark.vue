<script setup>
import { ref } from 'vue'

defineProps({
  travelStyle: { type: Object, default: null },
  settled: { type: Boolean, default: false }
})

const wordmarkRef = ref(null)
const glowRef = ref(null)

function updateLight({ x, y, visible }, logoElement) {
  const wordmark = wordmarkRef.value
  const text = glowRef.value
  if (!wordmark || !text || !logoElement) return

  const logoBounds = logoElement.getBoundingClientRect()
  const textBounds = text.getBoundingClientRect()
  if (!textBounds.width || !textBounds.height) return

  const lightX = logoBounds.left + logoBounds.width * x / 100
  const lightY = logoBounds.top + logoBounds.height * y / 100
  // 初屏把光源保持在字标上缘，避免高光落到字形下半部；
  // 字标收拢到星芒右侧后，高光自然移到左缘。
  const lightPercentX = clamp((lightX - textBounds.left) / textBounds.width * 100, 2, 100)
  const lightPercentY = clamp((lightY - textBounds.top) / textBounds.height * 100, -95, 100)
  wordmark.style.setProperty('--light-x', `${lightPercentX}%`)
  wordmark.style.setProperty('--light-y', `${lightPercentY}%`)
  wordmark.style.setProperty('--light-opacity', visible === false ? '0' : '1')
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

defineExpose({ updateLight })
</script>

<template>
  <div
    ref="wordmarkRef"
    class="brand-wordmark"
    :class="{ 'brand-wordmark--settled': settled }"
    aria-hidden="true"
  >
    <div class="brand-wordmark__lockup" :style="travelStyle">
      <span class="brand-wordmark__text brand-wordmark__base">
        元星联邦
      </span>
      <span ref="glowRef" class="brand-wordmark__text brand-wordmark__glow">元星联邦</span>
    </div>
  </div>
</template>

<style scoped>
.brand-wordmark {
  --light-x: 50%;
  --light-y: -140%;
  --light-opacity: 0;
  position: fixed;
  inset: 0;
  z-index: 35;
  opacity: var(--chrome-transition-opacity, 1);
  pointer-events: none;
  transition: opacity 180ms ease;
}

.brand-wordmark__lockup {
  position: absolute;
  top: calc(50% + min(34vw, 310px, 36vh));
  left: 50%;
  font-size: calc(min(68vw, 620px, 72vh) * 0.195);
  transform: translate(-50%, -56%);
}

.brand-wordmark__text {
  --wordmark-bleed: 0.15em;
  position: relative;
  display: block;
  margin: 0;
  padding-block: var(--wordmark-bleed);
  padding-left: 0.18em;
  color: transparent;
  white-space: nowrap;
  font-size: inherit;
  font-weight: 700;
  letter-spacing: 0.18em;
  line-height: 1;
}

.brand-wordmark__base {
  opacity: var(--intro-wordmark, 1);
  -webkit-mask-image: radial-gradient(
    circle at 50% 0%,
    #000 calc(var(--intro-reveal, 1) * 100%),
    transparent calc(var(--intro-reveal, 1) * 100% + 12%)
  );
  mask-image: radial-gradient(
    circle at 50% 0%,
    #000 calc(var(--intro-reveal, 1) * 100%),
    transparent calc(var(--intro-reveal, 1) * 100% + 12%)
  );
  background: linear-gradient(
    180deg,
    rgba(206, 220, 255, 0.96) var(--wordmark-bleed),
    rgba(139, 165, 222, 0.94) calc(var(--wordmark-bleed) + 0.44em),
    rgba(66, 88, 145, 0.96) calc(var(--wordmark-bleed) + 1em)
  );
  background-clip: text;
  -webkit-background-clip: text;
  text-shadow: 0 0 16px rgba(20, 44, 120, 0.34);
}

.brand-wordmark--settled .brand-wordmark__base {
  opacity: 1;
  -webkit-mask-image: none;
  mask-image: none;
}

.brand-wordmark--settled {
  --intro-glow: 1;
  --intro-shift: 0;
  --intro-spread: 1.25;
  --light-x: 2%;
  --light-y: -44%;
  --light-opacity: 1;
}

.brand-wordmark__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse calc(34% * var(--intro-spread, 1)) calc(2.2em * var(--intro-spread, 1))
      at var(--light-x) calc(var(--light-y) + var(--intro-shift, 0) * 1%),
    rgba(255, 255, 246, 1) 0%,
    rgba(255, 249, 222, 0.98) 28%,
    rgba(255, 235, 175, 0.62) 60%,
    rgba(255, 247, 225, 0) 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
  opacity: calc(var(--light-opacity, 0) * var(--intro-glow, 1));
  filter: drop-shadow(0 0 5px rgba(255, 249, 219, 0.92));
}

@media (max-width: 640px) {
  .brand-wordmark__text {
    letter-spacing: 0.12em;
    padding-left: 0.12em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-wordmark {
    transition: none;
  }
}
</style>
