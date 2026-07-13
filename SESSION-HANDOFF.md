---
status: active_campaign
program_status: ACTIVE
cycle_state: INTEGRATING
cycle_id: EAIRS-CYCLE-20260713-OPERATIONS-BASELINE-STATE
activated_by: user-continue-research
scope: operations-index-current-baseline-state
branch: codex/operations-index-current-baseline
start_ref: 02ff1c251911c9d0b3e4e51024192994596ddce6
baseline_ref: origin/main
review_after: PR merge or next user wake
total_budget: 1 PR / 1 writer / 120 minutes
external_outcome: local-review-ready-change-set
superseded_by: none
---

# 当前接班：操作索引当前基线状态修正

## Cycle 合同

**research_question**：`docs/operations-index.md` 的“当前优先模式”是否仍应写成正在进行的集成收口，还是应反映 PR #20/#21 后 main 已回到远端已接受基线？

**hypothesis**：实时 Git 状态显示 `main...origin/main` 对齐、open PR 为空、`SESSION-HANDOFF.md` 已 completed，因此操作索引中的旧“当前存在未接受实现栈”描述已成为状态漂移。

**falsifier**：若实时 Git / PR 状态仍存在未接受实现栈或 open PR，则保留“集成收口”为当前优先模式。

**objective**：把操作索引的当前状态改为“从已接受基线启动”，同时保留未来再次出现未接受实现栈时才切回“集成收口”优先的条件规则。

**scope**：
- `docs/operations-index.md`
- `CHANGELOG.md`
- `SESSION-HANDOFF.md`
- 明确排除：`notes/`、`papers/provenance.json`、Lab、站点生成代码、deploy、owner 设置、任何 MuJoCo/SmolVLA/VLA 实验声明。

**selected_candidate**：`docs/operations-index.md` 状态漂移。

**rejected_candidates**：
- `notes/lerobot.md`：价值高，但会触发 156→157 inventory、card/inline 资产、测试合同和公开文案成套修改；本轮不做。
- Lab / Task 2 实验内容：缺真实 E4 artifact；本轮不做。

**primary_sources**：
- 实时 Git：`origin/main...HEAD` 为 `0 0`，open PR 列表为空。
- `SESSION-HANDOFF.md`：上一轮 LeRobot tutorial cycle 已 `completed / INTEGRATED`。
- `docs/operations-index.md`：旧第 3 节仍把集成收口写成当前状态。

**acceptance_checks**：
- `PATH="/opt/homebrew/bin:$PATH" node --test scripts/agent-progression.test.mjs scripts/workflow.test.mjs`
- `git diff --check`
- PR CI `Validate pull request / build` 成功后再 merge。

**run budget**：最多 1 个写入 PR、1 个 writer、120 分钟；本轮只做 operations-index 状态修正。

**权限边界**：用户已授权 `gh`、review 和 merge；仍禁止 force push、直接写 `main`、deploy、owner 设置或伪造 E4。

**stop_conditions**：
- 文档测试无法复现且只能放宽门禁。
- 发现操作索引修正必须扩大到 PLAN / ROADMAP 语义改写。
- PR CI 或 mergeability 进入外部 blocker。

## 当前状态

- 源实现锚点：`02ff1c251911c9d0b3e4e51024192994596ddce6`（PR #21 merge 后 main）。
- 当前分支：`codex/operations-index-current-baseline`。
- 实时 PR：开始本轮时 open PR 为空。
- GitHub CLI：`/opt/homebrew/bin/gh` 可用，账号 `estelledc` 已登录。

## 已完成切片

1. 复核 `docs/operations-index.md`，确认第 3 节仍把旧集成收口写作当前状态。
2. 修改第 3 节为“当前优先模式：从已接受基线启动”。
3. 保留“集成收口”作为未来条件规则，满足现有 agent-progression 测试契约。
4. 更新 `CHANGELOG.md` 记录状态文档修正。

## 下一条命令

继续从当前分支验证：

```bash
cd /Users/bytedance/intern-journal/explorations/embodied-ai/site
PATH="/opt/homebrew/bin:$PATH" node --test scripts/agent-progression.test.mjs scripts/workflow.test.mjs
cd ..
git diff --check
```

验证通过后逐文件 commit、push、创建 Draft PR，等待 CI 成功后标记 ready 并 merge。
