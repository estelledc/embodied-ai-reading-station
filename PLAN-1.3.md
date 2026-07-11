# 1.3 推进计划 — v1.2 已发布 → EAI13 合同/API 门禁 → 工程与 Lab

> **执行路由：** 本文是里程碑、依赖与验收候选档案，不是自动执行队列。独立 agent 必须先读取 [AGENTS.md](AGENTS.md)、[操作索引](docs/operations-index.md) 和 [当前 handoff](SESSION-HANDOFF.md)，声明有限 `run contract` 后才能执行被纳入 scope 的批次。Batch 8/9 与任何内容生产必须显式激活。
> **For agentic workers:** 按依赖顺序执行，每个 EAI13 task 一个分支/PR，任务内保持原子 commit；分支命名 `<agent>/eai13-<task>-<slug>`。
> 本计划是 [ROADMAP.md](ROADMAP.md) 的执行层:出口 = v1.3.0。
> **状态权威顺序**：运行代码与验证证据 → [CHANGELOG.md](CHANGELOG.md) → 本计划 → 历史计划复选框。旧 `EAI-T0xx` 只用于下文 crosswalk，不再直接调度实现。
> 里程碑只定义出口条件与依赖顺序,不做日历时间承诺。

**现行门禁基线**（2026-07-11，commit `19a64ca`）：`npm run test:unit` 183 passed；`npm run check` 110 passed、0 failed；根路径与 `/embodied-ai-reading-station` 双 SITE_BASE 通过，同一 `SOURCE_DATE_EPOCH` 下全部 7 个 data 文件两次构建 SHA-256 一致。任何后续批次不得低于该基线；v1.2 发布时的 73/97 证据保留在历史 runbook。

---

## 批次总览与依赖

```
批次 0（历史）：v1.2.0 已发布；O1/T014 外部待办仍开放

硬门禁：EAI13-T001 ─▶ T002 ─▶ T003 ─▶ T004

工程分支：
  T003 ─▶ T007
  T004 ─▶ T005 ─▶ T008
       ├▶ T006
  T001 + T004 ─▶ T009
  T002 + T003 + T009 ─▶ T010

Lab / 新公共消费者：T001–T004 + T011 状态治理全部通过后启动
owner 外部证据：EAI13-T012 独立跟踪，不得伪装成已完成
```

**依赖处理原则**:

1. v1.2.0 已发布；O1 未完成不回滚已发生的发布，但 `EAI13-T012` 必须保持外部未验证状态。
2. **Lab 和任何新的公共数据消费者必须晚于 `EAI13-T001 → T002 → T003 → T004`，并在 `EAI13-T011` 收口状态后启动。** 此前最多做设计稿，不得实现第二套内容/API 合同。
3. 每批绑定不可变 commit；高风险改动后重跑相关门禁；不能用文档声明代替运行验证。
4. 后续工程仅在 backlog 显式依赖允许时并行；依赖 T004 的 `T005/T006`、依赖 T005 的 `T008`、依赖 T009 的 `T010` 必须保持顺序。

---

## 批次 0：v1.2 发布收口（历史完成）

> v1.2.0 已于 2026-07-10 发布。详细命令与证据栏保存在 [docs/batch-0-v1.2-release.md](docs/batch-0-v1.2-release.md)；A/C/D/E 是历史记录，不应作为现行步骤重复执行。B/O1 仍是 owner follow-up。

### O1(owner 外部依赖,agent 不可代办)

> **2026-07-10：用户决定延后。** 复选框保持未勾；不声称 T014 已关闭。补做步骤仍见 [docs/batch-0-v1.2-release.md](docs/batch-0-v1.2-release.md) 阶段 B。

- [ ] 把实际 check `Validate pull request / build` 设为 main 的 required status check。
- [ ] 为 main 启用 required pull request、禁止 force push 和 branch deletion。
- [ ] 确认 Pages environment 只允许 main 部署。

> 依据:[docs/v1.2-healthcheck-roadmap.md](docs/v1.2-healthcheck-roadmap.md) 第 4.2 节(T014 剩余证据)。README「发布门禁」已有同款 checklist。

### R1（agent；已在 O1 延后例外下完成）

- [x] 在最终 RC commit（`84eb97f`）上重跑全部验证:73 unit、97 healthcheck、双 SITE_BASE、全量 dist 确定性对比通过；`npm audit --audit-level=high` 通过（仅余 moderate）。C6 浏览器手测：云环境无图形浏览器，以契约测试（路径/状态/安全相关 unit + check）代理，手册注明延后。
- [x] 切版:`site/package.json` + lockfile → `1.2.0`;README 版本行 → `v1.2.0`;CHANGELOG `[Unreleased]` → `[1.2.0] - 2026-07-10`。
- [x] Commit: `release: v1.2.0 —— 内容可信度与安全收口`,走 PR 合并（[#11](https://github.com/estelledc/embodied-ai-reading-station/pull/11) → `0712328`）。
- [x] 合并后确认 main build/deploy 成功(关闭 T015 部署验证缺口),在合并 commit 上创建 annotated tag `v1.2.0`。

**出口**:版本与 tag 已发布，可称「v1.2.0 已发布」；O1/T014 仍为待办，不写入「T014 已关闭」。

---

## 批次 1：EAI13 合同/API 硬门禁（已完成）

该批是 Lab、新公共数据消费者与生成资产治理的共同地基；完成事实以 [CHANGELOG.md](CHANGELOG.md) `[Unreleased]` 和对应运行验证为准。

- [x] `EAI13-T001`：冻结 provenance v2 与 Data API 共用合同和正反 fixtures。
- [x] `EAI13-T002`：迁移 156 条 canonical provenance，保留 46 条本地来源证据并实现原子生成。
- [x] `EAI13-T003`：独立验证 worktree/index/HEAD/manifest/`content_commit` snapshot 字节闭环。
- [x] `EAI13-T004`：发布 `/data/v2/`，迁移三个站内消费者并保留 v1.3 legacy endpoint。
- [x] `EAI13-T011`：统一发布时态、旧任务 crosswalk 与 Lab 启动边界（本次文档治理）。

**出口**：183 unit、110 healthcheck、双 SITE_BASE 与固定时间 data SHA-256 对比通过；任何后续分支必须包含这些提交，回归失败即重新关闭硬门禁。

## 批次 2–7：EAI13 后续工程队列

| 批次 | EAI13 task | 依赖与内容 |
|---|---|---|
| 2 | `EAI13-T005` | 依赖 T004；首页卡片改为语义化、lazy、responsive 图片并建立路由级请求/字节预算。 |
| 3 | `EAI13-T006` | 依赖 T004；让 Service Worker 识别 API schema/commit，补更新、离线 fallback 与容量策略。 |
| 4 | `EAI13-T007` | 依赖 T003；外移 inline behavior，建立 report-only CSP 和批准违规预算。 |
| 5 | `EAI13-T008` | 依赖 T005；合并 More disclosure 键盘/焦点实现与完整无障碍矩阵。 |
| 6 | `EAI13-T009` | 依赖 T001/T004；增加 LICENSE、NOTICE、PROVENANCE 并映射到 v2 字段。 |
| 7 | `EAI13-T010` | 依赖 T002/T003/T009；为生成资产补 preflight、结构化输出、幂等写入与 provenance。 |

`EAI13-T012` 是 owner required check、main protection 与 Pages environment 的外部证据项；它独立跟踪、保持 `UNVERIFIED`，不得由 agent 代勾或写成 T014 已关闭。

## Carry-over crosswalk：EAI-T008–EAI-T020

旧 ID 全部保留用于历史追溯；`KEEP` 表示目标或已实现保护继续有效，`REFINE/SPLIT/MERGE` 表示按可回滚边界重组，`UNVERIFIED` 只用于源码无法证明的外部状态。

| 旧 ID | 判定 | 原因 | EAI13 映射 |
|---|---|---|---|
| `EAI-T008` | `SPLIT` | 原任务混合合同、迁移、独立校验、许可和资产字段。 | `EAI13-T001`, `EAI13-T002`, `EAI13-T003`, `EAI13-T009`, `EAI13-T010` |
| `EAI-T009` | `REFINE` | v1 的 46 份本地来源 SHA 已实现，转为 v2 迁移不丢失与独立门禁不回退约束。 | `EAI13-T002`, `EAI13-T003` |
| `EAI-T010` | `KEEP` | 首页 CSS background 缩略图和请求/字节预算缺口仍成立。 | `EAI13-T005` |
| `EAI-T011` | `SPLIT` | 共同合同先冻结，再单独发布版本化 API 与迁移消费者；不要与新的 EAI13-T011 混淆。 | `EAI13-T001`, `EAI13-T004` |
| `EAI-T012` | `KEEP` | 确定性构建已实现，继续作为四个关键切片的不可回退验收条件。 | `EAI13-T001`, `EAI13-T002`, `EAI13-T003`, `EAI13-T004` |
| `EAI-T013` | `REFINE` | Service Worker 需识别 schema/commit，并覆盖更新、离线与容量。 | `EAI13-T006` |
| `EAI-T014` | `UNVERIFIED` | workflow 代码存在不等于 required check、branch protection 与 Pages environment 已启用。 | `EAI13-T012` |
| `EAI-T015` | `KEEP` | main-only 部署代码与既有发布证据保留，外部治理证据统一收口。 | `EAI13-T012` |
| `EAI-T016` | `KEEP` | inline behavior 与 CSP report-only 缺口仍存在。 | `EAI13-T007` |
| `EAI-T017` | `MERGE` | More 交互必须与完整无障碍矩阵联合验收。 | `EAI13-T008` |
| `EAI-T018` | `MERGE` | 矩阵是交互/响应式实现的完成闸，不是独立文档任务。 | `EAI13-T008` |
| `EAI-T019` | `REFINE` | 治理文件继续实施，并绑定 provenance v2 字段。 | `EAI13-T009` |
| `EAI-T020` | `REFINE` | 保留资产可复现目标，增加 preflight、幂等写入并移除本机路径假设。 | `EAI13-T010` |

没有旧任务被静默删除或重编号；若 crosswalk 与代码/CHANGELOG 冲突，以代码和 CHANGELOG 为准并修订本表。

## 批次 8:Lab 板块脚手架(v1.3 主题启动)

> **硬门禁**：Lab 实现只能基于同时包含 `EAI13-T001 → T002 → T003 → T004` 与 `T011` 的提交，并先确认 `npm test`、双 SITE_BASE 和确定性门禁仍通过。该规则取代旧版允许提前启动 Lab 的安排。

把 [research-task.md](research-task.md) Task 2 的实践过程沉淀为站点新板块,脚手架与内容解耦。

- [ ] 新增 lab 内容类型:`site/content/lab-*.md`(frontmatter 沿用 learn 页的 `title/order/intro`,加 `stage` 字段标注环境搭建/复现/数据/微调/部署)。
- [ ] 仿 [site/scripts/lib/views/learn.mjs](site/scripts/lib/views/learn.mjs) 的 buildLearnIndex/buildLearnPage 增加 lab 构建器;导航入口进 masthead(位置与 More 折叠区权衡后定);`npm run check` 补 lab 页面存在性与死链检查。
- [ ] 与 [site/content/tutorials.md](site/content/tutorials.md) 第 2 档(SmolVLA / LeRobot)互链;[ROADMAP.md](ROADMAP.md) 主线 B 的 5 篇规划作为占位目录展示,未成文的标注「未开始」。
- [ ] 首篇内容:「MuJoCo 环境搭建日志」——**内容红线:实践日志只能来自实际跑通记录,报错与解法如实记录,不为发布而编造未验证的步骤**。Task 2 属仓库外工作,跑通后才成文;脚手架 PR 不等内容。

**出口**:lab 板块上线且首批 ≥3 篇日志过门禁时,v1.3.0 的内容侧出口达成(见 ROADMAP 里程碑表)。

## 批次 9:C 线核验试点(llava)

建立"逐篇回原文核验"的可复制流程,选材料最全的 llava(本地 paper.md + 14 页 deck + Ch08/Ch09 两章 guide)。

- [ ] 对照 `papers/llava/paper.md` 逐节核验 `notes/llava.md` 的事实、数字与结论;发现的偏差逐条修正(改动必须有原文依据)。
- [ ] 核验结果登记进批次 1 的 provenance 人工复核字段(首个 `verified` 条目)。
- [ ] 把核验工作流沉淀为 [AGENT-DEEPREAD.md](AGENT-DEEPREAD.md) 新章节「核验(verify)工作流」:触发词、逐节对照法、登记方式、不盲目扩写红线。
- [ ] 后续滚动顺序(不在本批执行):其余 12 篇任务论文 → 33 篇 primer → 按主题滚动。

---

## D 线节奏约束(不设 agent 任务项)

- **本人消化**:[progress.md](progress.md) 的 12 篇待消化任务论文按 Guide Task 1 路径推进,每消化一篇勾选一篇——这是读者本人的事,agent 只保证材料与进度页可用。
- **季度 Issue**:每季一期收 3–5 篇新论文,收录标准见 ROADMAP 主线 D;下一期(Issue 09)在 v1.3.0 发布后启动。

## PR 与门禁约定

1. 一份有限 run contract 使用一个交付分支，默认最多 3 个可独立验收切片；需要独立 PR 的任务从已接受基线开启新的 run，不从另一条未接受的 PR 栈继续分叉。分支名描述本次交付目标（EAI13 task 遵循 `<agent>/eai13-<task>-<slug>` 命名），PR 描述引用本文对应批次、task 与对应验收标准。
2. 每个 PR 合并前:`npm test`(unit → build → check)全过;涉及构建产物的批次补跑 `SITE_BASE=/embodied-ai-reading-station` 场景与 dist 确定性对比。
3. 每批完成后更新本文对应复选框 + CHANGELOG Unreleased 记录；状态漂移以运行代码/验证结果和 CHANGELOG 为准。
4. 发现超出批次范围的问题:记录进本文末尾「执行中记录的坏味道」,不顺手修(沿用 PLAN-1.1 纪律)。

## 明确不做(本计划范围)

- 不迁框架、不加后端(ROADMAP 全局边界)。
- 不在批次 9 之外重写任何既有笔记正文;核验试点的修正必须有原文依据。
- 不绕过 EAI13 依赖提前实现旧 P2 `EAI-T020` 的映射任务 `EAI13-T010`，也不提前编写季度 Issue 内容。
- Task 2 的 MuJoCo/SmolVLA 实际复现属仓库外工作,本计划只承接其成文与站点化。

## 执行中记录的坏味道

> 执行各批次时发现、但超出当批范围的问题,只记录不顺手修。

(暂无)
