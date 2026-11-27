<template>
  <div class="tabber">
    <div class="tabber-nav">
      <button
        v-for="(tab, i) in navLabels"
        :key="i"
        class="tab-btn"
        :class="{ active: i === current, glowing: i === glowingIndex }"
        @click="handleClick(i)"
      >
        <span v-if="i === glowingIndex" class="btn-glow"></span>
        <span class="btn-text">{{ tab }}</span>
      </button>
    </div>

    <!-- 合并为一个 Transition，内部用 v-if/v-else 互斥渲染 -->
    <Transition name="fade-slide" mode="out-in">
      <!-- 新写法：tabs 里有 content，用 v-html -->
      <div 
        v-if="useTabs" 
        class="tabber-panel" 
        :key="'tabs-' + current" 
        v-html="safeContent"
      ></div>
      
      <!-- 旧写法：默认插槽兜底 -->
      <div 
        v-else 
        class="tabber-panel" 
        :key="'slot-' + current"
      >
        <slot :tab="current" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
const props = defineProps({
  tabs: { type: Array, default: null },
  labels: { type: Array, default: null }
})

const current = ref(0)
const glowingIndex = ref(-1) // -1 表示没有任何按钮处于发光状态

// 处理点击：切换选中项，并让点击的按钮发光
function handleClick(index) {
  current.value = index
  glowingIndex.value = index
}


// 是否走新 tabs 写法
const useTabs = computed(() => Array.isArray(props.tabs) && props.tabs.length)

// 导航标签：优先用 tabs.label，其次用 labels
const navLabels = computed(() => {
  if (useTabs.value) return props.tabs.map(t => t.label)
  if (Array.isArray(props.labels)) return props.labels
  return []
})

// 安全取内容，越界也不报错
const safeContent = computed(() => {
  if (!useTabs.value) return ''
  const idx = Math.min(current.value, props.tabs.length - 1)
  return props.tabs[idx]?.content || ''
})
</script>

<style scoped>
.tabber {
  max-width: 900px;
  margin: 1em 0;
  border: 1px solid rgba(120, 150, 220, 0.35);
  border-radius: 8px;
  background: rgba(20, 28, 60, 0.45);
  backdrop-filter: blur(6px);
  overflow: hidden;
}
.tabber-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 8px 0;
  background: rgba(12, 18, 45, 0.5);
  border-bottom: 1px solid rgba(120, 150, 220, 0.3);
}
.tab-btn {
  position: relative;
  background: rgba(40, 55, 110, 0.4);
  border: 1px solid rgba(120, 150, 220, 0.3);
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  color: #b8c4e0;
  font-size: 14px;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* 选中状态（可保留或与发光合并） */
.tab-btn.active {
  background: rgba(90, 115, 200, 0.7);
  color: #fff;
  border-color: rgba(150, 175, 255, 0.6);
}

/* 发光按钮的专属样式 */
.tab-btn.glowing {
  background: rgba(90, 115, 200, 0.85);
  box-shadow: 0 0 20px rgba(130, 160, 240, 0.6), 0 0 40px rgba(170, 190, 250, 0.3);
  transform: scale(1.02);
}

/* 发光层：始终保持在展开状态 */
.btn-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(230, 245, 255, 0.75) 0%, rgba(210, 225, 255, 0.4) 30%, transparent 65%);
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.9;
  mix-blend-mode: screen;
  animation: pulseGlow 1.5s ease-in-out infinite alternate;
}

/* 脉冲动画让发光更有生命力 */
@keyframes pulseGlow {
  0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.7; }
  100% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
}

/* 文字提亮 */
.btn-text {
  position: relative;
  z-index: 1;
  text-shadow: 0 0 6px rgba(255, 235, 140, 0.5);
}
.tabber-panel { padding: 16px; color: #d4dcf0; line-height: 1.7; position: relative; }
.tabber-panel :deep(h2) { color: #F1E25D; margin: 0 0 8px; }
.tabber-panel :deep(img) { /*border-radius: 6px; border: 1px solid rgba(120,150,220,.3); */}
/* 淡入淡出 + 轻微上移动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* 防止离开动画时元素占位导致跳动 */
.fade-slide-leave-active {
  position: absolute;
  width: 100%;
}

/* 确保面板容器相对定位 */
.tabber-panel {
  position: relative;
}
</style>


.dl-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  margin: 12px 0;
  position: relative;
  background: rgba(40, 55, 110, 0.4);
  border: 1px solid rgba(120, 150, 220, 0.3);
  border-radius: 6px;
  color: #b8c4e0;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  overflow: hidden;
  transition: all 0.3s ease;
}
.dl-btn:hover {
  background: rgba(90, 115, 200, 0.7);
  color: #fff;
  border-color: rgba(150, 175, 255, 0.6);
  box-shadow: 0 0 20px rgba(130, 160, 240, 0.6),
              0 0 40px rgba(170, 190, 250, 0.3);
  transform: scale(1.02);
}
.dl-btn__icon { font-size: 1.1em; line-height: 1; }
.dl-btn__text {
  position: relative;
  z-index: 1;
  text-shadow: 0 0 6px rgba(255, 235, 140, 0.5);
}