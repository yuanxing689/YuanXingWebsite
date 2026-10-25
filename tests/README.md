# 单元与浏览器回归测试

本项目使用 Node.js 内置 `node:test` 与 Playwright，不额外引入 Vitest。测试使用现有语义角色、ARIA、稳定类名和只读开发诊断，不要求业务组件增加 `data-testid`。

## 覆盖范围

### 导航与恢复契约

- 导航意图的 push/replace、共享元素和恢复策略。
- 导航上下文阶段迁移、新事务失效和旧异步步骤退出。
- `popstate` 历史遍历先于 VitePress 建立上下文。
- 同一遍历最多桥接一次，桥接前后 URL 与 `history.length` 不变。
- 桥接失败只执行一次无动画同 URL 提交。
- `HomeReturnSnapshot` 版本、hash、卡片键和滚动位置校验。
- 快照缺失、损坏、卡片失效时恢复游戏目录默认状态。

### 浏览器行为

- 首页、导航、三个首页区块和游戏轮播的基础渲染。
- 强制开场、跳过开场和同一标签页会话记录。
- 首页区块 URL、活动项、滚动落点和连续导航取消。
- 游戏卡片进入、显式“游戏目录”返回和浏览器后退。
- 连续后退只让最新事务恢复。
- 首页、详情与返回期间持久视觉层 DOM 身份不变。
- Three.js 只有一个持续循环，导航相位跨路由不回零。
- 主星 LOGO 与导航玻璃的静态交接。
- WebGL 正常与真实失败降级。
- 390px 手机、减少动态效果和不支持 View Transitions 的路径。
- 资源监听器、rAF 和定时器不跨路由累积。
- 常规路由流程无未捕获异常或 `console.error`。

### 视觉基准

`tests/e2e/visual.spec.js` 在 `?intro=off&motion=off` 且减少动态效果模式下采集：

- 桌面首页首页面、About、Games、Links、详情、品牌返回和 WebGL 降级。
- 手机首页首页面、About、Games、Links、详情和品牌返回。

Chromium 和 Edge 各维护独立快照。像素差异上限固定为 `0.1%`，不得通过更新基准图掩盖视觉回归。业务视觉改动若确实需要新基准，应单独提交并说明前后差异。

## 本地运行

```powershell
npm ci
npm run test:unit
npm run build
```

软件 Chromium 使用自定义浏览器缓存目录：

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='<browser-cache-dir>'
npm run test:e2e
```

硬件 Edge 使用系统安装版本：

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='<browser-cache-dir>'
$env:PLAYWRIGHT_BROWSER_CHANNEL='msedge'
npm run test:e2e
```

单文件或单用例调试：

```powershell
npx playwright test tests/e2e/history-navigation.spec.js
npx playwright test -g "连续后退"
npx playwright test --headed
```

Playwright 会自动在 `127.0.0.1:4173` 启动 VitePress 开发服务器，并在测试结束后关闭。失败 trace、截图和录屏保存在 `test-results/`；HTML 报告保存在 `playwright-report/`，两者均已忽略。

## 维护约定

- 失败时先判断产品缺陷、预期过时或环境不稳定，不要放宽断言或缩小测试范围。
- 常规回归使用 `?intro=off` 隔离开场；开场解锁由独立用例覆盖。
- 滚动补偿来自 `src/app/navigation/siteScroll.js`，测试与 VitePress 配置共用同一常量。
- 浏览器后退返回只由 `history-transition-bridge` 协调；共享元素断言必须同时核对 URL、`history.length`、转场次数和同文档状态。
- `window.__yuanxingCosmicDebug`、`__yuanxingRouterAdapterDebug` 和 `__yuanxingHistoryBridgeDebug` 只在开发环境提供只读诊断，生产构建不暴露。
- 不直接修改 `tests/e2e/visual.spec.js-snapshots/`。确需重建基准时，应确认需求明确要求视觉变化，并单独审查图片。
- `.screenshots/` 是临时人工调试目录，不属于自动化基准。

GitHub Actions 的 `Quality checks` 在 Windows runner 上执行构建、单元测试和完整 Chromium 回归，以保持视觉基准的操作系统渲染环境一致；失败时上传 trace、截图和录屏。
