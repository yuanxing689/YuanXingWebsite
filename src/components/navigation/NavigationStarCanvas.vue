<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createNavigationStarScene } from '../../three/navigationScene.js'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})
const emit = defineEmits(['scene-ready', 'scene-error'])
const canvasRef = ref(null)
let sceneHandle = null

onMounted(() => {
  if (!canvasRef.value) return

  try {
    sceneHandle = createNavigationStarScene(canvasRef.value, {
      getTargets: () => props.items
    })
    emit('scene-ready')
  } catch (error) {
    emit('scene-error', error)
  }
})

onBeforeUnmount(() => {
  sceneHandle?.destroy()
  sceneHandle = null
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="navigation-star-canvas"
    aria-hidden="true"
  />
</template>

<style scoped>
.navigation-star-canvas {
  position: fixed;
  z-index: 31;
  inset: 0;
  display: block;
  width: 100%;
  height: var(--site-viewport-height, 100%);
  pointer-events: none;
}
</style>
