# Embodied AI: Zero to One — 产品 1.0.0 打磨计划

> **For agentic workers:** 本计划按任务逐条执行。每个任务自带步骤（`- [ ]` 复选框）、精确文件路径、验证命令与验收标准。执行者无需了解本项目历史背景——所需上下文全部写在任务内。推荐每完成一个任务立即 commit（一个任务 = 一个 commit），并在任务全部完成后跑一遍「最终验收」章节。

**Goal:** 把本站（156 篇论文笔记 + 22 章导读的静态学习站）从 0.1.0 打磨为可对外宣布的产品 1.0.0：对外叙事与实际内容一致、三条学习入口统一、构建脚本无硬编码陷阱、质量门禁完备、性能与离线体验达标、正式发版。

**Architecture:** 站点是 Node.js 无框架静态构建（`site/scripts/build.mjs` 单文件 3853 行，marked + gray-matter → `site/dist/`），Pagefind 搜索，GitHub Actions 部署到 GitHub Pages。质量门禁是 `site/scripts/check.mjs`（当前 70 项，0 fail）。本计划**不做**大规模重构（build.mjs 拆分明确推迟到 1.1），只做发布必需的修正 + 门禁加固。

**Tech Stack:** Node 22, marked, gray-matter, pagefind, D3.js, KaTeX, GitHub Actions。

---

## 基线状态（2026-07-05 实测，执行前请先复现）

在开始任何任务前，先确认基线是绿的：

```bash
cd /workspace/site
npm ci
npm run build     # 预期：Finished in ~2 seconds
npm run check     # 预期：70 passed, 0 failed
```

已核实的关键事实（执行者可信赖，不必重查）：

| 事实 | 数据 |
|------|------|
| 笔记数 | `notes/*.md` 共 156 篇（目录里另有 topics.json、glossary.json，共 158 项） |
| status 分布 | 156/156 全部 `status: deep-read`（2026-07-01 批量升级完成，见 DEEPREAD-BATCH.md） |
| 13 篇任务论文 | 全部带 `task: required`，check.mjs 有门禁 |
| dist 体积 | 142MB（其中 images 74MB），首页 index.html 192KB |
| package.json 版本 | **0.1.0**（`site/package.json` L3） |
| CI | `.github/workflows/deploy.yml`：Node 22，npm ci → build → check → deploy-pages |
| 硬编码生产 URL | `build.mjs` 内 `SITE_URL` 重复定义 4 次（L352 / L2702 / L3025 / L3724），`src/site.webmanifest` L5 `start_url` 写死 `/embodied-ai-reading-station/` |
| CDN 外链 | KaTeX（jsdelivr，build.mjs L384/L413-414）、D3（d3js.org，L2817）、Google Fonts（theme.css 顶部 @import） |
| 笔记章节缺口 | 缺「思考题」：仅 `llava.md`；缺「实验结果说明了什么」：11 篇（见任务 4.2 清单）；缺「原文信息」：4 篇（见任务 4.3 清单）；缺「和本导读的关系」：仅 `llava.md` |
| paper-stub 残留 | `papers/rf-slam/paper-stub.md`、`papers/nlos-mmwave/paper-stub.md` |

---

## 执行顺序与并行性

| 阶段 | 主题 | 依赖 | 可并行 |
|------|------|------|--------|
| Phase 1 | 内容与叙事一致性（P0） | 无 | 1.1–1.6 相互独立，可并行 |
| Phase 2 | 三入口统一（P0） | 无 | 与 Phase 1 并行 |
| Phase 3 | 构建脚本健壮性（P0/P1） | 无 | 3.1–3.5 相互独立；3.6 依赖 3.4 |
| Phase 4 | 笔记合规收尾（P1） | 无 | 4.1–4.3 可并行；4.4 依赖 4.1–4.3 完成 |
| Phase 5 | 性能与离线（P1） | 无 | 5.1、5.2 独立 |
| Phase 6 | 发布工程 | **依赖 Phase 1–5 全部完成** | 顺序执行 |

Phase 1–5 之间无代码冲突（改动文件集合基本不相交），可分配给不同执行者并行推进。唯一共享热点文件是 `site/scripts/build.mjs`（任务 3.1、3.2、3.3、3.4、5.1 都改它）和 `site/scripts/check.mjs`（任务 3.5、3.6、4.4 都改它）——**这两个文件的任务建议由同一执行者顺序完成**，或先后合并避免冲突。

---

# Phase 1 — 内容与叙事一致性（P0：读者信任问题）

## 任务 1.1：修正 README 的过时质量叙事

**问题：** `README.md` L19–29 的「内容质量说明」还在宣称三级分层（deep-read 少量 / auto-summary 46 篇 / auto-summary-light 110 篇），但实际 156 篇已全部升级为 `status: deep-read`（2026-07-01 完成）。对外叙事与站内标签直接矛盾，是 1.0.0 最严重的信任问题。同时 L177 构建流程图中「npm run check (63 项)」已过时（实际 70 项）。

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** 把 `README.md` 的「### 内容质量说明」整节（L19–29，从 `### 内容质量说明` 到 `156 篇是为了看到全景。` 之前的表格结束处）替换为：

```markdown
### 内容质量说明

156 篇笔记已于 2026-07 全部升级为 **deep-read（深度精读）** 标准（升级过程见 [DEEPREAD-BATCH.md](DEEPREAD-BATCH.md)，标准定义见 [AGENT-DEEPREAD.md](AGENT-DEEPREAD.md)）：

- 每篇 ≥4000 字，Method 拆解占比 ≥40%
- 主实验表用 Markdown 表格还原，关键数字带生活语境
- 每篇 ≥2 个视觉元素（架构图 / ASCII 图 / 论文原图）
- ≥3 条「局限与批评」+ 5–8 道思考题

其中 46 篇有本地 PDF 全文解析（`papers/<slug>/`），110 篇基于 arxiv 原文 + 公开资料撰写。
```

- [ ] **Step 2:** 把 L177 的 `↓ npm run check (63 项)` 改为 `↓ npm run check (70+ 项)`。

- [ ] **Step 3:** 全文搜索 README 里其他残留的「46 篇」「110 篇」「auto-summary」表述并同步修正：

```bash
rg -n "auto-summary|46 篇|110 篇" /workspace/README.md
```

预期修改后此命令只在「内容质量说明」新文案的最后一行（46 篇本地 PDF / 110 篇 arxiv）命中。

- [ ] **Step 4:** 验证 + 提交：

```bash
cd /workspace/site && npm run build && npm run check   # 70 passed, 0 failed
git add README.md && git commit -m "docs(readme): 修正过时的三级质量分层叙事为 156 全 deep-read 现状"
```

---

## 任务 1.2：给过时治理文档加状态横幅

**问题：** `AUDIT.md`（2026-06-24）、`BACKLOG.md`、`IMPROVEMENTS.md`、`delivery-checklist.md` 都基于旧状态撰写（如 BACKLOG #2/#3 还写「110 篇 light、仅 LLaVA deep-read」，IMPROVEMENTS 开篇写「13 篇笔记」）。这些是有价值的历史记录，不删除，但必须防止读者误认为是现状。

**Files:**
- Modify: `AUDIT.md`, `BACKLOG.md`, `IMPROVEMENTS.md`, `delivery-checklist.md`

- [ ] **Step 1:** 在四个文件的标题行（第一个 `# ` 行）之后插入统一横幅（各文件日期按其实际撰写日期填）：

```markdown
> ⚠️ **历史文档**：本文反映 2026-06-24 时点的状态，其中多数问题已在后续迭代中解决
> （156 篇已全部升级 deep-read，见 [DEEPREAD-BATCH.md](DEEPREAD-BATCH.md)）。
> 现状以 [CHANGELOG.md](CHANGELOG.md) 与 [PLAN-1.0.0.md](PLAN-1.0.0.md) 为准。
```

- [ ] **Step 2:** 顺手修正 `BACKLOG.md` 中已完成项：给 #2（110 篇补 PDF）、#3（deep-read 升级计划）两节标题后追加 `（✅ 已于 2026-07-01 通过批量 deep-read 升级解决，见 DEEPREAD-BATCH.md）`。

- [ ] **Step 3:** 提交：

```bash
git add AUDIT.md BACKLOG.md IMPROVEMENTS.md delivery-checklist.md
git commit -m "docs: 为过时治理文档加历史状态横幅，防止与现状混淆"
```

---

## 任务 1.3：修正 research-task.md 截止日期笔误

**问题：** `research-task.md` L17 写「截止日期：2026 年 6 月 31 日」——6 月只有 30 天。AUDIT M6 遗留项。

**Files:**
- Modify: `research-task.md`

- [ ] **Step 1:** 把 L17 的：

```markdown
- **截止日期：2026 年 6 月 31 日**（注：6 月只有 30 天，可能是 6/30 或 7/1，需要找学长确认）
```

改为：

```markdown
- **截止日期：2026 年 6 月 30 日**（原任务书写"6 月 31 日"，系笔误；已按月末 6/30 理解执行，LLaVA deck 已于 6 月完成）
```

- [ ] **Step 2:** 提交：`git add research-task.md && git commit -m "docs: 修正 research-task 截止日期笔误（6/31 → 6/30）"`

---

## 任务 1.4：同步 progress.md 与实际进度

**问题：** `progress.md` 的「笔记质量提升」条目（L17）还是未勾选状态但子项已写完成，自相矛盾；13 篇任务论文只勾了 LLaVA，但全部笔记已达 deep-read（「已建笔记，等精读」的括号说明已过时——笔记本身已是精读级，未完成的是"本人逐篇消化+汇报"）。

**Files:**
- Modify: `progress.md`

- [ ] **Step 1:** 把 L17–18 的：

```markdown
- [ ] 笔记质量提升：46 篇 auto-summary + 110 篇 auto-summary-light → 逐步补精读
  - [x] **2026-07-01：156/156 全部升级为 deep-read**（见 `DEEPREAD-BATCH.md`）
```

改为：

```markdown
- [x] 笔记质量提升：**2026-07-01 完成 156/156 全部升级为 deep-read**（见 `DEEPREAD-BATCH.md`）
```

- [ ] **Step 2:** 把 13 篇任务论文列表中 12 篇未勾选项的括号说明从「（已建笔记，等精读）」统一改为「（deep-read 笔记已就绪，等本人消化）」。**不要**勾选复选框——复选框语义是"本人读完"，不是"笔记写完"。

- [ ] **Step 3:** 提交：`git add progress.md && git commit -m "docs(progress): 同步 deep-read 批量升级后的真实进度"`

---

## 任务 1.5：清理 paper-stub 残留

**问题：** `papers/rf-slam/paper-stub.md` 与 `papers/nlos-mmwave/paper-stub.md` 是早期占位文件，两目录都已有完整 `paper.md`。AUDIT §7 / BACKLOG #4 遗留项。

**Files:**
- Delete: `papers/rf-slam/paper-stub.md`
- Delete: `papers/nlos-mmwave/paper-stub.md`

- [ ] **Step 1:** 先确认无任何引用（预期：只有 AUDIT.md/BACKLOG.md/本计划等文档提及，无代码或笔记引用）：

```bash
rg -n "paper-stub" /workspace --glob '!site/dist' --glob '!site/node_modules'
```

- [ ] **Step 2:** 删除两个文件，重建验证：

```bash
rm /workspace/papers/rf-slam/paper-stub.md /workspace/papers/nlos-mmwave/paper-stub.md
cd /workspace/site && npm run build && npm run check   # 70 passed, 0 failed
```

- [ ] **Step 3:** 提交：`git add -A papers/ && git commit -m "chore(papers): 删除 rf-slam / nlos-mmwave 的 paper-stub 占位残留"`

---

## 任务 1.6：消除 llava 与 llava-1-5 的读者混淆

**问题：** 站内并存两篇笔记：`notes/llava.md`（初代 LLaVA，13 篇任务论文之一，deck 的主角）和 `notes/llava-1-5.md`（LLaVA-1.5 改进版，topics.json 里 VLM 主题的 primer）。两篇都合理存在，但页面上没有任何一句话说明二者关系，读者从 30 天路径进来看到的是 `llava`，从主题入门进来看到的是 `llava-1-5`。AUDIT C3 / BACKLOG #6 遗留项。

**Files:**
- Modify: `notes/llava.md`（frontmatter 之后、正文第一节之前）
- Modify: `notes/llava-1-5.md`（同位置）

- [ ] **Step 1:** 在 `notes/llava.md` frontmatter 结束（第二个 `---`）之后、第一个标题之前插入：

```markdown
> 📌 **系列说明**：本篇是 LLaVA **初代**（2023-04，Visual Instruction Tuning），也是本站 13 篇任务论文之一、[英文汇报 deck](../deck/index.html) 的主角。半年后的改进版见 [LLaVA-1.5](llava-1-5.md)——更高分辨率 + 学术数据配方，是 VLM 主题的入门 primer。
```

- [ ] **Step 2:** 在 `notes/llava-1-5.md` 同位置插入：

```markdown
> 📌 **系列说明**：本篇是 LLaVA-**1.5**（2023-10 改进版），主题入门三连选它是因为配方更成熟。想理解"视觉指令微调"这个范式的原始动机，请先读初代 [LLaVA](llava.md)（本站 13 篇任务论文之一）。
```

- [ ] **Step 3:** 验证构建后两个页面都渲染了说明框（笔记内 `.md` 相对链接会被 build.mjs 重写为站内路径；如果构建后链接 404，改用绝对站内路径 `/papers/llava-1-5/` 格式重试）：

```bash
cd /workspace/site && npm run build
rg -l "系列说明" dist/papers/llava/index.html dist/papers/llava-1-5/index.html
```

- [ ] **Step 4:** 提交：`git add notes/llava.md notes/llava-1-5.md && git commit -m "docs(notes): llava 与 llava-1-5 互加系列说明消除入口混淆"`

---

# Phase 2 — 三入口统一（P0：AUDIT C1/C6 遗留）

## 任务 2.1：30 天路径补齐 Week 5，覆盖全部 13 篇任务论文

**问题：** 站点有三条学习入口（30 天路径 `site/content/path.md`、22 章导读 `guide/`、主题 primer `notes/topics.json`），但 30 天路径缺 RF 感知与听觉主题，13 篇任务论文只覆盖约 10 篇（缺 3DShape2VecSet / RF 三篇 / 听觉三篇等）。读者若只跟 30 天路径走，会漏掉任务论文。

**Files:**
- Modify: `site/content/path.md`

- [ ] **Step 1:** 读一遍 `site/content/path.md` 现状，确认 Week 1–4 已覆盖哪些任务论文（用下面命令对照 13 篇 slug）：

```bash
for s in llava 3dshape2vecset saycan openvla vlas mla cosmos-policy rf-slam mmclip nlos-mmwave proactive-hearing neuralaids acoustic-swarms; do
  printf "%s: " "$s"; rg -c "$s" /workspace/site/content/path.md || echo 0
done
```

- [ ] **Step 2:** 在 Week 4 之后追加 Week 5 章节（Day 29–35，格式仿照现有 Week 的写法——先读现有 Week 4 的 markdown 结构再模仿）。Week 5 内容要求：

  - 主题：**RF 感知 + 听觉智能 + 3D/世界模型收尾**（即任务论文中 30 天路径尚未覆盖的部分）
  - 必须包含且只需包含 Step 1 查出的缺失任务论文，每篇一行：论文站内链接（`/papers/<slug>/` 格式，与现有 Week 写法一致）+ 一句"为什么读"
  - 章节开头加一句定位：「Week 5 是任务驱动读者的补全周——完成它，13 篇任务论文就全部走完（对照 [research-task.md](https://github.com/estelledc/embodied-ai-reading-station/blob/main/research-task.md)）。」

- [ ] **Step 3:** 在 `path.md` 顶部（frontmatter 之后、正文之前）加入口选择说明：

```markdown
> **三条入口怎么选？** 本页是**线性 30+5 天计划**（适合每天固定投入）；[22 章导读](../guide/) 是**系统教材**（适合想搞懂原理再读论文）；[主题入门三连](../topics/) 是**按兴趣跳读**（适合已有方向）。三者内容互通，选一条主线即可，不必都走。
```

（注意：`path.md` 是 learn 页，构建后位于 `/learn/path/`，上面相对链接 `../guide/`、`../topics/` 在该路径下正确。构建后务必点检。）

- [ ] **Step 4:** 验证与提交：

```bash
cd /workspace/site && npm run build && npm run check
# 手动检查：dist/learn/path/index.html 包含 Week 5 与全部 13 篇任务论文链接
for s in llava 3dshape2vecset saycan openvla vlas mla cosmos-policy rf-slam mmclip nlos-mmwave proactive-hearing neuralaids acoustic-swarms; do
  rg -q "papers/$s" /workspace/site/dist/learn/path/index.html && echo "OK $s" || echo "MISSING $s"
done
git add site/content/path.md && git commit -m "feat(learn): 30 天路径补 Week 5，全覆盖 13 篇任务论文并加三入口选择说明"
```

验收：13 个 slug 全部输出 `OK`。

---

# Phase 3 — 构建脚本健壮性（P0/P1：部署正确性）

> ⚠️ 本 Phase 任务 3.1–3.4 全部修改 `site/scripts/build.mjs`，3.5–3.6 修改 `site/scripts/check.mjs`。建议同一执行者按序完成，每个任务一个 commit。每次改动后必跑 `npm run build && npm run check`。

## 任务 3.1：统一 SITE_URL 为单一可覆盖常量

**问题：** 生产域名 `https://estelledc.github.io/embodied-ai-reading-station` 在 `build.mjs` 内以 `const SITE_URL = ...` 重复声明 4 次（L352、L2702、L3025、L3724），另散见于 BibTeX、llms.txt 等字符串。换域名 / fork 部署时必然漏改。

**Files:**
- Modify: `site/scripts/build.mjs`

- [ ] **Step 1:** 在文件顶部 `const BASE = ...`（L~20）附近增加模块级常量：

```js
const SITE_URL = (process.env.SITE_URL ?? "https://estelledc.github.io/embodied-ai-reading-station").replace(/\/$/, "");
```

- [ ] **Step 2:** 删除 4 处函数内的重复声明（搜索 `const SITE_URL =`，除顶部外全删），让它们使用模块级常量。

- [ ] **Step 3:** 搜索其余内联出现的域名字符串，改为模板字符串引用 `SITE_URL`：

```bash
rg -n "estelledc.github.io" /workspace/site/scripts/build.mjs
```

预期改完后此命令**只命中顶部默认值那一行**。

- [ ] **Step 4:** 验证输出不变（默认值等于原硬编码值，所以 dist 应逐字节一致）：

```bash
cd /workspace/site && npm run build && npm run check   # 70 passed
rg -c "estelledc.github.io" dist/sitemap.xml dist/feed.xml dist/data/papers.json  # 仍有产出，数量不为 0
```

- [ ] **Step 5:** 提交：`git add site/scripts/build.mjs && git commit -m "refactor(build): SITE_URL 收敛为单一 env 可覆盖常量"`

---

## 任务 3.2：webmanifest 的 start_url/scope 构建期注入

**问题：** `site/src/site.webmanifest` L5 硬编码 `"start_url": "/embodied-ai-reading-station/"`。本地 `npm run serve`（无 BASE）或换仓库名部署时 PWA 安装入口错误。build.mjs 已有 `SITE_BASE` 环境变量机制（CI 里设为 `/仓库名`），应复用。

**Files:**
- Modify: `site/scripts/build.mjs`（找到复制 `site.webmanifest` 到 dist 的位置，在 `build()` 的静态资源复制段）
- Modify: `site/src/site.webmanifest`

- [ ] **Step 1:** 把 `site/src/site.webmanifest` 里的 `start_url`（及 `scope` 若存在）改为占位符 `"__BASE__/"`。

- [ ] **Step 2:** 在 build.mjs 中，把对 `site.webmanifest` 的原样复制改为读取-替换-写入：

```js
const manifest = fs.readFileSync(path.join(SRC, "site.webmanifest"), "utf8")
  .replaceAll("__BASE__", BASE || "");
write(path.join(DIST, "site.webmanifest"), manifest);
```

（`write` 与 `SRC`/`DIST` 变量名以 build.mjs 实际使用的为准——先搜索 `site.webmanifest` 找到现有复制逻辑再改。）

- [ ] **Step 3:** 双场景验证：

```bash
cd /workspace/site
npm run build && rg '"start_url"' dist/site.webmanifest         # 预期 "/"（无 BASE）
SITE_BASE=/embodied-ai-reading-station node scripts/build.mjs && rg '"start_url"' dist/site.webmanifest
# 预期 "/embodied-ai-reading-station/"
npm run build && npm run check   # 恢复默认构建，70 passed
```

- [ ] **Step 4:** 提交：`git add site/scripts/build.mjs site/src/site.webmanifest && git commit -m "fix(pwa): manifest start_url 随 SITE_BASE 注入，本地与 fork 部署不再错位"`

---

## 任务 3.3：SEO 产物与 content/ 目录解耦

**问题：** `build.mjs` L3687–3834 把 sitemap.xml、feed.xml、robots.txt、404.html、llms.txt 等**全站级**产物的生成写在 `if (fs.existsSync(CONTENT_DIR))` 块内。如果哪天 content/ 目录被移动或清空，全站 SEO 产物会静默消失（check.mjs 会报错，但架构上就不该耦合）。

**Files:**
- Modify: `site/scripts/build.mjs`

- [ ] **Step 1:** 定位 `if (fs.existsSync(CONTENT_DIR))` 块（L~3687），识别其中哪些产物依赖 content 数据（issues/learn 页本身、feed 中的 issue 条目）、哪些不依赖（sitemap、robots、404、llms.txt、opensearch、humans、security）。

- [ ] **Step 2:** 把不依赖 content 的产物生成移出该条件块（放到 `build()` 主流程末尾）。feed.xml 若混合 issue+notes 条目，改为：issues 数据在块内收集到变量，feed 生成在块外（无 issues 时只含 notes 条目）。sitemap 中的 issues/learn URL 同理——用块内收集的页面清单变量，块外统一生成。

- [ ] **Step 3:** 验证产物无回归（正常构建下 dist 应与改动前一致）：

```bash
cd /workspace/site && npm run build && npm run check   # 70 passed
ls dist/sitemap.xml dist/feed.xml dist/robots.txt dist/404.html dist/llms.txt
```

- [ ] **Step 4:** 提交：`git add site/scripts/build.mjs && git commit -m "fix(build): sitemap/feed/404 等全站产物与 content 目录解耦"`

---

## 任务 3.4：消除会漂移的硬编码文案数字

**问题：** `build.mjs` L271 `issues: { label: "Issues", desc: "4 期编辑总结" }`——实际已有 8 期 issue（`site/content/issue-01..08.md`）。类似的写死数字（"156 篇"、"21 tags"、"22 章"）散布在 VIEW_DESC、首页文案、llms.txt 中，内容每增长一次就漂移一次。

**Files:**
- Modify: `site/scripts/build.mjs`

- [ ] **Step 1:** 修 L271 的直接错误：`"4 期编辑总结"` → `"编辑总结合集"`（去数字化，避免再漂移）。

- [ ] **Step 2:** 搜出所有硬编码计数文案并逐个处理：

```bash
rg -n '"?(156|1\d\d) 篇|2[12] 章|21 (个)?tag|11 (个)?主题|\d 期' /workspace/site/scripts/build.mjs
```

处理原则（二选一，就近判断）：
  - 该处上下文里能拿到数据数组的（如 `notes.length`、`guidePages.length`、`Object.keys(tags).length`）→ 改为模板插值；
  - 拿不到的静态描述 → 去掉具体数字，改为不含计数的文案。

- [ ] **Step 3:** 验证 + 提交：

```bash
cd /workspace/site && npm run build && npm run check
rg -n "4 期" dist/ -l   # 预期无命中
git add site/scripts/build.mjs && git commit -m "fix(build): 硬编码计数文案改为动态插值或去数字化"
```

---

## 任务 3.5：TASK_SLUGS 单一事实来源

**问题：** 13 篇任务论文的 slug 清单在 `build.mjs` 与 `check.mjs` 各维护一份，新增/改名任务论文时容易只改一处。

**Files:**
- Create: `site/scripts/constants.mjs`
- Modify: `site/scripts/build.mjs`, `site/scripts/check.mjs`

- [ ] **Step 1:** 新建 `site/scripts/constants.mjs`：

```js
// 13 篇导师任务论文（来源：research-task.md）。build.mjs 与 check.mjs 共用。
export const TASK_SLUGS = [
  "llava", "3dshape2vecset", "saycan", "openvla", "vlas", "mla",
  "cosmos-policy", "rf-slam", "mmclip", "nlos-mmwave",
  "proactive-hearing", "neuralaids", "acoustic-swarms",
];
```

- [ ] **Step 2:** 在 `build.mjs` 与 `check.mjs` 中删除各自的本地清单（搜索 `TASK_SLUGS` 或逐个 slug），改为 `import { TASK_SLUGS } from "./constants.mjs";`。注意两个文件里原变量名可能不同——统一改用 `TASK_SLUGS`。

- [ ] **Step 3:** 验证 + 提交：

```bash
cd /workspace/site && npm run build && npm run check   # 70 passed（task-required 门禁仍通过）
git add site/scripts/constants.mjs site/scripts/build.mjs site/scripts/check.mjs
git commit -m "refactor(scripts): TASK_SLUGS 抽取为共享常量模块"
```

---

## 任务 3.6：check.mjs 门禁扩容（死链全扫 + 元数据一致性）

**问题：** 当前死链检查是「分层抽样」（check.mjs L~230–251），大改版后可能漏检；且 BACKLOG #10 列出的 topics.json primer slug 存在性、progress.md slug 一致性两项一直没做。

**Files:**
- Modify: `site/scripts/check.mjs`

- [ ] **Step 1:** 把内链检查从抽样改为全量：遍历 `dist/**/*.html`，提取所有 `href` 指向站内的链接（以 BASE 或 `/` 开头），验证目标文件存在。实现要点：
  - 用 `fs.readdirSync(dir, { recursive: true })` 收集 HTML；
  - 链接正则 `/href="([^"#?]+)[^"]*"/g`，过滤 `http(s)://`、`mailto:`；
  - 目标解析：`/foo/` → `dist/foo/index.html`；`/foo.xml` → `dist/foo.xml`；
  - 失败时打印「源文件 → 死链」清单前 20 条。
  - 先本地跑一次确认全量扫描耗时可接受（预期 <10s；若超过 30s，改为并发读或维持全量但只在 `CI=true` 时启用）。

- [ ] **Step 2:** 新增检查项 A——topics.json primer slug 全部存在于 notes/：

```js
check("topics.json primer slug 均有对应笔记", () => {
  const topics = JSON.parse(fs.readFileSync(path.join(ROOT, "../notes/topics.json"), "utf8")).topics;
  const missing = topics.flatMap(t => t.primer).filter(s => !fs.existsSync(path.join(ROOT, `../notes/${s}.md`)));
  if (missing.length) throw new Error(`缺失: ${missing.join(", ")}`);
});
```

（`ROOT` 等路径变量以 check.mjs 现有写法为准，先读文件头适配。）

- [ ] **Step 3:** 新增检查项 B——progress.md 提到的 13 篇任务论文 slug 与 `TASK_SLUGS`（任务 3.5 的共享模块）一一对应存在于 notes/。

- [ ] **Step 4:** 新增检查项 C——issue markdown 数量 ≥1 且 `dist/issues/` 下页面数与 content 目录 `issue-*.md` 数一致。

- [ ] **Step 5:** 验证 + 提交：

```bash
cd /workspace/site && npm run build && npm run check   # 预期 ≥74 passed, 0 failed
git add site/scripts/check.mjs && git commit -m "feat(check): 死链全量扫描 + primer/progress/issue 一致性门禁"
```

---

# Phase 4 — 笔记合规收尾（P1：deep-read 承诺兑现）

> 背景：`AGENT-DEEPREAD.md` 定义了 deep-read 的 15 节标准模板。2026-07-05 实测缺口如下（全部已核实，直接按清单干活）。

## 任务 4.1：补齐 llava.md 的 4 个缺失章节

**问题：** `notes/llava.md` 是 13 篇任务论文之首、文风标杆，但恰恰是**唯一**缺「思考题」「和本导读的关系」的笔记，同时也缺「实验结果说明了什么」「原文信息」。标杆自身不合规。

**Files:**
- Modify: `notes/llava.md`

- [ ] **Step 1:** 先读 `AGENT-DEEPREAD.md` 全文与一篇合规标杆 `notes/clip.md`，掌握 4 个章节的写法（标题层级、`<details>` 思考题格式、原文信息的字段）。

- [ ] **Step 2:** 通读 `notes/llava.md` 与 `papers/llava/paper.md`（本地有全文解析），在正文尾部按 clip.md 的章节顺序补写：
  - `## 实验结果说明了什么` — 基于 LLaVA 论文的 ScienceQA（92.53%）与 GPT-4 相对评分实验，写"数字背后的含义"（≥300 字）；
  - `## 和本导读的关系` — 关联 guide Ch09（BLIP-2 → LLaVA 章）与 Ch12（OpenVLA 用它当感知基座），说明它在 22 章体系中的位置；
  - `## 思考题` — 5–8 道，用 `<details><summary>Q1: …</summary>答案要点</details>` 格式（对照 clip.md 现有写法）；
  - `## 原文信息` — 标题 / 作者 / venue+年份 / arxiv 链接 / 本地 PDF 路径（`papers/llava/paper.pdf`），格式照抄 clip.md 同名节。
  - 保留现有的 `## 我建议这样读这篇` 与 `## 最后一个画面` 两个特色章节，不要删。

- [ ] **Step 3:** 验证 + 提交：

```bash
rg -n "^## " /workspace/notes/llava.md    # 确认 4 个新章节都在
cd /workspace/site && npm run build && npm run check
git add notes/llava.md && git commit -m "docs(notes): llava 补齐思考题/实验解读/导读关系/原文信息 4 节，达 deep-read 模板标准"
```

---

## 任务 4.2：补齐 11 篇缺「实验结果说明了什么」的笔记

**问题：** 以下 11 篇缺 `## 实验结果说明了什么` 章节（2026-07-05 实测清单，llava 已在任务 4.1 处理故不在此列）：

`code-as-policies.md`, `dreamer-v2.md`, `imagebind.md`, `isaac-gym.md`, `meta-world.md`, `millimap.md`, `person-in-wifi.md`, `rlbench.md`, `soundstream.md`, `whisper.md` + 上面 llava（4.1 处理）——**本任务处理前 10 篇**。

**Files:**
- Modify: 上述 10 个 `notes/*.md`

- [ ] **Step 1:** 逐篇检查——有些笔记用编号体例（如 `whisper.md` 用 `## 7. 实验……`），可能**内容存在但标题措辞不同**。判断规则：若已有语义等价的实验解读章节，仅把标题改为标准措辞 `## 实验结果说明了什么`（编号体例的保留编号，如 `## 7. 实验结果说明了什么`）；若确实没有，则新写。

- [ ] **Step 2:** 需要新写的：基于该笔记已有的「关键数字」章节与正文实验表格，写 ≥300 字的解读（回答"这些数字证明/证伪了什么主张，哪个对比最关键，哪个数字要打折扣看"）。不得编造论文里没有的数字——只解读笔记中已出现的数据。

- [ ] **Step 3:** 验证清零 + 提交：

```bash
rg -l "^## .*实验结果说明了什么" /workspace/notes --glob "*.md" | wc -l   # 预期 156
cd /workspace/site && npm run build && npm run check
git add notes/ && git commit -m "docs(notes): 10 篇补齐/规范化「实验结果说明了什么」章节"
```

---

## 任务 4.3：补齐 3 篇缺「原文信息」的笔记

**问题：** 以下 3 篇缺 `## 原文信息` 章节（llava 已在 4.1 处理）：`3d-diffusion-policy.md`, `nlos-mmwave.md`, `proactive-hearing.md`。

**Files:**
- Modify: 上述 3 个 `notes/*.md`

- [ ] **Step 1:** 同任务 4.2 的判断规则先查是否只是标题措辞不同（如「## 10. 原文信息」「## 论文信息」）。

- [ ] **Step 2:** 缺失的按 clip.md 的 `## 原文信息` 格式补写：标题 / 作者 / venue+年 / 链接（frontmatter `来源` 字段有 URL 或本地路径，nlos-mmwave 有 `papers/nlos-mmwave/paper-neurips.pdf`）。

- [ ] **Step 3:** 验证清零 + 提交：

```bash
rg -l "^## .*原文信息" /workspace/notes --glob "*.md" | wc -l   # 预期 156
git add notes/ && git commit -m "docs(notes): 3 篇补齐「原文信息」章节"
```

---

## 任务 4.4：check.mjs 增加 deep-read 章节门禁

**依赖：** 任务 4.1–4.3 完成后执行（否则门禁上来就红）。

**Files:**
- Modify: `site/scripts/check.mjs`

- [ ] **Step 1:** 新增检查项——每篇 `status: deep-read` 的笔记必须含以下 4 个章节标题（允许 `## 思考题` 与 `## 7. 思考题` 两种体例，用正则 `/^## (\d+\. )?.*思考题/m` 匹配）：思考题、实验结果说明了什么、和本导读的关系、原文信息。失败时列出缺失的 slug + 章节名。

- [ ] **Step 2:** 验证 + 提交：

```bash
cd /workspace/site && npm run build && npm run check   # 预期新增 1 项，0 failed
git add site/scripts/check.mjs && git commit -m "feat(check): deep-read 笔记强制章节门禁"
```

---

# Phase 5 — 性能与离线（P1）

## 任务 5.1：KaTeX 与 D3 自托管，摆脱 CDN

**问题：** KaTeX 从 jsdelivr 加载（build.mjs L384、L413–414），D3 从 d3js.org 加载（L2817）。国内访问、离线 PWA、CDN 故障场景都会挂；且无 SRI 校验。站点定位是中文读者学习站，这是真实痛点。

**Files:**
- Modify: `site/package.json`（新增依赖）
- Modify: `site/scripts/build.mjs`
- Modify: `site/src/sw.js`（可选：把 vendor 加入 shell 缓存）

- [ ] **Step 1:** 安装为构建依赖（用最新版本，别手写版本号）：

```bash
cd /workspace/site && npm install katex d3
```

- [ ] **Step 2:** 在 build.mjs 的静态资源复制段增加 vendor 复制逻辑：

```js
// KaTeX：css + js + fonts
const katexSrc = path.join(__dirname, "../node_modules/katex/dist");
copyDir(path.join(katexSrc, "fonts"), path.join(DIST, "vendor/katex/fonts"));
for (const f of ["katex.min.css", "katex.min.js", "contrib/auto-render.min.js"]) {
  const dest = path.join(DIST, "vendor/katex", f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(katexSrc, f), dest);
}
// D3
fs.copyFileSync(path.join(__dirname, "../node_modules/d3/dist/d3.min.js"),
                path.join(DIST, "vendor/d3.min.js"));
```

（`copyDir`/`__dirname`/`DIST` 以 build.mjs 现有实现为准，先搜索现有 `copyDir` 用法再仿写。）

- [ ] **Step 3:** 替换引用：L384/L413–414 的 jsdelivr URL → `${url("/vendor/katex/katex.min.css")}` 等；L2817 的 d3js.org → `${url("/vendor/d3.min.js")}`。注意 KaTeX auto-render 的 `onload` 内联属性原样保留。

- [ ] **Step 4:** 验证：

```bash
cd /workspace/site && npm run build && npm run check
rg -rn "jsdelivr|d3js.org" dist/ --glob "*.html" | wc -l    # 预期 0
ls dist/vendor/katex/katex.min.css dist/vendor/d3.min.js    # 存在
# 手动：npm run serve 后打开一篇带公式的论文页（如 /papers/clip/）确认公式渲染、/graph/ 确认力导图渲染
```

- [ ] **Step 5:** 提交：`git add site/package.json site/package-lock.json site/scripts/build.mjs && git commit -m "perf: KaTeX/D3 自托管，去除 jsdelivr 与 d3js.org 运行时依赖"`

- [ ] **Step 6（可选加分）:** Google Fonts（theme.css 顶部 `@import`）同理可用 [fontsource](https://fontsource.org/) 自托管；工作量较大（3 个字族 × 多字重 + woff2 复制），若时间紧可跳过并在 CHANGELOG 的 Known Issues 中记录「字体仍依赖 Google Fonts CDN」。

---

## 任务 5.2：check.mjs 增加性能预算门禁

**问题：** 现有检查只有 dist<200MB、单页<350KB 两条粗线。1.0.0 应把当前健康值固化为预算，防劣化。

**Files:**
- Modify: `site/scripts/check.mjs`

- [ ] **Step 1:** 找到现有 asset-size 检查段（搜索 `350`），调整/新增：
  - 首页 `dist/index.html` < **250KB**（当前 192KB，留 30% 余量）；
  - `dist/styles.css` < 150KB（先量当前值，按当前值 ×1.3 取整设线）；
  - 全站单张图片 < 600KB（遍历 `dist/images/**`，防止未压缩图混入）。

- [ ] **Step 2:** 验证 + 提交：

```bash
cd /workspace/site && npm run build && npm run check   # 0 failed
git add site/scripts/check.mjs && git commit -m "feat(check): 固化首页/CSS/单图性能预算"
```

---

# Phase 6 — 发布工程（依赖 Phase 1–5 全部完成）

## 任务 6.1：建立 CHANGELOG.md

**Files:**
- Create: `CHANGELOG.md`（仓库根目录）

- [ ] **Step 1:** 按 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式创建，包含两个条目：

```markdown
# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与语义化版本。

## [1.0.0] - <发布当天日期>

首个正式版。156 篇论文笔记全部达到 deep-read 标准，三条学习入口对齐，构建与质量门禁产品化。

### Added
- 30 天路径新增 Week 5，全覆盖 13 篇任务论文
- check.mjs 门禁扩至 75+ 项：死链全量扫描、primer/progress 一致性、deep-read 章节完整性、性能预算
- KaTeX / D3 自托管（vendor/），离线与国内访问可用
- CHANGELOG 与语义化版本流程

### Changed
- README 质量叙事与 156 全 deep-read 现状对齐
- webmanifest start_url 随部署 BASE 注入
- SITE_URL 收敛为单一 env 可覆盖常量
- sitemap/feed/404 等全站产物与 content/ 目录解耦

### Fixed
- llava / llava-1-5 双笔记互加系列说明
- llava 等 14 篇笔记补齐 deep-read 强制章节
- paper-stub 残留清理、research-task 日期笔误、硬编码"4 期"文案

## [0.1.0] - 2026-06
- 初始版本：156 篇笔记 + 22 章导读 + 11 主题 + 多视图站点，GitHub Pages 部署
```

（Added/Changed/Fixed 条目按 Phase 1–5 **实际完成情况**增删——若某任务被跳过，条目必须删掉，不许写没做的事。）

- [ ] **Step 2:** 提交：`git add CHANGELOG.md && git commit -m "docs: 建立 CHANGELOG，记录 1.0.0 发布内容"`

---

## 任务 6.2：版本号 bump 与发布

**Files:**
- Modify: `site/package.json`（L3 `"version": "0.1.0"` → `"1.0.0"`）
- Modify: `README.md`（可选：标题下加版本徽章行 `> v1.0.0 · 2026-07`）

- [ ] **Step 1:** 改版本号，最后全量验收（见下节命令），确认全绿。

- [ ] **Step 2:** 提交并打 tag：

```bash
git add site/package.json README.md
git commit -m "release: v1.0.0"
git tag -a v1.0.0 -m "Embodied AI: Zero to One 1.0.0 — 156 篇 deep-read + 22 章导读正式版"
git push -u origin <当前分支> && git push origin v1.0.0
```

（若发布流程要求走 PR 合并后再在 main 上打 tag，则 tag 步骤留到 PR 合并后，由维护者执行；执行者在 PR 描述中注明。）

---

## 最终验收（发布前必须全绿）

```bash
cd /workspace/site
rm -rf dist node_modules && npm ci
npm run build                      # Finished in <5 seconds
npm run check                      # 预期 ≥75 passed, 0 failed
node -e "console.log(require('./package.json').version)"   # 1.0.0

# 叙事一致性抽查
rg -n "auto-summary-light" /workspace/README.md            # 无命中
rg -n "4 期" dist/ -l                                       # 无命中
rg -rn "jsdelivr|d3js.org" dist/ --glob "*.html" | wc -l    # 0

# 内容门禁抽查
rg -l "^## (\d+\. )?.*思考题" /workspace/notes --glob "*.md" | wc -l          # 156
rg -l "^## (\d+\. )?.*实验结果说明了什么" /workspace/notes --glob "*.md" | wc -l # 156
rg -l "^## (\d+\. )?.*原文信息" /workspace/notes --glob "*.md" | wc -l         # 156

# 三入口对齐抽查
for s in llava 3dshape2vecset saycan openvla vlas mla cosmos-policy rf-slam mmclip nlos-mmwave proactive-hearing neuralaids acoustic-swarms; do
  rg -q "papers/$s" dist/learn/path/index.html && echo "OK $s" || echo "MISSING $s"
done   # 13 个全 OK
```

手动冒烟（`npm run serve` 后浏览器过一遍）：首页 → 一篇论文页（公式渲染）→ /graph/（力导图）→ /learn/path/（Week 5）→ 搜索 `/` 唤起 → 暗色切换 → 移动端宽度。

---

# 明确不做（推迟到 1.x，不阻塞 1.0.0）

以下项经评估**不进入** 1.0.0 范围，执行者不要顺手做：

| 项 | 理由 | 归属 |
|----|------|------|
| build.mjs 拆分（3853 行 → 模块化） | 高风险重构，check.mjs 门禁虽强但无单测护航；性能非瓶颈（构建 2s）。1.1 在门禁扩容完成后做 | 1.1 |
| theme.css 拆分（~4500 行） | 同上，纯维护性收益 | 1.1 |
| 引入 Vitest/Playwright 测试框架 | 1.0.0 以 check.mjs 门禁扩容替代；框架引入是 1.1 配合 build.mjs 拆分一起做才有价值 | 1.1 |
| 110 篇笔记补本地 PDF 全文 | 内容增强而非产品缺陷；已在 README 新文案中如实披露（任务 1.1） | 持续 |
| guide 与 notes 内容去重（BACKLOG #7） | 需逐章人工对比，收益不确定 | 观察 |
| 首页 156 卡片分页/虚拟化 | 当前 192KB 在预算内（任务 5.2 已设 250KB 门禁防劣化） | 触线再做 |
| Google Fonts 自托管 | 任务 5.1 Step 6 标记为可选；跳过则记入 Known Issues | 1.0.x |
| UI 中英文语言策略统一 | 产品定位问题需 owner 决策，非工程任务 | 待定 |

---

# 风险与回滚

- **热点文件冲突：** `build.mjs`（任务 3.1–3.4、5.1）与 `check.mjs`（3.5–3.6、4.4、5.2）被多任务修改。并行执行时这两个文件的任务必须串行分配。
- **回归保障：** 每个任务的验证步骤都以 `npm run build && npm run check` 全绿为底线。任何一步变红且 10 分钟内定位不了，`git checkout -- <file>` 回滚该任务重来，不要带病推进。
- **dist 不进 git：** `site/dist/` 在 .gitignore 中，所有验证命令中对 dist 的检查只在本地/CI 有效，不要误提交。
- **笔记类任务（Phase 4）的红线：** 只允许基于笔记已有内容与 `papers/<slug>/paper.md` 本地全文写作，**禁止编造论文数据**。拿不准的数字宁可不写。
