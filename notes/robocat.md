---
title: "RoboCat"
slug: robocat
topic: imitation
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2306.11706"
venue: TMLR
year: 2023
era: classic
num: 55
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

RoboCat 是 DeepMind 推出的「多形体（multi-embodiment）多任务通用决策 Transformer」。它先用视觉目标条件克隆（visual goal-conditioned behavioral cloning，VGCBC）把多种机器人、多种任务的人类/专家数据吃进去训一个统一策略，再让这个策略去自己生数据、回收进训练集，像滚雪球一样越滚越大。核心卖点是「一个模型驱动多个机器人」+「自生数据自我改进（self-improvement loop）」。

## 这是个什么场景 — 日常类比

想象你开了一家厨师培训学校。

- 传统做法：每个学徒（机器人）只学一道菜（一个任务），从头练到熟。
- 多任务做法：一个学徒学十道菜，但还是同一双手（同一种机器人）。
- RoboCat 做法：一个总厨（一个 Transformer 大脑），同时指挥三种不同身材的学徒（不同形态的机械臂），让他们各自做几十道菜。学得差不多了，让他们自己练新菜、自己录视频，再把视频拿回来当教材，下一批学徒看着视频继续学。

关键是「同一个大脑」要能驱动「不同身体」，而且这个大脑会自己产生新教材。

## 之前的人怎么做的 — 3-5 bullet

- **单任务单机器人 BC（behavioral cloning）**：每个任务训一个策略，换任务/换机器人就得重训，迁移基本为零。
- **RT-1（Google）**：单一形态（mobile manipulator）+ 大量真机演示数据，一个 Transformer 跨任务，但不跨形态。
- **Gato（DeepMind 2022）**：通才 agent，吃文本/图像/控制等多模态 token，证明了「一个 Transformer 能干一堆活」，但机器人控制部分还比较粗糙，且没有自生数据回路。
- **Decision Transformer / Trajectory Transformer**：把 RL 当序列建模，但通常单一环境。
- **Sim-to-real + domain randomization**：靠仿真数据补足，但跨形态依然要重新设计观测/动作空间。

## 这篇论文的关键想法

两件事叠加：

1. **视觉目标条件 + 多形态共享 token 化**：把不同机器人的观测（图像）、动作（关节/末端位姿）、目标（一张目标图像）全部 token 化喂给同一个 Transformer。目标用「图像」表达——告诉机器人"画面应该长这样"，这样不同形态可以共享同一个目标语义空间。
2. **自生数据滚雪球（self-improvement loop）**：训好的 RoboCat 在新任务上少量微调（fine-tune）→ 让它自己跑大量 rollout → 筛选成功的 rollout 当作新演示 → 加进数据集 → 重新训练下一代 RoboCat。每滚一轮，数据集变大、能力变强。

类比：第一代厨师靠师傅手把手教，到了第二代，自己就能录几百段做菜视频，下一代徒弟有更多教材可看。

## 它怎么做的（方法）— 3-4 段

**架构**。骨干是一个 decoder-only Transformer（具体规模需读原文，论文报告了多个尺寸）。输入序列是 `[目标图像 token, 历史观测图像 token, 历史动作 token, ...]`，输出是下一步动作 token。图像编码用 VQ-GAN 风格的 token 化器（把图像离散成一串 visual token），动作直接 tokenize 成离散值。这种设计的好处是：不同机器人有不同的关节数/动作维度，但 token 化后都变成一串整数，Transformer 不需要为每个形态改架构。

**训练阶段一：通才预训练**。用大量已有数据集（DeepMind 内部的多种机械臂任务、若干公开数据集），把所有 (observation, action, goal) 元组混在一起做 VGCBC。损失函数就是预测下一动作 token 的交叉熵。这一步得到一个「啥都会一点」的 RoboCat-v0。

**训练阶段二：少样本微调 + 自生数据**。给定一个新任务（新形态或新物体），先收集少量人类演示（论文提到大约 100-1000 条数量级，具体数字需读原文），微调 RoboCat-v0 得到专家策略。让这个专家在真机/仿真里跑几千上万次 rollout，筛出成功的轨迹。这些自生轨迹合并进总数据集，再训 RoboCat-v1。重复几轮。

**部署**。最终的 RoboCat 直接吃一张目标图像就能在多种机械臂上完成任务，包括它训练时没见过的物体组合。论文展示了在堆叠、插入、按按钮、用工具等任务上的跨形态泛化。

## 实验在做什么

实验设计围绕三个问题展开：

- **跨形态共享是否有效？**对比「每个形态单独训」vs「合在一起训 RoboCat」。RoboCat 应该在数据少的形态上明显更强（从其他形态借了知识）。
- **自生数据回路是否真的滚雪球？**记录每一轮（v0 → v1 → v2 ...）在新任务上的成功率，看是否单调上升、收敛到什么水平。
- **少样本适应能力**：给一个全新任务（甚至全新机器人），用 N 条演示微调，看 N 多小时还能学会。

机器人覆盖（公开资料里提到的）：Sawyer、Panda、KUKA 等几种工业/科研机械臂；任务包括方块堆叠、形状插入、水果分类、用工具等。具体数字、表格、消融需读原文。

## 你应该懂的几个新词 — 4-6 个

- **Embodiment（形体）**：机器人本体的物理形态——多少关节、多长手臂、什么夹爪。多形体 = 多种身体共享一个大脑。
- **Behavioral Cloning（BC，行为克隆）**：监督学习的方式让策略模仿专家轨迹，不做 RL。简单稳定，但有 distribution shift 问题（参考 DAgger 笔记）。
- **Visual Goal-Conditioned**：策略的输入除了观测，还有一张「目标图像」告诉它最终画面应该长啥样。比起文本目标，图像目标对底层控制更直接。
- **Self-Improvement Loop**：训好的策略自己生数据，再回喂训练。和 AlphaGo Zero 自我对弈是一类思路，但这里需要严格的成功筛选避免污染数据。
- **Foundation Model for Robotics**：模仿 NLP 大模型的「先预训练、后微调」范式，希望一个底座模型能下游适配各种任务。RoboCat 是这条路线的早期代表之一。
- **Tokenization of Actions**：把连续动作离散化成一串整数 token，让 Transformer 能像处理语言一样处理控制信号。

## 它和其他论文什么关系

- **上承 Gato（2022）**：Gato 证明了一个 Transformer 可以处理图像、文本、控制等多模态。RoboCat 把这条路收窄到「机器人控制」，并加了自生数据回路。
- **平行 RT-1（2022）/RT-2（2023）**：Google 的 RT 系列偏单形态多任务、强调 VLM（vision-language model）和大规模真机数据；RoboCat 偏多形态、用图像目标、强调自生数据。两条路线在 2023 年并行推进。
- **下接 OpenVLA（2024）**：OpenVLA 等更晚的工作把 VLM 直接作为底座，路线更接近 RT-2。RoboCat 的「自生数据滚雪球」思路被后续多个 robot foundation model 借鉴。
- **方法上邻近 BeT、Diffusion Policy**：都是 BC 框架下的策略学习，但 RoboCat 强调跨形态和自迭代，BeT/DP 强调多模态动作分布建模。
- **基础参考 DAgger**：BC 的 distribution shift 问题，RoboCat 用「自生数据」从另一个角度缓解（不是查询专家，而是筛成功 rollout）。

## 我建议这样读 — 3-4 步

1. **先读摘要 + Figure 1（系统总览图）**：搞清楚「输入是什么、输出是什么、目标怎么表达、自生数据怎么循环」。这一步 15 分钟。
2. **跳到方法节，重点看 token 化方式和 self-improvement 的具体协议**：成功 rollout 怎么筛？每一轮加多少数据？哪些超参？这是论文的真正贡献。
3. **看实验主表 + 消融**：跨形态消融最关键——「合训」vs「单训」差多少；自生数据 v0/v1/v2 的成功率曲线。
4. **（可选）扫一眼局限性**：RoboCat 依赖目标图像，所以在「没法用一张图说清的任务」（比如长程语言指令）上有天花板，这也是后来 RT-2/OpenVLA 转向 VLM 的动机。

## 为什么值得读

- **是「机器人基础模型」这条路线的关键早期节点**：在 RT-2、OpenVLA 之前，RoboCat 已经把「一个 Transformer + 多形态 + 视觉目标 + 自生数据」拼成完整系统。理解它能看懂后续所有 robot foundation model 的 lineage。
- **自生数据回路是个朴素但强大的工程范式**：不依赖更精巧的算法，只靠「筛成功、回喂、再训」就把数据集滚大。这个思路在数据稀缺的 embodied AI 领域非常重要，也是和 NLP 不同的关键差异点。
- **跨形态 token 化的工程细节有借鉴价值**：如果你以后要做自己的多机器人系统，这篇论文的 token 设计和数据混合策略是直接可抄的模板。
- **作为 imitation learning 难度 ⭐⭐⭐⭐ 的代表**：比 BC/DAgger 复杂一档，但比纯 RL 路线（Dreamer 系列）容易上手，是从「单任务模仿」到「通用决策模型」中间最好的过渡阅读。
