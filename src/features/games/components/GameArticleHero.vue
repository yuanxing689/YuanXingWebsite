<script setup>
import { computed } from 'vue'
import { toSiteHref } from '../../../app/navigation/sitePaths.js'
import { getGameStatusLabel } from '../gameStatus.js'

const props = defineProps({
  frontmatter: {
    type: Object,
    required: true
  }
})

const transitionId = computed(() => {
  const source = String(
    props.frontmatter.id || props.frontmatter.title || 'game'
  )
  return source.replace(/[^a-zA-Z0-9_-]/g, '-')
})
const coverTransitionName = computed(
  () => `game-cover-${transitionId.value}`
)
const titleTransitionName = computed(
  () => `game-title-${transitionId.value}`
)
const statusTransitionName = computed(
  () => `game-status-${transitionId.value}`
)
const title = computed(() => props.frontmatter.title || '未命名游戏')
const statusLabel = computed(
  () => getGameStatusLabel(props.frontmatter.status)
)
</script>

<template>
  <header class="game-article-hero">
    <div class="game-article-hero__cover-frame">
      <div
        class="game-article-hero__cover-media"
        :style="{ viewTransitionName: coverTransitionName }"
      >
        <img
          v-if="frontmatter.cover"
          class="game-article-hero__cover"
          :src="toSiteHref(frontmatter.cover)"
          :alt="`${title} 封面`"
          decoding="async"
          fetchpriority="high"
        />
        <span v-else class="game-article-hero__placeholder" aria-hidden="true">
          ✦
        </span>
      </div>

      <div class="game-article-hero__meta">
        <h1
          class="game-article-hero__title"
          :style="{ viewTransitionName: titleTransitionName }"
        >
          {{ title }}
        </h1>
        <span
          class="game-article-hero__status"
          :style="{ viewTransitionName: statusTransitionName }"
        >
          {{ statusLabel }}
        </span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.game-article-hero {
  width: 100%;
  margin-bottom: 28px;
}

.game-article-hero__cover-frame {
  position: relative;
  display: grid;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1920 / 1080;
  place-items: center;
  border: 1px solid rgba(157, 185, 255, 0.28);
  border-radius: 18px;
  background:
    radial-gradient(circle at 50% 50%, rgba(75, 136, 230, 0.24), transparent 54%),
    rgba(4, 9, 24, 0.94);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.36),
    inset 0 1px 0 rgba(217, 232, 255, 0.06);
}

.game-article-hero__cover {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.game-article-hero__cover-media {
  position: absolute;
  display: grid;
  overflow: hidden;
  inset: 0;
  place-items: center;
  border-radius: inherit;
}

.game-article-hero__placeholder {
  position: absolute;
  color: var(--star-warm);
  font-size: clamp(4rem, 12vw, 8rem);
  text-shadow: 0 0 32px var(--star-warm-soft);
}

.game-article-hero__meta {
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  inset: auto 0 0;
  justify-content: space-between;
  gap: 18px;
  min-height: 42%;
  padding: clamp(56px, 10vw, 96px) clamp(20px, 5vw, 42px)
    clamp(20px, 4vw, 34px);
}

.game-article-hero__meta::before {
  position: absolute;
  z-index: 0;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(3, 7, 19, 0.68) 44%,
    rgba(3, 7, 19, 0.96)
  );
  content: '';
  opacity: 1;
  pointer-events: none;
  transition: opacity 220ms ease;
}

html.game-route-transitioning .game-article-hero__meta::before {
  opacity: 0;
  transition: none;
}

.game-article-hero__title {
  position: relative;
  z-index: 1;
  min-width: 0;
  margin: 0;
  color: #f4f8ff;
  font-size: clamp(2rem, 5.5vw, 4rem);
  line-height: 1.1;
  letter-spacing: 0.03em;
  text-shadow: 0 3px 22px rgba(0, 0, 0, 0.92);
}

.game-article-hero__status {
  position: relative;
  z-index: 1;
  flex: none;
  padding: 7px 12px;
  border: 1px solid rgba(255, 240, 174, 0.28);
  border-radius: 999px;
  background: rgba(4, 9, 24, 0.6);
  color: var(--star-warm);
  font-size: 0.78rem;
  line-height: 1.2;
  letter-spacing: 0.1em;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.9);
}

@media (max-width: 680px) {
  .game-article-hero {
    margin-bottom: 20px;
  }

  .game-article-hero__cover-frame {
    border-radius: 14px;
  }

  .game-article-hero__meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
    min-height: 48%;
    padding: 48px 18px 16px;
  }

  .game-article-hero__title {
    font-size: clamp(1.6rem, 9vw, 2.4rem);
  }

  .game-article-hero__status {
    padding: 4px 8px;
    font-size: 0.68rem;
  }
}
</style>
