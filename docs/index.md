---
title: 元星联邦汉化组 · YXLB
# 关闭站点名自动后缀；标题完全由上一行的 title 决定，写什么显示什么
# 测试
titleTemplate: false
description: 元星联邦汉化组——一个独立兽人视觉小说的中文本地化组织
---

<script setup>
import { data as homeSections } from './.vitepress/data/home.data.js'
import { data as games } from './.vitepress/data/games.data.js'
import HomeAboutSection from '../src/features/home/components/HomeAboutSection.vue'
import HomeGamesSection from '../src/features/home/components/HomeGamesSection.vue'
import HomeLinksSection from '../src/features/home/components/HomeLinksSection.vue'

const sectionComponents = {
  about: HomeAboutSection,
  games: HomeGamesSection,
  links: HomeLinksSection
}

const sections = [...(homeSections || [])]
  .filter((section) => sectionComponents[section.id])
  .sort((a, b) => (a.meta.order ?? 999) - (b.meta.order ?? 999))

function sectionProps(section) {
  return section.id === 'games'
    ? { content: section, games: games || [] }
    : { content: section }
}
</script>

<component
  v-for="section in sections"
  :is="sectionComponents[section.id]"
  :key="section.id"
  v-bind="sectionProps(section)"
/>
