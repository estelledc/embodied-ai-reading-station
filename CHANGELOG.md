# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与语义化版本。

## [Unreleased]

### Added
- `EAI13-T001`：冻结 provenance v2 与 `/data/v2/` 共用合同，新增纯 schema validator、字段字典和 local/remote/人工核验/生成资产正反 fixtures；明确 `content_commit` 指向可复核的既有内容输入快照，可早于 manifest commit，从而避免 Git SHA 自引用。生产 `papers/provenance.json` 与 legacy `/data/papers.json` 本批保持不变。
- `EAI13-T002`：将 `papers/provenance.json` 确定性迁移为覆盖 156 篇笔记的 v2 清单（46 local / 110 remote），无损保留 v1 本地来源哈希，统一 canonical note 元数据、显式 null 与 `UNVERIFIED` 初态；生成器改为内存校验后同目录临时文件 `fsync` + 原子 `rename`，新增零写入 `--check` 与 v2 healthcheck 兼容桥。
- `EAI13-T003`：新增独立于 generator 的 fail-closed repository validator，并在任何笔记加载前接入 `npm run check`；同时校验 exact schema、156 条 inventory、frontmatter/source 一致性、逐段 symlink/普通文件/跟踪状态、worktree/index/HEAD/manifest/`content_commit` snapshot 字节，以及脱敏的稳定错误码。

## [1.2.0] - 2026-07-10

内容可信度与安全收口。P0 全局体检修复落地；方向与执行文档齐备。**O1 仓库保护（T014 剩余证据）由 owner 决定延后**，不声称 T014 已关闭。

### Added
- 新增 [ROADMAP.md](ROADMAP.md)：定下项目未来方向——v1.2 发布收口 → v1.3「从读到做」Lab 实践板块 → v2.0 读+做闭环，四条主线（发布与工程治理 / Lab 实践 / 内容可信度清偿 / 学习闭环与时效性）与明确不做清单；README 头部增加入口。
- 新增 [PLAN-1.3.md](PLAN-1.3.md)：ROADMAP 的执行层——批次 0（v1.2 发布收口，owner/agent 分工）→ 批次 1–7（工程 P1 队列 T008–T019 编排）→ 批次 8（Lab 板块脚手架）→ 批次 9（llava 核验试点），含依赖原则、PR/门禁约定与本计划范围的明确不做。
- 新增 [docs/batch-0-v1.2-release.md](docs/batch-0-v1.2-release.md)：批次 0 发布手册——阶段 A–E（前置合并 PR #10、owner 仓库保护 O1、最终验证命令与浏览器手测清单、切版文件表、annotated tag），含证据栏与完成闸。
- `EAI-T003`：新增学习路径、Guide/topic 覆盖、公开质量声明、来源完整性和移动端导航契约测试。
- `EAI-T009`：新增可重复生成的 `papers/provenance.json`，记录 46 份本地解析文本的 SHA-256。
- `EAI-T014`：新增 Pull Request 专用 CI；只运行测试、根路径/仓库子路径构建检查与 high-level audit，不部署 Pages；README 增加 protected-main owner checklist。
- `EAI-T022`：首页新增版本化 JSON 进度备份、导入、分区/全量重置与“撤销最近导入”。

### Changed
- `EAI-T001` / `EAI-T002`：学习路径统一为“30 天核心（25 篇论文 + 5 个复习/输出日）+ Day 31–35 可选任务扩展”；核心路径与 Guide 使用独立完成度，扩展不计入 30 天核心进度。
- `EAI-T007`：`deep-read` 改为可验证的长篇结构化格式说明，移除未被门禁支持的统一 Method 占比和“全部人工精读”承诺；README、About、llms.txt 统一 AI 辅助/结构门禁/非逐页人工复核边界，治理路线图冻结既有正文债务计数；论文笔记正文保持不变。
- `EAI-T009`：本地来源改为实际跟踪的 `paper.md`，并以 `papers/provenance.json` 固定 SHA-256。
- `EAI-T012`：CI 从 checkout commit 注入确定性构建时间；生成时间、笔记生命周期和原论文年份使用不同字段，不再用部署时间冒充发布日期；首页最近提交改用稳定 commit 日期，避免相同输入因墙上时钟产生不同 HTML。
- `EAI-T015`：GitHub Actions 固定到完整 commit SHA，并把 Pages/OIDC 权限缩小到 deploy job。

### Fixed
- `EAI-T004`：旧版混合 syllabus 状态一次性迁移为互不覆盖的路径和 Guide 命名空间，损坏 JSON 会先备份再恢复安全默认值。
- `EAI-T006`：阅读清单 Markdown 导出不再重复拼接 `SITE_URL` / `SITE_BASE`。
- `EAI-T022`：拒绝空或未知导入；导入先完整校验并自动备份，部分输入只更新显式 surface，任一存储写入失败会事务回滚。
- 修复 320px 窄屏下关闭的 More 面板与导航 max-content 宽度造成的全页横向溢出。

### Security
- `EAI-T005`：搜索历史与 link preview 改用 DOM API / `textContent`，查询长度与控制字符受限，用户输入不再进入 HTML sink。
- `EAI-T021`：Markdown 链接和图片启用协议 allowlist，统一转义 URL、title、alt 和 caption，并锁定唯一获准的原始 iframe。

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
