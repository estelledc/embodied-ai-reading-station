---
title: "Asynchronous Fast-Slow Vision-Language-Action Policies for Whole-Body Robotic Manipulation"
slug: fast-slow-vla
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2512.20188"
venue: arXiv
year: 2025
era: frontier
num: 174
generated_at: 2026-07-14
---

# DuoCore-FS：让慢思考和快控制真正异步运行

> 这是一份面向零基础读者的结构化研究笔记。本文只把公开论文文本和 arXiv 元数据能支持的结论写成事实；本站没有本地训练、仿真或真机复现实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

DuoCore-FS 面向全身机器人控制：慢系统用 3B VLM 做语义推理，快系统以 25–30Hz 生成连续全身动作，两者通过 bridge buffer 异步连接，不再让快控制等待慢推理。

如果只记一个直觉：第 3 批从“模型能不能统一”推进到“模型能不能部署”。真实机器人需要低延迟、少量示范适配、长程稳定和全身协调。


*所以这一节是想说：DuoCore-FS 的价值在于把 VLA 从论文分数推近真实部署约束。*

## 这是个什么场景

人拿勺子舀爆米花时，大脑不需要每 30 次/秒重新读一遍任务说明。慢思考负责理解目标，快反射负责连续控制手臂和身体。DuoCore-FS 就是把这两套节奏拆开，但仍让它们共享同一训练目标。

```text
第 3 批主线：部署效率与快速适配

训练课程 / 自适应计算 / one-shot 技能 / 快慢系统
          │
          ▼
       DuoCore-FS
          │
          ▼
让 VLA 更接近真实机器人部署：快、稳、可适配
```

```text
部署视角

[视觉语言理解] -> [动作生成] -> [真实/仿真执行]
      │              │              │
      ├─ 成本：算力/延迟
      ├─ 适配：新任务/新身体
      └─ 稳定：长程/异常/实时控制
```

这个场景强调工程约束。一个模型在离线 benchmark 上成功，不代表它能以足够频率控制真实机器人；能在一个任务上成功，也不代表换环境后一条示范就能适配。


*所以这一节是想说：读 DuoCore-FS 要把成功率和部署条件一起看。*

## 之前的人怎么做的，为什么不够好

双系统 VLA 往往名义上有 slow VLM 和 fast action expert，但实际推理仍同步，fast module 要等 slow module 更新。全身操作有更多关节、更大动作空间和动态视角，同步设计会限制控制稳定性和实时性。

过去很多 VLA 论文默认强 backbone 每步完整运行，或者默认新任务可以靠再次 fine-tune 解决。但真实部署里，等待大模型推理会降低控制频率，收集几十条示范也可能太贵，长程任务一旦早期失败后续步骤就不可达。第 3 批论文分别从训练课程、推理压缩、无梯度适配和异步控制四个方向补这些缺口。


*所以这一节是想说：旧方法的问题不是能力完全不够，而是部署成本、适配成本和实时性不够。*

## 这篇论文的新想法

DuoCore-FS 构建真正异步 fast-slow VLA：slow pathway 1–3Hz 生成语义/推理表示，写入 bridge buffer；fast pathway 25–30Hz 读取最新 latent representation，结合当前视觉和 proprioception，用 diffusion-policy 生成全身动作。两路端到端联合训练。

这类新意的核心是把约束显式建模。与其希望模型自己学会省算力、自己学会迁移、自己学会快慢分工，不如给它可学习的结构和评测指标。


*所以这一节是想说：DuoCore-FS 的新意是把部署约束变成训练或推理机制的一部分。*

## 它分几步做的（方法）

### 第 1 步

**输入**：slow system：用 3B PaliGemma/π0-FAST 级 VLM 处理多视角图像和语言，生成 reasoning tokens 与 bridge embeddings。

**处理**：这一环都在回答部署问题：模型不只是要看懂，还要能在真实频率、有限数据和新任务环境下稳定输出动作。第 3 批论文的共同点，是把“能跑”放到和“能懂”一样重要的位置。

**输出**：得到更高效、更可适配或更稳定的 VLA 行为。类比成开车：导航负责路线，司机负责实时控制，车辆状态决定什么时候该省油、什么时候该全力响应。

### 第 2 步

**输入**：bridge buffer：缓存 slow system 表示，fast system 即使没有新 slow 输出也继续用最近表示控制。

**处理**：这一环都在回答部署问题：模型不只是要看懂，还要能在真实频率、有限数据和新任务环境下稳定输出动作。第 3 批论文的共同点，是把“能跑”放到和“能懂”一样重要的位置。

**输出**：得到更高效、更可适配或更稳定的 VLA 行为。类比成开车：导航负责路线，司机负责实时控制，车辆状态决定什么时候该省油、什么时候该全力响应。

### 第 3 步

**输入**：fast system：Transformer diffusion policy 以 25–30Hz 输出 Astribot S1 的 whole-body action。

**处理**：这一环都在回答部署问题：模型不只是要看懂，还要能在真实频率、有限数据和新任务环境下稳定输出动作。第 3 批论文的共同点，是把“能跑”放到和“能懂”一样重要的位置。

**输出**：得到更高效、更可适配或更稳定的 VLA 行为。类比成开车：导航负责路线，司机负责实时控制，车辆状态决定什么时候该省油、什么时候该全力响应。

### 第 4 步

**输入**：whole-body action tokenizer：用 RVQ-VAE 表示高维关节配置，避免 FAST tokenizer 产生过长 token 序列。

**处理**：这一环都在回答部署问题：模型不只是要看懂，还要能在真实频率、有限数据和新任务环境下稳定输出动作。第 3 批论文的共同点，是把“能跑”放到和“能懂”一样重要的位置。

**输出**：得到更高效、更可适配或更稳定的 VLA 行为。类比成开车：导航负责路线，司机负责实时控制，车辆状态决定什么时候该省油、什么时候该全力响应。

### 第 5 步

**输入**：cross-timescale training：随机采样 slow/fast 观测延迟，模拟部署中的异步时间差。

**处理**：这一环都在回答部署问题：模型不只是要看懂，还要能在真实频率、有限数据和新任务环境下稳定输出动作。第 3 批论文的共同点，是把“能跑”放到和“能懂”一样重要的位置。

**输出**：得到更高效、更可适配或更稳定的 VLA 行为。类比成开车：导航负责路线，司机负责实时控制，车辆状态决定什么时候该省油、什么时候该全力响应。

方法部分要按“哪个部署瓶颈 -> 哪个机制 -> 哪个实验数字”来读。否则容易把这些论文误解成普通模型堆料。


*所以这一节是想说：方法的关键是看 DuoCore-FS 把哪类部署瓶颈交给了哪个机制处理。*

## 关键数字（What works）

| 事实 | 数字 / 状态 | 来源与证据边界 |
|---|---:|---|
| VLM 规模 | 3B-parameter VLM | Abstract |
| 动作频率 | 30Hz action-chunk generation | Abstract |
| slow 频率 | 1–3Hz | Figure 1 / method |
| fast 频率 | 25–30Hz | Figure 1 / method |
| 动作空间 | Astribot S1 25 DoF | Method |
| 训练数据 | 1,780 trajectories / 10.22 hours | Experiment settings |
| in-domain overall | DuoCore-FS 90%，π0 85%，slow-only 55% | Table 1 |
| in-domain speed | DuoCore-FS 32.3Hz，π0 12.5Hz | Table 1 |
| OOD overall | DuoCore-FS 50%，π0 10% | Table 2 |
| 异常恢复 | DuoCore-FS 95.8%，π0 91.7% | Table 3 |

这些数字都是论文报告结果，不是本站本地复现。本站当前只完成公开来源研究、站点构建、provenance 与部署验证。


*所以这一节是想说：关键数字帮我们判断方法是否支撑主张，但不能替代本地实验。*

## 实验结果说明了什么

DuoCore-FS 的实验证据集中在 Astribot S1 爆米花售卖场景。in-domain 下它总体成功率 90%，略高于 π0 的 85%，但推理频率 32.3Hz，接近 π0 的 3 倍。OOD 下整体 50% vs π0 10%。语言跟随上，关柜门任务 42.9% vs π0 14.3%，说明 slow reasoning 对指令区分确实有帮助。

实验要同时看成功率和部署条件：比如同样 90% 成功率，12Hz 和 32Hz 的控制体验完全不同；同样 100% 成功率，一条示范和一百条示范的适配成本也完全不同。


*所以这一节是想说：实验说明 DuoCore-FS 在特定部署瓶颈上有效，但证据边界仍是论文设置。*

## 你应该懂的几个新词

- Staged training：分阶段训练，每一阶段解决不同瓶颈。
- Adaptive computation：按输入或动作上下文动态决定计算量。
- One-shot adaptation：只用一条示范适配新任务。
- Fast-slow system：慢系统做语义推理，快系统做实时控制。
- Action tokenizer：把连续动作压成 token 或离散表示，方便模型生成。
- Flow matching / diffusion policy：把噪声动作逐渐变成可执行动作的连续生成方法。


*所以这一节是想说：这些词都围绕部署：更快、更稳、更省数据。*

## 它有什么搞不定的

- 真实任务主要围绕爆米花 kiosk 和少量异常场景，任务多样性有限。
- 慢系统语言跟随仍只有 42.9%，数据不平衡影响明显。
- 异步系统更复杂，需要 buffer、时间对齐和部署工程支持。
- 全身 action tokenizer 的选择很关键，FAST tokenizer 在该设置下失败，说明表示设计仍脆弱。

这些局限提醒我们：VLA 走向真实机器人，不是一个模型名字能解决，而是数据、推理、控制、硬件和安全共同构成的系统工程。


*所以这一节是想说：DuoCore-FS 推进了一个部署维度，但没有消除真实机器人的全部风险。*

## 它和别的几篇是什么关系

- 它和 AC²-VLA 都解决部署效率，但 DuoCore-FS 通过异步双系统，AC²-VLA 通过自适应计算。
- 它和 π0/π0-FAST 关系紧密：用类似 VLM/action expert 思路，但打破同步频率限制。
- 它和 Green-VLA 都面向真实全身/人形控制，都是从模型走向部署的前沿样本。

第 3 批最好和前两批连读：第 1 批看统一与动作解码，第 2 批看跨 embodiment，第 3 批看部署效率和快速适配。


*所以这一节是想说：DuoCore-FS 是 40 篇扩展里“从研究模型走向部署系统”的一环。*

## 和本导读的关系

本篇对应导读中的 [Ch04: 技术版图](../guide/ch04-landscape.md)、[Ch12: VLA](../guide/ch12-openvla-vlas-mla.md)、[Ch17: Sim-to-Real](../guide/ch17-sim-to-real.md)。读它之前，建议先理解 OpenVLA、π0、Qwen-VLA、X-VLA 的基本路线。

对 40 篇扩展计划来说，DuoCore-FS 属于第 3 批，负责补“部署效率 / 快速适配 / 真机全身控制”这条线。


*所以这一节是想说：这篇笔记把 VLA 学习从模型结构推进到部署约束。*

## 思考题

**Q1：这篇论文解决的是速度、适配、长程还是真机部署？**

<details>
<summary>提示</summary>

先找方法和实验表格的直接对应关系，不要只看最高分。

</details>

**Q2：它的核心组件去掉后，成功率或速度掉了多少？**

<details>
<summary>提示</summary>

先找方法和实验表格的直接对应关系，不要只看最高分。

</details>

**Q3：它需要多少额外数据才能适配新任务？**

<details>
<summary>提示</summary>

先找方法和实验表格的直接对应关系，不要只看最高分。

</details>

**Q4：它和第 1/2 批论文的最大差异是什么？**

<details>
<summary>提示</summary>

先找方法和实验表格的直接对应关系，不要只看最高分。

</details>

**Q5：如果你要复现，哪个 benchmark 最小？**

<details>
<summary>提示</summary>

先找方法和实验表格的直接对应关系，不要只看最高分。

</details>

**Q6：哪些数字不能写成本站复现实验？**

<details>
<summary>提示</summary>

先找方法和实验表格的直接对应关系，不要只看最高分。

</details>

## 一些好奇心问答（FAQ）

**Q：为什么第 3 批不只看成功率？**

因为部署还看速度、数据成本、控制频率和异常恢复。成功率相同的系统，实时性可能完全不同。

**Q：这些方法能替代安全层吗？**

不能。它们提升模型部署能力，但真实机器人仍需要速度、力矩、碰撞和人工接管等安全机制。

**Q：为什么还保持 UNVERIFIED？**

因为本站没有逐节人工核验和本地复现实验。公开论文事实和本站实验结果是两种证据等级。

## 如果你想再深入

1. 先复习 OpenVLA、π0、Qwen-VLA。
2. 比较 AC²-VLA 和 DuoCore-FS：一个省计算，一个拆频率。
3. 比较 MoS-VLA 和 X-VLA：一个无梯度一示范，一个 soft prompt 适配。
4. 看 Green-VLA 时重点关注五阶段训练和 RL 对齐。

## 补充：快慢系统为什么必须真正异步

DuoCore-FS 最容易被误读成“一个大模型加一个小控制器”。真正的关键在异步：slow system 不需要每个控制周期都更新，fast system 也不应该等 slow system 才能动。真实全身机器人需要 25–30Hz 级别的连续动作，慢 VLM 如果只有 1–3Hz，就必须通过 buffer 把语义约束保存下来，让快系统在多个控制周期内复用它。

这个设计和人类动作很像。你不会每 30 分之一秒重新读一遍“把爆米花倒进杯子”的句子，但你会持续根据手的位置、杯子的倾斜角和勺子的接触状态微调动作。slow system 提供目标和语义，fast system 负责实时反馈控制。bridge buffer 的作用，就是让这两种时间尺度不互相拖累。

读实验时也要同时看成功率和频率。DuoCore-FS in-domain overall 90%，只比 π0 的 85% 高一点，但 32.3Hz 对 12.5Hz 是质变；OOD overall 50% vs 10% 则说明 slow reasoning 对新位置有帮助。语言跟随 42.9% 仍然不高，提醒我们异步结构不是万能的，数据分布和语言任务占比仍然决定能力上限。

这篇还有一个值得记住的工程细节：tokenizer 不是小事。FAST tokenizer 在全身动作上会产生过长 token 序列，导致慢系统频率很低且动作不稳定；RVQ-VAE tokenizer 则把全身关节模式压得更紧凑。对全身机器人来说，动作表示本身就是系统瓶颈，不能只讨论 VLM 多强。一个不合适的 action tokenizer，会让再强的语言理解也卡在控制层。

如果后续要做小实验，可以先不接真实 Astribot，而是模拟一个 slow/fast 时间差：slow module 每隔若干步更新一次语义向量，fast module 每步读取最近向量并输出连续动作。重点观察两个问题：慢信息过旧时是否误导动作，快系统是否能在没有新语义的几步内保持稳定。这个实验能低成本理解 bridge buffer 的价值。

另一个可执行练习是画出同一任务的两条时间线：上面是 slow system 的 1–3Hz 语义更新，下面是 fast system 的 25–30Hz 动作更新。把“拿杯子、转身、舀爆米花、放回桌面”标在时间线上，你会发现慢系统只需要在语义阶段变化时更新，而快系统每个细小动作都要连续运行。这个图能解释为什么同步设计会浪费频率。

最后要留意它的失败边界：如果 slow system 给出的语义表示一开始就错了，fast system 可能会很稳定地执行错误意图；如果 buffer 太久不更新，环境变化又很快，快系统也可能沿着旧语义继续动作。因此异步不是“慢系统越少跑越好”，而是要在语义新鲜度和控制频率之间找平衡。

*所以这一节是想说：DuoCore-FS 的贡献不是单纯更快，而是让语义推理和实时控制各自按合适频率运行。*

## 原文信息

- arXiv: [2512.20188](https://arxiv.org/abs/2512.20188)
- 本站状态：公开来源研究；未做本地训练、仿真或真机复现；human verification 仍应保持 UNVERIFIED，直到逐节人工核验完成。

```bibtex
@misc{fast_slow_vla_2025,
  title = {Asynchronous Fast-Slow Vision-Language-Action Policies for Whole-Body Robotic Manipulation},
  year = {2025},
  eprint = {2512.20188},
  archivePrefix = {arXiv},
  primaryClass = {cs.RO},
  note = {Read through Embodied AI: Zero to One},
  url = {https://arxiv.org/abs/2512.20188}
}
```
