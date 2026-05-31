---
title: "X-VLM: Multi-Grained Vision Language Pre-Training"
slug: x-vlm
topic: multimodal
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2111.08276"
venue: ICML
year: 2022
era: classic
num: 70
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

X-VLM 是一个视觉-语言预训练模型，核心创新是**多粒度对齐（multi-grained alignment）**：不仅让一整张图和一整句话对齐，还让图里的某个**物体**、某个**区域**和文本里对应的短语、单词在同一个特征空间里对齐。这样下游任务（VQA、图文检索、image captioning）不管是问"整张图是什么"还是"图里那只狗在干嘛"，模型都能答得更准。

## 这是个什么场景 — 日常类比

想象你在教一个小孩看带配文的绘本：

- **粗粒度**：你指着整张图说"这是一只狗在草地上玩球"。小孩学会了"图 ↔ 整句"的对应。
- **细粒度**：你指着图里的狗说"狗"，指着球说"球"，指着草地说"草地"。小孩学会了"局部 ↔ 单词/短语"的对应。

之前的视觉-语言模型大多只做第一种（CLIP 风格的图-文整体对齐），或者依赖一个**预训练好的物体检测器**（比如 Faster R-CNN）先把图切成"狗"、"球"、"草地"几个 box，再去对齐。X-VLM 想做的是：**不依赖外部检测器，端到端地同时学整图、区域、物体三种粒度的对齐**。

## 之前的人怎么做的 — 3-5 bullet

- **CLIP / ALIGN（2021）**：双塔结构，图-文整体对齐。简单、可扩展，但缺乏细粒度理解，问"图里左下角是什么"就答不好。
- **ViLBERT / LXMERT / UNITER（2019-2020）**：用预训练好的目标检测器（Faster R-CNN）抽 region features，再喂给 Transformer 做图文 cross-attention。强依赖检测器质量，慢，且检测类别有限。
- **ViLT（2021）**：去掉检测器，直接用 ViT patch + 文本 token 一起塞进 Transformer。轻量，但丢失了"哪个 patch 对应哪个物体"的显式监督。
- **ALBEF（2021，X-VLM 的前作）**：先做对比学习对齐整图整文（contrastive），再做融合 Transformer 学细粒度，引入 momentum distillation 处理 noisy web data。但**对齐还是图-文级别**。

## 这篇论文的关键想法

核心论断：**视觉-语言对齐不该只在一个粒度上做**。

X-VLM 的关键想法是构造一个**多粒度的训练数据 + 多粒度的对齐目标**：

1. **数据层面**：训练数据不只是 (整图, caption) 对，还包含 (图, 区域 box, 区域描述) 三元组。区域可以是物体级（一只狗）或更大的视觉概念（一群人在野餐）。
2. **模型层面**：用一个 Vision Transformer 编码整图，但允许"取出某个 box 内 patch 的特征聚合"作为区域表征。
3. **目标层面**：同时优化三种对齐 loss——整图↔整文、区域↔短语、物体↔单词——共享同一个 Transformer 编码器。

这样模型学到的视觉特征空间里，"整图特征"和"区域特征"是**同一套表征**，只是聚合范围不同。下游任务可以灵活地按需提取任意粒度。

## 它怎么做的（方法）— 3-4 段

**架构**：图像编码器（Vision Transformer）+ 文本编码器（BERT-like）+ 跨模态融合 Transformer。整体框架沿用 ALBEF 的双塔 + 融合，但关键改动在于"视觉特征不再只代表整图"。

**多粒度视觉表征**：图像过 ViT 后得到 patch features。给定一个 box（来自标注数据，如 Visual Genome、COCO 的 region annotation），从 box 覆盖的 patch 里聚合出一个**区域级特征向量**。整图特征则是所有 patch 的聚合。这样同一张图能产出"整图向量 + 多个区域向量"，每个都和对应的文本（caption / phrase / object name）做对齐。

**训练目标**：组合多个 loss——
- **对比学习（contrastive）**：图-文双塔，多粒度（整图-整文、区域-短语）都做。
- **匹配（ITM, image-text matching）**：跨模态融合后判断"这对图文是否真的匹配"。
- **MLM（masked language modeling）**：mask 掉文本里的词，让模型用图像信息补全。
- **Bounding box prediction**：给定文本短语，预测它在图里对应的 box 坐标（让区域对齐有显式监督）。

**数据**：混合多种来源——COCO、Visual Genome（带 region 标注）、Conceptual Captions、SBU、CC12M（只有图-文整体对）等。具体每种数据多少、batch 怎么混，需读原文。

## 实验在做什么

X-VLM 在多个标准视觉-语言任务上验证多粒度对齐的好处：

- **图文检索（image-text retrieval）**：Flickr30K、COCO 上的 R@1/R@5/R@10。
- **VQA（visual question answering）**：VQA v2 准确率。
- **视觉推理**：NLVR2（判断两张图和一句话是否一致）。
- **视觉定位（visual grounding）**：RefCOCO 系列，给一句描述，找出图里对应的 box——这是多粒度对齐**最直接受益**的任务。
- **Image captioning**：COCO Caption。

主要对比对象是 ALBEF、VinVL、BLIP 等同期方法。X-VLM 在多任务上达到 SOTA 或接近 SOTA，**视觉定位提升尤其明显**——这符合直觉：你训练时就显式对齐了 region 和 phrase，测试时找 region 自然更准。具体数字需读原文。

## 你应该懂的几个新词 — 4-6 个

- **Multi-grained alignment（多粒度对齐）**：同时在整图-整文、区域-短语、物体-单词等多个粒度上让视觉和语言特征对应。
- **Region / Bounding box（区域 / 边界框）**：图里一个矩形框，框住某个物体或视觉概念，是细粒度对齐的"锚点"。
- **Visual Genome**：一个带密集 region 标注 + region description 的数据集，是多粒度训练的关键数据来源。
- **Image-Text Contrastive (ITC)**：双塔对比学习，把匹配的图-文拉近、不匹配的推远，CLIP 同款思路。
- **Image-Text Matching (ITM)**：把图和文一起塞进融合 Transformer，做二分类"是否匹配"，比 ITC 更细但更慢。
- **Visual grounding（视觉定位）**：给一句描述，定位它在图里指的是哪个 box——多粒度对齐的"亲女儿任务"。

## 它和其他论文什么关系

- **ALBEF（2021）→ X-VLM**：直接前作。X-VLM 沿用 ALBEF 的双塔 + 融合架构和 momentum distillation 思想，主要扩展是引入多粒度对齐 + bbox prediction loss。
- **CLIP / ALIGN**：粗粒度对齐的代表，X-VLM 可视为它们的"细粒度增强版"，但代价是需要带 region 标注的数据。
- **VinVL**：依赖更强的物体检测器抽 region feature，思路是"先检测再对齐"；X-VLM 是"端到端学多粒度"，不依赖外部检测器。
- **BLIP（2022）**：同期工作，更关注用生成式 caption 做数据清洗（CapFilt），和 X-VLM 是互补思路：X-VLM 改对齐粒度，BLIP 改训练数据质量。后续 BLIP-2 把视觉编码器和 LLM 桥接起来，开启了 VLM 大模型时代。
- **下游影响**：X-VLM 的多粒度思想被后续很多工作借鉴（包括一些机器人 / embodied AI 里需要"指着图里某个物体说话"的场景）。

## 我建议这样读 — 3-4 步

1. **先读 abstract + Figure 1**：搞清楚"多粒度"具体指哪几个粒度，看图比看公式快。
2. **跳到 Method 节看 loss 组合**：重点是"区域特征怎么从 patch 聚合出来"和"bbox prediction 怎么做"，这是和 ALBEF 的关键区别。
3. **看 visual grounding 实验**：这是多粒度对齐最直接受益的任务，看相对 ALBEF 提升多少，能直观感受多粒度的价值。
4. **可选：和 ALBEF 论文对照读**——X-VLM 很多设计直接来自 ALBEF，对照读能快速看出"加了什么、为什么"。

## 为什么值得读

- **思路上**：是从"图-文整体对齐"到"多粒度对齐"的代表作，理解了它再看后续 GLIP、Grounding DINO、各种带定位能力的 VLM 都更顺。
- **工程上**：展示了如何把多种数据（带 region 的 / 只有 caption 的）混在一起做统一训练，是现代 VLM 数据工程的早期范本。
- **对 embodied AI 的意义**：机器人很多任务需要"指认图里某个物体"（比如 RT-2 里的 grounding、SayCan 里的物体识别），多粒度对齐是这类能力的底层基础。
- **难度适中**：不是全新框架，是在 ALBEF 上的精准改进，读起来"看得懂改了什么、为什么改"——是学习如何写"增量但有效"的论文的好样本。
