---
title: "EVA-CLIP: Improved Training Techniques for CLIP at Scale"
slug: eva-clip
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2303.15389"
venue: arXiv
year: 2023
era: classic
num: 129
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

不改 CLIP 架构，只改训练流程：用一个已经"懂图"的视觉模型起步 + 训练时只看半张图——更少数据反而训出更强的看图模型。

## 这是个什么场景

你手机里现在有几万张照片。哪天你想找"那张去年在海边吃冰淇淋的照片"，手机相册输入文字就能搜出来——这背后就是 CLIP（Contrastive Language-Image Pre-training，对比语言-图像预训练）这类模型在干活：它学会了把"一张图"和"一句描述"挂在同一根线上。

但训这种模型贵得吓人。打个比方：

**OpenCLIP 的做法**像是请一个完全没见过世界的小孩，扔进图书馆，让他一本一本翻"图配文绘本"，硬翻几十亿本才学会"毛茸茸四条腿叫狗"。电费、显卡时间、清洗数据，都贵。

**EVA-CLIP 的做法**是：先让这个小孩玩一阵"看图猜缺角"游戏——给他半张被遮住的图，让他脑补另一半（这就是 MIM，Masked Image Modeling，掩码图像建模）。等他对"图里大概长啥样"已经有感觉了，再让他来学"图配文字"。起点高了，后面就不用翻那么多书。

再叠两个省钱小技巧：
- 一次搬一大箱书（大 batch），但换个不闪腰的搬法（LAMB 优化器）
- 看图时眯着眼只看一半像素（FLIP，随机扔掉一半图像 patch），翻书速度直接翻倍

结果：用更少的书、更短的时间，考试分数反而更高。

## 之前的人怎么做的 — 3-5 bullet

- **OpenAI CLIP（2021）**：自己攒了 4 亿对私有图文数据，用对比学习从零训 ViT + Text Encoder。开了路，但数据不开源。
- **OpenCLIP / LAION**：开源复现 + 扩大规模，用 LAION-2B / LAION-5B 这种公开数据集训出 ViT-G/14 等大模型。问题：训练慢、卡时贵，且收益边际递减。
- **直接堆数据 / 堆参数**：业界主流路径之一。但要做到 ViT-G/14 级别，单次训练要烧几万 A100·天。
- **MIM 系（MAE / BEiT / EVA）**：纯图像自监督预训练，在分类、检测上很强，但本身没有"看图理解文字"的能力。
- **没人系统地把 MIM 初始化和 CLIP 训练拼起来**：EVA-CLIP 之前，CLIP 通常是从 ImageNet 监督预训练或随机初始化开始；MIM 预训练的视觉编码器虽然强，但社区没把它当作 CLIP 的"出厂底板"来系统利用。

## 这篇论文的关键想法

三条，每条都是日常常识：

**1. 找个会做菜的徒弟，比从头教划算。** 你要培养一个厨师，与其从"什么是锅"开始教，不如招一个已经会切菜颠勺的人，再教他菜谱就好了。EVA-CLIP 的视觉塔（图像编码器）就是这么招来的——它直接拿同团队的另一个模型 EVA 当起点。EVA 已经在 30M（三千万）张图上做过"看半张猜全图"的训练，对图像结构很熟。视觉塔从这里启动，就跳过了"先学世界长啥样"这一大步。

> 等等，先慢一拍——"视觉塔"是啥？
> 就是模型里专门负责"看图"的那一半网络。CLIP 由两半组成：一半看图（视觉塔），一半读字（文本塔），训练目标是让两半在同一空间里对得上。

**2. 一次扛一箱重物，要换种姿势。** 训 CLIP 一次要塞进几万张图（batch size 大），因为对比学习是"在一堆候选里找配对"，候选越多学得越准。但箱子太大，常用的 AdamW 优化器（管"该往哪走、走多远"的那个东西）容易闪腰。换成 LAMB（Layer-wise Adaptive Moments for Batch training，专为大 batch 设计的优化器），就稳了。

**3. 上课时眯着眼听一半，效率反而更高。** 训练时把每张图切成小块（patch），随机扔掉一半再喂给模型——这就是 FLIP（Fast Language-Image Pre-training）的招。计算量直接砍半，速度翻倍。性能稍有损失，但和前两条叠加起来是净赚。推理（实际用的时候）还是看完整张图，不偷工。

合起来：**会的徒弟 + 不闪腰的姿势 + 眯眼听课**——EVA-CLIP 比 OpenCLIP 高效的全部秘密就在这里，没有什么新发明。

## 它怎么做的（方法）— 3-4 段

**第一段：模型骨架不变，但视觉塔从 EVA 加载权重。** EVA-CLIP 的视觉编码器仍是标准 ViT（不同规模有 EVA01-CLIP-B/16、L/14、g/14 等），文本编码器跟 OpenCLIP 一致是 BERT-style Transformer。关键差异在于：视觉塔的初始权重不是随机的、也不是 ImageNet 监督预训练的，而是来自 EVA——一个用 CLIP 视觉特征作为重建目标做 MIM 训练的 ViT。换句话说，视觉塔已经"隐式地"学过一遍 CLIP 视觉特征的分布。

**第二段：训练目标仍是标准对比学习。** 一对（图，文）正样本，batch 内其他文本作负样本，跑 InfoNCE loss。文本侧做轻微改造（具体细节需读原文，但据公开资料是沿用 OpenCLIP 配置）。这部分没有改 loss 设计——论文的论点就是"训练目标不用改，改训练流程就够了"。

**第三段：优化器与超参。** 用 LAMB 替代 AdamW，配合 cosine learning rate decay 和 warmup。Batch size 推到几万的量级（具体数字需读原文），让对比学习有足够多的负样本。混合精度训练（bfloat16）走起。

**第四段：FLIP 加速。** 训练阶段把图像 patch 随机 mask 掉 50%，让 ViT 只对剩下一半 token 做 self-attention，FLOPs 直接减半，吞吐量翻倍。推理时不 mask，full token 跑一遍。这个技巧来自 FLIP 论文（Li et al., 2023），EVA-CLIP 是把它和 MIM 初始化叠加。

整体训练数据规模比 OpenCLIP-G/14 用的 LAION-2B 小一截（具体数字需读原文，但论文的卖点就是"用更少数据"），训练时间也短。

## 实验在做什么

主要看三类指标：

**1. 零样本图像分类（zero-shot ImageNet 等）**：把视觉塔编码出的图像特征，跟 CLIP-style 的"a photo of {class}"文本特征做相似度匹配。EVA-CLIP 在 ImageNet-1K zero-shot top-1 上超过 OpenCLIP-G/14，但用的训练资源少很多（具体数字需读原文）。

**2. 跨数据集鲁棒性（ImageNet-V2 / ObjectNet / ImageNet-A 等）**：测视觉特征对分布偏移的泛化能力。这一类是 CLIP 系最看重的指标，因为它真正反映"视觉表征通不通用"。EVA-CLIP 在多个 OOD（out-of-distribution，分布外）测试集上也优于 OpenCLIP。

**3. 下游迁移（图像-文本检索 / linear probe / 微调）**：把视觉编码器当骨干网络，接到检索、分类等任务上看。这块的表现决定 EVA-CLIP 作为"通用视觉编码器"的实用价值。

论文还会有消融：去掉 MIM 初始化会掉多少？换 AdamW 会掉多少？不用 FLIP 又是什么样？（具体消融数字需读原文。）这些消融是论点能不能立的关键，读原文时重点看这部分。

## 你应该懂的几个新词 — 4-6 个

- **CLIP（Contrastive Language-Image Pre-training）**：让图像和文本在同一个嵌入空间对齐的预训练范式。一对（图，文）拉近，不同对推远，跑 InfoNCE loss。
- **MIM（Masked Image Modeling）**：图像版的"完形填空"。把图像切 patch，遮掉一部分，让模型预测被遮的内容（像素或特征）。代表作 MAE、BEiT、EVA。
- **LAMB（Layer-wise Adaptive Moments for Batch training）**：为大 batch 训练设计的优化器，在每层做自适应学习率缩放。BERT 大 batch 训练首发，CLIP 大模型也常用。
- **FLIP（Fast Language-Image Pre-training）**：训练 CLIP 时随机丢一半图像 patch，砍前向计算的提速技巧。Li et al. 2023 提出。
- **EVA（同作者前作）**：用"重建 CLIP 视觉特征"作为目标的 MIM 预训练 ViT。EVA-CLIP 的视觉塔就是从 EVA 加载的。
- **Zero-shot classification**：不微调，直接用文本 prompt（"a photo of {class}"）和图像特征算相似度做分类。CLIP 系最经典的评测协议。

## 它和其他论文什么关系

**直接前作**：
- **CLIP（OpenAI 2021）**：定义范式，但闭源。
- **OpenCLIP / LAION**：开源复现 + 数据扩展。EVA-CLIP 直接对标这条线，主张"不用堆那么多数据也行"。
- **EVA（同团队 2022）**：MIM 预训练的视觉编码器，是 EVA-CLIP 视觉塔的初始化。
- **FLIP（Li et al. 2023）**：提供了"训练时丢一半 patch"的提速技巧。

**同期对比**：
- **SigLIP（Google 2023）**：从 loss 角度改进 CLIP，把 InfoNCE 换成 sigmoid loss，省掉 batch 内归一化。和 EVA-CLIP 是两条不同的优化路径——一条改 loss，一条改训练流程。
- **DataComp 系**：从数据角度卷，主张"清洗数据比加数据更重要"。和 EVA-CLIP 互补。

**下游影响**：
- 多模态大模型的视觉塔常用 EVA-CLIP（如 LLaVA-1.5、MiniGPT-4 早期版本、InternLM-XComposer）。原因：开源、性能强、推理可控。
- 是 BLIP-2 / Q-Former 系列在选视觉编码器时的常见候选。

**互补关系**：
- 与 DINOv2 是两类不同的视觉自监督——DINOv2 不需要文本配对，纯图像 self-distillation；EVA-CLIP 需要图文对但语义对齐更直接。下游任务选哪个看是否需要 zero-shot 能力。

## 我建议这样读 — 3-4 步

1. **先看 abstract + Table 1**：确认它的卖点是"更少资源跑出更高分"，把它的训练资源（卡时、数据量）和 OpenCLIP-G/14 摆在一起对比。
2. **跳到消融实验**：单独看"去掉 MIM 初始化"、"AdamW vs LAMB"、"有/无 FLIP"三个消融，确认这三条是不是真的各自独立有贡献。这是论点能不能立的核心。
3. **如果你关心实用性**：看 zero-shot ImageNet + OOD 鲁棒性 + 下游迁移这三类指标，决定要不要在自己的项目里把视觉塔换成 EVA-CLIP。
4. **如果你关心后续**：看 EVA-02-CLIP 的更新（2023 下半年），那是同一团队的扩展，把视觉塔换成 EVA-02 + 加了一些 transformer 改动。

## 为什么值得读

三个理由：

**1. 它是现在多模态大模型的事实标准视觉塔之一。** 你打开 LLaVA、MiniGPT-4、InternLM-XComposer 的代码，视觉编码器一栏八成写着 `eva-clip-g` 或类似 ID。理解它是看懂这些 VLM（Vision-Language Model）的前提。

**2. 它示范了"工程化 + 站在巨人肩膀上"的研究范式。** 没有花哨的新 idea，但把"MIM 初始化 + 大 batch 优化器 + FLIP"这三条已知技巧组合起来，用资源换效率的角度做出了 SOTA。这种"组合拳式工作"在工业界比纯新架构更常见，值得学习这种研究审美。

**3. 它的消融实验设计是教科书级的。** 三个改进点各自独立可拆，能清晰看到边际贡献，避免了"一堆改进糊在一起说不清谁有功"的常见毛病。读它的消融表本身就是一种"如何写消融"的训练。

读完之后，你应该能回答：
- 为什么 LLaVA 选 EVA-CLIP 不选 OpenCLIP？
- 训 CLIP 想加速，除了堆卡还能怎么办？
- MIM 自监督和 CLIP 对比学习之间是什么关系？
