---
title: "TWM: Transformer-based World Models"
slug: transformer-world-model
topic: world-model
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2303.07109"
venue: ICLR
year: 2023
era: classic
num: 150
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

TWM（Transformer-based World Models）把强化学习里的"环境模拟器"换了内核：不再用 RNN（循环神经网络）一帧一帧滚动状态，而是把过去若干步的"状态 + 动作 + 奖励"拼成一条 token 序列，丢进一个 Transformer，让它自回归地预测"下一步会变成什么样、能拿多少奖励、是不是结束"。智能体（agent）就在这个想象出来的世界里训练策略（policy），从而把真实环境的交互成本降下来。

## 这是个什么场景 — 日常类比

想象你在学开车。一种学法是不停上路开（真实环境，贵、慢、还可能撞车）；另一种是脑子里反复想象"我现在打方向盘 30 度，车会怎么动"，在脑内跑很多遍模拟，再真上路。

世界模型（world model）就是 agent 脑子里的"想象引擎"。早期的版本（Dreamer 系列）类似一个"按时间一格一格手摇"的 RNN：必须先记住第 t 步的隐状态，才能推出第 t+1 步。TWM 换了一个引擎：像 GPT 看一段文字一样，把过去这几十步的画面 + 动作 + 奖励一起摆在桌上，用注意力（attention）一眼看全部历史，再吐出"下一步"。

好处是：长程依赖更好抓（"我 20 步前捡了把钥匙"这种事 Transformer 比 RNN 容易记住），训练也更并行。

## 之前的人怎么做的 — 3-5 bullet

- **World Models（Ha & Schmidhuber, 2018）**：VAE 压图像 + MDN-RNN 预测下一帧潜变量 + 小策略网络在"梦"里训练。开山作，但用的是 RNN。
- **Dreamer / DreamerV2 / DreamerV3**：用 RSSM（Recurrent State-Space Model，带循环结构的隐状态空间模型）做世界模型，在想象的 latent 轨迹上做 actor-critic。SOTA 系列，但核心还是 RNN。
- **PlaNet**：CEM（cross-entropy method）在 latent world model 上做规划，不学 policy，纯 planning。
- **MuZero**：学一个抽象的"动力学函数"+"奖励函数"+"价值函数"，配 MCTS（蒙特卡洛树搜索）做规划，但模型也是 MLP/RNN 形态。
- **IRIS（同期 ICLR 2023）**：和 TWM 思路非常像——离散化图像 token + Transformer 世界模型 + 在想象 rollout 里训 PPO。两篇一起把"Transformer 当世界模型"推到台面。

共同痛点：RNN 在长 horizon 任务上记忆衰减、并行差；想换成 Transformer 又有"序列怎么组织、怎么和 RL 闭环"的工程问题。

## 这篇论文的关键想法

把世界模型重新定义为"序列建模问题"。每一步的"观察、动作、奖励、终止位"都被编码成 token，按时间顺序串成一条序列，让 Transformer 做自回归（autoregressive）预测：

下一步观察的 latent | 下一步奖励 | 是否终止 ← Transformer(过去 K 步的 obs/action/reward token)

这个框架的两点关键设计：

1. **token 化方式**：图像先被一个编码器压成离散或连续的 latent，再和动作、奖励一起作为序列元素。这样 attention 就在"事件"层面做，而不是像素层面。
2. **想象 + 策略训练**：策略不是直接在真环境训，而是在 Transformer 想象出的 rollout 上做 actor-critic 训练（沿用 Dreamer 的 imagination training 思想），但底层动力学换成了 Transformer。

具体的 token 数量、上下文长度、是不是用了 VQ（向量量化）这些细节需读原文确认。

## 它怎么做的（方法）— 3-4 段

**Step 1：观察编码**。每帧观察 o_t 经过一个 CNN 编码器变成 latent z_t。这一步压缩信息，让 Transformer 不用直接处理像素。

**Step 2：序列拼装**。把 (z_t, a_t, r_t, done_t) 编排成 token 序列 [..., z_{t-1}, a_{t-1}, r_{t-1}, z_t, a_t, ...]。每种 token 有自己的 embedding 和位置编码，Transformer 按因果掩码（causal mask）做自回归。

**Step 3：世界模型训练**。在真实环境采集 replay buffer，监督学习目标包括：预测下一帧 latent z_{t+1}、预测奖励 r_t、预测 done。loss 是这几项的加权和。这一阶段就是把 Transformer 训成一个"会做梦"的模拟器。

**Step 4：策略训练（imagine-then-act）**。冻结或同步更新世界模型，在它生成的想象 rollout（比如展开 H 步）上跑 actor-critic：actor 输出动作分布、critic 估值。回到真环境再采新数据更新世界模型，循环。

## 实验在做什么

主战场是 **Atari 100k benchmark**——只允许 agent 在真环境玩 10 万步（约 2 小时人类游戏时长），看在 26 个 Atari 游戏上的归一化得分。这个 benchmark 专门考"样本效率"，世界模型方法的传统强项。

对照组通常包括 DreamerV2/V3、IRIS、SimPLe、Rainbow（model-free 基线）等。论文要证明的核心点：换成 Transformer 后，**在长依赖游戏上表现更好**、整体平均分有竞争力，同时训练成本可控。

具体数字（人类归一化中位数、平均分、各游戏胜出数）需读原文。这一类工作通常会附消融实验：上下文窗口长度、token 化方式、image vs latent 输入等。

## 你应该懂的几个新词 — 4-6 个

- **世界模型（world model）**：agent 内部学到的环境动力学模拟器，输入"当前状态 + 动作"输出"下一状态 + 奖励"。让 agent 能在想象里训练，节省真环境交互。
- **自回归（autoregressive）**：预测下一个元素时，把已生成的元素一起作为输入。GPT 写文章是这个套路，TWM 把它搬到"下一帧"。
- **latent**：经过编码器压缩后的低维表示。比起原始像素，latent 更紧凑也更易建模。
- **imagination training**：在世界模型生成的虚拟 rollout 里训练策略，不消耗真环境样本。Dreamer 系列的标志做法。
- **causal mask**：Transformer 的注意力掩码，让位置 t 只能看到 ≤ t 的 token。保证训练时不"偷看未来"。
- **Atari 100k**：样本效率基准，限制 100k 真环境帧；世界模型 / 高效 RL 方法的常见战场。

## 它和其他论文什么关系

- **上承 Dreamer 系列**：继承"在想象里训 actor-critic"的范式，把动力学骨干从 RSSM 换成 Transformer。
- **同期对照 IRIS（ICLR 2023）**：思路高度相似（Transformer + token 化世界模型 + Atari 100k）。两篇可以对照读，看不同 token 化和训练细节如何影响结果。
- **远祖 World Models（Ha 2018）**：开了"VAE 压图 + RNN 想象"的范式，TWM 是这条线的现代化版本。
- **下游延伸**：Genie（DeepMind 2024）、DIAMOND（NeurIPS 2024，用扩散做世界模型）、各种"video as world model"工作（Sora 之后那一波），都在共享"世界模型 = 序列/视频生成模型"这个母题。
- **MuZero 是另一条路**：不显式建图像，建的是抽象的 value-equivalent 模型，配 MCTS。TWM 这条线更"生成式"，MuZero 更"规划式"。

## 我建议这样读 — 3-4 步

1. **先复习 Dreamer 的 imagination training**（看 DreamerV2 的图就够）。理解"世界模型 + actor-critic"的双层闭环是吃 TWM 的前置条件。
2. **读 TWM 第 3 节方法**：重点看 token 序列怎么组织、loss 怎么设计、context 多长。和 IRIS 对比一下两者的 token 化差异。
3. **看 Atari 100k 实验表**：关注它在长程依赖游戏（比如 Frostbite、Alien）上是否相对 DreamerV2/V3 有提升，这是 Transformer 替代 RNN 的最直接证据。
4. **如果想动手**：找开源实现（GitHub 上有作者放出的 PyTorch 代码），跑 1-2 个 Atari 游戏感受一下"想象 rollout"长什么样。

## 为什么值得读

这是把"序列建模 = 世界建模"明确摆出来的早期代表作之一。理解它之后，你会发现后来 Genie、DIAMOND、各种"video world model"的工作其实都在回答同一个问题：**世界模型是不是就是一个生成模型？**

对于 embodied AI 学习路径来说，这篇是从"经典 RL 世界模型（Dreamer）"过渡到"现代生成式世界模型（Genie / Sora-style）"的桥。读完它，你能讲清楚为什么大家现在都在卷"video diffusion 当世界模型"——因为 TWM/IRIS 这一步先证明了 Transformer 行得通，剩下的只是把生成器换得更强而已。

难度 ⭐⭐⭐⭐：需要 Dreamer 风格的 imagination training 背景 + Transformer 序列建模基础，但只要这两块齐了，方法本身不复杂，是一篇"性价比高"的精读对象。
