# 论文扩充流程指南

本文档总结了将一篇新论文笔记从 `auto-summary` 升级到 `deep-read` 的完整流程，便于后续扩充其他论文时复用。

## 前置条件

- 论文笔记已创建在 `notes/<slug>.md`，状态为 `auto-summary`
- 笔记已满足 deep-read 质量门槛：≥4000 字、Method 占 40%+、包含实验解读/导读关系/思考题/原文信息等章节

## 流程步骤

### 步骤 1：生成图片资产

为论文生成 site 层的图片资产（inline-scene、inline-method、card）。

**方法 A：使用 fill-missing 脚本（推荐）**

```bash
cd site

# 生成 inline 图片
node scripts/fill-missing-inline.mjs --slug <slug> --record --content-commit <commit-sha> --receipt-file ../.tmp-receipts/<slug>-inline.json

# 生成 card 图片
node scripts/fill-missing-cards.mjs --slug <slug> --record --content-commit <commit-sha> --receipt-file ../.tmp-receipts/<slug>-card.json
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

### 步骤 3：更新 Provenance

将生成的资产记录到 `papers/provenance.json`：

```bash
cd ..
python3 << 'EOF'
import json

with open("papers/provenance.json", "r") as f:
    data = json.load(f)

content_commit = data["content_commit"]

# 读取 receipt 文件并添加到 generated_assets
for note in data["notes"]:
    if note["slug"] == "<slug>":
        note["generated_assets"] = [
            {
                "kind": "card",
                "tracked": True,
                "path": "site/src/images/cards/<slug>.webp",
                "sha256": "<hash>",
                "generator": "ffmpeg-fallback/fill-missing-cards/v2",
                "input_fingerprint": "<fingerprint>",
                "content_commit": content_commit,
            },
            # ... 其他资产
        ]

with open("papers/provenance.json", "w") as f:
    json.dump(data, f, indent=2)
EOF
```

### 步骤 4：重新生成 Provenance

```bash
PROVENANCE_CONTENT_COMMIT=$(git rev-parse HEAD) node site/scripts/generate-provenance.mjs
```

### 步骤 5：更新测试期望

根据新资产更新测试文件：

1. **responsive-images.test.mjs**：更新 card 图片路径期望
2. **provenance.test.mjs**：更新 generated_assets 计数

### 步骤 6：提交代码

```bash
git checkout -b codex/<slug>-deep-read-upgrade
git add notes/<slug>.md \
    site/src/images/inline/<slug>-*.webp \
    site/src/images/cards/<slug>-*.webp \
    .tmp-receipts/<slug>-*.json \
    papers/provenance.json \
    site/scripts/lib/provenance.mjs \
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
gh pr merge <pr-number> --admin --merge --delete-branch
```

## 注意事项

### 治理约束

项目生成的图片（`site/src/images/inline/` 和 `site/src/images/cards/`）已被允许通过二进制门禁，不需要额外的 rights discriminator。

### Provenance 循环问题

当修改笔记内容后重新生成 provenance 时，`generated_assets` 会被清空。解决方案是修改 `site/scripts/lib/provenance.mjs` 中的 `loadCanonicalNotes` 函数，在内容变更时保留已有的 `generated_assets` 并更新 `content_commit`。

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
