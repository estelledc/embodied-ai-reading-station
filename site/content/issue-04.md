---
title: "Issue Nº 04 — Tools for the long read"
order: 103
intro: '第四期 · 18 个工具 · 把单向读物变成有记忆的阅读伴侣'
issue_number: IV
issue_date: 2026 · Early Summer
---

## 编辑前言

第三期把每篇笔记变成图文并茂的小杂志。第四期问的是另一个问题：

> **当读者真的开始读 156 篇的时候，站点能给他什么？**

答案不是"更多内容"。答案是**工具**——记住读到哪、推荐下一篇、把抽象关系画出来、跨主题横切、让回头查更快。

第四期上线了 18 个这样的工具。

## 三个新视图

### Compare · 同主题对比页 [/compare/](/compare/)

把每个主题的论文按 era 排成横表：祖师爷 / 经典 / 前沿一目了然。

**为什么有用**：你想读 VLA 不知道从哪本开始，扫一眼这页，"祖师爷 RT-1 → 经典 RT-2 → 前沿 OpenVLA"，三秒决定。

### Timeline · 演化时间线 [/timeline/](/timeline/)

156 篇按年份倒序铺开，2011 到 2025。

**你会看到**：2017 之前几乎没有；2022 是 VLA 元年；2024 之后基础模型化（π0 / Cosmos / GR-2）和评测体系（DROID / BEHAVIOR-1K）双线并进。

### Graph · 力导关系图 [/graph/](/graph/)

D3 力导图把 156 篇按主题簇分布。同主题节点连成 era 链，跨主题的祖师爷们用 coral 虚线相连。

**怎么玩**：拖拽节点、滚轮缩放、双击切换标签、点 legend 高亮某主题。这页不是 SEO 也不是入口，纯粹给爱看可视化的人。

## 个性化：浏览器知道你读到哪了

### 标记已读 + ✓ 印章

每篇论文页右上角"标记已读"按钮。点了之后：
- 论文页按钮变绿色"✓ 已读"
- 首页对应卡片右上角盖一个 olive ✓ 圆章
- 首页 stats 仪表盘"你已读 N / 156"自动更新

### 阅读 streak 🔥

只要你**至少一天读一篇**，streak box 就会出现：连续天数 + 今日/本周/本月计数。3 天 🔥🔥，7 天 🔥🔥🔥。

### 下一篇推荐

算法很简单：
- **0 已读** → 推 CLIP（VLM 起点）
- **已读最多某主题** → 推同主题下一篇（按 era 升序）
- **都很均匀** → 推新主题的祖师爷

### 导出阅读清单

点 streak box 上的"↓ 导出"，下一份按 topic 分组的 markdown，含每篇标题/链接/读于哪天。

## 跨主题横切：tag 系统

主题是按"研究领域"分（VLA / Diffusion Policy / Multimodal）。**tag 是按"技术手段"分**——同一篇论文可能既是 #transformer 又是 #manipulation 又是 #language。

[/tags/](/tags/) 页面有 21 个 tag 的云图，按命中数倒序：transformer (45+) / VLA (30+) / 3D / language / RL / imitation / world-model / dataset / sim2real ...

每个 tag 单独一页，列出所有命中的论文。

## 工具栏：快筛 / 快键 / 暗色

### 首页主题/难度/era 三轴快筛

156 张卡片密密麻麻？打开筛选条：选一个 topic chip + 一个难度档 + 一个 era，立刻只剩你要的。URL 自带 hash（`#topic=vla&era=founder`），可分享。

### 12 个键盘快捷键

按 `?` 看完整帮助：
- `g h` 回首页 / `g t` 主题 / `g l` timeline / `g c` compare / `g x` graph / `g g` glossary
- `/` 唤起搜索 / `j` 下一篇 / `k` 上一篇 / `m` 切换"已读" / `Esc` 关弹窗

### 暗色模式（☀ ☾ ⊙）

masthead 末尾的太阳/月亮按钮三态循环：亮 / 暗 / 跟随系统。零 FOUC——`<head>` 内联早期 apply 脚本，CSS 加载前已打 class。

## 阅读体验细节

- **顶部 2px coral 阅读进度条**：滚到哪有数
- **H2/H3 hover 显示 #**：点击复制 deep link
- **prev/next 卡片**：每篇论文底部，同主题前一篇/后一篇
- **88 篇笔记反向链接**：每篇底部"这些笔记也提到了它"——CLIP 被 32 篇引、Diffusion Policy 被 47 篇引
- **可见面包屑**：Home › Topic › № N

## 面向引擎和分享

- **/feed.xml Atom**：3 期 issues + 最近 10 篇笔记
- **/sitemap.xml**：190 个 URL，给 Google
- **/robots.txt**：全开放
- **/404.html**：atelier-zero 404 而非 GitHub Pages 灰底
- **OG + Twitter meta**：分享到微信/X/Slack 显示卡片图（优先 inline scene）+ tldr 摘要
- **JSON-LD Article + BreadcrumbList**：Google rich results 显示文章卡 + 面包屑

## 工具表

| # | 工具 | 路径 |
|---|---|---|
| 1 | Compare | [/compare/](/compare/) |
| 2 | Timeline | [/timeline/](/timeline/) |
| 3 | Graph | [/graph/](/graph/) |
| 4 | Glossary | [/glossary/](/glossary/) |
| 5 | Tags | [/tags/](/tags/) |
| 6 | Math primer | [/learn/math-primer/](/learn/math-primer/) |
| 7 | 11 个主题深度页 | /topics/{id}/ |
| 8 | 已读 + ✓ 印章 + 计数 | 全站 |
| 9 | streak 🔥 + 导出 | 首页 |
| 10 | 下一篇推荐 | 首页 |
| 11 | 主题/难度/era 快筛 | 首页 |
| 12 | 键盘快捷键 + ? 帮助 | 全站 |
| 13 | 暗色模式 | 全站 |
| 14 | 进度条 | 论文页 |
| 15 | H2 anchor copy | 论文页 |
| 16 | prev/next 卡片 | 论文页 |
| 17 | 反向链接 | 论文页 |
| 18 | 面包屑 + JSON-LD | 论文页 |

## 编后语

第三期是给眼睛的；第四期是给手指的。

下一期可能聚焦"知识层"——比如把 156 篇里反复出现的概念做成一张概念地图，或者给每个 topic 写一段更深的"为什么这个领域出现"的导言。

如果你已经从这站读完几篇，又回来想"我读过哪几篇了？"——streak box 会告诉你答案。

---

*◼ End of Issue Nº IV.*
