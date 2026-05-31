---
title: "Long-CLIP: Unlocking the Long-Text Capability of CLIP"
slug: long-clip
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2403.15378"
venue: ECCV
year: 2024
era: frontier
num: 142
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

Long-CLIP 用两个小手术（位置编码插值 KPS + 首要分量匹配 PCM）把 CLIP 的文本输入上限从 77 token 扩到 248 token，同时保持原有零样本能力，长描述检索效果显著提升。

## 这是个什么场景 — 日常类比

把 CLIP 想象成一个看图说话的双胞胎兄弟：哥哥负责看图，弟弟负责读文字，两人从小被训练得一看到对应的图文就同时点头。

但弟弟有个怪癖——他只能读最多 77 个字的纸条（CLIP 文本编码器的最大长度）。一旦你给他长篇大论，比如一段两百字的细节描写，他要么截断，要么读得很糟。

而现实世界里，无论是 Stable Diffusion 用 CLIP 当文本端、还是搜索引擎用 CLIP 做检索，大家都越来越想喂"长 prompt"和"长描述"。Long-CLIP 干的事就是给弟弟做个手术，让他能读 248 字的纸条，但又不能让他忘了原来认识的那些短词组。

## 之前的人怎么做的 — 3-5 bullet

- **直接截断**：超过 77 token 的部分丢掉，最简单也最损信息。
- **重新训练长版 CLIP**：从头训一个支持长文本的版本，代价巨大且会破坏已有的 zero-shot 能力。
- **位置编码外推**（rope-style 等）：在 LLM 圈很常见，但 CLIP 的位置编码是可学习的绝对位置，外推效果不稳。
- **拼接多个短编码**：把长文本切成若干段分别过 CLIP 再 pooling，工程化但语义割裂。
- **下游模型自己接 LLM 当文本端**：比如 SD3 用 T5，但这不算"修 CLIP"，是绕过 CLIP。

## 这篇论文的关键想法

作者发现两件事：

第一，CLIP 的位置编码不能简单线性插值。直接拉伸会让低位（前面）位置的语义错乱，因为前面 20 个 token 已经被训练得"承担了大部分检索信号"，乱动它们等于砸掉好不熟的部分。

第二，CLIP 训练时图文对的描述往往很短（5-15 token），即使你有了长文本编码能力，也得让模型学会"长描述里哪些是主干、哪些是修饰"。光给长数据还不够，要显式区分粗细粒度。

于是他们的方案是两步走：**Knowledge-Preserved Stretching（KPS）** 只对靠后的位置插值、保留前 20 个位置不动；**Primary Component Matching（PCM）** 把长描述里的主成分单独抽出来跟图像对齐，让模型既能匹配粗略概念也能匹配细节。

## 它怎么做的（方法）— 3-4 段

**第一步：KPS 位置编码插值**。CLIP 原本 77 个绝对位置编码（learnable）。直接做 32 倍插值会让前几个位置的向量被稀释。作者保留前 20 个位置不变，对后面 57 个位置做 4 倍插值，得到 20 + 57×4 = 248 长度。这背后的洞察是：CLIP 的 EOS token 实际承担着 pooling 的角色，前置 token 的位置信息训练得最充分，最不能动。

**第二步：训练数据准备**。需要图像-长描述对。论文用 ShareGPT4V（约百万级长描述数据），描述长度普遍在 100-200 token 之间。同时为每张图也生成一个**短摘要**（primary caption），这是 PCM 的关键素材。

**第三步：PCM 首要分量匹配**。除了让"长描述 ↔ 图像"对齐之外，还让"短摘要 ↔ 图像主成分"也对齐。具体做法是把图像 embedding 做 PCA-style 分解抽出主分量，强制它跟短摘要 embedding 接近。这样模型显式学到"细节描述里去掉修饰词后剩下什么是主干"。

**第四步：保持 zero-shot 不退化**。训练时同时混入原 CLIP 的训练目标做 distillation 风格约束（具体形式需读原文）。这样在 ImageNet 等短文本 zero-shot 任务上不会塌。

## 实验在做什么

主要三类评测：

- **长文本图文检索**：比如 ShareGPT4V 的长描述测试集、Urban-1k 等。Long-CLIP 相对原 CLIP 提升幅度很大（具体数字需读原文，印象里是 retrieval recall@1 从个位数提到几十）。
- **短文本检索 + zero-shot 分类**：要证明扩长之后没把原能力搞丢。在 ImageNet zero-shot、COCO/Flickr30k 短文本检索上保持或略好。
- **下游 plug-in 能力**：把 Long-CLIP 当 Stable Diffusion 的文本编码器替换原 CLIP，看能否处理 200-token 长 prompt 生成更细节的图。这个演示性的实验是论文影响力的重要来源。

## 你应该懂的几个新词 — 4-6 个

- **CLIP**：OpenAI 2021 年的图文对比学习模型，文本编码器最大 77 token，被广泛用作其他模型（SD、BLIP、LLaVA 早期）的文本端。
- **位置编码（positional embedding）**：Transformer 用来告诉自己"这是第几个 token"的向量。CLIP 用的是 learnable absolute（每个位置一个独立向量，训练出来），不像 RoPE 那样可外推。
- **KPS（Knowledge-Preserved Stretching）**：本文术语。只对后段位置编码做插值，保留前段不动。
- **PCM（Primary Component Matching）**：本文术语。让图像主分量和短摘要对齐，长描述和完整图像对齐，形成双层语义粒度。
- **EOS token**：CLIP 文本编码器最后一个特殊 token，它的 hidden state 被用作整段文本的 representation（类似 BERT 的 CLS）。
- **ShareGPT4V**：一个用 GPT-4V 给 LAION/SAM 等图像生成长描述的数据集，是长描述训练的常用素材。

## 它和其他论文什么关系

- **承上**：CLIP（Radford 2021）是直接的修改对象。
- **同时代竞品**：DCI、CLIP-PAE、LongCLIP-style 各家都在尝试给 CLIP 加长，但 Long-CLIP 是被引用最多的方案之一，因为方法简单、可即插即用。
- **下游受益者**：Stable Diffusion 系列、PixArt、各类多模态 RAG 系统都会受益。SD3 已经选择 T5-XXL 作为长文本端，但 Long-CLIP 给"不想换大模型只想小修小补"的人留了一条路。
- **与 LLM 上下文外推的关系**：思想上类似（不重训只调位置编码），但 CLIP 用的是绝对 learnable 位置编码，技术细节差别较大。

## 我建议这样读 — 3-4 步

1. 先看 Figure 1（CLIP 的 77 token 限制示意 + Long-CLIP 输出对比），建立"为什么要扩"的直觉。
2. 跳到 Method 章节读 KPS 部分，重点理解"为什么前 20 个位置不动"——这是全文最不平凡的设计选择。
3. 看 PCM 那段的图（应该有一个双分支架构图），搞清"长描述 ↔ 整图"和"短摘要 ↔ 主分量"两条线分别在做什么。
4. 实验部分挑 SD 替换 CLIP 文本端那个生成例子看看，体感最直观。

## 为什么值得读

它是一个非常典型的"小手术、大杠杆"的论文：用两个目标明确的改动解决一个被广泛感知到的痛点（CLIP 文本端太短），不需要从头训练，社区可以直接 drop-in 替换。对你做 embodied AI / VLM 基础研究来说，价值有三：

- **基础设施意识**：理解 CLIP 这个底层组件的局限和如何打补丁，会帮你以后看到任何 "用 CLIP 做 X" 的工作时都能问"它的 77 token 限制怎么办"。
- **方法论参考**：KPS 这种"分段插值，保留训练得最充分的部分"的思想，可以迁移到其他需要外推的位置编码场景。
- **生态视角**：长描述、长 prompt 已经是事实标准，谁能把基础组件适配上谁就在生态里占位。Long-CLIP 是这个适配浪潮的代表作之一。

读完它，你就建立了"CLIP 系基础组件可以怎么微创新"的视角，再看 SigLIP、EVA-CLIP、MetaCLIP 这些工作时会更有比较的锚点。
