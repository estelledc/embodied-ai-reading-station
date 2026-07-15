# Embodied AI 操作索引

这是仓库唯一的活动操作入口。它规定如何启动和收口一次有限 run；目标与依赖仍来自 `ROADMAP.md`、`PLAN-1.3.md` 和专项证据，但这些文档不自动授权执行。

常用专项入口：

- 批量论文 deep-read、资产、provenance、PR 和部署闭环：[`docs/paper-batch-campaign-playbook.md`](paper-batch-campaign-playbook.md)
- 单篇旧笔记升级参考：[`docs/paper-onboarding-guide.md`](paper-onboarding-guide.md)
- provenance v2 字段和证据合同：[`docs/provenance-v2-contract.md`](provenance-v2-contract.md)

入口优先级：批量新增、批量资产、部署和 handoff 先读批量 Playbook；`paper-onboarding-guide.md` 只保留为单篇旧笔记升级的 legacy 背景，不作为新 campaign 的执行入口。

## 1. 启动一次有限 run

未来独立 agent 先读取仓库根目录 `AGENTS.md` 和 `SESSION-HANDOFF.md`，然后在写入前声明：

```text
objective / scope / acceptance_checks / budget / external_outcome / stop_conditions
```

默认推进循环是：

```text
observe -> choose one bounded slice -> baseline -> implement -> verify -> record delta -> next slice or handoff
```

- 默认预算：最多 3 个切片或 120 分钟，以先到者为准。
- 同时只允许 1 个可写切片；只读调查可以并行。
- 同一 run contract 内，切片通过且预算未耗尽时可以直接进入下一片。
- 默认 external outcome 是本地 review-ready change set；未发生真实 review、merge 或 deploy 时，D 轴不提升。

### 连续 campaign

调用方明确要求持续推进时，先在 `SESSION-HANDOFF.md` 激活一份有终点的 campaign，并补充 `total_budget` 与 `review_after`。默认总预算为 12 个 run 或 24 小时；单个 run 的 3 切片 / 120 分钟 / 1 写者边界不变。

每个 run 结束后执行：

```text
verify -> checkpoint -> check campaign gates -> auto-start next run or handoff
```

同 scope、有剩余总预算、有可验收下一片、无需新权限且没有连续三批无 external delta 时，直接自动开启下一 run，不逐 run 询问。自动续 run 不包含远端或 owner 权限；这些动作必须在启动提示词中逐项授权。

## 2. 实时状态

每次接班都重新运行，不相信历史数量快照：

```bash
git status --short --branch
git fetch origin main
git rev-list --left-right --count origin/main...HEAD
git log --oneline --decorate --left-right origin/main...HEAD
git diff --stat origin/main...HEAD
```

若工作区已有用户改动，先检查重叠再决定是否能继续。`git fetch` 只刷新远端引用；它不授权 rebase、merge、push 或改写历史。

## 3. 当前优先模式：从已接受基线启动

截至 `SESSION-HANDOFF.md` 记录的最新完成态，远端 `main` 已经是当前已接受基线，open PR 为空；后续 run 应先按第 2 节重新 fetch / 对齐 `origin/main`，再声明新的有限 run contract。

如果未来再次出现“本地实现栈未进入远端已接受基线，同时 `main` 已有后续改动”的状态，才切回“集成收口”优先：单独设计合同，冻结 source/target ref，盘点重叠路径，选择 merge/cherry-pick 等非破坏性策略，写独立验收，并在实际修改前确认授权。

没有明确激活的 Lab、核验或季度内容 scope 时，不直接进入 PLAN 的 Batch 8 Lab、Batch 9 核验或新季度内容，也不在临时流程分支上搬运产品提交。本文件不替用户选择集成策略。

## 4. 小范围测试阶梯

流程文档改动：

```bash
cd site
node --test scripts/agent-progression.test.mjs scripts/workflow.test.mjs
cd ..
git diff --check
```

单组件代码改动先运行对应 `*.test.mjs`。跨构建层时再升级：

```bash
cd site
npm run test:unit
npm run build
npm run check
SITE_BASE=/embodied-ai-reading-station npm run build
npm run check
```

涉及生成产物、Service Worker、CSP、响应式布局或可访问交互时，按专项文档追加确定性或真实浏览器矩阵。没有真实运行时，不把静态断言冒充浏览器、VoiceOver/NVDA、GitHub 设置或部署证据。

## 5. 分支、交接与外部动作

- 一份 run contract 对应一个交付分支；最多 3 个切片，切片各自可解释、可回滚。
- 不再为连续依赖任务创建层层相叠、各自声称独立 PR 的分支。需要独立 PR 时，从已接受基线启动独立 run。
- `SESSION-HANDOFF.md` 只保存接班锚点和下一条安全命令，不保存 ETA 或自动续跑授权。
- active campaign 是例外：handoff 可以保存用户显式激活的 campaign 字段与剩余预算，但不得自行扩大 scope；达到 `review_after` 后必须重新审视证据与停止门。
- commit、push、PR、merge、owner 设置和 deploy 分别授权；dry-run、测试通过或本地 commit 不能替代下一步权限。
