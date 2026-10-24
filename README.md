# 元星联邦官网

元星联邦汉化组的静态官网与游戏 Wiki。项目使用 VitePress 生成内容页面，并以 Vue 3、Three.js 和 Anime.js 构建星空主题的首页、导航和跨页动画。

本 README 面向网站开发者，重点说明项目结构、内容维护、视觉架构和验证流程。

## 技术栈

- VitePress 1.6：静态站点、Markdown 路由和内容加载。
- Vue 3.5：组件、状态和页面布局。
- Three.js 0.172：主星、环带、导航星和 Bloom 后处理。
- Anime.js 4.5：首页开场时间轴。
- View Transitions API：游戏卡片与详情页的共享元素动画。
- CSS：响应式布局、毛玻璃、章节显隐和减少动态效果适配。

当前验证环境：Node.js `24.22.1`、npm `11.19.1`。建议使用支持现代 ES 模块的 Node.js 版本。

## 快速开始

```bash
npm install
npm run dev
```

开发服务器默认运行在：

```text
http://localhost:5173
```

生产构建与预览：

```bash
npm run build
npm run preview
```

构建产物会输出到忽略目录，不提交。

## 项目结构

```text
.
├─ docs/
│  ├─ index.md                     # 首页入口与首页 section 组件
│  ├─ home/                        # 首页文案源，不生成独立路由
│  ├─ games/<slug>/index.md        # 游戏 Wiki 页面
│  ├─ games/<slug>/images/         # 游戏正文图片
│  ├─ public/                      # 站点根目录静态资源
│  └─ .vitepress/
│     ├─ config.mjs                # VitePress 配置
│     ├─ data/                     # 首页和游戏数据加载器
│     └─ theme/                    # Layout、主题样式和主题入口
├─ src/
│  ├─ components/
│  │  ├─ home/                     # 首页 section
│  │  ├─ games/                    # 游戏轮播、封面和详情页头部
│  │  └─ navigation/               # 站点导航和详情页导航星画布
│  ├─ composables/                 # 导航、滚动、页面显现和路由过渡
│  ├─ layout/                      # 品牌几何等纯布局计算
│  ├─ intro/                       # 首页开场时间轴
│  └─ three/                       # Three.js 场景、几何、材质和后处理
```

构建缓存、截图和调试输出不应手工维护或提交。

## 页面架构

### Layout

`docs/.vitepress/theme/Layout.vue` 是全站组合层，负责：

- 首页和游戏详情页切换。
- 首页场景、开场锁定和滚动进度。
- 站点头部、导航目标位置和浏览器历史导航。
- 游戏详情页的 frontmatter 头部注入。
- 浏览器后退、共享元素动画和首页锚点恢复。
- 页面内容单独淡出，导航栏、星画布和毛玻璃背景保持可见。

具体职责已拆分到：

- `useIntroController.js`：开场加载、锁定、降级和场景状态。
- `useHomeScrollState.js`：唯一的首页滚动、可视视口和章节状态监听来源。
- `useSiteRouteTransitions.js`：品牌首页、章节导航、游戏返回和浏览器后退。
- `navigation/sitePaths.js`：站内路径、站点 base 和浏览器最终地址的唯一转换入口。
- `brandGeometry.js`：品牌 LOGO、锚点和字标的纯几何计算。

组件本身尽量不直接承担路由和全站状态。新增功能时优先扩展对应模块，不再向 Layout 堆叠监听器和业务分支。

### 导航

- `src/components/navigation/SiteHeader.vue`：品牌、导航链接、毛玻璃和降级星。
- `src/composables/useSiteNavigation.js`：导航标签、链接和归一化坐标。
- `src/navigation/sitePaths.js`：生成带 base 的最终地址，并提供跨部署状态的规范路径。
- `src/components/LogoHero.vue` + `src/three/logoScene.js`：首页完整 3D 场景。
- `src/components/navigation/NavigationStarCanvas.vue` + `src/three/navigationScene.js`：详情页导航专用 3D 场景。

首页和详情页必须共用：

- `src/three/navigationStars.js` 的星星模型和变换 updater。
- `src/three/cosmicRuntime.js` 的渲染器、相机和像素比配置。
- 同一套尺寸、Shader、颜色、呼吸、旋转和 Bloom 参数。

同一页面最多运行一个 Three.js 持续渲染循环。不要在导航组件中再创建一套独立动画逻辑。

### 首页

首页 section 组件位于 `src/components/home/`，文案来源是：

- `docs/home/about.md`
- `docs/home/games.md`
- `docs/home/links.md`

这些 Markdown 通过 `docs/.vitepress/data/home.data.js` 加载，并由 `srcExclude` 排除独立路由。新增 section 时需要同时处理：

1. 在 `docs/home/` 新增 Markdown。
2. 在 `docs/index.md` 注册对应组件。
3. 在 `useSiteNavigation.js` 配置导航散落位置。
4. 检查桌面与手机章节高度、毛玻璃和导航坐标。

### 游戏详情页

游戏详情页的封面、标题和状态只来自 frontmatter，由 `GameArticleHero.vue` 渲染。Markdown 正文从介绍内容开始，不要重复写一级标题或“汉化状态”行。

卡片进入详情页、“游戏目录”返回和浏览器后退使用 View Transitions：

- `GameCarouselCard.vue` 负责源卡片和点击拦截。
- `GameArticleHero.vue` 提供详情页目标元素。
- `gameCarouselState.js` 记录当前卡片并等待轮播恢复。
- `useViewTransitionNavigation.js` 协调进入、显式返回和浏览器后退。

不支持 View Transitions 的浏览器会使用淡出淡入。减少动态效果模式下直接切页。

导航链接由站点处理器接管，避免 VitePress 在进入首页前抢先执行 hash 滚动。“游戏目录”、其他首页锚点、首页内部导航和滚轮吸附共享同一套导航偏移落点。页面离场只淡出正文内容；固定导航、导航星和毛玻璃不参与透明度动画。

## 内容维护

### 首页文案

首页 section 的 frontmatter 控制标题、导航标签和顺序：

```yaml
---
id: games
title: 汉化游戏目录
navLabel: 游戏目录
order: 20
---
```

- `id` 是首页锚点，也是组件关联键。
- `title` 是页面标题。
- `navLabel` 是导航文字。
- `order` 越小越靠前。
- 正文直接写普通 Markdown，不要重复写二级标题。

首页图片和链接使用站内绝对路径，例如 `/images/home/team.webp`。不要写入部署目录；页面组件通过 `toSiteHref()` 补 base，首页 Markdown 图片由构建配置统一处理。

### 新增游戏

1. 新建 `docs/games/<slug>/index.md`。
2. 在同目录的 `images/` 放 Wiki 正文图片，在 `docs/public/images/games/` 放共享封面。
3. 填写 frontmatter。
4. 正文直接写介绍、状态说明、截图和 Wiki 内容。

推荐 frontmatter：

```yaml
---
type: game
id: example-game
title: 示例游戏
description: 一句话简介。
status: translating
order: 20
cover: /images/games/example-game.webp
draft: false
---

正文从这里开始。
```

字段说明：

- `type`：必须是 `game`，否则不会进入游戏目录。
- `id`：全站唯一，不随标题修改。
- `title`：卡片、详情页和浏览器标题使用的游戏名。
- `description`：保留给目录和后续展示，可先填写简短介绍。
- `status`：支持 `planned`、`translating`、`released`、`paused`。
- `order`：决定卡片顺序，数值越小越靠前。
- `cover`：封面站点路径；建议使用 `1920×1080` 的 WebP/AVIF。
- `draft`：`true` 时不会进入游戏目录。

注意事项：

- `id` 和 `order` 必须唯一，否则排序或共享元素命名会产生歧义。
- 测试副本和多版本页面应设置 `draft: true`，或移出 `docs/games/`。
- 不要在游戏 Markdown 中重复写 `# 游戏名` 和状态行。
- 封面会同时用于首页卡片和详情页头部，必须保持横版构图。

### 图片

- `docs/public/` 下的文件会从站点根路径直接访问。
- 游戏封面放在 `docs/public/images/games/`，由 frontmatter 使用站点绝对路径引用。
- `docs/games/<slug>/images/` 保存同一 Wiki 的正文图片，Markdown 使用相对路径。
- 封面和正文图即使画面相同，也分别保留公共封面资产与游戏目录内的正文副本。
- 当前正式游戏图片使用 WebP；现有中文文件名继续保留，新增文件可优先使用稳定的 ASCII slug。
- `docs/games/` 下的三份游戏 Markdown 同时作为维护示例：分别演示图文环绕、全宽图片和双图排版。

Markdown 图片支持以下布局类：

```md
![左图](./images/example.webp){.image-left .image-wrap}
![居中](./images/example.webp){.image-center}
![全宽](./images/example.webp){.image-full}
```

详细规则见 `docs/home/README.md`。

### 品牌和导航资源

- 首页滚动后的品牌 LOGO：`docs/public/images/brand/logo-mark.png`。
- 浏览器站点图标：复用 `docs/public/images/brand/logo-mark.png`。
- 背景图：`docs/public/assets/`。

修改品牌资源时，需要同时检查桌面导航、手机品牌毛玻璃、详情页头部和开场结束状态。

## 状态与调试

### 开场

开场状态按标签页会话记录在 `sessionStorage`：

- 同一标签页首次进入首页播放。
- 刷新或章节往返不重复播放。
- 新标签页重新播放。
- 开场动画 chunk 加载失败时自动切换到静态终态，不会锁死页面。

调试参数：

```text
?intro=on          强制重播
?intro=off         直接跳过
?intro=freeze-2.4  冻结在指定秒数
```

需要重新测试首次访问时，可清除当前站点的 `sessionStorage` 后刷新。

### 游戏卡片恢复

当前游戏卡片 URL 保存在 `sessionStorage`，用于从详情页或浏览器后退时恢复卡片位置。若调试时状态异常，可清除：

```text
yuanxing:active-game
yuanxing:intro-seen
```

### 动画与滚动

- 页面章节使用可取消的自定义对齐，不使用原生 Scroll Snap。
- 浏览器滚动恢复设为手动模式；显式导航在 View Transition 捕获新快照前完成锚点定位。
- 导航、区块滚动和自动吸附使用同一套 `scrollOffset + padding-top` 落点。
- 页面离场只淡出内容层，固定导航和背景不改变坐标或透明度。
- 游戏卡片的共享元素动画依赖 DOM 元素名称和轮播同步定位。
- 修改轮播尺寸、封面比例或详情页头部时，必须复查进入和返回动画。

## 开发约定

- 使用 Vue 3 `<script setup>`、ES modules、两空格缩进、单引号和尾随无分号。
- 组件使用 PascalCase，变量和函数使用 camelCase，CSS 类使用 kebab-case/BEM。
- 优先通过清晰命名、模块边界和少量精确注释表达意图。
- 临时 HTTP 服务、浏览器和调试进程在验证结束后关闭。
- `prefers-reduced-motion` 必须得到完整支持。
- WebGL 失败时，导航、正文和游戏入口仍必须可用。
- 不要提交构建产物、缓存、截图或调试工具输出。
- 视觉改动完成后优先使用 Codex 内置浏览器调试，并检查桌面与手机视口。

## 验证清单

每次代码或内容改动至少执行：

```bash
npm run build
```

涉及界面时还要检查：

- 首页开场、跳过和同一标签页刷新。
- 桌面与手机导航位置、毛玻璃和键盘操作。
- 首页章节滚动、导航平滑跳转和当前章节状态。
- 游戏卡片排序、封面叠字、进入详情页和返回动画。
- 浏览器后退、直接访问详情页和刷新。
- 返回游戏目录后恢复原卡片，无首卡闪烁或滚动错位。
- 详情页返回首页时导航星不再下移，正文淡出期间导航栏和毛玻璃保持可见。
- 导航返回后不再出现自动吸附造成的二次位移。
- 首页封面使用 public 绝对路径，游戏正文图片使用各自目录内的相对路径。
- `prefers-reduced-motion` 和无 WebGL 降级。
- 浏览器控制台无错误。

当前没有自动化测试或 lint 脚本；`npm run build` 和浏览器回归是主要验证手段。

## 构建与部署

`docs/.vitepress/config.mjs` 中配置站点标题、语言、路由和输出目录：

- `cleanUrls: true` 使用无 `.html` 的干净 URL。
- 构建产物写入仓库的忽略目录。
- `srcExclude: ['home/**', 'games/README.md']` 阻止首页内容片段和游戏维护说明成为公开路由。
- GitHub Pages 使用 Actions 发布方式，正式域名在仓库 Pages 设置中配置。
- `sitemap.hostname` 使用正式域名 `https://ourselves.cv/`，并与 `SITE_BASE` 组合生成页面 URL。

正式站点使用根域名 `https://ourselves.cv/`，构建时设置 `SITE_BASE=/`。如以后临时使用项目页地址，再通过 `SITE_BASE` 注入仓库路径：

```bash
SITE_BASE=/yuanxing-website/ npm run build
```

PowerShell：

```powershell
$env:SITE_BASE='/yuanxing-website/'
npm run build
```

`SITE_BASE` 会自动用于 VitePress base、favicon、首页判定、导航和游戏路由。部署后重新检查：

- 品牌 LOGO、封面和背景图路径。
- `sitemap.xml` 中的正式域名、基础路径和游戏路由。
- 游戏详情页直接访问。
- 导航链接和共享元素动画。
- Three.js 材质和静态资源请求。
- 浏览器后退和首页章节恢复。

## 相关文档

- [首页内容说明](./docs/home/README.md)：首页内容和图片排版说明。
- [游戏内容说明](./docs/games/README.md)：游戏字段、正文图片和排版说明。
