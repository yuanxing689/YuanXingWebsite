# 游戏 Markdown 维护说明

每个游戏是 `docs/games/` 下的一个独立目录：

```text
docs/games/
  example-game/
    index.md
    images/
      screenshot-01.webp
      screenshot-02.webp
```

构建后的默认路由为 `/games/example-game/`。目录名建议使用稳定、可分享的 ASCII slug。

当前仓库提供的三份规范样例：

| 页面 | 演示重点 |
| --- | --- |
| `roadsyettraveled` | 项目简介、右侧图文环绕和停止环绕。 |
| `roadsyettraveled2` | 全宽正文图片、列表和进度结构。 |
| `game-wiki-sample` | 双图并排、居中图片和全宽图片。 |

其他带“副本”字样的目录仅保留为本地测试页，已设置 `draft: true`，不会出现在首页游戏目录。

## Frontmatter 字段

游戏页面必须在顶部提供 frontmatter：

```yaml
---
type: game
id: example-game
title: 示例游戏
description: 一句话介绍这个游戏。
status: translating
order: 20
cover: /images/games/example-game.webp
draft: false
---
```

| 字段 | 必填 | 作用 |
| --- | --- | --- |
| `type` | 是 | 必须是 `game`，否则不会进入首页游戏目录。 |
| `id` | 是 | 全站唯一标识，用于导航状态、共享元素和后续数据关联。 |
| `title` | 是 | 首页卡片、详情页头部和浏览器标题使用的游戏名称。 |
| `description` | 建议 | 游戏简介；数据加载器会保留该字段。 |
| `status` | 建议 | 汉化状态，映射为页面显示文字。 |
| `order` | 是 | 游戏卡片顺序，数值越小越靠前；建议使用 `10`、`20`、`30`。 |
| `cover` | 可选 | 游戏封面站点绝对路径；缺失时显示星形占位。 |
| `draft` | 是 | `true` 时不会进入首页游戏目录，也不会作为正式卡片展示。 |

### `status` 可选值

| 值 | 显示文字 |
| --- | --- |
| `planned` | 计划中 |
| `translating` | 汉化中 |
| `released` | 已发布 |
| `paused` | 暂停 |

无法识别的值会原样显示；缺失时显示“状态待补充”。

### `id` 和 `order` 的维护规则

- `id` 必须全站唯一，不要多个游戏共用同一个 id。
- `order` 应使用唯一数值。相同 `order` 时会按标题排序，不适合精确控制顺序。
- 游戏 URL 由目录名决定，不建议为已经发布的作品修改目录名。
- 测试副本、备份目录和未完成页面应设置 `draft: true`。

## 正文怎么写

封面、标题和状态由 frontmatter 自动生成，正文只写内容：

```md
---
type: game
id: example-game
title: 示例游戏
description: 一句话介绍这个游戏。
status: translating
order: 20
cover: /images/games/example-game.webp
draft: false
---

这里开始写游戏介绍、汉化说明和 Wiki 内容。

## 游戏信息

- 开发商：示例
- 类型：冒险

## 汉化进度

正文内容。
```

注意：

- 不要在正文开头重复写 `# 游戏名`。
- 不要重复写“汉化状态：汉化中”，状态已经由 frontmatter 显示。
- 正文可以从段落、列表或 `##` 二级标题开始。
- 内部链接使用 VitePress 路径，例如 `/games/other-game/`。
- 外部链接使用完整 URL。
- 不写未审核的脚本、iframe 或任意 HTML。

## 图片放在哪里

### 游戏封面

封面会同时用于首页卡片和详情页顶部，必须能承受 `1920 / 1080` 的横版裁切。

放到：

```text
docs/public/images/games/
```

例如：

```text
docs/public/images/games/example-game.webp
```

Frontmatter 使用站点绝对路径：

```yaml
cover: /images/games/example-game.webp
```

建议：

- 尺寸至少 `1920×1080`。
- 使用 WebP 或 AVIF。
- 文件名为 ASCII slug。
- 主体尽量避开最底部，因为名称、状态和渐变会覆盖在那里。

没有 `cover` 时，首页卡片和详情页都会显示星形占位。

### 正文图片

正文截图放在游戏目录自己的 `images/` 中：

```text
docs/games/example-game/images/screenshot-01.webp
```

Markdown 使用相对路径：

```md
![游戏截图](./images/screenshot-01.webp)
```

这样图片会跟随当前游戏目录，复制或重命名游戏路由时更容易维护。

不建议把正文截图全部放进 `docs/public/`；只有需要多个页面共享的图片才放到 public。

## 图片排版类

VitePress 支持在 Markdown 图片后追加 CSS 类。当前主题提供以下布局。

### 默认图片

```md
![游戏截图](./images/screenshot-01.webp)
```

默认显示为块级图片，最大宽度不超过正文，宽度不足时保持原尺寸。

### 左对齐

```md
![游戏截图](./images/screenshot-01.webp){.image-left}
```

- 单独左对齐。
- 最大宽度为正文的 `50%`。
- 不环绕正文。

### 右对齐

```md
![游戏截图](./images/screenshot-01.webp){.image-right}
```

- 单独右对齐。
- 最大宽度为正文的 `50%`。
- 不环绕正文。

### 居中

```md
![游戏截图](./images/screenshot-01.webp){.image-center}
```

- 单图居中。
- 最大宽度为 `720px`。

### 全宽

```md
![游戏截图](./images/screenshot-01.webp){.image-full}
```

- 占满正文宽度。
- 适合宽幅截图和场景展示。

### 左侧环绕

```md
![游戏截图](./images/screenshot-01.webp){.image-left .image-wrap}

这段文字会环绕在图片右侧。
```

- 桌面端左浮动。
- 图片宽度为 `min(42%, 360px)`。
- 默认右间距 `1.5rem`，下间距 `1rem`。

### 右侧环绕

```md
![游戏截图](./images/screenshot-01.webp){.image-right .image-wrap}

这段文字会环绕在图片左侧。
```

- 桌面端右浮动。
- 图片宽度为 `min(42%, 360px)`。

### 停止环绕

在第一个不再环绕的段落末尾添加 `{.image-wrap-stop}`：

```md
![左侧截图](./images/screenshot-01.webp){.image-left .image-wrap}

这一段仍然环绕。

从这一段开始停止环绕
{.image-wrap-stop}

后续正文在图片下方正常排版。
```

`image-wrap-stop` 会清除图片浮动。

### 两张图并排

同一个 Markdown 段落中放入左右两张图：

```md
![左图](./images/left.webp){.image-left}
![右图](./images/right.webp){.image-right}
```

两张图会排成两列。中间用空行分开后，会变成上下两张独立图片。

### 带链接的图片

图片外层有链接时，布局类会应用到 `<a>`：

```md
[![商店截图](./images/store.webp)](https://example.com){.image-left}
[![官网截图](./images/site.webp)](https://example.com){.image-right}
```

主题会约束链接宽度并让内部图片自适应。说明文字与图片组之间留一个空行，两张图片之间不要留空行。

### 三图并排

需要三列图片时使用专用网格：

```md
[![平台一](./images/platform-1.webp)](https://example.com)
[![平台二](./images/platform-2.webp)](https://example.com)
[![平台三](./images/platform-3.webp)](https://example.com)
{.image-grid-3}
```

桌面端与手机端都保持三列，单图最大 `180×120px`，手机端缩小间距与图片高度。不要用 `image-left` 和 `image-right` 拼出第三列。

### 手机端行为

屏幕宽度小于 `680px` 时：

- 左对齐和右对齐图片自动变为全宽。
- 环绕图片取消浮动，变为全宽上下排版。
- 两张并排图片自动改成上下排列。
- 三图网格保持横向三列。

图片默认带 `6px` 圆角。

## 新增游戏流程

1. 创建 `docs/games/<slug>/index.md`。
2. 创建 `docs/games/<slug>/images/` 并放入正文图片。
3. 把封面放到 `docs/public/images/games/`。
4. 填写唯一 `id`、唯一 `order` 和完整 frontmatter。
5. 正文从介绍开始，不重复标题和状态。
6. 运行 `npm run dev` 检查首页卡片和详情页。

## 发布前检查

- 游戏是否出现在首页游戏目录。
- 卡片顺序是否符合 `order`。
- 卡片标题和状态是否正确叠加在封面上。
- 封面是否为 `1920 / 1080` 横版构图。
- 点击卡片、点击“游戏目录”和浏览器后退动画是否正常。
- 直接访问游戏 URL 和刷新是否正常。
- 正文图片在桌面和手机上的布局是否正确。
- 运行 `npm run build` 是否通过。

首页 Markdown 和首页图片规则见 [首页 Markdown 维护说明](../home/README.md)。
