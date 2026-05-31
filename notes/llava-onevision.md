---
title: "LLaVA-OneVision: Easy Visual Task Transfer"
slug: llava-onevision
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2408.03326"
venue: arXiv
year: 2024
era: frontier
num: 141
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

LLaVA-OneVision 用一套统一的数据配方和模型架构，让一个开源 VLM（Visual-Language Model，视觉-语言模型）同时在三种场景下工作：单张图、多张图、视频。它的卖点不是新结构，而是"一份数据食谱喂出全场景能力"，并首次让开源模型在视频理解上逼近 GPT-4V 这类闭源选手。

## 这是个什么场景 — 日常类比

想象你培训一个新员工做"看图说话"。以前的做法是分三个班：
- A 班只看一张照片回答问题
- B 班看几张照片做对比（比如"找不同"）
- C 班看一段监控录像描述发生了什么

每个班的教材、师资、毕业证都不一样。员工在 A 班再厉害，到 C 班还是从零开始。LLaVA-OneVision 干的事，就是把三本教材合成一本，让一个员工读完后三个场合都能上手——而且彼此之间还能互相借力（看多张图练出来的"对比能力"，会让他看视频时更敏感）。

## 之前的人怎么做的 — 3-5 bullet

- LLaVA-1.5 / LLaVA-NeXT 系列主打单图理解，多图和视频是后来零散打补丁加上的
- 视频 VLM 通常是另起炉灶（VideoChat、Video-LLaVA 等），数据和单图模型不互通
- 多图对比任务（mantis 等）被当成第三类小赛道，规模小，数据稀缺
- 闭源模型（GPT-4V、Gemini）天生就在三场景统一训练，但权重和数据都拿不到
- 开源社区缺的不是模型结构，是"覆盖三场景的高质量数据集 + 训练阶段切分"

## 这篇论文的关键想法

核心赌注：**视觉任务之间的迁移是可行的**——只要数据配比对了，单图训练学到的能力可以"涌现"到多图和视频上，不需要为视频单独造一个架构。

具体说：
- 把训练拆成多个阶段（语言-图像对齐 → 高质量知识灌输 → 视觉指令微调），每阶段数据成分都是精心配比
- 视频不是 cold start，而是建立在"已经会看单图和多图"的模型之上，数据量可以小但质量高
- 用 SigLIP 当视觉编码器、Qwen-2 当语言塔，结构本身保守，所有 novelty 都压在数据上

## 它怎么做的（方法）— 3-4 段

**架构（最朴素的部分）**：视觉编码器（SigLIP）+ 简单 projector + LLM（Qwen-2）。和 LLaVA 系列一脉相承，没有引入复杂的跨模态 attention 或 Q-Former。作者刻意保持简单，就是为了证明"配方"才是关键。

**Higher AnyRes（动态分辨率）**：单图、多图、视频都被统一编码成"一组 visual token"。一张高分辨率图被切成多个 sub-image，多张图各自编码后拼接，视频则是采样若干帧再编码。三种场景在 LLM 看来都是"一串视觉 token + 文字"，没有本质区别——这是统一的关键技巧。

**训练数据配方**：分多阶段。早期阶段用大规模图文对做对齐；中期用高质量知识密集型数据（OCR、图表、文档）做"知识灌输"；最后阶段才上单图/多图/视频混合的指令微调（具体配比和数据集列表需读原文）。视频数据相对少，靠前两阶段打底。

**任务迁移的实证**：作者声称在不少视频 benchmark 上，模型从未或很少见过该领域视频也能表现不错——这就是"任务迁移"的证据。他们把这归功于多图阶段培养的"跨帧/跨画面对比"能力。

## 实验在做什么

- 在大量单图 benchmark（MMBench、MMMU、MathVista、DocVQA 等）上对比 LLaVA-NeXT、InternVL、Qwen-VL 等开源模型
- 在多图 benchmark（Mantis-Eval、BLINK 等）上验证多图能力不是"白送"
- 在视频 benchmark（VideoMME、MVBench、EgoSchema 等）上对比视频专用模型，并和 GPT-4V 这类闭源做参考
- 做 ablation 看数据配比、训练阶段顺序的影响（具体 ablation 设计需读原文）
- 模型规模做了 0.5B / 7B / 72B 三档，验证 scaling

## 你应该懂的几个新词 — 4-6 个

- **VLM（Visual-Language Model）**：能同时处理图像和文字的模型，输入图、输出字
- **AnyRes / Higher AnyRes**：动态分辨率方案，把任意尺寸的图切成固定大小的 patch 再喂给视觉编码器，避免暴力 resize 丢信息
- **SigLIP**：Google 提的图文对齐模型，比 CLIP 用 sigmoid loss 替代 softmax，训练更稳；这里当视觉特征提取器
- **Visual Instruction Tuning**：用"看图回答"格式的数据对 VLM 做监督微调，是 LLaVA 系列的招牌动作
- **Task Transfer（任务迁移）**：在 A 任务训练，模型在没专门训练的 B 任务上也表现不错；本文的核心宣称
- **Visual Token**：图像被切片+编码后变成的一串向量，长得像 word embedding，LLM 可以无差别处理

## 它和其他论文什么关系

- **直接前作**：[LLaVA](./llava.md)、[LLaVA-1.5](./llava-1-5.md)、LLaVA-NeXT——架构传承几乎一比一，OneVision 是数据维度的扩展
- **同期开源对手**：[InternVL-2.5](./internvl-2-5.md)、[Qwen-VL](./qwen-vl.md)、[DeepSeek-VL](./deepseek-vl.md)、[Pixtral-12B](./pixtral-12b.md) 走的是相似路线（统一架构 + 大量数据），但各家配方不同
- **视觉编码器**：用 [SigLIP](./siglip.md) 作为前端，和 [CLIP](./clip.md) / [EVA-CLIP](./eva-clip.md) 系是一支
- **视频路线对照**：和 Video-LLaVA、VideoChat 这种"专攻视频"的方案构成对比，OneVision 主张视频不需要专门架构
- **embodied 关联**：对 [OpenVLA](./openvla.md)、[RT-2](./rt-2.md) 这类机器人 VLA 很重要——VLA 的视觉塔就是 VLM，OneVision 这种"全场景统一"的预训练塔可以直接搬过来

## 我建议这样读 — 3-4 步

1. 先看 abstract + Figure 1（数据配方总览图）+ 主表，搞清楚"统一三场景"具体指什么、收益多大
2. 跳到方法节看训练阶段切分和数据混合比例，这是真正的贡献，结构部分可以快速扫
3. 看 ablation：哪个阶段最关键？多图数据加进来后视频涨了多少？这是判断方法可信度的地方
4. 想做下游应用（embodied / agent）的话，关注 7B 档的指标是否够用，72B 部署成本太高

## 为什么值得读

- 它代表 2024 年开源 VLM 的一个重要拐点：**结构稳定下来，竞争转向数据工程**
- 对做 embodied AI 的人，这是目前比较省事的"通用视觉塔"候选之一——单图/多图/视频都能接，不用换骨干
- 它把"任务迁移"从口号变成可量化的实验，告诉你哪些场景迁移有效、哪些靠不住
- 数据配方虽然没有完全开源所有数据，但训练 recipe 写得相对清楚，是想自己复刻 VLM 训练的人的好教材
- 读完后再回头看 LLaVA-1.5 / Qwen-VL，会更清楚"VLM 这两年到底进步在哪"——大部分 delta 不在网络结构上
