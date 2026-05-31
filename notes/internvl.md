---
title: "InternVL: Scaling up Vision Foundation Models and Aligning for Generic Visual-Linguistic Tasks"
slug: internvl
topic: vlm-foundation
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2312.14238"
venue: CVPR
year: 2024
era: classic
num: 132
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

让"看图的脑子"也长到 6B 参数，和"会说话的脑子"一样大，AI 看图说话才不偏科，而且开源就能用。

## 这是个什么场景

你拍一张照发给朋友，让他帮你描述里面发生了什么。如果朋友只看了一眼草草说"有只动物在跑"，那你大概会很失望——你想要的是"一只金毛在沙滩上追飞盘，背景有个穿红衣服的小孩在笑"这种细节。

现在的"看图说话 AI"就常常出现前一种翻车情况。原因是它由两个人合作完成：

- 一个**会说话的资深员工**（大语言模型 LLM，几十亿到上千亿参数），见识广、词汇丰富
- 一个**会看的实习生**（视觉编码器 vision encoder，常见才 0.3B 参数），眼力凑合但脑容量太小

让一个见识差几个量级的实习生给资深员工做汇报，他看到的细节根本组织不成对方听得懂的话，中间还得另请一个"翻译"（adapter / Q-Former 之类）勉强对接。

InternVL 想做的事情是：**把实习生直接送去读博**，把视觉编码器也扩到 6B 参数，让它和 LLM 量级对等。这样两人对话才能从"看到一只动物"升级到"金毛、沙滩、飞盘、红衣小孩"这种级别，而且不用每次都现搭翻译桥。

## 之前的人怎么做的 — 3-5 bullet

- **CLIP 路线（OpenAI 2021）**：图文对比学习，把图像和文本压到同一空间。视觉塔通常 ~300M-1B，OpenAI 后续训了 CLIP-G（~2B）但**不开源**。
- **EVA-CLIP / OpenCLIP 路线**：开源社区扩大 CLIP，能到 ~1-2B 量级，但和 OpenAI 私有版还有差距。
- **BLIP-2 / Flamingo / LLaVA 路线**：视觉骨干不动（用现成的 CLIP-ViT），靠中间一个轻量的"桥"（Q-Former、cross-attention、MLP projector）把视觉特征塞给 LLM。**视觉端没扩展**。
- **结果**：开源圈视觉编码器卡在 1B 左右；多模态大模型的"视觉脑容量"远小于"语言脑容量"，细粒度感知任务上限被压住。
- **痛点**：私有 CLIP-G 在 zero-shot 分类、检索等基础视觉任务上始终领先，开源没有同档对手。

## 这篇论文的关键想法

一句话："**把眼睛练得和嘴巴一样大，再让眼睛学会嘴巴的说话方式**"。

1. **视觉端纵向扩展**：像把"实习生送去读博"一样，把视觉编码器从常见的 0.3B 直接训到 6B 参数（InternViT-6B），和小型 LLM 同档。
2. **对齐语言空间**：好比让眼睛跟着嘴巴学说话——不仅做传统的图文对比，还引入一个 LLM 风格的文本模型当"陪练"，让视觉特征学到的表达和 LLM 内部用的词汇（token embedding）兼容，下游接 LLM 时不用复杂桥接。
3. **渐进式训练**：像从小学到研究生的培养路径，先做大规模图文对比学习（contrastive，看图配字），再做图文生成（generative，看图写句子），最后指令微调（学会按人话回答）。

收益是：同一个 InternViT-6B，在三类任务上都能打——纯视觉感知（分类/检测/分割）、视觉-语言对比（zero-shot 检索）、视觉-语言生成（多模态对话）。**一个骨干通吃**，不再为每类任务各训一个。

## 它怎么做的（方法）— 3-4 段

**视觉骨干 InternViT-6B**：好比把厨师从"只会颠勺"练到"米其林主厨"——标准 ViT 架构（vision transformer，把图像切成小方块当词来处理）不变，但深度和宽度大幅扩展到 6B 参数量，刚好和 7B 级 LLM 配对。具体层数、hidden dim、patch size 这些超参要查原文。

等等，先慢一拍 — **QLLaMA 是什么？** 想象你想让眼睛学会嘴巴的说话方式，但完整的 LLM 太大太贵，于是论文做了一个"陪练版的 LLaMA"，可以理解为压缩版的语言模型。它在训练阶段提供 LLM 风格的语言侧表征，让视觉塔学到的特征不是冲着传统 CLIP 文本空间去的，而是冲着 LLM 兼容空间去的。下游真正接到完整 LLM 时，对接就顺滑得多。

**三阶段训练**：像学生从小学到研究生：
- 阶段 1（对比预训练）：好比抄作业对答案，超大规模图文对，InternViT + QLLaMA 做对比学习（contrastive），类似 CLIP 但语言侧更接近 LLM。
- 阶段 2（生成预训练）：好比看图写作文，把 InternViT 接到真正的 LLM（如 Vicuna），训练 captioning、VQA 等生成任务。
- 阶段 3（指令微调）：好比模拟面试，用多模态指令数据让模型学会按人话回答问题。

**多任务通用性**：训完之后这一个骨干可以三种姿态共用同一份权重：(a) 单独当视觉编码器接分类/检测头；(b) 配 QLLaMA 做 zero-shot 图文检索；(c) 配 LLM 做多模态对话。

## 实验在做什么

论文跨多个 benchmark 横扫，主要四类：

- **视觉感知**：ImageNet 分类、各类检测分割任务，对标 EVA、SAM 等纯视觉骨干。
- **图文对比**：zero-shot 分类、图文检索（COCO、Flickr30K），对标 CLIP / OpenCLIP / EVA-CLIP，目标是追平 OpenAI 私有 CLIP-G。
- **多模态对话**：VQA、MME、各类 VLM benchmark，对标 LLaVA、QwenVL、BLIP-2 等。
- **消融**：模型规模、训练阶段、数据规模的影响。

具体数字（top-1 acc、retrieval R@1 等）需读原文表格，**这里不编造**。结论层面：InternViT-6B 在多个任务上达到或超过同期最强开源模型，并在部分对比任务上接近 OpenAI CLIP-G。

## 你应该懂的几个新词 — 4-6 个

- **Vision Foundation Model（视觉基础模型）**：像 LLM 之于文本那样，用一个大规模预训练视觉骨干通吃下游任务，不是为每个任务各训一个。
- **CLIP-G**：OpenAI 训练的更大版 CLIP（约 2B 参数视觉端），效果强但**未公开权重**，是开源社区长期追赶目标。
- **ViT (Vision Transformer)**：把图像切成 patch 当 token 用 Transformer 处理的视觉架构，CLIP/SAM/DINO 都用它。
- **Contrastive learning（对比学习）**：让配对的图文 embedding 拉近、不配对的拉远。CLIP 的训练核心。
- **Generative pretraining（生成式预训练）**：让模型生成 caption / 回答，目标是 next-token prediction，比对比学习多了"会说话"的能力。
- **QLLaMA**：本文设计的中间件，可以理解为 "Q-Former 思想 + LLaMA 架构" 的混合，用来在对比阶段提供 LLM 兼容的语言侧表征。

## 它和其他论文什么关系

- **延续 CLIP（Radford et al. 2021）**：图文对比的核心框架没变，但视觉端扩了一个数量级，语言端换成 LLM 风格。
- **挑战 BLIP-2（Li et al. 2023）**：BLIP-2 选择"冻结视觉塔 + 训轻量桥"，InternVL 反过来"扩视觉塔、简化桥"。代表两种路线之争。
- **承接 EVA-CLIP（Sun et al. 2023）**：EVA 把开源 CLIP 推到 1-2B，InternVL 推到 6B，规模上的下一站。
- **配合 LLaVA（Liu et al. 2023）**：LLaVA 系列是多模态对话的代表，但视觉端用现成 CLIP-ViT-L/G。InternVL 提供了一个更强的视觉端可以替换进 LLaVA 风格的栈里。
- **后续影响**：InternVL2/2.5/3 是这条线的演进，把模型规模、数据、训练流程继续推。后续多模态模型很多直接用 InternViT 做视觉端。

## 我建议这样读 — 3-4 步

1. **先看 Figure 1 + Table 1**：理解模型整体架构（三阶段、三个组件）和它在主要 benchmark 上的位置。如果只关心结论，看完这两个图基本够了。
2. **重点读 Method 第 3 节**：QLLaMA 的设计和三阶段训练流程。这是和已有工作最大的区别，搞清楚"为什么不是直接扩 CLIP"。
3. **对比读 EVA-CLIP 和 BLIP-2**：把 InternVL 放到这两条路线之间看，能更清楚它的取舍——比 EVA-CLIP 多了语言对齐，比 BLIP-2 多了视觉规模。
4. **跳读 Experiments**：除非你做特定任务（检索/分类/VQA），否则只看汇总表和消融，别陷在每个 benchmark 的细节里。

## 为什么值得读

- **开源 vs 私有的转折点**：InternVL 是开源视觉基础模型第一次在多任务上能正面叫板 OpenAI CLIP-G，对整个开源 VLM 生态意义重大。
- **方法论参考**：如果你想训一个比"接现成 CLIP"更深度的多模态模型，InternVL 的三阶段流程和视觉端扩展思路是当前最完整的开源参考。
- **后续生态入口**：InternVL2/2.5/3、InternVL-Chat 一系列工作都从这里出发，想跟进国产开源 VLM 必须看的起点。
- **对 Embodied AI 的关联**：具身智能（embodied AI）需要强视觉感知 + 语言指令理解，InternVL 这种"视觉端不弱化"的路线对机器人/驾驶等需要细粒度感知的下游更友好。
