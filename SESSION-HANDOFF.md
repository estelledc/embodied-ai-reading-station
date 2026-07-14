---
status: completed
program_status: ACTIVE
cycle_state: DEPLOYED
cycle_id: EAIRS-CYCLE-20260714-FIVE-PAPER-ASSETS
activated_by: user-explicit-five-paper-research-deploy
scope: five-paper-generated-assets-and-provenance-deploy
branch: main
start_ref: 54b0260d91506bff9d5df8c2598b90a5b6c400da
baseline_ref: origin/main
review_after: next user wake or new bounded research cycle
total_budget: PR #28 + 1 writer / completed cycle
external_outcome: pr-28-merged-and-pages-deployed
superseded_by: none
---

# 当前接班：五篇论文生成资产与 provenance 已部署

## Cycle 合同

**research_question**：能否在不放宽 provenance / Data API / 资产门禁的前提下，把五篇既有论文的 card / inline 生成资产、receipt 证据和 provenance 记录完整部署到公开站点？

**hypothesis**：当前本地候选栈已经包含五篇论文的生成资产与 provenance 更新；只要补齐 receipt 证据和回归测试，就能通过本地完整门禁、PR CI、main Pages deploy 与线上冒烟。

**falsifier**：若新增/修改的二进制资产无法通过治理门禁、generated_assets 无法与 Git blob / receipt / content_commit 闭合，或 Pages 部署后公开资源无法访问，则本 cycle 停止，不把半成品写成已部署。

**objective**：收口五篇既有论文的 generated assets：`1x-world-model-2025`、`3d-diffusion-policy`、`act-aloha`、`florence-2`、`panoradar`。范围包括 card / inline WebP、`papers/provenance.json`、portable receipts 和 provenance 回归测试；该目标已通过 PR #28 合并并部署完成。

**scope**：
- `site/src/images/cards/{slug}.webp`
- `site/src/images/cards/{slug}-800.webp`
- `site/src/images/inline/{slug}-scene.webp`
- `site/src/images/inline/{slug}-scene-800.webp`
- `site/src/images/inline/{slug}-method.webp`
- `site/src/images/inline/{slug}-method-800.webp`
- `papers/provenance.json`
- `.tmp-receipts/{slug}-assets.json`
- `site/scripts/lib/provenance.mjs`
- `site/scripts/lib/provenance.test.mjs`
- `SESSION-HANDOFF.md`
- 明确排除：新增论文正文、Lab、仓库外 MuJoCo/SmolVLA 实验、owner 设置、历史 issue / v1.2 runbook 数字回写、未跟踪的一次性根目录 `scripts/`。

**selected_candidates**：
- `1x-world-model-2025`
- `3d-diffusion-policy`
- `act-aloha`
- `florence-2`
- `panoradar`

**rejected_candidates**：
- 新增 5 篇全新 note 正文：本轮实际承接的是已有本地五篇资产/provenance 候选栈，不扩大到新正文生产。
- Lab / Task 2 实验内容：缺真实 E4 artifact；本轮不做。

**primary_sources**：
- 现有 `notes/{slug}.md` deep-read 笔记。
- 现有 topic images：`site/src/images/topics/{topic}.webp`。
- 本轮新增 portable receipt：`.tmp-receipts/{slug}-assets.json`。
- canonical provenance：`papers/provenance.json`。

**acceptance_checks**：
- `PATH="/opt/homebrew/bin:$PATH" npm run test:unit`
- `PATH="/opt/homebrew/bin:$PATH" npm run build`
- `PATH="/opt/homebrew/bin:$PATH" npm run check`
- `PATH="/opt/homebrew/bin:$PATH" SITE_BASE=/embodied-ai-reading-station npm run build`
- `PATH="/opt/homebrew/bin:$PATH" npm run check`
- `git diff --check`
- PR #28 CI `Validate pull request / build` 成功。
- main Pages workflow `29325347553` build + deploy 成功。
- 线上 `data/v2/provenance.json`、五个论文页、5 个 card-800、5 个 method-800、5 个 scene-800 图片资源均 HTTP 200。

**run budget**：本 cycle 使用 1 个内容 PR、1 个 writer；已完成，不继续在该 scope 上叠加 Lab 或本地实验声明。

**权限边界**：用户要求“全流程部署”，本轮执行了 branch push、PR、merge 与 Pages deploy 验证；仍禁止 force push、直接写 `main`、owner 设置或伪造 E4。

**stop_conditions**：
- provenance / asset 记录无法在不放宽门禁下闭合。
- 需要下载大体积论文 PDF / 代码仓 / 模型权重或运行付费/GPU/真机资源。
- PR CI 或 mergeability 进入外部 blocker。

## 当前状态

- 源实现锚点：`54b0260d91506bff9d5df8c2598b90a5b6c400da`（PR #27 merge 后 main；本轮从该已接受基线上的本地五篇资产候选栈开始）。
- main 合并结果：
  - [PR #28](https://github.com/estelledc/embodied-ai-reading-station/pull/28)：`423d35ddecf25c999212678ff0e8e4abb537abae`
- Deploy 结果：
  - [Deploy reading station to GitHub Pages #29325347553](https://github.com/estelledc/embodied-ai-reading-station/actions/runs/29325347553)：success，head SHA `423d35ddecf25c999212678ff0e8e4abb537abae`。
- 线上冒烟：
  - `https://estelledc.github.io/embodied-ai-reading-station/data/v2/provenance.json`：200，`schema_version=2.0.0`，`content_commit=f648ea2d1028b255cfaf279e6722e198029209f2`。
  - 五篇目标论文的公开页面均 200。
  - 五篇目标论文的 `images/cards/*-800.webp`、`images/inline/*-method-800.webp`、`images/inline/*-scene-800.webp` 均 200。
- 本地工作树：
  - `main` 与 `origin/main` 对齐在 `423d35ddecf25c999212678ff0e8e4abb537abae`。
  - 仍有未跟踪根目录 `scripts/`，包含一次性批处理脚本；本轮有意未纳入 PR。
- GitHub CLI：`/opt/homebrew/bin/gh` 可用，账号 `estelledc` 已登录。

## 已完成切片

1. 从实时 `main` 复核本地候选栈：`f648ea2` 新增五篇资产，`89576b4` 刷新 `content_commit`，另有未提交 provenance 测试修正、receipt 与一次性脚本。
2. 跑本地基线：`npm run test:unit` 342 passed；root build 成功；root `npm run check` 160 passed；`SITE_BASE=/embodied-ai-reading-station npm run build` 成功；repo-base `npm run check` 160 passed；`git diff --check` 干净。
3. 只提交五个 receipt 与 `site/scripts/lib/provenance.test.mjs`，未提交一次性根目录 `scripts/`。
4. 创建分支 `codex/five-paper-asset-provenance`，推送并创建 PR #28。
5. PR #28 CI `Validate pull request / build` 通过。
6. PR #28 合并到 main，触发 Pages workflow。
7. Pages workflow build + deploy 成功。
8. 线上 data、五篇论文页和新增图片资源冒烟通过。

## 下一条命令

从最新 main 开始新的有限 cycle：

```bash
git fetch origin main
git switch main
git pull --ff-only origin main
git status --short --branch
```

下一轮若用户真正要“新增 5 篇全新论文正文”，必须先按 `AGENT-DEEPREAD.md` 明确选题和一手来源；不要把本轮五篇既有论文的资产部署误记为新增 note 计数。若要清理本地 `scripts/`，先确认这些一次性脚本不再需要，再用安全删除流程处理。
