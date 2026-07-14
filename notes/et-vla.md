---
title: "Embodiment Transfer Learning for Vision-Language-Action Models"
slug: et-vla
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2511.01224"
venue: arXiv
year: 2025
era: frontier
num: 169
generated_at: 2026-07-14
---

# ET-VLA：把单机器人 VLA 迁移到多机器人协作

> 这是一份面向零基础读者的结构化研究笔记。本文只把公开论文文本和 arXiv 元数据能支持的结论写成事实；本站没有本地训练、仿真或真机复现实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

ET-VLA 讨论的是一个很实际的问题：OpenVLA 这类自回归 VLA 在单机械臂上表现不错，但一到双臂/多机器人协作，就容易生成错误数量的动作 token、分不清哪个机器人该做哪一步。

如果只记一个直觉：第 2 批都在回答同一个大问题：VLA 怎么从单一机器人、单一任务、单一动作空间，走向跨机器人、跨任务、跨数据源的 generalist policy。


*所以这一节是想说：ET-VLA 的价值在于补上 VLA 从单点能力走向跨 embodiment 扩展的一个关键环节。*

## 这是个什么场景

单人做饭只要决定自己下一步做什么；两个人一起做饭，还要分工、等待、同步、避免抢同一个锅。ET-VLA 像给 VLA 加了一份协作任务图：左手先拿香蕉，右手等一下，等香蕉放好再开始下一步。

```text
第 2 批主线：跨 embodiment VLA

异构数据 / 多机器人 / 推理数据 / 动作专家
          │
          ▼
   ET-VLA
          │
          ▼
让 VLA 更能处理身体差异、任务依赖和跨平台迁移
```

```text
机制通用图

[图像/语言/机器人状态]
          │
          ▼
[身体或数据源差异建模]
          │
          ▼
[动作生成模块：flow / token / MoE / graph]
          │
          ▼
[仿真或真实机器人成功率]
```

这个场景和普通 VLM 最大区别在于：身体差异会改变输出的含义。同样一个动作向量，在 WidowX、UR5、Aloha 或 xArm7 上可能代表完全不同的控制语义。模型如果不知道自己当前面对哪具身体，就像把汽车方向盘、游戏手柄和钢琴键盘当成同一种输入设备。


*所以这一节是想说：读 ET-VLA 要把它放进跨身体迁移和动作语义对齐的场景里。*

## 之前的人怎么做的，为什么不够好

现有 VLA 大多训练在 single-robot / unimanual 数据上。多机器人需要同时输出多个 embodiment 的动作序列，动作 token 数量和任务依赖都变复杂。OpenVLA 直接迁移到多机器人时成功率很低，甚至在多个真实任务上为 0%。

早期 VLA 的成功往往发生在相对固定的环境里：固定机械臂、固定相机、固定动作空间、固定任务分布。这样的结果很重要，但它离“一个模型能被很多机器人复用”还有距离。真实机器人生态更像一个混乱的仓库：每台机器人的关节数不同、夹爪不同、相机位置不同，采集数据的人也不同。

直接把这些数据混在一起，表面上是扩大数据规模，实质上可能制造冲突。一个数据源里的第 3 维动作可能是末端 x 位移，另一个数据源里第 3 维可能是某个关节角。模型如果没有专门机制区分这些语义，训练损失会被噪声污染。第 2 批论文的共同点，就是都在给这种异构性设计新的接口。


*所以这一节是想说：旧方法不够好，不是因为端到端路线错了，而是因为端到端还需要知道自己面对哪种身体和哪种动作语言。*

## 这篇论文的新想法

ET-VLA 提出两个核心组件：Synthetic Continued Pretraining (SCP) 用合成多机器人数据提前让模型熟悉新 embodiment 和正确 action token 数量；Embodied Graph-of-Thought (EGoT) 把复杂任务拆成图节点，显式表示子任务依赖、机器人角色和等待关系。

这个想法可以拆成两层：第一层是工程接口，告诉模型当前数据或任务属于什么身体、什么控制空间；第二层是学习机制，让模型既能保留共享知识，又不把彼此冲突的动作语义硬塞进同一个通道。前者决定能不能训练，后者决定能不能迁移。


*所以这一节是想说：ET-VLA 的新意是把跨 embodiment 的混乱差异变成模型显式可处理的条件或结构。*

## 它分几步做的（方法）

### 第 1 步：失败模式分析

**输入**：先把 OpenVLA 放到 multi-robot 场景中，观察它错在动作 token 数量、机器人分工、任务顺序和并行同步。输出是两个问题：缺 multi-robot prior，缺显式任务依赖表示。

**处理**：这一环的重点不是多加一个名字好听的模块，而是让模型知道“当前数据来自哪种身体、哪种任务、哪种动作接口”。如果不建模这些差异，VLA 会把不同机器人的动作语义混在一起，训练时看似数据更多，实际却更容易互相干扰。

**输出**：得到更稳定的跨 embodiment 表示或动作序列。用生活类比，这像给不同工具贴上清晰标签，再让同一个学徒学习工具背后的共同操作原则，而不是把所有工具混在一个箱子里盲摸。

### 第 2 步：Synthetic Continued Pretraining

**输入**：用同 batch 内采样和合成方式产生 multi-robot action token 数据，不依赖昂贵 teleoperation。输出是 warm-up 后能理解新 embodiment token 结构的模型。

**处理**：这一环的重点不是多加一个名字好听的模块，而是让模型知道“当前数据来自哪种身体、哪种任务、哪种动作接口”。如果不建模这些差异，VLA 会把不同机器人的动作语义混在一起，训练时看似数据更多，实际却更容易互相干扰。

**输出**：得到更稳定的跨 embodiment 表示或动作序列。用生活类比，这像给不同工具贴上清晰标签，再让同一个学徒学习工具背后的共同操作原则，而不是把所有工具混在一个箱子里盲摸。

### 第 3 步：Embodied Graph-of-Thought

**输入**：把每个 sub-task 作为节点，并标注 Grasp、Release、Waiting、End、Complete 等类型。输出是可解释的多机器人任务图。

**处理**：这一环的重点不是多加一个名字好听的模块，而是让模型知道“当前数据来自哪种身体、哪种任务、哪种动作接口”。如果不建模这些差异，VLA 会把不同机器人的动作语义混在一起，训练时看似数据更多，实际却更容易互相干扰。

**输出**：得到更稳定的跨 embodiment 表示或动作序列。用生活类比，这像给不同工具贴上清晰标签，再让同一个学徒学习工具背后的共同操作原则，而不是把所有工具混在一个箱子里盲摸。

### 第 4 步：真实双 UR5 实验

**输入**：使用两台 UR5e + Robotiq grippers + overhead RealSense D457，单 RGB 224x224 输入，设计 PickBread、PickFruits、WipePlate、InsertPlate、PullString、BuildBlocks 六个任务。输出是真实成功率对比。

**处理**：这一环的重点不是多加一个名字好听的模块，而是让模型知道“当前数据来自哪种身体、哪种任务、哪种动作接口”。如果不建模这些差异，VLA 会把不同机器人的动作语义混在一起，训练时看似数据更多，实际却更容易互相干扰。

**输出**：得到更稳定的跨 embodiment 表示或动作序列。用生活类比，这像给不同工具贴上清晰标签，再让同一个学徒学习工具背后的共同操作原则，而不是把所有工具混在一个箱子里盲摸。

### 第 5 步：仿真泛化

**输入**：在 RLBench2 和 RoboTwin 上比较 ACT、OpenVLA、Diffusion Policy 与 ET-VLA。输出是多机器人模拟 benchmark 的补充证据。

**处理**：这一环的重点不是多加一个名字好听的模块，而是让模型知道“当前数据来自哪种身体、哪种任务、哪种动作接口”。如果不建模这些差异，VLA 会把不同机器人的动作语义混在一起，训练时看似数据更多，实际却更容易互相干扰。

**输出**：得到更稳定的跨 embodiment 表示或动作序列。用生活类比，这像给不同工具贴上清晰标签，再让同一个学徒学习工具背后的共同操作原则，而不是把所有工具混在一个箱子里盲摸。

把这些步骤连起来看，方法并不是单纯追求更大的模型，而是在设计“差异该放在哪里”。有的差异适合放进 prompt，有的适合放进 graph，有的适合交给专家路由，有的适合用额外数据预热。真正读懂方法，就是能说清楚论文把哪类差异交给了哪个机制。


*所以这一节是想说：方法部分要按差异建模来读，才能看懂 ET-VLA 为什么不是普通 fine-tuning。*

## 关键数字（What works）

| 事实 | 数字 / 状态 | 来源与证据边界 |
|---|---:|---|
| 核心组件 | SCP + EGoT | Figure 1 / contributions |
| 真实机器人 | two UR5 robot arms + Robotiq grippers + RealSense D457 | Real-world setup |
| 真实任务数 | 6 collaborative tasks | Task description |
| 训练演示 | 50–100 demonstrations per task；20 epochs；16 A100 GPUs | Implementation details |
| ET-VLA 真实平均 | 46/77 = 59.74% | Table 4 |
| 去 EGoT | 29/77 = 37.66% | Table 4 |
| 去 SCP | 5/77 = 6.49% | Table 4 |
| RLBench2 | ET-VLA 10.2%；ACT 5.9%；OpenVLA 1.2% | Table 2 |
| RoboTwin | ET-VLA 40.1%；Diffusion Policy 27.7%；OpenVLA 4.1% | Table 3 |
| RoboTwin 示例 | Apple Cabinet Storage 85%；Block Handover 45% | Table 3 |

这些数字都来自论文报告，不代表本站本地复现。本站完成的是公开来源研究、Markdown/HTML 构建、provenance 和部署验证；没有训练模型、跑仿真或执行真机。


*所以这一节是想说：关键数字的作用是把方法和证据对应起来，而不是把作者报告冒充为本站实验。*

## 实验结果说明了什么

ET-VLA 的结果非常直观：真实双 UR5 六任务平均 59.74%，去掉 EGoT 掉到 37.66%，去掉 SCP 只有 6.49%。这说明多机器人迁移不是只靠 fine-tune 就能解决，模型既要提前学会多 embodiment action token 结构，也要在执行中显式跟踪任务依赖。

读实验时不要只看最高平均分。跨 embodiment 论文最该看的，是设计组件的消融：去掉 soft prompt 会怎样，去掉 SCP 会怎样，去掉 MoE 会怎样。如果核心组件一去掉就明显退化，说明它确实在处理论文声称的差异；如果只是整体大模型变大，那结论就弱得多。


*所以这一节是想说：实验结果支持 ET-VLA 的主张，但证据边界仍限于论文报告的 benchmark 和设置。*

## 你应该懂的几个新词

- Cross-embodiment：跨机器人身体。不是换个颜色，而是机器人结构、动作空间和传感器都可能不同。
- Soft prompt：可学习的提示向量。它不像自然语言 prompt 给人读，而是给模型读，用来编码数据源或任务差异。
- Mixture-of-Experts (MoE)：多个专家模块加路由器。输入来时只激活部分专家，让不同专家处理不同模式。
- Synthetic Continued Pretraining (SCP)：用合成数据继续预训练，让模型提前适应新 embodiment，而不是直接拿少量真数据硬微调。
- Graph-of-Thought：把任务推理写成图，而不是线性文本；适合表达并行、依赖和等待。
- Flow matching：一种连续动作生成训练方式，可以把噪声动作逐步推向真实动作分布。


*所以这一节是想说：这些词都围绕同一个核心：怎么让模型明白不同身体和动作接口之间的差异。*

## 它有什么搞不定的

- 真实实验仍是两台 UR5e 的双臂设置，不等于任意多机器人队伍。
- SCP 使用合成数据，合成分布和真实协作策略之间仍可能有 gap。
- EGoT 增强可解释性，但图结构本身需要设计任务类型和依赖模板。
- 平均成功率 59.74% 说明方法明显优于基线，但离稳定部署还有距离。

这些局限不是失败，而是具身 AI 的真实难度。跨 embodiment 一旦进入真实部署，就会遇到安全、校准、接触力、延迟、长程任务和硬件维护问题。论文解决的是建模和评测的一部分，不是整条机器人产品链。


*所以这一节是想说：ET-VLA 推进了跨 embodiment VLA，但离通用可靠机器人仍有工程和安全距离。*

## 它和别的几篇是什么关系

- 它和 LoHoVLA 都关心长程/分层任务，但 ET-VLA 更关注多机器人协作。
- 它和 X-VLA / HiMoE-VLA 都处理 embodiment transfer，ET-VLA 的切入点是从单机器人迁移到多机器人。
- 它与 OpenVLA 关系最直接：不是推翻 OpenVLA，而是在其基础上补 SCP 和 EGoT。

第 2 批适合和第 1 批连读：第 1 批偏统一 VLA 与扩散式动作解码，第 2 批偏跨 embodiment 和异构数据。两批合起来，能看到 2025–2026 前沿 VLA 的两条主线：动作怎么生成，以及不同身体怎么共享同一套知识。


*所以这一节是想说：ET-VLA 是跨 embodiment 线上的一块拼图，最好和 X-VLA、ET-VLA、HiMoE-VLA、Qwen-VLA 互相对照。*

## 和本导读的关系

本篇对应导读中的 [Ch04: 技术版图](../guide/ch04-landscape.md)、[Ch12: VLA](../guide/ch12-openvla-vlas-mla.md) 和 [Ch17: Sim-to-Real](../guide/ch17-sim-to-real.md)。读它之前，建议先理解 RT-1/RT-2 为什么要动作 token 化，OpenVLA 为什么是开源基线，以及 π0 为什么转向连续动作/flow matching。

对 40 篇扩展计划来说，ET-VLA 属于第 2 批，负责补“跨 embodiment / 异构数据 / 多机器人迁移”这条线。


*所以这一节是想说：这篇笔记把 VLA 从单机器人模型推进到跨身体、跨数据源、跨任务的工程问题。*

## 思考题

**Q1：这篇论文说的 embodiment 差异主要是哪一种？**

<details>
<summary>提示</summary>

区分 action space、robot body、sensor setup、task dependency、reasoning data。

</details>

**Q2：它解决的是预训练问题、适配问题，还是动作解码问题？**

<details>
<summary>提示</summary>

看方法发生在数据混合、backbone、action head、fine-tuning 还是推理阶段。

</details>

**Q3：关键数字中最能支撑论文主张的是哪一个？**

<details>
<summary>提示</summary>

优先找和它的核心设计直接相关的消融，而不是只看最高成功率。

</details>

**Q4：如果换一台完全不同的机器人，它还需要什么额外数据？**

<details>
<summary>提示</summary>

注意 soft prompt、SCP、MoE routing 或 action projection 是否仍要适配。

</details>

**Q5：它和 Qwen-VLA / OpenVLA / π0 的差异是什么？**

<details>
<summary>提示</summary>

从统一任务、动作生成、跨 embodiment、数据引擎四个维度比较。

</details>

**Q6：你会如何设计一个最小复现实验？**

<details>
<summary>提示</summary>

选择最小 benchmark 和最清楚的 ablation，不要一开始就上真机。

</details>

## 一些好奇心问答（FAQ）

**Q：跨 embodiment 是不是只要多喂数据就行？**

不是。数据越多，冲突也可能越多。关键是模型要知道哪些差异该共享，哪些差异该隔离。

**Q：这些方法能直接零样本换机器人吗？**

多数不能。它们降低了适配成本，但通常仍需要 soft prompt、SCP、fine-tuning、LoRA 或少量目标机器人数据。

**Q：为什么第 2 批大多还是 VLA 主题？**

因为 2025–2026 的前沿很集中：大家都在把 VLA 从单一模型推向跨 embodiment generalist policy。

**Q：这些成功率能不能直接写进简历？**

可以写成阅读站收录和整理的论文报告数字，但不能写成自己复现实验结果。没有本地 artifact 就不能升级证据等级。

## 如果你想再深入

1. 先读 OpenVLA、π0、Qwen-VLA，建立 VLA 基础。
2. 再把 X-VLA、ET-VLA、HiMoE-VLA 放在一张表里比较：差异建模在哪里发生。
3. 复现时优先选小 benchmark 和最小 ablation，而不是直接上多机器人真机。
4. 读论文表格时，把最高分和消融分开记录，避免被平均分带偏。

## 原文信息

- arXiv: [2511.01224](https://arxiv.org/abs/2511.01224)
- 本站状态：公开来源研究；未做本地训练、仿真或真机复现；human verification 仍应保持 UNVERIFIED，直到逐节人工核验完成。

```bibtex
@misc{et_vla_2025,
  title = {Embodiment Transfer Learning for Vision-Language-Action Models},
  year = {2025},
  eprint = {2511.01224},
  archivePrefix = {arXiv},
  primaryClass = {cs.RO},
  note = {Read through Embodied AI: Zero to One},
  url = {https://arxiv.org/abs/2511.01224}
}
```
