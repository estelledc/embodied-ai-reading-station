---
title: "Sigmoid Loss for Language Image Pre-Training"
slug: siglip
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2303.15343"
venue: ICCV
year: 2023
era: classic
num: 136
generated_at: 2026-07-01
---

> 这是一份写给"完全没接触过 AI"的读者看的精读笔记。公式一律翻译成人话，术语首次出现配类比。

## 一句话讲什么（TL;DR）

教模型"图配文字"，CLIP 的做法是让全班一起排名打分（softmax 对比），SigLIP 改成一对一判断"这俩是不是一对"（sigmoid 判断题）。改这一行损失函数，就换来了算得快、省内存、小批量也能学。

*所以这一节是想说：SigLIP 用"把排名题改成判断题"这个一行改动，让图文预训练更省更稳。*

---

## 这是个什么场景

想象你在玩一个"图配字幕"的小游戏。桌上摊着 N 张照片和 N 张字幕条，要把它们一一对应起来。有两种玩法：

- **CLIP 的玩法（连线题）**：每拿起一张照片，都得把所有 N 张字幕过一遍，比出哪个最像再连线。照片越多（batch 越大），连得越准，但脑子里要同时挂着所有候选。在 GPU 里，这意味着算一张 N×N 的相似度矩阵，再用 softmax 把每行归一化（把分数变成"在所有候选里占多少概率"）。
- **SigLIP 的玩法（判断题）**：把每张照片和每张字幕的组合都拎出来，单独问一句"这俩是一对吗？是/不是"。一共 N×N 道判断题，但每道之间互不打扰，答完一道丢一道，不用回头跟别的比。

> **batch（批量）**：训练时一次性喂给模型的样本数。对比学习里 batch 越大，一张图能见到的"错误候选"越多，学得越准，所以 CLIP 需要巨大的 batch。

判断题的好处很现实：可以分给好几张 GPU 同时做，不用等大家把答案凑齐再算总分；就算一次只发 100 道题（小 batch）也能学到东西，不像连线题非得堆够几万个候选才学得动。

*所以这一节是想说：SigLIP 面对的问题是"CLIP 那种全班排名的训练方式，对 batch 和显存太贪，工程上难伺候"。*

---

## 之前的人怎么做的，为什么不够好

- **CLIP（OpenAI, 2021）**：用 InfoNCE/softmax 对比损失，需要 batch 内所有图文对相互比较。batch 越大效果越好，常见 32k 起步。
- **ALIGN（Google, 2021）**：思路同 CLIP，softmax 对比 + 超大 noisy 数据集（18 亿对）。
- **BASIC / LiT（Google, 2021-2022）**：在 CLIP 上做规模和冻结策略探索，但 loss 没动。
- **Florence / CoCa**：把对比损失和 caption 生成损失混合，但对比那一支仍是 softmax。
- **共同痛点**：softmax 要算全 batch 的归一化项，分布式实现里需要 all-gather 把所有设备上的向量汇总到一起，通信开销随 batch 平方增长；大 batch 下还可能数值不稳定（log-sum-exp 爆炸）。

> **all-gather**：分布式训练里把每张 GPU 上的数据汇总到所有 GPU 的通信操作。softmax 对比损失依赖它，向量越多通信越贵。

*所以这一节是想说：CLIP 这条路效果好，但"必须大 batch + 依赖 all-gather + 大 batch 易数值爆炸"是三个绕不开的工程包袱。*

---

## 这篇论文的新想法

一句话类比：**像把"全班排名"改成"逐个面试"。**

- **拆题**：对每对（图像 i, 文本 j），单独贴个标签——i==j 是正样本（"这俩是一对"），i≠j 是负样本（"这俩没关系"）。用 sigmoid 函数 + 二元交叉熵（判断题最常用的那种损失）算 loss。
- **解耦**：N×N 个 pair 各算各的，没有跨 pair 的归一化项。分布式时不用把所有向量收回来汇总（不依赖 all-gather）。
- **校准**：判断题里"不配对"远多于"配对"（N 个正例 vs N²-N 个负例，batch=1000 时正负比 1:999）。论文加了两个**可学习的标量**——温度 t 和偏置 b——专门校准这个失衡。
- **连锁好处**：每张卡的内存从 O(N²) 降到 O(N)；batch 可以拉到 100 万，也可以缩到 1k 以下还能学。

*所以这一节是想说：SigLIP 的新意就是把损失从"softmax 排名"换成"sigmoid 判断"，一行改动解开了三个工程包袱。*

---

## 它分几步做的（方法）

这一节是全篇核心，拆成"损失形式、为什么加偏置、分布式实现、模型数据"四块。

先看损失对比的 ASCII 示意：

```
CLIP:   相似度矩阵 N×N ─► 每行 softmax 归一化 ─► 交叉熵   （需要全 batch 一起算）
SigLIP: 相似度矩阵 N×N ─► 每个格子独立 sigmoid ─► 二元交叉熵（每格各算各的）
```

### 第 1 步：损失形式——怎么打分

**输入**：一张图和一句文本。

**处理**：像两个翻译官各自把素材压成一串数字——图像编码器把图变成向量 x_i，文本编码器把句子变成向量 y_j。然后算它俩"像不像"：余弦相似度 cos(x_i, y_j)，再缩放加偏移：

```
s_ij = t · cos(x_i, y_j) + b
```

标签 z_ij = +1（是一对）或 -1（不是）。损失就是对所有 pair 求和：

```
loss = Σ  -log σ(z_ij · s_ij)
```

**输出**：一个数值，告诉训练"当前配对判断错得有多离谱"，越小越好。

### 等等，先慢一拍——σ 和 z·s 是什么？

**σ 是 sigmoid 函数**，把任何数压到 0 到 1 之间，可以读成"模型有多少把握认为这俩配对"。

**z·s 是个小技巧**：正样本希望相似度 s 大，负样本希望 s 小。乘上 ±1 之后，两边都变成"希望这个乘积越大越好"，损失就统一成一种形式，不用分正负样本写两套公式。

### 第 2 步：为什么要加偏置 b——为什么默认要"倾向于说不是"

**问题**：如果你猜每对图文是不是一对，随机蒙中的概率只有 1/N（batch 里只有一对真配的）。但 sigmoid 在 s=0 时默认输出 0.5——相当于"50% 觉得是一对"，这远高于真实先验，模型一开始就被海量"假阳性"淹没。

**处理**：把 b 初始化成一个很负的数（比如 -10），让 sigmoid 默认输出接近 0（"默认认为不配"）。训练就能聚焦在"把真正配对的那少数几个找出来"上，而不是把精力浪费在纠正一大堆本来就该说"不"的负样本。

**输出**：训练早期更稳、更快收敛。这是 SigLIP 工程上能 work 的关键细节。

### 第 3 步：分布式实现——让多张卡接力答题

**输入**：假设 8 张 GPU 一起做这堆判断题。

**处理**：朴素做法是把所有图文向量都广播到每张卡（all-gather），向量越多通信越贵。SigLIP 用"chunked"接力：每张卡只拿自己那一片向量，然后像传纸条一样**环形传递**文本向量（每轮传给下一个邻居），逐步把 N×N 个 pair 的 loss 累加完——全程不用一次性把所有向量塞进同一张卡。

**输出**：batch 几乎只受总显存约束，不再被单卡内存卡住。

### 第 4 步：模型与数据

**输入**：大规模图文对。

**处理**：Vision encoder 用 ViT（视觉版 Transformer），text encoder 用类似 BERT 的 Transformer。训练数据走 WebLI（Google 内部的大规模图文对，体量在十亿量级）。

**输出**：一组预训练好的图文对齐编码器。具体层数、参数量、step 数需查原文。

### 等等，先慢一拍——为什么"判断题"能省掉 CLIP 的大麻烦？

回到损失本身对比一下就清楚了。CLIP 用的是 softmax：对每一张图，它要在**整个 batch 的所有文本里**算一个"归一化的概率分布"，也就是"这张图配 A 文本的概率是多少、配 B 的多少……全部加起来等于 1"。这个"加起来等于 1"就要求每张卡都得看到 batch 里所有的文本向量才能算——batch 越大，要凑齐的向量越多，通信和显存开销就爆炸，而且 batch 一小，归一化的分母样本太少，估计就不稳。SigLIP 的 sigmoid 把它拆成一道道**独立的判断题**："这一对图文，匹配还是不匹配？"每对自己算自己的，不需要和别的对比较、不需要全局归一化。于是 batch 大小不再是损失能否算对的前提，只受显存约束；小 batch 也照样稳。这就是为什么"换个损失函数"这么一个看似微小的改动，能连带解开"必须超大 batch + 昂贵通信"这个死结。

*所以这一节是想说：SigLIP 的方法 = sigmoid 判断题损失 + 负偏置初始化校准失衡 + 环形接力的分布式实现，三者配合才让"换损失"真正落地，其根本在于 sigmoid 去掉了 softmax 那个"全局归一化"的枷锁。*

---

## 关键数字（What works）

> 下表整理关键设定与定性结论；各 batch 下的精确准确率请查原文 Table，此处不编造。

| 维度 | 说明 |
|------|------|
| 损失 | sigmoid（二元交叉熵），非 softmax |
| 显存/卡 | 从 O(N²) 降到 O(N) |
| batch 扫描范围 | 从 1k 一直扫到 100 万 |
| 小 batch（≤16k）表现 | sigmoid 显著优于 softmax |
| 大 batch 表现 | 两者接近，但 sigmoid 更稳、更省 |
| 数值稳定性 | softmax 大 batch 偶发 NaN，sigmoid 几乎不会 |
| 下游影响 | 成为 LLaVA、PaliGemma、Idefics 等 VLM 的常用视觉编码器 |

关键结论：**batch 不必贪大**。CLIP 让大家以为"必须堆几万 batch"，SigLIP 证明小 batch 下 sigmoid 反而更好，大 batch 下两者持平——也就是说"堆 batch"这件事的边际收益远没想象中大。

*所以这一节是想说：数字告诉我们，换成 sigmoid 后，训练在小 batch 和大 batch 两端都更省更稳，且下游可用性极强。*

---

## 实验结果说明了什么

- **Zero-shot ImageNet 分类**：同规模下 SigLIP 略胜或持平 CLIP/ALIGN，小 batch 下优势更明显。
- **图文检索（COCO / Flickr30k）**：sigmoid loss 下检索指标稳定提升，尤其小 batch。
- **Batch size 消融**：结论清晰——小 batch sigmoid 明显好；大 batch 接近，但 sigmoid 训练更稳、内存友好。
- **数值稳定性**：softmax 大 batch 偶尔 NaN，sigmoid 几乎不会。

综合起来，SigLIP 传递的信息是：**图文预训练的门槛可以降低**。你不需要天量 batch 和复杂的 all-gather，也能训出高质量的图文对齐模型。

*所以这一节是想说：实验证明"换损失"不是理论把戏，而是真的在准确率、稳定性、显存三方面都拿到了好处。*

---

## 你应该懂的几个新词

- **对比学习（contrastive learning）**：让"配对样本在向量空间里靠近、不配对的远离"的训练范式。CLIP/SimCLR/MoCo 都属此类。
- **InfoNCE / softmax 对比损失**：CLIP 用的损失，把"找到正确配对"建模成 N 选 1 的多分类，需要全 batch 归一化。
- **sigmoid 损失（二元交叉熵）**：把每个 pair 当独立判断题，σ(s)=1/(1+e^{-s})，loss=-log σ(z·s)。
- **温度 t（temperature）**：对相似度做尺度缩放，控制判断的"锐利度"，可学习。
- **偏置 b（bias）**：SigLIP 新引入的可学习标量，初始化为负值，校正正负样本的先验失衡。
- **all-gather**：分布式里把所有设备的张量汇总的通信原语；softmax 依赖它，sigmoid 不强依赖。
- **ViT（Vision Transformer）**：把图切成 patch 当 token 喂给 Transformer 的视觉主干。

*所以这一节是想说：这几个词是理解对比学习和现代 VLM 视觉编码器的通用基础。*

---

## 它有什么搞不定的

- **不是万能替换**：换 sigmoid 主要赢在工程（省、稳、小 batch 友好），下游极大规模下的绝对上限提升有限。
- **偏置初始化敏感**：b 没设好（比如初始化不够负）会导致训练早期被负样本淹没，效果打折。
- **依然依赖大数据**：SigLIP 省的是 batch 和显存，不是数据——WebLI 十亿级图文对仍是前提。
- **继承数据偏见**：和所有大规模网络图文训练一样，会学到数据里的社会偏见。
- **只是编码器**：它给的是图文对齐表征，不会"聊天"，要做对话 VLM 还得接语言模型（如 LLaVA 那样）。

*所以这一节是想说：SigLIP 是一次漂亮的工程简化，但它不改变"需要大数据、会继承偏见、只是编码器"这些底层事实。*

---

## 它和别的几篇是什么关系

- **直接前作**：[CLIP](clip.md)。SigLIP 是 CLIP 训练目标的一次"换损失"简化。
- **平行思路**：ALIGN / BASIC / Florence 走"扩大数据和规模"的路；SigLIP 走"损失更简单 + 工程更友好"的路。
- **后续影响**：SigLIP 权重被广泛当作视觉编码器给 [LLaVA](llava.md)、PaliGemma、Idefics 等 VLM 用，因为它在小算力下也能拿到好的图文对齐表征。
- **延伸版本**：SigLIP-2（2024）加了多语言、更高分辨率、shape-aware 等改进。
- **和机器人**：很多 VLA（如 [OpenVLA](openvla.md)、[RoboMamba](robomamba.md)）用 SigLIP 当"眼睛"，因为它省且好。

*所以这一节是想说：SigLIP 是 CLIP 之后"视觉编码器"这条线上最实用的一次迭代，是无数下游 VLM/VLA 的默认零件。*

---

## 和本导读的关系

本篇对应导读 [Ch08: VLM 地基 (I)——CLIP，教 AI 同时认图和认字](../guide/ch08-clip.md)。Ch08 讲的是"图文对齐"这个所有现代 VLM 的地基，CLIP 是奠基者，SigLIP 是把这个地基"打得更省更稳"的关键改良。读完 CLIP 再读 SigLIP，你就能理解为什么 2024 年后那么多 VLM（LLaVA、PaliGemma）在"选眼睛"时倾向 SigLIP 而不是原版 CLIP。

*所以这一节是想说：把 SigLIP 放进 Ch08 的图文对齐主线里读，它是 CLIP 的"工程升级版"。*

---

## 思考题

**Q1：为什么 sigmoid 损失在小 batch 下比 softmax 明显更好？**

<details>
<summary>提示</summary>

softmax 的归一化项需要足够多的负样本（大 batch）才能提供好的对比信号，小 batch 下候选太少、信号弱。sigmoid 把每对当独立判断题，不依赖 batch 内的相对排名，所以小 batch 也能学。
</details>

**Q2：偏置 b 如果初始化成 0（而不是很负的数）会发生什么？**

<details>
<summary>提示</summary>

sigmoid 默认输出 0.5，模型早期会认为"一半的组合都是配对的"，被 N²-N 个负样本产生的巨大梯度淹没，训练难以聚焦到真正的正样本上，收敛慢甚至学不动。
</details>

**Q3：为什么说 sigmoid 损失"不强依赖 all-gather"，这对分布式训练意味着什么？**

<details>
<summary>提示</summary>

softmax 每行归一化要看到全 batch 所有向量，必须 all-gather。sigmoid 每个 pair 独立，可以用环形接力分块累加，通信更轻，batch 上限由总显存而非单卡决定。
</details>

**Q4：SigLIP 证明"batch 不必贪大"，这对我们训练对比模型的资源规划有什么启示？**

<details>
<summary>提示</summary>

不用为了大 batch 去堆一堆卡做 all-gather。中小规模团队用 sigmoid 损失，在有限显存下也能训出可用的图文模型，门槛大幅降低。
</details>

**Q5：为什么这么多下游 VLM 选 SigLIP 当视觉编码器而不是 CLIP？**

<details>
<summary>提示</summary>

SigLIP 在相近甚至更小算力下能拿到质量不输 CLIP 的图文对齐表征，且训练更稳。对要拼装大 VLM 的团队来说，"省 + 稳 + 质量好"的眼睛最划算。
</details>

**Q6：sigmoid 损失把 N×N 个 pair 都当训练信号，其中绝大多数是负样本。这会不会导致训练被"简单负样本"主导？SigLIP 怎么缓解？**

<details>
<summary>提示</summary>

会有这个风险。负偏置 b 让模型默认就倾向说"不是"，于是大量"显然不配"的简单负样本产生的梯度很小，训练自然更多聚焦在难样本和正样本上。温度 t 也帮着调节判断的锐利度。
</details>

*所以这一节是想说：这几个问题带你把"softmax vs sigmoid、偏置校准、分布式通信、资源规划"这些核心点自己推一遍。*

---

## 一些好奇心问答（FAQ）

**Q1：SigLIP 和 CLIP 用起来有区别吗？**

用法几乎一样——都是给图和文各出一个向量，算相似度。区别只在训练损失。作为下游编码器，接口和 CLIP 兼容，很多库可以直接替换。

**Q2：我能用 SigLIP 做 zero-shot 分类吗？**

能。和 CLIP 一样：把类别名写成句子（"a photo of a cat"），编码成向量，和图像向量比相似度，最高的就是预测类别。

**Q3：温度 t 和偏置 b 是超参还是学出来的？**

都是**可学习参数**——训练时自动调整。这省去了手动调温度的麻烦，也是 SigLIP 稳定的一部分原因。

**Q4：为什么不用 SigLIP 的损失去改 SimCLR 那种纯视觉自监督？**

理论上可以，但 SigLIP 的收益主要来自"图文配对里正负极度失衡 + 需要大 batch"这个具体场景。纯视觉自监督的设置不同，收益不一定同样明显。

**Q5：SigLIP 和 SigLIP-2 该用哪个？**

要新项目直接用 SigLIP-2——它加了多语言、更高分辨率等改进。SigLIP-1 更多是理解"为什么 sigmoid 有效"的入门读物。

**Q6：读完 SigLIP 接下来看什么？**

先补 [CLIP](clip.md) 建立对比学习基线；再看 [LLaVA](llava.md) 理解 SigLIP 怎么被当"眼睛"接进对话 VLM。

*所以这一节是想说：用法、zero-shot、超参、版本选择这些实操问题都有明确答案，SigLIP 的上手门槛很低。*

---

## 如果你想再深入

按"前置 → 对照 → 下游"排序：

1. **前置：[CLIP](clip.md)** —— 建立对比学习和 softmax 损失的基线直觉，是读 SigLIP 的前提。
2. **对照：ALIGN / LiT** —— 看"扩大数据/冻结策略"这条平行路线，理解 SigLIP 的差异化。
3. **下游：[LLaVA](llava.md) / PaliGemma** —— 看 SigLIP 怎么被当视觉编码器接进对话 VLM。
4. **延伸：SigLIP-2** —— 多语言、高分辨率的升级版，实际用它。

*所以这一节是想说：把 CLIP + SigLIP + LLaVA 连起来读，就能把"图文对齐 → 视觉编码器 → 对话 VLM"这条线串通。*

---

## 原文信息

- 标题：Sigmoid Loss for Language Image Pre-Training
- arXiv：https://arxiv.org/abs/2303.15343
- 会议：ICCV 2023
- 年份：2023

BibTeX：

```bibtex
@inproceedings{zhai2023sigmoid,
  title     = {Sigmoid Loss for Language Image Pre-Training},
  author    = {Zhai, Xiaohua and Mustafa, Basil and Kolesnikov, Alexander and Beyer, Lucas},
  booktitle = {IEEE/CVF International Conference on Computer Vision (ICCV)},
  year      = {2023},
  url       = {https://arxiv.org/abs/2303.15343}
}
```

*所以整篇是想说：SigLIP 用"把排名题改成判断题"这一行损失改动，证明了图文预训练可以更省、更稳、门槛更低——这就是为什么它成了今天无数 VLM 的默认眼睛。*
