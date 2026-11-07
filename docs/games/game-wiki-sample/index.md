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

## 双图对照

使用双列图片组展示同一类内容。

::: media-grid 2
![未行之途封面](./images/未行之途.webp)
![YXLB 素材](./images/YXLB.webp)
:::

两列图片下方继续使用普通正文。

## 居中图片

单张图片可以使用居中布局，最大宽度为 `720px`。

::: media-block center
![居中素材](./images/YXLB.webp)
:::

## 全宽图片

需要强调横向截图时，可以使用全宽布局。

::: media-block full
![全宽封面](./images/未行之途.webp)
:::

## 内容结构

- 一级内容使用 `##`。
- 子内容使用 `###`。
- 图片组合使用 `media-block`、`media-stack` 或 `media-grid` 容器。
- 不要在正文重复游戏名和汉化状态。
