import { nextTick } from 'vue'
import { useRouter } from 'vitepress'
import {
  createTransitionOrchestrator
} from '../transitions/transitionOrchestrator.js'
import { createVitePressRouterAdapter } from './vitePressRouterAdapter.js'

const defaultOrchestrator = createTransitionOrchestrator()

/**
 * 已决定目标后的唯一导航提交入口。协调器只执行提交与事务有效性检查，
 * View Transition、CSS 降级、超时和清理交给 TransitionOrchestrator。
 */
export function useNavigationCoordinator({
  routerAdapter = null,
  orchestrator = defaultOrchestrator
} = {}) {
  const router = useRouter()
  const adapter =
    routerAdapter ?? createVitePressRouterAdapter(router)
  let navigating = false

  async function navigate(href, {
    afterRouteChange = null,
    intent = null,
    navigationContext = null,
    navigationSource = null,
    onFinished = null,
    preempt = false,
    shouldCommitRoute = null
  } = {}) {
    if (navigating && !preempt) return false
    navigating = true

    const update = async () => {
      if (shouldCommitRoute && !shouldCommitRoute()) return false
      if (
        navigationContext &&
        !adapter.contexts.isCurrent(navigationContext)
      ) {
        return false
      }

      await adapter.navigate(href, {
        ...(navigationContext ? { context: navigationContext } : {}),
        ...(navigationSource ? { source: navigationSource } : {})
      })
      await nextTick()
      await afterRouteChange?.()
      return true
    }

    try {
      return Boolean(await orchestrator.run({ intent }, update))
    } finally {
      try {
        onFinished?.()
      } finally {
        navigating = false
      }
    }
  }

  return {
    navigate
  }
}
