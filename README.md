# Embodied AI: Zero to One

> **把具身智能的论文海洋，编成一条从零基础到研究任务的学习路径。**
> 22 章系统教程 + 157 篇结构化论文笔记，从 CLIP 到 LeRobot，覆盖 11 个主题。
> v1.2.0 · 2026-07（更新记录见 [CHANGELOG.md](CHANGELOG.md)，未来方向见 [ROADMAP.md](ROADMAP.md)）

🌐 **[在线访问 →](https://estelledc.github.io/embodied-ai-reading-station/)**

[Jason / Works](https://estelledc.github.io/) · [About](https://estelledc.github.io/about/) · [Résumé](https://estelledc.github.io/resume/) · [GitHub](https://github.com/estelledc/embodied-ai-reading-station)

---

## Project brief / 对外展示

**Status:** Maintained · v1.2.0

- **Problem**：新手缺的不是另一篇孤立摘要，而是一条能回答“先学什么、论文如何关联、怎样走到真实研究任务”的路线。
- **Role**：个人项目；独立完成产品定义、内容架构、静态站工程、交互设计、公开数据与发布门禁。
- **System**：Node 静态生成器把教程、论文笔记、主题/时间线/关系图、Pagefind 搜索和浏览器本地进度统一到一份内容数据上。
- **Evidence**：22 章教程、157 篇笔记、11 个主题；公开 [质量页](https://estelledc.github.io/embodied-ai-reading-station/quality/)、[数据接口](https://estelledc.github.io/embodied-ai-reading-station/data/index.json) 和 [Actions 构建记录](https://github.com/estelledc/embodied-ai-reading-station/actions)。
- **Limitations**：笔记由 AI 辅助整理；46 篇保留本地解析文本与 SHA-256 清单，110 篇引用 HTTPS 原文。结构门禁不等于逐页人工复核，也不是学习效果证明。

> An editorial learning system that turns embodied-AI papers into a navigable path from first concepts to a real research brief. It is an owner-led, independently maintained, evidence-aware product—not a claim that every note has received line-by-line human review.

---

## 这站是什么

具身智能（Embodied AI）= 让 AI 有身体地融入世界——看见、听懂、决定、动手。这站把 157 篇顶会论文与开源系统材料（CoRL/RSS/NeurIPS/ICML/MobiCom/CVPR/ICLR 等）翻译成入门读者也能跟下来的语言：

- ✅ 第一次出现的术语必有一句话定义 + 生活类比
- ✅ 公式后面必有人话翻译
- ✅ 每篇至少 4000 字；可按需跳读，不把篇幅等同于人工复核深度
- ✅ 关键数字配生活语境（"13 万段示范" = "每天 8 小时连续示范 5 个月"）

### 内容状态与质量边界

当前 157 篇笔记中，156 篇采用 **deep-read（长篇结构化笔记）** 格式；新增 `lerobot` 是长篇研究笔记，但因本轮不新增二进制资产，暂不标记为 deep-read。这个状态表示页面结构和最低内容门禁，不等于“作者已逐页人工复核原论文”：

- 每篇 ≥4000 字（构建门禁校验）
- 每篇 ≥2 个视觉元素（架构图 / ASCII 图 / 论文原图，构建门禁校验）
- 统一包含实验解读、导读关系、思考题和原文信息
- 笔记由 AI 辅助整理；关键事实、数字和结论仍应回到原论文核验

其中 46 篇保留了本地解析文本（`papers/<slug>/paper.md`）及 SHA-256 清单，111 篇引用 arXiv 等 HTTPS 原文页面。旧版宣称的统一 Method 占比并未被现有内容满足，因此不再作为公开承诺；待补深度被记录为后续内容工作，不在 v1.2 中盲目扩写。

这站起源于导师布置的 **13 篇精读任务**（详见 [research-task.md](research-task.md)），扩展到 157 篇是为了看到全景。13 篇任务论文在站内标有 `task: required` 标记。

## 给读者

### 从这里开始

**根据你的目标选一条路径**：

1. **任务驱动**（有科研任务要交 / 6-30 截止）→ [research-task.md](research-task.md) 看 13 篇任务论文 → [22 章导读 Task 1 路径](guide/README.md)（Ch01→Ch03→Ch04→Ch08→Ch09→Ch10→Ch12→Ch22）→ [学习进度](progress.md)
2. **30 天核心学习 + 5 天可选扩展**（想全面入门）→ [30+5 学习路径](https://estelledc.github.io/embodied-ai-reading-station/learn/path/)（核心为 25 篇论文 + 5 个复习/输出日；Day 31–35 补齐任务论文）
3. **按主题浏览**（对特定方向感兴趣）→ [11 主题入门三连](https://estelledc.github.io/embodied-ai-reading-station/topics/)，每个主题 3 篇 primer 带你入门

### 更多导航

- **[30+5 学习路径](https://estelledc.github.io/embodied-ai-reading-station/learn/path/)** — 30 天核心（25 篇 + 5 个复习/输出日）+ 5 天可选任务扩展
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
- 首页可导出/导入版本化 JSON 进度，并分别重置 30 天路径、Guide 或全部状态

## 给研究者

### 数据 API与治理

```bash
curl https://estelledc.github.io/embodied-ai-reading-station/data/v2/index.json   # v2 入口与兼容策略
curl https://estelledc.github.io/embodied-ai-reading-station/data/v2/papers.json  # 157 篇版本化全元数据
curl https://estelledc.github.io/embodied-ai-reading-station/data/v2/provenance.json # canonical provenance（元数据 + hash）
curl https://estelledc.github.io/embodied-ai-reading-station/data/tags.json       # 21 tag 频次 + 共现
curl https://estelledc.github.io/embodied-ai-reading-station/data/topics.json     # 11 主题元数据
```

v2 papers/index 使用 `schema_version`、`content_commit`、`generated_at`、`data` 四字段 envelope；canonical provenance endpoint 保留 `schema_version`、`content_commit`、`notes` 的精确 manifest 形状。`content_commit` 标识可复核的内容输入快照；`generated_at` 只是由 `SOURCE_DATE_EPOCH` 固定的构建时间，不能替代内容身份。v2 index 的 `license` / `provenance` 字段分别绑定 `EAI-LICENSE-MAP-1.0.0` 与 `EAI-PROVENANCE-2.0.0`。

兼容说明：`/data/papers.json` 在整个 v1.3 窗口继续提供原有裸数组；`/data/index.json` 也保留旧字段，并新增 v2 入口与 `content_commit`。

### 引用

每篇论文页底部有折叠 BibTeX 块，一键复制：

```bibtex
@misc{eai_rt_1_2022,
  title  = {RT-1: Robotics Transformer for Real-World Control at Scale},
  author = {Jason Xun},
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
npm ci
npm run build      # 输出到 dist/
npm run serve      # 本地 dev server
```

### 发布门禁（仓库 owner）

- `main` 只通过 Pull Request 合并，不直接推送。
- 首次运行 PR CI 后，把实际 check `Validate pull request / build` 设为 required。
- 禁止 `main` force-push 和 branch deletion；Pages environment 只允许 `main` 部署。
- 工作流 action 固定到完整 commit SHA；升级 action 时单独审查并更新 SHA。
- 合并前必须通过 `npm test`、仓库名 `SITE_BASE` 构建检查和 `npm audit --audit-level=high`。

## 项目结构

```
notes/             157 篇论文笔记 (.md, frontmatter + body)
papers/            解析文本 + 解析图片 + provenance SHA-256 清单
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
             ├──▶ discoverPapers() ──▶ 157 paper objects
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
             │                       buildNotePage × 157
             │                              │
             ▼                              ▼
       Pagefind index ◀──────── dist/
                                  │
                                  ├─ data/v2/{index,papers,provenance}.json
                                  ├─ data/papers.json + .csv（legacy）
                                  ├─ feed.xml + sitemap.xml
                                  ├─ sw.js (PWA)
                                  └─ 256 个 HTML 页面 + 静态资产

   ↓ npm run check（静态、链接、来源与产品契约）
   ↓ GitHub Actions（PR: test/build/check/audit；main: build/check/deploy）
   ↓
   estelledc.github.io/embodied-ai-reading-station/
```

构建时间和体积随机器、依赖及 `SITE_BASE` 变化；`npm run check` 会全量扫描 256 个 HTML 页面、内部链接、来源证据和性能预算，并阻止 dist 超过 200MB。

## 许可

- **`project-code`**：`MIT`，完整文本见 [LICENSE](LICENSE)
- **`project-notes`**：`CC-BY-4.0`，引用并标注修改
- **`project-generated-images`**：仅另有证据证明项目可许可的图片声明 `CC-BY-4.0`；当前 v2 字段不会自动把资产归入此类
- **`third-party-paper-materials`**：`NOASSERTION`，不是项目许可授予；论文、解析材料、figure 与尚无独立权利证据的生成资产均默认归入此类

四类边界、依赖声明与法律证据状态见 [NOTICE.md](NOTICE.md)；字段、hash 与两阶段更新流程见 [PROVENANCE.md](PROVENANCE.md)。T009 实施时 canonical manifest 的 `generated_assets` 记录数为 0；这是历史基线，不能把现有图片概括为已完成权属核验。

## 反馈

- 笔记错误 / 想加论文 / 想改风格 → [GitHub issue](https://github.com/estelledc/embodied-ai-reading-station/issues)
- 站点 bug / 设计建议 → 同上

---

> 这站是 Jason（编程零基础本科生）做的实验室科研任务的副产物。原任务是读 13 篇代表论文，扩展到 157 是因为 13 篇看不到全景。
> 完全个人项目。如果你也是入门读者，希望它能让你少绕几个弯。
