# Embodied AI Agent 推进契约

本文件只规定项目的推进方式，不新增长期目标。`ROADMAP.md` 和 `PLAN-1.3.md` 提供方向、依赖与验收候选，不构成自动执行授权。这里的“持续推进”是同一份有限 run contract 内连续完成多个可独立验收的切片，不是无限循环，也不是把计划表从头扫到尾。

## 开始前

1. 把本目录视为独立 Git 仓库。先检查当前分支、`git status --short --branch`、远端基线和现有 diff；既有改动属于用户，不覆盖、不清理、不自动 rebase。
2. 依次阅读 `docs/operations-index.md`、`SESSION-HANDOFF.md`、`CHANGELOG.md`，再按本轮目标读取 `PLAN-1.3.md` 或专项文档。
3. 用实时 Git 和测试命令重新取状态。状态权威顺序是：运行代码与验证证据 → `CHANGELOG.md` → 当前 handoff → 计划与历史文档。handoff 中的 ref 是接班锚点，不替代实时检查。
4. 写入前在当前计划中声明一份 run contract：
   - `objective`：本轮只解决什么可观察问题；
   - `scope`：允许修改的目录、组件或 task；
   - `acceptance_checks`：独立验收命令与预期结果；
   - `budget`：切片数、墙钟时间和并发上限；
   - `external_outcome`：本轮要形成的可审查结果；未授权外部动作时，默认只是本地 review-ready change set，D 轴不提升；
   - `stop_conditions`：何时立即收口并交接。

调用方没有给预算时，默认最多 3 个切片、120 分钟、同时只允许 1 个可写切片。只读调查可以并行，但不得让多个 agent 同时编辑同一工作树。

## 连续 campaign

当调用方明确说“持续推进”“不要逐片停”或同义表达时，可以在单个 run 之上启动一个有限 campaign。campaign 仍须声明 `objective / scope / acceptance_checks / total_budget / external_outcome / stop_conditions / review_after`，其中 objective 必须有可判定终点，不能写成“永远研究”或“把所有东西都做完”。调用方没有给 campaign 总预算时，默认最多 12 个 run 或 24 小时，以先到者为准；每个 run 仍遵守最多 3 个切片、120 分钟和 1 个写者的边界。

一个 run 收口后，只要 campaign 仍为 active、下一切片仍在原 scope、总预算未耗尽、验收可复现、无需新增权限，且未触发三批无 external delta 的暂停门，agent 必须先更新 checkpoint，再自动开启下一 run，不等待逐 run 确认。普通 turn、compact 或上下文切换不刷新 run/campaign 预算；新 session 只能根据 `SESSION-HANDOFF.md` 中由用户显式激活且尚未到 `review_after` 的 campaign 恢复，不能从历史计划猜测一个 campaign。

“持续推进”只授权自动续 run，不自动授权 commit、push、PR、merge、deploy、owner 设置或扩大内容范围。campaign 达成终点、总预算耗尽、需要新权限、出现不可解释工作树重叠，或连续 3 个 agent 批次没有 external delta 时必须停止并交接。这里一个“agent 批次”指一个完成验收并写入 checkpoint 的 run；零散只读子调查不单独重置暂停门。

## 选题顺序

每个切片必须有当前证据，按以下顺序取第一项合适工作：

1. 调用方明确指定且仍在 run contract 内的问题；
2. 当前分支、CI、测试、审计或浏览器证据中的失败；
3. `SESSION-HANDOFF.md` 已激活、依赖已满足且有独立验收的下一项；
4. `PLAN-1.3.md` 中依赖已满足的候选项，但只能在调用方把它纳入本轮 scope 后执行。

没有证据支持下一项时停止，不为维持循环发明工作。`progress.md` 是本人学习记录，不是 agent 队列；页面数、论文数、commit 数和 agent 数都不是成功指标。

当前存在未进入已接受基线的实现栈时，默认先做集成收口，不继续向其上叠加 Lab、论文核验或新功能。未来需要多切片连续推进时，一份 run contract 使用一个交付分支；切片保持原子、可独立验收。若任务必须独立评审，则从已接受基线开启新的 run，不从另一条未接受的 PR 栈继续分叉。

## 单切片循环

1. 记录受影响范围的最小基线，并区分原有失败。
2. 把目标收窄为一个可独立验收的切片；一个切片不跨多个无关 task。
3. 做最小修改，不顺手扩展到正文生产、历史计划清理或其他主线。
4. 先跑定向测试和 `git diff --check`；跨构建层再按 `docs/operations-index.md` 升级到完整门禁。
5. 对照基线写清 measurable delta、测试结果、external delta 和未覆盖风险。本地通过不等于已 review、已合并或已发布。
6. 当前切片通过、工作树可解释、预算未耗尽且下一项仍在同一 run contract 内时，可以直接进入下一切片，不需要逐片重新确认。

普通对话 turn 结束不等于 run 结束；compact 或 resume 也不得扩大 scope 或刷新预算。active campaign 可以按上节规则自动续 run；没有 active campaign 时，只有触发停止条件或真正结束 session 才收口 handoff。

## 权限边界

- 本地流程文档、定向测试、审计和已授权组件内的质量修复，可以在 launch scope 与预算内连续推进。
- Batch 8 Lab、Batch 9 论文核验、批量精读、季度论文收录、既有笔记正文改写、资产批量生成和仓库外 MuJoCo/SmolVLA 实验，都需要单独、明确的 scope 与真实输入；不得从路线图自动推断授权。
- `EAI13-T012` 及其旧编号对应的 required check、branch protection、Pages environment 是 owner 外部证据。没有真实设置或运行证据时只能记录为未验证。
- commit、push、创建 PR、merge 和 deploy 是不同动作，分别判断授权。默认不修改远端、不直接写入 `main`，也不把本地测试通过写成 D3/D4。
- 不通过放宽门禁、删除历史失败、重置工作树、伪造实践记录或生成新的审查包来制造“进展”。
- `AGENT-DEEPREAD.md` 是显式 opt-in 的专项内容流程，不是默认持续推进入口。

## 停止与交接

出现以下任一情况立即停止当前 run：预算耗尽；需要扩大 scope 或获取新权限；意外工作树重叠；基线或验收无法可靠复现；只能放宽门禁继续；当前实现栈需要 owner/reviewer 决策；没有证据充分的下一切片；连续 3 个 agent 批次没有 external delta。

收尾时更新 `SESSION-HANDOFF.md`，只记录当前状态、scope、起始 ref、已完成切片、验证结果、external outcome、剩余 blocker 和下一条可执行命令。不得复制 ETA、动态数量或可由命令重新获得的易过期快照，也不得把 handoff 当作下一轮授权凭证。
