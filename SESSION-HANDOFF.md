---
status: completed
program_status: ACTIVE
cycle_state: INTEGRATED
cycle_id: EAIRS-CYCLE-20260713-LEROBOT-NOTE-V157
activated_by: user-explicit-lerobot-note-bounded-cycle
scope: add-lerobot-note-and-expand-inventory-to-157
branch: main
start_ref: a7812e79aa4b82d9da36e30604e65e49bc34abc2
baseline_ref: origin/main
review_after: next user wake or new bounded research cycle
total_budget: PR #24 + 1 writer / completed cycle
external_outcome: pr-24-merged
superseded_by: none
---

# 当前接班：新增 LeRobot note 并扩展 inventory 到 157 已合并

## Cycle 合同

**research_question**：能否在不放宽 provenance / Data API / deep-read / 资产门禁的前提下，把 LeRobot 作为第 157 篇笔记纳入站点？

**hypothesis**：LeRobot 具备 E2 论文 / OpenReview 证据和 E3 release /源码证据，且与 Task 2 的 LeRobotDataset、SmolVLA、评估部署闭环高度相关，值得作为独立 note 收录。

**falsifier**：若无法获得一手来源、无法满足 deep-read 结构 / 字数 / 视觉门禁，或 156→157 需要放宽 provenance / data API / asset checks，则本 cycle 停止，不合并半成品。

**objective**：新增 `notes/lerobot.md`，同步 provenance v2、Data API、当前公开计数、测试期望和必要展示逻辑，使站点从 156 篇扩展到 157 篇且完整门禁通过。该目标已通过 PR #24 合并完成。

**scope**：
- `notes/lerobot.md`
- `papers/provenance.json`
- `README.md`
- `site/content/faq.md`
- `site/content/path.md`
- `site/content/math-primer.md`
- `site/scripts/check.mjs`
- `site/scripts/lib/content.test.mjs`
- `site/scripts/lib/provenance.test.mjs`
- `site/scripts/lib/responsive-images.test.mjs`
- `site/scripts/lib/views/meta.mjs`
- `CHANGELOG.md`
- `SESSION-HANDOFF.md`
- 明确排除：Lab、仓库外 MuJoCo/LeRobot 实验、deploy、owner 设置、`notes/smolvla.md` 正文改写、历史 issue / v1.2 runbook 数字回写、新增二进制图片资产。

**selected_candidate**：LeRobot ICLR 2026 / v0.6.0 release。

**rejected_candidates**：
- Lab / Task 2 实验内容：缺真实 E4 artifact；本轮不做。
- LeRobot 本地安装 / 训练 / 评估：本轮只做 E2/E3 研究工件，不声明 E4。

**primary_sources**：
- `arxiv-2602.22818`：LeRobot 论文，Submitted on 26 Feb 2026。
- `openreview-CiZMMAFQR3`：ICLR 2026 Poster 页面。
- `lerobot-v0.6.0-release`：GitHub release `v0.6.0`，commit `30da8e687a6dfc617fcd94afc367ac7071c376ce`。
- `lerobot-v0.6.0-pyproject`：固定 tag `pyproject.toml`，Python / torch / extras / CLI 事实。
- `lerobot-v0.6.0-readme`：固定 tag README，Robot / Dataset / Policy / Eval 入口。
- `hf-lerobot-v060-blog`：v0.6.0 release blog，world models、VLA、reward models、dataset、benchmark、rollout 等 release 事实。

**acceptance_checks**：
- `PATH="/opt/homebrew/bin:$PATH" npm run test:unit`
- `PATH="/opt/homebrew/bin:$PATH" npm run build`
- `PATH="/opt/homebrew/bin:$PATH" npm run check`
- `git diff --check`
- PR #24 CI `Validate pull request / build` 成功并合并。

**run budget**：本 cycle 使用 1 个内容 PR、1 个 writer；已完成，不继续在该 scope 上叠加 Lab 或本地实验声明。

**权限边界**：用户已授权 `gh`、review 和 merge；仍禁止 force push、直接写 `main`、deploy、owner 设置或伪造 E4。

**stop_conditions**：
- provenance / asset 记录无法在不放宽门禁下闭合。
- 需要下载大体积论文 PDF / 代码仓 / 模型权重或运行付费/GPU/真机资源。
- PR CI 或 mergeability 进入外部 blocker。

## 当前状态

- 源实现锚点：`a7812e79aa4b82d9da36e30604e65e49bc34abc2`（PR #23 merge 后 main）。
- 实时 PR：开始本轮时 open PR 为空。
- 基线检查：编辑前 `PATH="/opt/homebrew/bin:$PATH" npm run check` 有 159 passed / 1 failed；唯一失败为 `sw.js BUILD_ID drift`，判断是现有 `dist/` 未按当前 commit 重建，后续以先 `npm run build` 再 `npm run check` 为准。
- main 合并结果：
  - [PR #24](https://github.com/estelledc/embodied-ai-reading-station/pull/24)：`9d7a6d794bd3d78f2374f3d53794915737cbb1c6`
- GitHub CLI：`/opt/homebrew/bin/gh` 可用，账号 `estelledc` 已登录。

## 已完成切片

1. 确认 `notes/` 与 provenance 中无 `lerobot`，当前最大 `num` 为 156。
2. 锁定 LeRobot 一手来源：arXiv、OpenReview、GitHub `v0.6.0` release、固定 tag README / `pyproject.toml`、HF release blog。
3. 新增 `notes/lerobot.md` deep-read 草稿，约 5,100 words，含 3 个 ASCII 图和强制章节。
4. 因治理层禁止新增二进制资产，将 `lerobot` 保留为长篇 `auto-summary` 研究笔记，并让论文卡片复用既有 `dataset-eval` topic 图 fallback。
5. 将当前公开计数和测试期望从 156 调到 157；历史 issue / v1.2 runbook 数字保持不变。
6. 更新 provenance v2，新增 `lerobot` remote source，保持 generated_assets 为 0。
7. 更新 CSP style attribute 精确预算，并通过完整门禁。
8. PR #24：CI `Validate pull request / build` 通过并合并到 `origin/main`。

## 下一条命令

从最新 main 开始新的有限 cycle：

```bash
git fetch origin main
git switch main
git pull --ff-only origin main
git status --short --branch
```

下一轮若要把 `lerobot` 升级为 `deep-read`，必须先解决 note-specific inline/card 资产的 rights discriminator 或正式资产治理流程，不能直接新增二进制图片绕过门禁。
