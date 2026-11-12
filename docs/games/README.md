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

当前仓库提供的两份规范样例：

| 页面 | 演示重点 |
| --- | --- |
| `roadsyettraveled` | 项目简介、右侧图文环绕和停止环绕。 |
| `UNDERHEAVEN` | 天堂下页面，演示全宽正文图片、列表和进度结构。 |

完整的 Markdown 排版样例（段落对齐、图文环绕、画廊和图标条）放在
`docs/fixtures/game-wiki-sample.md`，生产构建会排除，可直接复制其结构。

`draft: true` 只过滤首页游戏目录卡片，页面仍会正常构建并进入 sitemap。
不希望被搜索引擎收录的页面应放进 `docs/fixtures/`，而不是只靠 draft。

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

## 正文文字对齐

段落默认左对齐。需要居中或右对齐时，在段落内容后追加属性 class：

```md
居中的引文。{.text-center}

右对齐的署名。{.text-right}
```

支持 `text-left`、`text-center`、`text-right`。引用块也可以使用：

```md
> 引用中的居中段落。{.text-center}
```

不要在正文直接写 `<p style="text-align: ...">`。段落最后是链接、粗体等
行内元素时，把 `{.text-center}` 单独放到下一行，避免属性附着到该行内元素。

## 正文图片容器

图片组布局由 Markdown 容器决定，不再给单张图片追加
`image-left`、`image-right`、`image-wrap` 等布局类。

容器内只放图片，不要混入正文、图片说明或 caption。直接图片和链接图片
使用相同写法。布局分为单图块、多图流、固定画廊和图标条四类。

### 单图块

单图块不环绕文字，可选方向为 `left`、`right`、`center`、`full`：

```md
::: media-block center
![游戏截图](./images/screenshot-01.webp)
:::
```

```md
::: media-block full
![宽幅场景](./images/screenshot-02.webp)
:::
```

- `left`、`right` 最大宽度为正文的 `50%`。
- `center` 最大宽度为 `720px`。
- `full` 占满正文宽度。
- 图片默认带 `6px` 圆角。

### 多图流与自由分行

`media-flow` 支持 `left`、`right`、`full`。`left`、`right` 在桌面端
让正文环绕整个图片组，`full` 保持正文全宽。

同一段落中的图片会自动等宽并排，空行开始新的图片行：

```md
::: media-flow right
![角色立绘](./images/character-01.webp)

![表情一](./images/character-02.webp)
![表情二](./images/character-03.webp)
:::

这段正文会环绕在图片组左侧。图片组由“一行一张、一行两张”组成。
```

每行放置几张图片由该段落的图片数决定，不限制为固定两列或三列。需要
纵向排列时，在每张图片之间保留空行。组内间距由主题统一控制，不需要给
单张图片设置 margin。

侧栏宽度为 `min(42%, 360px)`。手机端取消浮动，但保留作者声明的分行方式。

### 停止环绕

后续标题会自动清除浮动。如果正文中间需要提前停止环绕，在第一个不再环绕
的段落末尾添加 `{.media-stop}`：

```md
这一段仍在图片旁边。

从这一段开始恢复正文全宽
{.media-stop}
```

### 固定画廊

`media-grid` 支持 `2`、`3`、`4`，适合所有图片应等宽排列的内容画廊：

```md
::: media-grid 3
![场景一](./images/scene-01.webp)
![场景二](./images/scene-02.webp)
![场景三](./images/scene-03.webp)
:::
```

- 图片始终填满各自列宽。
- 段落空行不会形成独立图片行，所有图片按固定列数自动换行。
- 小于 `680px` 时，`2`、`3`、`4` 列都改为单列。

### 平台图标

社交链接、平台徽标等紧凑内容使用 `media-strip`，支持 `1`、`2`、`3`、`4`：

```md
::: media-strip 3
[![itch.io](/images/home/itch-io.webp)](https://example.com)
[![X](/images/home/x.webp)](https://example.com)
[![Discord](/images/home/discord.webp)](https://example.com)
:::
```

- 单图最大 `180×120px`，保持比例并居中。
- 手机端保持声明的 `1/2/3/4` 列，不自动折到下一行。
- 手机端会缩小间距和图片高度，避免横向溢出。
- 链接图片的 `alt` 应写对应平台名称。

### 手机端行为

屏幕宽度小于 `680px` 时：

- `media-block left/right` 自动取消半栏宽度。
- `media-flow left/right` 取消浮动，但行内图片仍按段落并排。
- `media-grid 2/3/4` 自动改为单列。
- `media-strip 1/2/3/4` 保持各自列数并排显示。

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
