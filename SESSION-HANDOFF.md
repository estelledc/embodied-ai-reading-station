---
status: active_campaign
campaign_name: eai13-t001-t011-integration
activated_by: user-request-2026-07-12
activated_at: "2026-07-12T09:15:00+08:00"
scope: eai13-t001-t011-integration-to-main
start_ref: 9d62a5bcff39d4a73abffce74be8d507b71ae461
source_ref: c57a281395948afbba9346845825a37cc5b0347f
source_branch: codex/eai13-t010-asset-generation
integration_branch: campaign/eai13-t001-t011-integration
total_budget: 12 runs or 24 hours (whichever first)
runs_completed: 0
runs_since_last_external_delta: 0
review_after: every 3 runs or when origin/main changes
external_outcome: draft-pr-ci-green-reviewable
superseded_by: none
---

# 当前接班：EAI13 T001-T011 集成 Campaign（ACTIVE）

## Campaign 合同

**objective**：把保存在 `codex/eai13-t010-asset-generation@c57a281` 的 EAI13 T001–T011 实现，安全集成到实时最新的 `origin/main`，形成一个测试全绿、可审查的 Draft PR；之后持续监控并修复 CI 与 actionable review feedback，直到该 PR 达到 ready-for-review 状态。

**scope**：现有 EAI13 实现栈的集成、冲突处理、回归修复、测试、文档收口和 Draft PR。明确排除：Batch 8 Lab、Batch 9 llava 核验、批量精读、季度论文收录、既有笔记正文改写、MuJoCo/SmolVLA 实验伪造、EAI13-T012 owner-only 设置。

**acceptance_checks**：
1. 保留 c57a281 原分支与全部原始提交，不在该分支 rebase 或改写历史。
2. 从 fetch 后的最新 origin/main 建立隔离 integration 分支（worktree：`explorations/embodied-ai-integration`）。
3. 逐依赖集成 T001–T011 的 13 个提交，每个冲突都解释取舍。
4. `npm run test:unit` 全过。
5. 固定 `SOURCE_DATE_EPOCH=1720579200` 后，根路径 `npm run build && npm run check` 全过。
6. `SITE_BASE=/embodied-ai-reading-station npm run build && npm run check` 全过。
7. `npm audit --audit-level=high` 与 `git diff --check` 通过。
8. Draft PR CI 全绿；所有 actionable review feedback 已处理或有证据说明不采纳。

**run budget（单 run）**：最多 3 个切片、120 分钟、1 个写者；只读调查可并行。

**total_budget**：最多 12 个 run 或 24 小时，以先到者为准。

**review_after**：每完成 3 个 run 或远端 main 发生变化时复核。

**stop_conditions**：
1. campaign objective 已完成（Draft PR ready-for-review）；
2. 总预算耗尽；
3. 连续 3 个 run 没有 external delta；
4. 需要 force push、改写受保护历史、merge、deploy 或 owner 设置；
5. 出现无法解释的工作树重叠、凭证问题或无法复现的门禁失败。

**权限边界**：允许创建集成分支、修改文件、运行测试、创建原子本地提交、push 非 main 分支、创建和更新 Draft PR。禁止 force push、直接写 main、merge PR、deploy、修改 branch protection、required checks 或 Pages owner 设置。

## 状态线

- 远端已接受基线：`origin/main` = `9d62a5bcff39d4a73abffce74be8d507b71ae461`（Merge PR #14）。
- 源实现锚点：`codex/eai13-t010-asset-generation` @ `c57a281395948afbba9346845825a37cc5b0347f`（13 个提交，T001–T011）。
- 集成分支：`campaign/eai13-t001-t011-integration`（worktree：`explorations/embodied-ai-integration`）。
- 合并基线（merge base）：`5b02c23`（Merge PR #12）；分叉后 origin/main 新增 5 个提交（PR #13 showcase-v2 + PR #14 ci-finalization），源分支新增 13 个提交。

## 当前 run（Run 1）

**Run 1 contract**：
- objective：逐提交 cherry-pick dabde09..c57a281 的 13 个 EAI13 提交到集成分支，解决重叠文件冲突。
- scope：cherry-pick 集成与冲突解决，不做额外重构或功能扩展。
- slices：
  1. cherry-pick 前 4 个提交（dabde09, 9192593, ce8b282, 3abbf1d：provenance v2 合同/迁移/门禁 + v1.3 文档收口）
  2. cherry-pick 中 5 个提交（19a64ca, 988500d, 328114c, 98cbdf3, b495c11：Data API + 响应式图片 + SW 缓存 + CSP + More 导航）
  3. cherry-pick 后 4 个提交（1e61f00, 343cfe7, c56ae32, c57a281：许可治理 + 资产生成 + 审查夹具 + T011 收口）
- acceptance：cherry-pick 完成，无未解决冲突，工作树可解释。

## 先读什么

1. `AGENTS.md`：绑定的推进、权限和停止规则。
2. `docs/operations-index.md`：唯一活动操作入口与测试阶梯。
3. 本文件：当前 campaign 与 run 状态。
4. `CHANGELOG.md`、`PLAN-1.3.md`、`docs/v1.2-healthcheck-roadmap.md`：已读过，按需回查。

## 验证结果

- 治理框架（27858b4）已 cherry-pick 到集成分支，8 files changed, 280 insertions。
- 基线尚未在集成 worktree 运行完整门禁；cherry-pick 完成后统一跑。

## Blocker 与下一步

- 重叠文件（PR #13/#14 与 EAI13 同时修改）：layout.mjs, mobile-nav.test.mjs, aggregates.mjs, meta.mjs, papers.mjs, papers.test.mjs, seo.mjs, seo.test.mjs, theme.css；需要逐个冲突取舍。
- 下一条命令：`cd ../embodied-ai-integration && git cherry-pick dabde09^..c57a281`（逐提交或按 slice 分组）。

不要在 handoff 中复制易过期数量或 ETA；需要数量时使用实时命令。
