<script setup>
import { computed } from 'vue'
import { useSectionReveal } from '../scroll/useSectionReveal.js'

const props = defineProps({
  id: { type: String, required: true },
  title: { type: String, default: '' },
  variant: { type: String, default: 'default' }
})

const headingId = computed(() => `${props.id}-title`)
const { target, ready, revealed } = useSectionReveal()
</script>

<template>
  <section
    :id="id"
    ref="target"
    class="home-section"
    :class="[
      `home-section--${variant}`,
      { 'home-section--ready': ready, 'is-revealed': revealed }
    ]"
    :aria-labelledby="headingId"
    :data-section="id"
  >
    <h2 :id="headingId">{{ title }}</h2>
    <div class="home-section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.home-section {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100vh;
  min-height: 100svh;
  padding-inline: var(--page-inline);
  padding-block: clamp(104px, 13svh, 144px) clamp(96px, 12svh, 128px);
  scroll-margin-top: 0;
}

.home-section h2 {
  padding: 0 0 clamp(22px, 4svh, 36px);
}

.home-section--games {
  padding-block: clamp(80px, 9svh, 104px) clamp(56px, 6svh, 72px);
}

.home-section--games h2 {
  padding-bottom: clamp(18px, 3svh, 28px);
}

.home-section--ready {
  transition: opacity 600ms ease, transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
}

.home-section--ready:not(.is-revealed) {
  opacity: 0;
  transform: translateY(24px);
}

@media (prefers-reduced-motion: reduce) {
  .home-section--ready {
    transition: none;
  }
}
</style>
