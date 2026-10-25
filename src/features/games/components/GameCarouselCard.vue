<script setup>
import { computed, ref } from 'vue'
import {
  useNavigationCoordinator
} from '../../../app/navigation/navigationCoordinator.js'
import {
  createGameEntryIntent
} from '../../../app/navigation/navigationIntent.js'
import { toSiteHref } from '../../../app/navigation/sitePaths.js'
import { getGameStatusLabel } from '../gameStatus.js'
import {
  captureGameReturn,
  getGameCardKey
} from '../gameCarouselState.js'

const props = defineProps({
  game: { type: Object, required: true },
  active: { type: Boolean, default: false },
  transitionKey: { type: String, default: '' }
})

const statusLabel = computed(
  () => getGameStatusLabel(props.game.status)
)
const transitionId = computed(() => {
  const source = String(props.game.id || props.game.url || props.game.title)
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
const isReturnTarget = computed(
  () => props.transitionKey === getGameCardKey(props.game)
)
const { navigate } = useNavigationCoordinator()
const coverElementRef = ref(null)
const titleElementRef = ref(null)
const statusElementRef = ref(null)

function getReturnStyle(transitionName) {
  return isReturnTarget.value
    ? { viewTransitionName: transitionName }
    : undefined
}

function handleNavigate(event) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  const transitionElements = [
    [coverElementRef.value, coverTransitionName.value],
    [titleElementRef.value, titleTransitionName.value],
    [statusElementRef.value, statusTransitionName.value]
  ]
  transitionElements.forEach(([element, transitionName]) => {
    element?.style.setProperty('view-transition-name', transitionName)
  })

  const cardKey = getGameCardKey(props.game)
  const target = toSiteHref(props.game.url)
  captureGameReturn(cardKey)
  event.preventDefault()
  navigate(target, {
    intent: createGameEntryIntent({
      targetUrl: new URL(target, window.location.origin).href,
      cardKey
    })
  }).finally(() => {
    transitionElements.forEach(([element]) => {
      element?.style.removeProperty('view-transition-name')
    })
  })
}
</script>

<template>
  <a
    class="game-card__link"
    :href="toSiteHref(game.url)"
    target="_self"
    :aria-current="active ? 'true' : undefined"
    @click="handleNavigate"
  >
    <span class="game-card__cover-frame">
      <span
        ref="coverElementRef"
        class="game-card__cover-media"
        :style="getReturnStyle(coverTransitionName)"
      >
        <img
          v-if="game.cover"
          class="game-card__cover"
          :src="toSiteHref(game.cover)"
          :alt="`${game.title} 封面`"
          loading="lazy"
          decoding="async"
        />
        <span v-else class="game-card__placeholder" aria-hidden="true">
          ✦
        </span>
      </span>

      <span class="game-card__meta">
        <span class="game-card__header">
          <span
            ref="titleElementRef"
            class="game-card__name"
            :style="getReturnStyle(titleTransitionName)"
          >
            {{ game.title }}
          </span>
          <span
            ref="statusElementRef"
            class="game-card__status"
            :style="getReturnStyle(statusTransitionName)"
          >
            {{ statusLabel }}
          </span>
        </span>
      </span>
    </span>
  </a>
</template>

<style scoped>
.game-card__link {
  position: relative;
  display: block;
  overflow: hidden;
  border: 1px solid rgba(157, 185, 255, 0.28);
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(12, 24, 55, 0.96), rgba(4, 9, 24, 0.94)),
    rgba(4, 8, 24, 0.9);
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(217, 232, 255, 0.06);
  color: var(--ink);
  text-decoration: none;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.game-card__link::before {
  position: absolute;
  z-index: 2;
  inset: 0;
  border-radius: inherit;
  box-shadow:
    inset 0 0 0 1px var(--star-warm-border),
    inset 0 0 18px var(--star-warm-inset);
  content: '';
  opacity: 0;
  pointer-events: none;
}

.game-card__link::after {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: rgba(1, 5, 16, 0.54);
  content: '';
  opacity: calc(var(--carousel-shade, 0) * 0.52);
  pointer-events: none;
}

.game-card__link[aria-current='true'] {
  border-color: var(--star-warm-border);
  box-shadow:
    0 0 18px var(--star-warm-soft),
    0 0 32px var(--star-blue-halo),
    0 18px 48px rgba(0, 0, 0, 0.34),
    inset 0 0 18px var(--star-warm-inset);
}

.game-card__link[aria-current='true']::before {
  opacity: 1;
}

.game-card__link:hover,
.game-card__link:focus-visible {
  border-color: rgba(196, 225, 255, 0.92);
}

.game-card__link[aria-current='true']:hover,
.game-card__link[aria-current='true']:focus-visible {
  border-color: var(--star-warm);
}

.game-card__link:focus-visible {
  outline: 2px solid rgba(184, 216, 255, 0.9);
  outline-offset: 4px;
}

.game-card__cover-frame {
  position: relative;
  display: grid;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1920 / 1080;
  place-items: center;
  border-radius: 13px;
  background:
    radial-gradient(circle at 50% 50%, rgba(75, 136, 230, 0.24), transparent 54%),
    rgba(4, 9, 24, 0.92);
}

.game-card__cover-media {
  position: absolute;
  display: grid;
  overflow: hidden;
  inset: 0;
  place-items: center;
  border-radius: inherit;
}

.game-card__cover {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

.game-card__link[aria-current='true']:hover .game-card__cover,
.game-card__link[aria-current='true']:focus-visible .game-card__cover {
  transform: scale(1.025);
}

.game-card__placeholder {
  position: absolute;
  color: var(--star-warm);
  font-size: 3.4rem;
  text-shadow: 0 0 24px var(--star-warm-soft);
}

.game-card__meta {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  inset: auto 0 0;
  min-height: 46%;
  padding: 54px 22px 18px;
}

.game-card__meta::before {
  position: absolute;
  z-index: 0;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(3, 7, 19, 0.72) 46%,
    rgba(3, 7, 19, 0.96)
  );
  content: '';
  opacity: 1;
  pointer-events: none;
  transition: opacity 220ms ease;
}

html.game-route-transitioning .game-card__meta::before {
  opacity: 0;
  transition: none;
}

.game-card__header {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px 18px;
  min-width: 0;
}

.game-card__name {
  position: relative;
  z-index: 1;
  overflow: hidden;
  min-width: 0;
  color: #eef5ff;
  font-size: clamp(1.16rem, 2vw, 1.42rem);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.03em;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.9);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  display: -webkit-box;
}

.game-card__status {
  position: relative;
  z-index: 1;
  flex: none;
  padding: 5px 9px;
  border: 1px solid rgba(255, 240, 174, 0.24);
  border-radius: 999px;
  background: rgba(4, 9, 24, 0.56);
  box-shadow: inset 0 1px 0 rgba(255, 248, 219, 0.08);
  color: var(--star-warm);
  font-size: 0.7rem;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.9);
}

@media (max-width: 680px) {
  .game-card__meta {
    min-height: 50%;
    padding: 48px 18px 15px;
  }

  .game-card__header {
    gap: 7px 14px;
  }

  .game-card__name {
    font-size: 1.08rem;
  }

  .game-card__status {
    padding: 4px 8px;
    font-size: 0.66rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .game-card__link,
  .game-card__cover {
    transition: none;
  }
}
</style>
