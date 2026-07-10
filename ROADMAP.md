# Roadmap — 项目未来方向

> 状态:现行方向文档,2026-07 制定。
> 本文回答一个问题:**这个项目接下来往哪走。**
> 各主线的具体执行以其引用的计划文档为准;完成状态以 [CHANGELOG.md](CHANGELOG.md) 为准。
> 里程碑只定义出口条件与依赖顺序,不做日历时间承诺。

---

## 北极星定位

**中文世界里,零基础读者从"读懂具身智能论文"走到"亲手跑通一个 VLA"的最短路径。**

- 已有的一半:22 章 Guide(教材主线)+ 156 篇 deep-read 笔记(参考文献库)+ 多维浏览视图 + 学习工具箱。
- 缺失的一半:动手实践线。[research-task.md](research-task.md) 的 Task 2(mujoco 复现 + VLA 微调部署)是这条线的天然起点——正如 Task 1 孕育了本站。
- 质量哲学不变:零术语假设、可验证的门禁、如实披露边界(AI 辅助整理、结构门禁、非逐页人工复核)。

## 现状快照(2026-07)

| 维度 | 状态 |
|------|------|
| 版本 | v1.1.0 已发布;v1.2 处于 RC 收口([docs/v1.2-healthcheck-roadmap.md](docs/v1.2-healthcheck-roadmap.md)),P0 基本落地,剩 owner 侧仓库保护与切版 |
| 内容 | 156 篇全部 deep-read 格式;正文债务已冻结待清偿:42 篇 Method 低于 1,500 字、110 篇仅远程来源 |
| 科研任务 | Task 1 完成(LLaVA 14 页 deck);Task 2(mujoco + SmolVLA)未开始 |
| 学习闭环 | 13 篇任务论文中 12 篇"笔记已就绪、等本人消化"([progress.md](progress.md)) |
| 工程 | 73 项单测 + 97 项健康检查;P1/P2 队列(EAI-T008–T020)已排序 |

## 方向总览

```
当前                v1.3                     v2.0
┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐
│ A: v1.2 RC   │───▶│ B: Lab 实践板块   │───▶│ C: 内容债务清偿完毕 │
│    收口发布   │    │    (Task 2 日志)  │    │    (任务篇+primer)  │
│              │───▶│ A: 工程 P1 批次   │───▶│ D: 新论文季度收录   │
└──────────────┘    │    (T008–T019)   │    │    成为常态         │
                    └──────────────────┘    └────────────────────┘
        D(学习闭环与时效性)贯穿全程:消化任务论文、按季收新论文
```

---

## 四条主线

### 主线 A · 发布与工程治理(近期)

先把已经做完的工作发出去,再按既有队列推进工程改进。**不新造工程任务**,一切以 [docs/v1.2-healthcheck-roadmap.md](docs/v1.2-healthcheck-roadmap.md) 为准:

1. **关闭 v1.2 RC**:owner 完成 required check 与 main branch protection(T014 剩余证据)→ 在最终 RC commit 上重跑全部验证(单测、健康检查、双 SITE_BASE、dist 确定性、浏览器回归)→ CHANGELOG 切版、版本文件同步 1.2.0、main 部署后打 annotated tag。
2. **P1 批次**(顺序即依赖):T008 provenance schema → T010 首页响应式图片 → T011 版本化数据 API → T013 Service Worker 缓存策略 → T016 CSP → T017/T018 可访问性(联合验收)→ T019 许可治理。
3. **P2**:T020 资产生成可复现。

原则:每批绑定不可变 commit;高风险改动后重跑相关门禁;不能用文档声明代替运行验证。

### 主线 B · 从读到做:Lab 实践板块(v1.3 主题)

把 [research-task.md](research-task.md) Task 2 的完整过程沉淀为站点新板块「Lab / 实践」,让站点定位从"22 章教程 + 156 篇笔记"升级为**"读 + 做"闭环**。这是增量最大的方向。

- **内容形态**:与笔记同风格的实践日志——零术语假设、每步有人话翻译、踩坑与报错如实记录。初步规划 5 篇:
  1. 环境搭建(MuJoCo + 依赖,含全部报错与解法)
  2. VLM_Grasp_Interactive 复现(Task 2 基础项)
  3. 数据采集(LeRobot 数据格式)
  4. SmolVLA 微调
  5. 部署回仿真 + 效果评估
- **工程形态**:复用 `site/content/` + learn 页构建管线(新增 lab 页面类型或 content 子目录),不引入新框架、不加新依赖大件;[实战教程页](site/content/tutorials.md)第 2 档(SmolVLA / LeRobot)与 Lab 板块互链。
- **与科研任务对齐**:Task 2 截止"按考试时间综合定",Lab 板块是其副产物;先跑通、后成文,不为发布而编造未验证的步骤。

### 主线 C · 内容可信度清偿(长期滚动)

v1.2 冻结的正文债务(42 篇 Method 低于 1,500 字、120 篇低于旧宣传占比、110 篇仅远程来源)按篇滚动清偿,**以核验代替字数**:

- **地基**:EAI-T008 的 provenance schema——笔记、来源、生成资产与人工复核状态全部字段化、可验证。
- **工作流**:逐篇回原文核验(校事实、数字、结论)→ 核验一篇在 provenance 登记一篇 → 需要补写才补写。
- **优先级**:13 篇任务论文 → 33 篇 primer → 其余按主题滚动。
- **来源补齐**:110 篇仅远程来源的论文逐步补本地解析文本(`papers/<slug>/paper.md` + SHA-256 入 `papers/provenance.json`)。
- **红线**:债务数字是待办记录不是 KPI,不为凑占比盲目扩写;未核验的笔记维持现有"AI 辅助整理、应回原文核验"的公开边界。

### 主线 D · 学习闭环与时效性(贯穿)

站点为学习服务,学习进度本身是路线图的一部分:

- **本人消化**:[progress.md](progress.md) 中 12 篇待消化任务论文按 Guide Task 1 路径(Ch01 → Ch03 → Ch04 → Ch08 → Ch09 → Ch10 → Ch12 → Ch22)推进,每消化一篇勾选一篇;主线 B 的动手实践反过来检验读的效果。
- **新论文收录节奏**:每季一期 Issue(`site/content/issue-*.md` 基础设施已有 8 期),每期收 3–5 篇当年新工作;收录标准:与 11 主题相关、有公开原文、能过 [AGENT-DEEPREAD.md](AGENT-DEEPREAD.md) 质量门槛。防止 156 篇静止老化,但**不为扩量而扩量**。

---

## 版本里程碑

| 版本 | 主题 | 出口条件(全部满足才算到站) |
|------|------|------------------------------|
| v1.2.0 | 可信度与安全收口 | RC 阻断项关闭;最终 RC commit 重跑全部门禁;CHANGELOG 切版 + annotated tag(细则见 [docs/v1.2-healthcheck-roadmap.md](docs/v1.2-healthcheck-roadmap.md) 第 6 节) |
| v1.3.0 | 从读到做 | Lab 板块上线且首批 ≥3 篇实践日志过门禁(环境搭建 + 复现 + 至少一篇微调/数据);工程 P1 批次(T008–T019)全部关闭 |
| v2.0.0 | 读 + 做闭环 | Task 2 全流程覆盖(复现 → 微调 → 部署);13 篇任务论文 + 33 篇 primer 逐篇核验并登记 provenance;progress.md 13 篇全部勾选 |

## 明确不做

延续本项目"显式边界"的一贯做法:

| 项 | 理由 |
|----|------|
| 迁移站点框架(Astro / Starlight / mkdocs 等) | 无框架静态构建 + 自有门禁已满足需求;迁移是重写不是演进 |
| 后端 / 评论系统 / 账号体系 | 个性化全部走前端 localStorage;纯静态是安全边界与可维护性的地基 |
| 为扩量而扩量 | 新论文只按主线 D 的季度节奏收录,数量不是目标 |
| 盲目重写 156 篇既有正文 | 正文改动必须以逐篇回原文核验为前提(主线 C 红线) |
| 日历时间承诺 | 里程碑只定义出口条件与依赖顺序 |

## 文档地图

| 类别 | 文档 |
|------|------|
| 方向(本文) | ROADMAP.md |
| 完成记录(唯一权威) | [CHANGELOG.md](CHANGELOG.md) |
| 推进执行计划(现行) | [PLAN-1.3.md](PLAN-1.3.md)(本文的执行层:批次 0–9,出口 = v1.3.0) |
| 工程执行计划 | [docs/v1.2-healthcheck-roadmap.md](docs/v1.2-healthcheck-roadmap.md)(v1.2 RC,现行);[PLAN-1.0.0.md](PLAN-1.0.0.md)、[PLAN-1.1.md](PLAN-1.1.md)(已完成) |
| 科研任务与进度 | [research-task.md](research-task.md)、[progress.md](progress.md) |
| 内容工作流 | [AGENT-DEEPREAD.md](AGENT-DEEPREAD.md)(精读标准)、[DEEPREAD-BATCH.md](DEEPREAD-BATCH.md)(批量升级记录) |
| 历史存档 | [AUDIT.md](AUDIT.md)、[BACKLOG.md](BACKLOG.md)、[IMPROVEMENTS.md](IMPROVEMENTS.md)、[TRANSFORMATION.md](TRANSFORMATION.md)、[delivery-checklist.md](delivery-checklist.md) |

**本文的维护方式**:每次发版(CHANGELOG 切版)时回看本文;主线状态变化直接改本文,并在 CHANGELOG 记一行。
