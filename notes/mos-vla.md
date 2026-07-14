---
title: "MoS-VLA: A Vision-Language-Action Model with One-Shot Skill Adaptation"
slug: mos-vla
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2510.16617"
venue: arXiv
year: 2025
era: frontier
num: 173
generated_at: 2026-07-14
---

# MoS-VLA：用一次示范给 VLA 调出新技能

> 这是一份面向零基础读者的结构化研究笔记。本文只把公开论文文本和 arXiv 元数据能支持的结论写成事实；本站没有本地训练、仿真或真机复现实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

MoS-VLA 把策略看成一组 learned basis functions 的线性组合。新环境来了，不用梯度微调，只要一条专家轨迹，就能求出组合系数，生成适配该环境的新 policy。

如果只记一个直觉：第 3 批从“模型能不能统一”推进到“模型能不能部署”。真实机器人需要低延迟、少量示范适配、长程稳定和全身协调。


*所以这一节是想说：MoS-VLA 的价值在于把 VLA 从论文分数推近真实部署约束。*

## 这是个什么场景

这像调鸡尾酒：训练阶段先学会 16 种基酒，部署时根据一杯样品反推出配比。之后不需要重新酿酒，只要按配比混合，就能调出适合新任务的味道。

```text
第 3 批主线：部署效率与快速适配

训练课程 / 自适应计算 / one-shot 技能 / 快慢系统
          │
          ▼
       MoS-VLA
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


*所以这一节是想说：读 MoS-VLA 要把成功率和部署条件一起看。*

## 之前的人怎么做的，为什么不够好

现有 VLA 在新实验室、新机器人设置或新任务上常常 out-of-the-box 失败。fine-tuning 需要几十到几百条 demo 和反向传播，成本高；LoRA 也仍要大量 forward/backward。

过去很多 VLA 论文默认强 backbone 每步完整运行，或者默认新任务可以靠再次 fine-tune 解决。但真实部署里，等待大模型推理会降低控制频率，收集几十条示范也可能太贵，长程任务一旦早期失败后续步骤就不可达。第 3 批论文分别从训练课程、推理压缩、无梯度适配和异步控制四个方向补这些缺口。


*所以这一节是想说：旧方法的问题不是能力完全不够，而是部署成本、适配成本和实时性不够。*

## 这篇论文的新想法

MoS-VLA 在 OpenVLA 上训练 16 个 basis action heads，形成 policy skill space。测试时用一条 expert trajectory，通过 L1 action error 的 convex optimization 求 skill coefficients，不做梯度更新。

这类新意的核心是把约束显式建模。与其希望模型自己学会省算力、自己学会迁移、自己学会快慢分工，不如给它可学习的结构和评测指标。


*所以这一节是想说：MoS-VLA 的新意是把部署约束变成训练或推理机制的一部分。*

## 它分几步做的（方法）

### 第 1 步

**输入**：训练阶段：在 RT-X / Open X data mixture 上 fine-tune OpenVLA，同时学习 k 个 basis action heads。

**处理**：这一环都在回答部署问题：模型不只是要看懂，还要能在真实频率、有限数据和新任务环境下稳定输出动作。第 3 批论文的共同点，是把“能跑”放到和“能懂”一样重要的位置。

**输出**：得到更高效、更可适配或更稳定的 VLA 行为。类比成开车：导航负责路线，司机负责实时控制，车辆状态决定什么时候该省油、什么时候该全力响应。

### 第 2 步

**输入**：校准阶段：对新任务的一条 expert trajectory 前向计算 basis outputs，求解 least absolute error linear program 得到系数 α。

**处理**：这一环都在回答部署问题：模型不只是要看懂，还要能在真实频率、有限数据和新任务环境下稳定输出动作。第 3 批论文的共同点，是把“能跑”放到和“能懂”一样重要的位置。

**输出**：得到更高效、更可适配或更稳定的 VLA 行为。类比成开车：导航负责路线，司机负责实时控制，车辆状态决定什么时候该省油、什么时候该全力响应。

### 第 3 步

**输入**：执行阶段：将各 basis action outputs 按 α 线性组合成新 policy。

**处理**：这一环都在回答部署问题：模型不只是要看懂，还要能在真实频率、有限数据和新任务环境下稳定输出动作。第 3 批论文的共同点，是把“能跑”放到和“能懂”一样重要的位置。

**输出**：得到更高效、更可适配或更稳定的 VLA 行为。类比成开车：导航负责路线，司机负责实时控制，车辆状态决定什么时候该省油、什么时候该全力响应。

### 第 4 步

**输入**：评估阶段：比较 OpenVLA 与 MoS-VLA 在未见 simulation 和 real robot tasks 上的成功率。

**处理**：这一环都在回答部署问题：模型不只是要看懂，还要能在真实频率、有限数据和新任务环境下稳定输出动作。第 3 批论文的共同点，是把“能跑”放到和“能懂”一样重要的位置。

**输出**：得到更高效、更可适配或更稳定的 VLA 行为。类比成开车：导航负责路线，司机负责实时控制，车辆状态决定什么时候该省油、什么时候该全力响应。

方法部分要按“哪个部署瓶颈 -> 哪个机制 -> 哪个实验数字”来读。否则容易把这些论文误解成普通模型堆料。


*所以这一节是想说：方法的关键是看 MoS-VLA 把哪类部署瓶颈交给了哪个机制处理。*

## 关键数字（What works）

| 事实 | 数字 / 状态 | 来源与证据边界 |
|---|---:|---|
| basis 数量 | 16 basis functions | Implementation Details |
| 训练数据 | Open-X Magic Soup Plus / RTX dataset mixture | Implementation Details |
| 训练规模 | 32 GH200 nodes，5000 steps，约 24 小时 | Implementation Details |
| 校准数据 | one expert trajectory | Abstract / Figure 1 |
| 校准方式 | least absolute error / L1 action error；无 gradient updates | Abstract / Method |
| 仿真 Lift Block | OpenVLA 0%，MoS-VLA 70% | Table 1 |
| 仿真 Open Door | OpenVLA 0%，MoS-VLA 75% | Table 1 |
| 真实 Reach | OpenVLA 0%，MoS-VLA 100% | Table 1 |
| 真实 Lift Block | OpenVLA 0%，MoS-VLA 100% | Table 1 |
| 真实 Insert Pen | OpenVLA 0%，MoS-VLA 100% | Table 1 |

这些数字都是论文报告结果，不是本站本地复现。本站当前只完成公开来源研究、站点构建、provenance 与部署验证。


*所以这一节是想说：关键数字帮我们判断方法是否支撑主张，但不能替代本地实验。*

## 实验结果说明了什么

MoS-VLA 的实验非常清晰：OpenVLA 在五个未见任务上全为 0%，MoS-VLA 用一条示范校准后，仿真任务达到 70% 和 75%，真实机器人三个任务均为 100%。这不是证明它通用解决所有迁移，而是证明 learned skill space + one-shot coefficient fitting 能显著缓解 domain gap。

实验要同时看成功率和部署条件：比如同样 90% 成功率，12Hz 和 32Hz 的控制体验完全不同；同样 100% 成功率，一条示范和一百条示范的适配成本也完全不同。


*所以这一节是想说：实验说明 MoS-VLA 在特定部署瓶颈上有效，但证据边界仍是论文设置。*

## 你应该懂的几个新词

- Staged training：分阶段训练，每一阶段解决不同瓶颈。
- Adaptive computation：按输入或动作上下文动态决定计算量。
- One-shot adaptation：只用一条示范适配新任务。
- Fast-slow system：慢系统做语义推理，快系统做实时控制。
- Action tokenizer：把连续动作压成 token 或离散表示，方便模型生成。
- Flow matching / diffusion policy：把噪声动作逐渐变成可执行动作的连续生成方法。


*所以这一节是想说：这些词都围绕部署：更快、更稳、更省数据。*

## 它有什么搞不定的

- 一条示范要落在 basis span 附近，超出技能空间的新任务可能失败。
- 实验任务相对简化，部分环境还关闭了前后运动以减轻深度估计困难。
- basis heads 增加训练结构，且训练仍依赖大规模 OXE 数据。
- 真实任务数量有限，100% 不应外推为开放世界可靠性。

这些局限提醒我们：VLA 走向真实机器人，不是一个模型名字能解决，而是数据、推理、控制、硬件和安全共同构成的系统工程。


*所以这一节是想说：MoS-VLA 推进了一个部署维度，但没有消除真实机器人的全部风险。*

## 它和别的几篇是什么关系

- 它和 X-VLA 都追求低成本适配，MoS-VLA 更极端：一条示范、无梯度更新。
- 它和 ET-VLA 都处理迁移问题，但 ET-VLA 面向多机器人，MoS-VLA 面向新 skill/context。
- 它和 LoRA/PEFT 是对照关系：不是调参数，而是调 basis coefficients。

第 3 批最好和前两批连读：第 1 批看统一与动作解码，第 2 批看跨 embodiment，第 3 批看部署效率和快速适配。


*所以这一节是想说：MoS-VLA 是 40 篇扩展里“从研究模型走向部署系统”的一环。*

## 和本导读的关系

本篇对应导读中的 [Ch04: 技术版图](../guide/ch04-landscape.md)、[Ch12: VLA](../guide/ch12-openvla-vlas-mla.md)、[Ch17: Sim-to-Real](../guide/ch17-sim-to-real.md)。读它之前，建议先理解 OpenVLA、π0、Qwen-VLA、X-VLA 的基本路线。

对 40 篇扩展计划来说，MoS-VLA 属于第 3 批，负责补“部署效率 / 快速适配 / 真机全身控制”这条线。


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

## 补充：one-shot 适配到底省在哪里

MoS-VLA 的 one-shot 不是“看一眼就会所有事”，而是把适配成本从梯度训练换成系数求解。训练阶段已经学好一组 basis functions，部署时只用一条 expert trajectory 找到这些 basis 的组合权重。这个过程更像在已有技能库里调配比例，而不是重新学习技能本身。

这个思路的好处是非常直接：不需要反向传播，不需要几十到几百条 demo，也不需要为每个新任务跑一轮 LoRA。论文里强调 calibration 可以在几秒级完成，这对小实验室和快速换场景很有吸引力。但它也有边界：如果新任务不在 basis span 附近，线性组合再快也无法凭空生成新能力。

因此读 MoS-VLA 时要同时看成功和假设。它在五个未见任务上把 OpenVLA 的 0% 提到 70–100%，说明 domain gap 很大时，skill-space calibration 确实有效。但这些任务也经过简化，例如部分设置减少了深度估计难度。更严格的下一步，是测试接触丰富、长程、多阶段任务是否仍能被一条轨迹充分校准。

一个好的类比是“调参”和“学技能”的区别。fine-tuning 像让模型重新上课，LoRA 像只改一小部分教材，而 MoS-VLA 像已经准备好一套技能坐标系，新任务只是在坐标系里找一个点。这个点能不能找到，取决于训练阶段的 basis 是否覆盖了目标任务。如果 basis 空间太窄，一条示范给出的也只是错误方向上的精确坐标。

所以复现时不要只追 one-shot 成功率，还要观察失败任务和系数分布。若不同任务的系数聚成合理簇，说明技能空间有结构；若所有新任务都挤在一起，或者某些任务需要极端系数，说明 basis 还没有学到可迁移技能。这个分析比单个成功率更能说明方法是否真的具备 in-context adaptation。

一个可执行练习是：不用机器人，先用二维控制任务模拟 basis。预先训练几个“向上、向右、靠近目标、避障”的小策略，然后给一条新轨迹，用最小绝对误差求它们的线性组合。你会直观看到：如果新轨迹能被 basis 组合出来，一条示范就足够；如果目标需要 basis 没见过的行为，再多调系数也无济于事。这正是 MoS-VLA 的核心假设。

读这篇时也要区分“任务适配”和“任务理解”。一条专家轨迹主要告诉模型这个环境中的动作风格和目标实现方式，不一定提供丰富语言推理。若任务需要先规划多个子目标，MoS-VLA 可能还需要和高层 planner 或 graph 方法结合。也就是说，它非常适合快速校准控制风格，但不自动解决复杂长程任务分解。

把它放到 40 篇路线里看，MoS-VLA 提供的是另一种省数据方式。X-VLA 用 soft prompt 学会跨 embodiment，ET-VLA 用合成预训练适应多机器人，MoS-VLA 则把新任务适配压缩成一条示范加一次小优化。三者都在回答同一个问题：机器人数据太贵时，怎样少采一点也能迁移。

一句话复述：它是在给 VLA 预先学一组技能积木，新任务来了只重新拼一次。

真正落地时，仍要记录那条示范的质量，因为错误示范会把系数校准到错误策略上。
这会直接影响安全。

*所以这一节是想说：MoS-VLA 省的是新任务适配的梯度成本，但前提是训练出的技能空间足够覆盖目标任务。*

## 原文信息

- arXiv: [2510.16617](https://arxiv.org/abs/2510.16617)
- 本站状态：公开来源研究；未做本地训练、仿真或真机复现；human verification 仍应保持 UNVERIFIED，直到逐节人工核验完成。

```bibtex
@misc{mos_vla_2025,
  title = {MoS-VLA: A Vision-Language-Action Model with One-Shot Skill Adaptation},
  year = {2025},
  eprint = {2510.16617},
  archivePrefix = {arXiv},
  primaryClass = {cs.RO},
  note = {Read through Embodied AI: Zero to One},
  url = {https://arxiv.org/abs/2510.16617}
}
```
