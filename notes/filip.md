---
title: "FILIP: Fine-grained Interactive Language-Image Pre-Training"
slug: filip
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2111.07783"
venue: ICLR
year: 2022
era: classic
num: 130
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

FILIP 把 CLIP「整张图 vs 整句话」的粗粒度对齐，**升级成 patch（图像小块）和 token（词元）之间的细粒度交互对齐**。具体做法：每个图像 patch 去找最像它的文本 token，每个文本 token 去找最像它的图像 patch，把这些「最佳匹配」的相似度求平均，作为图文整体的相似度。这样模型在对比学习时，更被迫学会"狗在左下角"、"草地在背景"这类局部对应关系，而不是只学一个笼统的全局匹配。

## 这是个什么场景 — 日常类比

想象你在玩"看图找词"。

- **CLIP 的玩法**：给你一整张图、一整段描述，你只回答"匹配"或"不匹配"。你能学会"狗的图配狗的句子"，但你不会被强迫去想"句子里的'红项圈'对应图里的哪一小块"。
- **FILIP 的玩法**：图被切成 49 块小拼图，句子被拆成若干词。每个小拼图都要在词列表里找一个"最像它的词"；每个词也要在拼图里找"最像它的小块"。最后把所有"最佳配对得分"加起来，才是图文匹配分。

这种玩法逼模型去学"红项圈"这个词对应图像里哪一小块。**结果是模型不仅整体懂图，还懂图的细节**——零样本分类时它能更准地分辨细类，下游迁移时也更稳。

## 之前的人怎么做的 — 3-5 bullet

- **CLIP（2021）**：双塔 + 全局对比学习。图像编码器输出 `[CLS]` 一个向量，文本编码器输出 `[EOS]` 一个向量，两者点积。简单、可扩到 4 亿对图文。**缺点**：粒度太粗，看不清"句子里某个名词到底指图里哪一块"。
- **ALIGN（2021）**：和 CLIP 同思路，更暴力的数据规模（18 亿对噪声网页图文），证明数据量够大可以补质量。仍然是全局对齐。
- **早期视觉-语言预训练（ViLBERT / UNITER / OSCAR）**：单塔或交叉编码器，用 BERT-like 注意力让 region 和 token 强交互。**优点**：细粒度好；**缺点**：推理时图文必须一起 forward，零样本图像分类成本高，做不了像 CLIP 那样的"先编码图库，再快速比对"。
- **DeCLIP / SLIP（2021）**：在 CLIP 基础上加自监督、masked LM、最近邻挖掘等辅助任务，提升数据效率。但仍是全局对齐。
- **总结**：双塔（CLIP 系）= 部署快但粒度粗；单塔（UNITER 系）= 粒度好但不能零样本批量分类。FILIP 想要"双塔的部署优势 + 单塔的细粒度"。

## 这篇论文的关键想法

**核心**：把"两个全局向量做点积"换成"两组 token 向量做最大相似度匹配再平均"。

公式上（直觉版）：

- CLIP：`sim(image, text) = <v_global, t_global>`
- FILIP：`sim(image, text) = mean_i max_j <v_i, t_j> + mean_j max_i <v_j, t_i>`（双向 token-level max）

这个改动看似小，但**有两个深意**：

1. **不增加推理成本**：图像和文本仍然各自独立编码（双塔结构没变），只是相似度计算从一个点积变成 token 矩阵的"最大值池化 + 平均"。零样本分类时，文本 token 可以预先缓存。
2. **强迫局部对齐**：训练目标是让"每个 patch 找到的最佳 token"得分高。模型要让 patch 的语义指向某个词，否则 max 操作给不了高分。这就把局部对应关系作为"副产品"学出来了。

附带好处：**可解释性**——训练完后可以可视化每个 token 对应图里哪些 patch，得到一个免费的 grounding map（词 → 图像区域映射）。

## 它怎么做的（方法）— 3-4 段

**整体架构**：双塔，左边 ViT（视觉 Transformer），右边 BERT-like 文本 Transformer。和 CLIP 一样。区别只在**最后一层怎么算相似度**和**训练目标**。

**Token-level 相似度计算**：图像编码器输出 N 个 patch token（去掉 `[CLS]`），文本编码器输出 M 个 word token（去掉 `[EOS]` 和 padding）。对每个 patch token v_i，在所有 text token 里找最大相似度 `max_j <v_i, t_j>`；然后把 N 个 patch 的最大值求平均，得到"图到文"的相似度。反过来同理算"文到图"。两者求平均（或选一向）作为最终相似度，喂给对比学习的 InfoNCE 损失。

**为什么是 max 不是 sum 或 attention**：max 隐含"硬选最匹配的那一个"，这就强迫每个 token 找到一个明确的对应物，而不是"模糊地分散到很多 token 上"。如果用 attention（soft），每个 patch 会和很多 token 都有关系，反而稀释了局部对齐信号。具体数字（消融）需读原文。

**数据与规模**：FILIP 在自建的 3 亿对图文数据上预训练（具体数字需读原文，量级在 CLIP 4 亿和 ALIGN 18 亿之间）。还做了图像增广和 prompt ensemble 来增强零样本评测。**重点不是数据量碾压，而是证明"即使数据不到 CLIP 一半，细粒度交互也能追上甚至超越"**。

## 实验在做什么

主要从四个维度评估，目标是证明"细粒度对齐确实带来更好的图文表征"：

- **零样本图像分类（Zero-shot ImageNet 等 12 个数据集）**：和 CLIP / ALIGN 在同 backbone 下比 top-1。FILIP 在多个数据集上超越同规模 CLIP，尤其是细粒度数据集（鸟类、车型、食物等）。具体数字需读原文。
- **零样本图文检索（Flickr30K、MS-COCO）**：图到文 R@1 / 文到图 R@1 提升明显，因为细粒度对齐天然适合"句子里某个细节对应图里某块"的检索。
- **下游迁移（线性探测、Linear Probing）**：把预训练好的视觉编码器冻住，在 ImageNet、VTAB 等下游任务上线性探测，看表征质量。FILIP 和 CLIP / ALIGN 持平或更好。
- **可解释性可视化**：展示训练完后，给定一个文本 token（比如 "dog"），可视化它在图像里 max 匹配到了哪些 patch——通常能定位到狗所在的区域。这是 CLIP 做不到的副产品。

消融实验关注：max vs mean vs attention 的对比；图文双向 max vs 单向；prompt ensemble 的贡献；数据规模的影响。具体数字需读原文。

## 你应该懂的几个新词 — 4-6 个

- **Patch token / Word token**：ViT 把图像切成 16x16 或 32x32 的小块（patch），每块编码成一个向量；BERT 把文本切成词或子词（word piece），每个也是一个向量。FILIP 在这两组 token 之间做匹配。
- **Late interaction（晚交互）**：图文各自独立编码到底（不互相 attention），只在最后一层算 token 级相似度。这是相对于 early interaction（单塔交叉注意力）的概念。FILIP 属于晚交互的一种。同期 ColBERT 在文本检索领域也用类似思路。
- **InfoNCE 损失**：对比学习的标准损失。把"匹配的图文对"当正样本，同 batch 里其他对当负样本，最大化正对相似度、最小化负对。FILIP 把相似度算法换了，但损失函数没变。
- **Token-wise max similarity**：对每个 token，在另一模态里取最大相似度。这是 FILIP 的核心算子。"硬"选择，而非软加权。
- **Dual encoder（双塔）**：图像编码器和文本编码器独立，最后只在向量空间做相似度。和单塔（cross-encoder）相对。FILIP 属于双塔，但相似度计算更精细。
- **Grounding（落地 / 接地）**：把语言里的概念对应到图像里的具体区域。FILIP 的 token-wise max 天然产生 grounding 信号，无需显式监督。

## 它和其他论文什么关系

- **直接前驱**：CLIP（2021）、ALIGN（2021）。FILIP 把这两者的全局对齐升级为细粒度。
- **思想近亲**：ColBERT（信息检索领域，2020），同样用"token 级 late interaction"替代单向量检索。FILIP 可以看作 ColBERT 在视觉-语言场景的实现。
- **同期对比**：DeCLIP / SLIP / DeFILIP 等都在尝试"如何用更少数据/更巧训练目标超越 CLIP"。FILIP 的路径是"换相似度算法"，DeCLIP 的路径是"加辅助任务"。
- **后续影响**：这种细粒度对齐思路被多个工作沿用。如果你在看 GLIP（2022, grounding 预训练）、X-VLM、FILIP 系扩展模型，理解 FILIP 的 token-level max 是基础。
- **下游联系**：在具身 AI / VLA 模型里，需要"指令里的物体名词对应到摄像头画面里的某个区域"，这正是 FILIP 学的东西。它是 grounding 类预训练的一个里程碑。

## 我建议这样读 — 3-4 步

1. **先复习 CLIP**：看清楚 CLIP 的相似度公式 `<v_global, t_global>` 和 InfoNCE 怎么用。如果这步不清楚，FILIP 的"改进点"无法体会。
2. **直接跳到 FILIP 方法图（Figure 2 或 3）**：看 token-wise max similarity 怎么算。手画一遍：N 个 patch 向量、M 个 token 向量，配 N×M 相似度矩阵，每行取 max 再平均。这一步搞懂，论文核心就掌握了 70%。
3. **看消融表（max vs mean vs attention）**：理解为什么"硬 max"比软加权好。这是设计直觉的关键。
4. **看可视化（grounding heatmap）**：感受一下 token 到 patch 的对应到底学到了什么。这是 CLIP 做不到的，也是 FILIP 价值的直观展示。

## 为什么值得读

- **算法思想优雅**：一个简单的"max + mean"操作，把粗对齐变细对齐，没增加推理成本。这种"小改动大效果"是值得学习的设计风格。
- **可解释性副产品**：免费得到 grounding map，对下游任务（检测、分割、机器人指令落地）非常有用。
- **VLM 演进的关键节点**：从 CLIP 到 GLIP / BLIP / Flamingo 这条线，FILIP 是"开始注意细粒度"的代表。理解它能帮你看懂后续一系列工作为什么走 token-level、region-level 路线。
- **对你（具身 AI 方向）的意义**：机器人/VLA 模型经常需要"把指令里的'红色杯子'对应到摄像头画面的某个区域"。FILIP 这类预训练就是在给这个能力打基础。读懂它，下游 VLA 论文里"为什么用细粒度对齐"的问题就不再神秘。
