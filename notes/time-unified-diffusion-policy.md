---
title: "Time-Unified Diffusion Policy with Action Discrimination for Robotic Manipulation"
slug: time-unified-diffusion-policy
topic: diffusion-policy
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2506.09422"
venue: arXiv
year: 2025
era: frontier
num: 188
generated_at: 2026-07-15
---

# TUDP：把 diffusion policy 的多步去噪变成更统一、更会认动作的过程

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本和 arXiv 元数据能支持的结论；本站没有复现 RLBench、真实机器人或任何训练实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

Time-Unified Diffusion Policy with Action Discrimination 提出 TUDP，用于更高效、更准确地生成机器人动作。它的出发点是：普通 diffusion policy 要经过很多 denoising iterations，且不同 denoising time 的 velocity field 不同，模型既慢又难学。TUDP 设计 time-unified velocity field，并加入 action discrimination，让模型更清楚 noisy action 应该朝哪个 successful action 收敛。

论文报告 TUDP 在 RLBench multi-task manipulation 上达到 state-of-the-art，multi-view setup 最高平均成功率 82.6%，single-view setup 83.8%。作者还强调，在 denoising iterations 更少时，TUDP 的改进更明显，并展示了 real-world tasks 中的动作生成能力。

如果只记一个直觉：普通 diffusion policy 像每一步都换一张地图找出口；TUDP 想让每一步都沿着更统一的方向走，并让模型先判断“这个 noisy action 更像哪个成功动作附近”。

*所以这一节是想说：TUDP 主要解决 diffusion policy 慢和去噪方向混乱的问题。*

## 这是个什么场景

机器人操作经常有多种成功动作。比如把杯子放到桌上，轨迹可以从左边绕，也可以从右边绕；抓一个把手，可以从不同角度接近。Diffusion policy 擅长建模这种多模态动作分布，因为它不是只输出一个平均动作，而是通过去噪生成动作序列。

但扩散模型的代价是推理慢。每次动作生成要经过多步 denoising。如果一个机器人要实时控制，100 次 denoising iterations 就可能太慢。特别是复杂 manipulation 中，动作要频繁更新，推理延迟会影响闭环执行。

TUDP 的场景就是在不牺牲准确性的前提下加速 diffusion policy。它不是简单减少 steps，也不是用 teacher distillation，而是重新思考 action denoising 的方向场。

```text
普通 diffusion policy 的痛点

noisy action
   │
   ├─ timestep 1: 一套 denoising direction
   ├─ timestep 2: 另一套 denoising direction
   ├─ timestep 3: 又一套 denoising direction
   ▼
successful action

问题：时间变化复杂、容易混淆、迭代多。
```

*所以这一节是想说：TUDP 面向的是 diffusion policy 在动作空间里的效率和准确性问题。*

## 之前的人怎么做的，为什么不够好

原始 diffusion policy 把动作生成看成 conditional denoising diffusion process。它从噪声动作开始，逐步去噪，最后得到可执行动作。这种方法稳定、能处理多模态分布，但迭代成本高。

已有加速方法有几类。READ 用 image-action database 找更好的 initial noise actions，减少 denoising rounds；ManiCM 用 consistency distillation；FlowPolicy 用 flow matching distill 更高效路径。这些方法都能加速，但各有代价。

数据库式方法可能泛化差，因为新任务未必能检索到合适 action；distillation 方法依赖 teacher model，也可能牺牲 accuracy。TUDP 想避免这些问题：不只是减少 steps，而是让 denoising field 更简单、更统一。

论文指出两个困难。第一，same noisy action 可能对应多个 successful actions，尤其在早期噪声很大时，模型不知道该往哪个成功动作去。第二，time-varying action denoising 要学习不同 timesteps 的 velocity fields，训练复杂度高。

*所以这一节是想说：旧加速方法要么依赖检索/蒸馏，要么仍没解决动作去噪方向混乱。*

## 这篇论文的新想法

第一，新想法是 time-unified velocity field。TUDP 希望不同 denoising time 下的方向场更统一，降低模型学习复杂度，让 noisy actions 更快收敛到 successful actions。

第二，新想法是 action discrimination。模型先学习区分 successful action neighborhoods 和 outside regions，让 denoising 时知道某个 noisy action 更应该靠近哪个成功动作区域。

第三，新想法是 action-wise training。训练分两步：先训练 action discrimination network，再用 action-weighted loss function 结合 discrimination information 优化 unified diffusion network。

第四，新想法是强调少步去噪下的收益。论文报告当 denoising iterations 更少时，TUDP 的成功率提升更明显，这说明 time-unified design 对效率场景特别有用。

```text
TUDP 核心组件

Action discrimination network
        │
        ▼
判断 noisy action 靠近哪个 successful action neighborhood
        │
        ▼
Time-unified velocity field
        │
        ▼
更少 denoising iterations 生成准确动作
```

*所以这一节是想说：TUDP 给 diffusion policy 加了“认动作方向”的能力。*

## 它分几步做的（方法）

### 第 1 步：分析 action denoising 的两类困难

输入是 noisy actions 和 successful action distribution。普通 diffusion policy 在不同 timesteps 加噪，早期 noisy actions 近似 Gaussian，不同 successful actions 的噪声分布重叠严重。

处理过程是分析这个重叠导致的 ambiguity。模型看到 noisy action 时，不知道应该去哪个 successful action。输出是第一个问题：difficulty in determining corresponding successful action。

第二个问题是 time-varying denoising。每个 timestep 都有不同 velocity field，模型要学习复杂的时间相关映射。输出是训练复杂度和推理时间增加。

### 第 2 步：设计 time-unified velocity field

TUDP 用更统一的 velocity field 替代传统 time-varying field。它希望 action denoising 的方向更稳定，让 noisy action 沿更直接路径收敛到 successful action。

输入是 noisy action、observation condition 和 action distribution。处理是建模低 temporal complexity 的统一方向场。输出是一个更容易拟合、也更适合少步推理的 denoising process。

这一步的直觉像把弯弯绕绕的路变成直路。不是每个时间点都学一套复杂规则，而是让模型更多学习“从这里往成功动作邻域走”的统一规律。

### 第 3 步：训练 action discrimination network

Action discrimination network 的输入是 action 相关表示，输出是 successful action neighborhood 的 discrimination 信息。它帮助模型判断当前动作是否在成功动作附近，或者更接近哪个成功动作区域。

处理过程是先单独训练这个 discrimination network。这样 diffusion network 后续训练时可以利用它提供的 action-wise 权重或方向提示。

输出是 discrimination signal。这个 signal 不是最终动作，而是告诉 denoising 模型“哪些动作更像成功动作、哪些区域应该重点优化”。

### 第 4 步：action-weighted loss 训练 diffusion network

第二阶段训练 unified diffusion network。输入是 demonstration actions、noisy actions、observation、discrimination information。处理是用 action-weighted loss function，让模型更关注成功动作邻域和对应 denoising direction。

输出是 TUDP policy。它在推理时能用更少 denoising steps 生成动作，并保持较高 success rate。

这里的关键是联合：只有 unified velocity field 可能还不够，只有 action discrimination 也不够。TUDP 把两者组合起来，让动作去噪既简单又有目标。

### 第 5 步：在 RLBench 上评估

论文在 RLBench multi-task manipulation benchmark 上训练和评估。文本显示使用 18 distinct tasks，每个任务 150 demonstrations，Franka Panda 机械臂，RGB-D images 来自 front、left shoulder、right shoulder、wrist 四个 noiseless cameras。

输入是多视角或单视角观察。处理是 TUDP 推理动作。输出是 task success rate。论文报告 multi-view setup 最高平均成功率 82.6%，single-view setup 83.8%。

### 第 6 步：真实机器人实验和 ablation

论文也展示 real machine experiments，验证 TUDP 能在真实任务中产生准确动作。Ablation 则用于验证 time-unified field、action discrimination、action-weighted loss 等组件是否真正贡献性能。

这些实验说明 TUDP 不只是理论替换，还关注部署效率。不过具体真实机器人结果仍应回原文表格和视频核验，不能仅凭摘要扩大结论。

*所以这一节是想说：TUDP 的方法是先让模型“认成功动作区域”，再用统一去噪场快速生成动作。*

## 关键数字

| 数字 | 原文语境 | 这说明什么 |
|---:|---|---|
| 18 | RLBench distinct tasks | 评估是 multi-task manipulation |
| 150 | demonstrations per task | 每个任务训练示范规模 |
| 4 | RGB-D cameras | front、left shoulder、right shoulder、wrist |
| 82.6% | multi-view setup highest average success | 论文报告的 SOTA 结果之一 |
| 83.8% | single-view setup highest average success | 单视角下也报告高成功率 |
| 100 | 论文提到当前 3D diffusion policies 可需约 100 denoising iterations | TUDP 关注效率瓶颈 |
| 4 NVIDIA 4090 | 训练硬件设置 | 训练资源语境 |

这些数字全部是论文报告，不是本站复现实验。尤其 82.6% 和 83.8% 必须回到原文表格确认视角设置、baseline 和统计方式。

*所以这一节是想说：TUDP 的证据重点是 RLBench 成功率和少步去噪下的效率优势。*

## 实验结果说明了什么

实验说明 time-unified denoising 确实有可能改善 diffusion policy 的效率和准确性。TUDP 在 RLBench 上达到较高成功率，说明统一方向场和 action discrimination 没有牺牲性能。

少步 denoising 下的提升尤其重要。机器人实际控制中，推理时间是硬约束。如果一个 policy 只能在很多 denoising steps 下表现好，真实部署会受限。TUDP 把重点放在 fewer denoising iterations，更贴近实时 manipulation 的需求。

实验还说明 action discrimination 能帮助多成功动作场景。多个 successful actions 并存时，普通 diffusion policy 容易混淆；如果模型能先判断动作邻域，就更容易朝一个具体成功模式收敛。

不过，TUDP 主要在 RLBench 和有限真实任务上验证。它是否能扩展到更开放语言、更复杂接触、更长时序任务，仍需进一步实验。

还有一个值得注意的边界：TUDP 优化的是“给定条件后如何更快生成动作”，不是“如何理解任务”。如果 observation 本身不够，或者任务语言没有被正确编码，time-unified field 也无法补足上游信息。因此它更适合作为底层动作生成模块的改造，可以和 VLM、skill router、history trace 这类上层条件一起用。

从学习路径看，TUDP 把 diffusion policy 的问题拆得很清楚：多模态动作分布带来成功动作选择问题，时间变化的去噪场带来训练复杂度问题。它不是靠更大模型硬压，而是改变动作空间里的学习目标。这类思路对理解机器人 policy 很重要，因为很多部署瓶颈不是“模型不够大”，而是生成过程的结构不适合实时控制。

*所以这一节是想说：TUDP 是 diffusion policy 的效率改造，而不是新的任务语义层。*

## 术语表

- Time-unified velocity field：时间上更统一的去噪方向场，降低 time-varying denoising 复杂度。
- Action discrimination：判断动作是否属于成功动作邻域，或更接近哪个成功动作区域。
- Successful action neighborhood：成功动作附近的局部区域。
- Denoising iteration：扩散模型从噪声到动作的一次去噪步骤。
- Action-weighted loss：根据 action discrimination 信息加权的训练损失。
- RLBench：机器人操作仿真 benchmark。
- RGB-D：RGB 图像加深度信息。

*所以这一节是想说：TUDP 的关键词都围绕动作空间去噪。*

## 局限和边界

第一，TUDP 不是语言理解方法。它主要解决 action denoising efficiency，不直接处理 open-vocabulary instructions。

第二，action discrimination 的质量会影响 denoising。若 discrimination network 学错成功动作邻域，policy 也会被误导。

第三，RLBench 是重要 benchmark，但真实世界有更多摩擦、遮挡、传感器噪声和物体变化。

第四，time-unified field 是否适合所有 action distributions 还需要更多任务验证。极端复杂、多阶段、强接触任务可能仍需要更丰富的条件。

第五，论文报告的高成功率不能写成本站复现，也不能直接推断所有 diffusion policy 都应改成 TUDP。

第六，TUDP 的动作判别依赖示范数据覆盖。如果真实任务出现训练集中没有的成功动作模式，discrimination signal 可能无法正确指向新模式。

这也是扩散策略落地时必须持续补数据的原因。

*所以这一节是想说：TUDP 改善的是去噪机制，但不自动解决所有具身任务复杂性。*

## 和其他论文的关系

和 `disco-diffusion-policy` 相比，TUDP 不关注 VLM keyframes 或开放语言，而关注动作去噪本身。

和 `primitive-skill-diffusion-policy` 相比，TUDP 的中间信息是 action discrimination，SDP 的中间信息是 human-understandable primitive skills。

和 `trace-focused-diffusion-policy` 相比，TUDP 解决 denoising time 和 successful action ambiguity，TF-DP 解决长程执行中同一观察对应不同阶段动作的 ambiguity。

和原始 `diffusion-policy` 相比，TUDP 可以看作对 action diffusion process 的效率和判别能力增强。

*所以这一节是想说：TUDP 是 Batch 7 里“加速和稳定动作去噪”的代表。*

## 和本导读的关系

本站读 diffusion policy 时，最先要理解“动作不是直接预测，而是从噪声迭代生成”。TUDP 正好回答下一个问题：如果迭代太慢、方向太混乱，怎么优化？

它适合和 Efficient VLA、MoE diffusion policy、FlowPolicy、consistency policy 等效率方向一起看。它提醒读者，具身模型落地不只看成功率，也要看推理步骤和闭环延迟。

*所以这一节是想说：TUDP 补齐了 diffusion policy 的效率优化视角。*

## 思考题

1. 为什么 diffusion policy 适合多模态动作分布？
2. 多个 successful actions 会怎样干扰 early denoising？
3. Time-unified velocity field 为什么可能比 time-varying field 更容易训练？
4. Action discrimination network 起到什么辅助作用？
5. 为什么 fewer denoising iterations 对真实机器人很关键？

## FAQ

**Q：TUDP 是不是替代 Diffusion Policy 的完整新范式？**
A：它是对 action denoising process 的改进，仍属于 diffusion policy 路线。

**Q：TUDP 处理自然语言指令吗？**
A：本文主要关注机器人动作生成效率和准确性，不是开放语言理解框架。

**Q：82.6% 和 83.8% 是本站跑出来的吗？**
A：不是。它们是论文在 RLBench 设置下报告的结果。

**Q：为什么 single-view 结果会高于 multi-view？**
A：需要回原文表格和实验设置核验，不能只凭数字做泛化解释。可能与任务、模型、训练设置或统计方式有关。

## 进一步读什么

- `diffusion-policy`：理解动作扩散基础。
- FlowPolicy / consistency policy：理解 diffusion policy 加速路线。
- `trace-focused-diffusion-policy`：理解长程阶段歧义和历史条件。
- `primitive-skill-diffusion-policy`：理解技能中间层如何辅助动作生成。

## 精读补充：为什么“更少去噪步数”不是简单减小循环次数

TUDP 最容易被误读成“把 diffusion policy 的循环次数调小”。其实如果只是粗暴减少 denoising steps，动作会更快，但也更容易不准。扩散模型的每一步都在修正噪声动作，如果步数减少而方向场仍然复杂，模型还没来得及走到成功动作区域，就被迫输出。

Time-unified velocity field 的意义是先改变路，再减少步数。它把不同 timesteps 下复杂变化的去噪方向，尽量变成更统一、更直接的收敛路径。这样少走几步仍可能到达成功动作附近。类比走迷宫，不是单纯少走路，而是先把路线拉直。

Action discrimination 解决的是另一个问题：动作空间里可能有多个成功峰值。对于同一个任务，抓左侧、抓右侧、从上方靠近都可能成功。早期 noisy action 很难看出应该朝哪个峰值走。Discrimination network 相当于先判断“这个点属于哪个成功动作邻域”，再指导 denoising，这比盲目平均多个模式更稳。

这也说明 TUDP 和语言/技能方法互补。DISCO、SDP、TF-DP 都在给 policy 添加更好的条件；TUDP 则是在条件确定之后，让动作生成本身更快更准。未来一个真实系统完全可能同时用语言 keyframe、primitive skill、history trace 和 time-unified denoising。

*所以这一节是想说：TUDP 的效率来自更容易学习的动作去噪结构，而不是简单砍掉推理步骤。*

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：time-unified velocity field 公式、action discrimination network 训练、action-weighted loss、18 RLBench tasks、150 demonstrations per task、四个 RGB-D cameras、82.6% multi-view 和 83.8% single-view 对应表格、真实机器人实验设置。

## 原文信息

- arXiv: [2506.09422](https://arxiv.org/abs/2506.09422)
- PDF: [https://arxiv.org/pdf/2506.09422](https://arxiv.org/pdf/2506.09422)

```bibtex
@article{niu2025timeunified,
  title = {Time-Unified Diffusion Policy with Action Discrimination for Robotic Manipulation},
  author = {Niu, Yunsong and Zhou, Sanping and Li, Yizhe and Den, Ye and Wang, Le},
  journal = {arXiv preprint arXiv:2506.09422},
  year = {2025}
}
```
