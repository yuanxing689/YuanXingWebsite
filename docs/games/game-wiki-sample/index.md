---
type: game
id: game-wiki-sample
title: 游戏 Wiki 排版样例
description: 展示游戏字段、正文层级和图片排版的标准样例。
status: planned
order: 30
cover: /images/games/YXLB.webp
draft: true
---

> 这是一个专门用于展示 Markdown 排版的样例页面，可以复制其结构后再替换正式内容。

## 段落对齐

默认使用左对齐。

左对齐段落。{.text-left}

居中对齐段落。{.text-center}

右对齐段落。{.text-right}

> 引用中的居中段落。{.text-center}

## 图文环绕与自由分行

`media-flow` 中，同一段落的图片并排，空行开始新的图片行。

::: media-flow right
![YXLB 素材](./images/YXLB.webp)

![YXLB 素材](./images/YXLB.webp)
![YXLB 素材](./images/YXLB.webp)
:::

这段正文会环绕在图片列左侧。上面的图片组由“一张、两张”两行组成。

这一段仍然按普通段落排版。

从这一段开始恢复正文全宽
{.media-stop}

## 双图对照

使用双列图片组展示同一类内容。

::: media-grid 2
![YXLB 素材](./images/YXLB.webp)
![YXLB 素材](./images/YXLB.webp)
:::

两列图片下方继续使用普通正文。

## 三图与四图画廊

固定画廊保持等宽列，不限制为图标尺寸。

::: media-grid 3
![YXLB 素材](./images/YXLB.webp)
![YXLB 素材](./images/YXLB.webp)
![YXLB 素材](./images/YXLB.webp)
:::

::: media-grid 4
![YXLB 素材](./images/YXLB.webp)
![YXLB 素材](./images/YXLB.webp)
![YXLB 素材](./images/YXLB.webp)
![YXLB 素材](./images/YXLB.webp)
:::

## 居中图片

单张图片可以使用居中布局，最大宽度为 `720px`。

::: media-block center
![居中素材](./images/YXLB.webp)
:::

## 全宽图片

需要强调横向截图时，可以使用全宽布局。

::: media-block full
![全宽封面](./images/YXLB.webp)
:::

## 平台图标

图标链接使用紧凑的 `media-strip`，与内容画廊分开。

::: media-strip 3
[![itch.io](/images/home/itch-io.webp)](https://example.com)
[![X](/images/home/x.webp)](https://example.com)
[![Discord](/images/home/discord.webp)](https://example.com)
:::

需要四枚图标时使用 `media-strip 4`：

::: media-strip 4
[![itch.io](/images/home/itch-io.webp)](https://example.com)
[![X](/images/home/x.webp)](https://example.com)
[![Telegram](/images/home/telegram.webp)](https://example.com)
[![Discord](/images/home/discord.webp)](https://example.com)
:::

两枚或一枚图标时使用对应列数：

::: media-strip 2
[![itch.io](/images/home/itch-io.webp)](https://example.com)
[![X](/images/home/x.webp)](https://example.com)
:::

::: media-strip 1
[![Discord](/images/home/discord.webp)](https://example.com)
:::

## 内容结构

- 一级内容使用 `##`。
- 子内容使用 `###`。
- 图片组合使用 `media-block`、`media-flow`、`media-grid` 或 `media-strip`。
- 不要在正文重复游戏名和汉化状态。
