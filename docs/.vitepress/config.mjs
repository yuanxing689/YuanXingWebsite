import { defineConfig } from 'vitepress'
import { registerMediaContainers } from './markdown/mediaContainers.js'
import { createSiteImagePlugin } from './markdown/siteImages.js'
import { SITE_SCROLL_OFFSET } from '../../src/app/navigation/siteScroll.js'

const siteBase = process.env.SITE_BASE || '/'
const normalizedBase = siteBase.endsWith('/') ? siteBase : `${siteBase}/`
const configureSiteImages = createSiteImagePlugin(normalizedBase)
const includeTestFixtures =
  process.env.SITE_INCLUDE_TEST_FIXTURES === 'true'
const siteOrigin = (
  process.env.SITE_ORIGIN || 'https://ourselves.cv'
).replace(/\/+$/, '')
const sitemapHostname = new URL(
  normalizedBase,
  `${siteOrigin}/`
).href

const SITE_TITLE = '元星联邦'
const SITE_DESCRIPTION =
  '元星联邦汉化组——一个独立兽人视觉小说的中文本地化组织'
// 站点图标在 public 目录里的路径：favicon 用相对 base 的写法，
// og:image 和 JSON-LD 用绝对地址，两处共用这一个常量避免改漏。
const SITE_LOGO_PATH = 'images/brand/logo-mark.png'
const SITE_LOGO_URL = `${sitemapHostname}${SITE_LOGO_PATH}`

// 公开社交主页：作为 Organization 的 sameAs，帮助搜索引擎确认这些主页
// 和本站描述的是同一个实体。
const SOCIAL_PROFILES = [
  'https://yuanxing-federation-clt.itch.io',
  'https://x.com/Fin717152282722',
  'https://t.me/yuanxinglianbanghanhuazu',
  'https://bsky.app/profile/yuanxinglianbang.bsky.social'
]

// 站点级结构化数据：告诉搜索引擎「这个站属于谁、叫什么、logo 是哪个图」。
// 它不改变搜索排名，但会影响站点信息面板和图标类展示。
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${sitemapHostname}#organization`,
      name: '元星联邦汉化组',
      alternateName: 'YuanXing Federation',
      url: sitemapHostname,
      logo: SITE_LOGO_URL,
      description: SITE_DESCRIPTION,
      sameAs: SOCIAL_PROFILES
    },
    {
      '@type': 'WebSite',
      '@id': `${sitemapHostname}#website`,
      name: SITE_TITLE,
      url: sitemapHostname,
      inLanguage: 'zh-CN',
      publisher: { '@id': `${sitemapHostname}#organization` }
    }
  ]
}

/**
 * 把 Markdown 相对路径转成站点 URL，规则与 VitePress 内置 sitemap 保持一致：
 * index.md 折叠成所在目录，cleanUrls 下省略 .md 后缀。
 */
function toPageUrl(page) {
  const url = page.replace(/(^|\/)index\.md$/, '$1')
  return url.replace(/\.md$/, '')
}

export default defineConfig({
  base: normalizedBase,
  lang: 'zh-CN',
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  cleanUrls: true,
  // 开启后 sitemap 会为每个页面写入 <lastmod>（取该文件的 git 提交时间）
  lastUpdated: true,
  srcExclude: [
    'home/**',
    'games/README.md',
    ...(includeTestFixtures ? [] : ['fixtures/**'])
  ],
  outDir: '../dist',
  scrollOffset: SITE_SCROLL_OFFSET,
  markdown: {
    config(md) {
      configureSiteImages(md)
      registerMediaContainers(md)
    }
  },
  sitemap: {
    hostname: sitemapHostname
  },
  head: [
    [
      'link',
      {
        rel: 'icon',
        href: `${normalizedBase}${SITE_LOGO_PATH}`,
        type: 'image/png'
      }
    ],
    ['meta', { property: 'og:site_name', content: SITE_TITLE }],
    ['meta', { property: 'og:image', content: SITE_LOGO_URL }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'theme-color', content: '#070b18' }],
    ['script', { type: 'application/ld+json' }, JSON.stringify(siteJsonLd)]
  ],
  /**
   * 每页内容不同的标签只能在这里生成：head 配置是全局的，
   * 如果把 canonical 写进 head，所有页面都会声明同一个规范地址。
   */
  transformHead({ page, title, description }) {
    const pageUrl = new URL(toPageUrl(page), sitemapHostname).href
    return [
      ['link', { rel: 'canonical', href: pageUrl }],
      ['meta', { property: 'og:url', content: pageUrl }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      [
        'meta',
        {
          property: 'og:type',
          content: page === 'index.md' ? 'website' : 'article'
        }
      ]
    ]
  },
  themeConfig: {
    outline: false
  }
})
