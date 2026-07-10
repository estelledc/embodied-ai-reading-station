# 1.3 推进计划 — v1.2 发布收口 → 工程 P1 队列 → Lab 板块启动

> **For agentic workers:** 按批次顺序执行,每批次一个分支一个 PR,批次内每任务一个 commit。
> 本计划是 [ROADMAP.md](ROADMAP.md) 的执行层:出口 = v1.3.0。
> 各工程任务(EAI-T0xx)的目标与最小验收以 [docs/v1.2-healthcheck-roadmap.md](docs/v1.2-healthcheck-roadmap.md) 第 5 节为准,本文只做编排,不重复设计。
> 里程碑只定义出口条件与依赖顺序,不做日历时间承诺。

**门禁基线**(2026-07-10,commit `a19b88d`):`npm run test:unit` 73 passed + `npm run check` 97 passed, 0 failed。任何批次结束时不得低于此基线;涉及构建产物的批次须补跑双 SITE_BASE 与 dist 确定性对比。

---

## 批次总览与依赖

```
批次 0(v1.2 发布收口)
  O1 owner 设置 ──▶ R1 最终验证 + 切版 + tag
        │
        ▼
批次 1(T008 provenance schema + T011 契约冻结)──▶ 批次 9(C 线核验试点)
        │
        ▼
批次 2(T010)▶ 批次 3(T011)▶ 批次 4(T013)▶ 批次 5(T016)▶ 批次 6(T017/T018)▶ 批次 7(T019)
                                                                                    │
                                                                                    ▼
                                                                          批次 8(Lab 板块脚手架)
```

**依赖处理原则**:

1. 批次 1–9 原则上在 v1.2.0 tag 之后启动(遵守 RC 纪律:发布前不扩大改动面)。
2. 若 owner 侧 O1 长期未完成,仅允许提前做纯文档类工作(批次 1 的 schema 设计稿、批次 8 的板块设计稿),实现代码一律等发布。
3. 每批绑定不可变 commit;高风险改动后重跑相关门禁;不能用文档声明代替运行验证。
4. 批次 8 可视内容进展与批次 2–7 并行(它不依赖 P1 队列的具体任务,只依赖 v1.2.0 发布),图中排在批次 7 后是默认保守顺序。

---

## 批次 0:v1.2 发布收口

> **详细逐步清单、可复制命令与证据栏**见 [docs/batch-0-v1.2-release.md](docs/batch-0-v1.2-release.md)（阶段 A 前置合并 → B O1 → C 最终验证 → D 切版 → E tag）。本节省略为索引；执行时以该手册为准。

### O1(owner 外部依赖,agent 不可代办)

> **2026-07-10：用户决定延后。** 复选框保持未勾；不声称 T014 已关闭。补做步骤仍见 [docs/batch-0-v1.2-release.md](docs/batch-0-v1.2-release.md) 阶段 B。

- [ ] 把实际 check `Validate pull request / build` 设为 main 的 required status check。
- [ ] 为 main 启用 required pull request、禁止 force push 和 branch deletion。
- [ ] 确认 Pages environment 只允许 main 部署。

> 依据:[docs/v1.2-healthcheck-roadmap.md](docs/v1.2-healthcheck-roadmap.md) 第 4.2 节(T014 剩余证据)。README「发布门禁」已有同款 checklist。

### R1(agent；本轮在 O1 延后前提下执行)

- [x] 在最终 RC commit（`84eb97f`）上重跑全部验证:73 unit、97 healthcheck、双 SITE_BASE、全量 dist 确定性对比通过；`npm audit --audit-level=high` 通过（仅余 moderate）。C6 浏览器手测：云环境无图形浏览器，以契约测试（路径/状态/安全相关 unit + check）代理，手册注明延后。
- [x] 切版:`site/package.json` + lockfile → `1.2.0`;README 版本行 → `v1.2.0`;CHANGELOG `[Unreleased]` → `[1.2.0] - 2026-07-10`。
- [ ] Commit: `release: v1.2.0 —— 内容可信度与安全收口`,走 PR 合并。
- [ ] 合并后确认 main build/deploy 成功(关闭 T015 部署验证缺口),在合并 commit 上创建 annotated tag `v1.2.0`。

**出口**:版本与 tag 发布后可称「v1.2.0 已发布」；O1/T014 仍为待办，不写入「T014 已关闭」。

---

## 批次 1:EAI-T008 provenance schema(+ T011 契约冻结)

主线 C(内容可信度清偿)的地基,也是 P1 队列第 1 项。

- [ ] 设计 provenance schema v2:笔记、来源、生成资产(inline/card/抽图)与人工复核状态全部字段化;156 篇每篇必须有合法元数据或明确 `blocked_reason`;公开文件不得带入被排除的论文二进制。
- [ ] 与 T011 一起冻结数据合同:`schema_version`、`content_commit`、稳定 nullable 语义、人工复核字段(如 `verified: {by, date, scope}`)。设计冻结后 T008 先落地数据来源,T011 再发布公共 API。
- [ ] 实现生成/校验脚本(扩展 `papers/provenance.json` 或新清单),接入 `npm run check` 门禁。
- [ ] 验收:v1.2 路线图第 5 节 T008 行;check 新增项 0 fail;`npm test` 全链路通过。

## 批次 2–7:工程 P1 队列(每批一个 PR)

| 批次 | Task | 内容(验收以 v1.2 路线图第 5 节对应行为准) |
|---|---|---|
| 2 | `EAI-T010` | 首页 CSS 缩略图背景改语义化、lazy、responsive 图片;建立首页请求数/字节预算;保持卡片可访问名称。T018 的性能前置。 |
| 3 | `EAI-T011` | 发布带 `schema_version`、`content_commit` 的版本化数据 API(字段沿用批次 1 冻结的合同);旧客户端能检测不兼容版本。 |
| 4 | `EAI-T013` | 明确 Service Worker cache coverage、更新提示、离线 fallback 与容量上限;已访问论文离线重载、版本更新、缓存限制须有自动/浏览器证据。建立在 T011 版本化语义之上。 |
| 5 | `EAI-T016` | 外移 inline behavior,建立 report-only CSP;普通导航零未批准违规。复用 T005/T021 的 sink 与 protocol 安全边界。 |
| 6 | `EAI-T017` + `EAI-T018` | 联合验收:More 导航键盘打开/遍历/Escape/焦点返回/`aria-expanded`;移动端、键盘、读屏、对比度、表格、reduced-motion 矩阵;覆盖 320/375/768 宽度。先实现交互,再用矩阵做最终验收。 |
| 7 | `EAI-T019` | 独立 LICENSE / NOTICE / PROVENANCE 治理文件,区分代码、笔记、生成图与原论文/图版权。复用 T008 provenance 合同。 |

P2 的 `EAI-T020`(资产生成可复现)不排入本计划,发布 v1.3.0 前视余力决定。

## 批次 8:Lab 板块脚手架(v1.3 主题启动)

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

1. 分支命名 `cursor/<batch-name>-<suffix>`,每批次一个 PR,PR 描述引用本文对应批次与 v1.2 路线图对应 Task 行。
2. 每个 PR 合并前:`npm test`(unit → build → check)全过;涉及构建产物的批次补跑 `SITE_BASE=/embodied-ai-reading-station` 场景与 dist 确定性对比。
3. 每批完成后更新本文对应复选框 + CHANGELOG Unreleased 记录,状态漂移以 CHANGELOG 为准。
4. 发现超出批次范围的问题:记录进本文末尾「执行中记录的坏味道」,不顺手修(沿用 PLAN-1.1 纪律)。

## 明确不做(本计划范围)

- 不迁框架、不加后端(ROADMAP 全局边界)。
- 不在批次 9 之外重写任何既有笔记正文;核验试点的修正必须有原文依据。
- 不提前实现 P2(T020)与季度 Issue 内容。
- Task 2 的 MuJoCo/SmolVLA 实际复现属仓库外工作,本计划只承接其成文与站点化。

## 执行中记录的坏味道

> 执行各批次时发现、但超出当批范围的问题,只记录不顺手修。

(暂无)
