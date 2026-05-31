---
title: "RoboMamba"
slug: robomamba
topic: vla
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2406.04339"
venue: NeurIPS
year: 2024
era: frontier
num: 120
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

RoboMamba 用 **Mamba**（一种状态空间模型，State Space Model，简称 SSM）替换掉传统 VLA（Vision-Language-Action，视觉-语言-动作模型）里的 Transformer 主干，目标是让机器人推理更快、显存更省，同时保留对视觉和语言的理解能力。它在 NeurIPS 2024 上提出，主打"高效"二字。

## 这是个什么场景 — 日常类比

想象你在厨房让机器人帮你拿东西。它要做三件事：

1. **看**（摄像头里有啥东西）
2. **听懂**（"把那个红苹果递给我"）
3. **动**（手臂的关节角度怎么转）

过去的 VLA（比如 RT-2、OpenVLA）靠 Transformer 把这三件事缝在一起。Transformer 就像一个"全员开会"的公司——每个员工都要听其他所有人发言，开会人数翻倍，开会时间是平方级增长。机器人摄像头给的图像 token 一多，它就开始卡。

Mamba 把"全员开会"改成"流水线传话"——每个人只看自己手上的纸条 + 上一个人传来的状态。开会人数翻倍，时间也只翻倍（线性增长）。RoboMamba 想用这个"流水线"重做机器人的脑子。

## 之前的人怎么做的 — 3-5 bullet

- **RT-2**（Google 2023）：把 VLM 直接当机器人策略用，动作离散化成 token，Transformer 一把梭，效果好但推理慢。
- **OpenVLA**（2024）：开源版 RT-2 路线，7B 参数，靠 LLaMA 主干，部署成本高。
- **Octo / Diffusion Policy**：用扩散模型出动作，但对语言指令的理解相对薄。
- 共同瓶颈：Transformer 的 **二次复杂度（quadratic complexity）**——序列越长越慢，机器人实时控制（要 10Hz+ 出动作）压力大。
- 还有一类做法是把 VLM 冻住只学一个小动作头（action head），但这样推理时整个 VLM 还得跑一遍，没省。

## 这篇论文的关键想法

核心赌注：**线性复杂度的 Mamba 主干 + 简洁的动作头，能在保持 VLA 能力的同时大幅降低推理开销。**

三个判断：

1. 视觉理解和指令理解不一定非得 Transformer。Mamba 在长序列建模上已经在 NLP 证明能跟 Transformer 打平。
2. 机器人动作输出本质上是个低维向量（关节角、夹爪开合），不需要超大的 decoder。
3. 训练阶段先学"看懂世界"（co-train 在通用 VL 数据上），再学"动起来"（在机器人数据上微调），可以用很少机器人数据撬动好的泛化。

## 它怎么做的（方法）— 3-4 段

**阶段 1：视觉-语言对齐预训练。** 把视觉编码器（比如 CLIP 或 SigLIP）的 patch 特征当 token，喂给 Mamba 主干，跟语言 token 混在一起，学图文配对、VQA 这类任务。这一步让 Mamba 学会"看图说话"。

**阶段 2：动作微调。** 在机器人数据集（论文里应该用了类似 RT 系列的真机数据 + 仿真数据，**具体数据组合需读原文**）上加一个轻量的 **policy head**，输入是 Mamba 最后一层的 hidden state，输出是末端执行器的位姿（end-effector pose）或关节增量。policy head 故意做得很小，因为 Mamba 主干已经把语义吃透了。

**Mamba 块里发生的事。** 简化讲，Mamba 用一个**选择性扫描（selective scan）**机制：每个 token 进来时，模型会根据内容动态决定"这个信息要不要留进状态、留多少"。这跟 RNN 的固定遗忘门不一样——它是数据相关的（input-dependent）。这让 Mamba 既有 RNN 的线性推理，又有 Transformer 的"按需关注"能力。

**推理时的优势。** Transformer 出每个 token 要看历史所有 token（KV cache 越来越大）；Mamba 只维护一个固定大小的 hidden state。机器人控制循环里这意味着延迟不随历史长度爆炸——对长 horizon 任务（比如"把桌上的东西收进抽屉"这种几十步操作）特别友好。

## 实验在做什么

论文应该围绕三类问题：

1. **能力对比**：在 SimplerEnv / VLABench 这类机器人 benchmark 上，跟 OpenVLA、RT-2 比成功率。具体数字需读原文。
2. **效率对比**：推理延迟、显存、参数量。Mamba 路线的卖点就是这里——通常会贴一张"延迟 vs 任务成功率"的散点图，证明自己在帕累托前沿。
3. **消融**：去掉 VL 预训练 / 换 Transformer 主干 / 改动作头大小，分别掉多少。这种消融能告诉你"哪个设计最关键"。

读论文时重点看实验段的 **延迟数字**和**长序列任务**——如果 Mamba 真有线性优势，应该在长 horizon 任务上拉开差距。

## 你应该懂的几个新词 — 4-6 个

- **VLA（Vision-Language-Action）**：视觉-语言-动作模型，吃图 + 指令，吐机器人动作。
- **SSM（State Space Model，状态空间模型）**：用一个隐状态向量在序列上线性递推的模型族，Mamba 是其中一员。
- **Selective Scan（选择性扫描）**：Mamba 的核心，让状态更新依赖当前输入内容，相当于"动态遗忘门"。
- **二次复杂度 / 线性复杂度**：Transformer 的注意力是 O(n²)，Mamba 是 O(n)，n 是序列长度。
- **Action Head（动作头）**：把语言模型 hidden state 映射成连续动作（关节角度等）的小 MLP。
- **End-effector Pose（末端执行器位姿）**：机械臂最末端那个夹爪在空间中的位置 + 朝向，通常 6 或 7 维。

## 它和其他论文什么关系

- **正面对比**：OpenVLA、RT-2-X、Octo——RoboMamba 主要在这些基线上证明"我更快"。
- **方法亲戚**：Mamba（Gu & Dao 2023）是它的主干来源；视觉那侧借鉴了 LLaVA / SigLIP 这些 VL 模型。
- **同期 Mamba × 机器人**：2024 年还有几篇试 Mamba 做策略网络的（比如 RoboMamba-style 的扩散策略变种），可以横向对照。
- **下游影响**：之后若有人做"边缘设备上的 VLA"（机器人上不了 A100），RoboMamba 这条线会被频繁引用。
- **互补关系**：跟 Diffusion Policy 不是竞争——Diffusion 强在动作多模态分布建模，Mamba 强在主干效率，理论上可以拼起来（Mamba 主干 + Diffusion 动作头）。

## 我建议这样读 — 3-4 步

1. **先看 Figure 1 + 表 1**（架构图 + 主结果表）。30 秒判断它到底比 OpenVLA 快多少、掉多少分。
2. **跳到方法章读 Mamba 块怎么接进 VLA**。重点搞清楚视觉 token 是怎么和语言 token 拼一起喂进 Mamba 的——顺序很关键。
3. **看消融实验**。特别是"换成 Transformer 同参数量"那行，决定了"Mamba 是不是真的有用"还是"只是因为参数少所以快"。
4. **如果时间够**，回头读 Mamba 原论文的 selective scan，否则方法章会看不懂为什么要"选择性"。

## 为什么值得读

- **趋势信号**：2024 年开始 Mamba 在视觉、机器人各路线都在试探，RoboMamba 是机器人这边比较早的一个公开尝试。读它能看清"非 Transformer 主干在 VLA 里能走多远"。
- **工程价值**：如果你以后要把 VLA 部署到真机（边缘 GPU 或者 Jetson），Transformer 的 KV cache 是真痛点。这篇给了一条不同路。
- **思维训练**：它示范了一个常见研究套路——"把 X 模型从 NLP 搬到机器人"。看它怎么处理视觉 token 顺序、怎么做两阶段训练，对自己设计类似工作有参考。
- **读完能讨论**：跟同事聊 VLA 时，能说出"线性 vs 二次复杂度对长 horizon 推理的影响"，比只会说"OpenVLA 很慢"高一档。
