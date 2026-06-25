# Embodied AI: Zero to One — 治理审计报告

> 审计日期：2026-06-24
> 范围：156 篇笔记 + 22 章导读 + 站点构建 + 任务对齐

---

## 1. 笔记 tier 分布

| status | 数量 | 占比 | 说明 |
|--------|------|------|------|
| `auto-summary` | 46 | 29.5% | 有本地 `papers/<slug>/` 目录（含 paper.md + images），AI 生成 + 人工校对 |
| `auto-summary-light` | 110 | 70.5% | 仅有 arxiv URL，基于摘要 + 公开资料的短摘要 |
| `deep-read` | 0 | 0% | 无一篇标记为深度精读 |
| `stub` | 0 | 0% | 无占位页 |
| missing (无 status) | 0 | 0% | 全部 156 篇都有 status 字段 |

**关键发现**：站点 UI 提供了"深度精读"筛选按钮，但点击后结果为空。LLaVA 已有 14 页 deck + 两章导读（Ch08/Ch09 共 3074 行），但笔记 status 仍为 `auto-summary`。

---

## 2. 来源覆盖率

| 类型 | 数量 | 说明 |
|------|------|------|
| `来源: papers/<slug>/paper.pdf` | 45 | 有本地论文目录，引用 PDF（被 .gitignore 排除） |
| `来源: papers/<slug>/paper.md` | 1 | acoustic-swarms，格式不一致 |
| `来源: "https://arxiv.org/abs/..."` | 110 | 仅远程 URL |

**格式不一致**：45 篇写 `papers/xxx/paper.pdf`，1 篇写 `papers/xxx/paper.md`（acoustic-swarms）。

---

## 3. 13 篇任务论文对齐状态

| # | 论文 | slug | notes | status | papers/ | paper-stub残留 | progress.md | guide 章节 | deck |
|---|------|------|-------|--------|---------|---------------|-------------|-----------|------|
| 1 | LLaVA | llava | ✓ | auto-summary | ✓ paper.md+img | — | ☐ | Ch09 | ✓ 14页 |
| 2 | 3DShape2VecSet | 3dshape2vecset | ✓ | auto-summary | ✓ | — | ☐ | Ch18 | — |
| 3 | SayCan | saycan | ✓ | auto-summary | ✓ | — | ☐ | Ch10 | — |
| 4 | OpenVLA | openvla | ✓ | auto-summary | ✓ | — | ☐ | Ch12 | — |
| 5 | VLAS | vlas | ✓ | auto-summary | ✓ | — | ☐ | Ch12 | — |
| 6 | MLA | mla | ✓ | auto-summary | ✓ | — | ☐ | Ch12 | — |
| 7 | Cosmos Policy | cosmos-policy | ✓ | auto-summary | ✓ | — | ☐ | Ch15 | — |
| 8 | RF-SLAM | rf-slam | ✓ | auto-summary | ✓ | ⚠ paper-stub.md | ☐ | Ch19 | — |
| 9 | mmCLIP | mmclip | ✓ | auto-summary | ✓ | — | ☐ | Ch19 | — |
| 10 | NLOS mmWave | nlos-mmwave | ✓ | auto-summary | ✓ | ⚠ paper-stub.md | ☐ | Ch19 | — |
| 11 | Proactive Hearing | proactive-hearing | ✓ | auto-summary | ✓ | — | ☐ | Ch20 | — |
| 12 | NeuralAids | neuralaids | ✓ | auto-summary | ✓ | — | ☐ | Ch20 | — |
| 13 | Acoustic Swarms | acoustic-swarms | ✓ | auto-summary | ✓ | — | ☐ | Ch20 | — |

**全部 13 篇 progress.md 未勾选**，但 LLaVA deck 已完成（14 页，满足 Task 1 要求）。进度日记严重滞后。

---

## 4. 三入口重叠与冲突

### 三个入口

| 入口 | 位置 | 覆盖论文数 | 定位 |
|------|------|-----------|------|
| 30 天学习路径 | `site/content/path.md` | ~25 篇 | 线性学习计划 |
| 22 章导读 | `guide/README.md` | 50+ 篇 | 系统导读 + 3 条子路径 |
| 主题入门三连 | `notes/topics.json` | 33 篇 primer | 按主题浏览 |

### 冲突点

| # | 问题 | 严重度 |
|---|------|--------|
| C1 | path.md 30 天路径只覆盖 13 篇任务论文中的 ~3 篇（LLaVA/SayCan/OpenVLA），RF 和听觉 6 篇完全缺失 | **P0** |
| C2 | path.md 与 guide Task 1 路径覆盖的论文集合不同，读者不知道跟哪个 | **P0** |
| C3 | LLaVA slug 不一致：path.md 用 `llava`，topics.json primer 用 `llava-1-5` | P1 |
| C4 | π0 归属冲突：path.md 放 Week 2 (VLA)，topics.json 放 Diffusion Policy primer | P2 |
| C5 | BLIP（初代）在 path.md Day 2 出现，但 guide/topics 均不强调 | P2 |
| C6 | 没有统一的"必读清单"——三个入口 25/50+/33 篇各不相同 | **P0** |

---

## 5. 死链 / 路径错误

| 文件 | 行号 | 问题 | 修复 |
|------|------|------|------|
| `DEPLOY.md` | L25, L58 | `~/intern-journal/explorations/embodied-ai-research` → 实际路径 `~/intern-journal/explorations/research/embodied-ai` | 替换路径 |
| `deck/README.md` | L9 | `# 在 embodied-ai-research/ 目录起 server` → 旧目录名 | 替换路径 |
| `README.md` | L157 | 写 "49 项" 检查，实际 check.mjs 运行 63 项 | 更新数字 |

---

## 6. check.mjs 盲区

当前 63 项检查覆盖：静态页面 23 + 主题 11 + Era 3 + frontmatter 5 + paper pages 1 + Data API 6 + PWA 8 + OG/Twitter 1 + Issue plate 1 + 链接健康 1 + 资源大小 3 = 63。

### 应增但未覆盖的检查

| # | 检查项 | 优先级 | 说明 |
|---|--------|--------|------|
| N1 | guide/ 22 章 HTML 全部存在 | P0 | 确保导读页不缺失 |
| N2 | 13 篇 `task: required` 笔记存在 | P0 | 任务论文完整性 |
| N3 | status 字段值合法性 | P1 | 防止 typo 导致的分类错误 |
| N4 | `来源:` 引用 `papers/` 但目录不存在的条目 | P1 | 元数据谎言 |
| N5 | topics.json primer slug 在 notes/ 中存在 | P1 | primer 指向空气 |
| N6 | progress.md 中的 13 篇 slug 在 notes/ 都存在 | P2 | 进度文件完整性 |
| N7 | `status: stub` 数 = papers/ 下 paper-stub 数 | P2 | stub 一致性 |

---

## 7. paper-stub 残留

| 目录 | 文件 | 问题 |
|------|------|------|
| `papers/rf-slam/` | paper-stub.md + paper.md + images/ | paper-stub.md 是早期占位残留，paper.md 已完整 |
| `papers/nlos-mmwave/` | paper-stub.md + paper.md + 2 PDF + images/ | 同上 |

两个目录都有完整的 paper.md，paper-stub.md 应清理或记录为已知例外。

---

## 8. 其他发现

| # | 发现 | 优先级 |
|---|------|--------|
| M1 | README 完全没有质量层次说明（156 篇中 70% 是短摘要这件事读者无从得知） | **P0** |
| M2 | README 没有提到 guide/ 22 章导读、research-task.md、progress.md | P0 |
| M3 | progress.md 未反映 deck 已完成、站点已部署等重要进展 | P0 |
| M4 | build.mjs 3715 行单文件，技术债务严重（不在本次范围内改，记录到 BACKLOG） | P2 |
| M5 | 0 篇 `deep-read`——即使 LLaVA 有完整 deck+导读，笔记本身仍标为 `auto-summary` | P1 |
| M6 | research-task.md 截止日期写"6 月 31 日"（6 月只有 30 天），需确认 | P0 |

---

## 问题优先级汇总

| 优先级 | 数量 | 关键项 |
|--------|------|--------|
| P0 | 8 | README 无质量说明、三入口冲突、progress.md 滞后、路径错误、截止日期歧义 |
| P1 | 5 | LLaVA 应升 deep-read、来源格式不一致、check 新增项、slug 不一致 |
| P2 | 4 | π0 归属、BLIP 强调、build.mjs 重构、paper-stub 清理 |
