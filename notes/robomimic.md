---
title: "What Matters in Learning from Offline Human Demonstrations for Robot Manipulation"
slug: robomimic
topic: dataset-eval
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2108.03298"
venue: CoRL
year: 2021
era: classic
num: 33
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

RoboMimic 把"从人类演示里离线学一个机器人操作策略"这件事拆开来做系统消融——换算法、换观测、换数据质量、换 demo 数量，每个变量轮番改一次，看哪些真的影响成功率。结果是给后来所有做模仿学习的人立了一个统一的评测基准（benchmark）和一套"什么有用、什么没用"的经验清单。

## 这是个什么场景 — 日常类比

想象你想教一个新手做菜：

- 你录了一堆"老师傅炒菜"的视频（人类演示，human demonstrations）
- 新手只能反复看视频学，不能进厨房自己试错（offline，离线）
- 你想知道：是视频拍得清楚重要？还是视频数量重要？还是新手用的学习方法重要？

之前每个研究组都在自己挑的厨房、自己找的师傅、自己定的评分标准下做实验，得出"我家方法最好"。RoboMimic 干的事是：把厨房、师傅、评分都标准化，然后逐一替换变量，告诉你**真正决定成败的是哪几件事**。

## 之前的人怎么做的 — 3-5 bullet

- 各家自己造数据集、自己定任务，互相结果不可比（fragmented benchmarks）
- 算法层面常见三类：行为克隆 BC（behavior cloning，监督学习模仿）、BC-RNN（带时序记忆）、批量强化学习 BCQ/CQL（offline RL，从离线数据里学价值函数）
- 演示数据来源混乱：有的来自专家遥操作（teleop），有的来自脚本策略，有的混合多人不同水平
- 评估往往跑个几十次取均值，方差大、随机种子敏感，难复现
- 观测空间一般固定（要么纯图像、要么纯本体感知），少有人系统比较"该给策略喂什么"

## 这篇论文的关键想法

**核心命题**：在 offline imitation learning 上，"用什么算法"远不是唯一变量；**数据本身的性质**（多样性、是否多人混合、是否含失败轨迹）和**策略的输入**（图像 vs 低维状态、是否带历史）往往比换算法的影响更大。

所以这篇论文不发明新算法，而是搭一个**控制变量的实验台**：

- 固定一组任务（从 lift 物体到 NutAssemblySquare 这类长程操作）
- 固定一组数据集（包括 Proficient-Human、Multi-Human、Machine-Generated 三档质量）
- 系统替换：算法 × 观测模态 × 历史长度 × demo 数量 × 数据混合比例
- 用统一的成功率 + 多 seed 报告结果

输出是一份"什么真的 matter"的经验表，以及一个能让别人接着做的 codebase + 数据集。

## 它怎么做的（方法）— 3-4 段

**任务与仿真环境**。底层用 robosuite（基于 MuJoCo 的机械臂仿真），定义了 lift / can / square / transport / tool-hang 等一组从简到难的操作任务，再加上一个真机 NUT-ASSEMBLY 子集。难度阶梯让你能看出"算法在简单任务上都行，难任务才拉开差距"。

**数据来源分三档**。Proficient-Human (PH)：单个熟练操作员遥操作的高质量 demo；Multi-Human (MH)：多个不同水平操作员混合，反映真实标注场景；Machine-Generated (MG)：用预训练 RL 策略生成的次优数据。三档分别测，能看出**算法对数据质量的鲁棒性**。

**算法对照组**。覆盖 BC、BC-RNN（加 LSTM 记忆）、HBC（hierarchical BC）、IRIS（潜变量+目标条件）、BCQ、CQL 等。统一训练超参网格、统一评估协议（每个 checkpoint 跑 N 次 rollout，多 seed）。这一步看似工程活，但前人做不出可比结论恰恰栽在这。

**观测变量**。同一个算法，喂"低维状态向量"（low-dim：物体位姿+本体）vs "图像+本体"两种输入，再叠加是否给历史窗口。这样能回答"图像策略是不是普遍更弱""RNN 是不是必需"等一直在争的问题。

## 实验在做什么

主要回答几个 yes/no 问题（具体百分比数字需读原文）：

- **算法之间差多少？** 在干净的 PH 数据上 BC-RNN 已经很强，offline RL（BCQ/CQL）并没有显著超越 BC，甚至在某些任务上更差——和 NLP 那边"模仿学习打不过 offline RL"的直觉相反。
- **观测模态影响多大？** 图像策略普遍比低维状态难训，但只要 demo 够多、加历史，可以接近低维水平。
- **数据质量 vs 数量？** 高质量少量 demo > 低质量大量 demo，但**多人混合数据**比单人专家 demo 更难学（行为分布更分散）。
- **历史/记忆有没有用？** BC-RNN 在长程任务上明显优于无记忆 BC——这条结论在后来 Diffusion Policy 的论文里被进一步推广。
- **失败案例**：long-horizon 任务（tool-hang）所有方法成功率都很低，是后续工作（Diffusion Policy、ACT）发力的方向。

## 你应该懂的几个新词 — 4-6 个

- **Offline Imitation Learning**：只用预先收集的演示数据训练策略，不能在环境里继续探索。和 online RL 相对。
- **Behavior Cloning (BC)**：最朴素的模仿——把 (观测, 动作) 当 (X, y) 做监督学习。简单但有 distribution shift 问题。
- **BC-RNN**：BC 加一个循环网络记住历史观测，处理部分可观测和长程任务的标配。
- **Offline RL (BCQ / CQL)**：从离线数据里学一个 Q 函数，理论上能利用次优数据中的"哪些动作不该选"信息。
- **Distribution Shift**：策略一旦偏离演示分布，下一步观测就更不像训练分布，错误滚雪球。模仿学习的根本痛点。
- **Multi-Human Data**：多个标注员混合的演示，行为分布是多峰的（multi-modal），直接用 MSE loss 拟合会被"平均"成一个谁也不像的策略。

## 它和其他论文什么关系

- **数据集／仿真平台**：基于 robosuite（同组工作，[robosuite.md](robosuite.md)），后来扩展为 RoboCasa（[robocasa.md](robocasa.md)）和 MimicGen 系列。
- **承上**：把 BC、BCQ、CQL、IRIS 等已有方法搬到统一基准下对照，类似"操作版 D4RL"。
- **启下**：
  - Diffusion Policy（[diffusion-policy.md](diffusion-policy.md)）直接用 RoboMimic 的任务+数据做评测，结论是 BC-RNN 的多模态拟合不够，diffusion 可以补上
  - BeT / VQ-BeT（[bet.md](bet.md)、[vq-bet.md](vq-bet.md)）也以 RoboMimic 为标准跑分台
  - ACT/ALOHA（[act-aloha.md](act-aloha.md)）解决长程任务时部分思路（动作分块）可以看作对 RoboMimic 失败案例的回应
- **同期对手**：BridgeData、RT-1、Open-X-Embodiment 这一支走"加大数据"的路线，RoboMimic 走"控制变量看清楚"的路线，互补。

## 我建议这样读 — 3-4 步

1. 先读摘要 + 引言 + 实验结论表（通常在第 5-6 节），抓"哪些变量真的 matter"——这是这篇论文的核心 deliverable
2. 再回头看任务和数据集设计（PH/MH/MG 三档怎么造的），决定**自己做实验时该用哪一档**
3. 算法实现细节略读即可（BC-RNN 的网络配、CQL 的超参），需要时回查代码
4. 最后看附录里失败案例的可视化，这部分能帮你判断"我的新方法是真的解决了问题，还是只是在已经能做的任务上又涨一点"

## 为什么值得读

- **写论文必备引用**：现在做 manipulation imitation learning 的论文，跑 RoboMimic 任务几乎是标配，读它等于读后续所有论文的"评测协议默认设置"
- **教你怎么做严谨实验**：很少有论文像这篇一样把"控制变量+多 seed+多任务"做到这个粒度，是实验设计的范本
- **结论反直觉**：offline RL 没赢 BC、图像没那么差、demo 数量收益递减——这些结论会改变你对"应该重点优化什么"的判断
- **可复现**：代码 + 数据 + 模型权重全开源，门槛低；想自己做 imitation learning 实验，从 fork 这个 repo 起步比从零搭快得多
- **承接位**：理解 Diffusion Policy / BeT / ACT 等 2022-2024 主流工作的"为什么需要存在"，要先理解 RoboMimic 揭示的天花板在哪
