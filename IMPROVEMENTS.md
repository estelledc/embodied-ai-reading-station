# 站点改进清单

> ⚠️ **历史文档**：本文反映 2026-05-31 时点的状态，其中多数问题已在后续迭代中解决
> （156 篇已全部升级 deep-read，见 [DEEPREAD-BATCH.md](DEEPREAD-BATCH.md)）。
> 现状以 [CHANGELOG.md](CHANGELOG.md) 与 [PLAN-1.0.0.md](PLAN-1.0.0.md) 为准。

> 基于 5 路对标调研（Distill 类 / 论文聚合 / 编辑型杂志 / 中文学习站 / 教育平台）。
> 当前站底色：atelier-zero 暖纸期刊感（#efe7d2 + Playfair italic + JetBrains Mono caption + 罗马数字 + coral 装饰线）— 已经到位，所有改进必须不破坏这套语汇。
> 现状：13 篇论文笔记 + 5 学习页 + 1 拓展论文页 + 1 deck；纯 HTML + Tailwind + node build；无 JS（除 deck）。
> 评估视角：**对入门读者（零基础 Jason 类受众）的实际价值**，不追新潮。

---

## 立即可做（零成本，CSS / build.mjs 改动 < 50 行）

### 1. Drop cap 首字母 + ornament hr 替代实线
- **改什么**：`note-content > p:first-of-type::first-letter` 加 3 行高 Playfair Display drop cap，coral 或 ink 色，float-left；现有 `<hr>` 换成 `<hr class="ornament">`，::before 渲染 `* * *` 或三个 mustard 小方块
- **借鉴自**：Aeon · Psyche（asterism 三星）+ The New Yorker（4-5 行 drop cap）
- **视觉效果**：每篇笔记开头有"翻杂志"的呼吸感；章节切换从硬实线变成字符级装饰，atelier 期刊感再深一档
- **实施**：在 `site/src/theme.css` 末尾追加约 25 行 CSS；移动端用 `@media (max-width: 640px)` 关掉 drop cap 防错位
- **借鉴文件**：bench-editorial.md A1 + A2

### 2. 阅读时长 + 字数统计（build 期算）
- **改什么**：`build.mjs` 里读每篇 `notes/*.md` 内容，中文按 350 字/分、英文按 200 词/分算 reading time，写入 frontmatter 注入到 `note-meta` 行
- **借鉴自**：Aeon · Psyche（"By X · 13 min read"）
- **视觉效果**：读者点进笔记前知道"得啃多久"，降低长文跳出率
- **实施**：build.mjs 加一个 `wordCount(content)` 函数 + meta 模板插槽 `· {{readTime}} min read`；约 15 行
- **借鉴文件**：bench-editorial.md A4

### 3. 文末 endmark + "fin" 提示阅读完结
- **改什么**：每篇笔记正文末尾自动追加 `<p class="endmark">◼</p>`（mustard 色居中）；当前 `.fin` italic 留在 footer 不动
- **借鉴自**：The New Yorker（◼ end mark）
- **视觉效果**：读者明确知道"这里是正文尽头"，下面是元信息；杂志感拉满
- **实施**：模板里 `{{content}}` 后加一行；3 行 CSS 定义 endmark 样式
- **借鉴文件**：bench-editorial.md C12

### 4. /papers/ 卡片加中文一句话 TL;DR + 难度标签
- **改什么**：每篇 paper card 第一行写一句中文（自己话）"这篇做了啥"；右上角加难度徽章（入门 / 进阶 / 专家）+ 必读/选读 标
- **借鉴自**：Semantic Scholar（TL;DR）+ AMiner（必读论文）+ Cool Papers（venue/year 筛）
- **视觉效果**：50+ 篇论文页面从"纯目录"升级成"导览"；扫读速度 3 倍提升
- **实施**：每个 paper md 在 frontmatter 加 `tldr_zh`、`difficulty`、`must_read` 字段；build.mjs card 模板插这三段；难度徽章用现有 mono caption 风格
- **借鉴文件**：bench-aggregator.md P0 第 1-2 条

### 5. 主题分组内显式排序：祖师爷 → 现代经典 → 前沿延伸
- **改什么**：/papers/ 每个主题 section 顶部加一行小字 "按演进顺序：祖师爷 · 现代经典 · 前沿延伸"；每张 card 加 `era` 字段决定排序
- **借鉴自**：Connected Papers（co-citation 图自动分类）+ AMiner（必读分层）
- **视觉效果**：读者知道先读哪篇、为什么；从"一堆同级卡片"变成"有时间向量的演进线"
- **实施**：frontmatter 加 `era: founder | classic | frontier`；build.mjs sort 时按 era 排；约 20 行
- **借鉴文件**：bench-aggregator.md P0 第 3 条

### 6. /learn/ 每页顶部加路径地图 + 单页时长
- **改什么**：每个 learn page 顶部加一行 mono caption `P3 / 7 · 约 20min`；底部加 `← 上一站 | 下一站 →` 显式链接
- **借鉴自**：fast.ai（9×90min 明示）+ HuggingFace LLM 课（章节 1 周/6-8h）
- **视觉效果**：5 张孤立 markdown 升级成"有路径感的课"；读者知道自己在哪、还差几站
- **实施**：learn 模板加 `step` 和 `total_steps` 字段；build.mjs 渲染上下页 nav；约 25 行
- **借鉴文件**：bench-education.md 6.1

### 7. Eyebrow + dek（副标题独占段）
- **改什么**：现有 h1 + meta 之间插入 `.dek`：Playfair italic、1.4rem、灰一档、max-width 较窄；用一句话告诉读者"这篇要讲什么"
- **借鉴自**：Aeon · Psyche（dek 独占段）+ Offscreen（tagline 独立成块）
- **视觉效果**：开篇钩子从平淡变有引导；和现有罗马数字 eyebrow 形成"小标 / 大标 / 副标"三层节奏
- **实施**：每篇 frontmatter 加 `dek` 字段；模板插槽；10 行 CSS
- **借鉴文件**：bench-editorial.md C11

### 8. Mobile 阅读样式审查（中文 16px / 1.7 行高 / 抽屉 nav）
- **改什么**：检查 `.note-content` 在 < 640px 是否 16px / line-height 1.7 / max-width 自适应；顶部 nav 在窄屏折叠成汉堡或简化为竖排
- **借鉴自**：动手学深度学习（中文 16px / 1.7）+ csdiy.wiki（侧栏抽屉化）
- **视觉效果**：移动端读起来不再是"PC 缩小版"；中文阅读舒适度上一档
- **实施**：theme.css 加 `@media` 块；约 15 行；不需 JS
- **借鉴文件**：bench-chinese.md 第 2 节共性表 + 优先级 3

---

## 周末项目（1-2 天，100-300 行代码或新组件）

### 1. Pagefind 站内搜索（中文友好）
- **完整方案**：`/sync-all` 流程加 `npx pagefind --site dist/`，构建期生成 JSON 索引；nav 加 `<input data-pagefind-search>`，按 `/` 唤起；样式套现有 mono caption
- **借鉴自**：csdiy.wiki（lunr + jieba 中文搜索）+ mkdocs-material 模式
- **风险点**：pagefind 对中文有内置 segmenter 但精度一般；要测"梯度下降"能搜到。索引文件约 1-3MB，托管侧 OK
- **是否需要 JS**：需要（pagefind 自带 ~30KB JS，不写自己代码）
- **价值**：笔记到 30+ 篇 grep 已不够用；这是中长期最高 ROI 改进
- **借鉴文件**：bench-chinese.md 第 4 节优先级 1

### 2. 单页右栏 outline（H2/H3 浮窗，sticky 跟随滚动）
- **完整方案**：长 note（>3 段 H2）才显示；桌面端 right rail 宽 200px，mono 小号，IntersectionObserver 同步高亮当前 section；移动端折叠成顶部"On this page"按钮（`<details>`）
- **借鉴自**：mkdocs-material（双侧栏）+ Aeon · Psyche essay 长文 + Lilian Weng（PaperMod TOC）
- **风险点**：sticky 在 atelier 暖纸底色上要小心 — 别压到正文 measure；mono 字号要克制不抢主文
- **是否需要 JS**：需要（约 40 行 vanilla JS：扫 h2/h3 + IntersectionObserver）
- **价值**：13 篇笔记里有 5-6 篇是长综述型，outline 收益大；零基础读者最容易在长文中迷路
- **借鉴文件**：bench-chinese.md 第 4 节优先级 2 + bench-distill.md PaperMod 关键发现

### 3. KaTeX 公式渲染 + Update 横幅 component
- **完整方案**：CDN 一行接 KaTeX（auto-render 自动扫 `$...$` 和 `$$...$$`）；新增 `<aside class="update-banner">2026-05 Update: ...</aside>` 组件用于论文笔记加新见解时的时效提示
- **借鉴自**：Distill / Lilian Weng（KaTeX）+ Jay Alammar（"July 2020 Update" 横幅）
- **风险点**：KaTeX 字体要和 atelier 暖底协调，别破坏 Playfair / JetBrains 配比；horizontal banner 颜色用 mustard 而非纯红
- **是否需要 JS**：需要（KaTeX 是 JS 库，但 CDN 一行）
- **价值**：embodied AI 论文笔记很多有公式，目前只能贴截图；update 横幅适合"我两月后回头看又懂了"的二次注解场景
- **借鉴文件**：bench-distill.md 横向汇总第 1 + Jay Alammar 关键发现

### 4. /papers/ 主题 mini-graph + figure 1 缩略图
- **完整方案**：每个主题下加一段 SVG 力导向静态图（手画或 figma 导出），3-5 个节点，节点大小= 引用数代理（用 era 字段近似）；每张 paper card 加 figure 1 缩略图（128x96，截论文第一图）
- **借鉴自**：Connected Papers（force graph）+ HuggingFace papers（thumbnail）
- **风险点**：figure 1 截图版权问题需自查（学术 fair use 范围内 OK）；mini-graph 画得太复杂会破坏期刊感 — 必须保持线条克制
- **是否需要 JS**：不需要（SVG 静态图 + IMG 缩略图都是纯 HTML）
- **价值**：视觉锚点对入门读者价值极高；阅读速度 + 主题理解一起提升
- **借鉴文件**：bench-aggregator.md P1 第 8 + Connected Papers 全段

### 5. /learn/ "修辞性问题 + 折叠答案" 嵌入式 sandbox
- **完整方案**：每个 learn page 关键概念后插入 `<details><summary>想想看：把 lr 调到 100 会怎样？</summary>答案 + 解释</details>`；选 1-2 个最关键概念（如梯度下降）iframe TF Playground 进来
- **借鉴自**：3Blue1Brown（修辞性问题）+ TF Playground（"Don't Worry, You Can't Break It"）+ HuggingFace LLM 课（章末 quiz）
- **风险点**：TF Playground iframe 在 atelier 暖底上颜色冲突 — 给 iframe 加暖纸 wrapper 框；修辞问题数量要克制（每页 1-2 个，不变成 quiz 站）
- **是否需要 JS**：基本不需要（`<details>` 是 HTML 原生）；iframe 不算
- **价值**：把 5 张静态 markdown 升级成"主动思考"的课程页；零基础读者最需要"暂停一下"的节奏
- **借鉴文件**：bench-education.md 6.3 + 6.4

### 6. Issue / 期刊概念 + cover 页
- **完整方案**：把每月笔记打包成"Issue No. 03"，给一个 cover 页 = 当期目录 + 编辑前言（一段话讲本期主题）+ 当期 plate 缩略图网格；nav 增加 `Issues` 入口
- **借鉴自**：Offscreen Magazine（Issue 24 四封面并列）+ Aeon · Psyche（编辑前言）
- **风险点**：当前论文数量（13 篇）勉强能撑 2-3 期；如果产出节奏跟不上 cover 页会显空。建议先做"Issue No. 01"试水
- **是否需要 JS**：不需要
- **价值**：让 atelier-zero 期刊感从"单页风格"扩到"全站结构"；最有品牌资产沉淀的一刀
- **借鉴文件**：bench-editorial.md B8 + 五项建议第 3 条

---

## 大工程（需要重构，跳过即可）

### 1. 暗色模式（CSS variables 重写整套配色）
- **为什么大**：atelier-zero 的核心是暖纸 #efe7d2 + coral + mustard 的特定饱和度关系；做暗色不是"颜色取反"，要重新调配整套对比度（drop cap / pull quote / endmark / hr ornament 全要再设计一版）；约 200+ 行 CSS 变量重写 + 50+ 行 JS
- **收益是否值得**：embodied AI 读者大多在白天读论文；暗色模式不是入门读者的核心痛点；且现在 light 主题的"翻杂志"感才是辨识度
- **建议**：**不做**。如果非要做，等站规模到 50+ 笔记再说

### 2. 复杂交互可视化（D3.js / observable / scrolly-telling）
- **为什么大**：要会 d3 + 数学（高维投影 / 训练动画 / Grand Tour 类），单个组件 200-500 行 JS；且必须每篇配（一篇做了别的没做反而显空）
- **收益是否值得**：Distill / R2D3 是顶级团队多人项目；个人站做一个就够，做三个就成本失控；且 atelier 的克制美学和"花哨交互"在视觉上会打架
- **建议**：**不做**。如果某篇笔记真的需要互动（比如讲注意力机制），iframe 一个外部 sandbox（TF Playground / Distill 既有 demo）即可，不自己造

### 3. 全站迁 mkdocs-material / Hugo PaperMod
- **为什么大**：当前 sidecar html 渲染模型 + pre-commit hook（来源字段 / 死链检查）是核心约束；迁站要重写 build pipeline、重做 atelier 主题（mkdocs/Hugo 主题系统不是为这种期刊感设计的）；约 1-2 周工作
- **收益是否值得**：能拿到的（TOC / 搜索 / 暗色 / 暗色折叠）通过上面的"周末项目 1+2"已能解决 80%；剩下 20% 不值得换地基
- **建议**：**不做**。bench-chinese.md 第 5 节专门有反向警告：保持 sidecar html 单文件渲染模型，只加 pagefind + outline 注入

---

## 如果只能做 3 件事

如果只能做 3 件事，我会做：**立即 1（drop cap + ornament hr）、立即 4（papers TL;DR + 难度标签）、周末 1（pagefind 站内搜索）**，因为它们对入门读者体验提升最大。

理由：
- **立即 1**：零成本拿到 atelier 期刊感最显著的一档跃迁，每篇笔记开篇都"翻杂志"，视觉资产沉淀
- **立即 4**：把 /papers/ 从"纯目录"变成"导览"，零基础读者一眼知道先读哪篇，是 ROI 最高的内容层改进
- **周末 1**：站点到 30+ 篇就到了 grep 失效的临界点；pagefind 中文友好、半天能上线，是中长期最高杠杆的基础设施改进
