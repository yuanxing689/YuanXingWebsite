import { withBase } from 'vitepress'

// 站内状态保存规范路径，只有最终浏览器地址附加构建时的站点 base。
function decodePath(value) {
  const path = String(value || '')

  try {
    return decodeURI(path)
  } catch {
    return path
  }
}

function getSiteBase() {
  return withBase('/')
}

export function normalizeSitePath(value) {
  const path = String(value || '/').replace(/\/+$/, '')
  return `${path}/`
}

export function toSitePath(value) {
  const path = decodePath(value)
  const siteBase = getSiteBase()

  if (!path.startsWith('/') || siteBase === '/') return path
  if (path === siteBase.slice(0, -1)) return '/'
  if (!path.startsWith(siteBase)) return path

  return `/${path.slice(siteBase.length)}`
}

export function toSiteHref(value) {
  const href = String(value || '')
  if (!href.startsWith('/')) return href
  return withBase(toSitePath(href))
}
