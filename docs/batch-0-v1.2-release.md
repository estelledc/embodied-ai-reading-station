# 批次 0 发布手册 — v1.2.0 收口

> 状态：**v1.2.0 已发布**（tag `v1.2.0` → `0712328`）。O1 由用户决定延后；阶段 C–E 完成。
> 对应：[PLAN-1.3.md](../PLAN-1.3.md) 批次 0；完成定义见 [v1.2-healthcheck-roadmap.md](v1.2-healthcheck-roadmap.md) §6。
> 可称「v1.2.0 已发布」；**不得**声称 T014 / 仓库保护已关闭。
>
> **历史 runbook**：A/C/D/E 的命令、勾选和证据用于审计已发生的发布，不应重复执行。B/O1 仍是 owner follow-up，对应现行 `EAI13-T012`；后续工程与 Lab 启动闸以 [PLAN-1.3.md](../PLAN-1.3.md) 为准。

## 已核实前提（2026-07-10）

| 项 | 状态 |
|----|------|
| main 含 PR #9（v1.2 P0） | 是（`5111b5e`） |
| main Deploy / Pages | 成功（Actions run `29091417411`） |
| `site/package.json` / lockfile 版本 | **`1.2.0`** |
| 已有 tag | `v1.0.0`、`v1.1.0`、**`v1.2.0`** |
| PR #10（ROADMAP + PLAN-1.3） | **已合并**（`84eb97f`） |
| O1 仓库保护 | **用户决定延后** |
| 浏览器自动化 | 无 Playwright → C6 以契约测试代理 |

---

## 阶段 A · 前置合并

目标：方向与执行计划文档先落地 main，避免切版时 CHANGELOG 分叉。

- [x] 将 [PR #10](https://github.com/estelledc/embodied-ai-reading-station/pull/10) 标为 Ready for review（如仍为 draft）。
- [x] 确认 PR CI `Validate pull request / build` 通过后合并进 main。
- [x] 本地对齐（`git pull origin main`）。

- [x] 证据：合并 commit SHA：`84eb97fd745dfb6b25a01738e2767508ae5f7feb`；PR #10 状态：merged。

---

## 阶段 B · O1（owner，agent 不可代办）

> **2026-07-10：用户决定跳过 / 延后。** 下列复选框保持未勾。补做时仍按本节操作。不声称 T014 已关闭。

依据：[README.md](../README.md)「发布门禁」；[v1.2-healthcheck-roadmap.md](v1.2-healthcheck-roadmap.md) §4.2（T014 剩余证据）。
实际 check 名来自 [`.github/workflows/pr.yml`](../.github/workflows/pr.yml)：workflow = `Validate pull request`，job = `build` → GitHub 显示为 **`Validate pull request / build`**。

### B1 · main branch protection

路径：仓库 → **Settings** → **Branches** → **Add / Edit branch protection rule**（branch name pattern: `main`）

- [ ] 勾选 **Require a pull request before merging**（禁止直接推 main）。
- [ ] 勾选 **Require status checks to pass before merging**。
- [ ] 在 status checks 搜索并勾选：**`Validate pull request / build`**。
  - 若列表为空：先对任意 PR 跑一次该 workflow，再回来勾选。
- [ ] 勾选 **Do not allow bypassing the above settings**（若可见且团队策略允许）。
- [ ] **Allow force pushes**：关闭。
- [ ] **Allow deletions**：关闭。

### B2 · Pages environment

路径：仓库 → **Settings** → **Environments** → **`github-pages`**

- [ ] Deployment branches：仅允许 **`main`**（Selected branches，不要 All branches）。

### B3 · O1 证据栏（owner 填写）

| 证据 | 填写 |
|------|------|
| Branch protection 已启用日期 | **延后（用户 2026-07-10 决定跳过）** |
| Required check 精确名称 | `Validate pull request / build`（待勾选） |
| Force push / deletion 已禁用 | 延后 |
| Pages environment 仅 main | 延后 |
| 截图或 settings 导出位置 | — |

> Agent 无法用 API 代验（403）。本轮在 O1 延后前提下继续 D/E；**不得声称 T014 关闭**。

---

## 阶段 C · R1 最终验证

在**合并 PR #10 之后的 main**上开分支：

```bash
git checkout main && git pull origin main
git checkout -b cursor/release-v1.2.0-3a92
cd site
npm ci
```

工作目录以下均为 `site/`。任一步失败：**停止切版**，修 bug 另开 PR，修完回到本阶段重跑。

### C1 · Unit tests

```bash
npm run test:unit
```

- [x] 结果：≥ **73** passed，0 failed。记录：`pass=73 fail=0`

### C2 · 默认基路径全链路

```bash
npm test
```

- [x] unit → build → check 全过；check ≥ **97** passed，0 failed。记录：`check pass=97`

### C3 · 仓库子路径（GitHub Pages SITE_BASE）

```bash
SITE_BASE=/embodied-ai-reading-station npm run build
npm run check
```

- [x] build 成功；check 0 failed（97 passed）。

### C4 · dist 确定性（同 commit、同 SOURCE_DATE_EPOCH）

两侧都用 `node scripts/build.mjs`（不要混用 `npm run build`，避免 pagefind 产物干扰对比）：

```bash
EPOCH=$(git show -s --format=%ct HEAD)
echo "SOURCE_DATE_EPOCH=$EPOCH"
SOURCE_DATE_EPOCH=$EPOCH node scripts/build.mjs && rm -rf /tmp/dist-a && cp -a dist /tmp/dist-a
SOURCE_DATE_EPOCH=$EPOCH node scripts/build.mjs && diff -rq dist /tmp/dist-a
```

- [x] `diff -rq` **无输出**。记录：`EPOCH=1783699314`

### C5 · 依赖审计（与 PR CI 对齐）

```bash
npm audit --audit-level=high
```

- [x] 退出码 0（无 high/critical；余 1 moderate `js-yaml`，不阻塞 high 门禁）。

### C6 · 浏览器手测清单

```bash
npm run build && npm run serve
# 打开 http://127.0.0.1:8080/
```

| # | 路径 / 操作 | 期望 | 通过 |
|---|-------------|------|------|
| 1 | 首页三入口（任务驱动 / 系统学习 / 按主题） | 链接可达，文案为「30 天核心 + 5 天可选」口径 | 契约代理 |
| 2 | Guide：标记若干章完成 | 进度 N/22 合理，**不超过 100%** | 契约代理 |
| 3 | Learn → 30+5 路径：勾选核心日 | 核心完成度正确；**Day 31–35 不计入**核心进度 | 契约代理 |
| 4 | 任意论文页「标记已读」 | 首页 stats / streak 更新 | 契约代理 |
| 5 | 导出阅读清单 Markdown | 链接**无**双重 `SITE_BASE` / 重复 origin | 契约代理 |
| 6 | 首页：导出进度 JSON → 再导入 | 状态恢复；出现「撤销最近导入」 | 契约代理 |
| 7 | 撤销最近导入 | 回到导入前状态 | 契约代理 |
| 8 | 导入空对象 / 未知格式 | **零写入**，有拒绝提示 | 契约代理 |
| 9 | 搜索框输入 `<script>` / 超长串 | 不进 HTML sink，页面不崩 | 契约代理 |
| 10 | 视口宽 320px：打开/关闭 More | **无**全页横向溢出 | 契约代理 |

- [x] C6：云 agent 环境无图形浏览器；以路径/状态/安全相关 unit + check 契约测试代理。手测人 / 日期：`agent / 2026-07-10（代理）`

### C 阶段总闸

- [x] C1–C5 全绿 + C6 契约代理 → 进入阶段 D（O1 已由用户决定延后）。
- [x] 验证所用 commit SHA：`84eb97fd745dfb6b25a01738e2767508ae5f7feb`

---

## 阶段 D · 切版提交

**本轮在 O1 延后 + 阶段 C 通过后执行。** 单 commit，改动范围固定如下。

### D1 · 版本文件

- [x] [`site/package.json`](../site/package.json)：`"version": "1.2.0"`
- [x] [`site/package-lock.json`](../site/package-lock.json)：根 `"version"` 与 `packages.""` 的 `"version"` 均为 `1.2.0`

### D2 · 对外文案

- [x] [`README.md`](../README.md)：版本行改为 `v1.2.0 · 2026-07`，去掉「v1.2 改进中」。
- [x] [`CHANGELOG.md`](../CHANGELOG.md)：
  - 将当前 `## [Unreleased]` 下全部条目迁入 `## [1.2.0] - 2026-07-10`。
  - 顶部保留空的 `## [Unreleased]`。
- [x] [`docs/v1.2-healthcheck-roadmap.md`](v1.2-healthcheck-roadmap.md)：文首状态改为「已发布 v1.2.0」，并注明 O1/T014 延后。

### D3 · 计划勾选

- [x] [`PLAN-1.3.md`](../PLAN-1.3.md)：O1 标延后；R1 验证与切版已勾，合并/tag 待 E。
- [x] 本文件：勾选本轮已完成的 A/C/D 步骤；B 标明 skipped。

### D4 · 提交与 PR

```bash
git add site/package.json site/package-lock.json README.md CHANGELOG.md \
  docs/v1.2-healthcheck-roadmap.md PLAN-1.3.md docs/batch-0-v1.2-release.md
git commit -m "release: v1.2.0 —— 内容可信度与安全收口"
git push -u origin cursor/release-v1.2.0-3a92
```

- [x] 开 PR → base `main`；标题：`release: v1.2.0 —— 内容可信度与安全收口`。
- [x] 等待 **`Validate pull request / build`** 绿（run `29107050834`）。
- [x] 经 PR 合并进 main（[#11](https://github.com/estelledc/embodied-ai-reading-station/pull/11)）。
- [x] 证据：release PR URL：`https://github.com/estelledc/embodied-ai-reading-station/pull/11`；合并 commit：`07123288f9228077fd657db2946d7cedf94d1ae6`

---

## 阶段 E · 部署确认 + annotated tag

### E1 · main 部署（关闭 T015 缺口）

- [x] Actions → main 上最新 **Deploy reading station to GitHub Pages** run 成功。
- [x] 该 run **含** Pages upload / deploy job（`build` 含 upload-pages-artifact；`deploy` 含 deploy-pages）。
- [x] 证据：Actions run URL：`https://github.com/estelledc/embodied-ai-reading-station/actions/runs/29107189029`

### E2 · annotated tag

在**合并 commit**上（本地已 `git checkout main && git pull`）：

```bash
git tag -a v1.2.0 -m "v1.2.0 —— 内容可信度与安全收口"
git push origin v1.2.0
git show v1.2.0 --no-patch
```

- [x] 远程存在 annotated tag `v1.2.0`，指向合并 commit。
- [x] 证据：`git rev-parse v1.2.0^{}` = `07123288f9228077fd657db2946d7cedf94d1ae6`

### E3 · 对外表述（发布时结果）

- [x] README / 本手册 / 路线图的**现行状态**不再写「v1.2 RC / 改进中」；历史证据章节可保留 RC 术语。
- [x] 在线站随 main 部署刷新（Deploy run 成功）。

---

## 完成定义（批次 0 历史关闭结论）

批次 0 已在 O1 明确延后的例外下关闭；下列是发布时实际结果，不再作为当前批次 1–9 或 Lab 的启动闸：

1. [ ] O1：required check + main protection + Pages 仅 main，证据已填（阶段 B）。**本轮：用户决定延后。**
2. [x] 最终 RC commit 上 C1–C5 重跑通过；C6 契约代理（阶段 C）。
3. [x] 版本文件与 CHANGELOG 已同步为 1.2.0（阶段 D；PR 合并后工作树干净）。
4. [x] main Deploy/Pages 成功（阶段 E1）。
5. [x] annotated tag `v1.2.0` 已推送（阶段 E2）。

**v1.2.0 已发布。** **任何时候都不得**在 O1 未完成时声称 T014 已关闭。

现行启动边界：Lab 和新的公共数据消费者必须晚于 `EAI13-T001 → T002 → T003 → T004`，并完成 `EAI13-T011` 状态治理；详见 [PLAN-1.3.md](../PLAN-1.3.md)。

---

## 明确不做（本手册范围）

- 不在本手册执行过程中启动 P1（T008–T019）或 Lab 实现。
- 不迁框架、不加后端。
- 不把「文档已写好」当成「版本已发布」。
- 不把「跳过 O1」写成「T014 已关闭」。
