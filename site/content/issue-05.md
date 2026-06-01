---
title: "Issue Nº 05 — Routes through the field"
order: 104
intro: '第五期 · 14 个新工具 · 把站点变成入门到深入的完整路径'
issue_number: V
issue_date: 2026 · Late Spring
---

## 编辑前言

第四期上线了 18 个工具——快键、暗色、tag、graph、streak。读者可以更顺地走，但**该走哪条路**还是个问题。

第五期回答这个问题。这一期最重要的两件事都不是代码：

- **30 天学习路径**（[/learn/path/](/learn/path/)）—— 每天读什么、为什么这个顺序、怎么验证
- **新人 FAQ**（[/learn/faq/](/learn/faq/)）—— 12 题最常被问的"我能读吗 / 怎么读 / 卡住怎么办"

剩下 12 个是工具，让上面两条路走得更顺。

## 路径 · 你先来这里

### /learn/path/ · 30 天 30 篇

按"前一篇是后一篇前置"严格排序。Week 1 把 VLM 基座搞清楚，Week 2 看懂 VLA 进化，Week 3 模仿+扩散，Week 4 周边生态。每周末做"5 分钟讲给同学"验证。

### /learn/faq/ · 新人 12 题

涵盖三层：
- **关于这站**：是什么 / 谁做 / 内容靠谱吗 / 为什么不直接看英文
- **关于具身 AI**：定义 / VLM-VLA-LLM 关系 / 数学要求 / Python 要求
- **怎么读**：156 太多怎么办 / 顺序 / 单篇时长 / 卡住怎么办

读完 FAQ 你能回答自己 90% 的元问题。

### /lists/ · 5 套主题精选

如果不想走 30 天完整路径：每包 50-90 分钟读完，覆盖一个细分。VLA 入门 6 / Diffusion Policy 5 / 世界模型 4 / 射频感知 5 / 模仿学习硬件 4。

## 视图 · 跨主题看数据

### /eras/{founder,classic,frontier}/

按 era 维度独立 landing。看祖师爷一页就知道每个领域第一篇是哪本——CLIP、RT-1、Diffusion Policy、Habitat、World Models 全在这。

### /heatmap/ · 21×21 标签共现

矩阵显示哪些 tag 经常一起出现：transformer × VLA、3D × manipulation、imitation × VLA。也能看到"几乎不共现"的反例：RF × tactile、auditory × manipulation。

### /venues/ · 37 会议按类别

机器人会（CoRL/RSS/ICRA）、AI 大会（NeurIPS/ICLR/ICML）、视觉会、感知系统会（MobiCom/SIGCOMM）。横排条形看哪类会出哪类工作。

### /stats/ · 五维数据看板

总笔记数 / 字数 / 阅读时长 / 年份跨度，加 5 维度条形：年份 / era / 主题 / 难度 / 字数桶。

### Graph 三种布局切换

[/graph/](/graph/) 现在右上角能切：
- **Force**：默认水平簇 + 跨主题弱连
- **Cluster**：11 主题环形围圆
- **Timeline**：x = year / y = topic 行

## 个性化进阶

### 阅读包进度条

[/lists/](/lists/) 里你读完一篇，对应包的 olive→coral 渐变进度条立即更新。已读 item 编号变 olive 加 ✓。

### 已读清单导出 markdown

streak box 里点 ↓ 导出按钮，下一份按 topic 分组的 markdown 含读时戳。可以直接贴到自己的笔记本。

### 滚到底部自动标已读 + 撤销

读到论文页底部 ◼ 自动标记，olive toast 提示，5 秒自动消失，期间可以撤销。

### 阅读计时器

论文页右下角 mono 徽章："已读 0:32 / 18:00"。可见时计时（标签切走暂停），到达 readingTime 弹一次"⏱ 18 分钟到了"。

## 论文页加固

### Featured in Issue Nº X 徽章

31 篇论文被某 issue 引用过，论文页顶部显示 ink 反白 mustard italic 徽章。

### BibTeX 引用块 + 复制按钮

每篇页面底部折叠 `@misc{eai_<slug>_<year>, ...}` 块，一键复制。学术写作即用。

### Markdown 链接复制 ⧉ MD

reading-meta 行加按钮，复制 `[title](full url)` 到剪贴板。给 Obsidian/Notion/微信用。

### 图片 lightbox

inline scene/method 图、topic hero、首页 hero 全部点击放大。ESC 关闭。

## 站点配置

### favicon + webmanifest

浏览器 tab 上现在有暖纸底 + coral italic e + mustard 圆点 logo。webmanifest 让 PWA 安装可工作。

### /data/ 公开 JSON 端点

CC BY 4.0 协议，4 个 endpoint：
- `/data/papers.json` — 156 篇全元数据
- `/data/tags.json` — 21 tag 频次 + 共现矩阵
- `/data/topics.json` — 11 主题
- `/data/index.json` — manifest

外部研究者可以直接 fetch 做二次分析或喂 LLM。

### Related views 底部模块

非论文页底部加 3 个相关视图卡片，让用户在元数据视图之间游走。

## 工具表

| 类别 | 件数 | 入口 |
|---|---|---|
| 路径 | 3 | /learn/path/, /learn/faq/, /lists/ |
| 视图 | 5 | /eras/, /heatmap/, /venues/, /stats/, /graph/ 多布局 |
| 个性化 | 4 | 包进度条 / 导出 MD / 自动标已读 / 阅读计时器 |
| 论文页 | 4 | Issue 徽章 / BibTeX / MD copy / lightbox |
| 配置 | 3 | favicon / 数据 API / Related views |

## 编后语

第三期是给眼睛的。第四期是给手指的。第五期是给**问路的人**的——不知道从哪开始？看路径。读了一半卡住？看 FAQ。想看数据？/data/。想看可视化？三种布局任选。

下一期可能聚焦"机器人本体"——humanoid / 腿式 / 双臂这一年的所有论文，做一个"硬件视角看 VLA"的特辑。

---

*◼ End of Issue Nº V.*
