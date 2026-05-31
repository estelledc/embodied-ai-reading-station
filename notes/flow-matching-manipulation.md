---
title: "Affordance-based Robot Manipulation with Flow Matching"
slug: flow-matching-manipulation
topic: diffusion-policy
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2409.01083"
venue: IROS
year: 2024
era: frontier
num: 44
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

这篇论文用 **流匹配（Flow Matching）** 替代扩散模型（Diffusion），把"随机采样的路径点"直接映射成"机器人完成任务的目标动作轨迹"。同时把 **affordance（可供性，物体可被怎么操作的属性）** 作为视觉输入的核心线索，让机器人先"看懂物体能怎么用"，再"流"出一条合理的动作轨迹。比起传统扩散策略（Diffusion Policy），它训练更简单、推理更快、轨迹更平滑。

## 这是个什么场景 — 日常类比

想象你教一个新人擀饺子皮。你不会一帧一帧告诉他手该往哪里走。你会先让他**看懂面团**（这是面团，可以擀、可以揉、可以捏，但不能切），这一步对应 **affordance**：识别物体能被怎么操作。

接下来你不会让他凭空想动作，而是给他一个**起手姿势**（手随便放在案板上某处），然后让他**慢慢调整**直到擀出一张合格的皮。流匹配做的就是这件事：从一条"随机起点的路径"出发，沿着学到的"流场"一步步形变，最后变成一条任务轨迹。

扩散模型像是"先扔一团乱麻，再一点点去噪"；流匹配更像是"画一条直线把起点和终点连上，让模型学这条直线的方向"——更直接，也更省步数。

## 之前的人怎么做的 — 3-5 bullet

- **行为克隆（Behavior Cloning, BC）**：直接学专家示范的"状态 → 动作"映射。问题是多模态动作（同一个状态可以有多种合理动作）会被平均，结果谁都不像。
- **Diffusion Policy（2023）**：把动作生成当作扩散去噪过程，能很好处理多模态。但训练目标是噪声预测，推理需要多步迭代，速度受限。
- **基于 affordance 的方法**：先用视觉模型预测物体的"可操作区域 / 可抓取点 / 接触关键点"，再接一个独立的轨迹规划器。问题是 affordance 和 action 是两阶段，误差会累积。
- **隐式策略（Implicit Policy）**：用能量函数表达 action 分布，能处理多模态但训练不稳定。
- **强化学习方法**：reward 难设计，sample efficiency 低，真机迁移代价高。具体数字需读原文。

## 这篇论文的关键想法

把两件事缝起来：

1. **用 affordance 做条件输入**：视觉编码器不再是端到端黑盒，而是显式预测"物体在哪里、能怎么操作"，把这个语义先验喂给动作生成器。
2. **用 flow matching 做动作生成**：不再像 diffusion 那样学"加噪—去噪"过程，而是直接学一个**速度场（vector field）**——给定当前状态（一个随机路径点）和时间 t，告诉机器人"下一步该往哪个方向移动"。这等价于学一个常微分方程（ODE）的右侧。

合在一起的好处：affordance 提供"做什么"的语义锚点，flow matching 提供"怎么平滑地走过去"的动力学。训练比 diffusion 简单（一个回归损失就行），推理比 diffusion 快（ODE 求解步数远少于扩散步数）。

## 它怎么做的（方法）— 3-4 段

**第一步：视觉编码 + affordance 预测。** 输入是 RGB（可能 + depth，具体需读原文）。模型先提取视觉特征，然后预测一组 affordance 表征——可能是关键点、热力图，或者是接触点的概率分布。这一步给后续动作生成提供"目标区域"的指引。

**第二步：构造 flow matching 的训练对。** 给定一条专家轨迹 $x_1$（终态，比如完整的动作序列），和一个随机采样的起点 $x_0$（高斯噪声或随机路径点），定义一条**插值路径** $x_t = (1-t) x_0 + t x_1$。训练目标是让网络预测的速度场 $v_\theta(x_t, t, c)$ 逼近真实速度 $x_1 - x_0$，其中 $c$ 是 affordance + 视觉条件。损失就是一个 MSE。

**第三步：推理时的 ODE 积分。** 训练完成后，从随机起点 $x_0$ 出发，按学到的速度场做欧拉积分（或更高阶求解器）：$x_{t+\Delta t} = x_t + v_\theta(x_t, t, c) \cdot \Delta t$。走若干步（论文具体步数需读原文，但一般比 diffusion 的几十步少很多），就得到目标动作轨迹 $x_1$。

**第四步：在真机或仿真上闭环执行。** 生成的动作轨迹通常是一个 horizon（比如未来 N 步），机器人执行其中一部分，然后重新观测、重新生成——这是典型的 receding horizon 控制思路，和 Diffusion Policy 一致。

## 实验在做什么

- **任务**：典型的桌面操作任务集合，例如抓取、推、开抽屉、插入等（具体任务列表需读原文）。
- **对比对象**：至少会和 Diffusion Policy、行为克隆、可能还有不带 affordance 的 flow matching ablation 比较。
- **指标**：成功率（success rate）、推理速度（每条轨迹生成耗时）、轨迹平滑度。
- **消融**：去掉 affordance 看掉多少分；改变推理步数看精度—速度权衡；不同视觉骨干的影响。
- **真机 vs 仿真**：IROS 论文一般至少有真机演示，具体平台（UR5 / Franka / xArm）需读原文。

阅读时重点看两组数字：**成功率提升了多少**（说明 affordance + flow matching 的组合是否真的有用），以及**推理时间比 Diffusion Policy 快多少**（说明 flow matching 相比 diffusion 的实际收益）。

## 你应该懂的几个新词 — 4-6 个

- **Flow Matching（流匹配）**：一种生成模型训练范式。学一个速度场，让"噪声分布"沿着这个场流动到"数据分布"。和 diffusion 是表亲，但训练目标更简洁（直接回归速度，不用学 score）。
- **Affordance（可供性）**：心理学/机器人学概念。指物体"提供给智能体的可能动作"。比如门把手的 affordance 是"被握住并旋转"。在 vision 里通常表现为关键点 / 热力图 / mask。
- **Vector Field（速度场）**：在每个空间点 $(x, t)$ 上定义一个方向向量。可以理解为"风的方向图"——你站在哪里，风会把你往哪里吹。
- **ODE（常微分方程）**：描述"位置随时间怎么变"的方程。flow matching 的推理就是在解一个 ODE：给我起点，按速度场积分，告诉我终点。
- **Receding Horizon Control（滚动时域控制）**：每次预测未来 N 步动作，只执行前 k 步，然后重新观测、重新预测。机器人控制和 Diffusion Policy 都常用。
- **Behavior Cloning（行为克隆）**：最朴素的模仿学习——直接监督学习"状态 → 动作"。本文比较的 baseline 之一。

## 它和其他论文什么关系

- **上游：Flow Matching for Generative Modeling（Lipman et al., ICLR 2023）**——本文用的生成框架来源。理解 flow matching 数学时去翻这篇。
- **同时代竞品：Diffusion Policy（Chi et al., RSS 2023）**——本文要超越的主要 baseline。两者解决同一类问题（多模态动作生成），但生成范式不同。
- **思想同源：affordance-based manipulation 系列**（如 CLIPort、VRB、Where2Act 等）——这些工作把 affordance 当作视觉先验，但通常配的是规划器或简单策略，本文把它配上 flow matching。
- **下游/类似时期：Rectified Flow（2023）、Consistency Models（2023）**——都在追求"更少推理步数"的生成模型，flow matching 是这一波里相对干净的方案。
- **机器人 manipulation 大家族**：可以放在"模仿学习 + 生成模型"分支下，和 ACT（Action Chunking Transformer）、RT-2、Octo 等并列对比生成范式选择。

## 我建议这样读 — 3-4 步

1. **先确认你懂 Diffusion Policy**：如果 Diffusion Policy 还没看过，先去读那篇，否则本文的 motivation 你会 get 不到——这篇的核心卖点之一是"比 diffusion 更快更简单"。
2. **补 flow matching 数学**：花半小时看 Lipman 2023 的前 3 节，搞懂"速度场—插值路径—回归损失"这套话术。看不懂数学也没关系，记住"flow matching = 学一个 ODE 的速度场"就能继续读。
3. **读本文的 method 部分，对照画图**：把"affordance 预测分支"和"flow matching 动作生成分支"分别画出来，标清楚输入输出。看看 affordance 是怎么作为条件喂进去的。
4. **跳到实验**：先看主表（成功率对比），再看推理速度对比，最后看消融（去掉 affordance 掉多少分）。如果数字不显著，说明 affordance 这个加法可能比较 marginal——这是判断论文价值的关键。

## 为什么值得读

- **范式切换的代表作之一**：在 manipulation 圈，diffusion → flow matching 的迁移正在发生，这是较早的一个落地。看完能理解"为什么大家开始换 flow matching"。
- **affordance 重新被重视**：一段时间里 affordance 被端到端大模型盖住了，但在数据稀缺、需要语义先验的 manipulation 场景，affordance 仍然有效。本文是一个工程化的范例。
- **实操价值**：训练简单（一个 MSE）、推理快（ODE 步数少），如果你要做真机操作 demo，这套架构比 Diffusion Policy 更友好。
- **承上启下**：往上接生成模型理论（flow matching / rectified flow），往下接具身智能里的 VLA 模型（很多 VLA 也开始用 flow matching 做 action head），是个不错的串联节点。
