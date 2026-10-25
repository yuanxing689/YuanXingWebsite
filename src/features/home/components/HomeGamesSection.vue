<script setup>
import GameCarousel from '../../games/components/GameCarousel.vue'
import HomeSection from './HomeSection.vue'

defineProps({
  content: { type: Object, default: null },
  games: { type: Array, default: () => [] }
})
</script>

<template>
  <HomeSection
    id="games"
    variant="games"
    :title="content?.meta?.title || '汉化游戏目录'"
  >
    <div
      v-if="content?.html"
      class="home-section__markdown"
      v-html="content.html"
    />

    <GameCarousel v-if="games.length" :games="games" />
    <p v-else class="home-section__empty">游戏目录整理中。</p>
  </HomeSection>
</template>
