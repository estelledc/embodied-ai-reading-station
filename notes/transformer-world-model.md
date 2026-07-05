---
title: 'TWM: Transformer-based World Models'
slug: transformer-world-model
topic: world-model
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: 'https://arxiv.org/abs/2303.07109'
venue: ICLR
year: 2023
era: classic
num: 150
generated_at: 2026-07-01T00:00:00.000Z
---

> 这是一份写给"完全没接触过 AI"的读者看的精读笔记。术语首次出现配类比，公式翻译成人话。

## 一句话讲什么（TL;DR）

智能体（agent）在脑子里"做梦"练本事。这篇把梦的引擎从 RNN 换成 Transformer，记得更长、做得更准，在样本效率基准 Atari 100k 上有竞争力。

*所以这一节是想说：TWM 把"世界模型"重新做成一个 Transformer 序列模型，让 agent 在想象里学得更好。*

---

## 这是个什么场景

想象你要准备一场陌生城市的自驾旅行。一种学法：直接开车上路撞车试错（真实环境，贵、慢、可能出事）。另一种学法：先在脑子里反复模拟"我打方向盘 30 度，车会怎么走、路口红灯几秒变绿"，脑内跑一百遍，再真上路。后者就是 agent 学习的"省钱模式"。

这个"脑内模拟器"就叫**世界模型（world model）**——agent 脑子里关于"环境会怎么演化"的内部小宇宙。

> **世界模型（world model）**：agent 学到的环境动力学模拟器，输入"当前状态 + 动作"，输出"下一状态 + 奖励"。有了它，agent 能在想象里训练，省下昂贵的真环境交互。

早期的世界模型（Dreamer 系列）像一台**老式胶卷放映机**：靠 RNN（循环神经网络）按时间一格一格手摇，必须先记下第 t 步的隐状态，才能推第 t+1 步。问题是放着放着前面的画面就模糊了——20 步前捡过一把钥匙，它可能已经忘了。

TWM 换了引擎：像 **GPT 读一段文字**那样，把过去几十步的画面 + 动作 + 奖励**一起摊在桌上**，用注意力（attention）一眼扫过全部历史，再吐出"下一步会怎样"。长程的事更容易记住，训练也更能并行。

*所以这一节是想说：TWM 面对的问题是"RNN 世界模型记不住长历史、训练难并行"，它要用 Transformer 换掉这个引擎。*

---

## 之前的人怎么做的，为什么不够好

- **World Models（Ha & Schmidhuber, 2018）**：VAE 压图像 + MDN-RNN 预测下一帧潜变量 + 小策略网络在"梦"里训练。开山作，但用 RNN。
- **Dreamer / DreamerV2 / DreamerV3**：用 RSSM（带循环结构的隐状态空间模型）做世界模型，在想象的潜轨迹上做 actor-critic。SOTA 系列，核心还是 RNN。
- **PlaNet**：用交叉熵方法（CEM）在潜世界模型上做规划，不学 policy，纯 planning。
- **MuZero**：学一个抽象的"动力学 + 奖励 + 价值"函数，配蒙特卡洛树搜索（MCTS）做规划，但模型是 MLP/RNN 形态。
- **IRIS（同期 ICLR 2023）**：和 TWM 思路极像——离散化图像 token + Transformer 世界模型 + 在想象 rollout 里训 PPO。两篇一起把"Transformer 当世界模型"推到台面。

**共同痛点**：RNN 在长 horizon 任务上记忆衰减、并行差；想换成 Transformer 又有"序列怎么组织、怎么和 RL 闭环"的工程问题。

*所以这一节是想说：以前世界模型主干几乎都是 RNN，记忆和并行都受限，Transformer 化的工程路还没被趟平。*

---

## 这篇论文的新想法

把世界模型重新定义为"序列建模问题"。每一步的"观察、动作、奖励、是否终止"都编码成 token，按时间顺序串成一条序列，让 Transformer 做自回归（autoregressive）预测：

```
下一步观察的 latent | 下一步奖励 | 是否终止  ←  Transformer(过去 K 步的 obs/action/reward token)
```

两点关键设计：

1. **token 化方式**：图像先被编码器压成 latent，再和动作、奖励一起作为序列元素。这样注意力在"事件"层面做，而不是像素层面。
2. **想象 + 策略训练**：策略不直接在真环境训，而是在 Transformer 想象出的 rollout 上做 actor-critic（沿用 Dreamer 的 imagination training 思想），但底层动力学换成了 Transformer。

具体 token 数、上下文长度、是否用向量量化（VQ）等细节需查原文。

*所以这一节是想说：TWM 的新意是"世界模型 = Transformer 自回归序列模型"，再在它想象出的轨迹里训策略。*

---

## 它分几步做的（方法）

这一节是全篇核心，拆成"观察编码、序列拼装、训世界模型、训策略"四步。

整体数据流 ASCII 示意：

```
   真环境 replay ─► CNN 编码 ─► z_t ┐
                                      ├─ 拼成序列 [.. z_{t-1} a_{t-1} r_{t-1} z_t a_t ..] ─► Transformer(因果掩码)
   动作/奖励 ────────────────────────┘         │
                                    预测: z_{t+1}, r_t, done  ──► 世界模型
   世界模型冻住 ─► 想象 rollout ─► actor-critic 在梦里训策略 ─► 回真环境采新数据
```

### 第 1 步：观察编码——把照片压成缩略图

**输入**：每一帧画面 o_t。

**处理**：摄影师不会把高清原图直接塞进相册，会先压小。这里也一样——每帧过 CNN 编码器，压成一个紧凑的小向量 latent z_t。

**输出**：一串缩略图 z_t，让 Transformer 不用啃像素，直接看精华。

> **latent（潜表示）**：经编码器压缩后的低维表示。比原始像素紧凑，也更易建模。

### 第 2 步：序列拼装——像写日记，每天一行

**输入**：每一步的 (z_t, a_t, r_t, done_t)——画面、动作、奖励、是否结束。

**处理**：按时间顺序串成一条 token 序列：`[..., z_{t-1}, a_{t-1}, r_{t-1}, z_t, a_t, ...]`。每种 token 配自己的 embedding 和位置编码。Transformer 按因果掩码（causal mask，只能看历史不能偷看未来）一路自回归。

**输出**：一条可供 Transformer 逐步预测的事件序列。

> 等等，先慢一拍——什么叫"自回归"？就是写小说时下一个字要参考前面所有字。这里就是预测下一帧时把前面所有"日记行"都看一遍。

### 第 3 步：训练世界模型——让学徒抄菜谱

**输入**：真实环境采集的经验回放（replay buffer）里的"做菜全过程录像"。

**处理**：让 Transformer 学会预测——下一帧画面长啥样（z_{t+1}）、这一步拿多少分（r_t）、是不是结束了（done）。loss 是这几项的加权和。

**输出**：一个会"做梦"的模拟器。训完，Transformer 就能凭当前状态 + 动作脑补出后续。

### 第 4 步：策略训练——想象后再行动

**输入**：训好的世界模型（此时冻住）。

**处理**：在它生成的想象 rollout（脑内展开 H 步）里跑 actor-critic——actor 决定下一步走哪、critic 给当前局势打分。脑内练完一轮，再真去环境采新数据，反过来更新世界模型。如此循环。

**输出**：一个在"梦里"练出来、样本效率很高的策略。

> **imagination training（想象训练）**：在世界模型生成的虚拟轨迹里训练策略，不消耗真环境样本。Dreamer 系列的标志做法。

### 等等，先慢一拍——梦会不会越做越离谱？

会，而且这是所有世界模型的通病。想象是自回归的：第 2 步的输入是第 1 步自己预测出来的画面，第 3 步又基于第 2 步……只要每一步有一点小误差，往后滚就会像"传话游戏"一样越传越歪，几十步后梦境可能完全脱离现实。TWM 控制这个问题的办法有几条：一是把想象的展开长度 H 设得不太长（脑内只推演有限几步就回到真环境采一次数据校正），二是靠 Transformer 对长序列的建模能力让每一步的预测本身更准（误差基数小），三是用真实回放数据持续更新世界模型、不让它固化在错误的动力学上。理解这一点，也就理解了为什么世界模型不能无限"闭门造车"，必须周期性地"睁眼看真实世界"。

*所以这一节是想说：TWM 的方法 = CNN 压帧 + 事件序列拼装 + Transformer 自回归预测 + 想象里训 actor-critic + 用有限想象长度和真实数据抑制梦境漂移，组成"学模型—做梦—练策略"的闭环。*

---


下图概括本篇在「关键数字」节前的核心结果脉络（便于对照后文表格）：

```
【TWM: Transformer-based World Models · 关键结果概览】

   设定 / 数据          方法要点              主结果
        │                   │                    │
        ▼                   ▼                    ▼
   训练           ──► 方法核心                   ──► …
   评测           ──► 主指标提升                  ──► ↑ 论文主结论

   （对照下方表格中的原文数字与消融）
```

---

## 关键数字（What works）

> 下表整理关键设定与定性结论；具体归一化分数请查原文，此处不编造。

| 维度 | 说明 |
|------|------|
| 主战场 | Atari 100k（只允许 10 万真环境帧，约 2 小时人类游戏） |
| 游戏数 | 26 个 Atari 游戏 |
| 世界模型主干 | Transformer（替代 RNN/RSSM） |
| 策略训练 | 想象 rollout 里的 actor-critic |
| 对照 | DreamerV2/V3、IRIS、SimPLe、Rainbow 等 |
| 主指标 | 人类归一化得分（中位数/平均） |
| 优势区间 | 长依赖游戏上相对 RNN 世界模型更强 |

关键结论：换成 Transformer 后，TWM 在**长依赖游戏**上表现更好、整体平均分有竞争力，同时训练成本可控。这证明"Transformer 当世界模型"这条路是行得通的。

*所以这一节是想说：数字告诉我们，Transformer 世界模型在样本效率基准上打得过或追平 RNN 世界模型，尤其在需要长记忆的游戏上。*

---

## 实验结果说明了什么

主战场是 **Atari 100k**——只允许 agent 在真环境玩 10 万步，专门考"样本效率"（世界模型方法的传统强项）。

对照组包括 DreamerV2/V3、IRIS、SimPLe、Rainbow（无模型基线）等。核心结论：换成 Transformer 后，在长依赖游戏（如 Frostbite、Alien 这类需要记住早期事件的）上表现更好，整体平均分有竞争力。

论文通常还附消融：上下文窗口长度、token 化方式、image vs latent 输入等。这些告诉你"Transformer 世界模型的哪些设计最关键"。

*所以这一节是想说：实验证明了"序列建模 = 世界建模"这条路可行，Transformer 的长记忆优势在样本效率基准上真的兑现了。*

---

## 你应该懂的几个新词

- **世界模型**：agent 内部学到的环境动力学模拟器，让它在想象里训练。
- **自回归（autoregressive）**：预测下一个元素时把已生成的一起作为输入。GPT 写文章是这套，TWM 搬到"下一帧"。
- **latent**：编码器压缩后的低维表示，比像素紧凑易建模。
- **imagination training**：在世界模型生成的虚拟 rollout 里训策略，不耗真环境样本。
- **causal mask（因果掩码）**：让位置 t 只能看到 ≤ t 的 token，保证训练时不"偷看未来"。
- **actor-critic**：actor 出动作、critic 评估状态价值的经典强化学习框架。
- **Atari 100k**：限制 10 万真环境帧的样本效率基准，世界模型/高效 RL 的常见战场。

*所以这一节是想说：这几个词是理解"世界模型 + 想象训练"这条线的通用基础。*

---

## 它有什么搞不定的

- **想象会累积误差**：世界模型不完美，rollout 越长预测越偏，"梦"做久了会离谱。
- **只在 Atari 验证**：像素游戏和真实机器人差距大，结论迁移到连续控制/真机需谨慎。
- **Transformer 推理开销**：注意力的平方复杂度让长上下文想象变贵，和 Mamba 类线性架构相比不占优。
- **离散/连续动力学取舍**：token 化图像会丢细节，重建质量受编码器限制。
- **和 MuZero 路线不同**：TWM 是生成式（要重建画面），不如 value-equivalent 的 MuZero 那样只学"对决策有用的抽象"，在某些任务上可能学了无关细节。

*所以这一节是想说：TWM 的短板集中在"想象误差累积、只在游戏验证、Transformer 开销"上——它证明了可行，但离通用还有距离。*

---

## 它和别的几篇是什么关系

- **上承 Dreamer 系列**：继承"在想象里训 actor-critic"的范式，把动力学骨干从 RSSM 换成 Transformer。
- **同期对照 IRIS（ICLR 2023）**：思路高度相似（Transformer + token 化世界模型 + Atari 100k），两篇对照读能看不同 token 化的影响。
- **远祖 World Models（Ha, 2018）**：开了"VAE 压图 + RNN 想象"的范式，TWM 是这条线的现代化版本。
- **下游延伸**：Genie（DeepMind 2024）、DIAMOND（用扩散做世界模型）、各种"video as world model"（Sora 之后那波），都共享"世界模型 = 序列/视频生成模型"这个母题。
- **另一条路 MuZero**：不显式建图像，建 value-equivalent 抽象模型 + MCTS。TWM 更"生成式"，MuZero 更"规划式"。
- **和 [UniSim](unisim.md)**：UniSim 把世界模型做成"条件视频扩散"，是 TWM 思路在生成质量维度的放大版。

*所以这一节是想说：TWM 是从"经典 RNN 世界模型"过渡到"现代生成式世界模型"的桥梁性工作。*

---

## 和本导读的关系

本篇对应导读 [Ch15: 世界模型](../guide/ch15-world-models.md)。Ch15 讲 agent 怎么学一个"脑内环境"来省真环境交互。TWM 是这条线上"把主干从 RNN 换成 Transformer"的关键一步——理解它，你就懂了为什么后来大家都在卷"video diffusion 当世界模型"（TWM/IRIS 先证明了 Transformer 行，剩下只是把生成器换更强）。读完本篇，配合同章的 `unisim`（视频扩散世界模型）、Dreamer 系列，能串出世界模型的完整演化。

*所以这一节是想说：把 TWM 放进 Ch15 的世界模型主线里读，它是 RNN 时代通往生成式时代的桥。*

---

## 思考题

**Q1：为什么 Transformer 世界模型在"长依赖游戏"上相对 RNN 优势最大？**

<details>
<summary>提示</summary>

RNN 靠一个隐状态一格格传，历史越长越容易遗忘。Transformer 用注意力直接看整段历史，20 步前捡的钥匙也能"回头看到"。长依赖任务正是考记忆的地方。
</details>

**Q2：想象训练里，世界模型的预测误差会怎样影响策略？**

<details>
<summary>提示</summary>

策略在"梦"里学。如果梦（世界模型）不准，策略会学到基于错误动力学的行为，真环境里就翻车。rollout 越长误差累积越严重，所以想象步数 H 要控制。
</details>

**Q3：为什么要用因果掩码？去掉它训练会出什么问题？**

<details>
<summary>提示</summary>

因果掩码保证预测第 t+1 步时只能看 ≤ t 的信息。去掉它模型会"偷看未来"，训练时轻松作弊，但推理时没有未来可看，性能崩溃。
</details>

**Q4：TWM 和 MuZero 都能做决策，但一个"生成画面"、一个"学抽象价值模型"，各有什么取舍？**

<details>
<summary>提示</summary>

TWM 重建画面，直观可视但可能学了对决策无关的细节；MuZero 只学"对预测价值有用"的抽象，更省但不可视、也不能直接生成观测。生成式 vs 规划式的经典取舍。
</details>

**Q5：把 TWM 的 Transformer 换成 Mamba 类线性架构，可能带来什么好处和风险？**

<details>
<summary>提示</summary>

好处：线性复杂度，长上下文想象更省更快。风险：Mamba 的固定隐状态可能不如注意力那样精确地"回看"任意历史事件，长依赖建模能力需验证。这正是效率 vs 精确记忆的权衡。
</details>

**Q6：TWM 只在 Atari 验证，你觉得把它搬到真实机器人连续控制，最大的障碍是什么？**

<details>
<summary>提示</summary>

真实观测更高维、动力学更复杂、接触物理难建模，重建质量和想象误差都会更严重；且真机采数据比游戏贵得多。生成式世界模型在真机上的保真度是核心挑战。
</details>

*所以这一节是想说：这几个问题带你把"长记忆、想象误差、因果掩码、生成 vs 规划、架构取舍"这些核心点自己推一遍。*

---

## 一些好奇心问答（FAQ）

**Q1：为什么叫"世界模型"？听起来很玄。**

因为它是 agent 对"世界怎么运转"的内部模型——给它当前状态和一个动作，它能预测世界接下来变成什么样。人下棋时脑子里"如果我走这步、对手会走那步"的推演，就是一个世界模型。

**Q2：TWM 和 Dreamer 到底谁强？**

在 Atari 100k 上两者是同一梯队，TWM 在长依赖游戏上有优势。DreamerV3 是很强的通用基线。它们的本质区别是主干（Transformer vs RNN/RSSM）。

**Q3：想象训练不会"闭门造车"吗？**

会有风险。所以是闭环——脑内练一轮后要回真环境采新数据更新世界模型，防止模型偏离现实太远。

**Q4：TWM 和 IRIS 几乎同时出现，该看哪个？**

两篇思路极像，建议对照读。IRIS 的 token 化和 TWM 略有不同，对比能看出设计选择怎么影响结果。

**Q5：这条线现在发展到哪了？**

到了"用视频生成模型当世界模型"的阶段——Genie、DIAMOND（扩散）、[UniSim](unisim.md) 等，把生成器换得越来越强。TWM 是这条演化的早期关键节点。

**Q6：读完 TWM 接下来看什么？**

想看 RNN 前身看 Dreamer；想看现代生成式世界模型看 [UniSim](unisim.md)；想看规划式路线看 MuZero。

*所以这一节是想说：为什么叫世界模型、和 Dreamer 怎么比、会不会闭门造车——这些问题都有清楚答案。*

---

## 如果你想再深入

按"前身 → 同期 → 后续"排序：

1. **前身：Dreamer / DreamerV2** —— 理解"想象里训 actor-critic"的双层闭环，是读 TWM 的前置。
2. **同期：IRIS** —— 几乎孪生的 Transformer 世界模型，对照读看 token 化差异。
3. **远祖：World Models（Ha, 2018）** —— "VAE 压图 + RNN 想象"的开山之作。
4. **后续：[UniSim](unisim.md) / Genie / DIAMOND** —— 把世界模型做成视频生成模型的现代版本。

*所以这一节是想说：把 Dreamer + TWM/IRIS + UniSim 连起来读，就能看懂世界模型从 RNN 到生成式的完整演化。*

---

## 原文信息

- 标题：Transformer-based World Models Are Happy With 100k Interactions
- arXiv：https://arxiv.org/abs/2303.07109
- 会议：ICLR 2023
- 年份：2023

BibTeX：

```bibtex
@inproceedings{robine2023twm,
  title     = {Transformer-based World Models Are Happy With 100k Interactions},
  author    = {Robine, Jan and H{\"o}ftmann, Marc and Uelwer, Tobias and Harmeling, Stefan},
  booktitle = {International Conference on Learning Representations (ICLR)},
  year      = {2023},
  url       = {https://arxiv.org/abs/2303.07109}
}
```

*所以整篇是想说：TWM 把世界模型这台"做梦引擎"从 RNN 升级成 Transformer——它证明了"世界建模就是序列建模"，为后来一整波"用生成模型当世界模型"的工作铺好了路。*
