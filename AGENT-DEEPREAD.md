# Agent 自动精读工作流

> 给 Cursor / Codex Agent 用：读原文 → 写深度笔记 → 构建站点 → 校验。
> 读者不在线；材料必须足够详细，思考题是补充不是替代。
> 本文是用户明确要求精读、核验或批量内容工作时才启用的显式 opt-in 专项流程，不是默认持续推进入口，也不授权从 `PLAN-1.3.md` 自动领取论文。

## 触发

用户说「精读 `{slug}`」「自动精读并部署」「批量精读」时，按本文执行。

## 项目路径

```
cd /path/to/embodied-ai-reading-station
```

## 单篇流程

### 1. 读源材料

按顺序读：

1. `papers/{slug}/paper.md`（优先；无则 `paper.pdf`）
2. `papers/{slug}/images/`（可用插图）
3. `notes/{slug}.md`（保留 frontmatter，在其上扩写）
4. `notes/llava.md`（深度与文风标杆）
5. `guide/` 中与 `topic` 对应的章节（只读，交叉引用）

### 2. 写 `notes/{slug}.md`

**Frontmatter**：保留原有字段，只改：

- `status: deep-read`
- `generated_at: YYYY-MM-DD`

**正文结构**（全部必须有）：

1. 一句话讲什么（TL;DR）
2. 这是个什么场景
3. 之前的人怎么做的，为什么不够好
4. 这篇论文的新想法
5. 它分几步做的（方法）— 最详细，Method 占 40%+ 篇幅
6. 关键数字（What works）— Markdown 表格，数字来自原文
7. 实验结果说明了什么
8. 你应该懂的几个新词
9. 它有什么搞不定的
10. 它和别的几篇是什么关系
11. 和本导读的关系 — 链接 guide 对应章节
12. 思考题 — 5–8 题，提示用 `<details>` 折叠
13. 一些好奇心问答（FAQ）
14. 如果你想再深入
15. 原文信息（BibTeX + 链接）

**写作规范**：

- 中文，零术语假设；术语首次出现必定义 + 类比
- 每大节末尾：`*所以这一节是想说：……*`
- 目标 ≥4000 中文字；Method 每个子节含输入→处理→输出
- 公式必须有人话翻译
- 插图：`../papers/{slug}/images/xxx.jpg`（有本地 `papers/` 时优先）；无原图则用 ASCII（≥2）
- 站点配图：`site/src/images/inline/{slug}-scene|method.webp` 由 `fill-missing-inline.mjs` 或 `gen-inline-figures.mjs` 维护；card 由 `fill-missing-cards.mjs` 维护
- 配图审计：`node site/scripts/audit-figures.mjs`；primer/task 缺原图时运行 `node site/scripts/fetch-arxiv-figures.mjs`
- `npm run check` 校验笔记层视觉 ≥2 与站点层 inline/card 覆盖率
- 禁止编造实验数字；没有的写「原文未报告」
- 不用 emoji

**思考题格式**：

```markdown
**Q1：问题文本？**

<details>
<summary>提示</summary>

提示内容…
</details>
```

### 3. Guide 双向链接（可选）

若 guide 对应章节末尾已有 `<!-- papers: ... -->`，把 `{slug}` 加进去。

### 4. 构建与校验

```bash
cd site
npm run build
npm run check
```

必须 0 fail。失败则修 notes 或路径后重跑。

### 5. 本地预览

```bash
cd site && python3 -m http.server -d dist 8080
# http://127.0.0.1:8080/papers/{slug}/
```

### 6. Git（仅用户明确要求时）

```bash
git add notes/{slug}.md
git commit -m "feat(notes): deep-read {slug}"
git push
```

默认 **不 commit / push**，除非用户明确要求。

## 质量门槛

| 检查项 | 标准 |
|--------|------|
| 篇幅 | ≥4000 字，Method ≥1500 字 |
| 机制 | 每个核心组件有输入→输出 |
| 数字 | 主表有 Markdown 表格 |
| 图 | ≥2 张（**笔记层**：`../papers/{slug}/images/` 原图 **或** ASCII 架构图）；**站点层** scene/method AI 图由 build 注入，不计入笔记层计数 |
| 局限 | ≥3 条 |
| 思考题 | 5–8 题，提示在 details 里 |
| 站点 | `npm run check` 0 fail |
| status | `deep-read` |

## 批量模式

逐篇处理，一篇 check 通过后再下一篇。失败记录 slug + 步骤，继续下一篇。

## 完成报告

1. 字数、Method 子节数
2. 用了哪些 images
3. build/check 结果
4. 本地预览 URL
5. 3 条用户可后续追问的高价值问题

## 复制即用提示词

```
【自动精读 + 站点部署】论文 slug: {slug}

按 AGENT-DEEPREAD.md 完整执行：读原文 → 写 notes/{slug}.md（deep-read）→ npm run build → npm run check。
材料必须详细（≥4000 字，Method 占 40%+），思考题 5–8 题用 details 折叠。
不要中途等我回复。不要 commit，除非我明确要求。
完成后给完成报告。
```
