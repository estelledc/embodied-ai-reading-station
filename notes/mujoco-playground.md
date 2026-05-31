---
title: "MuJoCo Playground"
slug: mujoco-playground
topic: sim
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2502.08844"
venue: arXiv
year: 2025
era: frontier
num: 108
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

一个 `pip install` 就能装好的开源仿真平台，让机器人先在电脑里把走路、抓东西练熟，再几乎原样搬到真机上跑。

## 这是个什么场景 — 日常类比

想象你要教小孩骑自行车——但每摔一次都要送医院。最稳的办法是先在家里铺垫子练，等孩子稳了再上街。机器人学走路也一样：真机摔一次少则几千、多则几十万，所以大家都先在电脑里仿真练熟，再放到真机上去。

问题是这套"仿真练熟 → 真机部署"的链路以前像**自己装修房子**：仿真器从 A 家买（比如 Isaac Gym，NVIDIA 闭源生态）、奖励函数自己写、域随机化（Domain Randomization，故意在仿真里加随机扰动让策略变皮实）自己调、真机部署代码再单独搞——每一块都是不同的房东、不同的合同、不同的押金。装环境就要花一周。

MuJoCo Playground 的做法像**全包民宿**：仿真器（MJX，MuJoCo 的 JAX 版本）、训练任务（locomotion / manipulation / dexterous）、训练算法（PPO / SAC）、真机部署示例全都在一个仓库里，开箱即用。而且因为 MJX 跑在 JAX 上，仿真和神经网络在**同一张 GPU 的同一段内存**里跑，省掉了传统 PyTorch + C++ 仿真器之间来回搬数据的开销。

## 之前的人怎么做的 — 3-5 bullet

- **Isaac Gym / Isaac Lab**（NVIDIA）：GPU 并行最早最强，但闭源、依赖 NVIDIA 全家桶，且 PhysX 接触求解对软体/精细接触不友好
- **MuJoCo（CPU 版）**：物理仿真品质是金标准，但 CPU 跑 4096 个并行环境慢得像爬
- **PyBullet / Gazebo**：开源够老，但没 GPU 并行，训练一个 locomotion 策略要几天
- **Brax**（Google）：JAX 仿真器先驱，但物理保真度不如 MuJoCo，sim-to-real gap 大
- **各家自研栈**：每个实验室有一套私有 wrapper，论文复现门槛高

## 这篇论文的关键想法

**核心三件事**：

1. **MJX 当底座**——像把烧柴的老灶台换成集成灶。MuJoCo 物理引擎本来跑在 CPU 上，作者把它整个重写成 JAX 版本，于是同样的物理引擎能 GPU 并行 + 自动微分 + JIT 编译。仿真精度对齐 CPU 版 MuJoCo，但单卡能跑几千个并行环境

2. **统一任务套件**——像超市里给所有家电统一了插头。把 locomotion（四足/双足走路）、manipulation（机械臂抓取）、dexterous（灵巧手）三大类任务塞进同一个 API 下，换任务只换一行 config

3. **闭环到真机**——像考完驾照直接给你配好车钥匙。自带 sim-to-real（仿真训练→真机部署）pipeline：域随机化参数模板、ONNX（一种跨框架的神经网络模型格式）导出、真机部署示例代码（针对 Unitree Go1/G1、Franka 等常见平台）

诚实标签：具体并行环境数量、训练 wall-clock、覆盖任务数等数字需读原文 + repo README。

## 它怎么做的（方法）— 3-4 段

**仿真层（MJX）**。MuJoCo 的核心数据结构（`mjData` / `mjModel`）被改写成 JAX `pytree`，每一步物理仿真变成一个可 `jax.vmap` 批处理的纯函数。这意味着 4096 个机器人环境在 GPU 上是一个**张量批次**，不是 4096 个进程。代价是某些 CPU MuJoCo 的功能（比如复杂的 mesh-mesh 接触）在 MJX 里有简化，需要建模时绕开。

**训练层**。PPO、SAC 等算法用纯 JAX 实现（基于 Brax 的训练 loop），策略网络、环境、优化器全部 `jit` 进同一个计算图。一个 step 里"采样 → 算 reward → 反传梯度"端到端不出 GPU。这是为什么 locomotion 任务能在**几分钟到一小时**量级训练完，而不是 Isaac Gym 的几小时。

**任务层**。每个任务是一个继承统一基类的 Python 类，定义 `reset` / `step` / `reward` / `observation`。Playground 给了 30+ 现成任务（具体数字需读原文），覆盖：四足走/跑/翻身、双足平衡、机械臂 pick-and-place、灵巧手物体重定向。所有任务都默认带域随机化配置（质量、摩擦、电机增益、传感器噪声）。

**部署层**。训练完的策略用 ONNX 或 JAX→Flax→numpy 路径导出，给真机的 ROS / 自家 SDK 调用。文档里有 Unitree、Franka 等常见硬件的最小示例，演示从 sim policy 到真机能跑的完整流程。

## 实验在做什么

- **算力对比**：在单张 GPU 上和 Isaac Gym / Brax / CPU MuJoCo 比训练 throughput 和 wall-clock，论证 MJX 在精度对齐 MuJoCo 的同时性能逼近 Isaac Gym
- **任务覆盖**：跑通三大类任务的 baseline 训练曲线，证明框架不是只对某一类有效
- **Sim-to-real**：在真机上验证训练好的策略（至少 quadruped locomotion 这一类）能 zero-shot 迁移
- **可复现性**：所有任务/配置/checkpoint 公开，配套 colab notebook

具体 throughput 数字、真机迁移成功率、对比的算法版本等需读原文。

## 你应该懂的几个新词 — 4-6 个

- **MJX**：MuJoCo for JAX，把 MuJoCo 物理引擎改写成 JAX 函数，能 GPU 并行 + 自动微分。物理保真度对齐 CPU MuJoCo
- **JAX**：Google 出的"NumPy + 自动微分 + JIT + GPU"框架。和 PyTorch 哲学不同：偏向**纯函数 + JIT 编译整张图**，适合"环境和模型一起放进 GPU"的场景
- **域随机化（Domain Randomization, DR）**：训练时随机扰动仿真参数（质量、摩擦、传感器噪声），让策略学会鲁棒，缩小 sim-to-real gap
- **Sim-to-real**：策略在仿真训练，部署到真机。中间的"真机表现下降"叫 sim-to-real gap
- **PPO / SAC**：两种主流强化学习算法。PPO（Proximal Policy Optimization）更稳定，是 locomotion 的事实标准；SAC 是 off-policy，sample efficiency 更高，适合 manipulation
- **Pytree**：JAX 里"嵌套的 dict/list/tuple，叶子是 array"的数据结构。`jax.vmap` 能自动批处理整棵 pytree

## 它和其他论文什么关系

- **vs Isaac Gym / Isaac Lab**（[isaac-gym](isaac-gym.md) / [isaac-lab](isaac-lab.md)）：直接竞品。MJX Playground 的优势是开源 + Mac/Linux/Windows 都能跑 + 物理保真度更稳；Isaac 的优势是生态成熟、有 PhysX 的特殊优化
- **vs Brax**：MJX 是 Brax 的精神继承者。Brax 物理简化太多，MJX 在性能和精度间找了更好的平衡
- **vs Robosuite / Robocasa**（[robosuite](robosuite.md) / [robocasa](robocasa.md)）：Robosuite 偏 manipulation 任务库，仿真器是 CPU MuJoCo；Playground 是 GPU MuJoCo + 跨任务类别
- **vs Habitat / SAPIEN**（[habitat](habitat.md) / [sapien](sapien.md)）：那俩偏视觉导航 / 室内场景；Playground 偏物理控制
- **后续 / 周边**：Playground 是 Pi0、HumanPlus、ANYmal 等做"先 sim 训再 deploy"研究的标准底座之一

## 我建议这样读 — 3-4 步

1. **先跑 colab**：repo 里有 1 click colab，5 分钟看到一个 quadruped 学走路。直观感受"这框架能干啥"
2. **读 paper 的 method 章节**：重点看 MJX 怎么把 MuJoCo 改成 JAX 版的（pytree 化、jit 边界、不能用什么 feature）
3. **读一个具体任务的代码**：选 `locomotion/go1_joystick.py` 或类似，对照 `reset` / `step` / `reward` / DR 配置，看一个完整任务长什么样
4. **真机部分按需读**：如果你做 sim-to-real，重点看 ONNX 导出 + Unitree 部署示例

## 为什么值得读

三个理由：

1. **它是 2025 年开源 RL 仿真的事实标准之一**。要做机器人 RL，要么用 Isaac，要么用 MJX Playground，没有第三个选项有同等成熟度
2. **JAX 范式的好教材**。看完这套代码就理解了"为什么 JAX 在 RL 训练里比 PyTorch 更香"——env 和 policy 在同一张计算图里
3. **降低准入门槛**。以前做机器人 RL 要 NVIDIA 卡 + Linux + 一周装环境，现在 Mac 都能起步。对零基础学习者意义巨大
