---
title: "Toward General-Purpose Robots via Foundation Models: A Survey and Meta-Analysis"
slug: robotics-foundation-models-survey
topic: world-model
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2312.08782"
venue: arXiv
year: 2023
era: frontier
num: 201
generated_at: 2026-07-15
---

# Toward General-Purpose Robots via Foundation Models：机器人基础模型的工程地图

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本和 arXiv 元数据能支持的结论；本站没有复现 survey 中引用的各项实验。

## 一句话讲什么（TL;DR）

这篇综述问的是：foundation model 到底怎样帮助机器人走向 general-purpose robots？它把问题拆成两类路线：一类是把已有视觉/语言 foundation model 插进机器人系统，比如用 VLM 做开放词表感知、用 LLM 做任务规划；另一类是训练 robotics foundation models（RFMs），直接用机器人数据学习动作生成、运动规划或更通用的机器人能力。

论文的价值在于它不只罗列论文，还把机器人通用化的五个挑战讲清楚：generalization、data scarcity、requirements of models and primitives、task specification、uncertainty and safety。它还做了实验文献 meta-analysis，指出当前系统仍偏向 tabletop manipulation，低层动作、实时控制、安全和统一 benchmark 仍不足。

如果只记一个直觉：这篇像一张机器人 foundation model 地图。它告诉你哪些方法只是把 LLM/VLM 当模块，哪些方法真的在用机器人数据训练基础策略；也提醒你，通用机器人不是“接个 GPT-4”就结束。

*所以这一节是想说：本文提供了 foundation models for robotics 的系统分类和现实边界。*

## 这是个什么场景

General-purpose robot 的目标很诱人：同一个机器人能在不同环境、不同物体、不同任务中完成多样技能。它不只会固定工厂动作，还能处理家庭、办公室、仓库、医院等开放场景。

但传统机器人系统通常为特定任务、特定数据集、特定环境而设计。视觉模块、规划模块、控制模块、技能库都要人工调参。到了真实世界，物体、光照、摩擦、地图、用户指令、机器人形态都会变化，系统很容易失效。

foundation model 的机会在于：它们在语言、视觉和多模态领域展示了开放集泛化、上下文学习和知识迁移能力。机器人社区希望借这些能力解决感知、规划、任务指定和数据稀缺问题。

```text
机器人系统常见模块

perception -> planning -> action generation -> execution

Foundation model 可进入的位置
  VFM/VLM -> perception
  LLM/VLM -> task planning
  LLM/VLM/RFM -> action generation
  RFM -> motion planning / control
```

*所以这一节是想说：这篇综述关注 foundation model 如何进入机器人系统的不同位置。*

## 之前的人怎么做的，为什么不够好

传统机器人依赖明确模型：地图、物体状态、动力学模型、运动 primitive、PDDL 规则、控制器参数。这种方法可解释、可控，但泛化成本高。换环境或换机械臂，经常需要重新建模和调参。

学习型机器人尝试用 imitation learning 或 reinforcement learning 直接从数据学习策略，减少手工规则。但机器人数据昂贵，真实环境采集有安全风险，仿真数据又有 sim-to-real gap。许多方法在单任务、单环境、单机器人上有效，一旦任务开放就不稳。

LLM/VLM 进入后，系统可以用自然语言指定任务、用开放词表识别物体、用少样本 prompt 做规划。但这类模块化方案也有问题：LLM 计划不一定可执行，VLM 识别不一定有几何精度，模块之间没有端到端梯度，错误会沿感知-规划-控制链路传播。

RFMs 则试图用机器人数据训练更直接的基础模型，但数据规模、跨 embodiment、低层控制频率、安全和真实部署仍是难点。

*所以这一节是想说：传统机器人太硬，纯学习太吃数据，foundation model 带来机会但还没有自动解决所有机器人问题。*

## 这篇论文的新想法

第一，新想法是统一问题表述。论文把机器人相关 foundation model 写成函数 `f(x_t^k, c^k) -> y_t^k`：输入可以是视觉、语言、场景图、位姿、音频、触觉；context 可以是任务说明或 embodiment 信息；输出可以是任务计划、目标位姿、奖励函数、下一状态或控制指令。

第二，新想法是五大挑战分类：generalization、data scarcity、requirements of models and primitives、task specification、uncertainty and safety。这让读者不再只看“用了什么大模型”，而是看它解决了机器人哪类痛点。

第三，新想法是两大方法路线：

1. Foundation Models used in Robotics：把已有 VFM/VLM/LLM 用作感知、规划、动作生成、数据生成或 prompting 模块。
2. Robotics Foundation Models：用机器人数据训练模型，包括单一能力 RFM 和 general-purpose RFM。

第四，新想法是 meta-analysis。论文不只列代表作，还统计当前实验集中在哪些任务、数据集、机器人平台、base foundation model 和控制频率上。

```text
两条主路线

Existing FMs used in robotics
  VLM for perception
  LLM for planning
  VLM/LLM for action grounding

Robotics Foundation Models
  action generation models
  motion planning models
  general-purpose models
```

*所以这一节是想说：本文把 foundation model for robotics 从“论文列表”整理成“问题-方法-证据”地图。*

## 它分几步做的（方法）

### 第 1 步：统一机器人 foundation model 的输入输出

输入是机器人在时间 `t` 的状态和上下文。状态可以来自相机、文本描述、场景图、物体位姿、音频、触觉等；上下文可以是任务指令、目标图像、机器人形态或环境约束。

处理上，foundation model `f` 把这些信息映射到输出。输出的粒度很多：可以是高层任务计划，也可以是目标物体位置、奖励函数、轨迹、末端执行器位姿，甚至低层 motor command。

输出是一个统一视角：不同论文不必用完全相同架构，但都可以被问“输入是什么、上下文是什么、输出是什么、输出能否被机器人执行”。

### 第 2 步：总结通用机器人的五大挑战

Generalization 是跨任务、跨环境、跨机器人形态迁移。Data scarcity 是机器人数据远少于互联网文本/图像，采集昂贵且有安全风险。Requirements of models and primitives 是传统机器人需要地图、动力学模型、skill library 等先验。Task specification 是用户如何自然、明确地告诉机器人目标。Uncertainty and safety 是真实世界中的不确定、分布外、对抗攻击和安全保证。

这五个挑战像检查表。看到一个新系统，可以逐项问它解决了哪几个，哪些只是绕过了。

### 第 3 步：整理已有 foundation model 如何作为模块进入机器人

VFM/VLM 可用于开放词表物体识别、语义地图和场景理解。LLM/VLM 可用于 task-level planning，把自然语言拆成可执行步骤。LLM 也可以生成代码、PDDL 或 reward，帮助任务指定和数据生成。

这种路线的输入通常是已有 foundation model + 机器人模块，处理方式是 prompt、grounding 或接口转换，输出是某个机器人模块的结果。优点是易集成、少训练；缺点是模块边界硬、错误不可端到端修正。

### 第 4 步：整理 Robotics Foundation Models

RFMs 直接用机器人数据训练或微调。动作生成模型可以从图像/语言直接输出末端执行器动作；运动规划模型可以用异构导航数据预测 high-level actions；general-purpose models 如 Gato、PaLM-E、PACT 尝试把多任务、多模态、多 embodiment 能力放进更统一的模型。

这种路线的输入是机器人轨迹、动作标签、多模态状态和任务描述。处理上更接近端到端学习或大规模行为克隆 / 离线 RL。输出更接近机器人行动本身。

### 第 5 步：做实验和数据集 meta-analysis

论文检查当前文献用了哪些数据集、benchmark、模拟器、机器人平台和 base model。它发现领域仍严重偏向 tabletop / pick-and-place，低层动作如 dexterous manipulation 和 locomotion 探索不足。

它还指出控制频率问题：很多 foundation-model-based 控制方法只有 1 到 10 Hz，而 humanoid locomotion 这类任务可能需要约 500 Hz 稳定控制。成功率也不足以评估真实部署，因为 latency、计算成本和安全风险同样关键。

```text
五大挑战 -> 论文评价问题

Generalization:
  是否跨任务 / 环境 / morphology?

Data scarcity:
  是否减少真实机器人数据需求?

Models and primitives:
  是否仍依赖手工地图 / skill library?

Task specification:
  用户能否自然表达目标?

Uncertainty and safety:
  是否知道自己不确定，是否能安全 fallback?
```

*所以这一节是想说：本文的方法是用统一函数、挑战分类和实验证据三层组织领域。*

## 关键数字（What works）

| 原文信息 | 数字 / 结论 | 这说明什么 |
|---|---:|---|
| arXiv PDF | 42 pages | 这是长篇 survey + meta-analysis |
| 机器人挑战 | 5 类 | 泛化、数据、模型需求、任务指定、不确定性与安全 |
| Open X-Embodiment | 73 datasets | 多实验室数据整合正在起步 |
| Open X 单臂操作 | 55 / 73 datasets | 数据形态仍偏单臂 manipulation |
| Open X 四足 / 双臂 | 各 1 dataset | locomotion 和 bi-manual 覆盖很少 |
| RT-1 数据 | 130k episodes, 700+ tasks, 13 robots, 17 months | 大规模真实机器人数据非常昂贵 |
| Bridge V1 | 7200 hours | 家庭厨房 manipulation 数据 |
| Bridge V2 | 60,096 trajectories, 24 environments | 低成本机器人跨环境数据 |
| Language-Table | 600,000 language-labeled trajectories | 语言标注轨迹可大规模化 |
| RH20T | 110,000+ episodes, 7 embodiments, 140+ skills | 多模态、接触丰富数据集 |
| Unseen task drop | 21% 到 31% | 泛化仍有明显损失 |
| Disturbance drop | 14% 到 18% | 鲁棒性仍不足 |
| 控制频率 | 1-10 Hz vs 500 Hz | foundation model 控制离高频机器人仍有差距 |

*所以这一节是想说：领域进展很快，但数据覆盖、实时控制和安全评估仍远没闭环。*

## 实验结果说明了什么

这篇不是单个模型实验，而是对现有实验的 meta-analysis。它说明四件事。

第一，当前实验集中在 tabletop 和 mobile manipulation，尤其是 pick-and-place 变体。原因是 gripper-based manipulation 比较容易采集、标注和评价，也容易和 skill library 结合。

第二，低层动作输出仍不足。已有工作多输出高层计划或末端执行器 7 DoF 控制，真正复杂的 dexterous manipulation、locomotion 和 joint-level control 还需要更深入研究。

第三，实时性是硬约束。成功率不能单独说明部署能力，因为一个策略如果推理太慢，即使离线成功率高，也可能无法稳定控制真实机器人。

第四，安全和不确定性仍是空白。论文的 Table 1 明确指出 uncertainty and safety 在 foundation models for robotics 中 largely unexplored。

*所以这一节是想说：foundation model 已经帮助机器人，但离通用、安全、实时的机器人还有明显距离。*

## 精读补充：为什么这篇对后续论文筛选有用

这篇最实用的地方，是它把“看起来很强的 demo”拆回机器人系统问题。一个 demo 能听懂语言，不代表它解决了低层控制；一个 policy 能跨几个桌面任务，不代表它能跨机器人形态；一个模型能用 GPT-4 做规划，不代表它有可靠不确定性估计。用本文的五大挑战做筛选，就能避免被单一指标带偏。

它也提醒我们，foundation model 在机器人里常常不是替代所有传统模块，而是改变模块之间的接口。VLM 可能让感知更开放，LLM 可能让任务指定更自然，RFM 可能让动作生成更数据驱动，但安全监控、控制约束、实时性和硬件传感仍然存在。越接近真实部署，越不能只看模型名字。

*所以这一节是想说：本文是一把筛子，用来分辨论文到底解决了机器人系统的哪一层。*

## 你应该懂的几个新词

- **VFM**：Vision Foundation Model，用于视觉表征、检测、分割或场景理解。
- **VLM**：Vision-Language Model，把图像和语言连接起来，可做开放词表 grounding。
- **RFM**：Robotics Foundation Model，用机器人数据训练，目标是直接服务机器人任务。
- **Task Specification**：用户如何表达任务目标，可以是语言、图像、视频、奖励或轨迹草图。
- **Model-free / Model-based**：前者直接学策略，后者显式建世界/动力学模型再规划。
- **Control Frequency**：控制循环每秒执行次数。慢模型可能不适合需要高频稳定的机器人。

*所以这一节是想说：读机器人 foundation model 论文要同时看模型、数据和控制接口。*

## 它有什么搞不定的

第一，survey 依赖已有论文，不能证明某条路线最终会胜出。它整理趋势，但不训练统一模型。

第二，它覆盖了大量方向，但每个方向细节有限。比如安全、uncertainty、cross-embodiment 都足够写独立综述。

第三，它指出数据集问题，但没有解决数据飞轮。机器人不像互联网文本，普通人不会自然上传大规模同步传感器和动作序列。

第四，它强调 benchmark 不统一，但没有给出新统一 benchmark。未来仍需要同时评价 success rate、latency、compute、robustness 和 safety。

*所以这一节是想说：本文强在地图，弱在不是具体系统解决方案。*

## 它和别的几篇是什么关系

它和 RT-1、RT-2、OpenVLA、RoboCat 关系直接。这些都是 RFM 或机器人基础策略的代表，本文把它们放在 action generation / generalization / robotics data 的框架中比较。

它和 `call-for-embodied-ai` 的关系是工程化。Call for Embodied AI 从认知架构说为什么要 embodiment；本文从机器人系统说 foundation model 如何实际进入 perception、planning、control。

它和 `causal-world-models-embodied-ai` 的关系是互补。本文指出当前 foundation model 多偏 model-free，world model 仍是未来 frontier；因果世界模型那篇则专门解释为什么 world model 需要因果。

*所以这一节是想说：这篇是连接概念宣言和具体 VLA/RFM 系统的中层地图。*

## 和本导读的关系

本导读已经包含 RT-1、RT-2、OpenVLA、DROID、LIBERO、RoboCasa、Octo 等论文。读这些单篇时容易只记住模型名字。本文提供了把它们归类的方法：它们是在解决泛化、数据、模型需求、任务指定，还是安全不确定性？

建议把本文作为查表页使用。看到一个新机器人 foundation model，先问它属于 existing FM used in robotics，还是 RFM；再问它输入输出是什么；最后问它在五大挑战里解决了哪几项。

*所以这一节是想说：本文能把零散论文变成有结构的路线图。*

## 思考题

**Q1：为什么把 LLM 接到机器人规划器上不等于 RFM？**

<details>
<summary>提示</summary>

看模型是否用机器人数据训练，是否直接学习机器人动作或规划能力。
</details>

**Q2：Open X-Embodiment 已经有 73 个数据集，为什么论文仍说数据覆盖不足？**

<details>
<summary>提示</summary>

注意 55 个是单臂操作，四足和双臂各只有 1 个；场景也偏 tabletop。
</details>

**Q3：为什么 success rate 不能单独评价真实机器人？**

<details>
<summary>提示</summary>

考虑推理延迟、控制频率、碰撞风险、算力和安全 fallback。
</details>

**Q4：RFM 的 model-free 路线有什么优点和风险？**

<details>
<summary>提示</summary>

优点是少手工建模，风险是解释性、安全保证和 OOD 泛化更难。
</details>

**Q5：五大挑战里哪一项目前最缺？**

<details>
<summary>提示</summary>

论文 Table 1 特别指出 uncertainty and safety 仍 largely unexplored。
</details>

## 一些好奇心问答（FAQ）

**Q：这篇和普通 robotics survey 有什么不同？**  
A：它聚焦 foundation models 如何改变机器人，不是按传统控制/规划算法分类。

**Q：为什么机器人数据这么难像互联网文本一样扩张？**  
A：机器人数据要同步记录传感器、动作、环境和任务，而且真实采集慢、有成本、有安全风险。

**Q：通用机器人一定要端到端吗？**  
A：论文提醒 modular 和 end-to-end 不是互斥。前者是架构，后者是优化方式；未来可能是功能模块 + 共享表征 + 统一训练。

*所以这一节是想说：机器人 foundation model 的关键不是站队，而是输入输出、数据和安全边界。*

## 如果你想再深入

1. 读 RT-1 / RT-2，理解大规模行为克隆如何进入真实机器人。
2. 读 Open X-Embodiment / RT-X，理解跨实验室数据整合。
3. 读 PaLM-E / Gato，理解 general-purpose model 的早期形态。
4. 读 KNOWNO / conformal prediction，理解不确定性如何进入机器人规划。

## 原文信息

- 论文：Toward General-Purpose Robots via Foundation Models: A Survey and Meta-Analysis
- 链接：https://arxiv.org/abs/2312.08782
- arXiv：2312.08782
- 版本：v3，2024-10-01 更新

```bibtex
@article{hu2023toward,
  title={Toward General-Purpose Robots via Foundation Models: A Survey and Meta-Analysis},
  author={Hu, Yafei and Xie, Quanting and Jain, Vidhi and Francis, Jonathan and Patrikar, Jay and Keetha, Nikhil and others},
  journal={arXiv preprint arXiv:2312.08782},
  year={2023}
}
```
