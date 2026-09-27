# 1.1 工程债清偿计划 — build.mjs 模块化 + 单元测试

> **For agentic workers:** 按任务顺序执行，每任务一个 commit。本计划的核心安全网是**可复现构建 + dist 逐字节对比**：任何拆分步骤后，固定时间戳的构建产物必须与拆分前的基线快照完全一致。做不到一致就回滚重来，不允许"看起来差不多"。

**Goal:** 把 `site/scripts/build.mjs`（~3900 行单文件）拆为职责清晰的模块，并为纯函数补上单元测试，同时保证构建产物零变化。

**Architecture:** 拆分为 `scripts/lib/` 下 6 个模块 + 精简的编排入口。验证依赖两件事：(1) 先引入 `SOURCE_DATE_EPOCH` 支持使构建可复现；(2) 每个拆分阶段后用 `diff -r` 对比固定时间戳构建与基线快照。测试用 Node 22 内置 `node:test`，零新依赖。

**门禁基线：** `npm run build && npm run check` = 78 passed, 0 failed（含 SITE_BASE 场景）。

---

## 任务 0：可复现构建（SOURCE_DATE_EPOCH）

**问题：** build.mjs 有 7 处 `new Date()` / `Date.now()` 直接取当前时间写进产物（页脚时间戳 L358、feed `updated` L2711、JSON-LD 日期 L3165-3166、sw.js VERSION L3404、data JSON `generated` L3605、llms.txt 日期 L3789）。两次构建产物必然不同，无法做拆分前后对比。

**Files:** Modify `site/scripts/build.mjs`

- [ ] 在文件顶部（SITE_URL 附近）加：

```js
// 可复现构建：设置 SOURCE_DATE_EPOCH（秒）可固定所有产物内的构建时间戳
const BUILD_DATE = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
  : new Date();
```

- [ ] 把上述 7 处产物内时间戳全部改用 `BUILD_DATE`（注意 L3369/L3372 的 `Date.now()` 是构建耗时计量、L1428 是前端运行时 JS 字符串——**这两类不改**）。
- [ ] 验证可复现性：

```bash
cd /workspace/site
SOURCE_DATE_EPOCH=1751500000 node scripts/build.mjs && cp -r dist /tmp/dist-a
SOURCE_DATE_EPOCH=1751500000 node scripts/build.mjs && diff -r dist /tmp/dist-a   # 无输出 = 一致
npm run build && npm run check   # 78 passed（恢复正常构建；pagefind 产物只在 npm run build 生成，diff 时用 node scripts/build.mjs 两侧对齐即可）
```

- [ ] Commit: `feat(build): 支持 SOURCE_DATE_EPOCH 可复现构建，为拆分对比铺路`
- [ ] 建基线快照（后续所有任务对比用）：`SOURCE_DATE_EPOCH=1751500000 node scripts/build.mjs && cp -r dist /tmp/dist-baseline`

---

## 目标模块结构

```
site/scripts/
  build.mjs            # 编排入口：import 各模块，按序调用（目标 <300 行）
  check.mjs            # 不动
  constants.mjs        # 已存在（TASK_SLUGS）
  lib/
    config.mjs         # BASE, url(), SITE_URL, SITE_ORIGIN, BUILD_DATE, 目录路径常量
    markdown.mjs       # marked 配置与自定义 renderer, slugify, rewriteImagePaths,
                       # rewriteGuideLinks, injectInlineFigures, extractTLDR, extractOutline
    content.mjs        # loadNotes/discoverPapers, inferTags, discoverGuide,
                       # topics.json / glossary.json 加载
    layout.mjs         # page(), masthead(), footerHtml(), relatedViewsHtml(), pageHeroHtml(), VIEW_DESC
    views/
      papers.mjs       # buildIndex, buildNotePage
      guide.mjs        # buildGuideIndex, buildGuidePage
      aggregates.mjs   # topics/timeline/compare/graph/heatmap/tags/glossary/eras/lists/
                       # discover/cheatsheet/syllabus/stats/venues/quality
      learn.mjs        # buildLearnIndex/Page, buildIssueIndex/Page
      meta.mjs         # about/contributors/changelog/404/site-map/random/next
      seo.mjs          # feed/sitemap/robots/llms/humans/security/opensearch, data JSON/CSV
    assets.mjs         # copyDir、静态资源复制、vendor（katex/d3/fonts）、sw.js VERSION 注入、manifest 注入
```

## 拆分纪律（每个任务都适用）

1. **只搬运不重写**：函数体逐字剪切粘贴，只改 import/export。发现的坏味道记进汇报，不顺手改。
2. 模块间共享用显式 import；禁止循环依赖（`config ← markdown ← content ← layout ← views`，assets 只依赖 config）。
3. 每个任务后跑对比：

```bash
cd /workspace/site
SOURCE_DATE_EPOCH=1751500000 node scripts/build.mjs && diff -r dist /tmp/dist-baseline  # 必须无输出
npm run build && npm run check                                                         # 78 passed
```

4. 每任务一个 commit。任何 diff 不为空的情况：先看是不是真回归，是则回滚本任务重来。

## 任务 1：抽 config.mjs + assets.mjs

- [ ] `lib/config.mjs`：BASE/url()/SITE_URL/SITE_ORIGIN/BUILD_DATE/ROOT/DIST/SRC 等路径常量。
- [ ] `lib/assets.mjs`：copyDir、静态资源与 vendor 复制段、sw.js VERSION、webmanifest `__BASE__` 注入。
- [ ] 对比 + check → Commit: `refactor(build): 抽取 config 与 assets 模块`

## 任务 2：抽 markdown.mjs + content.mjs

- [ ] 按上表搬运；`figure-section-utils.mjs` 的 import 跟随使用方走。
- [ ] 对比 + check → Commit: `refactor(build): 抽取 markdown 与 content 模块`

## 任务 3：抽 layout.mjs

- [ ] page()/masthead()/footerHtml()/relatedViewsHtml()/pageHeroHtml()/VIEW_DESC。
- [ ] 对比 + check → Commit: `refactor(build): 抽取 layout 模块`

## 任务 4：抽 views/（可拆多个 commit）

- [ ] 按上表 6 个文件搬运全部 build* 函数；建议每个 views 文件一个 commit，逐个对比。
- [ ] Commits: `refactor(build): 抽取 views/papers`、`… views/guide` 等。

## 任务 5：收口编排入口

- [ ] build.mjs 只剩 import + `build()` 编排（含耗时打印）。确认 `wc -l site/scripts/build.mjs` < 300。
- [ ] 对比 + check（含 `SITE_BASE=/embodied-ai-reading-station npm run build && npm run check`）。
- [ ] Commit: `refactor(build): build.mjs 收口为编排入口`

## 任务 6：单元测试（node:test，零新依赖）

- [ ] Create `site/scripts/lib/*.test.mjs`（与被测模块同目录）覆盖纯函数：
  - `slugify`：中文/特殊字符/重复调用稳定性
  - `inferTags`：给定构造的 note 对象断言标签推断
  - `extractTLDR` / `extractOutline`：标准笔记片段与缺节片段
  - `rewriteGuideLinks`：`../guide/x.md`、`guide/x.md#anchor`、不该重写的外链
  - `url()`：BASE 为空/非空两种（通过子进程或参数化，视 config.mjs 实现选最简方式）
- [ ] `package.json` 增加 `"test:unit": "node --test scripts/"`，`"test"` 改为 `npm run test:unit && npm run build && npm run check`。
- [ ] `.github/workflows/deploy.yml` 在 Healthcheck 前加一步 `- name: Unit tests\n  run: npm run test:unit`。
- [ ] 全部测试通过 + 对比 + check → Commit: `test: 纯函数单元测试骨架（node:test）+ CI 接入`

## 任务 7：收尾

- [ ] CHANGELOG.md 加 `## [1.1.0] - Unreleased` 段记录本次拆分与测试（不 bump package.json 版本，等 1.1 全部完成再 bump）。
- [ ] BACKLOG.md #1（build.mjs 拆分）标记完成。
- [ ] Commit: `docs: CHANGELOG 记录 1.1 build 拆分与测试骨架`

## 明确不做

- theme.css 拆分（另行安排）；首页分页；guide/notes 去重；任何行为变化。
