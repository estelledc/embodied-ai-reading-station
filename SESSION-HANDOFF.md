---
status: active_campaign
program_status: ACTIVE
cycle_state: INTEGRATING
cycle_id: EAIRS-CYCLE-20260713-LEROBOT-TUTORIAL-V060
activated_by: user-continue-research
scope: lerobot-tutorial-v060-evidence-tightening
branch: codex/lerobot-tutorial-v060-evidence
start_ref: 8e85fa93279cc1a7fa50d92a69ad98df0c773e36
baseline_ref: origin/main
review_after: PR merge or next user wake
total_budget: 1 PR / 1 writer / 120 minutes
external_outcome: local-review-ready-change-set
superseded_by: none
---

# 当前接班：LeRobot v0.6.0 入门教程口径修正

## Cycle 合同

**research_question**：`site/content/tutorials.md` 中 LeRobot / SmolVLA 的版本、安装方式、CLI 入口、硬件和“能跑通”表述，是否仍符合当前一手来源与本站 E4 证据边界？

**hypothesis**：现有 tutorials 页仍带有旧 `examples/2_evaluate_pretrained_policy.py`、`examples/3_train_policy.py`、`v0.5.1` 和未核验硬件价格等过期或过强口径。

**falsifier**：若 LeRobot `v0.6.0` release、固定 tag README / `pyproject.toml` 仍支持这些旧入口和环境口径，则不应修改正文。

**objective**：在不触碰 156 篇论文 inventory 的前提下，把现有实践教程校正到 LeRobot `v0.6.0` 可复查入口，并明确本站未保存本地微调 / 真机执行 E4 artifact。

**scope**：
- `site/content/tutorials.md`
- `CHANGELOG.md`
- `SESSION-HANDOFF.md`
- 明确排除：新增 `notes/lerobot.md`、修改 `papers/provenance.json`、新增图片资产、开启 Lab、声明任何 MuJoCo/SmolVLA/VLA 实验已跑通、deploy 或 owner 设置。

**selected_candidate**：LeRobot tutorials 事实漂移修正。

**rejected_candidates**：
- `notes/lerobot.md`：价值高，但会触发 156→157 inventory、card/inline 资产、测试合同和公开文案成套修改；本轮不做。
- `VLM_Grasp_Interactive` Lab / 实验页：仍缺本地环境、模型权重、API 凭证和 E4 artifact；本轮不做。

**primary_sources**：
- `arxiv-2602.22818`：LeRobot arXiv abs，Submitted on 26 Feb 2026。
- `openreview-CiZMMAFQR3`：ICLR 2026 Poster 页面。
- `lerobot-v0.6.0-release`：GitHub release `v0.6.0`，commit `30da8e687a6dfc617fcd94afc367ac7071c376ce`，2026-07-06。
- `lerobot-v0.6.0-pyproject`：固定 tag `pyproject.toml`，`requires-python = ">=3.12"`，默认安装与 extras，`lerobot-*` CLI scripts。
- `lerobot-v0.6.0-readme`：固定 tag README，Robot Learning Tutorial、LeRobotDataset、CLI 和硬件支持概览。
- `arxiv-2506.01844` / `hf-smolvla-blog`：SmolVLA 450M、公开社区数据与 LeRobot 集成背景。

**acceptance_checks**：
- `PATH="/opt/homebrew/bin:$PATH" npm run build`
- `PATH="/opt/homebrew/bin:$PATH" npm run check`
- `git diff --check`
- GitHub PR CI `Validate pull request / build` 成功后再 merge。

**run budget**：最多 1 个写入 PR、1 个 writer、120 分钟；本轮只做 tutorials 口径修正。

**权限边界**：用户已授权 `gh`、review 和 merge；仍禁止 force push、直接写 `main`、deploy、owner 设置或伪造 E4。

**stop_conditions**：
- build/check 无法复现且只能放宽门禁。
- 发现 tutorials 修正必须扩大到 notes/provenance inventory。
- PR CI 或 mergeability 进入外部 blocker。

## 当前状态

- 当前分支：`codex/lerobot-tutorial-v060-evidence`。
- 源实现锚点：`8e85fa93279cc1a7fa50d92a69ad98df0c773e36`（PR #19 merge 后 main）。
- 实时 PR：开始本轮时 open PR 为空。
- 基线检查：编辑前 `PATH="/opt/homebrew/bin:$PATH" npm run check` 有 159 passed / 1 failed；唯一失败为 `sw.js BUILD_ID drift`，判断是现有 `dist/` 未按当前 commit 重建，后续以先 `npm run build` 再 `npm run check` 为准。

## 已完成切片

1. 锁定 LeRobot 一手来源：arXiv、OpenReview、GitHub `v0.6.0` release、固定 tag README 和 `pyproject.toml`。
2. 判定 `notes/lerobot.md` 新增不是本轮小切片：会触发 provenance/API/资产/测试计数成套变更。
3. 更新 `site/content/tutorials.md`：
   - 将 LeRobot 状态从 `v0.5.1` 收窄为 `v0.6.0` release。
   - 将旧 examples 入口替换为 `lerobot-info`、`lerobot-record`、`lerobot-replay`、`lerobot-train`、`lerobot-eval`。
   - 增加 Python `>=3.12` 与 `lerobot[training]` extras 提醒。
   - 去掉未核验硬件价格与“本站已跑通”暗示。
4. 更新 `CHANGELOG.md` 记录本轮修正。

## 下一条命令

继续从当前分支验证：

```bash
cd /Users/bytedance/intern-journal/explorations/embodied-ai/site
PATH="/opt/homebrew/bin:$PATH" npm run build
PATH="/opt/homebrew/bin:$PATH" npm run check
cd ..
git diff --check
```

验证通过后逐文件 commit、push、创建 Draft PR，等待 CI 成功后标记 ready 并 merge。
