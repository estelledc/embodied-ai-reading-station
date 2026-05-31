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

教模型"图配文字"，CLIP 要全班一起排名打分，SigLIP 改成一对一判断"是不是一对"。算得快、省内存、小批也能学。

## 这是个什么场景 — 日常类比

想象你在玩一个"图配字幕"的小游戏。桌上摊着 N 张照片和 N 张字幕条，要把它们一一对应起来。有两种玩法：

- **CLIP 的玩法（连线题）**：每拿起一张照片，都得把所有 N 张字幕都过一遍，比出哪个最像，再连线。照片越多（batch 越大），连得越准，但你脑子里要同时挂着所有候选答案——每答一题都要"全班横向比较"。在 GPU 里，这意味着算一张 N×N 的相似度矩阵，再用 softmax 把每行归一化（把分数变成"在所有候选里占多少概率"）。
- **SigLIP 的玩法（判断题）**：把每张照片和每张字幕的组合都拎出来，单独问一句"这俩是一对吗？是 / 不是"。一共 N×N 道判断题，但每道之间互不打扰，答完一道丢一道，不用回头跟别的比。

判断题的好处很现实：可以分给好几个人（GPU）同时做，不用等大家把答案凑齐再算总分；就算一次只发 100 道题（小 batch）也能学到东西，不像连线题非得堆够 32000 个候选才学得动。

## 之前的人怎么做的 — 3-5 bullet

- **CLIP（OpenAI 2021）**：用 InfoNCE / softmax 对比损失，需要 batch 内所有图文对相互比较。Batch 越大效果越好，常见 32k 起步。
- **ALIGN（Google 2021）**：和 CLIP 思路相同，softmax 对比 + 超大 noisy 数据集（18 亿对）。
- **BASIC / LiT（Google 2021-2022）**：在 CLIP 基础上做规模和冻结策略的探索，但 loss 没动。
- **Florence / CoCa**：把对比损失和 caption 生成损失混合，但对比那一支仍是 softmax。
- **共同痛点**：softmax 要算全 batch 的归一化项，分布式实现里需要 all-gather 把所有设备的 embedding 收集到一起，通信开销随 batch 平方增长。

## 这篇论文的关键想法

一句话类比：**像把"全班排名"改成"逐个面试"**。

- **拆题**：对每对 (图像 i, 文本 j)，单独贴个标签：i==j 是正样本（label=1，"这俩是一对"），i≠j 是负样本（label=0，"这俩没关系"）。用 sigmoid 函数 + 二元交叉熵（BCE，binary cross-entropy，就是判断题最常用的那种损失）算 loss。
- **解耦**：N×N 个 pair 各算各的，没有跨 pair 的归一化项。分布式训练时不用再把所有 GPU 上的 embedding 收回来汇总（也就是不依赖 all-gather）。
- **校准**：判断题里"不配对"的题远多于"配对"的题（N 个正例 vs N²-N 个负例，比如 batch=1000 时正负比是 1:999）。论文加了两个**可学习的标量参数**——温度 t 和偏置 b——专门校准这个失衡。
- **连锁好处**：每张卡的内存从 O(N²) 降到 O(N)；可以把 batch 拉到 100 万，也可以缩到 1k 以下还能学。

## 它怎么做的（方法）— 3-4 段

**Loss 形式（怎么打分）**。像两个翻译官各自把素材压成一串数字：图像编码器把图变成向量 x_i，文本编码器把句子变成向量 y_j。然后算它俩的"像不像"——余弦相似度 cos(x_i, y_j)，再缩放加偏移：s_ij = t · cos(x_i, y_j) + b。Label z_ij = +1（是一对）或 -1（不是）。损失就是 -log σ(z_ij · s_ij)，对所有 pair 加起来。

等等，先慢一拍 — σ 是什么？σ 就是 sigmoid 函数，把任何数压到 0 到 1 之间，可以读成"模型有多少把握认为这俩配对"。z·s 是个小技巧：正样本希望 s 大，负样本希望 s 小，乘上 ±1 之后两边都变成"希望这个值越大越好"，损失统一成一种形式。

**为什么要加 bias b（为什么默认要"倾向于说不是"）**。打个比方：如果你猜每对照片字幕是不是一对，随机蒙的话猜中的概率是 1/N（N=batch 里只有一对真配的）。但 sigmoid 在 s=0 时默认输出 0.5——相当于"50% 觉得是一对"，这远高于真实先验，模型一开始就被海量"假阳性"淹没。b 初始化成一个很负的数（比如 -10），让 sigmoid 默认输出接近 0（"默认认为不配"），训练就能聚焦在"把真正配对的找出来"上。

**分布式实现（让多张卡接力答题）**。设想 8 张 GPU 一起做这堆判断题。朴素做法是把所有图文向量都广播到每张卡（all-gather），但向量越多通信越贵。论文用"chunked" 接力：每张卡只拿自己那一片 embedding，然后像传纸条一样环形传递文本向量（每轮传给下一个邻居），逐步把 N×N 个 pair 的 loss 累加完——全程不用一次性把所有向量塞进同一张卡。结果 batch size 几乎只受总显存约束，不再被单卡内存卡住。

**模型与数据**。Vision encoder 用 ViT（视觉版 Transformer），text encoder 用类似 BERT 的 transformer。训练数据走 WebLI（Google 内部的大规模图文对，体量在十亿量级）。具体配置（层数、参数量、step 数）需读原文。

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
