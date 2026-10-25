const ROUTE_FALLBACK_CLASS = 'route-fallback-leaving'
const TRANSITIONING_CLASS = 'game-route-transitioning'

function waitForFrame(windowRef) {
  return new Promise((resolve) => {
    windowRef.requestAnimationFrame(resolve)
  })
}

/**
 * 无 View Transitions 时的 140ms 淡出提交驱动。
 */
export async function runCssRouteTransition({
  windowRef,
  documentRef,
  update,
  fadeMs = 140
}) {
  const root = documentRef.documentElement
  root.classList.add(ROUTE_FALLBACK_CLASS)
  root.classList.add(TRANSITIONING_CLASS)

  try {
    await new Promise((resolve) => {
      windowRef.setTimeout(resolve, fadeMs)
    })
    return await update()
  } finally {
    await waitForFrame(windowRef)
    root.classList.remove(ROUTE_FALLBACK_CLASS)
    root.classList.remove(TRANSITIONING_CLASS)
  }
}
