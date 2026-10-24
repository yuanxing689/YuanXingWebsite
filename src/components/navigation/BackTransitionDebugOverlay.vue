<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  enableBackTransitionDebug,
  getBackTransitionEntries,
  subscribeBackTransitionDebug
} from '../../navigation/backTransitionDiagnostics.js'

const visible = ref(false)
const lines = ref([])
let unsubscribe = null

function formatValue(value) {
  if (value === null || value === undefined) return '-'
  return String(value).replace(/\s+/g, ' ')
}

function refresh() {
  lines.value = getBackTransitionEntries().map((entry) => {
    const details = Object.entries(entry.details)
      .map(([key, value]) => `${key}=${formatValue(value)}`)
      .join(' ')
    return `${entry.id} ${entry.time}ms ${entry.label}${details ? ` ${details}` : ''}`
  })
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('debug') !== 'back') return

  enableBackTransitionDebug()
  visible.value = true
  refresh()
  unsubscribe = subscribeBackTransitionDebug(refresh)
})

onBeforeUnmount(() => {
  unsubscribe?.()
  unsubscribe = null
})
</script>

<template>
  <aside v-if="visible" class="back-debug" aria-live="off">
    <strong>BACK DEBUG</strong>
    <pre v-if="lines.length">{{ lines.join('\n') }}</pre>
    <span v-else>等待事件</span>
  </aside>
</template>

<style scoped>
.back-debug {
  position: fixed;
  z-index: 9999;
  top: 8px;
  right: 8px;
  width: min(430px, calc(100vw - 16px));
  max-height: 58vh;
  padding: 8px 10px;
  overflow: hidden;
  border: 1px solid rgba(196, 225, 255, 0.58);
  border-radius: 8px;
  background: rgba(0, 5, 16, 0.92);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.48);
  color: #dce9ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 9px;
  line-height: 1.35;
  pointer-events: none;
}

.back-debug strong {
  display: block;
  margin-bottom: 4px;
  color: #fff1b8;
  font-size: 10px;
  letter-spacing: 0.08em;
}

.back-debug pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
