# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与语义化版本。

## [1.1.0] - 2026-07-05

工程债清偿：build.mjs 模块化 + 单元测试骨架 + 拆分中记录的坏味道逐条清偿（行为不变重构全程以固定时间戳 dist 逐字节对比护航）。

### Added
- 可复现构建：支持 `SOURCE_DATE_EPOCH`（秒）固定所有产物内的构建时间戳（页脚 stamp / feed updated / JSON-LD 日期 / sw.js VERSION / data manifest generated / sitemap·humans.txt 日期 / security.txt Expires）
- 纯函数单元测试骨架（Node 22 内置 `node:test`，零新依赖，21 项）：`slugify` / `extractTLDR` / `extractOutline` / `rewriteGuideLinks` / `inferTags` / `url()`（BASE 空与非空双场景，子进程隔离）
- `npm run test:unit` 脚本；`npm test` 改为 test:unit → build → check 全链路；CI（deploy.yml）在 Healthcheck 前新增 Unit tests 步骤

### Changed
- `site/scripts/build.mjs` 从 ~3900 行单文件拆为 `scripts/lib/` 下 11 个模块 + 338 行编排入口：
  - `lib/config.mjs`（路径常量 / BASE / url() / SITE_URL / BUILD_DATE）
  - `lib/assets.mjs`（fs 助手 / 静态资源与 vendor 复制 / sw.js VERSION 与 webmanifest 注入）
  - `lib/markdown.mjs`（marked renderer / slugify / TLDR·outline 提取 / 链接与图片路径重写）
  - `lib/content.mjs`（topics.json / notes frontmatter 扫描 / tag 推断 / guide 章节发现）
  - `lib/layout.mjs`（page / masthead / footer / related views / page hero）
  - `lib/views/{papers,guide,aggregates,learn,meta,seo}.mjs`（全部 build* 页面生成器与 SEO/data 产物）
- 拆分全程函数体逐字搬运，每步固定 `SOURCE_DATE_EPOCH` 构建与基线快照 `diff -r` 逐字节一致，`npm run check` 78 项（含 SITE_BASE 场景）保持通过
- 坏味道清偿（BACKLOG「1.1 拆分中记录的坏味道」逐条处置，行为不变项 dist 逐字节一致）：
  - era 排序比较器 8 处重复（7 个 view builder + build.mjs prev/next）抽为 `lib/content.mjs` 的 `eraComparator({pinTask, tiebreak})` 工厂，"细节出入"收敛为两个参数：是否 pin num≤13 置顶、同 era 内按 num/year 排
  - `issuePaperSlugs()` 从 `lib/views/learn.mjs` 导出，build.mjs 的 `paperIssues` 循环复用，删除重复的 `papers/<slug>/` 正则匹配；顺删 `masthead()` 未使用的 `allItems`
  - `discoverGuide()` 返回形状统一为 `{chapters: [], readmeRaw: ""}`，调用方不再靠 `guideData && guideData.chapters` 兜底
  - 页面级可变渲染状态（figure 编号 / heading id 去重表）收敛为 `lib/markdown.mjs` 单一入口 `resetPageState()`，替换 4 处散落的 clear/reset 调用

### Fixed
- `notes_count_estimate()` 更名 `countInlineImages()`（名字如实：数 About 页 inline webp 配图数），删除硬编码 590 兜底（目录缺失时返回 0）
- About 页过期文案："156 张静态页面" 去数字化、"build.mjs 单文件 ~2400 行" 改为如实描述模块化后的结构
- `VIEW_DESC` 硬编码计数（"60 个术语字典"、"37 个会议"）去数字化，内容增长不再漂移

## [1.0.0] - 2026-07-05

首个正式版。156 篇论文笔记全部达到 deep-read 标准，三条学习入口对齐，构建与质量门禁产品化。

### Added
- 30 天路径新增 Week 5（RF 感知 + 听觉智能 + 3D/世界模型收尾），全覆盖 13 篇任务论文，并在页首加三入口选择说明
- check.mjs 门禁扩至 78 项：站内死链全量扫描（256 个 HTML / 407 条链接，约 0.5s）、topics.json primer slug 存在性、progress.md 任务论文一致性、issue 页数一致性
- check.mjs 新增 deep-read 强制章节门禁（思考题 / 实验结果说明了什么 / 和本导读的关系 / 原文信息）
- check.mjs 新增性能预算门禁：首页 < 250KB、styles.css < 135KB、单张图片 < 600KB
- KaTeX 0.17.0 / D3 7.9.0 自托管到 `dist/vendor/`（含 KaTeX 字体），sw.js 对 `/vendor/` 走 cache-first，离线与国内访问可用
- Web 字体自托管：Inter / Playfair Display（variable）+ JetBrains Mono（400/500）经 Fontsource 打包进 `dist/vendor/fonts/`（latin subset），移除 rsms.me 与 Google Fonts CDN `@import`，同样被 sw.js `/vendor/` cache-first 覆盖
- CHANGELOG 与语义化版本流程

### Changed
- README 质量叙事与 156 篇全 deep-read 现状对齐（不再宣称三级质量分层）
- AUDIT / BACKLOG / IMPROVEMENTS / delivery-checklist 四份治理文档加历史状态横幅，防止与现状混淆；progress.md 同步 deep-read 批量升级后的真实进度
- SITE_URL 收敛为单一 env 可覆盖常量（含派生 SITE_ORIGIN）
- webmanifest 的 start_url / scope 随 SITE_BASE 构建期注入，本地与 fork 部署不再错位
- sitemap / feed / 404 / robots / llms.txt 等全站产物与 content/ 目录解耦
- 硬编码计数文案清理："4 期编辑总结"改为动态计数、llms.txt 英文计数插值化
- 13 篇任务论文 slug 清单（TASK_SLUGS）抽取为 `site/scripts/constants.mjs`，build.mjs 与 check.mjs 共用
- 压缩 5 张超标论文附图（如 anymal 1024KB → 356KB），全部纳入单图 600KB 预算

### Fixed
- llava / llava-1-5 双笔记互加系列说明，消除三入口读者混淆
- llava.md 补齐思考题 / 实验结果说明了什么 / 和本导读的关系 / 原文信息 4 节；10 篇笔记规范化或新写「实验结果说明了什么」（9 篇统一标题措辞、soundstream 新写）；3 篇补「原文信息」（3d-diffusion-policy 顺带修正 BibTeX 作者名）
- paper-stub 占位残留清理（rf-slam / nlos-mmwave）
- research-task.md 截止日期笔误（6/31 → 6/30）

### Known Issues
- build.mjs / theme.css 拆分与测试框架（Vitest/Playwright）引入推迟到 1.1（见 [PLAN-1.0.0.md](PLAN-1.0.0.md) 的「明确不做」）

## [0.1.0] - 2026-06
- 初始版本：156 篇笔记 + 22 章导读 + 11 主题 + 多视图站点，GitHub Pages 部署
