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

浏览器回归测试：

```bash
npx playwright install chromium
npm run test:unit
npm run test:e2e:baseline
npm run test:e2e
```

硬件 Edge 使用系统已安装浏览器：

```powershell
$env:PLAYWRIGHT_BROWSER_CHANNEL='msedge'
npm run test:e2e
```

测试说明见 [`tests/README.md`](./tests/README.md)。

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
│  ├─ app/
│  │  ├─ runtime/                  # 应用组合服务与启动参数
│  │  ├─ navigation/               # 意图、策略、Adapter、历史桥接与协调器
│  │  └─ transitions/              # 转场编排及原生/CSS 驱动
│  ├─ components/chrome/           # 持久导航 DOM、品牌、字标与背景
│  ├─ features/
│  │  ├─ home/                     # 首页状态、滚动、开场、恢复和组件
│  │  └─ games/                    # 轮播、卡片、详情页与游戏状态
│  ├─ visuals/cosmos/              # 唯一 Three.js 循环、场景和材质
│  └─ styles/                      # 全局样式
├─ tests/
│  ├─ unit/                        # node --test 纯逻辑契约测试
│  └─ e2e/                         # Playwright 浏览器与视觉回归
└─ playwright.config.js            # Playwright 测试服务器与浏览器配置
```

构建缓存和 `.screenshots/` 调试输出不应提交。`tests/e2e/visual.spec.js-snapshots/` 是有意维护的重构前后视觉基准，只能由基线提交生成，不能为通过测试而更新。

## 页面架构

### Layout

`docs/.vitepress/theme/Layout.vue` 只创建应用组合服务并声明页面结构，负责：

- 首页和游戏详情页切换。
- 首页正文、文章正文和语义标题。
- 游戏详情页的 frontmatter 头部注入。
- 向 `PersistentSiteChrome.vue` 注入应用服务提供的页面状态。

具体职责已拆分到：

- `app/runtime/useSiteApplication.js`：创建首页、开场、历史和导航服务。
- `app/navigation/navigationIntent.js`：集中生成目标、历史、转场和恢复策略。
- `app/navigation/vitePressRouterAdapter.js`：统一 Router 钩子与历史遍历上下文。
- `app/navigation/navigationCoordinator.js`：在目标确定后执行一次路由提交。
- `app/navigation/historyTransitionBridge.js`：隔离浏览器后退的同 URL 单次桥接。
- `app/transitions/transitionOrchestrator.js`：只负责 View Transition、CSS 降级、超时和清理。
- `features/home/state/useHomePageState.js`：唯一的首页滚动、视口、活动区块和待完成目标来源。
- `features/home/restoration/homeRestorationService.js`：统一恢复区块、卡片和最终滚动位置。
- `app/navigation/sitePaths.js`：站内路径、站点 base 和浏览器最终地址的唯一转换入口。
- `components/chrome/brandGeometry.js`：品牌 LOGO、锚点和字标的纯几何计算。
- `app/runtime/bootParams.js`：冻结首次加载的 `intro`、`motion` 和 `view` 参数。

`Layout` 不直接组合品牌、字标、背景、导航 DOM、WebGL 画布或导航事务。新增页面内容功能时，不应把持久视觉逻辑重新放回组合根。

### 持久视觉层

`src/components/chrome/PersistentSiteChrome.vue` 常驻 Layout，一次挂载后跨路由保持同一批 DOM：

- `SpaceBackdrop.vue`：固定星空背景。
- `SiteBrandButton.vue`：唯一品牌入口、手机品牌玻璃和静态 LOGO。
- `BrandWordmark.vue`：唯一视觉字标，不做首页/详情双实例。
- `SiteNavigation.vue`：导航文字、毛玻璃和 WebGL 失败降级星。
- 两个 WebGL canvas：正文下层首页主星，正文上层导航星。

职责边界：

- `useSiteNavigation.js` 只生成一套 DOM 与 Three.js 共用的归一化导航坐标。
- `usePersistentCosmicScenes.js` 管理两块画布的场景生命周期、首帧 readiness、预绘制和销毁。
- `logoScene.js` 只拥有首页主星场景，不创建 RAF，也不持有导航星。
- `navigationScene.js` 只拥有常驻导航星场景、尺寸和单帧绘制。
- `cosmicLoop.js` 是唯一持续 Three.js 调度器，同一帧依次驱动开场引擎、主星和导航星。
- `cosmicRuntime.js`、`navigationStars.js` 和 `logoBloom.js` 继续提供共享渲染能力。

主星场景离开首页时暂停绘制但保留资源；导航星场景始终活动。全站最多只有一个 Three.js 持续 RAF。不要在场景模块中新增独立循环。

SwiftShader、llvmpipe 等软件 WebGL 环境使用较低像素比并跳过昂贵的 Bloom 后处理，保留星空、导航和交互能力；硬件 GPU 继续使用完整 Bloom 和原始视觉质量。

导航玻璃出现前，首页主星 LOGO 先淡出并交给毛玻璃上方的唯一静态 LOGO。品牌按钮触发时，导航文字、两颗星画布、玻璃、品牌区和字标使用同一视觉透明度整体淡出淡入，背景不参与。

进入首页的路由过渡会先在 View Transition 回调之外预激活并绘制主星。不要在 View Transition 更新回调里等待 rAF 首帧，否则会形成提交死锁。

### 首页

首页 section 组件位于 `src/features/home/components/`，文案来源是：

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

- `GameCarouselCard.vue` 负责源卡片、返回快照和点击拦截。
- `GameArticleHero.vue` 提供详情页目标元素。
- `gameCarouselState.js` 保存稳定卡片键，并在 Vue 挂载 flush 内同步恢复轮播。
- `navigationCoordinator.js` 协调普通卡片进入、显式返回和浏览器后退。
- `transitionOrchestrator.js` 统一 520ms 原生共享元素节奏、140ms CSS 降级和 3 秒超时。
- `historyTransitionBridge.js` 只在详情后退回首页时对当前同一 URL 提交一次。

不支持 View Transitions 的浏览器会使用淡出淡入。减少动态效果模式下直接切页。

导航链接由站点处理器接管，避免 VitePress 在进入首页前抢先执行 hash 滚动。“游戏目录”、其他首页锚点、首页内部导航和滚轮吸附共享同一套导航偏移落点。普通路由离场只淡出正文内容；品牌按钮是唯一会让整个导航视觉层整体淡出淡入的操作。

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

当前游戏返回快照保存在 `sessionStorage`，包含版本、首页 hash、稳定卡片键和可选滚动位置。缺失、损坏、旧版本或卡片失效时回到游戏目录默认位置。若调试时状态异常，可清除：

```text
yuanxing:home-return
yuanxing:intro-seen
```

### 动画与滚动

- 页面章节使用可取消的自定义对齐，不使用原生 Scroll Snap。
- 浏览器滚动恢复设为手动模式；返回更新回调只执行路由提交、Vue DOM flush 和同步恢复。
- 导航、区块滚动和自动吸附使用同一套 `scrollOffset + padding-top` 落点。
- 页面离场只淡出内容层，持久导航视觉和背景不卸载。
- 导航路由返回前预绘制首页主星，再启动 View Transition。
- 浏览器后退桥接前后校验 URL 和 `history.length`；同一遍历最多桥接一次。
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
- 首页、详情和返回过程中主星 canvas、导航 canvas、玻璃、品牌、字标和导航 DOM 身份不变。
- Three.js 诊断状态只有一个持续调度器，导航相位在路由前后单调增长。
- 主星 LOGO 在导航玻璃出现前完成与静态 LOGO 的交接。
- 品牌按钮只触发一次整体视觉淡出淡入。
- 导航返回后不再出现自动吸附造成的二次位移。
- 首页封面使用 public 绝对路径，游戏正文图片使用各自目录内的相对路径。
- `prefers-reduced-motion` 和无 WebGL 降级。
- 浏览器控制台无错误。

自动化质量检查包括 `npm run test:unit`、`npm run test:e2e` 和 `npm run build`。Playwright 覆盖首页渲染、开场解锁、区块导航、游戏卡片返回、严格历史桥接、缺失/损坏快照、连续后退、390px 手机、资源清理、持久 DOM 身份、单渲染循环、品牌交接、CSS 降级和 WebGL 降级。视觉用例以不超过 `0.1%` 像素差异比较桌面与手机关键状态。当前仍没有独立 lint 或格式化脚本。

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
