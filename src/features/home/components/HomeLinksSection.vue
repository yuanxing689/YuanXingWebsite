<script setup>
import HomeSection from './HomeSection.vue'

defineProps({
  content: { type: Object, default: null }
})
</script>

<template>
  <HomeSection id="links" :title="content?.meta?.title || '社交链接'">
    <div
      v-if="content?.html"
      class="home-section__markdown"
      v-html="content.html"
    />
    <p v-else class="home-section__empty">内容待补充。</p>
  </HomeSection>
</template>
