<script setup>
const props = defineProps({
  href: {
    type: String,
    required: true
  },
  markSrc: {
    type: String,
    required: true
  },
  layoutStyle: {
    type: Object,
    default: null
  },
  markOpacity: {
    type: Number,
    default: 1
  },
  glassVisible: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['brand-select'])
</script>

<template>
  <div
    class="brand-glass"
    :class="{ 'brand-glass--visible': glassVisible }"
    :style="layoutStyle"
    aria-hidden="true"
  />

  <a
    class="brand-home"
    :class="{ 'brand-home--ready': markOpacity > 0.02 }"
    :style="[
      layoutStyle,
      { '--brand-mark-opacity': String(markOpacity) }
    ]"
    :href="href"
    target="_self"
    :tabindex="markOpacity > 0.02 ? 0 : -1"
    :aria-hidden="markOpacity > 0.02 ? undefined : true"
    aria-label="返回元星联邦首页"
    data-site-brand
    @click="emit('brand-select', $event)"
  >
    <img
      class="brand-home__mark"
      :src="markSrc"
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  </a>
</template>

<style scoped>
.brand-home {
  position: fixed;
  z-index: 40;
  display: block;
  border-radius: 10px;
  opacity: var(--chrome-transition-opacity, 1);
  pointer-events: none;
  transition: opacity 180ms ease;
}

.brand-home--ready {
  pointer-events: auto;
}

.brand-home:focus-visible {
  outline: 2px solid #b8d8ff;
  outline-offset: 4px;
}

.brand-home__mark {
  position: absolute;
  top: var(--brand-padding, 8px);
  left: var(--brand-padding, 8px);
  width: var(--brand-logo-size, 38px);
  height: var(--brand-logo-size, 38px);
  object-fit: contain;
  opacity: calc(
    var(--chrome-transition-opacity, 1) * var(--brand-mark-opacity, 1)
  );
  transform: scale(1.24);
  transform-origin: center;
  user-select: none;
  transition: opacity 180ms ease;
}

.brand-glass {
  display: none;
}

@media (max-width: 680px) {
  .brand-glass {
    position: fixed;
    z-index: 2;
    display: block;
    border: 1px solid rgba(157, 185, 255, 0.18);
    border-radius: 16px;
    background: linear-gradient(
      180deg,
      rgba(9, 18, 42, 0.72),
      rgba(5, 11, 28, 0.52)
    );
    box-shadow:
      0 14px 44px rgba(1, 5, 18, 0.3),
      inset 0 1px 0 rgba(217, 232, 255, 0.06);
    backdrop-filter: blur(18px) saturate(125%);
    -webkit-backdrop-filter: blur(18px) saturate(125%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 220ms ease;
  }

  .brand-glass--visible {
    opacity: var(--chrome-transition-opacity, 1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-home,
  .brand-home__mark,
  .brand-glass {
    transition: none;
  }
}
</style>
