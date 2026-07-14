---
title: "LoHoVLA: A Unified Vision-Language-Action Model for Long-Horizon Embodied Tasks"
slug: lohovla
topic: planning
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2506.00411"
venue: arXiv
year: 2025
era: frontier
num: 160
generated_at: 2026-07-14
---

# LoHoVLA：让 VLA 一边拆任务，一边动手执行

> 本文基于公开 arXiv 论文和 PDF 文本抽取整理。LoHoVLA 的实验在 Ravens / LoHoRavens 仿真环境中完成，本站没有本地复现训练或评测。

## 一句话讲什么（TL;DR）

LoHoVLA 处理长程具身任务：机器人不只要做一个动作，而要把“把所有积木按规则摆好”拆成一串子任务，并在每一步执行低层动作。它用 PaliGemma 这类 VLM 同时生成 sub-task 文本和 action token，再用分层闭环控制决定什么时候只重试动作、什么时候重新规划子任务。论文还构建 LoHoSet：3 个 pick-and-place primitive + 20 个长程任务，每个任务 1000 条专家演示。

*所以这一节是想说：LoHoVLA 的重点是把高层规划和低层控制放进同一个 VLA，而不是让 planner 和 actor 完全分家。*

## 这是个什么场景

短程任务像“把红块放进碗里”，机器人只要看准目标、移动、放下。长程任务像“把同色积木按大小叠起来，再移动到指定区域”，它包含多个步骤：先判断颜色，再比较大小，再决定顺序，再逐个搬运。如果中间一步失败，后面计划也会受影响。

传统机器人系统会把这件事拆成 planner 和 controller。Planner 说“下一步放红色小块”，controller 负责动手。问题是两者经常不同步：planner 以为已经成功，controller 实际放歪了；controller 卡住时，planner 不知道该换策略还是继续尝试。

普通 VLA 又走另一个极端：给图像和总目标，直接输出低层动作。它可能隐式学到一些步骤，但没有显式 sub-task，长任务里很容易在中途忘记当前目标。

LoHoVLA 的直觉是：让同一个模型既能说“下一小步做什么”，也能输出“现在怎么动”。它像一个会边做饭边自言自语的厨师：先说“现在切番茄”，再动刀；发现切歪了就重切，发现菜谱步骤错了才重新想。

*所以这一节是想说：LoHoVLA 关注的是长程任务的协调问题：规划不能离动作太远，动作也不能没有规划。*

## 之前的人怎么做的，为什么不够好

LoHoVLA 对比的一个重要基线是 LoHoRavens。它是分层架构：Planner 负责生成子任务，Actor 负责低层控制，Reporter 负责反馈。这个设计清晰，但模块之间通过文本或视觉反馈沟通，容易有信息损失和延迟。

另一类是 vanilla VLA：不给显式 sub-task 标签，直接从图像和目标预测动作。这种方法在短程任务里可行，但长程任务需要记住“当前做到哪一步”，纯低层动作输出容易过拟合训练中常见模式。例如看到相似场景就按旧习惯把块放到匹配碗，而忽略指令要求“不匹配”。

LoHoVLA 认为，两类方法各少一半：分层方法有规划但协调差，普通 VLA 统一但规划弱。它想保留统一模型的共享表示，同时让模型显式输出 sub-task。

*所以这一节是想说：长程任务不是单纯把 VLA 变大就能解决，它需要任务分解和执行反馈的结构。*

## 这篇论文的新想法

LoHoVLA 的核心新想法是：**用同一个语言模型头同时生成子任务文本和动作 token，再用分层闭环规则管理失败。**

这听起来有点绕。可以把它想成一个学生做数学题：他不能只写最后答案，也不能只写草稿。他要先写“下一步先移项”，再真正计算。如果算错了，可能只是重算；如果发现移项方向错了，才回到上一步重规划。

LoHoVLA 中，sub-task 是模型显式说出的中间目标，action token 是执行这个中间目标的低层动作。二者共享 PaliGemma backbone，所以视觉、语言和动作可以在同一个表示空间里互相影响。

```text
总目标 + 当前画面
        │
        ▼
┌─────────────────────┐
│ LoHoVLA shared VLM  │
└───────┬─────────────┘
        ├─► sub-task text: “把红块放到红碗”
        └─► action tokens: 低层 pick/place 动作
```

*所以这一节是想说：LoHoVLA 不是外接一个 planner，而是让 VLA 自己显式生成可检查的中间步骤。*

## 它分几步做的（方法）

### 第 1 步：定义 LoHoSet 数据集

LoHoSet 基于 Ravens / LoHoRavens 桌面操作环境，包含 3 个 pick-and-place primitive 和 20 个 long-horizon tasks。论文说明其中 10 个长程任务来自 LoHoRavens，用于和基线比较；另外 10 个任务是新加的，用来增强泛化能力。每个长程任务有 1000 条专家演示，数据中包含视觉观察、总目标、子任务和机器人动作。

### 第 2 步：把动作 token 化

LoHoVLA 把机器人动作离散到 1024 个 uniform bins。人话说，就是把连续动作数值切成 1024 档，让语言模型可以像预测词一样预测动作 token。推理时再反 token 化和反归一化，恢复成机器人动作。

### 第 3 步：联合训练 sub-task 和 action

训练目标包含两部分：`L = Ltext + Laction`。`Ltext` 训练模型生成正确子任务，`Laction` 训练模型生成动作。论文使用两阶段训练：先强化长程任务规划，再加入 primitive tasks 和动作标签，避免低层动作太早干扰高层规划。

### 第 4 步：分层闭环控制

长程任务失败可能来自三类：子任务规划错、动作预测错、外部扰动。LoHoVLA 不会每失败一次都重规划。它设置阈值 `K`：当前子任务失败次数超过阈值才重新规划，否则只重新预测动作。论文实验里 `K = 2`。

### 第 5 步：用奖励和成功率评估

评测有平均 reward 和 success rate。比如一个任务需要 10 步，完成 8 步就可能得到 80 的分数；真正全部完成才算成功。这样能区分“完全失败”和“做了一半”的模型。

```text
执行循环

预测 sub-task
     │
     ▼
预测 action 并执行
     │
     ├─ 成功：进入下一 sub-task
     │
     └─ 失败：
          ├─ 失败次数 ≤ K：只重试 action
          └─ 失败次数 > K：重新规划 sub-task
```

*所以这一节是想说：LoHoVLA 的方法核心是“显式中间目标 + 动作 token + 不过度重规划的闭环”。*

## 关键数字（What works）

| 现象 | 论文报告的数字 | 怎么理解 |
|---|---:|---|
| LoHoSet primitive tasks | 3 个 | 低层 pick-and-place 基础技能 |
| LoHoSet long-horizon tasks | 20 个 | 长程桌面操作任务集合 |
| 每个长程任务演示 | 1000 条 | 支撑 sub-task + action 联合训练 |
| Stage 1 训练任务 | 14 个长程任务 | 4 个 seen + 10 个新增任务 |
| Stage 2 primitive 数据 | 每个 primitive 10000 条演示 | 补低层动作预测能力 |
| Backbone | PaliGemma-3B-mix-224 | 用预训练 VLM 当共享主干 |
| LoRA 设置 | rank 16 | 参数高效微调 |
| 闭环阈值 | K = 2 | 失败两次以内先重试动作 |
| 挑战任务结果 | put-even-blocks-in-same-color-zone 得分 85.1、成功率 81.0 | 复杂颜色、计数、空间逻辑任务中显著领先 |

这些数字说明 LoHoVLA 不只是提出架构，还补了专门长程数据集和训练策略。不过它的实验主要在 Ravens 仿真环境中，不能直接外推到真实家庭机器人。

*所以这一节是想说：LoHoVLA 的有效性来自数据集、显式子任务监督和闭环策略三者共同作用。*

## 实验结果说明了什么

第一，显式 sub-task 很重要。Vanilla VLA 在若干任务上成功率为 0，说明它很难只靠隐式状态学会长程推理。显式输出子任务让模型有了可监督、可检查的中间计划。

第二，训练集扩展能缓解过拟合。论文显示，如果只在少数 seen tasks 上训练，模型会把相似场景误判成训练中常见模式；加入额外 10 个长程任务后，未见任务的规划成功率更好。

第三，两阶段训练比一锅炖更稳。先学规划，再加动作，有助于高层 sub-task 能力形成；如果一开始就混入动作标签和 primitive tasks，低层动作损失可能压过规划能力。

第四，闭环控制不能太激进。每次失败都重新规划会浪费高层推理，也可能在低层扰动时过度反应；只重试动作又无法纠正错误计划。阈值策略是在两者之间折中。

*所以这一节是想说：长程 VLA 的关键不是“直接端到端到底”，而是让端到端模型内部保留可监督的层级结构。*

## 你应该懂的几个新词

- **Long-horizon task**：长程任务。需要多个步骤才能完成的任务，失败会跨步骤传播。
- **Sub-task**：子任务。总目标拆出来的下一小步，如“把红块放进红碗”。
- **Hierarchical closed-loop control**：分层闭环控制。执行中根据反馈决定重试动作还是重规划子任务。
- **Action token**：动作 token。把连续动作离散后交给语言模型预测。
- **LoRA**：低秩适配微调。冻结大部分模型，只训练小矩阵，降低显存和训练成本。

*所以这一节是想说：LoHoVLA 的术语都围绕“长程任务如何拆、如何执行、如何纠错”。*

## 它有什么搞不定的

第一，动作离散化带来精度限制。论文的 limitation 明确提到，离散结构会限制机器人动作精度。对于需要毫米级接触或复杂姿态的任务，这可能成为瓶颈。

第二，论文假设一个 sub-task 可以在单个 timestep 内完成，这在真实应用中不一定成立。真实机器人可能需要多次低层控制才能完成一个中间目标。

第三，实验集中在 Ravens 仿真。仿真里的物体、摩擦、视觉噪声和真实厨房差距较大，真机迁移还需要额外验证。

第四，sub-task 标注成本不低。要训练模型显式输出子任务，就需要数据里有中间步骤标签，规模化采集时会增加标注负担。

*所以这一节是想说：LoHoVLA 很适合学习长程任务结构，但距离真实开放环境部署还有数据、动作精度和真机验证缺口。*

## 它和别的几篇是什么关系

- 和 [SayCan](saycan.md)：SayCan 用 LLM 选技能，LoHoVLA 让同一个 VLA 生成 sub-task 和 action。
- 和 [Code-as-Policies](code-as-policies.md)：Code-as-Policies 用代码做高层控制，LoHoVLA 用 VLM/VLA 内部 token 做规划和动作。
- 和 [OpenVLA](openvla.md)：OpenVLA 偏单步或短程控制；LoHoVLA 补长程任务分解。
- 和 [RT-1](rt-1.md)：RT-1 证明动作 token 化可行；LoHoVLA 把 token 化推进到长程规划+控制。
- 和 [CogACT](cogact.md)：CogACT 改动作模块质量，LoHoVLA 改任务层级结构。

*所以这一节是想说：LoHoVLA 是规划路线和 VLA 路线的交汇点。*

## 和本导读的关系

本篇主要对接 [Ch10: Planning](../guide/ch10-planning.md) 和 [Ch12: OpenVLA / VLAs / MLA](../guide/ch12-openvla-vlas-mla.md)。如果你只读 Ch12，可能会以为 VLA 就是“图像+指令 -> 动作”。LoHoVLA 说明，一旦任务变长，中间目标就会重新变重要。

它也能帮你理解为什么真正的家庭机器人不会只有一个低层 policy。长程任务需要“目标、进度、失败原因、下一步”的状态管理。LoHoVLA 把这些东西部分塞回 VLA 内部，是一个值得关注的折中方向。

*所以这一节是想说：LoHoVLA 帮本站补上“长程 VLA 不是纯动作模型”的关键拼图。*

## 思考题

**Q1：为什么 vanilla VLA 在长程任务中容易失败？**

<details>
<summary>提示</summary>

它缺少显式中间目标，容易把相似场景映射到训练中最常见的动作模式。
</details>

**Q2：LoHoVLA 为什么不每次失败都重新规划？**

<details>
<summary>提示</summary>

失败可能只是低层动作误差或外部扰动，频繁重规划会浪费并引入不稳定。
</details>

**Q3：两阶段训练为什么有帮助？**

<details>
<summary>提示</summary>

先学高层规划，避免低层动作损失过早主导共享表示。
</details>

**Q4：如果把 LoHoVLA 上真机，你最担心哪两个问题？**

<details>
<summary>提示</summary>

动作离散精度和 sub-task 完成时间假设，都会在真机上变得更脆弱。
</details>

**Q5：LoHoVLA 和 SayCan 的最大区别是什么？**

<details>
<summary>提示</summary>

SayCan 是模块化选择技能；LoHoVLA 是统一 VLA 同时生成子任务和动作。
</details>

## 一些好奇心问答（FAQ）

**LoHoVLA 是不是完全端到端？**  
不是纯粹黑盒端到端。它使用同一模型，但显式输出 sub-task，因此保留了可解释的中间层。

**它的数据集为什么叫 LoHoSet？**  
因为它专门服务 long-horizon tasks，包含 primitive 和长程任务，便于训练模型同时学低层动作与高层分解。

**它能直接处理真实厨房吗？**  
不能直接这么说。论文评测在 Ravens 仿真，真实厨房需要视觉、物理和安全方面的额外验证。

**为什么 topic 放在 planning 而不是 vla？**  
它当然是 VLA，但本站把它放到 planning，是为了强调它解决的是长程任务分解与闭环控制问题。

**读完后下一篇看什么？**  
看 [AutoRT](autort.md) 理解真实机器人数据采集如何规模化，再看 [EO-1](eo-1.md) 理解 interleaved vision-text-action 数据如何进一步训练统一模型。

## 补充理解：长程任务的难点在“进度状态”

LoHoVLA 值得关注，是因为它把长程任务里最容易被忽略的东西显式化了：进度状态。短程抓取只需要回答“现在该往哪动”，长程任务还要回答“我现在做到第几步、上一步有没有真的成功、下一步目标是否需要改变”。如果没有进度状态，模型会把当前画面当成孤立图片，看到相似摆放就重复训练集中最常见的动作。LoHoVLA 通过 sub-task 文本让进度状态变成可监督对象，再用闭环策略处理失败。这给实际部署一个启发：复杂任务里，日志不应只记录动作轨迹，还应该记录当前子目标、失败次数、重试原因和重规划触发点。否则线上调试时，我们只能看到机器人“动错了”，却不知道它是计划错、动作错，还是外部扰动导致临时失败。

如果把它迁移到真实家务场景，还需要把“子任务是否完成”的判断做成可靠传感器或判别器。比如“杯子已经放进水槽”不能只靠模型自信地说完成，而要结合视觉状态、夹爪状态、碰撞/力反馈和任务日志。没有这个完成判断，闭环控制就会失去锚点。

因此，LoHoVLA 更像一张设计图：模型负责提出和执行子任务，系统还要负责确认、回滚和记录。

没有这些外部状态，长程闭环很容易退化成“反复试同一个错误动作”。

*所以这一节是想说：LoHoVLA 的核心价值是让长程任务的中间状态可见、可监督、可纠错。*

## 如果你想再深入

1. 对照 LoHoRavens，理解 planner / actor / reporter 三模块怎么协作。
2. 看论文 Algorithm 1，手动画一遍失败后重试或重规划的分支。
3. 对比 `Ltext + Laction` 的训练目标，思考两个 loss 权重会如何影响模型。
4. 用一个家务任务自己写 sub-task 序列，体会长程监督的标注成本。
5. 如果要工程实现，先做仿真闭环，不要直接在真机上让模型自由重规划。

## 原文信息

- 标题：LoHoVLA: A Unified Vision-Language-Action Model for Long-Horizon Embodied Tasks
- arXiv：<https://arxiv.org/abs/2506.00411>
- 数据集：论文提出 LoHoSet，包含 3 个 primitive 与 20 个 long-horizon tasks。
- 公开状态：本站未独立验证代码或数据集可用性。

```bibtex
@misc{yang2025lohovla,
  title = {LoHoVLA: A Unified Vision-Language-Action Model for Long-Horizon Embodied Tasks},
  author = {Yang, Yi and Sun, Jiaxuan and Kou, Siqi and Wang, Yihan and Deng, Zhijie},
  year = {2025},
  eprint = {2506.00411},
  archivePrefix = {arXiv},
  primaryClass = {cs.RO}
}
```

*所以整篇是想说：LoHoVLA 让 VLA 不再只做下一步动作，而是显式说出下一小步计划，并用闭环机制在长程任务中纠错。*
