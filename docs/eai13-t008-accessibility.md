# EAI13-T008 无障碍验证记录

验证日期：2026-07-11

## 结论

More 导航的 disclosure 合同、Chromium 原生键盘路径、root/repo base、320/375/768/desktop 响应式布局与 reduced-motion 均为 `PASS`。真实读屏组合按运行环境如实保留状态，不以 DOM 或 Chromium Accessibility Tree 冒充人工读屏结果。

| 运行时 | 状态 | 证据边界 |
|---|---|---|
| 系统 Chrome + 原生 Playwright 键盘 | `PASS` | Enter、Space、Tab、Shift+Tab、Escape、焦点返回、隐藏链接跳过 |
| Codex in-app Chromium + Accessibility Tree | `PASS` | role=`button`、名称包含可见 `More`、expanded 同步、无 `hasPopup`、折叠时 17 个链接退出 AX tree |
| VoiceOver + Safari | `UNVERIFIED_RUNTIME` | 本轮未启动真实 VoiceOver 会话；Chromium AX 结果不能替代 Safari/VoiceOver |
| NVDA + Firefox | `UNVERIFIED_RUNTIME` | 当前没有 Windows/NVDA 运行环境 |

## 键盘与焦点

- Enter：折叠 → 展开；再次 Enter → 折叠。
- Space：折叠 → 展开，且按钮保持焦点。
- Tab：从触发器进入 `Timeline`；连续遍历 17 项后到 `About`。
- Shift+Tab：从首项回到触发器时保持展开；从组件离开后自动折叠且不抢外部焦点。
- Escape：从末项关闭面板，`hidden=true`、`aria-expanded=false`，焦点回到 More。
- 折叠后 Tab：直接进入搜索按钮，不会访问隐藏链接。
- repo base：首项为 `/embodied-ai-reading-station/timeline/`，同一键盘路径通过。

Enter/Space 使用系统 Chrome 的原生键盘事件复核；in-app Browser 的受限 `press` 接口不承担这两项证据。

## 响应式矩阵

| 视口 | 页面横向尺寸 | 展开面板 | 结果 |
|---|---|---|---|
| 320×568 | `320 / 320` | `280×284`，`scrollHeight=597`，in-flow | `PASS` |
| 375×667 | `375 / 375` | `335×333.5`，`scrollHeight=597`，in-flow | `PASS` |
| 768×768 | `768 / 768` | `706.56×384`，普通 resize 后仍展开 | `PASS` |
| 1200×800 | `1200 / 1200` | desktop absolute，right `851.77`、bottom `560.55` | `PASS` |
| repo 375×667 | `375 / 375` | base-aware 脚本与 17 个链接，面板不越界 | `PASS` |

320px 下触发器实际为约 `47.97×44` CSS px。紧凑视口中面板进入文档流，使用 `vh` + `dvh` 高度上限和内部滚动；没有在 `html`/`body` 上用 `overflow-x:hidden` 掩盖页面级溢出。

## Reduced motion 与联合抽样

- `prefers-reduced-motion: reduce` 命中；More trigger/panel 的 computed transition duration 为 `0.01ms`，开合无强制动画。
- 首页 24 个 quick-filter 均为原生 `button type="button"`、`tabIndex=0`、非 disabled。
- Compare 表格在 1200px 有可聚焦链接；320px 下页面 `scrollWidth === clientWidth === 320`，首表保留 21 个可聚焦链接。
- root/repo 构建健康检查均覆盖 CSP、资源路径与 Service Worker 核心壳中的 `more-nav.js`。

## 自动化合同

- `more-nav.test.mjs`：初态修复、状态同步、Escape、外部 focus/click、pageshow、缺失 DOM 安全退出。
- `mobile-nav.test.mjs`：无 hover/focus-only 开关、44px 目标、非颜色当前态、in-flow 断点、滚动上限和内描边焦点环。
- `sw.test.mjs` / `check.mjs`：`more-nav.js` 必须复制并进入 root/repo 核心壳。

真实 VoiceOver/Safari 与 NVDA/Firefox 仍需在对应运行时补做人工朗读与虚拟光标验收；在此之前不得把两项状态改写为 `PASS`。
