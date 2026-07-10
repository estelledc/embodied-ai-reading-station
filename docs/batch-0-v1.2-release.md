# 批次 0 发布手册 — v1.2.0 收口

> 状态：待执行（本文件是清单，不是发布公告）。
> 对应：[PLAN-1.3.md](../PLAN-1.3.md) 批次 0；完成定义见 [v1.2-healthcheck-roadmap.md](v1.2-healthcheck-roadmap.md) §6。
> **本手册本身不切版。** 只有阶段 C 全绿后，才允许进入阶段 D 改版本号 / 打 tag。

## 已核实前提（2026-07-10）

| 项 | 状态 |
|----|------|
| main 含 PR #9（v1.2 P0） | 是（`5111b5e`） |
| main Deploy / Pages | 成功（Actions run `29091417411`） |
| `site/package.json` / lockfile 版本 | 仍为 `1.1.0` |
| 已有 tag | `v1.0.0`、`v1.1.0` |
| PR #10（ROADMAP + PLAN-1.3） | draft，须先合并（阶段 A） |
| 分支保护 API（agent） | 403 → O1 只能由 owner 在 GitHub UI 完成 |
| 浏览器自动化 | 无 Playwright → 阶段 C 用手测清单 |

---

## 阶段 A · 前置合并

目标：方向与执行计划文档先落地 main，避免切版时 CHANGELOG 分叉。

- [ ] 将 [PR #10](https://github.com/estelledc/embodied-ai-reading-station/pull/10) 标为 Ready for review（如仍为 draft）。
- [ ] 确认 PR CI `Validate pull request / build` 通过后合并进 main。
- [ ] 本地对齐：

```bash
git fetch origin main
git checkout main
git pull origin main
git status   # 工作树干净
test -f ROADMAP.md && test -f PLAN-1.3.md && echo "docs ok"
```

- [ ] 证据：合并 commit SHA：`________`；PR #10 状态：merged。

---

## 阶段 B · O1（owner，agent 不可代办）

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
| Branch protection 已启用日期 | |
| Required check 精确名称 | `Validate pull request / build` |
| Force push / deletion 已禁用 | 是 / 否 |
| Pages environment 仅 main | 是 / 否 |
| 截图或 settings 导出位置 | （可选，本地或 issue 附件） |

> Agent 无法用 API 代验（403）。未完成 O1 不得进入阶段 D 合并 release PR（可先在分支上做阶段 C 验证，但不得声称 T014 关闭）。

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

- [ ] 结果：≥ **73** passed，0 failed。记录：`pass=____ fail=____`

### C2 · 默认基路径全链路

```bash
npm test
```

- [ ] unit → build → check 全过；check ≥ **97** passed，0 failed。记录：`check pass=____`

### C3 · 仓库子路径（GitHub Pages SITE_BASE）

```bash
SITE_BASE=/embodied-ai-reading-station npm run build
npm run check
```

- [ ] build 成功；check 0 failed。

### C4 · dist 确定性（同 commit、同 SOURCE_DATE_EPOCH）

两侧都用 `node scripts/build.mjs`（不要混用 `npm run build`，避免 pagefind 产物干扰对比）：

```bash
EPOCH=$(git show -s --format=%ct HEAD)
echo "SOURCE_DATE_EPOCH=$EPOCH"
SOURCE_DATE_EPOCH=$EPOCH node scripts/build.mjs && rm -rf /tmp/dist-a && cp -a dist /tmp/dist-a
SOURCE_DATE_EPOCH=$EPOCH node scripts/build.mjs && diff -rq dist /tmp/dist-a
```

- [ ] `diff -rq` **无输出**。记录：`EPOCH=____`

### C5 · 依赖审计（与 PR CI 对齐）

```bash
npm audit --audit-level=high
```

- [ ] 退出码 0（无 high/critical）。若失败：先修依赖再继续。

### C6 · 浏览器手测清单

```bash
npm run build && npm run serve
# 打开 http://127.0.0.1:8080/
```

| # | 路径 / 操作 | 期望 | 通过 |
|---|-------------|------|------|
| 1 | 首页三入口（任务驱动 / 系统学习 / 按主题） | 链接可达，文案为「30 天核心 + 5 天可选」口径 | [ ] |
| 2 | Guide：标记若干章完成 | 进度 N/22 合理，**不超过 100%** | [ ] |
| 3 | Learn → 30+5 路径：勾选核心日 | 核心完成度正确；**Day 31–35 不计入**核心进度 | [ ] |
| 4 | 任意论文页「标记已读」 | 首页 stats / streak 更新 | [ ] |
| 5 | 导出阅读清单 Markdown | 链接**无**双重 `SITE_BASE` / 重复 origin | [ ] |
| 6 | 首页：导出进度 JSON → 再导入 | 状态恢复；出现「撤销最近导入」 | [ ] |
| 7 | 撤销最近导入 | 回到导入前状态 | [ ] |
| 8 | 导入空对象 / 未知格式 | **零写入**，有拒绝提示 | [ ] |
| 9 | 搜索框输入 `<script>` / 超长串 | 不进 HTML sink，页面不崩 | [ ] |
| 10 | 视口宽 320px：打开/关闭 More | **无**全页横向溢出 | [ ] |

- [ ] C6 全部勾选通过。手测人 / 日期：`________`

### C 阶段总闸

- [ ] C1–C6 全部通过 → 允许进入阶段 D。
- [ ] 验证所用 commit SHA：`________`

---

## 阶段 D · 切版提交

**仅在阶段 B（O1）与阶段 C 均完成后执行。** 单 commit，改动范围固定如下。

### D1 · 版本文件

- [ ] [`site/package.json`](../site/package.json)：`"version": "1.2.0"`
- [ ] [`site/package-lock.json`](../site/package-lock.json)：根 `"version"` 与 `packages.""` 的 `"version"` 均为 `1.2.0`

### D2 · 对外文案

- [ ] [`README.md`](../README.md)：版本行改为 `v1.2.0 · 2026-07`，去掉「v1.2 改进中」。
- [ ] [`CHANGELOG.md`](../CHANGELOG.md)：
  - 将当前 `## [Unreleased]` 下全部条目迁入 `## [1.2.0] - YYYY-MM-DD`（日期用合并当日）。
  - 顶部保留空的 `## [Unreleased]`（可无子节，或只留标题）。
- [ ] [`docs/v1.2-healthcheck-roadmap.md`](v1.2-healthcheck-roadmap.md)：文首状态改为「已发布 v1.2.0」，并指向 CHANGELOG `[1.2.0]` 段。

### D3 · 计划勾选

- [ ] [`PLAN-1.3.md`](../PLAN-1.3.md)：勾选批次 0 的 O1 / R1 复选框。
- [ ] 本文件：勾选本轮已完成的 A–D 步骤。

### D4 · 提交与 PR

```bash
git add site/package.json site/package-lock.json README.md CHANGELOG.md \
  docs/v1.2-healthcheck-roadmap.md PLAN-1.3.md docs/batch-0-v1.2-release.md
git commit -m "release: v1.2.0 —— 内容可信度与安全收口"
git push -u origin cursor/release-v1.2.0-3a92
```

- [ ] 开 PR → base `main`；标题建议：`release: v1.2.0 —— 内容可信度与安全收口`。
- [ ] 等待 **`Validate pull request / build`** 绿（O1 生效后此为 required）。
- [ ] 经 PR 合并进 main（禁止直推）。
- [ ] 证据：release PR URL：`________`；合并 commit：`________`

---

## 阶段 E · 部署确认 + annotated tag

### E1 · main 部署（关闭 T015 缺口）

- [ ] Actions → main 上最新 **Deploy reading station to GitHub Pages** run 成功。
- [ ] 该 run **含** Pages upload / deploy job（对比：PR workflow 不得含 Pages job）。
- [ ] 证据：Actions run URL：`________`

### E2 · annotated tag

在**合并 commit**上（本地已 `git checkout main && git pull`）：

```bash
git tag -a v1.2.0 -m "v1.2.0 —— 内容可信度与安全收口"
git push origin v1.2.0
git show v1.2.0 --no-patch
```

- [ ] 远程存在 annotated tag `v1.2.0`，指向合并 commit。
- [ ] 证据：`git rev-parse v1.2.0^{}` = `________`

### E3 · 对外表述

- [ ] README / 本手册 / 路线图不再写「v1.2 RC / 改进中」。
- [ ] 在线站首页或 About 与版本叙事一致（随 main 部署刷新）。

---

## 完成定义（批次 0 关闭闸）

以下全部满足后，方可启动 [PLAN-1.3.md](../PLAN-1.3.md) 批次 1–9：

1. [ ] O1：required check + main protection + Pages 仅 main，证据已填（阶段 B）。
2. [ ] 最终 RC commit 上 C1–C6 重跑通过（阶段 C）。
3. [ ] 版本文件与 CHANGELOG 已同步为 1.2.0，工作树干净（阶段 D）。
4. [ ] main Deploy/Pages 成功（阶段 E1）。
5. [ ] annotated tag `v1.2.0` 已推送（阶段 E2）。

未完成前，对外统一表述为「v1.2 RC / 改进中」，**不得**声称 v1.2 已发布。

---

## 明确不做（本手册范围）

- 不在本手册执行过程中启动 P1（T008–T019）或 Lab 实现。
- 不迁框架、不加后端。
- 不把「文档已写好」当成「版本已发布」。
