---
title: "Issue Nº 07 — One hundred small things"
order: 106
intro: '第七期 · 100 件 enrichment 的总账 · 从 13 篇精读到完整阅读环境'
issue_number: VII
issue_date: 2026 · Mid Summer
---

## 编辑前言

第六期讲机器人**身体**。这一期讲站点本身的"身体"。

156 篇笔记被读过的次数远比想象多——但读者反馈的问题大多不在论文内容里：他们不知道**从哪开始读、读到哪了、读完该跳哪**。这一年我把回答这三个问题的工具一件件加上去，今天累计 100 件。

不是 100 个大功能。是 100 件**小工具**。每件 5-50 行代码，每件解决一个具体卡点。

## 100 件小事的总账

> 完整 changelog 在 [/changelog/](/changelog/)，下面只列代表作。

### 路径与导航（让你知道从哪开始）

- [30 天学习路径](/learn/path/) — 每天读什么，前置依赖排好
- [新人 FAQ](/learn/faq/) — 12 题最常被问
- [5 套阅读包](/lists/) — 每包 50-90 分钟主题精选
- [Reading lists 进度条](/lists/) — 读完一篇包进度自动 +1
- [/random/](/random/) + 键盘 `r` — 随机抽签优先未读
- [/next/](/next/) 智能下一篇 — 基于已读主题分布推下一篇
- 每篇底部 prev/next 卡片 — 同主题 era 序列

### 视图（让你看到关系）

- [Compare](/compare/) — 同主题 era 并排对比
- [Timeline](/timeline/) — 2011→2025 演化时间线
- [Graph](/graph/) — D3 力导图 + 三种布局（Force/Cluster/Timeline）+ 节点搜索 + URL hash 状态
- [Heatmap](/heatmap/) — 21 tag 共现矩阵
- [Eras](/eras/founder/) — 祖师爷/经典/前沿三档
- [Venues](/venues/) — 37 会议按类别条形图
- [Stats](/stats/) — 5 维数据看板 + Top reads + 个人快照

### 个性化（让你看到自己）

- ✓ 标记已读 + 滚到底自动标 + olive toast 撤销
- 阅读 streak 🔥 + 今日/本周/本月计数
- 4 档里程碑徽章（Starter 10 / Reader 30 / Scholar 50 / Maven 100）
- 100% 完成度大徽章（mustard→coral 渐变）
- 阅读速度估算（基于实际计时）
- 已读清单 markdown 导出
- 主题/难度/era 三轴客户端快筛（URL hash 可分享）
- 论文页右下角阅读计时器 + 顶部进度条

### 单页增强（让你能复制能查能存）

- BibTeX 折叠块 + 一键复制
- ⧉ MD 复制 markdown 链接
- ⤴ 分享按钮（navigator.share + fallback）
- H2/H3 hover 显示 # 锚点 + 复制 deep link
- 代码块 hover ⧉ 复制
- 图片 lightbox 点击放大
- hover 内部论文链接显示 tldr 预览
- 88 篇笔记反向链接 "这些笔记也提到了它"
- 31 篇 "Featured in Issue Nº X" 徽章
- 论文页面包屑 Home › Topic › № N

### 数据公开（让别人能用）

- [/data/papers.json](/data/papers.json) — 156 篇全元数据
- [/data/papers.csv](/data/papers.csv) — R/Pandas 友好
- [/data/tags.json](/data/tags.json) — 21 tag + 共现矩阵
- [/data/topics.json](/data/topics.json) — 11 主题
- [/data/index.json](/data/index.json) — manifest
- 全部 CC BY 4.0 协议

### SEO + 可访问性（让搜索引擎和屏幕阅读器都看得到）

- OG + Twitter card meta
- JSON-LD Article + BreadcrumbList × 156
- /sitemap.xml 190+ URL
- /feed.xml Atom RSS
- /robots.txt
- /opensearch.xml — Chrome 地址栏可加为搜索引擎
- favicon.svg + webmanifest + theme-color
- skip-to-content 链接
- aria-current / aria-label 全站
- 12 个键盘快捷键（`?` 看完整列表）+ Cmd+K 全局搜索
- prefers-reduced-motion 支持
- @media print 干净打印样式

### 站点元数据

- /site-map/ 人可读站点地图（54 个入口分 7 段）
- /changelog/ 自动从 git log 生成
- /contributors/ 致谢原作者
- /quality/ 作者返工清单
- 资源体积 audit + HTML 大小检查（healthcheck 48 项 PASS）
- CI 集成 healthcheck（fail 时不上线）

### 离线支持

- PWA service worker
- 论文 + 图片 + 核心壳三种缓存策略
- 离线时已访问页面全部可读

## 最让我意外的指标

构建 156 静态页面（含 30+ 视图页 + 数据 API + sitemap）只用 **2.1 秒**。

dist 总大小 **116MB**，其中图片占 71MB（590 张 webp，平均 120KB）。

## 第七期之后

下一期想聚焦"内容深度"——回头给 13 篇精读做一次重写，参照过去几期总结出来的写作模式，让最初那 13 篇也享受到第三期"312 张内嵌插画 + 文字优化"的同等质量。

或者做一个"读者自己写笔记"的 fork-friendly 版本——任何人 fork 这站，能用同样的工具链发表自己的论文笔记集。

不知道。两个方向都有价值。

## 编后语

100 件小事。

如果你是某个研究方向的读者，希望这站让你少绕几个弯。如果你是工具/站点 builder，希望这 100 件 commit 能给你一些做法上的参考——它们都不大，但累加起来就是一个完整的阅读环境。

代码全开源 [MIT](https://github.com/estelledc/embodied-ai-reading-station)。笔记 CC BY 4.0。原论文版权归原作者。

---

*◼ End of Issue Nº VII.*
