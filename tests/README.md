# Playwright 浏览器回归测试

本目录提供 YuanXingWebsite 的浏览器交互回归测试。测试使用页面现有的语义角色、ARIA 状态和稳定类名，不要求业务组件添加 `data-testid`。

## 覆盖范围

- 首页、导航、三个首页区块和游戏轮播的基础渲染。
- 强制开场能够结束并解除输入锁。
- 首页区块导航的 URL、活动项与滚动落点。
- 快速连续区块导航的取消与最终状态。
- 游戏卡片进入、浏览器后退、活动卡片和横向位置恢复。
- “游戏目录”显式返回的单次 View Transition 与封面、标题、状态追踪。
- 连续快速后退后的路由与过渡状态。
- 手机宽度下的单行轮播和页面横向溢出。
- 重复路由切换后的轮播监听器、rAF 和定时器累积情况。
- 首页、详情与返回期间持久视觉层的 DOM 身份不变。
- Three.js 只有一个持续循环，导航相位跨路由不回零。
- 首页主星 LOGO 在导航玻璃出现前完成静态交接。
- 品牌按钮只触发一次整体视觉淡出淡入。
- WebGL 正常时不显示降级星，真实失败时显示三颗降级星。
- 直接访问详情、390px 手机和减少动态效果模式下的路由往返。

## 本地运行

```powershell
npm ci
npx playwright install chromium
npm run test:e2e:baseline
npm run test:e2e
```

Playwright 会自动在 `127.0.0.1:4173` 启动临时开发服务器，并在测试结束后关闭。调试时可使用：

```powershell
npx playwright test --headed
npx playwright show-report
```

如果本机已有 Edge，可在不下载 Playwright Chromium 的情况下临时验证：

```powershell
$env:PLAYWRIGHT_BROWSER_CHANNEL='msedge'
npm run test:e2e
```

失败时的 trace、截图和视频保存在 `test-results/`，HTML 报告保存在 `playwright-report/`，两者均已忽略提交。

## 维护约定

- 测试失败时先判断是产品缺陷、预期过时还是环境不稳定，不要直接放宽断言。
- 回归用例通过 `?intro=off` 隔离开场动画；开场解锁由独立用例覆盖。
- 滚动补偿来自 `src/navigation/siteScroll.js`，测试与 VitePress 配置共用同一常量。
- 资源审计只统计浏览器可观察的任务与轮播监听器，不等于逐一验证 Three.js 内部资源。
- `window.__yuanxingCosmicDebug` 只在开发环境提供只读帧与循环诊断，生产构建不暴露。

GitHub Actions 的 `Quality checks` 工作流会在推送和 Pull Request 时执行生产构建与完整浏览器回归；失败时自动上传 trace、截图和录屏。
