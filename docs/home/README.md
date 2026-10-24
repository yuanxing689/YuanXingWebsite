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
2. 在 `src/composables/useSiteNavigation.js` 配置 `SECTION_POSITIONS`。
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

## 图片排版类

首页正文支持以下图片样式：

```md
![左对齐图片](/images/home/example.webp){.image-left}

![右对齐图片](/images/home/example.webp){.image-right}

![居中图片](/images/home/example.webp){.image-center}

![全宽图片](/images/home/example.webp){.image-full}

![左侧环绕图片](/images/home/example.webp){.image-left .image-wrap}

![右侧环绕图片](/images/home/example.webp){.image-right .image-wrap}
```

规则：

- `.image-left`：单独左对齐，最大宽度为正文宽度的 50%。
- `.image-right`：单独右对齐，最大宽度为正文宽度的 50%。
- `.image-center`：居中，最大宽度为 `720px`。
- `.image-full`：占满正文宽度。
- `.image-left .image-wrap`：桌面端左浮动，宽度为 `min(42%, 360px)`，正文环绕。
- `.image-right .image-wrap`：桌面端右浮动，正文环绕。
- 图片默认圆角为 `6px`。

### 停止环绕

在第一个不再环绕的段落添加 `.image-wrap-stop`：

```md
![左侧环绕图片](/images/home/example.webp){.image-left .image-wrap}

这段文字在图片右侧环绕。

从这段开始回到正常排版。
{.image-wrap-stop}
```

该段落及其后续内容会清除浮动。

### 两图并排

放在同一个段落中：

```md
![左图](/images/home/left.webp){.image-left}
![右图](/images/home/right.webp){.image-right}
```

两张图会自动排成两列。用空行拆成两个段落后，会各自独占一行。

### 带链接的图片

VitePress 会把 `{.image-left}` 等属性应用到外层链接，而不是内部 `<img>`。当前主题同时支持直接图片和链接图片：

```md
[![itch.io](/images/home/itch-io.webp)](https://example.com){.image-left}
[![X](/images/home/x.webp)](https://example.com){.image-right}
```

说明文字与图片组之间要留空行；两张图片之间不要留空行，否则双列会变成两行。

### 三图并排

三张图片使用专用网格，不要复用 `image-left`、`image-right` 或 `image-full`：

```md
[![itch.io](/images/home/itch-io.webp)](https://example.com)
[![X](/images/home/x.webp)](https://example.com)
[![Telegram](/images/home/telegram.webp)](https://example.com)
{.image-grid-3}
```

- 桌面端固定三列。
- 单图最大 `180×120px`，保持比例并垂直居中。
- 小于 `680px` 时仍保持三列，并缩小间距与图片高度。
- 链接图片的 `alt` 应写对应平台名称。

### 手机端

小于 `680px` 时：

- `.image-left` 和 `.image-right` 变为全宽。
- `.image-wrap` 自动取消浮动并变为全宽。
- 左右两图从双列变成上下排列。
- 三图网格保持横向三列，不会变成纵向长列表。

## 修改后检查

1. 运行 `npm run dev`。
2. 打开首页，检查对应 section 标题、导航文字和导航顺序。
3. 检查桌面与手机图片布局。
4. 运行 `npm run build`。

游戏 Markdown、游戏封面和游戏正文图片的完整规则见 [游戏 Markdown 维护说明](../games/README.md)。
