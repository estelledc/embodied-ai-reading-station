---
title: "Navigation World Models"
slug: navigation-world-models
topic: world-model
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2412.03572"
venue: CVPR
year: 2025
era: frontier
num: 155
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

Navigation World Models（NWM）训练了一个 1B 参数的 Conditional DiT（条件扩散 Transformer），让智能体（agent）能够在第一人称视角下**预测"如果我往这边走、转那个角度，下一秒会看到什么"**——把"导航"这个动作问题，转成"预测下一帧画面"的视频生成问题。这样一来，规划路径就变成了"在脑子里先跑一遍、看看会撞墙吗"。

## 这是个什么场景 — 日常类比

想象你在一个陌生的酒店大堂，要去找电梯。你不会真的随机走一步看一步，而是会**先在脑子里"模拟"**：「如果我往左走 3 步、再右转 90 度，应该能看到电梯口」。这个"脑子里的模拟"就是世界模型（world model）。

NWM 干的事情和这个差不多：

- 输入：当前你看到的画面（一张或几张第一人称图）+ 一段拟执行的动作序列（往哪走、转多少度）
- 输出：未来若干秒你**应该会看到的画面**

它不是在地图上画路线，而是直接生成"未来的视频帧"。这种思路对机器人特别重要——很多场景没有事先建好的地图（mapless），你只有相机和自己的动作。

## 之前的人怎么做的 — 3-5 bullet

- **传统 SLAM + 规划**：先建几何地图（占用栅格 / 点云），再在地图上做 A*/RRT 规划。问题：依赖深度传感、对动态场景脆弱，且地图本身不会"想象未见过的画面"。
- **端到端 RL 导航**（如 Habitat 上的 PointNav baseline）：直接学 policy「画面 → 动作」。问题：sample efficiency 差，跨环境泛化弱。
- **早期视觉 world model**（Dreamer 系列、World Models Ha&Schmidhuber）：在 latent 空间预测下一步，主要在 Atari/DM Control，**未在真实第一人称导航的高分辨率视频上 scale**。
- **图像驱动导航**（image-goal navigation, ViNT 等）：用大模型学习"从当前图到目标图"的 policy，但仍以 reactive 为主，规划是隐式的。
- **视频生成模型**（Sora、AnimateDiff 等）：擅长生成漂亮视频，但**不以动作为条件、不可控**，没法用来规划。

NWM 的差异点：把视频生成的"质量"和导航的"动作可控性"合在一起。

## 这篇论文的关键想法

核心洞见：**导航的本质是"预测自己动作的视觉后果"**。如果一个模型能可靠回答"我执行这串动作后会看到什么"，那它天然可以：

1. 用来**做规划**：枚举多条动作序列，选一条预测画面"最像目标"的。
2. 用来**评估其他 policy**：把别的导航策略丢进 NWM 里跑，看它会不会"想象出撞墙画面"。
3. 用来**做数据增强**：在没有真机器人的情况下生成大量第一人称轨迹。

技术上的赌注：把扩散 Transformer（DiT，Diffusion Transformer，本来用来生图/视频的）**改成 action-conditioned 的形式**，并 scale 到 1B 参数级别。规模是关键——只有足够大的模型，才能在多样化的真实环境视频上学到"动作-画面"的因果关系。

## 它怎么做的（方法）— 3-4 段

**架构：Conditional DiT**

DiT 是把 Transformer 用在扩散模型里的做法（替代 U-Net）。NWM 在标准 DiT 上加了**动作条件**——每个动作 token（比如 "前进 0.5m + 左转 15°"）和噪声潜变量（latent）一起进 Transformer。生成目标是未来 N 帧的 latent，再用 VAE 解码回图像。1B 参数大致对应中等规模的视频扩散模型，具体层数/隐维度需读原文。

**训练数据：多源第一人称导航视频**

为了让模型见过足够多的环境，作者很可能混合了：户外 driving 数据（如 nuScenes 风格）、室内导航数据（Habitat / Matterport / RECON / SACSoN 等）、以及 ego-centric 视频。每条样本是「(过去几帧观察, 未来一段动作, 未来几帧观察)」。具体数据集组合和比例需读原文。

**动作表示**

第一人称导航的动作通常是**相对位姿**（relative pose）：(Δx, Δy, Δθ)，表示"相对当前姿态前进多少、转多少"。这种表示天然不依赖全局坐标系，跨环境通用。

**用世界模型做规划**

最直接的用法：**model-predictive control（MPC，模型预测控制）**。给定目标图像，sample 一批候选动作序列，每条丢进 NWM 生成预测画面，挑最接近目标的一条；然后执行第一步、重新规划。这种"在脑子里搜索"是 NWM 区别于 reactive policy 的核心。

## 实验在做什么

预期实验维度（论文应该覆盖大部分）：

- **生成质量**：FVD / FID 等视频生成指标，跨域评估 NWM 预测的画面和真实未来帧的差距。
- **导航成功率**：在 Habitat 等仿真器上跑 image-goal navigation，对比 reactive baseline（直接 policy）和有 NWM 规划的版本。
- **跨环境泛化**：训练集没见过的房间/街区上的表现，检验"世界模型"是否真的学到了通用的物理-视觉映射。
- **Scaling 实验**：从 100M 到 1B 参数，看生成质量和下游导航成功率怎么变。这一条对"为什么要 1B"是关键。
- **失败模式可视化**：当模型预测不准时，画面会"糊掉" / 出现幽灵物体——这些恰好是规划该避开的高不确定区域。

具体数字（成功率 / FVD / horizon 多长）需读原文。

## 你应该懂的几个新词 — 4-6 个

- **World Model（世界模型）**：能根据当前状态 + 动作预测未来状态的模型。早期是 latent 空间（Dreamer），NWM 是直接像素/视频空间。
- **DiT（Diffusion Transformer）**：用 Transformer 做骨干的扩散模型，由 Peebles & Xie 提出，Sora 类模型的核心架构。
- **Conditional Diffusion**：扩散模型的条件版——除了噪声 latent，还输入额外条件（文本、图像、动作）来引导生成。
- **Ego-centric / First-person**：第一人称视角，相机绑在 agent 身上看到的画面，区别于第三人称俯视图。
- **Image-goal Navigation**：导航任务的一种——目标用一张"目的地的照片"给定，agent 要走到能拍出这张图的位置。
- **MPC（Model Predictive Control）**：用一个 forward model 在脑子里 rollout 多条动作，挑最优的执行第一步，然后重新规划。NWM 的下游用法之一。

## 它和其他论文什么关系

- **延续 [world-models-ha](world-models-ha.md) / [dreamer-v1](dreamer-v1.md) / [dreamer-v2](dreamer-v2.md) 的"learn to imagine"传统**，但跳出 latent space，直接做 pixel/video 级别的世界模型。代价是算力，收益是表达力。
- **架构上和 [dit-policy](dit-policy.md)、[mmdiff](mmdiff.md) 同属 DiT 家族**，区别在于条件不是文本/语言，而是机器人/agent 的动作序列。
- **任务上和 [habitat](habitat.md) 仿真器、image-goal navigation 系列**对接——NWM 可以看作 Habitat 训练数据上的"反向"产物：从轨迹学回世界模型。
- **和 [cosmos-policy](cosmos-policy.md) 相关**：Cosmos 是 NVIDIA 的物理世界视频生成模型，思路同源（大规模视频生成 → 用于具身），但 Cosmos 更强调通用物理仿真，NWM 更聚焦导航。
- **和 [3drimr](3drimr.md) / [millimap](millimap.md) 这种"用感知建图再规划"的路线对比鲜明**：NWM 不显式建图，地图信息隐式存在权重里。

## 我建议这样读 — 3-4 步

1. **先看 Figure 1 + intro**：搞清楚"输入是什么、输出是什么、和谁比"。重点看 demo 视频——NWM 的卖点是视觉直观。
2. **跳到 Method 的架构图**：搞清楚动作 token 怎么注入 DiT、生成的是单帧还是多帧 latent、horizon 多长。
3. **看 MPC 怎么用 world model 规划**：这是"world model 不只是好看"的关键证据。理解 candidate 动作怎么 sample、怎么打分。
4. **回头扫 scaling 曲线和失败案例**：判断这个方向的天花板在哪、什么场景下还不行。

如果时间紧，看 1+3 就能 get 主要卖点。

## 为什么值得读

- **思路转换**：从"学 policy"到"学 world model"，是 embodied AI 当前的一个主线分歧。NWM 在导航这个具体任务上给了一个 frontier-scale 的样板。
- **架构借鉴**：DiT + action conditioning 的范式，可以迁移到 manipulation（参见 dit-policy）、driving、AR/VR 等场景。
- **未来方向的入口**：如果你关心 Cosmos、Sora-as-simulator、Genie 这些"视频生成做世界模型"的工作，NWM 是导航这条线的代表作，读完能更快搭起这个大方向的脉络。
- **CVPR 2025 frontier**：作为 2024 年底放出、2025 CVPR 的工作，它代表了"视频生成 × 具身"在这个时间点能做到什么程度——是后续跟进的基线参考。
