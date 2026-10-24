import { defineConfig } from 'vitepress'
import { createSiteImagePlugin } from './markdown/siteImages.js'

const siteBase = process.env.SITE_BASE || '/'
const normalizedBase = siteBase.endsWith('/') ? siteBase : `${siteBase}/`
const siteOrigin = (
  process.env.SITE_ORIGIN || 'https://ourselves.cv'
).replace(/\/+$/, '')
const sitemapHostname = new URL(
  normalizedBase,
  `${siteOrigin}/`
).href

export default defineConfig({
  base: normalizedBase,
  lang: 'zh-CN',
  title: '元星联邦',
  description: '元星联邦汉化组官网',
  cleanUrls: true,
  srcExclude: ['home/**', 'games/README.md'],
  outDir: '../dist',
  scrollOffset: 88,
  markdown: {
    config: createSiteImagePlugin(normalizedBase)
  },
  sitemap: {
    hostname: sitemapHostname
  },
  head: [
    [
      'link',
      {
        rel: 'icon',
        href: `${normalizedBase}images/brand/logo-mark.png`,
        type: 'image/png'
      }
    ]
  ],
  themeConfig: {
    outline: false
  }
})
