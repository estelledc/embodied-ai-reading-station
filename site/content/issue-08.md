---
title: "Issue Nº 08 — The Guide"
order: 107
intro: '第八期 · 22 章导读上线 · 从论文笔记到系统知识体系'
issue_number: VIII
issue_date: 2026 · Late June
---

## 编辑前言

前七期做了 156 篇论文笔记、30+ 视图页、100 件小工具。读者能搜、能比、能追踪进度。

但一个问题始终没回答：**不知道从哪开始读。**

156 篇散装笔记就像一张被打散的拼图——每块都很好看，但你拿到手根本不知道先拼哪一块。30 天路径帮了一些忙，但它只能告诉你"顺序"，不能告诉你"为什么"。

这一期做的就是**把拼图的说明书写出来**。

## 22 章系统导读

[/guide/](/guide/) 现在是站点的一级入口，和 Index / Topics / Learn / Issues 并列。

22 章，六大部分，23,000+ 行，从"什么是具身智能"一路讲到"如何完成 VLA 微调实战任务"。面向零基础读者，用生活类比开头，再接技术机制，每章有代码示例和常见误区。

### Part 1: 导读总纲（Ch01-03）

回答三个前置问题：具身 AI 为什么重要？这份导读怎么读？需要什么前置知识？

- [Ch01: 为什么需要具身智能](/guide/ch01-why-embodied-ai/) — 从"帮我递水"讲起
- [Ch02: 阅读路线图](/guide/ch02-reading-paths/) — 三条路径任你选
- [Ch03: 前置知识检查清单](/guide/ch03-prerequisites/) — 数学和编程不够时怎么办

### Part 2: 全景概念（Ch04-07）

把 11 个主题方向串成一张完整的地图。

- [Ch04: 11 个主题全景图](/guide/ch04-landscape/) — 一个机器人的 11 个器官
- [Ch05: 两条技术路线](/guide/ch05-two-paradigms/) — 模块化流水线 vs 端到端一体化
- [Ch06: 时间线](/guide/ch06-timeline/) — 2021-2025 关键里程碑
- [Ch07: 怎么读论文](/guide/ch07-how-to-read-papers/) — 学术论文的结构与读法

### Part 3: 核心主线精读（Ch08-14）

从 CLIP 到 VLA 到 Diffusion Policy 到模仿学习——一步步造出机器人的大脑和手。

- [Ch08: CLIP](/guide/ch08-clip/) — 教 AI 同时认图和认字
- [Ch09: BLIP-2 到 LLaVA](/guide/ch09-blip2-llava/) — 给 AI 装上对话能力
- [Ch10: 高层规划](/guide/ch10-planning/) — SayCan / Code-as-Policies
- [Ch11: RT-1 / RT-2](/guide/ch11-rt1-rt2/) — 把动作变成 token
- [Ch12: OpenVLA / VLAS / MLA](/guide/ch12-openvla-vlas-mla/) — 开源与扩展
- [Ch13: Diffusion Policy](/guide/ch13-diffusion-policy/) — 像擦噪声一样擦出动作
- [Ch14: 模仿学习](/guide/ch14-imitation-learning/) — 你做给它看

### Part 4: 训练与部署基建（Ch15-17）

从训练到落地的三块基建。

- [Ch15: 世界模型](/guide/ch15-world-models/) — Dreamer / Genie / Cosmos
- [Ch16: 强化学习基础](/guide/ch16-rl-basics/) — PPO / SAC / Reward Shaping
- [Ch17: Sim-to-Real](/guide/ch17-sim-to-real/) — 仿真训练与真机部署

### Part 5: 感知模态扩展（Ch18-20）

给机器人装上更多感官。

- [Ch18: 多模态生态](/guide/ch18-multimodal/) — ImageBind / AnyMAL
- [Ch19: 射频感知](/guide/ch19-rf-perception/) — 用电磁波穿墙看东西
- [Ch20: 听觉智能](/guide/ch20-auditory/) — Whisper / Proactive Hearing

### Part 6: 横切主题与实战（Ch21-22）

数据从哪来？怎么交付任务？

- [Ch21: 数据集全景](/guide/ch21-datasets/) — Open X-Embodiment / DROID / BridgeData V2
- [Ch22: Task 实战指南](/guide/ch22-task-guide/) — 从理论到交付的完整路径

## 技术实现

导读集成到站点构建系统，不是外挂 iframe 或跳转到 GitHub 阅读原始 markdown。

做了这些事：

- `build.mjs` 新增 `discoverGuide()` / `buildGuideIndex()` / `buildGuidePage()` 三个构建函数（约 140 行）
- 章节间 `.md` 互引链接自动重写为 `/guide/<slug>/` 的 HTML 路径
- 每个章节页有前/后导航栏 + Part 标签 + 返回目录链接
- Guide 加入主导航栏、footer、sitemap、related views
- 修复 3 个历史死链（ch19-simulation / ch15-part2 / ch22-part2）
- 63 项 healthcheck 全部通过

构建 22 个章节页耗时约 100ms。

## 一个数字

这个站点现在有 **23,342 行导读 + 156 篇论文笔记**。前者解释"为什么"，后者解释"是什么"。

156 篇笔记是拼图碎片。22 章导读是拼图盒盖上的完成图。

## 第八期之后

导读写完了。站点的"内容层"基本到位。

接下来可能的方向：给导读章节加 Pagefind 索引让搜索能覆盖到；或者做一套交互式自测题嵌入每章末尾，让读者验证自己是否真的理解了。

不确定。先让这 22 章被读一读再说。

## 编后语

写导读比写论文笔记难得多。

论文笔记是"压缩"——把 20 页英文压成 300 行中文。导读是"展开"——把压缩后的 156 条知识点重新展开成一条完整的认知路径，让一个什么都不懂的人能沿着走到终点。

压缩靠技术。展开靠共情——你得一直记着"读者此刻还不知道这个词"。

这是我实习期间做的最大一件事。希望它有用。

---

*◼ End of Issue Nº VIII.*
