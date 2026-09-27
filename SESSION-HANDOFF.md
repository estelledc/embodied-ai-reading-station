---
status: completed
program_status: ACTIVE
cycle_state: PRS_OPEN_AWAITING_OWNER
cycle_id: EAIRS-CAMPAIGN-20260927-READ-TO-DO
activated_by: user-explicit-multi-front-refactor-all-permissions-2026-09-27
scope: ci-audit-fix + task-paper-verification + lab-workspace + process-refocus
branch: cursor/content-verification-3ddf, cursor/lab-read-to-do-3ddf, cursor/process-refocus-3ddf
start_ref: 7bc75844de37a81c5c63db2a7a4130d3adacfcaa
baseline_ref: origin/main
review_after: owner-review-of-pr-54-55-56
total_budget: 8 runs or 24 hours; 1 writer per worktree; read-only audits may run in parallel
external_outcome: three-draft-prs-open-all-ci-green-awaiting-owner-review
superseded_by: none
---

# 当前接班：从读到做 campaign（2026-09-27）

历史接班记录（2026-07 的各轮论文扩充与工程 cycle）已移到 [docs/archive/session-handoff-2026-07.md](docs/archive/session-handoff-2026-07.md)。

## Campaign 合同

**objective**：把项目重心从“AI 转述别人的论文”转到“本人能拿出的证据”。终点是三个独立 PR 都已创建、CI 结果记录在案，并完成本 handoff。三个 PR 分别负责：
- 恢复 PR 依赖审计门禁；
- 逐条核验 13 篇任务论文笔记与 LLaVA deck；
- 建立可运行的实践工作区 `lab/`；
- 把流程文档、handoff 与进度页的默认方向改为学习优先。

**scope**：
- [PR #54](https://github.com/estelledc/embodied-ai-reading-station/pull/54) `cursor/content-verification-3ddf`：13 篇任务笔记、`notes/tracevla.md`、`notes/openvla-oft.md`、`deck/index.html`、`research-task.md` 注释、`docs/verification-log.md`、`papers/provenance.json` 内容快照、`site/scripts/wire-paper-images.mjs` 图注、CSP style 预算。
- [PR #55](https://github.com/estelledc/embodied-ai-reading-station/pull/55) `cursor/lab-read-to-do-3ddf`：`lab/**`、`site/content/tutorials.md`、README “从读到做”一节、`.github/workflows/pr.yml` 的 `lab` 任务。
- [PR #56](https://github.com/estelledc/embodied-ai-reading-station/pull/56) `cursor/process-refocus-3ddf`：`AGENTS.md`、本文件、`docs/operations-index.md`、`ROADMAP.md`、`PLAN-1.3.md`、README 简介与项目结构、`progress.md`、`docs/archive/**`、playbook 路径。
- 三个 PR 都包含一个内容相同的 `js-yaml` 3.14.2 → 3.15.2 提交。
- 明确排除：新增论文、生产资产、merge 与 deploy（没有收到明确的 merge 指令）、owner 仓库设置、GPU 训练结论、替本人编写实践日志。

**acceptance_checks**：
- `cd site && npm run test:unit`（350 passed）
- `npm run build` + `npm run check`（160 passed）
- `SITE_BASE=/embodied-ai-reading-station npm run build` + `npm run check`（160 passed）
- `npm audit --audit-level=high`（0）
- `node site/scripts/generate-provenance.mjs --check`
- `python -m pytest -q lab`（在只装 `lab/requirements.txt` 的干净环境中：51 passed，5 skipped）
- `git diff --check origin/main...HEAD`
- 三个 PR 的 CI

**run budget**：每个 run 最多 3 个切片；每个工作树同时只有 1 个写者。只读审计可以并行；并行写入只在各自独立的 git worktree 中进行。本 campaign 用了 4 个 run。

**权限边界**：用户授权“所有权限”。本轮执行了分支 push 和创建 draft PR；没有 merge、没有 deploy，因为系统规则要求明确的 merge 指令。禁止 force push、直接写 `main`、改 owner 设置、伪造实践记录。

**stop_conditions**：
- 需要 owner 评审或合并（当前停在这里）；
- 需要 NVIDIA GPU 或付费资源；
- 需要放宽门禁；
- 工作树出现无法解释的重叠；
- 连续三批没有 external delta。

## 当前状态

- 源实现锚点：`7bc75844de37a81c5c63db2a7a4130d3adacfcaa`。三条分支都从这里出发，改动文件互不重叠。
- CI 结果（GitHub）：
  - PR #54：`Validate pull request / build` 成功；
  - PR #55：`build` 与新增的 `lab` 两个任务均成功；
  - PR #56：`build` 成功。
- 合并模拟：在临时 worktree 里按 #54 → #55 → #56 和 #56 → #55 → #54 两种顺序合并，都没有冲突。合并结果上，下面这些都通过了：
  - 350 项单测；
  - root 与 repo-base 各 160 项检查；
  - `generate-provenance.mjs --check`；
  - lab 51 passed、5 skipped；
  - `npm audit --audit-level=high` 为 0。
- 合并顺序可以任意：
  - CSP style 预算只在 #54 里改动（5146/207 → 5150/206，来自年份与会议字段变化带来的统计页柱宽变化）；
  - CHANGELOG 三处新增分别写在 Added、Changed、Fixed 小节；
  - `js-yaml` 提交在三个 PR 里内容相同。
- 外部证据：PR #54 的 CI 状态把 `Validate pull request / build` 标为 required，说明 owner 已配置必需检查；main 保护规则与 Pages environment 仍未核实，`EAI13-T012` 不写成已关闭。
- 本 campaign 中一个隔离子任务（best-of-n-runner）没有使用独立 worktree，把 `/workspace` 切到了它自己的分支。发现后已切回 `main`，它的 4 个提交摘入 `cursor/lab-read-to-do-3ddf`，远端临时分支已删除。

## 已完成切片

1. **CI 恢复**：`npm audit --audit-level=high` 因 2026 年新公布的 `js-yaml` DoS 公告失败，最小升级到 3.15.2 后归零。
2. **任务论文核验（#54）**：
   - 5 个只读子任务并行对照 `papers/<slug>/paper.md` 审计，再在 5 个独立 worktree 里逐条复核后修改；
   - 改正 51 处 P0、171 处 P1，另有 60 项留给人工核对；
   - 少数条目另用 arXiv、Crossref、Hugging Face 元数据核实：EMNLP 2025、CLAY 作者、Manipulate-Anything 作者、Acoustic Swarms 作者、Vicuna-13B 维度、OpenVLA norm_stats。
3. **实践工作区（#55）**：
   - 阶段 1：两个 numpy 练习，留 `TODO`，附参考答案和自检；
   - 阶段 2：环境自检脚本与上手指南；
   - 阶段 3：MuJoCo 抓取场景，脚本专家在 100/100 个种子上成功，外加 LeRobotDataset 导出、SmolVLA 微调与评估；
   - CI 新增 `lab` 任务。
4. **流程减负（#56）**：
   - 10 份历史文档和 2026-07 接班记录移入 `docs/archive/`；
   - `AGENTS.md` 新增“默认方向”；
   - 操作索引、ROADMAP、PLAN-1.3、README、`progress.md` 按“先做，再扩”更新。

## 验证结果

- 三条分支各自：
  - `npm run test:unit` 350 passed；
  - root 与 repo-base `npm run check` 均 160 passed、0 failed；
  - `npm audit --audit-level=high` 0；
  - `git diff --check origin/main...HEAD` 干净。
- #54 额外：`generate-provenance.mjs --check` 通过；所有改动过的笔记仍 ≥ 4000 字，必需章节齐全，表格列数一致。
- #55 额外：云端 CPU（Ubuntu 24.04.4，Python 3.12.3，MuJoCo 3.14.0，LeRobot 0.6.0，torch 2.11.0+cpu）上，`LAB_RENDER=1 LAB_SLOW=1` 全部通过。其中 SmolVLA 2 步 CPU 微调 loss 从 2.53 降到 2.09，评估成功率 0/2 符合预期；真实 CLIP ViT-L/14 输出 (1, 257, 1024)。

## 剩余 blocker

- owner 评审并合并 #54、#55、#56。
- 阶段 2 需要一台有 NVIDIA 显卡的 Linux 机器。
- 阶段 3 的真实微调需要 GPU。
- 站点 Lab 板块（PLAN-1.3 批次 8 的前三项）要等 #54 和 #55 合并后，从新的 `main` 单独实现，并同步 CSP 预算。
- 13 篇任务论文的 `human_verification` 仍为 `UNVERIFIED`。

## 下一条命令

```bash
gh pr checks 54 --repo estelledc/embodied-ai-reading-station
gh pr checks 55 --repo estelledc/embodied-ai-reading-station
gh pr checks 56 --repo estelledc/embodied-ai-reading-station
```

三个 PR 都合并后：

```bash
git fetch origin main && git switch main && git pull --ff-only origin main && git status --short --branch
```
