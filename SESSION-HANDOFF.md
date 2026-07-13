---
status: completed
program_status: ACTIVE
cycle_state: INTEGRATED
cycle_id: EAIRS-CYCLE-20260713-SMOLVLA-LEROBOT-CLOSURE
activated_by: user-permanent-research-program
scope: smolvla-lerobot-guide-drift-and-data-source-tightening
branch: main
start_ref: c5365a1b0c8fea62f8d48149eeb580f38cca8308
baseline_ref: origin/main
review_after: next user wake or new bounded research cycle
total_budget: 2 merged PRs / 1 writer / completed cycle
external_outcome: pr-17-and-pr-18-merged
superseded_by: none
---

# 当前接班：SmolVLA / LeRobot 事实修正已合并

## Cycle 合同

**research_question**：`guide/` 与 `notes/smolvla.md` 中关于 SmolVLA / LeRobot 的年份、动作头、训练入口、环境版本和社区数据来源，是否与一手来源和固定 release 证据一致？

**objective**：修正已定位的 SmolVLA / LeRobot 事实漂移，并通过可审查 PR 合入 main。

**scope**：
- `guide/ch22-task-guide.md`
- `guide/ch12-openvla-vlas-mla.md`
- `notes/smolvla.md`
- `papers/provenance.json`
- `CHANGELOG.md`
- `SESSION-HANDOFF.md`
- 明确排除：新建 `notes/lerobot.md`、开启 Lab、声明任何 MuJoCo/SmolVLA/VLA 实验已跑通、修改 owner 设置、部署。

**primary_sources**：
- `arxiv-2506.01844`：SmolVLA arXiv abs，Submitted on 2 Jun 2025。
- `hf-smolvla-blog`：Hugging Face SmolVLA blog，SmolVLA-450M、消费级硬件与异步推理定位。
- `hf-smolvla-base-readme`：`lerobot/smolvla_base` README，flow matching 和 public import path。
- `lerobot-v0.6.0`：LeRobot GitHub release / `pyproject.toml` / `src/lerobot/policies/smolvla/`，`lerobot-train` 与 Python `>=3.12`。
- `hf-lerobot-dataset-api`：`lerobot/svla_so100_pickplace`、`lerobot/svla_so100_stacking`、`lerobot/svla_so100_sorting` 的公开 Hub 状态。

**acceptance_checks**：
- PR #17 CI `Validate pull request / build` 成功并合并。
- PR #18 CI `Validate pull request / build` 成功并合并。
- `PATH="/opt/homebrew/bin:$PATH" npm run test:unit` 通过。
- `PATH="/opt/homebrew/bin:$PATH" npm run build` 通过。
- `PATH="/opt/homebrew/bin:$PATH" npm run check` 通过。
- `git diff --check` 通过。

**run budget**：本 cycle 使用 2 个写入 PR、1 个 writer；已完成，不继续在该 scope 上叠加新 Lab 或新 note。

**权限边界**：用户已授权 review / merge；已通过 PR 流程合并。禁止 force push、直接写 `main`、deploy 或修改 owner 设置。

**stop_conditions**：
- 当前 scope 已合并完成。
- 下一轮必须从最新 `origin/main` 重新声明有限 run contract。
- 不放宽证据等级，不把计划或估算写成 E4 实验结果。

## 当前状态

- 源实现锚点：cycle 起点为 `c5365a1b0c8fea62f8d48149eeb580f38cca8308`。
- main 合并结果：
  - [PR #17](https://github.com/estelledc/embodied-ai-reading-station/pull/17)：`1e41181c15adadb42c9c23dbc59b6acb0a7bc6c2`
  - [PR #18](https://github.com/estelledc/embodied-ai-reading-station/pull/18)：`6bc29033060fef2a1a735b151229ce4df9a65f89`
- GitHub CLI：`/opt/homebrew/bin/gh` 可用，账号 `estelledc` 已登录。
- 本 handoff 更新会通过独立 PR 合入；读取时仍需用 `git fetch origin main` 复核 `origin/main`。

## 已完成切片

1. `guide/ch22-task-guide.md`：补充证据边界；把 SmolVLA 从旧的 diffusion/head 路径叙述改为 flow-matching action expert；将训练入口改为 LeRobot v0.6.0 的 `lerobot-train`；拆分 MuJoCo / robosuite Python 3.10 与 LeRobot v0.6.x Python 3.12+ 环境。
2. `guide/ch12-openvla-vlas-mla.md`：将 SmolVLA 时间线校正为 2025.06，参数量校正为约 450M，避免“2024.11 / ~3B / 6 个月内”旧说法。
3. `SESSION-HANDOFF.md`：替换旧 EAI13 完成态 handoff，记录 PR #17 创建与合并过程。
4. `notes/smolvla.md`：收窄社区数据来源描述，保留“公开、许可证兼容、LeRobot 社区数据”结论，移除缺少当前一手来源支持的泛化机械臂示例。
5. `papers/provenance.json` 与 `CHANGELOG.md`：登记 SmolVLA note hash 和内容快照。

## 发现但未写入的新候选

- `notes/lerobot.md` 与 `papers/lerobot/` 仍缺失；`arxiv-2602.22818` 可作为主论文 ID，OpenReview `CiZMMAFQR3` 可作为 ICLR 2026 接受页面，LeRobot `v0.6.0` 可作为代码 release 锚点。
- 该候选不是“顺手补一篇 note”：当前 provenance v2 与站点门禁冻结 156 篇 inventory。新增第 157 篇 note 需要显式新 cycle，连同 provenance/API/文档计数一起设计验收。
- `VLM_Grasp_Interactive` 实验线仍只能在真实环境、模型权重、API 凭证和许可边界明确后推进；不能编造 E4。

## 下一条命令

从最新 main 开始新的有限 cycle：

```bash
git fetch origin main
git switch main
git pull --ff-only origin main
git status --short --branch
```

下一轮如果要推进 `notes/lerobot.md`，先声明包含 provenance/API 计数更新的独立 run contract；如果只做只读研究，必须产出明确可复查的 Knowledge Delta，不要为维持活跃制造无意义 diff。
