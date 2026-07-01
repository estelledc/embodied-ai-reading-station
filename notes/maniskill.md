---
title: "ManiSkill"
slug: maniskill
topic: sim
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2107.14483"
venue: NeurIPS
year: 2021
era: classic
num: 102
generated_at: 2026-07-01
---

# ManiSkill: Generalizable Manipulation Skill Benchmark with Large-Scale Demonstrations

> 这是一份写给"完全没接触过 AI/机器人"的读者的精读笔记。语言像聊天，术语第一次出现给类比。读完你能对别人讲清楚"ManiSkill 到底是个什么考场，它凭什么比之前的 benchmark 更能测出真本事"。

## 一句话讲什么（TL;DR）

ManiSkill 是教机器人开抽屉、开柜门、推椅子、搬水桶这类"带关节的家具操作"的**统一标准考场**——它的核心考点是：机器人练完几十上百个不同形状的柜子之后，能不能上手一个从没见过的新柜子。

*所以这一节是想说：这篇论文做的是一个"专测泛化"的机器人操作 benchmark，配了大规模示范数据。*

---

## 这是个什么场景

你第一次去朋友家做客，主人说"冰箱里有可乐自己拿"。你走过去，面对一个**从没见过的冰箱**——把手位置不一样、开门方向不一样、甚至是那种要按一下才弹出来的隐藏式——但你照样一把就开了。

人觉得这理所当然，机器人却不行。现在很多机器人是"把家里那个特定抽屉练熟到飞起"，换一个长得不一样的抽屉就懵了。真正想要的是：**练完一批抽屉，遇到新抽屉也能上手**。这种"对同类新物体的泛化能力"，才是机器人能进入千家万户的前提。

ManiSkill 干的事，就是把这种"一类动作 + 一堆形状不同的同类家具"打包成一个考场：给你 N 个不同形状的抽屉/柜门/椅子/水桶，告诉你"目标是把它打开/推到指定位置"，划好训练集和测试集（**测试集里全是没见过的实例**），然后比谁的策略在新物体上做得好。不再是"我自己造个 demo，自己说我 SOTA（state of the art，当前最强）"。

*所以这一节是想说：ManiSkill 要解决的是"机器人换个同类新物体就不会了"这个真问题，用标准考场逼大家比拼真正的泛化。*

---

## 之前的人怎么做的，为什么不够好

- **Meta-World、RLBench、robosuite**：任务很多，但操作对象大多是**刚体**（block、peg、cube 这种整体不会变形也没关节的东西），很少涉及"门会转、抽屉会拉、龙头会扭"这类带关节的物体。
- **专门做关节物体操作的工作**：通常每篇论文自己造一个小数据集 + 一个仿真环境，没有统一的资产、统一的指标，导致"你说你能开门，别人没法在同一条件下复现和比较"。
- **物理仿真器层面**：MuJoCo、PyBullet 主要面向刚体；同团队做的 SAPIEN 专门为**关节物体**做了高质量物理 + 渲染，但它只是仿真器，不是 benchmark。
- **资产多样性不足**：论文特别指出，已有 benchmark 里的 3D 资产缺乏"同类内部的拓扑和几何多样性"——就是说，所有柜子长得太像，测不出真正的泛化。
- **缺一个站在 SAPIEN 之上、专门考关节物体操作、强调实例级泛化、还配大规模示范的标准 benchmark**。

*所以这一节是想说：以前的 benchmark 要么不玩关节物体，要么各造各的、资产太单一，测不出"对新实例泛化"这个真本事。*

---

## 这篇论文的关键想法

像驾校改革：以前是"在自家小区里反复练同一辆桑塔纳"，现在是"练完十几辆不同的车，还要去陌生路考一辆没摸过的"。ManiSkill 做的就是这种规范化升级，核心有四点：

1. **以技能（skill）为单位组织任务**——每个技能（如 OpenCabinetDoor 开柜门、PushChair 推椅子、MoveBucket 搬桶）下面挂**一批形状不同的具体物体**，像驾校的"科目二"下面挂十种考车。
2. **训练集和测试集划在不同物体上**——见过的柜子不会出现在考场里，逼算法学"开柜门这件事本身"，而不是死记某一个柜子长啥样。
3. **同时提供点云 / RGB-D / 关节角等多种观测形式**——让"用 3D 视觉的"和"用低维状态的"两派研究者都能进来比。论文还特意模拟了一个**移动的全景相机**，返回以自我为中心（ego-centric）的点云或 RGB-D。
4. **配套大规模高质量示范**——约 3.6 万条成功轨迹、总计约 150 万帧点云/RGB-D，让模仿学习、offline RL 等不只跑纯 RL 的方法也能上手。

一句话：**关节物体操作的 ImageNet 雏形**——任务统一、实例多样、看泛化、有大数据。

*所以这一节是想说：核心创新是把"实例级泛化"和"多档观测 + 大规模示范"抬成 benchmark 的一等公民。*

---

## 它分几步做的（方法）

ManiSkill 不是一个算法，而是一套 benchmark 基建。它的"方法"就是把仿真器、任务、观测、示范、基线这五块搭好。下面每块按"输入 → 处理 → 输出"讲。

### 1. 仿真器与资产：站在 SAPIEN + PartNet-Mobility 之上

**输入。** 一批带关节标注的 3D 家具模型（来自 PartNet-Mobility 这个开源资产库，里面每个抽屉/柜门/龙头都标好了关节类型和限位）。

**处理。** 用 SAPIEN 做底层物理和渲染。SAPIEN 原生支持关节物体（用 URDF 描述关节、joint 限位、接触摩擦），渲染质量比 PyBullet 好，能产出高质量 RGB-D 和分割掩码（segmentation mask，即"每个像素属于哪个物体"）。点云可以直接从深度图反算出来。关键是：作者刻意挑选了"同类内部拓扑和几何差异大"的资产，保证考场足够多样。

**输出。** 一个能对大量形状各异的关节物体做真实物理交互的仿真环境。

> **关节物体（articulated object）**：内部有可动关节的物体，比如抽屉（平移关节）、门（转动关节）、剪刀（铰链）。和刚体（rigid body，整体动、不变形）相对。

*所以这一节是想说：ManiSkill 的地基是 SAPIEN 物理 + PartNet-Mobility 资产，且资产被刻意选得"同类里也千差万别"。*

### 2. 任务定义：技能 + 一批同类物体 + 明确目标

**输入。** 一个技能名（如 OpenCabinetDoor）和挂在它下面的一批物体实例。

**处理。** 每个任务对应"一个技能 + 一批同类物体"。任务的成功判据是"目标关节是否被推到指定状态"（比如门开到某个角度、抽屉拉出某个距离），再配上一些 shaping 奖励（辅助信号，把"离目标还有多远"变成连续分数，帮助强化学习别在稀疏奖励里瞎撞）。任务被精心挑选，覆盖不同类型的操作挑战（开、拉、推、搬）。

**输出。** 一组带明确目标和奖励的可训练任务，每个任务天然带"训练物体 vs 测试物体"的划分。

*所以这一节是想说：任务被组织成"技能挂一批物体 + 目标是把关节推到某状态"，划分本身就逼出泛化考核。*

### 3. 观测与动作：三档观测，谁都能进来比

**输入。** 仿真器里的场景状态。

**处理。** 提供三档观测：**state**（关节角、末端位置等低维量）、**point cloud**（点云）、**RGB-D**（彩色图 + 深度图）。这个"多档观测"设计是关键——做 3D policy 的人和做 state-based RL 的人需要的输入不一样，多档让他们都能公平比拼。动作空间一般是末端位姿增量或关节速度（具体形式需读原文）。

**输出。** 同一任务下的多种观测接口，让不同流派的算法都能对齐着比。

> **点云（point cloud）**：一堆带三维坐标的点，像把物体表面撒满小圆点，是 3D 视觉最常用的表示之一。

*所以这一节是想说：三档观测把"低维状态派"和"3D 视觉派"都请进同一个考场。*

### 4. 大规模示范：给模仿学习 / offline RL 备好教材

**输入。** 每个任务里"怎么做才算成功"的知识。

**处理。** 论文提供约 **3.6 万条成功轨迹**、总计约 **150 万帧**点云/RGB-D 的示范数据（demonstration，即"已知比较好的解"，来源可能是运动规划，具体需读原文）。这让不想从零跑纯 RL 的人可以直接学示范。

**输出。** 一个大规模、可直接喂给模仿学习/offline RL 的示范库——这也是标题里 "Large-Scale Demonstrations" 的由来。

*所以这一节是想说：3.6 万条示范让 benchmark 不只服务纯 RL，也服务"从示范里学"的一大派方法。*

### 5. 基线与榜单：把成功率立成主指标

**输入。** 上面的任务、观测、示范。

**处理。** 论文用 3D 深度学习（如 PointNet 系）+ LfD（learning-from-demonstrations，从示范学）算法搭了一批基线（BC、SAC 等），把"**在没见过的测试物体上的成功率**"当主要指标，并围绕 benchmark 办了一个面向跨学科研究者的挑战赛。

**输出。** 一个可被后续工作反复刷的公开榜单，全套代码（仿真器、环境、SDK、基线）开源。

下面用 ASCII 图把整个考场结构画出来：

```
   技能层（skill）      OpenCabinetDoor   PushChair   MoveBucket   OpenCabinetDrawer
                              │              │            │              │
   实例层（objects）     [柜A 柜B 柜C ...]  [椅1 椅2 ...] [桶1 桶2 ...]  [抽屉x 抽屉y ...]
                              │
              ┌───────────────┴───────────────┐
        训练集(见过的实例)              测试集(没见过的同类实例)  ← 泛化考点
                              │
        观测三档: state / point cloud / RGB-D   动作: 末端位姿增量或关节速度
                              │
        示范 ~36,000 条 (~1.5M 帧)  →  模仿学习 / offline RL / 纯RL 都能比
```

再用一张 ASCII 图看"泛化 gap"这个核心考点：

```
   在训练物体上:  成功率  ████████████████░░  (高, 可能只是记住了)
   在测试物体上:  成功率  ███████░░░░░░░░░░░  (掉下来, 差距=泛化gap)
                          └──── 差距越大 = benchmark 越抓到真问题 ────┘
```

*所以这一整节是想说：ManiSkill = SAPIEN 物理 + 多样关节资产 + "技能挂实例、划训练测试" + 三档观测 + 大规模示范 + 开源基线，合起来是一个专测泛化的操作考场。*

---

## 关键数字（What works）

下面数字来自论文摘要（arXiv:2107.14483）；每个任务的具体成功率、训练 vs 测试的泛化 gap 等细项属于"原文正文/榜单"，摘要未逐条给出，标注为"需读原文"。

| 项目 | 数值 | 说明 |
|------|------|------|
| 成功示范轨迹 | ~36,000 条 | 供模仿学习/offline RL |
| 示范总帧数 | ~1.5M 帧 | 点云/RGB-D |
| 底层仿真器 | SAPIEN | 原生支持关节物体 |
| 资产来源 | PartNet-Mobility | 同类内拓扑/几何差异大 |
| 观测形式 | state / point cloud / RGB-D | 三档 |
| 主指标 | 测试物体成功率 | 强调实例级泛化 |
| 各任务成功率 & 泛化 gap | 需读原文 | 摘要未逐条报告 |

三件事值得记住：第一，**3.6 万条示范 / 150 万帧**这个量级，在 2021 年的机器人 benchmark 里相当可观，是它"Large-Scale"名号的实锤；第二，主指标是"测试物体成功率"而非"训练物体成功率"，这决定了它测的是泛化；第三，多档观测让它同时服务两派研究者，扩大了社区影响力。

*所以这一节是想说：大规模示范 + 以"测试物体成功率"为主指标，是 ManiSkill 区别于同代 benchmark 的两个硬核数字选择。*

---

## 实验结果说明了什么

论文的实验主要回答三类问题：

- **常规 baseline 能到什么水平**：BC（行为克隆）、纯 RL（SAC/PPO 类）、以及混合方法在各技能上的成功率各是多少，给后来者立一个可比的起点。
- **泛化 gap 有多大**：训练物体上的成功率 vs 测试物体（没见过的实例）上的成功率，差距通常很显著——这恰恰说明 benchmark **抓到了"对新实例泛化"这个真问题**，而不是一个练几遍就刷满的玩具。
- **观测形式的影响**：state-based 通常上限高但不现实（真机拿不到完美状态）；point cloud / RGB-D 更接近真实机器人但更难学。这组对比提醒大家"好看的分数可能来自不现实的观测"。

后续 ManiSkill 2、ManiSkill 3 在这个基础上扩任务、扩规模、提速仿真，思路一脉相承。ManiSkill 也逐渐成为很多 3D policy / 模仿学习论文的**标准评测场之一**。

*所以这一节是想说：实验的价值不在某个分数，而在于证明"泛化 gap 真实存在"，并把多档观测的取舍摆到台面上。*

---

## 你应该懂的几个新词

- **articulated object（关节物体）**：带可动关节的物体，如抽屉、门、龙头；和刚体相对。
- **PartNet-Mobility**：开源 3D 资产库，给每个家具/工具标好了关节，是 SAPIEN 系工作的物体来源。
- **SAPIEN**：同团队的物理 + 渲染仿真器，原生支持关节物体；ManiSkill 建立在它之上。
- **train/test split on instances（实例级划分）**：训练用一批物体，测试换一批没见过的同类物体。比"同一物体不同 episode 划分"对泛化要求高得多。
- **demonstration（示范）**：已知较优的解轨迹，供模仿学习/offline RL 使用。
- **success rate（成功率）**：任务目标是否在限定步数内达成（如门是否被开到指定角度），是主评测指标。
- **shaping reward（塑形奖励）**：把"离目标多远"变成连续分数的辅助信号，帮助 RL 训练。
- **point cloud / RGB-D**：两种 3D 观测；点云是一堆三维点，RGB-D 是彩色图加每像素深度。

*所以这一节是想说：这几个词是理解"仿真 benchmark"这条线的通用词汇，后面 RoboCasa、LIBERO 都会用到。*

---

## 它有什么搞不定的

- **仿真到真机的差距（sim-to-real gap）**：ManiSkill 里练得好，不代表真机能开门。物理、摩擦、传感器噪声都和真实有出入。
- **资产虽多但仍是"家具类"**：主要围绕抽屉/柜门/椅子/桶等，离"厨房里做一顿饭"这种长程、多物体、多步骤的真实家务还很远。
- **观测有点"作弊"**：完美的 state 观测在真机上拿不到；就算点云/RGB-D，也比真实传感器干净。分数可能被高估。
- **奖励设计依赖人工**：shaping reward 是人调的，不同任务的奖励质量会影响 RL 结果，未必公平。
- **v1 规模和速度受限**：相比后来的 ManiSkill 2/3，v1 的任务数、仿真吞吐都有限，如今更推荐用新版。

*所以这一节是想说：它是仿真里的好考场，但 sim-to-real、任务丰富度、观测真实性这三关它没解决，需要后续版本和真机验证补上。*

---

## 它和别的几篇是什么关系

- **上游**：SAPIEN（ICRA 2020）提供物理 + 渲染底座；PartNet-Mobility 提供物体资产。
- **同代 benchmark**：Meta-World（多任务但偏刚体）、RLBench（CoppeliaSim 上的多任务）、robosuite（MuJoCo 上的标准化机械臂环境）。ManiSkill 的差异点是**关节物体 + 实例级泛化 + 大规模示范**。
- **后续**：ManiSkill 2 / 3 把任务和资产扩得更大、仿真更快；RoboCasa、LIBERO、BEHAVIOR-1K 这些新一代 benchmark 在场景丰富度和语言指令上更进一步。
- **算法侧**：Diffusion Policy、3D Diffusion Policy、Equibot 这些 3D policy 方法常拿 ManiSkill 系列当评测场之一。
- **数据集派系**：和 CALVIN、RoboCasa 一样是"模拟器派"代表，与真机数据派（Open X-Embodiment、DROID、BridgeData V2）形成互补。

*所以这一节是想说：ManiSkill 是"仿真 benchmark"这条线的关键一环，上接 SAPIEN，下启 ManiSkill 2/3 与新一代场景化 benchmark。*

---

## 和本导读的关系

本笔记对应导读 [Ch17: Sim-to-Real](../guide/ch17-sim-to-real.md)（同时可参考 Ch21 数据集与评测一章）。Ch17 讲的是"为什么要在仿真里训、以及怎么把仿真里学到的迁到真机"，而 ManiSkill 正是"仿真里如何构造一个能测出真本事的考场"的代表作。理解 ManiSkill 的"实例级泛化 + 多档观测"设计，你就理解了后来 RoboCasa、SIMPLER-Env 等 benchmark 想改进什么。把 SAPIEN → ManiSkill v1 → v2/v3 → RoboCasa 串起来读，能建立"模拟器 + benchmark"这条线的完整地图。

*所以这一节是想说：把 ManiSkill 放进 Ch17 的仿真语境里读，你会看清"好 benchmark 该怎么设计"这个元问题。*

---

## 思考题

**Q1：为什么"用同一物体的不同 episode 划训练/测试"远不如"用不同物体实例划分"能测出泛化？**

<details>
<summary>提示</summary>

前者模型可能记住了这个物体的形状和把手位置；后者逼它学"开柜门这件事的通用规律"。想想过拟合和泛化的区别。
</details>

**Q2：为什么要同时提供 state、point cloud、RGB-D 三档观测，而不是只给最强的 state？**

<details>
<summary>提示</summary>

真机拿不到完美 state。想想 benchmark 的目的是"预测真机表现"还是"刷高分"，以及哪档观测更接近真实机器人。
</details>

**Q3：如果一个方法在训练物体上成功率 95%、测试物体上只有 40%，这说明了什么？这算好方法吗？**

<details>
<summary>提示</summary>

这就是巨大的泛化 gap。它可能只是记住了训练物体。ManiSkill 的价值恰恰是把这个 gap 暴露出来。
</details>

**Q4：关节物体比刚体难在哪？为什么之前的 benchmark 大多回避它？**

<details>
<summary>提示</summary>

关节物体的动作要"沿着关节允许的方向"施力，接触更复杂，仿真也更难做稳。想想开门时手要跟着门弧线走这件事有多微妙。
</details>

**Q5：3.6 万条示范是怎么来的？如果它们来自运动规划而非人类遥操，会带来什么偏差？**

<details>
<summary>提示</summary>

运动规划的轨迹往往"最优但不像人"，可能过于依赖完美状态信息，模仿它的策略在真机噪声下可能脆弱。
</details>

**Q6：ManiSkill 的成功率很高，是否就意味着这套方法能上真机？为什么？**

<details>
<summary>提示</summary>

想想 sim-to-real gap：仿真里的物理、摩擦、传感器都和真实不同。高仿真分数是必要条件，不是充分条件。
</details>

**Q7：如果让你把 ManiSkill 升级成 v2，你最想先改哪一项（任务、资产、观测、示范、速度）？为什么？**

<details>
<summary>提示</summary>

没有标准答案。想想哪一项最限制了当前研究——是场景太单一，还是仿真太慢导致训练成本高。
</details>

---

## 一些好奇心问答（FAQ）

**Q：ManiSkill 和 SAPIEN 到底什么区别？**

SAPIEN 是"仿真器"（管物理和渲染），ManiSkill 是建在它上面的"benchmark"（管任务、划分、示范、榜单）。类比：SAPIEN 是场地和器材，ManiSkill 是比赛规则和成绩单。

**Q：我要做 3D policy 研究，该用 v1 还是新版？**

优先用 ManiSkill 2/3。它们任务更多、仿真更快、可用资产更新。v1 主要是历史起点和概念范本。

**Q：为什么它被称作"关节物体操作的 ImageNet 雏形"？**

因为它像 ImageNet 一样，用"统一任务 + 大量多样实例 + 明确指标"把一个领域标准化了，让大家能在同一尺子上比拼。

**Q：纯 RL 在上面能刷满吗？**

通常不能，尤其在测试物体上。这也是它有价值的证据——留有明显的提升空间。

*所以这一节是想说：把它当"标准考场 + 大数据",而不是"某个算法"来理解，就抓住了它的定位。*

---

## 如果你想再深入

1. **前置：SAPIEN（ICRA 2020）** — 理解底层仿真器怎么支持关节物体。
2. **续作：ManiSkill 2 / 3** — 看任务、规模、速度是怎么迭代的，实操优先用它们。
3. **同代对照：Meta-World / RLBench / robosuite** — 建立"刚体 benchmark vs 关节 benchmark"的比较。
4. **新一代：RoboCasa / LIBERO / BEHAVIOR-1K** — 看场景化、语言指令化的下一步方向。
5. **算法：3D Diffusion Policy / Equibot** — 看真正在 ManiSkill 上刷榜的 3D 策略方法怎么设计。

*所以这一节是想说：把 SAPIEN → ManiSkill → 新一代 benchmark → 3D policy 串起来，就能看清"仿真 + benchmark + 算法"这条完整链路。*

---

## 原文信息

- 标题：ManiSkill: Generalizable Manipulation Skill Benchmark with Large-Scale Demonstrations
- 作者：Tongzhou Mu, Zhan Ling, Fanbo Xiang, Derek Yang, Xuanlin Li, Stone Tao, Zhiao Huang, Zhiwei Jia, Hao Su
- 会议：NeurIPS 2021 (Datasets and Benchmarks Track)
- arXiv：https://arxiv.org/abs/2107.14483

```bibtex
@inproceedings{mu2021maniskill,
  title     = {ManiSkill: Generalizable Manipulation Skill Benchmark with Large-Scale Demonstrations},
  author    = {Mu, Tongzhou and Ling, Zhan and Xiang, Fanbo and Yang, Derek and Li, Xuanlin and Tao, Stone and Huang, Zhiao and Jia, Zhiwei and Su, Hao},
  booktitle = {Advances in Neural Information Processing Systems (NeurIPS) Datasets and Benchmarks Track},
  year      = {2021},
  url       = {https://arxiv.org/abs/2107.14483}
}
```
