---
title: "OBELICS"
slug: obelics
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2306.16527"
venue: NeurIPS
year: 2023
era: classic
num: 134
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

HuggingFace 团队从 Common Crawl 抓取并清洗出 **1.41 亿网页 / 3.53 亿图片**的交错图文（interleaved image-text）开源语料 OBELICS，专门用来训练 Flamingo 那一类"图文混排"的视觉语言模型（Vision-Language Model, VLM），并基于它训出开源复现 IDEFICS。这是当时第一个真正大规模、可下载、带交错结构的图文数据集。

## 这是个什么场景 — 日常类比

想象你要教一个外国小孩看懂中文图文教材。市面上现成的教材有两种：

- **图配单句标注**：一张图配一句"这是苹果"——这是 LAION/COCO 这类 image-caption 数据集
- **图文交织的真书**：一篇游记里穿插了 5 张照片，每张照片前后都有上下文叙述——这才是人类真正的阅读场景

DeepMind 的 Flamingo 证明用第二种"图文交织"教材训练出来的模型 in-context learning 能力强很多——你给它看几个例子，它就会学着照做。但 Flamingo 的训练语料 M3W 是闭源的，外面人想复现根本没数据。OBELICS 就是把这个"教材"公开搬出来。

## 之前的人怎么做的 — 3-5 bullet

- **LAION-5B / COCO / CC3M**：图 + 单句 caption，规模够大但缺上下文，模型学不会"看图读长文"
- **Flamingo (DeepMind, 2022)**：用闭源 M3W 数据集（4300 万网页）证明了交错图文训练的威力，但数据和模型都不放出
- **MMC4 (Multimodal C4)**：早一点的开源尝试，但不是从 HTML DOM 树原生抽取，而是把 caption "贴回"到 C4 文本里，图文对齐质量较低
- **WIT / Wikipedia-based 数据集**：质量高但规模小，且领域偏百科
- 整体困境：开源社区想复现 Flamingo 的"few-shot 多模态"能力，但卡在数据上

## 这篇论文的关键想法

**核心点**：交错图文的"结构"本身就是宝贵信号——一段文字、一张图、再一段文字、再一张图，这种顺序里隐含了图和文的指代关系。所以**抽取时必须保留 HTML 文档的原生顺序**，而不是把图文分开再拼回去。

具体策略：

1. **从 Common Crawl 出发**而不是从图床/图库出发——保证语料分布贴近"真实网页"
2. **保留 DOM 顺序**：网页 → 简化 DOM 树 → 按出现顺序输出 `[文本, 图, 文本, 图, ...]` 序列
3. **大规模过滤**：色情 / 低质 / 重复 / 文本太短 / 图太小 / 图文比例失衡的全部丢
4. **完全开源**：数据集、过滤代码、训练代码、训出来的 IDEFICS 模型权重一起放

## 它怎么做的（方法）— 3-4 段

**第一步：原始抓取**。从 Common Crawl 的 25 个 dump 出发，初始网页数量在百亿级（具体数字需读原文）。先做 URL 去重、英文过滤、HTML 解析，得到带图的网页池。

**第二步：DOM 简化与序列化**。这是 OBELICS 最有特色的环节。把 HTML 解析成树，只保留对图文阅读真正有意义的节点（段落、图、标题、列表），剔除导航栏、广告、脚本、样式、侧边栏。然后按 DOM 中出现的物理顺序，把保留下来的节点拍平成 `[text_block_1, img_1, text_block_2, img_2, ...]` 这样的线性序列。这样模型训练时直接吃这个序列，自然学到"图前面的文是介绍，图后面的文是延伸"。

**第三步：多级过滤**。文档级（语言、字符数、句子完整性）、段落级（重复、广告标记）、图像级（分辨率、长宽比、NSFW、logo 检测）、文档-图配对级（图文是否相关、有没有空 alt）。论文里报告了每一级过滤后的剩余比例（具体数字需读原文）。

**第四步：去重**。基于 MinHash + LSH 做近似去重，避免同一篇博客被多个站点转载导致训练时重复看。最终得到 **1.41 亿文档、3.53 亿图、约 1150 亿 token**（量级数字依摘要，精确值需读原文）。然后基于此训练 IDEFICS-9B / 80B，作为 Flamingo 的开源复现。

## 实验在做什么

- **数据统计对比**：OBELICS vs MMC4 vs LAION 在文档长度、每文档图数、图分辨率、文本质量分上的分布对比
- **训练 IDEFICS**：基于 LLaMA-1 + 视觉 encoder + Flamingo-style 交叉注意力（cross-attention），在 OBELICS 上训练 9B / 80B 两个规模
- **下游 benchmark**：VQA、image captioning、visual dialogue 等多模态任务的 zero-shot / few-shot 评测，对比闭源 Flamingo 同规模版本
- **消融**：用 LAION-only 训 vs 用 OBELICS-only 训 vs 混训，看交错语料对 in-context learning 能力的边际贡献
- **结论方向**：在等量训练 token 下，交错语料显著提升 few-shot 表现；这印证了 Flamingo 论文的论断，并证明可在开源数据上复现（具体提升幅度需读原文）

## 你应该懂的几个新词 — 4-6 个

- **interleaved image-text（交错图文）**：图和文按真实出现顺序混排成一个序列，区别于"图—单句 caption"对
- **Common Crawl**：一个非营利组织，每月抓一遍互联网公开网页存档供研究用——OBELICS 的原料
- **DOM (Document Object Model)**：浏览器解析 HTML 后的树结构，节点是元素（div / img / p）
- **MinHash + LSH**：一对工具，前者把文档变成短指纹，后者快速找相似指纹——一起做"近似去重"
- **in-context learning**：大模型不更新参数，只在 prompt 里看几个例子就能学会做任务的能力——Flamingo 强调的核心多模态能力
- **IDEFICS**：HuggingFace 基于 OBELICS 训练的开源 Flamingo 复现模型，9B / 80B 两个规模

## 它和其他论文什么关系

- **直接对标**：DeepMind Flamingo (2022)——OBELICS 是它的开源数据 + 模型复现
- **承接**：MMC4——同样想做开源交错图文，但 OBELICS 在原生 DOM 抽取这点上更干净
- **对比**：LAION-5B——纯 image-caption，规模大但缺交错结构，互补而非替代
- **后继**：Idefics2 (2024) / Idefics3 / 一系列开源 VLM 都把 OBELICS 列为训练语料的核心组件之一
- **生态影响**：和 The Stack（代码）、RedPajama（文本）一起，构成 2023 年"开源大模型基础语料"三件套的多模态那一块

## 我建议这样读 — 3-4 步

1. **先读 Flamingo 论文 §3 数据部分**：理解为什么需要交错图文，"M3W" 长什么样——OBELICS 的所有动机都从这里来
2. **读 OBELICS 论文 §3 数据 pipeline 流程图**：重点看 DOM 简化和过滤级联两步，这是技术贡献核心
3. **跳过实验细节，直接看 §5 消融表**：看"OBELICS only" vs "LAION only" vs "mix" 在 few-shot benchmark 上的差距，这是结论
4. **附加**：去 HuggingFace `HuggingFaceM4/OBELICS` 数据卡片浏览几个真实样例，比读 100 行描述都直观

## 为什么值得读

- **历史地位**：是 2023 年开源多模态社区的转折点之一，没有 OBELICS 就没有 IDEFICS、没有后续一系列开源 VLM 的快速迭代
- **方法朴素但有效**：通篇没有什么花哨技术，就是"老老实实从 Common Crawl 清数据"，但执行得彻底——这种"工程为王"的论文对从业者价值很大
- **对你（具身 / VLM 路线）的意义**：理解视觉语言模型的训练语料长什么样、过滤逻辑怎么写，是评估任何 VLM 能力上限的基础——模型能做什么，归根结底取决于它见过什么
- **可复现性范本**：数据 + 代码 + 模型全开源，是开源社区"复现闭源工作"的标杆案例，方法论可迁移到任何"想开源 X" 的项目上
