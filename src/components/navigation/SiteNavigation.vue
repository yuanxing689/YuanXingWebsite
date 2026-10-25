<script setup>
defineProps({
  items: {
    type: Array,
    default: () => []
  },
  home: {
    type: Boolean,
    default: false
  },
  glassVisible: {
    type: Boolean,
    default: false
  },
  locked: {
    type: Boolean,
    default: false
  },
  showFallback: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['item-select'])

function getItemStyle(item) {
  return {
    left: `${item.x * 100}%`,
    top: `${item.y * 100}%`
  }
}

function forwardItemSelect(event, item) {
  emit('item-select', event, item)
}
</script>

<template>
  <div
    class="star-navigation-glass"
    :class="{ 'star-navigation-glass--visible': glassVisible }"
    aria-hidden="true"
  />

  <nav
    class="star-navigation"
    :class="{ 'star-navigation--home': home }"
    aria-label="主导航"
    :inert="locked ? '' : null"
  >
    <a
      v-for="item in items"
      :key="item.id"
      class="star-navigation__link"
      :class="{ 'is-active': item.active }"
      :href="item.href"
      :style="getItemStyle(item)"
      target="_self"
      :data-section-link="item.id"
      :aria-current="item.active ? 'location' : undefined"
      @click="forwardItemSelect($event, item)"
    >
      <span
        v-if="showFallback"
        class="star-navigation__fallback"
        aria-hidden="true"
      >
        ✦
      </span>
      <span class="star-navigation__label">{{ item.label }}</span>
    </a>
  </nav>
</template>

<style scoped>
.star-navigation {
  position: fixed;
  z-index: 32;
  inset: 0;
  opacity: var(--chrome-transition-opacity, 1);
  pointer-events: none;
  transition: opacity 180ms ease;
}

.star-navigation-glass {
  position: fixed;
  z-index: 29;
  top: 12px;
  right: clamp(20px, 2vw, 28px);
  left: clamp(20px, 2vw, 28px);
  height: 64px;
  border: 1px solid rgba(157, 185, 255, 0.18);
  border-radius: 18px;
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

.star-navigation-glass--visible {
  opacity: var(--chrome-transition-opacity, 1);
}

.star-navigation__link {
  position: absolute;
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  color: #f4e4ad;
  text-decoration: none;
  pointer-events: auto;
  transition: color 160ms ease, filter 160ms ease;
}

.star-navigation__link.is-active {
  color: #fff8d5;
  filter: drop-shadow(0 0 10px rgba(255, 239, 175, 0.88));
}

.star-navigation__link.is-active::before {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 240, 178, 0.24), transparent 70%);
  content: '';
}

.star-navigation__link:focus-visible {
  outline: 2px solid #b8d8ff;
  outline-offset: 3px;
}

.star-navigation__label {
  position: absolute;
  left: calc(100% + 2px);
  top: 50%;
  z-index: 1;
  color: #d9e4ff;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  white-space: nowrap;
  text-shadow: 0 1px 10px rgba(3, 7, 20, 0.98), 0 0 18px rgba(107, 159, 255, 0.7);
  transform: translateY(-50%);
}

.star-navigation__link.is-active .star-navigation__label {
  color: #fff6ce;
}

.star-navigation--home .star-navigation__label {
  opacity: var(--intro-nav-label, 0);
}

.star-navigation__fallback {
  font-size: 1.7rem;
  text-shadow: 0 0 10px rgba(255, 236, 173, 0.9), 0 0 24px rgba(110, 166, 255, 0.75);
}

@media (max-width: 680px) {
  .star-navigation {
    top: 0;
    right: 0;
    bottom: auto;
    left: 0;
    height: var(--site-viewport-height, 100svh);
  }

  .star-navigation-glass {
    top: calc(var(--site-viewport-height, 100svh) - 116px);
    right: 12px;
    bottom: auto;
    left: 12px;
    height: 104px;
    border-radius: 24px;
  }

  .star-navigation__link {
    width: 48px;
    height: 48px;
  }

  .star-navigation__label {
    top: auto;
    left: 50%;
    bottom: calc(100% - 2px);
    transform: translateX(-50%);
    font-size: 0.62rem;
    letter-spacing: 0.02em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .star-navigation,
  .star-navigation-glass {
    transition: none;
  }
}
</style>
