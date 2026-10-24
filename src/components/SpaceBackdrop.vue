<script setup>
import { toSiteHref } from '../navigation/sitePaths.js'

const trackStyle = {
  backgroundImage: `url("${toSiteHref('/assets/space-bg-mirror.webp')}")`
}
</script>

<template>
  <div class="space-backdrop" aria-hidden="true">
    <div class="space-backdrop__tint" />
    <div class="space-backdrop__track" :style="trackStyle" />
    <div class="space-backdrop__veil" />
  </div>
</template>

<style scoped>
.space-backdrop {
  position: absolute;
  inset: 0;
  z-index: -2;
  overflow: hidden;
  background: #000;
  pointer-events: none;
}

.space-backdrop__tint {
  position: absolute;
  inset: 0;
  background: #050817;
  opacity: var(--intro-backdrop, 1);
}

.space-backdrop__track {
  position: absolute;
  inset: 0;
  min-height: 100%;
  background-position: center top;
  background-repeat: repeat-y;
  background-size: 100% auto;
  opacity: var(--intro-backdrop, 1);
  transform: scale(calc(1.04 - 0.04 * var(--intro-backdrop, 1)));
  transform-origin: center center;
  will-change: opacity, transform;
}

.space-backdrop__veil {
  position: absolute;
  inset: 0;
  opacity: var(--intro-backdrop, 1);
  background:
    linear-gradient(180deg, rgba(3, 7, 22, 0.42), rgba(3, 7, 22, 0.12) 42%, rgba(3, 7, 22, 0.56)),
    radial-gradient(ellipse 72% 58% at 50% 42%, rgba(4, 9, 28, 0.1), rgba(4, 9, 28, 0.38));
}
</style>
