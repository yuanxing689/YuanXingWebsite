const TRANSITION_TIMEOUT_MS = 3000

function waitForTransition(transition, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false
    let timeout = 0

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve()
    }
    timeout = setTimeout(() => {
      transition.skipTransition?.()
      finish()
    }, timeoutMs)

    transition.ready?.catch(() => {})
    transition.finished?.then(finish, finish)
  })
}

/**
 * 原生 View Transition 驱动。开始动画本身失败时返回 unsupported，
 * 由编排器执行 CSS 降级；更新回调失败则原样抛出，避免重复提交。
 */
export async function runNativeViewTransition({
  documentRef,
  update,
  timeoutMs = TRANSITION_TIMEOUT_MS
}) {
  if (typeof documentRef.startViewTransition !== 'function') {
    return { used: false, result: false }
  }

  let updateStarted = false
  let updateResult = false
  let updateError = null
  let transition = null

  try {
    transition = documentRef.startViewTransition(async () => {
      updateStarted = true
      try {
        updateResult = await update()
        return updateResult
      } catch (error) {
        updateError = error
        throw error
      }
    })
  } catch (error) {
    if (updateStarted) {
      if (updateError) throw updateError
      return {
        used: true,
        result: updateResult
      }
    }
    return {
      used: false,
      result: false,
      error
    }
  }

  await waitForTransition(transition, timeoutMs)
  if (updateError) throw updateError
  return {
    used: true,
    result: updateResult,
    transition
  }
}

export async function settleNativeTransition(documentRef, activeTransition) {
  const transition = documentRef.activeViewTransition || activeTransition
  if (!transition) return

  transition.skipTransition?.()
  await waitForTransition(transition, TRANSITION_TIMEOUT_MS)
}
