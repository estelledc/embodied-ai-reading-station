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

教机器人做事时，先让它看懂物体能怎么用，再用一种"画直线"式的方法直接生成动作——比扩散模型更快更稳。

## 这是个什么场景

想象你第一次进朋友家厨房，要帮忙做饭。朋友递给你一个削皮器——你看一眼就知道这玩意儿"应该握住把手、刀片对着萝卜削"，不会拿反，也不会去戳碗。这种"一看物体就知道它能怎么用"的能力，机器人学界叫 **affordance（可供性）**：物体本身在告诉你它能被怎么操作。

但光知道"能怎么用"还不够，你还得真的把手伸过去、调整角度、来回削。新手第一次削可能歪歪扭扭，慢慢练才能削得又快又匀。机器人面对的也是这个问题：**从一个随便摆出来的起手姿势，怎么一点点调整成一条干净利落的动作轨迹？**

过去主流答案是 **扩散模型（Diffusion）**——像是"先把一张照片打成一团雪花，再一帧一帧把它擦干净"，要走几十步去噪。这篇论文换成 **流匹配（Flow Matching）**：更像是"在起点和终点之间画一条直线，让模型学这条直线该往哪个方向走"。一样能从乱七八糟的起点走到目标动作，但步数少得多，也更直。

## 之前的人怎么做的 — 3-5 bullet

- **行为克隆（Behavior Cloning, BC）**：直接学专家示范的"状态 → 动作"映射。问题是多模态动作（同一个状态可以有多种合理动作）会被平均，结果谁都不像。
- **Diffusion Policy（2023）**：把动作生成当作扩散去噪过程，能很好处理多模态。但训练目标是噪声预测，推理需要多步迭代，速度受限。
- **基于 affordance 的方法**：先用视觉模型预测物体的"可操作区域 / 可抓取点 / 接触关键点"，再接一个独立的轨迹规划器。问题是 affordance 和 action 是两阶段，误差会累积。
- **隐式策略（Implicit Policy）**：用能量函数表达 action 分布，能处理多模态但训练不稳定。
- **强化学习方法**：reward 难设计，sample efficiency 低，真机迁移代价高。具体数字需读原文。

## 这篇论文的关键想法

像把"看菜谱"和"动手做"两个能力缝在一台机器里：

1. **用 affordance 做条件输入**——像菜谱上的高亮提示。视觉编码器不再是一个端到端黑盒（输入图、输出动作，中间不可解释），而是先显式说出"物体在画面哪里、它能被怎么操作"，把这个语义先验当作信号喂给动作生成器。
2. **用 flow matching 做动作生成**——像导航 App 给你箭头。不再走 diffusion 那种"加噪—去噪"的多步路线，而是直接学一个 **速度场（vector field，可以想成一张到处都是箭头的地图）**：你站在哪一点，箭头就告诉你下一步往哪走。数学上这等价于学一个 **常微分方程（ODE）** 的右边那项。

合在一起的好处：affordance 提供"做什么"的语义锚点，flow matching 提供"怎么平滑地走过去"的动力学。训练比 diffusion 简单（一个回归损失就行），推理比 diffusion 快（ODE 求解步数远少于扩散步数）。

## 它怎么做的（方法）

**第一步：视觉编码 + affordance 预测——像装修师傅先看墙。** 师傅不会上来就钻孔，会先盯着墙看一会儿，标记出"这里能挂、那里有水管不能动"。模型也一样：输入 RGB（可能 + depth，具体需读原文），先提特征，再预测一组 affordance 表征——可能是关键点、热力图，或接触点的概率分布。这一步给后续动作生成提供"目标区域"的指引。

**第二步：构造 flow matching 的训练对——像练字描红。** 老师给你一个标准范本（专家轨迹 $x_1$），再随便画一团乱线当起点（$x_0$，高斯噪声或随机路径点）。然后在两者之间画一条直线 $x_t = (1-t) x_0 + t x_1$，让你练习"在直线上任意一点，下一笔该往哪个方向描"。训练目标就是让网络预测的速度场 $v_\theta(x_t, t, c)$ 逼近真实速度 $x_1 - x_0$，其中 $c$ 是 affordance + 视觉条件。损失就是一个 MSE。

等等，先慢一拍——**速度场到底是个啥？** 想象一片湖面，每个点上都画了一个箭头，告诉漂在那里的小船往哪个方向漂。模型学的就是这张"箭头地图"，输入是"现在的位置 + 时间 + 要做的任务"，输出是"该往哪儿走"。

**第三步：推理时的 ODE 积分——像跟着导航走。** 训练完成后，从随机起点 $x_0$ 出发，按箭头地图一步步往前挪：$x_{t+\Delta t} = x_t + v_\theta(x_t, t, c) \cdot \Delta t$（这就是欧拉积分，初中物理里"速度乘时间等于位移"的连续版）。走若干步（论文具体步数需读原文，但一般比 diffusion 的几十步少很多），就得到目标动作轨迹 $x_1$。

**第四步：在真机或仿真上闭环执行——像开车不能闭着眼。** 生成的动作轨迹通常是未来 N 步，但机器人不会一次走完，而是只执行前几步，再重新看一眼环境、重新生成下一段——这是典型的 **receding horizon 控制**（滚动时域控制），和 Diffusion Policy 的做法一致。

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
