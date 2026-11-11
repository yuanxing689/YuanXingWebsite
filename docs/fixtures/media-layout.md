---
type: game
id: e2e-media-layout-fixture
title: 自动化排版样例
description: 仅供浏览器回归使用的媒体和排版夹具。
status: planned
order: 9999
cover: /images/games/YXLB.webp
draft: true
---

> 此页面只用于自动化测试，生产构建会排除。

## 排版基线

你是否认为自己能改变这个世界？测试正文使用与正式页面相同的主题排版。

### 三级标题

正文和标题样式由主题统一提供。

## 段落对齐

左对齐段落。{.text-left}

居中对齐段落。{.text-center}

右对齐段落。{.text-right}

> 引用中的居中段落。{.text-center}

## 自由分行

::: media-flow right
![测试图片](/images/games/YXLB.webp)

![测试图片](/images/games/YXLB.webp)
![测试图片](/images/games/YXLB.webp)
:::

这段正文会环绕在图片组左侧。

从这一段开始恢复正文全宽
{.media-stop}

## 纵向图片流

::: media-flow right
![测试图片](/images/games/YXLB.webp)

![测试图片](/images/games/YXLB.webp)

![测试图片](/images/games/YXLB.webp)
:::

## 固定画廊

::: media-grid 2
![测试图片](/images/games/YXLB.webp)
![测试图片](/images/games/YXLB.webp)
:::

::: media-grid 3
![测试图片](/images/games/YXLB.webp)
![测试图片](/images/games/YXLB.webp)
![测试图片](/images/games/YXLB.webp)
:::

::: media-grid 4
![测试图片](/images/games/YXLB.webp)
![测试图片](/images/games/YXLB.webp)
![测试图片](/images/games/YXLB.webp)
![测试图片](/images/games/YXLB.webp)
:::

## 单图块

::: media-block center
![测试图片](/images/games/YXLB.webp)
:::

::: media-block full
![测试图片](/images/games/YXLB.webp)
:::

## 图标条

::: media-strip 1
[![itch.io](/images/home/itch-io.webp)](https://example.com)
:::

::: media-strip 2
[![itch.io](/images/home/itch-io.webp)](https://example.com)
[![X](/images/home/x.webp)](https://example.com)
:::

::: media-strip 3
[![itch.io](/images/home/itch-io.webp)](https://example.com)
[![X](/images/home/x.webp)](https://example.com)
[![Discord](/images/home/discord.webp)](https://example.com)
:::

::: media-strip 4
[![itch.io](/images/home/itch-io.webp)](https://example.com)
[![X](/images/home/x.webp)](https://example.com)
[![Telegram](/images/home/telegram.webp)](https://example.com)
[![Discord](/images/home/discord.webp)](https://example.com)
:::
