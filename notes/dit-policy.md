---
title: "DiT-Policy"
slug: dit-policy
topic: diffusion-policy
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2410.10088"
venue: ICRA
year: 2025
era: frontier
num: 42
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

把画图领域火起来的新骨架（DiT）搬到机器人身上，再把每个零件挨个拆开看，到底哪个让它真变好。

## 这是个什么场景

你家原本用一口家用小锅（U-Net 骨架）做菜，照着一本叫"扩散策略（diffusion policy）"的菜谱：先把一锅"噪声"煮糊，然后一勺勺去掉杂质，最后端上桌的不是菜，是机器人下一步该怎么动的一串动作。

后来你发现隔壁做甜品（图像生成）的大厨们集体换了一种新型多功能料理台（Transformer / DiT），又快又稳。你心动了，也搬了一台回来——菜确实更好吃。

但问题来了：是新台子的功劳？还是你顺手买了更贵的食材（更大的模型）？还是新台子那个看起来不起眼的火候旋钮（条件注入 conditioning）才是真正的关键？

DiT-Policy 干的事就是——把台子、食材、旋钮一件件换回旧的，单独测，最后告诉你：哪个零件真的让菜变好吃，哪个其实可有可无。

## 之前的人怎么做的 — 3-5 bullet

- **Diffusion Policy（Chi et al. 2023）**：开山之作，用 U-Net 1D conv 骨架对动作序列做去噪，演示了扩散模型在机器人 imitation learning 上的潜力，但骨架是卷积。
- **Transformer 版 Diffusion Policy**：原论文里也给了一个 Transformer 变体，但是相对小、消融不彻底，社区普遍默认 U-Net 版更稳。
- **图像/视频生成领域的 DiT（Peebles & Xie 2022）**：证明在生成任务上，纯 Transformer 骨架 + AdaLN 条件注入可以替代 U-Net 并随容量平滑 scale，催生了 Sora 等后续工作。
- **大容量行为克隆（RT-1 / RT-2 / Octo）**：尝试用 Transformer 加大模型来吞海量遥操作数据，但用的是离散 token 或回归头，不是扩散建模。
- 因此一个空缺：扩散策略想 scale，应该照搬 DiT 的哪些组件？哪些不必？没人系统回答过。

## 这篇论文的关键想法

核心一句话：**让扩散策略骨架 scale 的关键不是"换成 Transformer"，而是 DiT 那一整套设计选择的组合——尤其是条件注入方式和训练稳定性 trick——而其中只有少数几个真的不可或缺。**

具体的几个判断：

- 直接把 U-Net 换成同等参数量的 Transformer，提升有限；但用 DiT 的 AdaLN-Zero 风格条件注入后，性能曲线开始随容量持续上升。
- 观测条件（视觉 + 状态）应该作为"全局调制信号"注入到每个 block 的 LayerNorm 上，而不是简单 concat 到 token 序列里——后者在小数据下容易过拟合。
- 时间步 t（diffusion timestep）和观测条件应该走同一条调制通路，这样模型在不同 t 下能用不同子网络模式去噪。
- 这套配方让扩散策略第一次出现"加参数 = 稳定收益"的曲线，而不是过去 U-Net 版那种容量到一定程度就饱和的现象。

## 它怎么做的（方法）— 3-4 段

**骨架替换**。先把灶台换掉。原 Diffusion Policy 用的是 1D U-Net（一种卷积骨架），换成纯 Transformer 堆叠：动作序列 chunk（一次预测未来 H 步动作）当作一串 token 喂进去，每层就是标准的 self-attention + MLP。但单换灶台效果一般，菜没明显变好——真正的关键在下一步的"火候旋钮"。

**条件注入用 AdaLN-Zero**。这一步像厨师做菜时一边尝一边调火候。所有外部信息——摄像头看到的画面（视觉编码，来自 ResNet 或 ViT）、机器人自己的姿态（proprioception，本体状态）、扩散去噪走到第几步（时间步 t）——先拼成一个大向量，再通过一个小 MLP 算出每个 Transformer block 里 LayerNorm 的缩放和平移参数（scale, shift, gate）。

> 等等，先慢一拍 — AdaLN-Zero 是什么？
>
> AdaLN = Adaptive LayerNorm，意思是"会根据外部条件动态调整的归一化层"。"Zero" 指那个 gate 初始化为 0——开机时这条调制通路完全不起作用，网络等价于啥也没改的原版；训练过程中网络再慢慢学会"什么时候该把火调大、什么时候调小"。这套做法比直接 concat 表达力强，又比 cross-attention 轻，是 DiT 论文里被验证过的 trick。

**消融矩阵**。像汽车厂的 A/B 测试，每次只换一个零件。他们在多个机器人任务（包含 sim 和 real 两类，具体任务集需读原文）上跑全因子消融，分别开关：(a) 骨架（U-Net vs Transformer），(b) 条件注入（concat vs cross-attn vs AdaLN-Zero），(c) 模型容量（参数量从小到大），(d) 训练 trick（EMA、学习率 schedule 等）。然后报告每种组合的成功率曲线——这才知道哪个零件真的让菜变好吃。

**训练协议**。比赛规则不变才能比出真高低。loss 仍然用标准的扩散 ε-prediction（让网络预测加进去的噪声）；推理用 DDIM 几十步去噪即可，不换新采样器。这点很重要——确保性能差异都来自架构本身而不是采样花招，让消融结论更干净。

## 实验在做什么

- **任务覆盖**：包含若干仿真 benchmark（如 Robomimic、PushT 类）和真实机器人 manipulation 任务，覆盖刚体抓取、柔性物体、长 horizon 操作。具体任务列表与数量需读原文确认。
- **指标**：成功率（success rate）为主，辅以动作平滑度、轨迹误差等。
- **消融结论的形态**：典型呈现是"参数量 vs 成功率"折线图，对比有无 AdaLN-Zero、有无 Transformer 骨架时曲线斜率的差异。
- **Scaling 趋势**：在采用 DiT 完整配方后，模型从小到大成功率单调上升；而对照组在某个容量后饱和甚至下降。具体的拐点在哪、最大模型多大，需读原文。
- **真实机器人结果**：相比基线 Diffusion Policy，在精细操作任务上提升明显，尤其是需要长 horizon 规划的场景。具体数字需读原文。

## 你应该懂的几个新词 — 4-6 个

- **Diffusion Policy**：用扩散模型对"未来动作 chunk"建模的策略学习方法。把"决定下一步怎么动"看作一个去噪过程：从纯噪声一步步还原成合理动作序列。
- **DiT（Diffusion Transformer）**：Peebles & Xie 提出的纯 Transformer 扩散骨架，在图像生成上证明可平滑 scale，是 Sora、Stable Diffusion 3 的祖先骨架。
- **AdaLN-Zero**：Adaptive LayerNorm with Zero initialization。把外部条件（如时间步、文本）映射成 LayerNorm 的 scale/shift/gate，初始化 gate=0 让网络从恒等映射出发慢慢学。比 cross-attention 轻量，比 concat 表达力强。
- **Action chunk**：一次预测未来 H 步动作而不是只预测下一步。让策略有"短期规划"能力，缓解 imitation 中的 distribution shift。
- **ε-prediction**：扩散训练里让网络预测加上去的噪声，而不是直接预测干净数据。是 DDPM 默认配方。
- **Conditioning**：条件注入，把外部信息（图像、状态、时间步）告诉去噪网络的方式。concat / cross-attention / AdaLN 是三种主流做法。

## 它和其他论文什么关系

- **上游**：Diffusion Policy（Chi 2023）提供了"用扩散建动作"的范式；DiT（Peebles 2022）提供了 Transformer 扩散骨架的设计模板。这篇是两者的合流。
- **平行**：与 RDT-1B、π0 等大模型 manipulation 工作目标类似（scale 扩散策略），但路径不同——RDT 直接训大模型 + 大数据，π0 引入 flow matching 和 VLM 主干；DiT-Policy 更偏向"先把骨架配方搞清楚"。
- **对比**：和 Octo / RT-2 这类离散 token / 回归头的策略不同，它坚持扩散建模，认为扩散对多模态动作分布（同一观测下多种合理动作）建模更自然。
- **下游**：之后的扩散策略工作（包括公司里做 manipulation 的同学想 scale 时）大概率会引用它的消融结论作为"架构选型默认配方"。

## 我建议这样读 — 3-4 步

1. 先看 abstract 和最后一张消融表，记住"什么开关 = 多少成功率提升"的数值，建立直觉。
2. 看方法节中 AdaLN-Zero 那段公式，亲手画一遍条件注入的数据流（条件 → MLP → scale/shift/gate → LayerNorm）。
3. 跳到实验节挑 1-2 个你熟悉的任务（如 PushT），对比 baseline Diffusion Policy 和 DiT-Policy 的曲线，理解"在什么任务上提升最大、为什么"。
4. 最后回头看 related work，把它放进 RDT / π0 / Octo 的坐标系里，搞清楚它在"扩散策略 scale up 路线图"上的位置。

## 为什么值得读

- 它是少有的"诚实做消融、不藏 trick"的策略学习论文，结论可直接复用。
- 如果你以后要做 manipulation 项目并且数据量在中等以上（几千到几万条 demo），这篇的配方（Transformer + AdaLN-Zero + action chunk）是一个非常稳的起点，避免你重新踩坑。
- 顺便补齐"图像生成圈的架构演进 → 机器人圈"的知识链路：理解 DiT 在图像里为什么强，再看它在动作上为什么也强，会让你对"模态无关的 scaling 规律"形成更统一的图景。
- 难度 ⭐⭐⭐⭐ 不是因为数学难，而是要同时持有"扩散模型 + Transformer 架构 + 机器人 imitation"三个上下文才能读出味道——读完这一篇，三个领域的接口你就打通了。
