---
title: "Sigmoid Loss for Language Image Pre-Training"
slug: siglip
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2303.15343"
venue: ICCV
year: 2023
era: classic
num: 136
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

SigLIP 把 CLIP 用的 softmax 对比损失换成 sigmoid 二元分类损失。每对 (图像, 文本) 单独判断"是不是配对的一对"，不再像 softmax 那样要在整个 batch 里相互比较。结果：训练数值更稳，小 batch 也能涨点，工程上更容易扩展。

## 这是个什么场景 — 日常类比

想象你在做"图文配对"的考试：

- **CLIP 的考法**：老师给你一批 N 张图和 N 段文字，告诉你"这 N 段里恰好有一段配这张图，挑出来"。每答一题都要把所有候选都看一遍排个序。Batch 越大，候选越多，区分度越高，但出题成本也越大（GPU 内存里要算 N×N 的相似度矩阵，还要做 softmax 归一化）。
- **SigLIP 的考法**：老师把卷子拆成 N×N 个独立的判断题——"这张图和这段文字配吗？是 / 不是"。每题独立判断，互不影响。题目多但每题简单，不需要"在 N 个里挑一个"那种全局耦合。

类比的好处：判断题之间互相独立，可以分布式更轻松；不需要在每个 GPU 上凑足够大的 batch 才能学到东西。

## 之前的人怎么做的 — 3-5 bullet

- **CLIP（OpenAI 2021）**：用 InfoNCE / softmax 对比损失，需要 batch 内所有图文对相互比较。Batch 越大效果越好，常见 32k 起步。
- **ALIGN（Google 2021）**：和 CLIP 思路相同，softmax 对比 + 超大 noisy 数据集（18 亿对）。
- **BASIC / LiT（Google 2021-2022）**：在 CLIP 基础上做规模和冻结策略的探索，但 loss 没动。
- **Florence / CoCa**：把对比损失和 caption 生成损失混合，但对比那一支仍是 softmax。
- **共同痛点**：softmax 要算全 batch 的归一化项，分布式实现里需要 all-gather 把所有设备的 embedding 收集到一起，通信开销随 batch 平方增长。

## 这篇论文的关键想法

核心：**把多分类问题降级成多个独立的二分类问题**。

- 对每对 (图像 i, 文本 j)，定义一个二元标签：i==j 时是正样本（label=1），i≠j 时是负样本（label=0）。用 sigmoid + 二元交叉熵损失算 loss。
- 这样 N×N 个 pair 各自独立，没有跨 pair 的归一化项，分布式实现里不再需要全局 all-gather。
- 由于负样本远多于正样本（一个 batch 里只有 N 个正例 vs N²-N 个负例），引入两个**可学习参数**：温度 t 和偏置 b，用来校准正负样本的尺度差异。
- 工程上的连锁好处：内存占用从 O(N²) 在每张卡上降到 O(N)（每张卡只看自己分到的那部分 pair）；可以训更大的 batch（论文做到 100 万），也可以用很小的 batch（< 1k）依然涨点。

## 它怎么做的（方法）— 3-4 段

**Loss 形式**。给定图像编码器输出 image embedding x_i 和文本编码器 y_j，相似度 s_ij = t · cos(x_i, y_j) + b。Label z_ij = +1（i==j）或 -1（i≠j）。损失是 -log σ(z_ij · s_ij)，也就是把 sigmoid 二分类损失对所有 pair 求和。t 和 b 是可学习标量，通常初始化让大部分负样本 loss 接近 0。

**为什么要 bias b**。如果只学温度 t，sigmoid 在 s=0 处输出 0.5，意味着初始时模型对所有 pair 都"半信半疑"，但实际上随机配对的概率是 1/N，远低于 0.5。bias b 初始化成一个大负数（比如 -10），让 sigmoid 默认输出接近 0，这样训练初期 loss 主要由"找出正样本"驱动，不会被海量负样本淹没。

**分布式实现**。论文给出了一种"chunked" 实现：每个设备只持有自己 batch shard 的图文 embedding，然后通过环形通信（每次只把文本 embedding 传给下一个设备）逐步累计 N×N pair 的 loss，整个过程不需要把所有 embedding all-gather 到一起。这让 batch size 几乎只受总显存限制，不再受单卡内存限制。

**模型与数据**。Vision encoder 用 ViT，text encoder 用类似 BERT 的 transformer。训练数据走 WebLI（Google 内部的大规模图文对，体量在十亿量级）。具体配置（层数、参数量、step 数）需读原文。

## 实验在做什么

主要看 zero-shot 和 retrieval 两条线：

- **Zero-shot ImageNet 分类**：和 CLIP / ALIGN 同等模型规模下 SigLIP 略胜或持平，但小 batch（≤16k）下优势更明显。
- **图文 retrieval（COCO / Flickr30k）**：sigmoid loss 下 retrieval 指标稳定提升，特别是在 batch 较小时。
- **Batch size 消融**：作者把 batch 从 1k 扫到 100 万。结论是：sigmoid 在小 batch 下显著好于 softmax；大 batch 下两者接近，但 sigmoid 训练更稳、内存友好。
- **Loss 数值稳定性**：softmax 在大 batch 下有时会 NaN（因为 log-sum-exp 数值范围爆炸），sigmoid 几乎不会。
- 具体数字（点数、step 数、各 batch size 下的 acc）需读原文 Table。

## 你应该懂的几个新词 — 4-6 个

- **对比学习（contrastive learning）**：让"配对的样本在 embedding 空间距离近，不配对的远"的训练范式。CLIP/SimCLR/MoCo 都属于这一类。
- **InfoNCE / softmax 对比损失**：CLIP 用的具体损失。把"找到正确配对"建模成 N 选 1 的多分类，需要全 batch 归一化。
- **Sigmoid 损失（二元交叉熵的别名）**：把每个 pair 当独立判断题，σ(s) = 1/(1+exp(-s))，loss = -log σ(z·s)。
- **温度 t（temperature）**：对相似度做尺度缩放，控制 softmax/sigmoid 的"锐利度"。CLIP 里通常作为可学习参数。
- **偏置 b（bias）**：SigLIP 新引入的可学习标量，校正正负样本的先验比例。
- **All-gather**：分布式训练里把所有设备的 tensor 汇总到每个设备的通信原语，softmax 对比损失依赖它，sigmoid 不强依赖。

## 它和其他论文什么关系

- **直接前作**：CLIP（[clip.md](clip.md)）。SigLIP 是 CLIP 训练目标的一次"换 loss" 简化。
- **平行思路**：ALIGN / BASIC / Florence 走的是"把数据和规模扩大"的路；SigLIP 走的是"loss 形式变简单 + 工程更友好"的路。
- **后续影响**：SigLIP 的预训练权重被广泛当作 vision encoder 给 LLaVA、PaliGemma、Idefics 等 VLM（视觉-语言模型）用，因为它在小算力下也能拿到好的图文对齐表征。
- **延伸版本**：SigLIP-2（2024）在此基础上加了多语言、更高分辨率、shape-aware 等改进。

## 我建议这样读 — 3-4 步

1. **先看 Algorithm 1（伪代码）+ 公式 1-2**：理解 sigmoid loss 的实际计算，跟 CLIP 公式对比着看，差别就在归一化项。
2. **再看 Section 3 关于 bias b 的初始化分析**：这是 SigLIP 工程上能 work 的关键，理解了就知道为什么不能直接把 softmax 换成 sigmoid 完事。
3. **看 batch size 消融图**：把横轴 batch size、纵轴 zero-shot acc 的两条曲线（softmax vs sigmoid）对照看，结论一目了然。
4. **跳读分布式实现章节**：如果你不做大规模训练可以略过；要做的话这部分很值。

## 为什么值得读

- **简洁的洞察**：一行 loss 改动带来工程链条上的一连串好处，是"少即是多"的好例子，对培养 loss-level 的设计直觉很有帮助。
- **现实影响大**：SigLIP 已成为 2024-2026 年 VLM 主流的视觉编码器选项之一，读懂它能帮你看懂 LLaVA / PaliGemma 系列论文里"为什么用 SigLIP 而不是 CLIP"那一段。
- **入门门槛适中**：方法部分数学不难（就是 sigmoid + BCE），但工程细节（bias 初始化、chunked 分布式）足够有嚼头，⭐⭐⭐ 难度合适。
- **对比 CLIP 一起读最佳**：先读 CLIP 建立 baseline 直觉，再读 SigLIP 看"这一步为什么省 / 为什么稳"，能把对比学习这条线串起来。
