# Embodied AI: Zero to One

> **从零开始学具身智能——22 章系统教程 + 156 篇论文笔记。**
> 零术语假设，日常类比起步。从 CLIP 到 π0，11 主题全景。

🌐 **[在线访问 →](https://estelledc.github.io/embodied-ai-reading-station/)**

---

## 这站是什么

具身智能（Embodied AI）= 让 AI 有身体地融入世界——看见、听懂、决定、动手。这站把 156 篇顶会论文（CoRL/RSS/NeurIPS/ICML/MobiCom/CVPR）翻译成入门读者也能跟下来的语言：

- ✅ 第一次出现的术语必有一句话定义 + 生活类比
- ✅ 公式后面必有人话翻译
- ✅ 平均每篇 4000 字，30 分钟读完
- ✅ 关键数字配生活语境（"13 万段示范" = "每天 8 小时连续示范 5 个月"）

### 内容质量说明

156 篇笔记**不是**同等深度——它们分三个层次：

| 层次 | 数量 | 标志 | 含义 |
|------|------|------|------|
| **deep-read** (深度精读) | 少量 | 站内标签"深度精读" | 有完整 deck / 逐段批注 / 导读章节覆盖，可作为汇报材料 |
| **auto-summary** (auto 摘要) | 46 篇 | 有本地 PDF 全文解析 + 人工校对 | 4000 字级别，含架构图、实验数据、踩坑提醒 |
| **auto-summary-light** (短摘要) | 110 篇 | 基于摘要 + 公开资料 | 1500-2500 字概览，未读全文，适合快速了解一篇论文在做什么 |

这站起源于导师布置的 **13 篇精读任务**（详见 [research-task.md](research-task.md)），扩展到 156 篇是为了看到全景。13 篇任务论文在站内标有 `task: required` 标记。

## 给读者

### 从这里开始

**根据你的目标选一条路径**：

1. **任务驱动**（有科研任务要交 / 6-30 截止）→ [research-task.md](research-task.md) 看 13 篇任务论文 → [22 章导读 Task 1 路径](guide/README.md)（Ch01→Ch03→Ch04→Ch08→Ch09→Ch10→Ch12→Ch22）→ [学习进度](progress.md)
2. **30 天系统学习**（想全面入门）→ [30 天学习路径](https://estelledc.github.io/embodied-ai-reading-station/learn/path/)（Week 1 VLM → Week 2 VLA → Week 3 模仿+扩散 → Week 4 周边）
3. **按主题浏览**（对特定方向感兴趣）→ [11 主题入门三连](https://estelledc.github.io/embodied-ai-reading-station/topics/)，每个主题 3 篇 primer 带你入门

### 更多导航

- **[30 天学习路径](https://estelledc.github.io/embodied-ai-reading-station/learn/path/)** — Week 1 VLM → Week 2 VLA → Week 3 模仿+扩散 → Week 4 周边
- **[新人 FAQ](https://estelledc.github.io/embodied-ai-reading-station/learn/faq/)** — 12 题最常被问
- **[5 套主题阅读包](https://estelledc.github.io/embodied-ai-reading-station/lists/)** — 50-90 分钟一包

### 想跨主题看？

- **[Compare](https://estelledc.github.io/embodied-ai-reading-station/compare/)** — 同主题 era 并排对比表
- **[Timeline](https://estelledc.github.io/embodied-ai-reading-station/timeline/)** — 2011→2025 演化时间线
- **[Graph](https://estelledc.github.io/embodied-ai-reading-station/graph/)** — D3 力导图（Force / Cluster / Timeline 三种布局）
- **[Heatmap](https://estelledc.github.io/embodied-ai-reading-station/heatmap/)** — 21 tag 共现矩阵
- **[Eras](https://estelledc.github.io/embodied-ai-reading-station/eras/founder/)** — 祖师爷 / 经典 / 前沿三档

### 工具

- **[Glossary](https://estelledc.github.io/embodied-ai-reading-station/glossary/)** — 60 个术语字典
- **[Math primer](https://estelledc.github.io/embodied-ai-reading-station/learn/math-primer/)** — 公式符号速查
- **[Tags](https://estelledc.github.io/embodied-ai-reading-station/tags/)** — 21 跨主题技术标签
- **[Venues](https://estelledc.github.io/embodied-ai-reading-station/venues/)** — 37 会议按类别
- **[Stats](https://estelledc.github.io/embodied-ai-reading-station/stats/)** — 5 维数据看板

### 个性化（全前端 localStorage）

- 读完点 ✓ "标记已读"，首页 stats 自动 +1
- 阅读 streak 🔥 + 今日/本周/本月计数
- 下一篇推荐（基于已读主题分布）
- 阅读包进度条
- 主题/难度/era 三轴快筛 (URL hash 可分享)
- 12 个键盘快捷键 (`?` 看完整列表)
- 暗色模式 toggle (☀ ☾ ⊙)
- 论文页阅读计时器 + 顶部进度条
- 已读清单导出 markdown

## 给研究者

### 数据 API（CC BY 4.0）

```bash
curl https://estelledc.github.io/embodied-ai-reading-station/data/papers.json   # 156 全元数据
curl https://estelledc.github.io/embodied-ai-reading-station/data/tags.json     # 21 tag 频次 + 共现
curl https://estelledc.github.io/embodied-ai-reading-station/data/topics.json   # 11 主题元数据
curl https://estelledc.github.io/embodied-ai-reading-station/data/index.json    # manifest
```

### 引用

每篇论文页底部有折叠 BibTeX 块，一键复制：

```bibtex
@misc{eai_rt_1_2022,
  title  = {RT-1: Robotics Transformer for Real-World Control at Scale},
  author = {Jason},
  year   = {2022},
  note   = {Embodied AI: Zero to One — readable note},
  url    = {https://estelledc.github.io/embodied-ai-reading-station/papers/rt-1/}
}
```

## 11 个主题

| Roman | Topic | 篇数 | 主题入门 |
|-------|-------|------|----------|
| I | VLM Foundation | ~20 | CLIP → BLIP-2 → LLaVA |
| II | High-Level Planning | ~5 | SayCan → Code-as-Policies → Inner Monologue |
| III | End-to-End VLA | ~16 | RT-1 → RT-2 → OpenVLA |
| IV | Diffusion Policy | ~10 | Diffusion Policy → 3D-DP → π0 |
| V | Imitation Learning | ~10 | DAgger → ACT/ALOHA → UMI |
| VI | World Model | ~10 | World Models → Dreamer → Genie |
| VII | Multimodal | ~10 | ImageBind → OBELICS → AnyMAL |
| VIII | RF Perception | ~12 | RF-Pose → milliMap → PanoRadar |
| IX | Auditory | ~10 | Whisper → AudioLM → Acoustic Swarms |
| X | Datasets & Benchmarks | ~10 | Open-X → DROID → BEHAVIOR-1K |
| XI | Simulation | ~10 | Habitat → Isaac Gym → SIMPLER |

完整列表 → [Topics](https://estelledc.github.io/embodied-ai-reading-station/topics/)

## 技术栈

- 静态站：Node.js + marked + gray-matter，无框架
- 设计系统：atelier-zero（暖纸 ivory + coral + mustard + Inter Tight + Playfair Display + JetBrains Mono）
- 搜索：Pagefind 全文索引
- 数学：KaTeX
- 可视化：D3.js（force-directed graph）
- 部署：GitHub Pages + Actions
- 图片生成：codex CLI generate_image + cwebp

## 开发

```bash
git clone git@github.com:estelledc/embodied-ai-reading-station.git
cd embodied-ai-reading-station/site
npm install
npm run build      # 输出到 dist/
npm run serve      # 本地 dev server
```

## 项目结构

```
notes/             156 篇论文笔记 (.md, frontmatter + body)
papers/            原 PDF + 解析图片
site/
  scripts/build.mjs   主构建脚本（discoverPapers + buildIndex + ...）
  src/                CSS / JS / images / templates
  content/            issues / learn 页 markdown
  dist/               构建输出（git-ignored）
explorations/       playground
```

## 构建流程

```
notes/*.md ──┐
             ├──▶ discoverPapers() ──▶ 156 paper objects
papers/      │                              │
  └─ images  │                              ▼
             │                       inferTags() → 21 tags
content/*.md ┤                              │
  ├─ issue-* │                              ▼
  └─ learn-* │                       buildIndex / buildTopics
             │                       buildCompare / buildGraph
             │                       buildStats / buildHeatmap
             ▼                       ... (~30 view pages)
        marked + gray-matter                │
             │                              ▼
             │                       buildNotePage × 156
             │                              │
             ▼                              ▼
       Pagefind index ◀──────── dist/
                                  │
                                  ├─ data/papers.json + .csv
                                  ├─ feed.xml + sitemap.xml
                                  ├─ sw.js (PWA)
                                  └─ index.html ... 2400+ files

   ↓ npm run check (63 项)
   ↓ GitHub Actions (build → check → deploy)
   ↓
   estelledc.github.io/embodied-ai-reading-station/
```

构建用时约 2 秒，dist 输出 ~120MB（71MB 是 590 张 webp 图）。

## 许可

- **笔记内容**：CC BY 4.0 — 引用请保留作者
- **代码**：MIT
- **原论文 PDF**：版权归原作者，本站只做学习摘要

## 反馈

- 笔记错误 / 想加论文 / 想改风格 → [GitHub issue](https://github.com/estelledc/embodied-ai-reading-station/issues)
- 站点 bug / 设计建议 → 同上

---

> 这站是 Jason（编程零基础本科生）做的实验室科研任务的副产物。原任务是读 13 篇代表论文，扩展到 156 是因为 13 篇看不到全景。
> 完全个人项目。如果你也是入门读者，希望它能让你少绕几个弯。
