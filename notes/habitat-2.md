---
title: "Habitat 2.0"
slug: habitat-2
topic: sim
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2106.14405"
venue: NeurIPS
year: 2021
era: classic
num: 101
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

Habitat 2.0 把上一代只能"看着走"的导航模拟器，升级成了可以"伸手摸、推开门、把杯子从桌上拿到水槽"的家居物理交互模拟器，并配套提出 Home Assistant Benchmark（HAB）这一系列家居重排（rearrangement）任务，让具身 AI 能在分钟级长任务里被系统评测。

## 这是个什么场景 — 日常类比

想象你在玩一个超高速版"模拟人生"。上一代 Habitat 像是一个只能用第一人称视角"走路看房子"的 demo，房子是死的，柜门拉不开，杯子拿不起。Habitat 2.0 是把这个 demo 升级成了一个真正能"过家家"的场景：你可以让一个机器人小人去厨房，打开冰箱，把饮料拿出来放到客厅茶几上。这个家不只是好看，每一个家具、关节、物体都受物理定律约束——抽屉会卡住，杯子会摔碎，机器人会撞到桌角。

研究者要的就是这种"能动手"的环境，因为真正的家庭机器人要在物理世界做事，光会看路远远不够。

## 之前的人怎么做的 — 3-5 bullet

- **Habitat 1.0（2019）**：渲染快、地图多，但场景是静态网格，不能交互，只能跑 PointNav / ObjectNav 这类纯导航任务。
- **AI2-THOR / RoboTHOR**：支持开关抽屉、拿放物体，但用的是离散"魔法动作"（teleport-style），不是真物理。
- **iGibson / SAPIEN**：开始引入物理和关节物体，但要么场景小，要么仿真速度慢，跑不动 RL 所需的亿级 step。
- **传统机器人仿真器（Gazebo / MuJoCo / PyBullet）**：物理强，但没有照片级视觉，也没成套家居场景资产。
- **结论**：在 Habitat 2.0 之前，没人能同时做到"快 + 真物理 + 视觉真实 + 大规模可交互家居"。

## 这篇论文的关键想法

把"模拟器"当作一个由三层组成的栈来重做：**资产层（ReplicaCAD）+ 仿真层（Habitat-Sim 2.0 物理引擎）+ 任务层（HAB）**。每一层都为了同一个目标——让 RL agent 能在 GPU 上以超高吞吐做家居物理交互——重新设计：

- 资产做成铰接的（cabinet 有可动门、抽屉有可滑轨道）
- 仿真用 Bullet + 自家优化把吞吐推到几千 SPS（steps per second）
- 任务用一组接近真实生活语义的"重排"长流程（找物体、抓、放、回家），而不是单一短动作

这不是"加个物理就完事"，而是把整个 pipeline 重新做了一遍，让具身 AI 第一次能在"长任务 + 真物理 + 视觉真实"里同时被训练和评测。

## 它怎么做的（方法）— 3-4 段

**ReplicaCAD：可交互的家居资产**。基于 Replica 数据集（真实扫描的房间），人工把家具一件件重做成 CAD 风格的、带关节信息的 3D 模型。冰箱不是一坨网格，而是"机身 + 一个可绕铰链旋转的门"；抽屉柜不是一坨网格，而是"机身 + 几个可沿滑轨平移的抽屉"。这样 agent 才能"打开 → 伸手 → 关上"。

**Habitat-Sim 2.0：高吞吐物理仿真**。在 Habitat 1.0 的渲染基础上接入 Bullet 物理引擎，并大量做工程优化：批渲染、避免 CPU-GPU 拷贝、向量化环境。结果是单 GPU 能跑到接近 10^4 SPS 量级（具体数字需读原文），让端到端 RL 训练在天级别可行。

**Home Assistant Benchmark（HAB）**。定义了一组家居长任务：例如 SetTable（把碗筷从橱柜拿出摆到桌上）、TidyHouse（把散乱物体放回该放的地方）、PrepareGroceries（把购物袋里的东西归位到冰箱/橱柜）。每个任务都要求 agent 完成一连串"导航 + 开柜 + 抓取 + 放置"的子动作，整体长度可达分钟级。

**两类策略基线**。论文同时跑了两种 agent：一种是端到端 RL（视觉直接到电机指令），一种是"任务规划 + 技能（skill）组合"——先把长任务拆成子技能（pick / place / nav / open），每个子技能单独训练，再用一个 high-level policy 串起来。后者的成功率显著更高，揭示了端到端长任务的难度。

## 实验在做什么

实验主要回答三个问题：

1. **仿真够不够快**：测了 Habitat-Sim 2.0 的 SPS 吞吐，对比 1.0 和其他主流仿真器，确认它能支撑亿级 step 的 RL 训练（具体数字需读原文）。
2. **HAB 任务有多难**：在 SetTable / TidyHouse / PrepareGroceries 上跑端到端 RL 和 hierarchical（技能组合）两种 baseline。结论是端到端基本做不动长任务，hierarchical 也只能在简化设定下达到不算高的成功率，留下了大量空间给后续研究。
3. **资产和场景的可扩展性**：展示 ReplicaCAD 能被布置出多种 layout，agent 学到的策略在新 layout 下的泛化能力。

## 你应该懂的几个新词 — 4-6 个

- **Embodied AI（具身 AI）**：agent 不只会输入输出文本，而是有"身体"（在仿真或真实世界里能动），因此要处理感知-动作循环。
- **Rearrangement（重排任务）**：让 agent 把环境里的物体从初始状态搬到目标状态。是 EAI 社区在 2020 前后逐渐共识的"具身任务原型"。
- **SPS（steps per second）**：仿真器一秒能模拟多少个环境步。RL 训练亿级 step 时，SPS 直接决定训练要几小时还是几周。
- **Articulated object（铰接物体）**：带关节的物体，比如能开关的门、能拉出的抽屉。区别于一坨刚体网格。
- **Hierarchical policy（分层策略）**：高层选"技能"（如 pick），低层执行原子动作（电机指令）。在长任务中常比端到端 RL 稳定。
- **Skill / sub-policy**：上面 hierarchical 里说的"低层小策略"，每个 skill 解决一个子任务，比如 pick 只管抓。

## 它和其他论文什么关系

- **承接 Habitat 1.0**（同实验室）：1.0 解决"跑得快 + 视觉真"，2.0 加上"能动手 + 长任务"。
- **平行 / 对手**：iGibson 2.0、ManiSkill、SAPIEN—— 同期都在做"物理交互家居仿真器"，各有取舍（视觉 vs 物理 vs 速度）。
- **下游催生**：Habitat 3.0（人机协作）、HomeRobot、OVMM（Open-Vocabulary Mobile Manipulation）这些更复杂的任务都直接基于 Habitat 2.0 的栈。
- **和 RoboCasa / SimplerEnv 的关系**：后两者更偏"机械臂任务集合 + 真机对齐"，Habitat 2.0 偏"全身移动 + 长流程家居"。两条线在 2024-2025 逐渐互补。
- **和 BEHAVIOR-1K**：BEHAVIOR 路线更追求任务多样性（1000 个任务），Habitat 2.0 更追求训练吞吐和 RL friendliness。

## 我建议这样读 — 3-4 步

1. **先读 Habitat 1.0 笔记**，搞清楚"为什么仿真器要追求 SPS"和"渲染管线长什么样"，2.0 的工程贡献才能感受到。
2. **直接跳 HAB 任务定义那节**：看看 SetTable / TidyHouse / PrepareGroceries 具体要 agent 做什么，理解"分钟级长任务"到底有多复杂。
3. **回头看 ReplicaCAD 的资产例子**：理解"铰接物体"在数据层是什么样的（关节、自由度、碰撞体）。
4. **最后看 baseline 结果**：重点不是绝对成功率，而是"端到端 vs hierarchical 的差距"——这个差距塑造了后续两三年（2022-2024）整个 EAI 社区的方法论方向。

## 为什么值得读

Habitat 2.0 是 EAI 仿真器从"导航"走向"操作"的标志性一步。如果你以后会用任何一个家居仿真器（Habitat 3、HomeRobot、OVMM、RoboCasa），它的设计哲学（资产 / 仿真 / 任务三层栈、SPS 优先、hierarchical baseline）都直接或间接来自这篇。理解它，等于理解了 2021 年之后家居具身 AI 的"地基长什么样"。
