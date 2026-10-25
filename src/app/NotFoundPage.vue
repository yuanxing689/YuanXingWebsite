<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData, useRoute } from 'vitepress'
import { toSiteHref } from './navigation/sitePaths.js'

const route = useRoute()
const { site } = useData()

const headingRef = ref(null)
let robotsTag = null

function getRequestedPath() {
  const path = route.path || '/'
  try {
    return decodeURI(path)
  } catch {
    return path
  }
}

// 404 的 description 被 VitePress 固化为 "Not Found"，覆写为站点描述并声明不收录
function applySeoOverrides() {
  if (typeof document === 'undefined') return

  const descriptionTag = document.querySelector('meta[name="description"]')
  if (descriptionTag && site.value.description) {
    descriptionTag.setAttribute('content', site.value.description)
  }

  if (!robotsTag) {
    robotsTag = document.createElement('meta')
    robotsTag.setAttribute('name', 'robots')
    robotsTag.setAttribute('content', 'noindex, nofollow')
    document.head.appendChild(robotsTag)
  }
}

watch(() => route.path, applySeoOverrides, { immediate: true })

onMounted(() => {
  applySeoOverrides()
  headingRef.value?.focus({ preventScroll: true })
})

onBeforeUnmount(() => {
  robotsTag?.remove()
  robotsTag = null
})
</script>

<template>
  <section class="not-found">
    <span class="not-found__ornament" aria-hidden="true">✦</span>
    <p class="not-found__code" aria-hidden="true">404</p>
    <h1 ref="headingRef" class="not-found__title" tabindex="-1">这颗星不在星图上</h1>
    <p class="not-found__desc">
      你要访问的页面可能已被移动、更名，或者从未存在过。
    </p>
    <p class="not-found__path">
      <span class="not-found__path-label">请求路径</span>
      <code class="not-found__path-value">{{ getRequestedPath() }}</code>
    </p>
    <div class="not-found__actions">
      <a
        class="not-found__button not-found__button--primary"
        :href="toSiteHref('/')"
      >
        返回首页
      </a>
      <a class="not-found__button" :href="toSiteHref('/#games')">
        浏览游戏目录
      </a>
    </div>
  </section>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100svh - 224px);
  padding: clamp(32px, 6svh, 72px) 0 112px;
  text-align: center;
  animation: not-found-enter 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.not-found__ornament {
  color: var(--star-warm);
  font-size: clamp(1.5rem, 3vw, 2rem);
  text-shadow: 0 0 16px var(--star-warm-soft);
  animation: not-found-twinkle 2.6s ease-in-out infinite;
}

.not-found__code {
  margin: 18px 0 0;
  padding-left: 0.14em;
  background: linear-gradient(
    180deg,
    rgba(206, 220, 255, 0.96),
    rgba(139, 165, 222, 0.94) 44%,
    rgba(66, 88, 145, 0.96)
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 24px rgba(107, 159, 255, 0.35));
  font-size: clamp(4.5rem, 13vw, 7.5rem);
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1;
}

.not-found__title {
  margin: clamp(20px, 3svh, 32px) 0 0;
  color: #f0f4ff;
  font-size: clamp(1.55rem, 4vw, 2.4rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.3;
}

.not-found__title:focus,
.not-found__title:focus-visible {
  /* 非交互标题仅承接程序化焦点供读屏定位，不显示高亮环 */
  outline: none;
}

.not-found__desc {
  margin: 14px 0 0;
  max-width: 34em;
  color: var(--site-muted);
  line-height: 1.9;
}

.not-found__path {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 26px 0 0;
}

.not-found__path-label {
  color: var(--ink-dim);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
}

.not-found__path-value {
  max-width: min(100%, 460px);
  padding: 7px 16px;
  overflow-wrap: anywhere;
  border: 1px solid var(--site-line);
  border-radius: 999px;
  background: rgba(4, 9, 24, 0.72);
  color: var(--site-blue);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88rem;
  user-select: all;
}

.not-found__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  margin-top: clamp(30px, 4svh, 44px);
}

.not-found__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 10px 30px;
  border: 1px solid rgba(157, 185, 255, 0.35);
  border-radius: 999px;
  background: rgba(9, 18, 42, 0.72);
  color: #d9e4ff;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.not-found__button:hover {
  border-color: rgba(196, 225, 255, 0.92);
  background: rgba(14, 28, 64, 0.86);
  color: #fff;
}

.not-found__button:focus-visible {
  outline: 2px solid #b8d8ff;
  outline-offset: 3px;
}

.not-found__button--primary {
  border-color: var(--star-warm-border);
  background: rgba(255, 240, 174, 0.1);
  color: var(--star-warm);
}

.not-found__button--primary:hover {
  background: rgba(255, 240, 174, 0.18);
  color: #fff8d5;
  box-shadow: 0 0 18px rgba(255, 240, 174, 0.22);
}

@keyframes not-found-enter {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes not-found-twinkle {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.92);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@media (max-width: 680px) {
  /* 底部导航玻璃高约 116px，留出避让避免遮挡按钮 */
  .not-found {
    padding-bottom: 148px;
  }

  .not-found__path-value {
    max-width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .not-found {
    animation: none;
  }

  .not-found__ornament {
    animation: none;
  }

  .not-found__button {
    transition: none;
  }
}
</style>
