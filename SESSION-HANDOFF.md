---
status: waiting_for_explicit_run
scope: progression-method-only
activated_by: user-request-2026-07-12
review_after: next-agent-launch
budget: no-active-run
external_outcome: local-review-ready-progression-contract
stop_conditions: method-contract-verified-no-product-integration
superseded_by: none
start_ref: 9d62a5bcff39d4a73abffce74be8d507b71ae461
---

# 当前接班

当前没有活动产品 run。推进方式重构完成后，等待用户单独创建 agent，并由新 agent 显式声明有限 run contract；本文件不是自动续跑或产品修改授权。

## 先读什么

1. `AGENTS.md`：绑定的推进、权限和停止规则。
2. `docs/operations-index.md`：唯一活动操作入口与测试阶梯。
3. 本文件：当前接班锚点。
4. `CHANGELOG.md`、`PLAN-1.3.md` 与专项文档：只在本轮 scope 需要时读取。

## 两条状态线

- 远端已接受基线：本轮刷新时 `origin/main` 为 `9d62a5bcff39d4a73abffce74be8d507b71ae461`。每次接班仍须先 fetch 并实时复核。
- 本地实现候选：`codex/eai13-t010-asset-generation` 的不可变锚点为 `c57a281395948afbba9346845825a37cc5b0347f`。它基于旧基线，承载 EAI13 T001–T011 的本地实现，尚未成为远端已接受状态；远端后续提交与其存在重叠路径。

本地 commit 和测试证据只说明实现候选存在，external outcome 仍是 local review-ready，D 轴没有提升到 reviewer accepted、merged 或 deployed。

## 本轮完成切片

- 把路线图驱动改为有限 run contract：六字段合同、默认预算、单写者、单切片循环和三批无 external delta 停止门。
- 增加有限 campaign：用户显式激活后可在同一目标、scope、总预算和权限内自动续 run，不逐片或逐 run 等待确认。
- 建立单一操作索引和当前 handoff，明确 roadmap/plan/progress/deep-read 文档都不是自动队列。
- 把现有产品栈与本次流程分支分离；未执行 rebase、merge、cherry-pick、产品修复或远端发布。

## 验证结果

- 基线：父仓 `make harness-check` 为 0 error、0 warning。
- 子仓 `node --test scripts/agent-progression.test.mjs scripts/workflow.test.mjs`：9/9 通过。
- 子仓 `npm run test:unit`：88/88 通过；本轮未改产品实现，因此没有扩大到 build、浏览器或部署验证。
- 父仓 `make lint`：542 files 通过；改动后的 `make harness-check` 仍为 0 error、0 warning。
- 父仓 `make check`：offline eval 7/7、pytest 231/231 及其余索引/渲染门禁全部通过。
- 父仓与子仓 `git diff --check`：通过。

## Blocker 与下一步

- Blocker：后续产品推进必须先决定如何把本地 EAI13 实现栈与最新远端基线集成；本文件不替用户选择历史改写或合并策略。
- 当前没有 active campaign；未来提示词必须给出有终点的 objective、`total_budget`、`review_after` 和逐项外部权限后才能自动续 run。
- 禁止自动进入：PLAN Batch 8 Lab、Batch 9 llava 核验、批量精读、季度收录或仓库外实验。
- 下一条命令：`git status --short --branch && git fetch origin main && git rev-list --left-right --count origin/main...HEAD`。

不要在 handoff 中复制易过期数量或 ETA；需要数量时使用实时命令。
