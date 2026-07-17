# 论文批量迭代 Playbook

本文沉淀 2026-07-14 至 2026-07-15 的 40 篇 / 10 批 embodied AI 论文扩充 campaign。它的目标不是替代 `AGENTS.md`、`docs/operations-index.md` 或 `AGENT-DEEPREAD.md`，而是把这轮实际跑通的笔记、资产、provenance、PR、Pages 和 handoff 流程整理成后续可复用的项目文档。

## 1. 适用范围

适用：

- 新增一批 1-5 篇论文 deep-read 笔记。
- 批量补齐 card / inline WebP 资产与 portable receipts。
- 刷新 `papers/provenance.json`、Data API inventory、测试计数和公开文案。
- 走内容 PR -> Pages deploy -> online smoke -> post-deploy handoff PR 的完整闭环。

不适用：

- 真实机器人 / MuJoCo / SmolVLA 实验复现。
- 未经用户授权的既有笔记正文改写。
- owner 级仓库设置、branch protection 或 Pages 环境设置。
- 清理本地未跟踪 `scripts/` 目录。这个目录当前是历史本地 helper，不是 portable source of truth。

## 2. 复用性审查发现

这轮把 playbook 当作下一位 agent 的执行入口重新走了一遍，发现三类容易误用的点：

- `docs/paper-onboarding-guide.md` 是单篇旧笔记升级的历史参考，正文里保留过旧命令形态。批量新增、资产登记、部署和 handoff 以本文为准。
- `content_commit` 是已存在的内容输入快照，不能指向即将写入的 manifest 提交。任何 late fix、trailing whitespace 清理或资产补登之后，都要重新确认最终 `content_commit`、manifest 统计与 handoff 记录一致。
- 未跟踪 `scripts/` 只能当历史 helper 参考。若要让脚本成为复用流程的一部分，必须迁入 `site/scripts/`，补测试，并纳入版本控制。

## 3. 本轮产物地图

| 工件 | 角色 | 维护方式 |
|---|---|---|
| `PLAN-40-PAPERS.md` | 10 批 / 40 篇计划台账 | 每批从候选 -> 来源锁定 -> 本地验证 -> 已部署 |
| `SESSION-HANDOFF.md` | 当前 cycle 接班合同 | 每批顶部新增 active block，部署后标 completed |
| `notes/<slug>.md` | Markdown 源真相 | deep-read 正文，只写可回到原文核验的事实 |
| `.tmp-receipts/<slug>-assets.json` | 生成资产 portable receipt | 与资产一起提交，记录输入源、生成器、输出 hash |
| `site/src/images/cards/` | 论文卡片 WebP | 每篇 full + 800w |
| `site/src/images/inline/` | 正文 scene / method WebP | 每篇 scene full/800 + method full/800 |
| `papers/provenance.json` | canonical manifest | 由 `site/scripts/generate-provenance.mjs` 和 `recordGeneratedAsset` 维护 |
| `site/scripts/check.mjs` | 项目健康门禁 | note count、CSP budget、size budget 等随 inventory 同步 |
| `site/scripts/lib/*.test.mjs` | 可执行契约 | note/provenance/card 计数必须随 manifest 同步 |

最近两批示例：

| 批次 | 笔记 | 内容 PR | Handoff PR |
|---|---|---:|---:|
| Batch 9 | `discrete-policy`、`gembench`、`language-conditioned-manipulation-survey`、`safeembodai` | #48 | #49 |
| Batch 10 | `causal-world-models-embodied-ai`、`call-for-embodied-ai`、`robotics-foundation-models-survey`、`embodied-ai-security-cps-survey` | #50 | #51 |

完整 40 篇以 `PLAN-40-PAPERS.md` 为准，不在本文复制正文台账。

## 4. 标准批次流程

### 4.1 接班与基线

从已接受的 `main` 开始：

```bash
git status --short --branch
git fetch origin main
git rev-list --left-right --count origin/main...HEAD
git diff --stat origin/main...HEAD
```

若有未跟踪或用户改动，先判断是否与本批重叠。本轮历史上 `scripts/` 一直保持未跟踪，所有批次都明确“不纳入也不删除”。

创建批次分支：

```bash
git switch -c codex/forty-papers-batchNN
```

在 `SESSION-HANDOFF.md` 顶部写 active contract，至少包含：

```yaml
status: in_progress
program_status: ACTIVE
cycle_state: SOURCE_LOCKED
cycle_id: EAIRS-CYCLE-YYYYMMDD-FORTY-PAPERS-BATCHNN
scope: ten-batches-forty-new-papers-batchNN-four-deep-read-notes
branch: codex/forty-papers-batchNN
start_ref: <accepted-main-sha>
baseline_ref: origin/main
review_after: batchNN deploy or blocker
external_outcome: primary-sources-locked-pending-notes-assets-validation-pr-ci-merge-pages-deploy
```

### 4.2 来源锁定

先本地去重：

```bash
rg -n "<slug-or-title-keywords>" notes papers/provenance.json PLAN-40-PAPERS.md
```

再锁一手来源：

- 优先 arXiv abs / PDF、OpenReview、作者项目页。
- 搜索可用 `agent-reach` 的 Exa backend；遇到 429 时用 arXiv API fallback。
- 临时 PDF / txt 放在 `/tmp/<campaign>/`，不要写进仓库。

示例：

```bash
mkdir -p /tmp/embodied-ai-batchNN
curl -L --fail -o /tmp/embodied-ai-batchNN/<slug>.pdf https://arxiv.org/pdf/<id>
pdftotext -layout /tmp/embodied-ai-batchNN/<slug>.pdf /tmp/embodied-ai-batchNN/<slug>.txt
pdfinfo /tmp/embodied-ai-batchNN/<slug>.pdf
```

来源锁定后更新 `PLAN-40-PAPERS.md` 与 `SESSION-HANDOFF.md`，提交一笔：

```bash
git add PLAN-40-PAPERS.md SESSION-HANDOFF.md
git commit -m "更新论文计划：锁定第 NN 批来源"
```

### 4.3 写 deep-read 笔记

按 `AGENT-DEEPREAD.md` 写 `notes/<slug>.md`。Frontmatter 最小字段：

```yaml
---
title: "<paper title>"
slug: <slug>
topic: <topic>
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/<id>"
venue: arXiv
year: 2026
era: frontier
num: <next-number>
generated_at: YYYY-MM-DD
---
```

正文必须包含这些门禁章节：

- `实验结果说明了什么`
- `和本导读的关系`
- `思考题`
- `原文信息`

硬门槛：

- 正式 `countWords(content) >= 4000`。代码块会被剔除，不要靠 ASCII 图凑字数。
- 笔记层视觉元素至少 2 个。ASCII 图必须满足 check 规则：包含 box drawing 字符，或包含 `->` 且代码块长度大于 80。
- 公开数字只写“论文报告”，不写成本项目复现。

轻量预检：

```bash
node --input-type=module <<'NODE'
import fs from "node:fs";
import { countWords } from "./site/scripts/lib/markdown.mjs";

function stripFrontmatter(raw) {
  return raw.replace(/^---\n[\s\S]*?\n---\n/, "");
}

function countAscii(body) {
  const blocks = body.match(/```[\s\S]*?```/g) || [];
  return blocks.filter((b) => /[┌┐└┘│─├┤→]/.test(b) || (b.includes("->") && b.length > 80 && !/^```python/i.test(b))).length;
}

for (const slug of ["<slug-1>", "<slug-2>"]) {
  const content = stripFrontmatter(fs.readFileSync(`notes/${slug}.md`, "utf8"));
  console.log(`${slug}: words=${countWords(content)} ascii=${countAscii(content)}`);
}
NODE
```

正文通过后提交：

```bash
git add notes/<slug-1>.md notes/<slug-2>.md
git commit -m "添加第 NN 批论文笔记：<主题摘要>"
```

### 4.4 刷新 provenance 初始 note inventory

写完 note 后先把 note 纳入 manifest。这里的 `content_commit` 指向“正文已提交但资产还未生成”的快照：

```bash
PROVENANCE_CONTENT_COMMIT=$(git rev-parse HEAD) node site/scripts/generate-provenance.mjs
node site/scripts/generate-provenance.mjs --check
git add papers/provenance.json
git commit -m "更新论文来源清单：纳入第 NN 批笔记"
```

这里形成的是 content snapshot -> manifest attestation 两段式：`content_commit` 指向已经存在的 note / source / asset bytes 快照，manifest 提交本身只是证明文件，不能自引用。

如果后续又改了 note、来源文件或资产 bytes：

1. 先提交新的内容快照。
2. 用新的 `PROVENANCE_CONTENT_COMMIT=$(git rev-parse HEAD)` 重新生成 manifest。
3. 重新跑 `node site/scripts/generate-provenance.mjs --check` 和受影响门禁。
4. 回填 `SESSION-HANDOFF.md` 里的最终 `content_commit`、统计和验证命令。

## 5. 资产与脚本复用

### 5.1 推荐脚本

优先复用已跟踪脚本：

| 脚本 | 用途 |
|---|---|
| `site/scripts/generate-provenance.mjs` | 生成 / 校验 canonical manifest |
| `site/scripts/gen-topic-fallback-assets.mjs` | 用单个 topic 图原子生成 card + inline 六个 WebP、combined receipt，并在资产提交后登记 provenance |
| `site/scripts/fill-missing-inline.mjs` | 为单篇生成 inline scene / method WebP |
| `site/scripts/fill-missing-cards.mjs` | 为单篇生成 card WebP |
| `site/scripts/check.mjs` | 全站健康检查 |
| `site/scripts/lib/asset-generation.mjs` | receipt、图片探测、provenance 登记底层 API |

`scripts/generate-assets-batch.py` 和 `scripts/update-provenance-batch.py` 是历史本地 helper，当前未跟踪。它们可以作为思路参考，但不要直接作为新 campaign 的 source of truth；它们没有完整走 `recordGeneratedAsset` 的 Git blob / manifest CAS 闭环。若要长期复用，应迁入 `site/scripts/`、补测试，再纳入版本控制。

### 5.2 官方 split receipt 路径

下面命令默认从仓库根目录运行。生成和登记是两步：先生成资产与 receipt，提交包含资产 bytes 的快照；再用该快照作为 `content_commit` 登记到 manifest。不要在 dirty manifest 上连续登记多份 receipt。

生成 inline：

```bash
CONTENT_COMMIT=$(git rev-parse HEAD)
node site/scripts/fill-missing-inline.mjs \
  --slug <slug> \
  --content-commit "$CONTENT_COMMIT" \
  --receipt-file .tmp-receipts/<slug>-inline.json
```

提交 inline 资产快照：

```bash
git add .tmp-receipts/<slug>-inline.json site/src/images/inline/<slug>-*.webp
git commit -m "添加第 NN 批 inline 资产：<slug>"
```

登记 inline provenance：

```bash
ASSET_COMMIT=$(git rev-parse HEAD)
node site/scripts/fill-missing-inline.mjs \
  --record \
  --slug <slug> \
  --content-commit "$ASSET_COMMIT" \
  --receipt-file .tmp-receipts/<slug>-inline.json
git add papers/provenance.json
git commit -m "登记第 NN 批 inline 资产：<slug>"
```

再生成 card。`fill-missing-cards.mjs` 会优先使用 `papers/<slug>/images/img_000.jpg`，其次可能使用刚生成的 inline scene，因此这里重新取一次 `CONTENT_COMMIT`，保证候选输入已经存在于 Git 快照中：

```bash
CONTENT_COMMIT=$(git rev-parse HEAD)
node site/scripts/fill-missing-cards.mjs \
  --slug <slug> \
  --content-commit "$CONTENT_COMMIT" \
  --receipt-file .tmp-receipts/<slug>-card.json
git add .tmp-receipts/<slug>-card.json site/src/images/cards/<slug>*.webp
git commit -m "添加第 NN 批 card 资产：<slug>"
```

登记 card provenance：

```bash
ASSET_COMMIT=$(git rev-parse HEAD)
node site/scripts/fill-missing-cards.mjs \
  --record \
  --slug <slug> \
  --content-commit "$ASSET_COMMIT" \
  --receipt-file .tmp-receipts/<slug>-card.json
git add papers/provenance.json
git commit -m "登记第 NN 批 card 资产：<slug>"
```

### 5.3 Combined receipt 路径

Batch 9/10 为了减少登记提交数，使用了“每篇 1 个 receipt，包含 card + inline 的 6 个 outputs”的 combined receipt。后续仅在输入确实是单个 tracked topic 图时使用已跟踪入口：

```bash
CONTENT_COMMIT=$(git rev-parse HEAD)
node site/scripts/gen-topic-fallback-assets.mjs \
  --dry-run \
  --slug <slug> \
  --topic <topic> \
  --content-commit "$CONTENT_COMMIT" \
  --receipt-file .tmp-receipts/<slug>-assets.json

node site/scripts/gen-topic-fallback-assets.mjs \
  --slug <slug> \
  --topic <topic> \
  --content-commit "$CONTENT_COMMIT" \
  --receipt-file .tmp-receipts/<slug>-assets.json
```

该命令把 card、scene、method 的 full/800 六个输出和 receipt 放进一个原子事务；任一转换、校验或 receipt 写入失败时整组回滚。生成后先提交 receipt 与六个资产，再用资产提交做只读登记检查，确认通过后才写 manifest：

```bash
ASSET_COMMIT=$(git rev-parse HEAD)
node site/scripts/gen-topic-fallback-assets.mjs \
  --record --dry-run \
  --slug <slug> \
  --content-commit "$ASSET_COMMIT" \
  --receipt-file .tmp-receipts/<slug>-assets.json

node site/scripts/gen-topic-fallback-assets.mjs \
  --record \
  --slug <slug> \
  --content-commit "$ASSET_COMMIT" \
  --receipt-file .tmp-receipts/<slug>-assets.json
```

注意不要把历史 combined receipt 传给 `fill-missing-inline.mjs` 或 `fill-missing-cards.mjs` 做 split receipt 验证；这两个脚本只接受自己生成的 split receipt。真实回归中，如果把 `.tmp-receipts/<slug>-assets.json` 传进去，会得到预期失败：

```text
FAIL receipt was not created by fill-missing-inline
FAIL receipt was not created by fill-missing-cards
```

因此：

- 有论文原图、需要不同 card / inline 语义或不适合 topic fallback 时，仍优先用第 5.2 节 split receipt 路径。
- 单个 topic 图生成六个同源输出时，使用 `gen-topic-fallback-assets.mjs`，不用临时 snippet。
- 已存在的 Batch 9/10 combined receipt，用 `node site/scripts/generate-provenance.mjs --check`、manifest 统计脚本和线上 smoke 验证。
- 历史 `cwebp-fallback/topic-assets/v1` receipts 保持原样；新入口生成 `cwebp-fallback/topic-assets/v2`，不伪装成旧生成器。

Combined receipt 必须满足：

- `generator` 固定为可识别的生成器 ID；新入口使用 `cwebp-fallback/topic-assets/v2`。
- `inputs.input_content_commit` 指向 note/provenance 输入快照。
- `inputs.sources[]` 记录 topic fallback 图及 SHA-256。
- `outputs[]` 包含 6 个文件：
  - `site/src/images/cards/<slug>.webp`
  - `site/src/images/cards/<slug>-800.webp`
  - `site/src/images/inline/<slug>-scene.webp`
  - `site/src/images/inline/<slug>-scene-800.webp`
  - `site/src/images/inline/<slug>-method.webp`
  - `site/src/images/inline/<slug>-method-800.webp`

登记时仍然遵守“一次 manifest 写入后立即提交”的 CAS 规则。

## 6. 计数与预算同步

每批新增 4 篇并登记 24 个资产后，通常要同步：

| 文件 | 常见字段 |
|---|---|
| `README.md` | note count、remote source count、质量边界 |
| `CHANGELOG.md` | Unreleased 增加批次说明 |
| `PLAN-40-PAPERS.md` | 状态列 |
| `SESSION-HANDOFF.md` | cycle_state、统计、验收命令 |
| `site/scripts/check.mjs` | expectedNoteCount、公开文案计数、CSP/size budget |
| `site/scripts/lib/content.test.mjs` | `notes.length` |
| `site/scripts/lib/provenance.test.mjs` | notes/local/remote/generated_assets/checked_paths |
| `site/scripts/lib/responsive-images.test.mjs` | card 数量、generated card 数量 |
| `site/scripts/lib/csp.mjs` / `csp.test.mjs` | CSP style attribute budget |

统计脚本：

```bash
node --input-type=module <<'NODE'
import fs from "node:fs";
const p = JSON.parse(fs.readFileSync("papers/provenance.json", "utf8"));
console.log(JSON.stringify({
  notes: p.notes.length,
  local_sources: p.notes.filter(n => n.source?.kind === "local").length,
  remote_sources: p.notes.filter(n => n.source?.kind === "remote").length,
  generated_assets: p.notes.reduce((sum, n) => sum + (n.generated_assets?.length || 0), 0),
  checked_paths: p.notes.length
    + p.notes.filter(n => n.source?.kind === "local").length
    + p.notes.reduce((sum, n) => sum + (n.generated_assets?.length || 0), 0),
  content_commit: p.content_commit,
}, null, 2));
NODE
```

CSP 与 size budget 不要提前猜。先跑 `npm run check`，按实际输出最小更新：

- `maxAttributeCount`
- `maxUniqueValueCount`
- `uniqueValueSha256`
- `papers/index.html` repo-base 专项预算

## 7. 本地验证阶梯

完整批次验收：

```bash
cd site
npm run test:unit
npm run build
npm run check
SITE_BASE=/embodied-ai-reading-station npm run build
SITE_BASE=/embodied-ai-reading-station npm run check
cd ..
git diff --check
git diff --check origin/main...HEAD
```

常见失败与处理：

| 失败 | 典型原因 | 处理 |
|---|---|---|
| `content changed while reusing content_commit` | 修改 note 后未刷新 provenance | 提交 note 修正后重新 `PROVENANCE_CONTENT_COMMIT=$(git rev-parse HEAD) node site/scripts/generate-provenance.mjs` |
| `NOTE_HASH_MISMATCH` | manifest 指向旧 note bytes | 同上 |
| `manifest must match both index and HEAD` | dirty manifest 上连续登记资产 | 每次 `recordGeneratedAsset` 后提交，再登记下一份 |
| CSP budget drift | 新页面改变 inline style inventory | 跑 check 后按实际 count / digest 最小更新 |
| `deep-read 长篇结构化笔记均 ≥ 4000 字` | 正式字数会剔除代码块 | 补正文解释，不靠 ASCII 图凑数 |
| `视觉元素 < 2` | ASCII 图不符合 check 规则 | 增加包含 `->` 且长度足够的 `text` 代码块，或引用论文图 |
| repo-base `papers/index.html` 超预算 | `/embodied-ai-reading-station` 前缀使 HTML 变大 | 小幅更新专项预算，并记录原因 |

如果 `git diff --check` 之后修了空白或正文，不能只重跑 diff。凡是 note/source/asset bytes 变了，都回到第 4.4 节刷新 provenance，再跑完整受影响门禁。

## 8. PR、部署与线上 smoke

内容 PR：

```bash
git push -u origin codex/forty-papers-batchNN
gh pr create --base main --head codex/forty-papers-batchNN \
  --title "Batch NN: add <theme> deep-read notes" \
  --body "<summary + verification>"
gh pr checks <pr> --watch --interval 10
gh pr merge <pr> --merge --delete-branch
```

等待 Pages：

```bash
gh run list --branch main --limit 3
gh run watch <run-id> --interval 10 --exit-status
```

线上 smoke 模板：

```bash
node <<'NODE'
const base = "https://estelledc.github.io/embodied-ai-reading-station";
const slugs = ["<slug-1>", "<slug-2>", "<slug-3>", "<slug-4>"];

async function getJson(path) {
  const res = await fetch(base + path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

async function headOrGet(path) {
  let res = await fetch(base + path, { method: "HEAD", cache: "no-store" });
  if (res.status === 405) res = await fetch(base + path, { cache: "no-store" });
  return { path, status: res.status, ok: res.ok, bytes: res.headers.get("content-length") };
}

const papers = await getJson("/data/v2/papers.json");
const provenance = await getJson("/data/v2/provenance.json");
const paperItems = Array.isArray(papers.data) ? papers.data.length : Array.isArray(papers.items) ? papers.items.length : Array.isArray(papers) ? papers.length : -1;
const notes = provenance.notes?.length ?? -1;
const remoteSources = provenance.notes?.filter(note => note.source?.kind === "remote").length ?? -1;
const generatedAssets = provenance.notes?.reduce((sum, note) => sum + (note.generated_assets?.length ?? 0), 0) ?? -1;
console.log({ paperItems, notes, remoteSources, generatedAssets });

const paths = [];
for (const slug of slugs) {
  paths.push(`/papers/${slug}/`);
  paths.push(`/images/cards/${slug}-800.webp`);
  paths.push(`/images/inline/${slug}-method-800.webp`);
  paths.push(`/images/inline/${slug}-scene-800.webp`);
}
for (const result of await Promise.all(paths.map(headOrGet))) {
  console.log(`${result.status} ${result.path}${result.bytes ? ` ${result.bytes}B` : ""}`);
  if (!result.ok) throw new Error(`${result.path} HTTP ${result.status}`);
}
NODE
```

部署后单独开 handoff PR，只改 `PLAN-40-PAPERS.md` 和 `SESSION-HANDOFF.md`。

## 9. Handoff 完成态

部署并 smoke 通过后，顶部 cycle 改为：

```yaml
status: completed
program_status: COMPLETE
cycle_state: DEPLOYED
review_after: complete
external_outcome: pr-<content-pr>-merged-and-pages-deployed
```

并记录：

- 内容 PR / handoff PR 编号。
- merge commit。
- Pages workflow ID。
- 本地验证命令与结果。
- online smoke 计数与新增页面 / 资源 200。
- 最终 `papers/provenance.json` 的 `content_commit` 与 notes / remote_sources / generated_assets 统计；如果部署后又做 handoff 或空白修复，重新核对这里。
- 仍存在但未触碰的旁路项，例如 `?? scripts/`。

提交 handoff 前，用真实 manifest 打一遍最终锚点，避免 late fix 后留下旧快照：

```bash
node --input-type=module <<'NODE'
import fs from "node:fs";
const p = JSON.parse(fs.readFileSync("papers/provenance.json", "utf8"));
console.log(JSON.stringify({
  notes: p.notes.length,
  remote_sources: p.notes.filter(n => n.source?.kind === "remote").length,
  generated_assets: p.notes.reduce((sum, n) => sum + (n.generated_assets?.length || 0), 0),
  content_commit: p.content_commit,
}, null, 2));
NODE
sed -n '1,45p' SESSION-HANDOFF.md | rg -n "content_commit=|merge commit|本地 `main`"
```

## 10. 后续迭代建议

1. 若继续批量收录论文，先按第 5.3 节运行 tracked `gen-topic-fallback-assets.mjs --dry-run`；只有单个 topic fallback 输入才走 combined receipt。
2. 若要使用历史 `scripts/` helper，先确认是否仍需要，再决定删除、归档或迁入 tracked 工具；不要让未跟踪脚本成为隐性流程依赖。
3. 每次批量 campaign 都保留内容 PR 和 post-deploy handoff PR 两段式，避免把“本地通过”误写成“已部署”。
4. 任何人工核验、真实实验、仿真复现都另开 scope；不要因为 note 数或 asset 数增加而升级 `human_verification`。
