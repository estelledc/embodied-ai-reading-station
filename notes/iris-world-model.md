---
title: "Transformers are Sample-Efficient World Models"
slug: iris-world-model
topic: world-model
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2209.00588"
venue: ICLR
year: 2023
era: classic
num: 149
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

IRIS（Imagination with auto-Regression over an Inner Speech）把雅达利游戏画面用 VQ-VAE 切成一串"视觉 token"，然后让一个 GPT 风格的 Transformer 当"世界模型"去自回归预测下一帧 + 奖励 + 是否结束。智能体 100% 在这个想象出来的世界里做强化学习训练，只用 200 万帧真实交互就在 Atari 100k 基准上拿到接近人类水平的成绩。

核心信息：**离散 token 化 + Transformer 自回归 = 样本高效的世界模型**。

## 这是个什么场景 — 日常类比

想象你在学一个新游戏，比如《吃豆人》。

- **传统强化学习（Model-free）**：你不停地玩，玩个几亿局慢慢学会。
- **基于模型的 RL（Model-based）**：你玩一会儿，然后**闭上眼睛在脑子里"过电影"**——想象按左、按右会发生什么，自己跟自己对练。
- **IRIS 的做法**：你在脑子里放电影时，不是直接"看到"模糊的下一帧，而是把游戏画面拆成一些"积木块"（比如这里有一个豆子、那里有个鬼），然后像写句子一样，**一个 token 一个 token 接龙**预测下一帧的积木块组合。

这个"接龙"就是 Transformer 的看家本事——它原本是为了写自然语言文本设计的，IRIS 把它搬来写"游戏画面文本"。

## 之前的人怎么做的 — 3-5 bullet

- **Dreamer 系列（v1/v2）**：在隐空间里建 RSSM（Recurrent State-Space Model），用 RNN 滚动预测潜变量。世界模型连续、平滑，但 RNN 长程依赖弱。
- **MuZero**：不显式建图像，而是学一个"价值/策略一致性"的 latent 模型，配合 MCTS 搜索。强但工程复杂。
- **SimPLe**（Atari 100k 基准的开山之作）：用像素级视频预测模型，在想象里训 PPO。证明了 model-based 在低数据 Atari 上可行，但模型不够准。
- **World Models（Ha & Schmidhuber 2018）**：VAE + MDN-RNN 想象 CarRacing。开创"在梦里训练"思路，但规模小。
- **共同问题**：要么用连续隐空间 + RNN（容量与可扩展性受限），要么用像素级预测（噪声大、累积误差大）。Transformer 在语言上的成功还没真正"搬"进 world model。

## 这篇论文的关键想法

把视觉世界模型变成一个**语言建模问题**。

具体三步组合拳：

1. **离散化**：用 VQ-VAE 把每一帧 64×64 图像编码成一个固定长度的离散 token 序列（比如 16×16 = 256 个码本索引）。每个 token 来自一个有限的 codebook（比如 512 或 1024 个码字）。这一步把"图像"变成了"文本"。

2. **自回归世界模型**：训练一个 Transformer，输入是过去若干帧的 token + 动作，输出预测下一帧的 token 序列、奖励、终止标志。结构上就是 GPT，只不过 token 词表是视觉码本而不是 BPE。

3. **在想象中学策略**：用 actor-critic 算法（具体是改良的 REINFORCE 风格）**完全在 Transformer 想象出来的轨迹里**训练 agent。真实环境只用来提供给世界模型新数据。

为什么有效？离散 token + 自回归让 Transformer 能用语言模型的全套工具（attention、scaling、并行训练）建模视觉动力学，同时离散性自带**正则化效果**——只能预测码本里有的东西，不会胡乱生成噪点。

## 它怎么做的（方法）— 3-4 段

**第一阶段 — 训练 tokenizer（VQ-VAE）**

VQ-VAE = Vector Quantized Variational Autoencoder。Encoder 把图像下采样到 16×16 网格，每个网格位置去 codebook 里找最近的码字，用码字索引代替原向量。Decoder 再把索引序列还原成图像。损失包括重建损失 + commitment loss + perceptual loss（让重建图视觉上更像）。这一步完全离线、无监督，只需要 replay buffer 里的图像。

**第二阶段 — 训练世界模型（Transformer）**

输入序列形如 `[obs_tokens_t, action_t, obs_tokens_{t+1}, action_{t+1}, ...]`，每个 obs 由若干（256 个左右）token 展开。Transformer 在 token 级别自回归地预测：(a) 下一帧的 token 序列；(b) 当前 step 的奖励（标量回归头）；(c) episode 是否结束（二分类头）。三个头共享 backbone。训练数据持续从真实环境流入。

**第三阶段 — 在想象中训练策略**

从 replay 里随机取一个真实状态作为起点，让世界模型 rollout 若干步（论文里大概十几步量级，**具体数字需读原文**），actor 在这个想象轨迹上更新。critic 用 λ-return 平衡 bias/variance。整个训练循环是：真实交互一小段 → 训 tokenizer + world model → 在 imagination 里训 actor-critic → 拿新策略再回真实环境。

**关键细节**

token 化让 attention 在帧内建模"哪些区域相关"（比如鬼的位置和豆子的位置），跨帧建模时间动力学。比起 RSSM 这种瓶颈式 RNN，Transformer 容量更大、更适合复杂场景。代价是推理时 token 多 → 想象 rollout 比 Dreamer 慢。

## 实验在做什么

主战场：**Atari 100k 基准**——只允许 100k 步真实环境交互（约等于人类玩 2 小时），看能学多好。

- 26 款 Atari 游戏，跟 SimPLe / Dreamer-V2 / SPR / MuZero-Reanalyze 等比 human-normalized score。
- IRIS 的人类标准化中位数显著超过之前 model-based baseline（具体数字需读原文，量级是 mean 1.0+ 即跨过人类水平）。
- 在 10 款游戏上超人类。
- 消融：去掉离散 token、换 RNN 都掉点，证明"Transformer + discrete token"的组合是关键。
- 想象质量可视化：能从一个起点 rollout 几十步还保持画面连贯。

局限：在需要长程规划的游戏（如 Montezuma's Revenge）上仍弱——这是探索问题，不是世界模型问题。

## 你应该懂的几个新词 — 4-6 个

- **World Model（世界模型）**：一个能预测"环境对动作的反应"的神经网络。给定 (s, a) 输出 (s', r)。
- **VQ-VAE**：把连续向量"吸附"到一个有限码本上的自编码器。让图像变成离散 token 序列，便于 Transformer 处理。
- **Tokenization（token 化）**：把原始信号（文本/图像/音频）切成离散单位。NLP 里是 BPE，视觉里就是 VQ-VAE / dVAE 这类。
- **Imagination Rollout（想象中 rollout）**：不在真实环境，而是在 world model 里模拟若干步轨迹。便宜、可并行、但有累积误差。
- **Sample Efficiency（样本效率）**：用更少真实交互达到同样性能。Atari 100k 基准就是专门衡量这个。
- **Actor-Critic**：策略网络（actor）+ 价值网络（critic）的双塔训练框架。critic 估 V/Q，actor 用它的梯度信号更新。

## 它和其他论文什么关系

- **直接前辈**：Dreamer-V2（Hafner 2021）—— 同样是 model-based + imagination training，但用 RSSM 而非 Transformer。IRIS 可以看作"Dreamer 把骨架换成 Transformer"。
- **方法论先祖**：World Models（Ha & Schmidhuber 2018）—— "在梦里训练"的最早系统化提法。
- **token 化思路来源**：VQ-VAE-2 / DALL·E —— 把图像变成 token 序列让 Transformer 处理的视觉生成传统。
- **同期/后续**：TWM (Transformer-based World Models)、STORM、DreamerV3、GAIA-1（自动驾驶世界模型）、Genie（DeepMind 2024）—— 都在沿着"Transformer 当世界模型"这条路走，但任务从 Atari 推到机器人、自动驾驶、开放世界视频。
- **机器人方向应用**：UniSim、1X World Model、DayDreamer 改造 —— 用 IRIS 类似思路给机器人造数据。
- **互补对比**：Diffusion World Model（如 DIAMOND）—— 一种走"连续 + 扩散"路线的替代方案，证明离散 token 不是唯一答案。

## 我建议这样读 — 3-4 步

1. **先读 Dreamer-V2** 弄懂"什么叫在想象里训 actor-critic"和 RSSM 是什么。否则直接读 IRIS 会卡在 model-based RL 框架。
2. **再扫一眼 VQ-VAE 原文**（van den Oord 2017）的图 1-2，搞清"码本 + 最近邻替换"的机械动作。
3. **正式读 IRIS**：重点看 Figure 1（整体架构）和 Algorithm 1（训练循环）。方法 4-5 页就能读完，剩下都是实验。
4. **配合官方代码跑一遍** Atari Pong（最简单）：体感"100k 步 = 多少分钟训练 = 玩成什么样"，比看曲线直观。

## 为什么值得读

- **范式信号**：是把 Transformer 用作世界模型的早期标杆之一。后来 Genie / GAIA-1 / Sora-as-world-model 等都受它启发。
- **方法干净**：三件套（VQ-VAE + Transformer + actor-critic）每件都是经典模块的组合，没有黑魔法。读完能把"model-based RL × 视觉 tokenization × 自回归"三个领域串起来。
- **样本效率证据**：在 Atari 100k 这种极端低数据场景跑赢，说明 world model 学习是给样本效率续命的有效手段——这对机器人这种"采样昂贵"的领域是直接信号。
- **承上启下**：往前接 Dreamer / World Models 传统，往后通 Genie / DIAMOND / 大规模视频世界模型。是 world-model 主线笔记里跳不过的一站。
- **工程参考价值**：如果你想给自己的机器人任务做一个 world model 当数据增广器，IRIS 的代码量小（相比 DreamerV3）、可读性高，是不错的起手项目。
