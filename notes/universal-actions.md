---
title: "Universal Actions for Enhanced Embodied Foundation Models"
slug: universal-actions
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2501.10105"
venue: arXiv
year: 2025
era: frontier
num: 159
generated_at: 2026-07-14
---

# Universal Actions：给不同机器人发明一套“通用动作语”

> 本文记录 UniAct / Universal Actions 论文的公开信息。本站没有本地训练 UniAct，也没有验证项目页代码，只把论文机制和数字整理为可学习笔记。

## 一句话讲什么（TL;DR）

机器人数据最大的问题不是没有数据，而是每台机器人说的“动作语言”不同：有的输出末端位置，有的输出关节角，有的输出速度，有的还是双臂。Universal Actions 提出 UniAct，让模型先学一套跨机器人共享的“通用动作空间”，再用每台机器人的 decoder 把通用动作翻译回具体控制命令。论文称 0.5B 的 UniAct 在多种跨本体评测中能达到或超过 14 倍更大模型的表现。

*所以这一节是想说：UniAct 试图把机器人动作从“各说各话”变成“先说通用语，再翻译成方言”。*

## 这是个什么场景

你可以把机器人想成来自不同国家的工人。A 机器人只懂“夹爪往右 2 厘米”，B 机器人只懂“第 3 个关节转 5 度”，C 机器人要左右两只手一起动。它们都能完成“把杯子放进盘子”，但底层命令完全不同。

互联网图文数据能训练 CLIP、LLaVA 这类模型，是因为图片和文字虽然多样，但“猫”“桌子”“红色”这些概念可以对齐。机器人数据难得多：动作空间直接绑定硬件。本体不同，坐标系、自由度、控制频率和末端执行器都不同。如果把所有动作粗暴拼在一起，模型可能学到互相冲突的信号；如果给每台机器人单独训练，又浪费跨机器人共享经验。

UniAct 想解决的是“数据能不能跨本体复用”。它不是先问“模型多大”，而是先问“动作表示能不能统一”。只有表示统一，Open X-Embodiment 这类大规模多机器人数据才真正有机会变成基础模型燃料。

*所以这一节是想说：Universal Actions 的战场在动作空间，不在视觉编码器或语言模型本身。*

## 之前的人怎么做的，为什么不够好

一种做法是把所有机器人动作当成同一种格式。例如都转成末端执行器位置增量。这很方便，但会丢掉关节控制、速度控制、双臂协作等差异。像把所有语言都硬翻成几个固定词，表达力不够。

另一种做法是给不同机器人保留不同 head。这样不丢信息，但共享层很难知道哪些动作模式是共同的。模型可能把“伸手接近目标”在不同机器人上的轨迹当成完全无关的样本。

还有一些 latent action 工作从视频里学潜在动作，尝试不依赖真实控制标签。但这类 latent action 往往解释的是“画面怎么变化”，不一定和真实控制信号有直接因果关系。对机器人来说，能让视频动起来不等于能让电机正确执行。

Universal Actions 的立场是：动作空间可以抽象，但不能脱离 embodiment。通用动作负责表达共享的原子行为，每个机器人 decoder 负责补上自己的硬件细节。

*所以这一节是想说：旧方法要么过度统一导致冲突，要么过度分离导致不能共享。UniAct 想在中间找一层可翻译的动作语义。*

## 这篇论文的新想法

核心想法是 **Universal Action Space**：模型内部先产生一组离散/潜在的通用动作，它们像“动作词典”一样记录跨机器人都常见的原子控制模式；然后，每个 embodiment 有自己的 decoder，把这些通用动作翻译成真实控制命令。

类比：机场里有国际手势。指挥员摆手让飞机前进、停止、转向，不管驾驶舱仪表是波音还是空客，含义都大致一致。但真正执行时，每架飞机内部怎么控制油门、刹车和方向舵是自己的系统负责。Universal action 就像外部手势，decoder 就像机型自己的飞控。

```text
不同机器人原始数据
  ├─ WidowX: 末端位置
  ├─ Franka: 末端位置 / 关节
  ├─ AIRBOT: 单臂或双臂控制
  ▼
┌────────────────────┐
│ Universal Action   │  共享原子动作库
└─────────┬──────────┘
          ▼
  embodiment-specific decoder
          ▼
各机器人真实控制命令
```

这个思路让模型可以同时做两件事：共享“拿起、靠近、放下、旋转”这类跨机器人动作结构；又不强迫所有硬件用同一种控制格式。

*所以这一节是想说：UniAct 的关键不是发明一个新任务，而是发明一层跨本体动作中间语。*

## 它分几步做的（方法）

### 第 1 步：收集多本体、多控制接口数据

论文表格列出 28 个数据源，覆盖不同轨迹数、样本数、控制接口和采样比例。这些数据源里既有末端执行器位置，也有关节位置、末端速度等格式。数据异构不是噪声，而是 UniAct 要解决的对象。

### 第 2 步：学习 universal action extractor

模型先把视觉、语言和历史状态转成共享表征，再通过 universal action extractor 产生通用动作。训练时用 Gumbel-Softmax 等方式让动作选择可微，使模型能端到端学习“哪些原子动作对多个机器人都通用”。

### 第 3 步：为每个 embodiment 接专属 decoder

通用动作不能直接发给电机。每台机器人都需要自己的 decoder，把通用动作加上 embodiment-specific 细节：坐标系、控制维度、夹爪状态、频率、关节限制等。论文当前实现多用简单 MLP decoder，后续也讨论更复杂 embodiment 可能需要更强 decoder。

### 第 4 步：预训练后快速适配新机器人

当遇到 AIRBOT 这类预训练没见过的新 embodiment，UniAct 保持大部分模块冻结，只训练新的 heterogeneous head。论文报告单臂 AIRBOT 适配约 1 小时，双臂 AIRBOT 每个任务收集 250 条演示后微调。这说明 universal action 的目标是降低新硬件接入成本。

### 第 5 步：在真实和仿真多维度评测

论文评测包括 WidowX 真机、Franka / LIBERO 仿真、AIRBOT 快速适配、双臂 AIRBOT。评测维度包括视觉泛化、语言 grounding、运动泛化、物理泛化和语义泛化。重点不是单一任务刷分，而是跨本体迁移。

```text
UniAct 训练逻辑

多源数据 ──► 共享 VLA 主干 ──► universal action
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
          WidowX decoder    Franka decoder     AIRBOT decoder
                │                 │                 │
           真实控制命令       仿真控制命令       新机器人命令
```

*所以这一节是想说：UniAct 的方法是“共享抽象动作 + 专属硬件翻译器”，训练和评测都围绕跨本体展开。*

## 关键数字（What works）

| 现象 | 论文报告的数字 | 怎么理解 |
|---|---:|---|
| UniAct 实例规模 | 0.5B | 不是靠超大参数量取胜 |
| 对比大模型 | 达到 14X 更大 SOTA 模型级别表现 | 说明动作表示可能比单纯扩大模型更关键 |
| 数据源数量 | 28 个 distinct embodiments / data sources | 明确面向异构机器人数据 |
| Language Table 样本 | 6,602,077 samples | 大规模数据源之一 |
| Bridge 轨迹 | 28,933 trajectories | VLA 预训练常用真实操作数据 |
| LIBERO 任务数据 | 6,500 轨迹 / 130 任务 | 用于 Franka 仿真评测 |
| AIRBOT 单臂微调 | 约 1 小时 | 新 embodiment 适配强调高效 |
| 双臂 AIRBOT 演示 | 每任务 250 条 | 双臂任务也尝试快速适配 |

这些数字来自论文文本和表格。需要注意，“14X larger”是论文相对其选定基线的表述，不等于任何场景下小模型都能打赢大模型。

*所以这一节是想说：UniAct 的数据和实验都围绕“异构动作能否共享”来设计，核心数字是数据源、适配成本和跨本体表现。*

## 实验结果说明了什么

第一，异构动作空间会带来负迁移。论文提到，某些基线虽然也用了多样数据，但把不同控制接口当成同质动作处理，可能让性能低于其基础模型。UniAct 用 universal action 缓解这个问题。

第二，通用动作并不是“不要机器人细节”。相反，UniAct 把通用和专用分开：共享层学原子动作，decoder 补硬件细节。这比完全统一动作格式更合理。

第三，快速适配是这篇论文最有工程意义的地方。新机器人接入时，如果只训练小 decoder 就能开始工作，后续机器人基础模型的部署成本会明显下降。

第四，当前证据主要来自机械臂类本体。论文自己也指出，要扩展到灵巧手、四足、自动驾驶等更复杂系统，还需要进一步验证。

*所以这一节是想说：实验支持“动作中间语”这个方向，但它还不是所有本体都已验证的终极通用动作。*

## 你应该懂的几个新词

- **Embodiment**：机器人本体。机械结构、传感器、执行器、自由度和控制接口的总称。
- **Universal Action Space**：通用动作空间。模型内部共享的动作表示，不直接等于某台机器人的电机命令。
- **Decoder head**：解码头。把通用动作翻译成具体机器人控制量的小模块。
- **Negative transfer**：负迁移。多源数据本想互相帮助，结果因为格式冲突互相拖累。
- **Gumbel-Softmax**：一种让离散选择近似可微的训练技巧，方便端到端学习离散动作。

*所以这一节是想说：读 UniAct 要区分“共享动作语义”和“具体硬件控制”这两层。*

## 它有什么搞不定的

第一，当前主要评估单臂机械臂和部分双臂 AIRBOT。论文自己也问：这种共同物理运动是否只适合机械臂？灵巧手、四足、车甚至无人机能否共享同一 universal action，还没完全证明。

第二，decoder 设计目前偏简单。论文使用相同或较简单的 MLP decoder 来降低过拟合风险，但复杂本体可能需要更大、更结构化的 decoder。

第三，更多数据不必然更好。论文在 limitation 中提出 scaling law 问题：增加 embodiment 数、增加同 embodiment 任务数、增加演示数量，哪种最有效，还需要系统研究。

第四，通用动作是否可解释仍然有限。它像模型学出来的动作词典，但每个动作 token 是否能稳定对应“靠近”“抬起”“旋转”等人类概念，需要额外分析。

*所以这一节是想说：Universal Actions 是很有潜力的中间层，但它的边界和可解释性还需要下一轮研究。*

## 它和别的几篇是什么关系

- 和 [Open X-Embodiment](open-x-embodiment.md)：Open X 提供多机器人数据，UniAct 试图解决这些数据的动作异构问题。
- 和 [OpenVLA](openvla.md)：OpenVLA 更像统一 VLA 基线；UniAct 关注怎么让不同机器人动作共享。
- 和 [SpatialVLA](spatialvla.md)：SpatialVLA 处理空间表示，UniAct 处理动作表示，两者是 VLA 表示改进的两条支线。
- 和 [π0.5](pi05.md)：π0.5 重视跨机器人 co-training，UniAct 提供一种显式 universal action 方案。
- 和 [CogACT](cogact.md)：CogACT 强化动作生成器，UniAct 强化动作空间对齐。

*所以这一节是想说：UniAct 是“跨本体数据怎么真正合起来训练”的关键论文。*

## 和本导读的关系

本篇适合接在 [Ch12: OpenVLA / VLAs / MLA](../guide/ch12-openvla-vlas-mla.md) 后，也可以和 [Ch21: Datasets](../guide/ch21-datasets.md) 交叉读。Ch12 解释 VLA 怎么输出动作，Ch21 解释数据集为什么重要；UniAct 把这两件事连起来：数据集越多，越需要统一动作表示。

对本站学习路径来说，它补上一个常被忽略的工程问题：跨本体不是把数据放进一个文件夹就结束，动作接口本身也要建模。未来读 LeRobot、SmolVLA、π0.5 或 Qwen-VLA 这类多机器人系统时，都能用 UniAct 的视角检查“动作空间怎么对齐”。

*所以这一节是想说：Universal Actions 是理解“机器人基础模型为什么难以像 LLM 那样直接吃大数据”的重要桥梁。*

## 思考题

**Q1：为什么不同机器人动作空间不能简单拼成一个大向量？**

<details>
<summary>提示</summary>

维度、语义、控制频率和坐标系都可能不同。拼接会让同一维度在不同机器人上表示不同含义。
</details>

**Q2：Universal action 和 latent action 的差别是什么？**

<details>
<summary>提示</summary>

Universal action 要能通过 decoder 回到真实控制命令；普通视频 latent action 可能只解释画面变化。
</details>

**Q3：为什么 decoder 不能完全省掉？**

<details>
<summary>提示</summary>

通用动作只表达共享动作模式，真实电机命令必须结合 embodiment 的几何和控制接口。
</details>

**Q4：如果加入四足机器人，UniAct 最大挑战会是什么？**

<details>
<summary>提示</summary>

腿足运动的周期、接触和稳定性与机械臂差异很大，通用动作是否仍共享是核心问题。
</details>

**Q5：更多数据为什么可能不总是更好？**

<details>
<summary>提示</summary>

如果新数据动作空间冲突、质量低或采样比例不合适，可能带来负迁移。
</details>

## 一些好奇心问答（FAQ）

**Universal action 是手工定义的吗？**  
不是。论文目标是让模型从异构数据中学习出共享动作表示，而不是人工枚举“伸手、抬起、放下”。

**它能直接控制任何机器人吗？**  
不能。每台新机器人仍然需要 decoder 和适配数据。论文只是降低了适配成本，不是免适配。

**它和动作 token 化有什么关系？**  
二者都在离散/结构化动作。区别是普通 token 化多针对单一动作空间，Universal Actions 试图跨本体共享。

**为什么 0.5B 很重要？**  
因为它说明跨本体收益不只靠模型变大，也可以来自动作表示更合理。

**下一步应该看什么？**  
看 [π0.5](pi05.md) 和 [LeRobot](lerobot.md)，理解跨本体训练和实际工具链如何接起来。

## 补充理解：通用动作不是“平均动作”

Universal Actions 容易被误解成把不同机器人动作做平均，或者把所有动作都压成同一个固定格式。更准确的理解是：它试图学习一层“可翻译的中间语”。中间语必须足够抽象，能表达跨机器人共享的行为模式；也必须足够贴近控制，能通过 decoder 回到真实动作。如果它太抽象，就会退化成普通视频 latent action，只能解释画面变化，不能控制电机；如果它太具体，就会重新绑定某一台机器人，跨本体能力消失。这个平衡点就是论文最值得关注的地方。工程上可以把它类比成 API 设计：API 不能暴露每个硬件寄存器，否则调用者很痛苦；也不能只写“做饭”“整理”这种高层意图，否则执行器不知道怎么动。好的 universal action 应该像稳定 API，一边屏蔽硬件差异，一边保留足够控制语义。

*所以这一节是想说：UniAct 的关键挑战是抽象层级选择，既不能太虚，也不能太硬件绑定。*

## 如果你想再深入

1. 对照论文 Table 5 看 28 个数据源的控制接口差异。
2. 研究 Gumbel-Softmax 如何让离散动作选择可训练。
3. 对照 Open X-Embodiment 的数据格式，思考它只统一数据文件，是否统一了动作语义。
4. 关注 AIRBOT 快速适配实验，理解“冻结主干 + 训练新 head”的工程价值。
5. 如果要落地到 LeRobot，先检查每个 robot interface 暴露的 action 字段是否能映射到 shared representation。

## 原文信息

- 标题：Universal Actions for Enhanced Embodied Foundation Models
- arXiv：<https://arxiv.org/abs/2501.10105>
- 项目页：<https://2toinf.github.io/UniAct/>
- 公开状态：论文包含项目页链接；本站未独立验证代码、权重或数据下载。

```bibtex
@misc{uniact2025universalactions,
  title = {Universal Actions for Enhanced Embodied Foundation Models},
  year = {2025},
  eprint = {2501.10105},
  archivePrefix = {arXiv},
  primaryClass = {cs.RO}
}
```

*所以整篇是想说：UniAct 把跨机器人学习的关键问题从“模型能不能更大”转向“动作语言能不能共享”，这是具身基础模型走向多本体训练时绕不开的一步。*
