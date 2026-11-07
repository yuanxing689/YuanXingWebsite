# 首页 Markdown 维护说明

本目录保存首页三个 section 的文案源。它们不会生成独立页面，而是在构建期由 `docs/.vitepress/data/home.data.js` 读取并渲染到首页。

当前文件：

| 文件 | 固定 id | 对应组件 | 用途 |
| --- | --- | --- | --- |
| `about.md` | `about` | `HomeAboutSection` | 汉化组介绍 |
| `games.md` | `games` | `HomeGamesSection` | 游戏目录引导文案 |
| `links.md` | `links` | `HomeLinksSection` | 社交链接 |

## Frontmatter 字段

每个文件顶部必须有 frontmatter：

```yaml
---
id: about
title: 元星联邦汉化组
navLabel: 关于我们
order: 10
---
```

| 字段 | 必填 | 作用 |
| --- | --- | --- |
| `id` | 是 | 首页锚点和组件关联键；当前只支持 `about`、`games`、`links`。 |
| `title` | 建议 | section 的二级标题，由 `HomeSection` 渲染。 |
| `navLabel` | 可选 | 导航栏文字；缺失时使用 `title`，再缺失时使用 `id`。 |
| `order` | 可选 | section 顺序，数值越小越靠前；缺失时按 `999` 处理。 |

### `id` 不要随意修改

`id` 同时被以下位置使用：

- 首页锚点，例如 `/#about`。
- 首页组件映射，例如 `about → HomeAboutSection`。
- 导航星散落位置和导航链接。

如果要新增一个 section，只新建 Markdown 不够，还需要同时：

1. 在 `docs/index.md` 注册对应 section 组件。
2. 在 `src/components/chrome/useSiteNavigation.js` 配置 `SECTION_POSITIONS`。
3. 检查桌面和手机章节布局。

## 正文怎么写

- 正文直接写普通 Markdown。
- 不要再写二级标题 `##`，section 标题由 `title` 生成。
- 可以使用三级标题 `###`、段落、列表、引用、粗体和普通链接。
- 首页内部链接使用 `/#games` 这类锚点；外部链接写完整 URL。
- 不写脚本、iframe 或未经审核的 HTML。

`about.md` 示例：

```md
---
id: about
title: 元星联邦汉化组
navLabel: 关于我们
order: 10
---

我们出于对翻译的纯粹热爱而提供翻译服务。

### 关于我们

这里继续写介绍正文。
```

`games.md` 只负责游戏目录标题和引导文案。游戏卡片来自 `docs/games/`，不要在首页手动维护卡片列表。

`links.md` 使用普通 Markdown 链接或列表：

```md
---
id: links
title: 社交链接
navLabel: 社交链接
order: 30
---

- [QQ 群](https://example.com)
- [GitHub](https://github.com/example)
```

## 首页图片放哪里

首页图片统一放到 `docs/public/images/home/`：

```text
docs/
  public/
    images/
      home/
        team.webp
        activity.webp
```

Markdown 使用站点绝对路径：

```md
![汉化组成员](/images/home/team.webp)
```

这里的 `/images/...` 是站内规范路径，构建时由 Markdown 渲染配置自动追加 `SITE_BASE`；不要在内容中写部署目录。

不要使用相对于 `docs/home/` 的路径。`docs/home/**` 被 VitePress 排除为独立路由，首页图片通过 `docs/public/` 提供最稳定。

建议：

- 使用 WebP/AVIF。
- 文件名使用 ASCII slug。
- 为图片写清楚的 `alt`。
- 显示尺寸不超过实际需要的两倍。

## 图片布局容器

首页图片不再给单张图片追加布局类，而是用容器声明整个图片组的布局。
容器内只放图片；直接图片和链接图片使用同一套规则。

### 单图

```md
::: media-block center
![汉化组成员](/images/home/team.webp)
:::
```

`media-block` 支持 `left`、`right`、`center`、`full`。

### 单图或多图环绕

```md
::: media-stack left
![现场照片](/images/home/activity-01.webp)
![现场照片](/images/home/activity-02.webp)
:::

这段文字会环绕在图片组右侧。
```

`media-stack` 支持 `left`、`right`。桌面端浮动整个图片组，手机端取消浮动。

需要提前结束环绕时，在第一个恢复正常宽度的段落末尾添加：

```md
从这一段开始恢复正文全宽
{.media-stop}
```

### 两图与三图

```md
::: media-grid 2
![活动一](/images/home/activity-01.webp)
![活动二](/images/home/activity-02.webp)
:::
```

```md
::: media-grid 3
[![itch.io](/images/home/itch-io.webp)](https://example.com)
[![X](/images/home/x.webp)](https://example.com)
[![Telegram](/images/home/telegram.webp)](https://example.com)
:::
```

- `media-grid 2` 在桌面端两列，手机端单列。
- `media-grid 3` 在桌面和手机都保持三列，适合平台图标。
- 三列图片最大 `180×120px`，并保持比例。

## 修改后检查

1. 运行 `npm run dev`。
2. 打开首页，检查对应 section 标题、导航文字和导航顺序。
3. 检查桌面与手机图片布局。
4. 运行 `npm run build`。

游戏 Markdown、游戏封面和游戏正文图片的完整规则见 [游戏 Markdown 维护说明](../games/README.md)。
