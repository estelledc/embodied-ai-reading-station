---
status: active_campaign
program_status: WAIT_REVIEW
cycle_state: EVIDENCE_READY
cycle_id: EAIRS-CYCLE-20260713-SMOLVLA-LEROBOT-DRIFT
activated_by: user-permanent-research-program
scope: smolvla-lerobot-guide-drift
branch: codex/smolvla-lerobot-guide-drift
start_ref: c5365a1b0c8fea62f8d48149eeb580f38cca8308
baseline_ref: origin/main
review_after: when PR #17 CI/review completes or origin/main changes
total_budget: 3 slices / 1 writer / current cycle only
external_outcome: draft-pr-created
superseded_by: none
---

# 当前接班：SmolVLA / LeRobot 事实漂移修复

## Cycle 合同

**research_question**：`guide/` 中 Task 2 与 Ch12 的 SmolVLA / LeRobot 说法，是否和一手来源中的 SmolVLA 2025 事实、LeRobot v0.6.0 入口和 Python 要求一致？

**objective**：修正当前指南中可定位的 SmolVLA / LeRobot 事实漂移，并形成一个可审查的单分支变更。

**scope**：
- 内容源真相：`guide/ch22-task-guide.md`、`guide/ch12-openvla-vlas-mla.md`。
- 运行交接：`SESSION-HANDOFF.md`。
- 明确排除：新建 `notes/lerobot.md`、开启 Lab、声明任何 MuJoCo/SmolVLA/VLA 实验已跑通、修改 `main`、merge/deploy/owner 设置。

**primary_sources**：
- `arxiv-2506.01844`：SmolVLA arXiv abs，Submitted on 2 Jun 2025。
- `hf-smolvla-blog`：Hugging Face SmolVLA blog，SmolVLA-450M、消费级硬件与异步推理定位。
- `hf-smolvla-base-readme`：`lerobot/smolvla_base` README，flow matching 和 public import path。
- `lerobot-v0.6.0`：LeRobot GitHub release / `pyproject.toml` / `src/lerobot/policies/smolvla/`，`lerobot-train` 与 Python `>=3.12`。

**acceptance_checks**：
- `git status --short --branch` 显示 embodied-ai 子仓工作树可解释。
- `git rev-list --left-right --count origin/main...HEAD` 只显示当前分支相对 main 的提交。
- `git diff --check` 通过。
- `PATH="/opt/homebrew/bin:$PATH" node --test scripts/agent-progression.test.mjs scripts/workflow.test.mjs` 通过。
- 同范围旧事实模式扫描无 actionable residual drift；旧命令/旧路径只允许出现在“不要按旧版本默认入口使用”的证据边界中。

**run budget**：本 cycle 最多 3 个切片、1 个 writer；当前已用完写入切片，应等待 PR #17 的 CI / review / merge 结果。

**权限边界**：允许维护当前 fact-drift 分支并创建 Draft PR；禁止 force push、直接写 `main`、merge、deploy 或修改 owner 设置。

**stop_conditions**：
- PR #17 需要 CI、review 或 merge 决策。
- 当前 PR/分支未被接受、合并或关闭前，不启动第二个写入型 PR。
- 不放宽证据等级，不把计划或估算写成 E4 实验结果。

## 当前状态

- 本地分支：`codex/smolvla-lerobot-guide-drift`。
- 源实现锚点：`origin/main` at cycle start，当前值需用 `git rev-parse origin/main` 重新读取。
- 远端：`origin/codex/smolvla-lerobot-guide-drift` 已存在；重新检查时以 `git ls-remote origin refs/heads/codex/smolvla-lerobot-guide-drift` 为准。
- Pull Request：[#17](https://github.com/estelledc/embodied-ai-reading-station/pull/17) 已创建为 Draft PR。
- 相对 `origin/main` 的主题：SmolVLA 年份/参数量/动作头事实修正、LeRobot v0.6.0 训练入口和 Python 版本要求修正、当前 handoff 收口。
- GitHub CLI：`/opt/homebrew/bin/gh` 可用，账号 `estelledc` 已登录。

## 已完成切片

1. `guide/ch22-task-guide.md`：补充证据边界；把 SmolVLA 从旧的 diffusion/head 路径叙述改为 flow-matching action expert；将训练入口改为 LeRobot v0.6.0 的 `lerobot-train`；拆分 MuJoCo / robosuite Python 3.10 与 LeRobot v0.6.x Python 3.12+ 环境。
2. `guide/ch12-openvla-vlas-mla.md`：将 SmolVLA 时间线校正为 2025.06，参数量校正为约 450M，避免“2024.11 / ~3B / 6 个月内”旧说法。
3. `SESSION-HANDOFF.md`：替换旧 EAI13 完成态 handoff，记录当前分支和 PR blocker。

## 发现但未写入的新候选

- `notes/lerobot.md` 与 `papers/lerobot/` 仍缺失；OpenReview `CiZMMAFQR3` 可作为 LeRobot 独立研究候选的一手来源。
- 该候选暂不写入：当前 fact-drift 分支还没有 Draft PR 或 reviewer/owner 接受结果，按单活动写入 PR 规则先等待。

## 下一条命令

检查 PR #17 的 CI / review 状态：

`/opt/homebrew/bin/gh pr view 17 --json state,isDraft,mergeStateStatus,reviewDecision,statusCheckRollup,url`

若 CI 通过且 review/merge 条件满足，再按用户授权推进 ready for review / merge。若 PR 已合并或明确关闭，才考虑启动 LeRobot 独立笔记 cycle。
