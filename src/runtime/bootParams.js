// VitePress 会在首次导航后规范化 URL，启动参数必须在模块引导阶段冻结。
const bootParams = typeof window === 'undefined'
  ? new URLSearchParams()
  : new URLSearchParams(window.location.search)

export function getBootParam(name) {
  return bootParams.get(name)
}
