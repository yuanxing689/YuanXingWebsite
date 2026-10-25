<script setup>
import HomeSection from './HomeSection.vue'

defineProps({
  content: { type: Object, default: null }
})
</script>

<template>
  <HomeSection id="about" :title="content?.meta?.title || '汉化组介绍'">
    <div
      v-if="content?.html"
      class="home-section__markdown"
      v-html="content.html"
    />
    <p v-else class="home-section__empty">内容待补充。</p>
  </HomeSection>
</template>
