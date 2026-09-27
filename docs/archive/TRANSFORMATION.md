# 转型方案：从"论文阅读站"到"具身智能零到一"

> 基于 3715 行 build.mjs、22 章 Guide、156 篇笔记、6 个 Learn 页、以及 Jason 站群 5 个子站的交叉分析。

---

## 一、诊断：你已经有什么

### 教材已经写完 80%

22 章 Guide 不是论文摘要——它是一本完整的教材。证据：

- ch08（CLIP）1501 行 / 35000+ 中文字，含 7 个可运行 Python 示例 + 9 道自测题
- ch13（Diffusion Policy）1384 行 / 30000+ 字，含 7 个代码块 + 自测题
- 每章以日常类比开场、分步拆解机制、配代码、列误区、结尾检验
- Part 3 核心主线精读（Ch08-Ch14）统一配备自测检查点

这些内容的教学质量已经超过大多数中文技术教程。

### 论文库是独有资产

156 篇覆盖 11 主题，46 篇 auto-summary（4000 字级）+ 110 篇 light（概览级），配有 D3 关系图、热力图、时间线等多维浏览视图。这些在教学站里的角色是"参考文献库"——Guide 讲原理，笔记提供每篇论文的细节。

### Learn 页有不可替代的内容

- **path.md**：30 天逐日论文阅读计划（Guide 没有这个粒度）
- **prerequisites.md**：30+ 条中文 B 站/知乎/GitHub 学习资源（Guide ch03 不包含）
- **tutorials.md**：11 个分级实战项目（从"不用装环境看视频"到"需要 A100"）
- **community.md**：16 位学者 50+ 条演讲/访谈链接
- **math-primer.md**：符号速查字典

### 站点工程成熟

build.mjs 3715 行、check.mjs 68 项检查、Pagefind 全文搜索、PWA、RSS feed、JSON-LD、OpenSearch——基础设施比大多数个人教学站完善一个量级。

---

## 二、Gap：缺什么才能变成"零到一教学站"

### Gap 1：站点身份 — "阅读站" vs "教学站"

**当前状态**：
- 站名 "Embodied AI Reading Station"，嵌入 build.mjs 12 处 + README/manifest/feed 等 8 处
- 首页 hero 写 "156 篇讲机器人怎么学会看、想、做事的论文"
- OG description："156 篇具身智能论文，用零基础也能读懂的中文重写"
- 读者心智：来查论文的

**目标状态**：
- 站名体现"学习"不是"阅读"——比如 "Embodied AI: Zero to One" / "具身智能：从零到一"
- 首页 hero 写 "从零开始学具身智能，22 章系统教程 + 156 篇论文笔记"
- 读者心智：来学东西的

### Gap 2：导航层级 — Guide 被淹没

**当前导航**：`Index / Topics / Guide / Learn / Issues` + More 折叠 17 项

Guide 排第三，和 Topics、Issues 平级。一个零基础读者打开首页看到的是"156 篇卡片网格"——一个数据库视图，不是教材。

**参照**：你的 Zero to AI 站首页只有三条路径卡片 + "开始"按钮。Study 站首页是"枢纽笔记排名 + 方法论说明"。这两个站都把"你是谁 → 走哪条路"放在最前面。

### Gap 3：Guide ↔ Papers 链接断层

**核心发现**：Guide 章节与 notes/*.md 之间几乎零链接。

ch08 讲了 CLIP 的一切但不链接 notes/clip.md。ch13 讲 Diffusion Policy 但不链接 notes/diffusion-policy.md。Guide 章节间有密集的交叉链接网络（ch08 引 ch05/ch06/ch09...），但这个网络止步于 guide/ 内部。

读者看完 ch08 对 CLIP 的 35000 字讲解后，没有一键到 /papers/clip/（笔记原文+BibTeX+关联论文）的跳板。

### Gap 4：Guide 没有进度追踪

论文页有"标记已读"按钮（localStorage）、连续阅读 streak、今日推荐。Guide 章节页完全没有这些——看完 ch01 后没有"已完成"标记，没有"学习进度 5/22"的反馈。

### Gap 5：首页结构为"浏览器"设计，不为"学习者"设计

当前首页从上到下：hero → stats → streak → 筛选器 → 11 主题卡片网格。这是一个论文数据库的首页。

教学站的首页应该：hero → "你是谁/走哪条路" → Guide 6 Part 预览 → 论文库入口。

---

## 三、转型方案（5 层，由表及里）

### Layer 0 — 改名 + 品牌（~20 处字符串替换）

**新名**（建议 2 选 1，你定）：

- **A**："Embodied AI: Zero to One"（英文主，暗合 Peter Thiel 的《从 0 到 1》）
- **B**："具身智能从零到一"（中文主，更贴你的中文读者群）

**操作**：
1. build.mjs 中 12 处 "Embodied AI Reading Station" → 新名
2. build.mjs 中 ~25 处 "Embodied AI Reading" 页面 title 后缀 → 新后缀
3. README.md 标题 + 描述
4. site.webmanifest `name` 字段
5. OG/meta description 全局默认值
6. reading-progress.js 导出页脚
7. theme.css 打印样式页脚
8. GitHub 仓库名（这个影响 URL，需要同步改 SITE_BASE 和 Actions）

> **仓库改名风险**：GitHub 会自动 301 重定向旧 URL，所以老链接不会断。但 BASE 路径、sitemap canonical URL、BibTeX 引用 URL 都需要更新。建议仓库名改为 `embodied-ai-zero-to-one` 或 `embodied-ai`（更短）。

### Layer 1 — 首页重构（buildIndex 改造）

**策略**：不删除现有内容，在 hero 区和卡片网格之间插入 Guide 教学入口。

现有首页结构 → 改后结构：

```
现在:                           改后:
┌─ eyebrow ─────────────┐     ┌─ eyebrow ─────────────────┐
│ hero: "156 篇论文..."  │     │ hero: "从零开始学具身智能" │
│ CTA → /learn/          │     │ 两个 CTA:                 │
│                        │     │   [开始学习→Ch01] [浏览论文]│
├─ stats grid ──────────┤     ├─ 学习路径分流 ─────────────┤
│ daily pick             │     │ 3 卡片: 任务驱动/系统学习/ │
│ what's new             │     │         按主题跳读         │
│ streak                 │     ├─ Guide 6 Part 预览 ────────┤
├─ quick filter ────────┤     │ (复用 buildGuideIndex 的   │
│ 11 topic sections      │     │  parts 卡片，精简版)       │
│ (156 cards)            │     ├─ stats + streak ──────────┤
└────────────────────────┘     ├─ quick filter + 11 topics ┤
                               │ (论文网格下移但保留)       │
                               └────────────────────────────┘
```

**关键点**：论文网格不删——它是你的独有资产。只是把教材入口提到前面，让首屏传递"来学习"的信号。

### Layer 2 — 导航重排

**主导航**（5 → 5，改顺序 + 改标签）：

```
现在:  Index / Topics / Guide / Learn / Issues
改后:  Guide / Papers / Topics / Learn / Issues
```

变化：
1. Guide 提到第一位
2. "Index" 改标签为 "Papers"（更准确地描述那个页面的内容）
3. Guide 高亮时 coral 色，暗示它是主线

**More 折叠区**：保持不变（Timeline/Eras/Lists/... 这些高级视图对研究者有用，不删）

**masthead 站名区**：
```
现在:  ★ Embodied AI Reading Station
改后:  ★ 具身智能：从零到一         (或英文版)
```

### Layer 3 — Guide ↔ Papers 双向链接

**3a. Guide → Papers（每章底部加"本章涉及论文"卡片区）**

在 buildGuidePage() 中增加逻辑：
1. 扫描当前章节 markdown 中出现的论文关键词（slug 或 title）
2. 匹配到 PAPERS 数组中的条目
3. 在 prevNext 导航上方生成一行论文卡片链接

实现方式：可以在 guide 章节的 markdown 末尾加一个约定格式的元数据块，比如：
```markdown
<!-- papers: clip, blip-2, siglip, llava -->
```
buildGuidePage() 解析这个注释，生成论文链接区。

**3b. Papers → Guide（论文页标注"在导读哪一章讲过"）**

buildNotePage() 已经有 backlinks 系统。可以扩展：如果该论文被某个 guide chapter 引用，在论文页顶部显示"本论文在 Ch08: CLIP 中有详细讲解 →"。

### Layer 4 — Guide 进度系统

复用现有 reading-progress.js 的 localStorage 架构（`eaireading.read` key），扩展到 guide：

1. Guide 章节页底部加"标记已完成 ✓"按钮
2. Guide 目录页（/guide/）每章卡片显示完成徽章
3. 首页 stats grid 加一格："Guide 进度 N/22"
4. 可选：Guide 章节内的自测题加"全部答对"标记

技术实现：在 reading-progress.js 中新增一个 `eaireading.guide` localStorage key（数组存已完成章节 slug），guide 页面加载时读取。

### Layer 5 — 内容对齐（长期）

**5a. Learn 页面定位明确化**

Learn 不和 Guide 合并（它们解决不同问题），但在 Learn 首页说清关系：

```
Guide = 教材主线（22 章系统讲解）
Learn = 工具箱（30 天计划、FAQ、数学速查、实战教程、社区资源）
```

在 buildLearnIndex() 中加一段导语和指向 /guide/ 的交叉引用。

**5b. prerequisites.md ↔ ch03 互链**

prerequisites.md 的 30+ 条中文资源链接是 ch03 没有的独有内容。两者互加"详见"链接。

**5c. path.md ↔ ch02 互链**

类似处理。path.md 是逐日计划，ch02 是路径选择策略。

**5d. 13 篇任务论文在 Guide 中的标注**

目前 13 篇有 `task: required` 标记但只在 check.mjs 和笔记页体现。在 Guide 目录页和相关章节中标注"本章覆盖 N 篇任务论文"。

---

## 四、执行顺序与风险

### 建议分 3 个 PR

**PR 1：品牌 + 导航 + 首页（Layer 0-2）**
- 改名（~20 处字符串）
- 导航重排（masthead 函数）
- 首页 buildIndex 重构（hero + 路径分流 + Guide 预览区）
- 风险最低：不改内容，只改呈现
- 验证：`npm run check` 全过 + 本地 serve 确认视觉

**PR 2：双向链接 + 进度系统（Layer 3-4）**
- Guide 章节加 `<!-- papers: ... -->` 注释
- buildGuidePage 解析注释生成论文区
- buildNotePage 加 Guide 反向引用
- reading-progress.js 扩展 Guide 进度
- 风险中等：改了 2 个核心 build 函数 + 1 个前端 JS
- 验证：check.mjs 可扩展相关检查

**PR 3：内容对齐（Layer 5）**
- Learn 定位说明
- 互链（prerequisites↔ch03, path↔ch02）
- Guide 目录标注任务论文覆盖
- 风险最低：只加文字/链接

### 不在本方案范围内

- build.mjs 拆分（BACKLOG #1）— 可以做但不是转型必须
- 110 篇 light 补 PDF（BACKLOG #2）— 内容深化，与转型正交
- 换框架（Starlight/Astro）— 你的 build.mjs 已经完全满足需求，换框架是重写不是转型
- GitHub 仓库改名 — 可以做但需要你手动操作 GitHub Settings，建议 PR 1 合并后再改

---

## 五、一个决策点需要你定

**站名**：

| 选项 | 优点 | 缺点 |
|------|------|------|
| A: Embodied AI: Zero to One | 英文简洁，呼应经典书名，GitHub URL 友好 | 中文读者可能觉得不够直白 |
| B: 具身智能从零到一 | 中文直白，和 Guide 的"零基础"定位一致 | 英文环境显示中文站名可能怪 |
| C: 混合 — 英文名 "Zero to One" + 中文副标题 "具身智能从零到一" | 两全 | 两个名字需要在不同场景切换 |
| D: 保留 "Embodied AI Reading Station" | 已有品牌积累，不用改 URL | 和教学站定位不匹配 |

选好了我就开始执行 PR 1。

---

## 六、关于你其他站的经验复用

| 你的站 | 可以搬过来的模式 | 怎么搬 |
|--------|----------------|--------|
| Zero to AI (Starlight) | 首屏"3 条路径 + 开始"的分流设计 | Layer 1 首页重构直接参照 |
| Study (Starlight) | "反向链接数"排序的知识网络入口 | 暂不需要——Guide 本身是线性教材不是知识网络 |
| Hub (estelledc.github.io) | "回主站"链接 + VOL·MMXXVI footer | 已经有了，保持 |
| OS Review (Jekyll) | 线性章节 + prev/next | Guide 已经实现了 |
| LangChain Tutorial | 单页长文 README → GitHub Pages | 不适用——你的站远比这复杂 |

核心洞察：你所有教学站的共同模式是"零术语假设 + 日常类比起步 + 线性路径"。Guide 22 章已经完美符合这个模式。唯一的问题是站点外壳没有把 Guide 推到最前面。
