---
title: "ManiSkill"
slug: maniskill
topic: sim
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2107.14483"
venue: NeurIPS
year: 2021
era: classic
num: 102
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

ManiSkill 是教机器人开抽屉、开柜门这种家具的**统一考场**——
专测它练完几十个柜子之后，能不能上手没见过的第 101 个。

## 这是个什么场景

你第一次去朋友家做客，主人说"冰箱里有可乐自己拿"。
你走过去，面对一个**从没见过的冰箱**——把手位置不一样、开门方向不一样、
甚至是那种要按一下才弹出来的隐藏式——但你照样能开。

人觉得理所当然。但机器人不行。
现在的机器人通常是"把家里那个抽屉练熟到飞起"，换一个长得不一样的抽屉就懵了。
真正想要的是：**练完一批抽屉，遇到新抽屉也能上手**。

ManiSkill 干的事，就是把这种"一类动作 + 一堆形状不同的同类家具"打包成一个考场：

- 给你 N 个不同形状的抽屉/柜门/椅子/水龙头
- 告诉你"目标是把它打开/推到那个位置"
- 划好训练集和测试集（**测试集里全是没见过的实例**）
- 比赛谁的策略在新物体上做得好

不再是"我自己造个 demo，自己说我 SOTA（state of the art，当前最强）"。

## 之前的人怎么做的 — 3-5 bullet

- **Meta-World、RLBench、robosuite**：任务很多，但物体大多是**刚体**（block、peg、cube），
  不太涉及"门会转、抽屉会拉、龙头会扭"这种带关节的物体
- **专门做 articulated manipulation 的工作**：通常每篇论文自己造一个小数据集 + 一个仿真环境，
  没有统一的资产、统一的指标
- **物理仿真器层面**：MuJoCo、PyBullet 主要面向刚体；SAPIEN（同一团队的工作）专门为**关节物体**做了高质量物理 + 渲染
- 缺一个站在 SAPIEN 之上、**专门考关节物体操作技能 + 强调泛化**的标准 benchmark
- 这些痛点合起来导致：你说你的方法"能开门"，别人没法在同一条件下复现 / 比较

## 这篇论文的关键想法

像驾校改革：以前是"在自家小区里反复练同一辆桑塔纳"，现在是"练完十几辆不同的车，
还要去陌生路考一辆没摸过的"。论文做的就是这种规范化升级：

1. **以技能（skill）为单位组织任务**——每个技能（OpenCabinetDoor 开柜门、PushChair 推椅子、
   MoveBucket 搬桶）下面挂**一批形状不同的具体物体**，像驾校的"科目二"下面挂十种考车
2. **训练集和测试集划在不同物体上**：见过的柜子不会出现在考场里，
   逼算法学"开柜门这件事本身"，而不是死记某一个柜子长啥样
3. **同时提供点云 / RGBD / 关节角等多种观测形式**，让"用 3D 视觉的"和"用低维状态的"
   两派研究者都能进来比
4. 顺手配套一批**人类示范（demonstrations，相当于教练打的样）**，
   让模仿学习 / offline RL 等不只跑纯 RL 的方法也能上手

一句话：**关节物体操作的 ImageNet 雏形**——任务统一、实例多样、看泛化。

## 它怎么做的（方法）— 3-4 段

**仿真器选型**。底层用 SAPIEN：它原生支持关节物体（URDF 描述、joint 限位、接触摩擦），渲染也比 PyBullet 好，可以渲染高质量 RGBD 和 segmentation mask。点云可以直接从深度图里反算，省得自己写。

**任务定义**。每个任务对应一个"技能 + 一批同类物体"。比如"OpenCabinetDoor"下面挂几十上百个不同形状的柜子（来自 PartNet-Mobility 这种 3D 资产库），每个都有合法的关节定义。任务的 reward 是"目标关节是否被推到指定状态"（比如门开到 90 度），加上一些 shaping 项辅助 RL 训练。

**观测和动作**。观测层面提供 **state（关节角、末端位置等低维量）/ pointcloud / rgbd** 三档，让不同方法都能跑；动作空间一般是末端位姿增量或关节速度，具体形式需读原文。这个"多档观测"的设计是关键，因为做 3D policy 的人和做 state-based RL 的人，需要的输入不一样。

**Demonstrations 与基线**。论文配套放了一批 demonstrations（来源可能是 motion planning 或人类遥操，具体需读原文）和几个基线方法（包括 BC、SAC 等常见 baseline），把"在新物体上的成功率"作为主要指标，建立了一个**可被后续工作刷的榜**。

## 实验在做什么

实验主要回答三类问题：

- **常规 RL/IL baseline 在 ManiSkill 上能到什么水平**：BC、纯 RL（如 SAC/PPO）、BC+RL 混合，在每个技能上的成功率分别是多少
- **泛化 gap 有多大**：训练物体上的成功率 vs 测试物体（没见过的实例）上的成功率，差距通常很显著，
  说明这个 benchmark **抓到了"对新实例泛化"这个真问题**
- **观测形式的影响**：state-based 通常上限高但不现实；point cloud / RGBD 更接近真实机器人，但更难学

具体数字（每个任务的成功率、训练 vs 测试 gap、不同 baseline 的 ranking）需读原文。

后续 ManiSkill 2、ManiSkill 3 在这个基础上扩任务、扩规模，思路一脉相承。

## 你应该懂的几个新词 — 4-6 个

- **articulated object（关节物体）**：内部有可动关节的物体，比如抽屉（平移关节）、门（转动关节）、剪刀（铰链）。
  和 rigid body（刚体，整体动）相对
- **PartNet-Mobility**：一个开源 3D 资产库，给每个家具/工具都标好了关节，是 SAPIEN 系列工作的"物体来源"
- **SAPIEN**：同团队的物理 + 渲染仿真器，原生支持关节物体；ManiSkill 是它上面的 benchmark
- **train/test split on instances**：训练用一批物体实例，测试换一批没见过的同类实例。
  和"把同一物体的不同 episode 划训练测试"相比，这种划分**对模型泛化要求高得多**
- **demonstration**：示范轨迹，给模仿学习 / offline RL 用的"已知比较好的解"
- **success rate（成功率）**：典型评测指标——任务目标是否在限定步数内被达成（如门是否被开到 90 度）

## 它和其他论文什么关系

- 上游：**SAPIEN（ICRA 2020）** 提供物理 + 渲染底座；**PartNet-Mobility** 提供物体资产
- 同代 benchmark：**Meta-World**（多任务但偏刚体）、**RLBench**（CoppeliaSim 上的多任务）、
  **robosuite**（MuJoCo 上的标准化机械臂环境）。
  ManiSkill 的差异点是**关节物体 + 实例级泛化**
- 后续：**ManiSkill 2 / 3** 把任务和资产扩得更大；**RoboCasa、LIBERO** 这种新一代 benchmark 在场景丰富度和语言指令上更进一步
- 算法侧：**Diffusion Policy / 3D Diffusion Policy / Equibot** 这些 3D policy 方法常常拿 ManiSkill 系列当评测场之一
- 数据集侧：和 **CALVIN、RoboCasa** 一样，是"模拟器派"的代表，和真机数据派（**Open X-Embodiment、DROID、BridgeData V2**）形成互补

## 我建议这样读 — 3-4 步

1. 先看**任务列表 + 一两张 GIF/截图**，搞清楚每个 skill 长什么样（比如 OpenCabinetDoor 是怎么个开法）
2. 重点读 **train/test split 的设计**和 **observation 三档（state/pointcloud/rgbd）**那一节，
   理解为什么这两个设计是"benchmark 价值"的核心
3. 看 baseline 在训练物体 vs 测试物体上的成功率差距，建立"泛化 gap"的直觉
4. 如果是为了做 3D policy / imitation learning 研究，去 ManiSkill 2 / 3 的文档继续看，
   会比 v1 信息更新、可用资产更多

## 为什么值得读

- **理解"benchmark"这件事到底要做什么**：它不只是"加几个任务"，而是把"训练/测试划分"
  和"观测形式"这两个设计抬到一等公民的位置
- ManiSkill 是后续很多 manipulation benchmark / policy 论文的**评测背景板**，
  不熟悉它会看不懂"为什么大家都在 OpenCabinetDoor 上比划"
- 关节物体这条路线代表了"从堆积木到操作真实家具"的一次抬升，是仿真 benchmark 走向实用的关键一步
- 对 Jason 这样想入门 embodied AI 的人，把 SAPIEN → ManiSkill v1 → v2 → v3 串起来读一遍，
  可以建立"模拟器 + benchmark"这条线的完整地图
