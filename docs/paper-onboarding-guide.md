# 论文扩充流程指南（Legacy）

本文档保留为早期“单篇旧笔记从 `auto-summary` 升级到 `deep-read`”的背景材料。它不是批量新增论文、批量资产登记或部署 handoff 的执行入口。

> 当前批量新增论文、批量生成资产、provenance 登记、PR、Pages 部署和线上 smoke 的主流程，见 [论文批量迭代 Playbook](paper-batch-campaign-playbook.md)。本文保留为单篇旧笔记升级的历史参考；遇到两者不一致时，以批量 Playbook、`AGENT-DEEPREAD.md` 和 `docs/provenance-v2-contract.md` 为准。

## 当前安全边界

- 不手写 `papers/provenance.json`。使用 `site/scripts/fill-missing-inline.mjs --record`、`site/scripts/fill-missing-cards.mjs --record` 或 `site/scripts/generate-provenance.mjs`。
- 不为了保留 `generated_assets` 临时修改 `site/scripts/lib/provenance.mjs`。当前 producer 已有受测路径；遇到漂移先创建新的 content snapshot，再重新生成 manifest。
- 不默认使用 `gh pr merge --admin`。除非 owner 明确授权管理员绕过，否则走普通 merge 和 CI / Pages 验证。
- 新 campaign 或多篇批量操作只用批量 Playbook；本文的命令片段只帮助理解旧流程。

## 前置条件

- 论文笔记已创建在 `notes/<slug>.md`，状态为 `auto-summary`
- 笔记已满足 deep-read 质量门槛：≥4000 字、Method 占 40%+、包含实验解读/导读关系/思考题/原文信息等章节

## 流程步骤

### 步骤 1：生成图片资产

为论文生成 site 层的图片资产（inline-scene、inline-method、card）。

**方法 A：使用 fill-missing 脚本（推荐）**

以下命令从仓库根目录运行。生成和登记必须分开：先生成资产与 receipt，提交资产快照，再登记 provenance。

```bash
# 生成 inline 图片
CONTENT_COMMIT=$(git rev-parse HEAD)
node site/scripts/fill-missing-inline.mjs --slug <slug> --content-commit "$CONTENT_COMMIT" --receipt-file .tmp-receipts/<slug>-inline.json
git add .tmp-receipts/<slug>-inline.json site/src/images/inline/<slug>-*.webp
git commit -m "添加 inline 资产：<slug>"

# 生成 card 图片；card 可能复用刚生成的 inline scene，所以重新取快照
CONTENT_COMMIT=$(git rev-parse HEAD)
node site/scripts/fill-missing-cards.mjs --slug <slug> --content-commit "$CONTENT_COMMIT" --receipt-file .tmp-receipts/<slug>-card.json
git add .tmp-receipts/<slug>-card.json site/src/images/cards/<slug>*.webp
git commit -m "添加 card 资产：<slug>"
```

**方法 B：手动生成（当 ffmpeg 不可用时）**

使用 Python/Pillow 从 topic 图片生成：

```python
from PIL import Image

# 从 site/src/images/topics/<topic>.webp 生成
# 输出到 site/src/images/inline/<slug>-scene.webp 和 -800.webp
# 输出到 site/src/images/inline/<slug>-method.webp 和 -800.webp
# 输出到 site/src/images/cards/<slug>.webp 和 -800.webp
```

生成后创建 receipt 文件，包含完整 schema：

```json
{
  "schema_version": "1.0.0",
  "slug": "<slug>",
  "generator": "ffmpeg-fallback/fill-missing-<type>/v2",
  "inputs": {
    "slug": "<slug>",
    "input_content_commit": "<commit-sha>",
    "sources": [{"path": "site/src/images/topics/<topic>.webp", "sha256": "<hash>"}],
    "prompt_sha256": "000...",
    "template": {"id": "fill-missing-<type>", "version": "fill-missing-<type>-v2"},
    "generator": {"id": "...", "version": "..."},
    "converter": {"id": "ffmpeg", "version": "..."},
    "parameters": {},
    "outputs": [{"kind": "<kind>", "path": "...", "parameters": {}}]
  },
  "input_fingerprint": "<sha256>",
  "asset_fingerprint": "<sha256>",
  "outputs": [{"kind": "<kind>", "path": "...", "sha256": "...", "width": ..., "height": ...}]
}
```

### 步骤 2：更新笔记状态

将 `notes/<slug>.md` 的 frontmatter 中 `status` 从 `auto-summary` 更新为 `deep-read`：

```yaml
status: deep-read
```

提交这个 note 内容快照，再进入 provenance 登记。后续 `ASSET_COMMIT=$(git rev-parse HEAD)` 必须指向已经包含 note 状态变更和资产 bytes 的 Git 快照，不能在未提交的 note worktree 上登记 provenance：

```bash
git add notes/<slug>.md
git commit -m "更新论文状态：<slug> deep-read"
```

### 步骤 3：更新 Provenance

将生成的资产记录到 `papers/provenance.json`。不要用临时 Python 手写 JSON；登记阶段会校验 Git blob、receipt、图片 hash、manifest CAS 和 `content_commit`：

```bash
ASSET_COMMIT=$(git rev-parse HEAD)
node site/scripts/fill-missing-inline.mjs \
  --record \
  --slug <slug> \
  --content-commit "$ASSET_COMMIT" \
  --receipt-file .tmp-receipts/<slug>-inline.json

git add papers/provenance.json
git commit -m "登记 inline 资产：<slug>"

ASSET_COMMIT=$(git rev-parse HEAD)
node site/scripts/fill-missing-cards.mjs \
  --record \
  --slug <slug> \
  --content-commit "$ASSET_COMMIT" \
  --receipt-file .tmp-receipts/<slug>-card.json

git add papers/provenance.json
git commit -m "登记 card 资产：<slug>"
```

### 步骤 4：重新生成 Provenance

```bash
PROVENANCE_CONTENT_COMMIT=$(git rev-parse HEAD) node site/scripts/generate-provenance.mjs
node site/scripts/generate-provenance.mjs --check
```

只有 note、source 或 asset bytes 发生变化时才重新生成；纯文档、测试或 handoff 变更不应制造 provenance churn。

### 步骤 5：更新测试期望

根据新资产更新测试文件：

1. **responsive-images.test.mjs**：更新 card 图片路径期望
2. **provenance.test.mjs**：更新 generated_assets 计数

### 步骤 6：提交代码

```bash
git checkout -b codex/<slug>-deep-read-upgrade
git add notes/<slug>.md \
    site/src/images/inline/<slug>-*.webp \
    site/src/images/cards/<slug>*.webp \
    .tmp-receipts/<slug>-*.json \
    papers/provenance.json \
    site/scripts/lib/provenance.test.mjs \
    site/scripts/lib/responsive-images.test.mjs
git commit -m "feat(<slug>): upgrade to deep-read with generated assets"
```

### 步骤 7：推送到远程并创建 PR

```bash
git push -u origin codex/<slug>-deep-read-upgrade
gh pr create --title "feat(<slug>): upgrade to deep-read with generated assets" --body "..."
```

### 步骤 8：验证 CI 并合并

等待 CI 构建通过，然后合并 PR：

```bash
gh pr merge <pr-number> --merge --delete-branch
```

## 注意事项

### 治理约束

项目生成的图片（`site/src/images/inline/` 和 `site/src/images/cards/`）已被允许通过二进制门禁，不需要额外的 rights discriminator。

### Provenance 循环问题

当修改笔记内容后重新生成 provenance 时，如果出现 `content changed while reusing content_commit` 或 `NOTE_HASH_MISMATCH`，先提交新的 note / asset 内容快照，再用新的 `PROVENANCE_CONTENT_COMMIT=$(git rev-parse HEAD)` 重新生成。不要在一次任务中临时修改 provenance producer 来绕过校验。

### 测试验证

本地验证命令：

```bash
cd site
node --test 'scripts/**/*.test.mjs'    # 单元测试
node scripts/build.mjs                # 构建
node scripts/check.mjs                # 检查
```

### 常见错误与解决方案

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `content_commit must be an ancestor of HEAD` | 强制推送改变了 commit SHA | 重新生成 provenance 使用新 commit |
| `PATH_MISSING` / `PATH_NOT_TRACKED` | 图片文件未包含在提交中 | 将图片文件添加到 git |
| `rights discriminator` | 二进制门禁拦截 | 使用项目生成路径（`site/src/images/`）|
| `BUILD_ID drift` | 构建缓存问题 | 重新运行构建 |

## 验收标准

- [ ] 笔记状态为 `deep-read`
- [ ] 6 个图片资产已生成并 tracked
- [ ] Provenance 记录完整且验证通过
- [ ] 所有 342 个单元测试通过
- [ ] CI 构建全部通过
- [ ] PR 已合并到 main 分支
