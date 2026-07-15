---
status: in_progress
program_status: ACTIVE
cycle_state: IMPLEMENTING
cycle_id: EAIRS-CYCLE-20260715-FORTY-PAPERS-BATCH10
activated_by: user-explicit-continue-autonomous-embodied-ai-research
scope: ten-batches-forty-new-papers-batch10-four-deep-read-notes
branch: codex/forty-papers-batch10
start_ref: b153945
baseline_ref: origin/main
review_after: batch10 deploy or blocker
external_outcome: notes-assets-provenance-ready-pending-local-validation-pr-ci-merge-pages-deploy
superseded_by: none
---

# 当前接班：40 篇新论文 / 10 批推进，第 10 批待本地验证

## Cycle 合同

**objective**：完成 `PLAN-40-PAPERS.md` 的第 10 批：新增 `causal-world-models-embodied-ai`、`call-for-embodied-ai`、`robotics-foundation-models-survey`、`embodied-ai-security-cps-survey` 四篇 deep-read，并完成本地验证、PR、Pages 部署与线上冒烟。

**scope**：去重、读取 arXiv / PDF / HTML 等一手来源；新增第 10 批 notes、刷新 provenance / Data API inventory 到 202 篇、补齐 card / inline 资产与 receipts、跑本地门禁、PR、merge、Pages deploy 与线上冒烟。明确排除：第 10 批之外的新论文、真机/仿真实验复现、owner 仓库保护设置、既有未跟踪根目录 `scripts/` 清理。

**exit_conditions**：四篇来源均完成 deep-read 并部署；或任一来源在正文阶段发现与既有内容重复、缺少可复查一手材料、或无法满足 deep-read 门禁时，停止写该篇并回到计划修正。

**evidence_boundary**：公开实验数字只作为论文报告，不升级为本站 E4 artifact；`human_verification` 保持 `UNVERIFIED`，除非后续有人类 reviewer 明确核验。

**primary_sources**：arXiv abs/PDF：2402.06665、2402.03824、2312.08782、2602.17345。前三个候选由 Exa 搜索锁定；第四个原占位 `cyberspace-physical-world-survey` 未直接命中一手来源，Exa 查询触发 429 后改用 arXiv API fallback，锁定为更可复查的 CPS/security survey `embodied-ai-security-cps-survey`。

**baseline_checks**：Batch 9 已部署并完成 handoff PR #49；本地 `main` 与 `origin/main` 对齐到 `b153945`。当前仍有既有未跟踪根目录 `scripts/`，本轮不纳入也不删除。

**当前状态**：
- 已完成 4 篇 deep-read 初稿：`causal-world-models-embodied-ai`、`call-for-embodied-ai`、`robotics-foundation-models-survey`、`embodied-ai-security-cps-survey`。
- 字数 / 视觉元素预检通过：`causal-world-models-embodied-ai=4016/3`、`call-for-embodied-ai=4154/3`、`robotics-foundation-models-survey=4159/3`、`embodied-ai-security-cps-survey=4059/3`。
- 已生成并登记 24 个 WebP 资产与 4 个 portable receipt；`papers/provenance.json` 当前为 202 notes / 306 generated assets，`content_commit=22e3b0a641151d4a356889630194e7a90eac33e9`。
- 已同步 README / CHANGELOG / check / unit test 计数到 202；下一步跑完整本地门禁，并根据实际输出修 CSP / size budget。

---
status: completed
program_status: ACTIVE
cycle_state: DEPLOYED
cycle_id: EAIRS-CYCLE-20260715-FORTY-PAPERS-BATCH09
activated_by: user-explicit-continue-autonomous-embodied-ai-research
scope: ten-batches-forty-new-papers-batch09-four-deep-read-notes
branch: codex/forty-papers-batch09
start_ref: 460ece4
baseline_ref: origin/main
review_after: next bounded research batch
external_outcome: pr-48-merged-and-pages-deployed
superseded_by: none
---

# 当前接班：40 篇新论文 / 10 批推进，第 9 批已部署

## Cycle 合同

**objective**：继续 `PLAN-40-PAPERS.md`，第 9 批先核验候选 `discrete-policy`、`gembench`、`language-conditioned-manipulation-survey`、`safeembodai` 的一手来源；来源锁定后新增 4 篇 deep-read，并完成本地验证、PR、Pages 部署与线上冒烟。

**scope**：去重、搜索/读取 arXiv 或作者项目页等一手来源、必要时修正候选 slug/title/source；新增第 9 批 notes、刷新 provenance / Data API inventory 到 198 篇、补齐 card / inline 资产与 receipts、跑本地门禁、PR、merge、Pages deploy 与线上冒烟。明确排除：第 10 批正文、真机/仿真实验复现、owner 仓库保护设置、既有未跟踪根目录 `scripts/` 清理。

**exit_conditions**：四个候选均有可复查一手来源并完成部署；或任一候选连续三轮搜索仍无法定位一手来源时，停止写正文并回到计划修正。

**evidence_boundary**：公开成功率只作为论文报告，不升级为本站 E4 artifact；`human_verification` 保持 `UNVERIFIED`，除非后续有人类 reviewer 明确核验。

**primary_sources**：arXiv PDF / abs：2409.18707、2410.01345、2312.10807、2409.01630。四个候选均未命中既有 notes/provenance，已锁定一手来源并进入正文实施。

**baseline_checks**：Batch 8 已部署并完成 handoff PR #47；本轮起点 `main` 与 `origin/main` 对齐到 `460ece4`。当前仍有既有未跟踪根目录 `scripts/`，本轮不纳入也不删除；Batch 9 临时 `.tmp-paper-sources/` 已清理。

**当前状态**：
- 已完成 4 篇 deep-read 初稿：`discrete-policy`、`gembench`、`language-conditioned-manipulation-survey`、`safeembodai`。
- 字数 / 视觉元素预检通过：`discrete-policy=4255/2`、`gembench=4080/3`、`language-conditioned-manipulation-survey=4224/2`、`safeembodai=4160/2`。
- 已生成并登记 24 个 WebP 资产与 4 个 portable receipt；`papers/provenance.json` 当前为 198 notes / 282 generated assets，`content_commit=203ff84db1040bd7a0164ae8af560ea2e01a6baf`。
- 已同步 README / CHANGELOG / check / unit test 计数到 198；CSP style budget 更新为 5100 attributes / 208 unique values；`papers/index.html` repo-base 专项预算保持 300KB。
- 本地验证已通过：`npm run test:unit` 342 passed；root build/check 通过，`npm run check` 160 passed；`SITE_BASE=/embodied-ai-reading-station npm run build` + `SITE_BASE=/embodied-ai-reading-station npm run check` 通过，repo-base check 160 passed。
- `git diff --check` 与 `git diff --check origin/main...HEAD` 通过；PR #48 已合并，merge commit `ac01d82`；Pages workflow `29389590171` build + deploy 成功。
- 线上冒烟通过：`/data/v2/papers.json` 与 `/data/v2/provenance.json` 均 200，`paper_items=198`，`notes=198`，`remote_sources=152`，`generated_assets=282`；四篇新增论文页与 `card-800` / `method-800` / `scene-800` 图片资源均 HTTP 200。
- 本地 `main` 与 `origin/main` 对齐到 `ac01d82`；仍有既有未跟踪根目录 `scripts/`，本轮未纳入也未删除；下一步进入 Batch 10 来源复核与正文实施。

---
status: completed
program_status: ACTIVE
cycle_state: DEPLOYED
cycle_id: EAIRS-CYCLE-20260715-FORTY-PAPERS-BATCH08
activated_by: user-explicit-continue-autonomous-embodied-ai-research
scope: ten-batches-forty-new-papers-batch08-four-deep-read-notes
branch: codex/forty-papers-batch08
start_ref: 36b8a1f
baseline_ref: origin/main
review_after: next bounded research batch
external_outcome: pr-46-merged-and-pages-deployed
superseded_by: none
---

# 当前接班：40 篇新论文 / 10 批推进，第 8 批已部署

## Cycle 合同

**objective**：继续 `PLAN-40-PAPERS.md`，第 8 批先核验候选 `gaze2act`、`lacy`、`villa-x`、`instructvla` 的一手来源；来源锁定后新增 4 篇 deep-read，并完成本地验证、PR、Pages 部署与线上冒烟。

**scope**：去重、搜索/读取 arXiv 或作者项目页等一手来源、必要时修正候选 slug/title/source；新增第 8 批 notes、刷新 provenance / Data API inventory 到 194 篇、补齐 card / inline 资产与 receipts、跑本地门禁、PR、merge、Pages deploy 与线上冒烟。明确排除：第 9–10 批正文、真机/仿真实验复现、owner 仓库保护设置、既有未跟踪根目录 `scripts/` 清理。

**exit_conditions**：四个候选均有可复查一手来源并完成部署；或任一候选连续三轮搜索仍无法定位一手来源时，停止写正文并回到计划修正。

**evidence_boundary**：公开成功率只作为论文报告，不升级为本站 E4 artifact；`human_verification` 保持 `UNVERIFIED`，除非后续有人类 reviewer 明确核验。

**primary_sources**：arXiv PDF / abs：2605.30282、2511.02239、2507.23682、2507.17520。四个候选均未命中既有 notes/provenance，已锁定一手来源并完成正文初稿。

**baseline_checks**：Batch 7 已部署并完成 handoff PR #45；本地 `main` 与 `origin/main` 对齐到 `36b8a1f`。当前仍有既有未跟踪根目录 `scripts/`，本轮不纳入也不删除；Batch 8 临时 PDF/text 存放在 `.tmp-paper-sources/batch08/`，验证前必须清理。

**当前状态**：
- 已完成 4 篇 deep-read 初稿：`gaze2act`、`lacy`、`villa-x`、`instructvla`。
- 字数 / 视觉元素预检通过：`gaze2act=4523/2`、`lacy=4042/2`、`villa-x=4316/2`、`instructvla=4237/2`。
- 已生成并登记 24 个 WebP 资产与 4 个 portable receipt；`papers/provenance.json` 当前为 194 notes / 258 generated assets，`content_commit=bb2b67a88f8d5a37a16a1d032f0e709b8b68e62d`。
- 已同步 README / CHANGELOG / check / unit test 计数到 194；CSP style budget 更新为 5050 attributes / 207 unique values；`papers/index.html` repo-base 专项预算更新到 300KB。
- 本地验证已通过：`npm run test:unit` 342 passed；root build/check 通过，`npm run check` 160 passed；`SITE_BASE=/embodied-ai-reading-station npm run build` + `SITE_BASE=/embodied-ai-reading-station npm run check` 通过，repo-base check 160 passed。
- `git diff --check` 与 `git diff --check origin/main...HEAD` 通过；PR #46 已合并，merge commit `321361f8`；Pages workflow `29388213106` build + deploy 成功。
- 线上冒烟通过：`/data/v2/papers.json` 与 `/data/v2/provenance.json` 均 200，`paper_items=194`，`notes=194`，`remote_sources=148`，`generated_assets=258`；四篇新增论文页与 `card-800` / `method-800` / `scene-800` 图片资源均 HTTP 200。
- 本地 `main` 与 `origin/main` 对齐到 `321361f8`；仍有既有未跟踪根目录 `scripts/`，本轮未纳入也未删除；Batch 8 临时 `.tmp-paper-sources/` 已清理。

---
status: completed
program_status: ACTIVE
cycle_state: DEPLOYED
cycle_id: EAIRS-CYCLE-20260715-FORTY-PAPERS-BATCH07
activated_by: user-explicit-continue-autonomous-embodied-ai-research
scope: ten-batches-forty-new-papers-batch07-four-deep-read-notes
branch: codex/forty-papers-batch07
start_ref: 213ffbf
baseline_ref: origin/main
review_after: next bounded research batch
external_outcome: pr-44-merged-and-pages-deployed
superseded_by: none
---

# 当前接班：40 篇新论文 / 10 批推进，第 7 批已部署

## Cycle 合同

**objective**：继续 `PLAN-40-PAPERS.md`，第 7 批新增 `disco-diffusion-policy`、`time-unified-diffusion-policy`、`primitive-skill-diffusion-policy`、`trace-focused-diffusion-policy` 四篇 diffusion-policy deep-read，并完成本地验证、PR、Pages 部署与线上冒烟。

**scope**：去重、搜索/读取 arXiv 或作者项目页等一手来源、必要时修正候选 slug/title/source；新增第 7 批 notes、刷新 provenance / Data API inventory 到 190 篇、补齐 card / inline 资产与 receipts、跑本地门禁、PR、merge、Pages deploy 与线上冒烟。明确排除：第 8–10 批正文、真机/仿真实验复现、owner 仓库保护设置、既有未跟踪根目录 `scripts/` 清理。

**exit_conditions**：四个候选均有可复查一手来源并完成部署；或任一候选连续三轮搜索仍无法定位一手来源时，停止写正文并回到计划修正。

**evidence_boundary**：公开成功率只作为论文报告，不升级为本站 E4 artifact；`human_verification` 保持 `UNVERIFIED`，除非后续有人类 reviewer 明确核验。

**primary_sources**：arXiv PDF / abs：2406.09767、2506.09422、2601.01948、2602.07388。四个候选均未命中既有 notes/provenance，已锁定一手来源并完成正文、provenance 与资产登记。

**acceptance_checks**：`npm run test:unit`、root build/check、repo-base build/check、`git diff --check`、PR CI、main Pages deploy、线上 provenance + 四篇论文页 + 四组 card/method/scene 800w 图片 HTTP 200。

**当前状态**：
- 第 7 批已完成 4 篇 deep-read：`disco-diffusion-policy`、`time-unified-diffusion-policy`、`primitive-skill-diffusion-policy`、`trace-focused-diffusion-policy`。
- 已生成并登记 24 个 WebP 资产与 4 个 portable receipt；`papers/provenance.json` 当前为 190 notes / 234 generated assets，`content_commit=4ba9172bba8dbce9e6a364060d1b4e3487418889`。
- 本地验证已通过：`npm run test:unit` 342 passed；root build/check 通过，`npm run check` 160 passed；`SITE_BASE=/embodied-ai-reading-station npm run build` + `SITE_BASE=/embodied-ai-reading-station npm run check` 通过，repo-base check 160 passed。
- 本轮同步了 README / CHANGELOG / check / unit test 计数到 190；CSP style budget 更新为 5004 attributes / 208 unique values；`papers/index.html` repo-base 专项预算更新到 290KB。
- `git diff --check` 与 `git diff --check origin/main...HEAD` 通过；PR #44 已合并，merge commit `6f381fbe`；Pages workflow `29386662371` build + deploy 成功。
- 线上冒烟通过：`/data/v2/papers.json` 与 `/data/v2/provenance.json` 均 200，`paper_items=190`，`notes=190`，`remote_sources=144`，`generated_assets=234`；四篇新增论文页与 `card-800` / `method-800` / `scene-800` 图片资源均 HTTP 200。
- 本地 `main` 与 `origin/main` 对齐到 `6f381fbe`；仍有既有未跟踪根目录 `scripts/`，本轮未纳入也未删除；Batch 7 临时 `.tmp-paper-sources/` 已清理。

---
status: completed
program_status: ACTIVE
cycle_state: DEPLOYED
cycle_id: EAIRS-CYCLE-20260715-FORTY-PAPERS-BATCH06
activated_by: user-explicit-continue-autonomous-embodied-ai-research
scope: ten-batches-forty-new-papers-batch06-four-deep-read-notes
branch: codex/forty-papers-batch06
start_ref: 0fb0f00
baseline_ref: origin/main
review_after: next bounded research batch
external_outcome: pr-42-merged-and-pages-deployed
superseded_by: none
---

# 当前接班：40 篇新论文 / 10 批推进，第 6 批已部署

## Cycle 合同

**objective**：继续 `PLAN-40-PAPERS.md`，第 6 批先核验候选 `mimo-embodied`、`open-h-embodiment`、`alanavlm`、`embodied-3d-generation-survey` 的一手来源；来源锁定后新增 4 篇 deep-read，并完成本地验证、PR、Pages 部署与线上冒烟。

**scope**：去重、搜索/读取 arXiv 或作者项目页等一手来源、必要时修正候选 slug/title/source；新增第 6 批 notes、刷新 provenance / Data API inventory 到 186 篇、补齐 card / inline 资产与 receipts、跑本地门禁、PR、merge、Pages deploy 与线上冒烟。明确排除：第 7–10 批正文、真机/仿真实验复现、owner 仓库保护设置、既有未跟踪根目录 `scripts/` 清理。

**exit_conditions**：四个候选均有可复查一手来源并完成部署；或任一候选连续三轮搜索仍无法定位一手来源时，停止写正文并回到计划修正。

**evidence_boundary**：公开成功率只作为论文报告，不升级为本站 E4 artifact；`human_verification` 保持 `UNVERIFIED`，除非后续有人类 reviewer 明确核验。

**primary_sources**：arXiv PDF / abs：2511.16518、2604.21017、2406.13807、2604.26509。四个候选均未命中既有 notes/provenance，已锁定一手来源并进入正文实施。

**acceptance_checks**：`npm run test:unit`、root build/check、repo-base build/check、`git diff --check`、PR CI、main Pages deploy、线上 provenance + 四篇论文页 + 四组 card/method/scene 800w 图片 HTTP 200。

**当前状态**：
- 第 6 批已完成 4 篇 deep-read：`mimo-embodied`、`open-h-embodiment`、`alanavlm`、`embodied-3d-generation-survey`。
- 已生成并登记 24 个 WebP 资产与 4 个 portable receipt；`papers/provenance.json` 当前为 186 notes / 210 generated assets，`content_commit=098cb961566840aad2dd908cd34bb8e60a9bdeec`。
- 本地验证已通过：`npm run test:unit` 342 passed；root build/check 通过，`npm run check` 160 passed；`SITE_BASE=/embodied-ai-reading-station npm run build` + `SITE_BASE=/embodied-ai-reading-station npm run check` 通过，repo-base check 160 passed；`git diff --check` 与 `git diff --check origin/main...HEAD` 通过。
- PR #42 已合并，merge commit `dcda8f3`；Pages workflow `29384626510` build + deploy 成功。
- 线上冒烟通过：`/data/v2/papers.json` 与 `/data/v2/provenance.json` 均 200，`paper_items=186`，`notes=186`，`remote_sources=140`，`generated_assets=210`；四篇新增论文页与 `card-800` / `method-800` / `scene-800` 图片资源均 HTTP 200。
- 本地 `main` 与 `origin/main` 对齐到 `dcda8f3`；仍有既有未跟踪根目录 `scripts/`，本轮未纳入也未删除；临时 `.tmp-paper-sources/` 已清理。

---
status: completed
program_status: ACTIVE
cycle_state: DEPLOYED
cycle_id: EAIRS-CYCLE-20260714-FORTY-PAPERS-BATCH05
activated_by: user-explicit-continue-autonomous-embodied-ai-research
scope: ten-batches-forty-new-papers-batch05-four-deep-read-notes
branch: codex/forty-papers-batch05
start_ref: af8b7f2
baseline_ref: origin/main
review_after: next bounded research batch
external_outcome: pr-40-merged-and-pages-deployed
superseded_by: none
---

# 当前接班：40 篇新论文 / 10 批推进，第 5 批已部署

## Cycle 合同

**objective**：继续 `PLAN-40-PAPERS.md`，第 5 批先核验候选 `mobile-service-robot-foundation-survey`、`embodied-agi-road-ahead`、`roboneuron`、`embodied-navigation-foundation-model` 的一手来源；来源锁定后新增 4 篇 deep-read，并完成本地验证、PR、Pages 部署与线上冒烟。

**scope**：去重、搜索/读取 arXiv 或作者项目页等一手来源、必要时修正候选 slug/title/source；新增第 5 批 notes、刷新 provenance / Data API inventory 到 182 篇、补齐 card / inline 资产与 receipts、跑本地门禁、PR、merge、Pages deploy 与线上冒烟。明确排除：第 6–10 批正文、真机/仿真实验复现、owner 仓库保护设置、既有未跟踪根目录 `scripts/` 清理。

**exit_conditions**：四个候选均有可复查一手来源并完成部署；或任一候选连续三轮搜索仍无法定位一手来源时，停止写正文并回到计划修正。

**evidence_boundary**：公开成功率只作为论文报告，不升级为本站 E4 artifact；`human_verification` 保持 `UNVERIFIED`，除非后续有人类 reviewer 明确核验。

**primary_sources**：arXiv PDF / abs：2505.20503、2505.14235、2512.10394、2509.12129。四个候选均未命中既有 notes/provenance，已锁定一手来源并进入正文实施。

**acceptance_checks**：`npm run test:unit`、root build/check、repo-base build/check、`git diff --check`、PR CI、main Pages deploy、线上 provenance + 四篇论文页 + 四组 card/method/scene 800w 图片 HTTP 200。

**当前状态**：
- 第 5 批已完成 4 篇 deep-read：`mobile-service-robot-foundation-survey`、`embodied-agi-road-ahead`、`roboneuron`、`embodied-navigation-foundation-model`。
- 已生成并登记 24 个 WebP 资产与 4 个 portable receipt；`papers/provenance.json` 当前为 182 notes / 186 generated assets，`content_commit=b83ac8aa833cebeb994f30cd825a36d83ddc6e6f`。
- 本地验证已通过：`npm run test:unit` 342 passed；root build/check 通过，`npm run check` 160 passed；`SITE_BASE=/embodied-ai-reading-station npm run build` + `SITE_BASE=/embodied-ai-reading-station npm run check` 通过，repo-base check 160 passed；`git diff --check` 与 `git diff --check origin/main...HEAD` 通过。
- PR #40 已合并，merge commit `f8ad4db`；Pages workflow `29383192471` build + deploy 成功。
- 线上冒烟通过：`/data/v2/papers.json` 与 `/data/v2/provenance.json` 均 200，`paper_items=182`，`notes=182`，`remote_sources=136`，`generated_assets=186`；四篇新增论文页与 `card-800` / `method-800` / `scene-800` 图片资源均 HTTP 200。
- 本地 `main` 与 `origin/main` 对齐到 `f8ad4db`；仍有既有未跟踪根目录 `scripts/`，本轮未纳入也未删除；临时 `.tmp-paper-sources/` 已清理。

---
status: completed
program_status: ACTIVE
cycle_state: DEPLOYED
cycle_id: EAIRS-CYCLE-20260714-FORTY-PAPERS-BATCH04
activated_by: user-explicit-continue-autonomous-embodied-ai-research
scope: ten-batches-forty-new-papers-batch04-four-deep-read-notes
branch: codex/forty-papers-batch04
start_ref: 41a6d2a
baseline_ref: origin/main
review_after: next bounded research batch
external_outcome: pr-38-merged-and-pages-deployed
superseded_by: none
---

# 当前接班：40 篇新论文 / 10 批推进，第 4 批已部署

## Cycle 合同

**objective**：继续 `PLAN-40-PAPERS.md`，第 4 批先核验候选 `vla-forget`、`membership-inference-vla`、`efficient-vla-survey`、`vla-manipulation-survey` 的一手来源；来源锁定后新增 4 篇 deep-read，并完成本地验证、PR、Pages 部署与线上冒烟。

**scope**：去重、搜索/读取 arXiv 或作者项目页等一手来源、必要时修正候选 slug/title/source；新增第 4 批 notes、刷新 provenance / Data API inventory 到 178 篇、补齐 card / inline 资产与 receipts、跑本地门禁、PR、merge、Pages deploy 与线上冒烟。明确排除：第 5–10 批正文、真机/仿真实验复现、owner 仓库保护设置、既有未跟踪根目录 `scripts/` 清理。

**exit_conditions**：四个候选均有可复查一手来源并完成部署；或任一候选连续三轮搜索仍无法定位一手来源时，停止写正文并回到计划修正。

**evidence_boundary**：公开成功率只作为论文报告，不升级为本站 E4 artifact；`human_verification` 保持 `UNVERIFIED`，除非后续有人类 reviewer 明确核验。

**primary_sources**：arXiv PDF / abs：2604.03956、2605.07088、2510.24795、2508.15201。四个候选均未命中既有 notes/provenance，已锁定一手来源并进入正文实施。

**acceptance_checks**：`npm run test:unit`、root build/check、repo-base build/check、`git diff --check`、PR CI、main Pages deploy、线上 provenance + 四篇论文页 + 四组 card/method/scene 800w 图片 HTTP 200。

**当前状态**：
- 第 4 批已完成 4 篇 deep-read：`vla-forget`、`membership-inference-vla`、`efficient-vla-survey`、`vla-manipulation-survey`。
- 已生成并登记 24 个 WebP 资产与 4 个 portable receipt；`papers/provenance.json` 当前为 178 notes / 162 generated assets，`content_commit=f2e6b6aef5afb8bb8ab6cc111faf22966a9acd9e`。
- 本地验证已通过：`npm run test:unit` 342 passed；root build/check 通过，`npm run check` 160 passed；`SITE_BASE=/embodied-ai-reading-station npm run build` + `SITE_BASE=/embodied-ai-reading-station npm run check` 通过，repo-base check 160 passed；`git diff --check` 干净。
- PR #38 已合并，merge commit `d1727b1`；Pages workflow `29340661331` build + deploy 成功。
- 线上冒烟通过：`/data/v2/papers.json` 与 `/data/v2/provenance.json` 均 200，`notes=178`，`remote_sources=132`，`generated_assets=162`；四篇新增论文页与 `card-800` / `method-800` / `scene-800` 图片资源均 HTTP 200。
- 本地 `main` 与 `origin/main` 对齐；仍有既有未跟踪根目录 `scripts/`，本轮未纳入也未删除。

---
status: completed
program_status: ACTIVE
cycle_state: DEPLOYED
cycle_id: EAIRS-CYCLE-20260714-FORTY-PAPERS-BATCH03
activated_by: user-explicit-continue-autonomous-embodied-ai-research
scope: ten-batches-forty-new-papers-batch03-four-deep-read-notes
branch: main
start_ref: f1024b7
baseline_ref: origin/main
review_after: next bounded research batch
external_outcome: pr-36-merged-and-pages-deployed
superseded_by: none
---

# 当前接班：40 篇新论文 / 10 批推进，第 3 批已部署

## Cycle 合同

**objective**：继续 PLAN-40-PAPERS.md，第 3 批新增 4 篇 VLA 部署效率和快速适配论文：green-vla、ac2-vla、mos-vla、fast-slow-vla，并完成本地验证、PR、Pages 部署与线上冒烟。

**scope**：新增第 3 批 notes、刷新 provenance / Data API inventory 到 174 篇、补齐 card / inline 资产与 receipts、跑本地门禁、PR、merge、Pages deploy 与线上冒烟。明确排除：第 4–10 批正文、真机/仿真实验复现、owner 仓库保护设置、未跟踪根目录 scripts 清理。

**primary_sources**：arXiv PDF / abs：2602.00919、2601.19634、2510.16617、2512.20188。公开成功率只作为论文报告，不升级为本站 E4 artifact。

**acceptance_checks**：`npm run test:unit`、root build/check、repo-base build/check、`git diff --check`、PR CI、main Pages deploy、线上 provenance + 四篇论文页 HTTP 200。

**当前状态**：
- 第 3 批已完成 4 篇 deep-read：`green-vla`、`ac2-vla`、`mos-vla`、`fast-slow-vla`。
- 已生成并登记 24 个 WebP 资产与 4 个 portable receipt；`papers/provenance.json` 当前为 174 notes / 138 generated assets，`content_commit=233796c7be2eee0a52b2fe7b51043901ce902870`。
- 本地验证已通过：`npm run test:unit` 342 passed；root build/check 通过，`npm run check` 160 passed；`SITE_BASE=/embodied-ai-reading-station npm run build` + `SITE_BASE=/embodied-ai-reading-station npm run check` 通过，repo-base check 160 passed；`git diff --check` 干净。
- PR #36 已合并，merge commit `eb8eac1`；Pages workflow `29338143100` build + deploy 成功。
- 线上冒烟通过：`/data/v2/provenance.json` 200，`schema_version=2.0.0`，`notes=174`，`remote_sources=128`，`generated_assets=138`；四篇新增论文页均 HTTP 200。
- 本地 `main` 与 `origin/main` 对齐；仍有既有未跟踪根目录 `scripts/`，本轮未纳入也未删除。

---
status: completed
program_status: ACTIVE
cycle_state: DEPLOYED
cycle_id: EAIRS-CYCLE-20260714-FORTY-PAPERS-BATCH02
activated_by: user-explicit-continue-autonomous-embodied-ai-research
scope: ten-batches-forty-new-papers-batch02-four-deep-read-notes
branch: main
start_ref: 4ed7998
baseline_ref: origin/main
review_after: next bounded research batch
external_outcome: pr-34-merged-and-pages-deployed
superseded_by: none
---

# 当前接班：40 篇新论文 / 10 批推进，第 2 批已部署

## Cycle 合同

**objective**：继续 `PLAN-40-PAPERS.md`，第 2 批新增 4 篇 embodied AI / VLA 前沿论文：`vlaser`、`x-vla`、`et-vla`、`himoe-vla`，并完成本地验证、PR、Pages 部署与线上冒烟。

**scope**：新增第 2 批 notes、刷新 provenance / Data API inventory 到 170 篇、补齐 card / inline 资产与 receipts、跑本地门禁、PR、merge、Pages deploy 与线上冒烟。明确排除：第 3–10 批正文、真机/仿真实验复现、owner 仓库保护设置、未跟踪根目录 `scripts/` 清理。

**primary_sources**：arXiv PDF / abs：`2510.11027`、`2510.10274`、`2511.01224`、`2512.05693`。公开成功率只作为论文报告，不升级为本站 E4 artifact。

**acceptance_checks**：`npm run test:unit`、root build/check、repo-base build/check、`git diff --check`、PR CI、main Pages deploy、线上 provenance + 四篇论文页 + 四组 card/method/scene 800w 图片 HTTP 200。

**当前状态**：
- 第 2 批已完成 4 篇 deep-read：`vlaser`、`x-vla`、`et-vla`、`himoe-vla`。
- 已生成并登记 24 个 WebP 资产与 4 个 portable receipt；`papers/provenance.json` 当前为 170 notes / 114 generated assets，`content_commit=53e2b5f0836042c8c57e516a1b47383737fe3bb8`。
- 本地验证已通过：`npm run test:unit` 342 passed；root build/check 通过，`npm run check` 160 passed；`SITE_BASE=/embodied-ai-reading-station npm run build` + `npm run check` 通过，repo-base check 160 passed；`git diff --check` 干净。
- PR #34 已合并，merge commit `4181cda`；Pages workflow `29335730298` build + deploy 成功。
- 线上冒烟通过：`/data/v2/provenance.json` 200，`schema_version=2.0.0`，`notes=170`，`generated_assets=114`；四篇新增论文页与 `card-800` / `method-800` / `scene-800` 图片资源均 HTTP 200。
- 本地 `main` 与 `origin/main` 对齐；仍有既有未跟踪根目录 `scripts/`，本轮未纳入也未删除。

---
status: completed
program_status: ACTIVE
cycle_state: DEPLOYED
cycle_id: EAIRS-CYCLE-20260714-FORTY-PAPERS-BATCH01
activated_by: user-explicit-continue-embodied-ai-40-papers-full-deploy
scope: ten-batches-forty-new-papers-batch01-four-deep-read-notes
branch: main
start_ref: e3baf8a
baseline_ref: origin/main
review_after: next bounded research batch
external_outcome: pr-32-merged-and-pages-deployed
superseded_by: none
---

# 当前接班：40 篇新论文 / 10 批推进，第 1 批已部署

## Cycle 合同

**objective**：按 PLAN-40-PAPERS.md 分 10 批新增 40 篇 embodied AI 论文研究笔记；本轮先完成第 1 批 4 篇：qwen-vla、realmirror、llada-vla、discrete-diffusion-vla。

**scope**：新增第 1 批 notes、刷新 provenance / Data API inventory 到 166 篇、补齐 card / inline 资产与 receipts、跑本地门禁、PR、merge、Pages deploy 与线上冒烟。明确排除：后 9 批正文、真机/仿真实验复现、owner 仓库保护设置、未跟踪根目录 scripts 清理。

**primary_sources**：arXiv PDF / HTML / abs：2605.30280、2509.14687、2509.06932、2508.20072。公开成功率只作为论文报告，不升级为本站 E4 artifact。

**acceptance_checks**：npm run test:unit、root build/check、repo-base build/check、git diff --check、PR CI、main Pages deploy、线上 provenance + 四篇论文页 + 四组 card/method/scene 800w 图片 HTTP 200。

**当前状态**：
- 已新增 `PLAN-40-PAPERS.md`，拆分 10 批 / 40 篇候选。
- 第 1 批已完成 4 篇 deep-read：`qwen-vla`、`realmirror`、`llada-vla`、`discrete-diffusion-vla`。
- 已生成并登记 24 个 WebP 资产与 4 个 portable receipt；`papers/provenance.json` 当前为 166 notes / 90 generated assets，`content_commit=f6a1149d310439a168e58fdaa692fc1fdb8ea8d0`。
- 本地验证已通过：`npm run test:unit` 342 passed；root build/check 通过，`npm run check` 160 passed；`SITE_BASE=/embodied-ai-reading-station npm run build` + `npm run check` 通过，repo-base check 160 passed；`git diff --check` 干净。
- PR #32 已合并，merge commit `4ec167e`；Pages workflow `29334101759` build + deploy 成功。
- 线上冒烟通过：`/data/v2/provenance.json` 200，`schema_version=2.0.0`，`notes=166`，`generated_assets=90`；四篇新增论文页与 `card-800` / `method-800` / `scene-800` 图片资源均 HTTP 200。
- 本地 `main` 与 `origin/main` 对齐；仍有既有未跟踪根目录 `scripts/`，本轮未纳入也未删除。

---
status: completed
program_status: ACTIVE
cycle_state: DEPLOYED
cycle_id: EAIRS-CYCLE-20260714-FIVE-NEW-PAPERS-DEPLOY
activated_by: user-explicit-new-five-paper-research-deploy
scope: five-new-deep-read-notes-provenance-assets-deploy
branch: main
start_ref: cfc977130967df1620514ea46ed3e394bc1584a7
baseline_ref: origin/main
review_after: next user wake or new bounded research cycle
total_budget: 1 run / 5 new papers / 1 writer / full deploy
external_outcome: pr-30-merged-and-pages-deployed
superseded_by: none
---

# 当前接班：新增五篇论文研究与全流程部署

## Cycle 合同

**research_question**：能否在不放宽 deep-read、provenance v2、Data API、生成资产和 Pages 门禁的前提下，新增 5 篇全新具身智能论文笔记，并完成本地验证、PR、合并、Pages 部署与线上冒烟？

**hypothesis**：从当前已接受基线 `cfc9771` 开始，新增 `cogact`、`universal-actions`、`lohovla`、`autort`、`eo-1` 五篇 note，配套 provenance 与站点 card/inline 资产后，可以保持 `npm run test:unit`、root/repo build、`npm run check`、`git diff --check` 全绿，并通过 GitHub Pages 线上资源校验。

**falsifier**：若任一新增论文缺少一手来源、实验数字无法从 arXiv/PDF 支撑、生成资产无法和 receipt / Git blob / provenance 闭合，或 Pages 部署后公开页面/API/图片不可访问，则停止，不把半成品写成已部署。

**objective**：新增并部署 5 篇全新论文 deep-read：`cogact`、`universal-actions`、`lohovla`、`autort`、`eo-1`。

**scope**：
- `notes/{cogact,universal-actions,lohovla,autort,eo-1}.md`
- `papers/provenance.json`
- `.tmp-receipts/{slug}-assets.json`（如生成资产需要 receipt）
- `site/src/images/cards/{slug}.webp` 与 `{slug}-800.webp`
- `site/src/images/inline/{slug}-scene|method.webp` 与 `-800.webp`
- `CHANGELOG.md`、`SESSION-HANDOFF.md`
- 明确排除：Lab、真机/MuJoCo/SmolVLA 实验、owner 设置、历史计划清理、现存未跟踪根目录 `scripts/`。

**selected_candidates**：
- `cogact`：VLM cognition + diffusion action transformer 的 componentized VLA。
- `universal-actions`：UniAct universal action space，跨本体动作表示。
- `lohovla`：长程任务中联合生成 sub-task 与 action token。
- `autort`：用 VLM/LLM 编排 20+ 真实机器人采集 77k episode。
- `eo-1`：interleaved vision-text-action pretraining，3B 模型与 EO-Data1.5M。

**primary_sources**：
- arXiv HTML / abs / PDF：`2411.19650v1`、`2501.10105v2`、`2506.00411v1`、`2401.12963v2`、`2508.21112v4`。
- 本轮只引用公开论文内容；不声称本站完成本地训练、真机执行或 E4 复现实验。

**acceptance_checks**：
- `PATH="/opt/homebrew/bin:$PATH" npm run test:unit`
- `PATH="/opt/homebrew/bin:$PATH" npm run build`
- `PATH="/opt/homebrew/bin:$PATH" npm run check`
- `PATH="/opt/homebrew/bin:$PATH" SITE_BASE=/embodied-ai-reading-station npm run build`
- `PATH="/opt/homebrew/bin:$PATH" npm run check`
- `git diff --check`
- PR CI 成功。
- main Pages workflow 成功。
- 线上 `data/v2/provenance.json`、五篇新增论文页、五个 card-800、五个 method-800、五个 scene-800 图片资源均 HTTP 200。

**run budget**：1 个内容 PR、1 个 writer；本轮不续做 Lab 或实验声明。

**权限边界**：用户要求“全流程部署”，本轮可执行 branch push、PR、merge 与 Pages deploy 验证；仍禁止 force push、rebase、直接写远端 main、owner 设置或伪造本地实验结果。

**stop_conditions**：
- 需要新增付费/GPU/真机资源或下载大模型权重。
- 需要放宽 provenance / Data API / deep-read / 资产门禁。
- PR CI、mergeability 或 Pages deployment 进入外部 blocker。
- 工作树出现与用户改动重叠。

## 当前状态

- 起始基线：`cfc977130967df1620514ea46ed3e394bc1584a7`。
- 内容快照：`58a5ec656edc0f54c593abfe9e4505f7e5004f1b`，canonical provenance 指向该快照，162 篇 note / 66 个 generated assets。
- main 合并结果：
  - [PR #30](https://github.com/estelledc/embodied-ai-reading-station/pull/30)：`342164a96bef5b56a11a6aff20615bd9eebadd50`。
- Deploy 结果：
  - [Deploy reading station to GitHub Pages #29331540918](https://github.com/estelledc/embodied-ai-reading-station/actions/runs/29331540918)：success，head SHA `342164a96bef5b56a11a6aff20615bd9eebadd50`。
- 线上冒烟：
  - `https://estelledc.github.io/embodied-ai-reading-station/data/v2/provenance.json`：200，`schema_version=2.0.0`，`notes=162`，`content_commit=58a5ec656edc0f54c593abfe9e4505f7e5004f1b`。
  - `cogact`、`universal-actions`、`lohovla`、`autort`、`eo-1` 五篇公开页面均 200。
  - 五篇新增论文的 `images/cards/*-800.webp`、`images/inline/*-method-800.webp`、`images/inline/*-scene-800.webp` 均 200。
- 本地工作树：
  - `main` 与 `origin/main` 对齐在 `342164a96bef5b56a11a6aff20615bd9eebadd50` 后另开本 handoff 分支。
  - 仍有未跟踪根目录 `scripts/`，包含既有一次性批处理脚本；本轮有意未纳入 PR，也未删除。

## 已完成切片

1. 用 LightRead / arXiv / PDF 文本筛选并核验 5 篇未收录论文：`cogact`、`universal-actions`、`lohovla`、`autort`、`eo-1`。
2. 新增 5 篇 deep-read note，均达到强制章节、视觉元素和 ≥4000 字门禁。
3. 用 topic asset fallback 生成 30 个 WebP 站点资产，并写入 5 个 portable receipt。
4. 更新 `papers/provenance.json`、Data API / provenance / responsive image / CSP 预算相关契约到 162 篇。
5. 本地验证通过：`npm run test:unit` 342 passed；root build 成功；root `npm run check` 160 passed；repo-base build 成功；repo-base `npm run check` 160 passed；`git diff --check` 干净。
6. 创建并合并 PR #30，PR CI 与 main Pages deploy 均成功。
7. 线上 provenance、五篇论文页与新增关键图片资源冒烟通过。

## 下一条命令

从最新 main 开始新的有限 cycle：

```bash
git fetch origin main
git switch main
git pull --ff-only origin main
git status --short --branch
```

下一轮若要继续新增论文，先按 `AGENT-DEEPREAD.md` 明确选题和一手来源；若要清理本地 `scripts/`，先确认这些一次性脚本不再需要，再用安全删除流程处理。

# 上一轮接班：五篇论文生成资产与 provenance 已部署

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
