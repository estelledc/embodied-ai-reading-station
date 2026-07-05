# Backlog — 未完成的 P2/P3 项

> ⚠️ **历史文档**：本文反映 2026-06-24 时点的状态，其中多数问题已在后续迭代中解决
> （156 篇已全部升级 deep-read，见 [DEEPREAD-BATCH.md](DEEPREAD-BATCH.md)）。
> 现状以 [CHANGELOG.md](CHANGELOG.md) 与 [PLAN-1.0.0.md](PLAN-1.0.0.md) 为准。

> 记录本次治理中识别但未处理的技术债务和改进方向。
> 按优先级排列，P2 = 有空再做，P3 = 观察后决定。

---

## P2：近期可做

### 1. build.mjs 拆分（技术债务）

- 当前 3715 行单文件，包含 ~30 个 view builder + 数据处理 + 图片处理
- 建议拆为：`lib/notes.mjs`（笔记发现+加载）、`lib/pages/`（按页面类型拆）、`lib/assets.mjs`（图片复制）
- 风险：拆分过程可能引入回归，需要 check.mjs 68 项全覆盖才安全
- 参考：当前 build 用时 ~2 秒，性能不是瓶颈

### 2. 110 篇 auto-summary-light 补充 PDF（✅ 已于 2026-07-01 通过批量 deep-read 升级解决，见 DEEPREAD-BATCH.md）

- 当前 110 篇仅有 arxiv URL，无本地 PDF/paper.md
- 可批量下载 PDF → 用 AI 生成 paper.md → 升级为 auto-summary
- 优先补 topics.json 33 篇 primer 中尚未是 auto-summary 的论文
- 工作量估算：每篇 ~20 分钟（下载+解析+校对），110 篇 ≈ 37 小时

### 3. deep-read 升级计划（✅ 已于 2026-07-01 通过批量 deep-read 升级解决，见 DEEPREAD-BATCH.md）

- 13 篇任务论文中目前只有 LLaVA 是 deep-read
- 随着精读推进，每完成一篇应升级 status + 更新 progress.md
- 建议优先序：SayCan → OpenVLA → Cosmos Policy（跟 Task 1 路径走）

### 4. paper-stub 清理

- `papers/rf-slam/paper-stub.md` 和 `papers/nlos-mmwave/paper-stub.md` 是早期占位残留
- 两个目录都已有完整 paper.md，stub 文件可删除
- 需确认 stub 文件不被任何地方引用后删除

### 5. 三入口对齐

- path.md 30 天路径只覆盖 ~3/13 任务论文（C1 冲突）
- 修复方案 A：在 path.md 增加 Week 5（RF + 听觉）覆盖剩余任务论文
- 修复方案 B：在 path.md 顶部加说明"本路径不覆盖全部 13 篇任务论文，任务驱动学习请走 guide Task 1 路径"
- 方案 B 工作量更小，建议先做

### 6. topics.json primer slug 修正

- VLM Foundation primer 用 `llava-1-5`，但项目主 slug 是 `llava`
- 需确认 `llava-1-5.md` 是否独立存在（是 LLaVA 1.5 的独立笔记还是应该指向 llava）

---

## P3：观察后决定

### 7. guide 与 notes 去重

- guide 章节（如 Ch08 CLIP 1501 行）与 notes/clip.md 可能有大段重复
- 理想分工：guide = 串联叙事（多篇论文的关系、演化脉络），notes = 单篇细节
- 需抽样 5 章对比后决定是否值得改

### 8. site/content/path.md 与 guide Ch02 互链

- 两者都定义了"阅读路径"，但覆盖不同
- 在其中一个加"详见另一个"的互链即可

### 9. 来源格式规范文档

- 45 篇写 `papers/xxx/paper.pdf`，1 篇写 `papers/xxx/paper.md`，110 篇写 arxiv URL
- 规范建议：本地有 PDF → `papers/<slug>/paper.pdf`；本地只有 MD → `papers/<slug>/paper.md`；仅远程 → `"https://arxiv.org/abs/XXXX"`
- 写入 `notes/README.md` 或 README 的贡献指南

### 10. check.mjs 后续扩展

- topics.json primer slug 存在性验证
- progress.md 13 篇 slug 与 notes/ 一致性验证
- paper-stub 残留检测
- frontmatter 必需字段完整性（year, venue, difficulty, tldr, era）
- 字数/阅读时间合理性校验

### 11. GitHub Actions deploy.yml 审计

- 当前不在本次范围内改
- 未发现明确 bug，但可检查 node 版本、缓存策略等
