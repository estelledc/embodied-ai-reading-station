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

把游戏画面切成一格格"积木"，让 AI 像写句子一样接龙下一帧，然后让它在脑子里"自己跟自己玩"练强化学习——只玩两小时就接近人类水平。

## 这是个什么场景

你小时候肯定干过这种事：玩一个新游戏卡住了，晚上躺床上闭着眼"在脑子里复盘"——按左会怎样、按右会怎样、这个鬼会从哪边来。第二天再开机，手感明显变好了。

人类学游戏其实只玩了几小时，但 AI 玩雅达利往往要"刷"上亿局才能玩明白。差距就在这——人能在脑子里"过电影"自己练，AI 通常只会硬刷。

IRIS 想让 AI 也学会这套"脑内模拟"：

- **常见做法（Model-free RL）**：AI 必须真在游戏里反复死，靠死出来的经验更新策略——慢且贵。
- **基于模型的做法（Model-based RL）**：AI 先学一个"小型游戏模拟器"装在脑子里，然后大部分练习都在脑内模拟器里完成，省掉真打。
- **IRIS 的小聪明**：它脑内的模拟器不直接"画"出下一帧画面（画图很容易糊），而是把画面切成 16×16 的"乐高积木"，然后像写句子一样**一块一块接龙预测**——这正好是 Transformer（写文章那种 AI）的强项。

换句话说，IRIS 把"预测下一帧画面"变成了"写下一句话"。

## 之前的人怎么做的 — 3-5 bullet

- **Dreamer 系列（v1/v2）**：在隐空间里建 RSSM（Recurrent State-Space Model），用 RNN 滚动预测潜变量。世界模型连续、平滑，但 RNN 长程依赖弱。
- **MuZero**：不显式建图像，而是学一个"价值/策略一致性"的 latent 模型，配合 MCTS 搜索。强但工程复杂。
- **SimPLe**（Atari 100k 基准的开山之作）：用像素级视频预测模型，在想象里训 PPO。证明了 model-based 在低数据 Atari 上可行，但模型不够准。
- **World Models（Ha & Schmidhuber 2018）**：VAE + MDN-RNN 想象 CarRacing。开创"在梦里训练"思路，但规模小。
- **共同问题**：要么用连续隐空间 + RNN（容量与可扩展性受限），要么用像素级预测（噪声大、累积误差大）。Transformer 在语言上的成功还没真正"搬"进 world model。

## 这篇论文的关键想法

一句话：把"预测画面"硬掰成"写文章"，然后用 GPT 那一套去做。

像翻译一样三步走：

1. **把画面翻译成"字"**：用 VQ-VAE 把每帧 64×64 的图切成 16×16=256 个小格子，每个格子从一本"字典"（codebook，大约 512–1024 个候选）里挑一个最像的"字"代替。这一步图像就变成了一串"文本"。
2. **请 GPT 当游戏模拟器**：训练一个 Transformer，输入是"过去几帧的字 + 玩家按了什么键"，输出"下一帧应该写哪些字 + 这一步得几分 + 游戏是不是结束了"。结构跟 GPT 一模一样，只是它学的"语言"是游戏画面。
3. **让智能体在小说里练级**：用 actor-critic（演员-评论员，演员负责出招、评论员负责打分）这种强化学习算法，**完全在 Transformer 编出来的"游戏小说"里训练**。真游戏只负责给世界模型喂新素材。

等等，先慢一拍——这里的 token 是什么？

可以理解成"视觉拼音"：原本一张图有几万个像素值，太碎了 Transformer 学不动；VQ-VAE 替它压缩成 256 个"拼音字母"，再交给 Transformer 去拼。这样模型只能从有限的"字"里选词，自带防止"画歪"的护栏。

## 它怎么做的（方法）— 3-4 段

**第一阶段 — 训练 tokenizer（VQ-VAE）：像给画面学拼音**

想象你在教孩子认字：先准备一本 512 字的字典，再让他看图找最像的字。这就是 VQ-VAE（Vector Quantized Variational Autoencoder，向量量化变分自编码器）做的事。Encoder 把图像下采样到 16×16 网格，每个网格位置去 codebook（字典）里找最近的码字，用索引代替；Decoder 再把这串索引"读"回成图像。损失由三部分组成：重建损失（还原得像不像）+ commitment loss（防止字典字四处乱跑）+ perceptual loss（视觉上像不像）。这一步是离线无监督的，只用 replay buffer 里攒下来的图像。

**第二阶段 — 训练世界模型（Transformer）：像翻译官学接龙**

把一个翻译官关在屋里，只给他看"过去几帧的字 + 玩家按的键"，让他猜下一帧的字、这步得多少分、游戏是不是结束了。这就是 Transformer 在做的事。输入序列长这样：`[obs_tokens_t, action_t, obs_tokens_{t+1}, action_{t+1}, ...]`，每帧约 256 个 token。Transformer 自回归预测三件事：(a) 下一帧的 token 串；(b) 这步的奖励（标量回归头）；(c) 是否 episode 结束（二分类头）。三个头共享同一个主干网络。真实游戏数据持续往里灌。

**第三阶段 — 在想象中训练策略：像在脑内跑马拉松**

类比抄作业但只抄过程不抄答案——智能体从真实游戏的某一刻"截图"，然后让世界模型在脑内 rollout 十几步假轨迹，在这串假轨迹上更新自己的策略。actor（出招的演员）按 critic（打分的评论员）的反馈调整动作选择，critic 用 λ-return 平衡"看远还是看近"。整个循环是：真玩一小段 → 训 tokenizer + 世界模型 → 在想象里训 actor-critic → 用新策略再去真玩。

**关键细节**

token 化让注意力（attention）能在一帧内自己问"豆子和鬼在哪、互相离多近"，跨帧时再去算"按了左之后这堆字会怎么变"。比起 Dreamer 那种 RSSM（用 RNN 压成一个小瓶颈），Transformer 容量大得多、适合更复杂的画面。代价是 token 多，脑内 rollout 比 Dreamer 慢。

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
