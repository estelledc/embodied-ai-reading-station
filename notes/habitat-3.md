---
title: "Habitat 3.0"
slug: habitat-3
topic: sim
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2310.13724"
venue: ICLR
year: 2024
era: frontier
num: 106
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

Habitat 3.0 把"人形 avatar（humanoid avatar，可控的虚拟人）"和"机器人"放进同一个仿真器，让我们能在家居场景里训练和评测"机器人怎么跟人协作干活"——不是机器人单干，而是有人在场、人也在动。

## 这是个什么场景 — 日常类比

想象你在家做饭，伴侣进厨房想帮忙拿盘子。两个人要默契：你伸手去冰箱时她会让一让，她端着热汤过来你会停下手。这种"两个人在同一个空间里互相避让、配合"是日常常识，但对机器人来说是大难题。

之前的家用机器人仿真器大多是"屋子里就一个机器人"，机器人想象自己是孤儿，整个家随它折腾。Habitat 3.0 做的事情就是：把虚拟的"人"也搬进屋子，机器人现在得学会"屋子里还有别人"这件事——别人会自己走、会自己拿东西、会挡你路、也会跟你一起搬桌子。

## 之前的人怎么做的 — 3-5 bullet

- **Habitat 1.0/2.0**：Meta 自家前作。Habitat 1 主打导航（PointNav 之类），Habitat 2 加了可交互家具（开抽屉、拿东西），但场景里只有机器人。
- **AI2-THOR / ManipulaTHOR / iGibson**：同期家居仿真平台，物理交互各有侧重，人形 agent 大多缺席或只是装饰摆件，不可被策略控制。
- **多智能体 RL（MARL）研究**：在网格世界、StarCraft、足球这类抽象环境里研究协作，但缺失"真实物理 + 真实家居布局 + 真人体动作"。
- **VR teleop 数据**：用 VR 让真人遥控仿真里的虚拟人，能拿到真实人类行为，但成本高、规模有限。
- **结果**：之前要研究 human-robot collaboration（HRC，人机协作）只能在受限的桌面 setup 或动捕实验室里做，规模化训练很难。

## 这篇论文的关键想法

把 "humanoid avatar + 机器人 + 家居场景 + 高速仿真" 四件事拼到同一个引擎里，让人形 avatar 既能被脚本驱动（做家务）、也能被策略控制（学习协作行为）、还能被 VR 真人接管（拿人类示范），机器人就在同一个屋子里跟它互动。

更进一步：这套基建让"协作任务"成为一类可基准化的题目。论文给了两个示范任务——Social Navigation（机器人跟着人走但不挡路）和 Social Rearrangement（机器人和人一起把家具/物品挪到目标位置），把"协作"从口号变成可跑分的 benchmark。

## 它怎么做的（方法）— 3-4 段

**人形 avatar 的实现**：作者基于 SMPL-X 之类的人体参数化模型构建可控人形，能做行走、转身、伸手、拾取放置等家务动作。avatar 的低层运动通过预先生成或学习得到的 motion primitives（运动基元）驱动；高层"做什么"由策略或脚本决定。这样既保证视觉上像人、也保证物理上能跟环境交互。

**仿真速度**：Habitat 系列一贯的卖点是快——单 GPU 上每秒上万帧的 photo-realistic 渲染。3.0 版把这套效率延伸到"两个 agent 同屋"，要解决双 agent 物理碰撞、视觉遮挡、动作并发调度等工程问题。具体吞吐数字需读原文。

**两个基准任务**：(1) Social Navigation，机器人需要找到并跟随屋里走动的人，同时不挡路；(2) Social Rearrangement，机器人和人形 avatar 共同完成多物品搬运（如把客厅杂物放回各自位置），需要分工 + 不撞车。两个任务都用 HSSD（Habitat Synthetic Scenes Dataset）等场景库提供丰富房型。

**baseline 与评测**：作者跑了几类 baseline，包括端到端 RL、heuristic（启发式规则）、planning-based。指标涵盖任务成功率、完成时间、与人发生碰撞次数、是否打扰到人等。具体每个 baseline 表现 + 数值需读原文。

## 实验在做什么

实验主要回答三个问题：

1. **能不能在 Habitat 3.0 里训练出会协作的策略**：把 RL 跑在 Social Nav / Social Rearrangement 上，看成功率随训练提升的曲线，验证仿真器跑得动这种规模的训练。
2. **协作策略 vs 单干策略的差距**：让机器人当作屋里没人去做任务，对比"会感知人"的策略，看碰撞次数、效率有没有改善。这是验证"屋里有人"这件事是否值得建模。
3. **不同 human policy 下机器人能不能 generalize**：人有时是脚本驱动、有时是 learned policy、有时是 VR 真人接管，机器人面对不同"人类风格"是否仍能完成任务。这是验证 sim-to-real 之前的"sim-to-human-variation"。

具体数字（成功率多少、碰撞下降多少 %、训练多少小时）需读原文。

## 你应该懂的几个新词 — 4-6 个

- **humanoid avatar**：仿真器里的"虚拟人"，有骨骼、有关节、能走能拿东西；本文里它既是任务的一部分（机器人要跟它配合），也是数据来源（VR 接管时拿真人行为）。
- **Social Navigation / Social Rearrangement**：本文提出的两类协作 benchmark，前者是"跟着人走但不打扰"，后者是"跟人一起整理东西"。
- **HSSD（Habitat Synthetic Scenes Dataset）**：Habitat 团队的合成 3D 家居场景库，提供大量可交互房型，给协作任务做舞台。
- **MARL（Multi-Agent RL）**：多智能体强化学习。Habitat 3.0 给 MARL 提供了一个"真实家居 + 物理 + 视觉"的舞台，跟以前网格世界 MARL 完全不是一个量级。
- **kinematic vs dynamic 仿真**：人形动作可以走 kinematic（位姿插值，简单快但不真实碰撞）或 dynamic（真物理引擎，慢但真实）。Habitat 3.0 在两者之间做工程取舍。
- **embodied AI**：具身智能，强调"agent 要有身体、要在世界里行动"，跟纯文本 LLM 区分开。Habitat 系列是该领域核心仿真平台之一。

## 它和其他论文什么关系

- **承接 Habitat 1.0（导航）→ Habitat 2.0（交互）→ Habitat 3.0（协作）**：是 Meta Habitat 三部曲的第三章，每代加一个维度。
- **平行于 AI2-THOR / iGibson / RoboCasa**：都是家居具身 AI 仿真平台，但 Habitat 3 在"人形 avatar 可控+协作 benchmark"这个交集上更系统。
- **下游对接 sim-to-real 工作**：Habitat 训出的策略最终要部署到真机器人（如 Spot、Stretch），3.0 的"人在场"训练可以减少真机面对人时的 surprise。
- **跟 OpenX-Embodiment / RT-X 的关系**：那一类是"用真实数据规模化训机器人"，Habitat 3 是"用仿真规模化训协作"，两条路互补——仿真便宜、真实数据真。
- **跟 LLM-as-policy 的连接**：协作任务的"高层调度"未来可能交给 LLM，Habitat 3 提供了底层执行环境。

## 我建议这样读 — 3-4 步

1. **先看演示视频和官网**（habitat.ai）：30 秒看明白"人形 avatar 在屋里走来走去 + 机器人配合"的画面，比读 6 页文字快。
2. **跳到 Section 介绍两个 benchmark 的部分**：Social Nav 和 Social Rearrangement 的 task definition + 评测指标，搞懂"什么算成功"。
3. **再回头看人形 avatar 是怎么做的**：motion primitives + 高层 policy 的分层设计，这是论文工程贡献的核心。
4. **最后扫一眼 baseline 表格**：知道当前 SOTA 在协作任务上的水位（不高），这是你将来如果做相关方向的入手缝隙。

## 为什么值得读

- 如果你关注**具身智能 / 家用机器人**：Habitat 3.0 是目前研究"机器人怎么跟人共处"最系统的开源仿真平台，方法论和工程细节都值得借鉴。
- 如果你关注**多智能体协作**：它把 MARL 从网格世界拉到了真实家居，给了一个不再"玩具"的舞台。
- 如果你关注**sim-to-real**：屋子里加了"会动的人"这一变量，让仿真训练离真实部署近了一步——真实世界里机器人永远不是孤儿。
- 如果你关注**LLM agent + 物理世界**：未来 LLM 当"高层 planner"驱动机器人和人协作时，Habitat 3 这类基建是必要的练兵场。

读它的性价比：1-2 小时扫完正文 + demo，能拿到"协作仿真现在做到哪一步"的清晰判断，并且知道下一步可以从哪里推。
